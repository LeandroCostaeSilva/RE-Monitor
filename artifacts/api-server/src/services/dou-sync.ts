/**
 * DOU (Diário Oficial da União) Sync Service
 *
 * Multi-strategy fetcher + OpenAI parser that extracts ANVISA Resoluções Específicas
 * from DOU publications and upserts them into the database.
 *
 * Strategies (in priority order):
 *   1. DOU AJAX search API (JSON)
 *   2. DOU RSS Section 3
 *   3. ANVISA gov.br listing page
 *
 * All raw content is parsed by OpenAI gpt-5-mini with structured JSON output.
 */

import { db } from "@workspace/db";
import {
  resolucoesEspecificasTable,
  resolucoesHistoricoTable,
  syncLogsTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const OPENAI_BASE_URL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
const OPENAI_API_KEY = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];

function getOpenAI() {
  if (!OPENAI_BASE_URL || !OPENAI_API_KEY) {
    throw new Error("OpenAI env vars not set (AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY)");
  }
  return new OpenAI({ baseURL: OPENAI_BASE_URL, apiKey: OPENAI_API_KEY });
}

export interface ParsedRE {
  numero_re: string;
  data_publicacao: string;
  data_vigencia_inicio: string;
  data_vigencia_fim?: string;
  status: "vigente" | "revogada" | "encerrada" | "em_analise";
  tipo_produto: string;
  tipo_acao: string[];
  nome_produto: string;
  principio_ativo?: string;
  fabricante_nome?: string;
  fabricante_cnpj?: string;
  numero_registro_anvisa?: string;
  lotes_afetados?: string[];
  recolhimento_determinado?: boolean;
  ementa: string;
  link_documento_oficial?: string;
  numero_dou_edicao?: string;
  secao_dou?: number;
  pagina_dou?: number;
}

export interface SyncResult {
  syncLogId: string;
  status: "success" | "partial" | "error";
  estrategia: string;
  total_encontrados: number;
  total_inseridos: number;
  total_atualizados: number;
  total_erros: number;
  mensagem: string;
  detalhes: Record<string, unknown>;
}

// ───────────────────────────────────────────
// Fetch strategies
// ───────────────────────────────────────────

const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

function formatDateBR(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Strategy 1: DOU AJAX JSON search API */
async function fetchDOUJson(dateFrom: Date, dateTo: Date): Promise<{ content: string; strategy: string; edicoes: string[] }> {
  const url = new URL("https://www.in.gov.br/consulta/-/buscar-conteudo");
  url.searchParams.set("q", '"resolucao especifica"');
  url.searchParams.set("orgaoPesquisa", "ANVISA");
  url.searchParams.set("tipoPesquisa", "date");
  url.searchParams.set("dataInicio", formatDateBR(dateFrom));
  url.searchParams.set("dataFim", formatDateBR(dateTo));
  url.searchParams.set("pagina", "1");
  url.searchParams.set("tamanhoPagina", "100");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        ...BASE_HEADERS,
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.in.gov.br/consulta",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      const text = await res.text();
      if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
        const data = JSON.parse(text) as { items?: { content?: string; urlTitle?: string; numberDOU?: string }[] };
        return buildFromDOUItems(data.items ?? []);
      }
      throw new Error("Non-JSON response (possibly Cloudflare block)");
    }

    const data = await res.json() as { items?: { content?: string; urlTitle?: string; numberDOU?: string; section?: string; editionNumber?: string }[] };
    return buildFromDOUItems(data.items ?? []);
  } finally {
    clearTimeout(timeout);
  }
}

function buildFromDOUItems(items: { content?: string; urlTitle?: string; numberDOU?: string; editionNumber?: string; section?: string }[]) {
  const edicoes: string[] = [];
  const parts: string[] = [];
  for (const item of items) {
    if (item.content) parts.push(stripHtml(item.content));
    if (item.editionNumber) edicoes.push(item.editionNumber);
  }
  return { content: parts.join("\n\n---NEXT_RE---\n\n"), strategy: "dou_json_api", edicoes };
}

/** Strategy 2: DOU RSS feed Section 1 (ANVISA) */
async function fetchDOURss(dateFrom: Date, dateTo: Date): Promise<{ content: string; strategy: string; edicoes: string[] }> {
  const d = dateFrom;
  const dateStr = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  // Try multiple DOU RSS endpoint patterns
  const urls = [
    `https://www.in.gov.br/rss/do1?data=${dateStr}`,
    `https://www.in.gov.br/rss/do3?data=${dateStr}`,
    `https://www.in.gov.br/rss/do1`,
    `https://www.in.gov.br/rss/do3`,
  ];
  let lastErr = new Error("All RSS URLs failed");
  for (const url of urls) {
    try {
      const controller2 = new AbortController();
      const t = setTimeout(() => controller2.abort(), 10000);
      const res = await fetch(url, { signal: controller2.signal, headers: { ...BASE_HEADERS, Accept: "application/rss+xml,application/xml,text/xml,*/*" } });
      clearTimeout(t);
      if (!res.ok) { lastErr = new Error(`RSS HTTP ${res.status} for ${url}`); continue; }
      const xml = await res.text();
      if (!xml.includes("<rss") && !xml.includes("<feed") && !xml.includes("<item")) { lastErr = new Error(`Not RSS at ${url}`); continue; }
      const items = extractRssItems(xml);
      const anvisaItems = items.filter(i => /resoluc|anvisa|suspende|comercializ|vigilância/i.test(i.text));
      if (anvisaItems.length === 0 && items.length > 0) {
        return { content: items.map(i => i.text).join("\n\n---NEXT_RE---\n\n"), strategy: "dou_rss", edicoes: [] };
      }
      if (anvisaItems.length > 0) {
        return { content: anvisaItems.map(i => i.text).join("\n\n---NEXT_RE---\n\n"), strategy: "dou_rss", edicoes: [] };
      }
    } catch (e) { lastErr = e as Error; }
  }
  throw lastErr;
}

function extractRssItems(xml: string): { text: string }[] {
  const items: { text: string }[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i.exec(block)?.[1] ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(block)?.[1] ?? "").trim();
    const desc = (/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i.exec(block)?.[1] ?? /<description[^>]*>([\s\S]*?)<\/description>/i.exec(block)?.[1] ?? "").trim();
    const text = stripHtml(`${title}\n${desc}`).trim();
    if (text.length > 30) items.push({ text });
  }
  return items;
}

/** Strategy 3: ANVISA gov.br HTML listing page */
async function fetchAnvisaListing(dateFrom: Date, dateTo: Date): Promise<{ content: string; strategy: string; edicoes: string[] }> {
  const url = "https://www.gov.br/anvisa/pt-br/assuntos/fiscalizacao-e-monitoramento/monitoramento/resolucoes-especificas";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        ...BASE_HEADERS,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Anvisa listing HTTP ${res.status}`);
    const html = await res.text();
    const text = stripHtml(html);

    const fromYear = dateFrom.getFullYear();
    const toYear = dateTo.getFullYear();
    const lines = text.split("\n").filter(l => {
      const y = parseInt(l.match(/20(\d{2})/)?.[0] ?? "0");
      return y >= fromYear && y <= toYear && l.length > 20;
    });

    return { content: lines.join("\n"), strategy: "anvisa_gov_listing", edicoes: [] };
  } finally {
    clearTimeout(timeout);
  }
}

/** Strategy 4: DOU Section 3 full day XML (alternative path) */
async function fetchDOUSec3(dateFrom: Date, dateTo: Date): Promise<{ content: string; strategy: string; edicoes: string[] }> {
  const dateStr = `${String(dateFrom.getDate()).padStart(2,"0")}-${String(dateFrom.getMonth()+1).padStart(2,"0")}-${dateFrom.getFullYear()}`;
  const url = `https://www.in.gov.br/leiturajornal?data=${dateStr}&secao=do3`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { ...BASE_HEADERS, Accept: "text/html,application/xhtml+xml" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`DOU sec3 HTTP ${res.status}`);
    const html = await res.text();

    if (html.includes("Cloudflare") || html.includes("cf-wrapper")) {
      throw new Error("Blocked by Cloudflare");
    }

    const text = stripHtml(html);
    const lines = text.split("\n").filter(l =>
      l.toLowerCase().includes("resolucao") ||
      l.toLowerCase().includes("suspende") ||
      l.toLowerCase().includes("anvisa") ||
      l.toLowerCase().includes("comercializ") ||
      /re\s+n[ºo]/i.test(l)
    );

    return { content: lines.join("\n"), strategy: "dou_sec3_html", edicoes: [] };
  } finally {
    clearTimeout(timeout);
  }
}

// ───────────────────────────────────────────
// OpenAI parser
// ───────────────────────────────────────────

const TIPO_PRODUTO_VALUES = [
  "medicamentos","cosmeticos","alimentos","saneantes","produtos_saude",
  "insumos_farmaceuticos","farmacos","cannabis","droga_vegetal","substancias_ativas","outros"
];

const TIPO_ACAO_VALUES = [
  "comercializacao","distribuicao","importacao","fabricacao","uso","recolhimento","exportacao"
];

const SYSTEM_PROMPT = `Você é um analista especialista em Vigilância Sanitária brasileiro.
Sua tarefa é extrair dados estruturados de textos do Diário Oficial da União (DOU) sobre Resoluções Específicas (RE) da ANVISA que suspendem comercialização, distribuição, importação, fabricação ou determinam recolhimento de produtos.

Para cada RE encontrada no texto, extraia os campos abaixo.
Se o campo não estiver presente no texto, use null (não invente dados).

Campos obrigatórios:
- numero_re: string no formato "RE nº X.XXX/AAAA" (ex: "RE nº 5.400/2025", "RE nº 2.875/2023").
  ATENÇÃO: Se o texto usar formato "RE nº X.XXX, de DD de MMMM de AAAA", extraia o ano da data e converta para "RE nº X.XXX/AAAA".
- data_publicacao: string "AAAA-MM-DD"
- data_vigencia_inicio: string "AAAA-MM-DD" (geralmente igual à data_publicacao)
- status: "vigente" | "revogada" | "encerrada" | "em_analise"
- tipo_produto: um de [${TIPO_PRODUTO_VALUES.join(",")}]
  Exemplos: medicamentos, alimentos (inclui vegetais/plantas alimentícias como ora-pro-nobis), droga_vegetal (plantas medicinais), cosmeticos, saneantes
- tipo_acao: array com um ou mais de [${TIPO_ACAO_VALUES.join(",")}]
- nome_produto: nome completo do produto (pode ser apenas um vegetal, ingrediente ou substância sem fabricante específico)
- ementa: resumo técnico da RE (pode ser curto se o texto for conciso)

Campos opcionais — use null quando não se aplica:
- data_vigencia_fim: "AAAA-MM-DD" ou null
- principio_ativo: null se não aplicável ou não informado
- fabricante_nome: null se a proibição se aplica ao PRODUTO EM GERAL (não a uma empresa específica).
  Exemplos de quando usar null: proibição de um vegetal (ora-pro-nobis, açaí), substância sem fabricante identificado, produto sem registro de empresa.
- fabricante_cnpj: null se fabricante_nome for null OU se o CNPJ não for mencionado no texto.
  NUNCA invente CNPJ. Use null quando a RE não citar CNPJ.
- numero_registro_anvisa: null se não mencionado
- lotes_afetados: array de lotes se mencionados, ou [] se não houver lotes específicos
- recolhimento_determinado: true se menciona recolhimento de mercado, false caso contrário
- link_documento_oficial: URL se mencionado, senão null
- numero_dou_edicao: número da edição do DOU ou null
- secao_dou: número da seção (1, 2 ou 3) ou null
- pagina_dou: número da página ou null

REGRA CRÍTICA: fabricante_nome e fabricante_cnpj devem ser null quando:
  - A RE proíbe um produto/substância/vegetal de forma geral (sem vincular a fabricante)
  - O texto não cita razão social ou CNPJ de empresa

IMPORTANTE: Responda SEMPRE com JSON puro, sem markdown, sem explicações.
Use EXATAMENTE este formato: {"resolucoes": [{...campos...}]}
Se não encontrar nenhuma RE, responda: {"resolucoes": []}`;


async function parseWithOpenAI(rawText: string, dateRef: Date): Promise<ParsedRE[]> {
  if (!rawText || rawText.trim().length < 50) return [];

  const openai = getOpenAI();
  const dateRefStr = formatDateISO(dateRef);

  const chunks = splitIntoChunks(rawText, 12000);
  const allREs: ParsedRE[] = [];

  for (const chunk of chunks) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Data de referência: ${dateRefStr}\n\nTexto do DOU:\n\n${chunk}\n\nRetorne SOMENTE JSON válido com a chave "resolucoes" contendo o array de REs encontradas. Exemplo: {"resolucoes":[{...}]}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "";
      logger.debug({ rawLength: raw.length, rawPreview: raw.slice(0, 200) }, "OpenAI raw response");

      // Try multiple JSON extraction strategies
      const items = extractItemsFromRaw(raw);
      logger.info({ itemsFound: items.length }, "OpenAI extracted items");

      for (const item of items) {
        if (isValidParsedRE(item)) {
          allREs.push(normalizeRE(item, dateRefStr));
        }
      }
    } catch (err) {
      logger.warn({ err }, "OpenAI parsing chunk failed");
    }
  }

  return deduplicateREs(allREs);
}

function extractItemsFromRaw(raw: string): unknown[] {
  if (!raw || raw.trim().length < 2) return [];

  // Strategy 1: Parse as JSON object with "resolucoes" key
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (Array.isArray(parsed["resolucoes"])) return parsed["resolucoes"];
    if (Array.isArray(parsed["items"])) return parsed["items"];
    if (Array.isArray(parsed["data"])) return parsed["data"];
    // If it's an object with numeric keys or a single RE object, wrap it
    if (parsed["numero_re"]) return [parsed];
  } catch { /* fall through */ }

  // Strategy 2: Parse as JSON array directly
  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (Array.isArray(parsed)) return parsed;
  } catch { /* fall through */ }

  // Strategy 3: Find JSON array in text
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]) as unknown[]; } catch { /* fall through */ }
  }

  // Strategy 4: Find JSON object with resolucoes key in text
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]) as Record<string, unknown>;
      if (Array.isArray(parsed["resolucoes"])) return parsed["resolucoes"];
      if (parsed["numero_re"]) return [parsed];
    } catch { /* fall through */ }
  }

  logger.warn({ rawPreview: raw.slice(0, 300) }, "Could not extract items from OpenAI response");
  return [];
}

/**
 * Normalizes numero_re from DOU formats:
 *   "RE nº 2.875, de 1º de agosto de 2023" → "RE nº 2.875/2023"
 *   "RE nº 5.400/2025" → "RE nº 5.400/2025" (unchanged)
 */
function normalizeNumeroRE(raw: string): string {
  if (!raw) return raw;
  const s = raw.trim();

  // Already in canonical format: "RE nº X.XXX/AAAA"
  const canonical = s.match(/RE\s+n[oº°]\s*([\d.]+)\/(\d{4})/i);
  if (canonical) {
    return `RE nº ${canonical[1]!.replace(/\./g, "").replace(/(\d+)/, (n) => Number(n).toLocaleString("pt-BR"))}\/${canonical[2]}`;
  }

  // Format: "RE nº X.XXX, de DD de MMMM de AAAA"
  const withDate = s.match(/RE\s+n[oº°]\s*([\d.]+)[,\s]+de\s+\d+[oº°]?\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (withDate) {
    return `RE nº ${withDate[1]!}/${withDate[3]!}`;
  }

  // Fallback: extract number and year if present
  const numYear = s.match(/(\d[\d.]*)\s*[/,]\s*(\d{4})/);
  if (numYear) {
    return `RE nº ${numYear[1]!}/${numYear[2]!}`;
  }

  return s;
}

function isValidParsedRE(item: unknown): item is Partial<ParsedRE> {
  if (!item || typeof item !== "object") return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r["numero_re"] === "string" && r["numero_re"].length > 3 &&
    typeof r["nome_produto"] === "string" && r["nome_produto"].length > 1 &&
    typeof r["ementa"] === "string" && r["ementa"].length > 5
  );
}

function normalizeRE(item: Partial<ParsedRE>, fallbackDate: string): ParsedRE {
  const r = item as Record<string, unknown>;
  const today = fallbackDate;
  return {
    numero_re: normalizeNumeroRE(String(r["numero_re"] ?? "").trim()),
    data_publicacao: String(r["data_publicacao"] ?? today).slice(0, 10) || today,
    data_vigencia_inicio: String(r["data_vigencia_inicio"] ?? r["data_publicacao"] ?? today).slice(0, 10) || today,
    data_vigencia_fim: r["data_vigencia_fim"] ? String(r["data_vigencia_fim"]).slice(0, 10) : undefined,
    status: (["vigente","revogada","encerrada","em_analise"].includes(String(r["status"])) ? r["status"] : "vigente") as ParsedRE["status"],
    tipo_produto: TIPO_PRODUTO_VALUES.includes(String(r["tipo_produto"])) ? String(r["tipo_produto"]) : "outros",
    tipo_acao: Array.isArray(r["tipo_acao"]) ? (r["tipo_acao"] as string[]).filter(a => TIPO_ACAO_VALUES.includes(a)) : ["comercializacao"],
    nome_produto: String(r["nome_produto"] ?? "").trim(),
    principio_ativo: r["principio_ativo"] ? String(r["principio_ativo"]) : undefined,
    fabricante_nome: r["fabricante_nome"] ? String(r["fabricante_nome"]) : undefined,
    fabricante_cnpj: r["fabricante_cnpj"] ? String(r["fabricante_cnpj"]) : undefined,
    numero_registro_anvisa: r["numero_registro_anvisa"] ? String(r["numero_registro_anvisa"]) : undefined,
    lotes_afetados: Array.isArray(r["lotes_afetados"]) ? (r["lotes_afetados"] as string[]).map(String).filter(Boolean) : [],
    recolhimento_determinado: Boolean(r["recolhimento_determinado"]),
    ementa: String(r["ementa"] ?? "").trim(),
    link_documento_oficial: r["link_documento_oficial"] ? String(r["link_documento_oficial"]) : undefined,
    numero_dou_edicao: r["numero_dou_edicao"] ? String(r["numero_dou_edicao"]) : undefined,
    secao_dou: r["secao_dou"] ? Number(r["secao_dou"]) : undefined,
    pagina_dou: r["pagina_dou"] ? Number(r["pagina_dou"]) : undefined,
  };
}

function deduplicateREs(rEs: ParsedRE[]): ParsedRE[] {
  const seen = new Set<string>();
  return rEs.filter(re => {
    const key = re.numero_re.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const parts = text.split("---NEXT_RE---");
  let current = "";
  for (const part of parts) {
    if ((current + part).length > maxLen) {
      if (current) chunks.push(current);
      current = part;
    } else {
      current += (current ? "\n\n---NEXT_RE---\n\n" : "") + part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ───────────────────────────────────────────
// DB upsert
// ───────────────────────────────────────────

async function upsertREs(parsedREs: ParsedRE[]): Promise<{ inseridos: number; atualizados: number; erros: number; erroDetails: string[] }> {
  let inseridos = 0;
  let atualizados = 0;
  let erros = 0;
  const erroDetails: string[] = [];

  for (const re of parsedREs) {
    try {
      const existing = await db.select({ id: resolucoesEspecificasTable.id })
        .from(resolucoesEspecificasTable)
        .where(and(
          eq(resolucoesEspecificasTable.numero_re, re.numero_re),
          isNull(resolucoesEspecificasTable.deleted_at)
        ))
        .limit(1);

      if (existing.length > 0) {
        const existingId = existing[0]!.id;
        await db.update(resolucoesEspecificasTable)
          .set({
            status: re.status,
            lotes_afetados: re.lotes_afetados ?? [],
            recolhimento_determinado: re.recolhimento_determinado ?? false,
            tipo_acao: re.tipo_acao,
            ementa: re.ementa,
            link_documento_oficial: re.link_documento_oficial ?? null,
            numero_dou_edicao: re.numero_dou_edicao ?? null,
            secao_dou: re.secao_dou ?? null,
            pagina_dou: re.pagina_dou ?? null,
            updated_at: new Date(),
          })
          .where(eq(resolucoesEspecificasTable.id, existingId));

        await db.insert(resolucoesHistoricoTable).values({
          resolucao_id: existingId,
          fonte: "dou_sync",
          justificativa: "Atualização automática via sincronização DOU",
          dados_anteriores: {},
          dados_novos: re as unknown as Record<string, unknown>,
        });
        atualizados++;
      } else {
        await db.insert(resolucoesEspecificasTable).values({
          numero_re: re.numero_re,
          data_publicacao: re.data_publicacao,
          data_vigencia_inicio: re.data_vigencia_inicio,
          data_vigencia_fim: re.data_vigencia_fim ?? null,
          status: re.status,
          tipo_produto: re.tipo_produto,
          tipo_acao: re.tipo_acao,
          nome_produto: re.nome_produto,
          principio_ativo: re.principio_ativo ?? null,
          fabricante_nome: re.fabricante_nome ?? null,
          fabricante_cnpj: re.fabricante_cnpj ?? null,
          numero_registro_anvisa: re.numero_registro_anvisa ?? null,
          lotes_afetados: re.lotes_afetados ?? [],
          recolhimento_determinado: re.recolhimento_determinado ?? false,
          ementa: re.ementa,
          link_documento_oficial: re.link_documento_oficial ?? null,
          numero_dou_edicao: re.numero_dou_edicao ?? null,
          secao_dou: re.secao_dou ?? null,
          pagina_dou: re.pagina_dou ?? null,
          origem_dado: "dou_sync",
        });
        inseridos++;
      }
    } catch (err) {
      erros++;
      erroDetails.push(`${re.numero_re}: ${(err as Error).message}`);
      logger.warn({ err, numero_re: re.numero_re }, "Error upserting RE");
    }
  }

  return { inseridos, atualizados, erros, erroDetails };
}

// ───────────────────────────────────────────
// Main sync orchestrator
// ───────────────────────────────────────────

export async function syncDOU(options: {
  dateFrom: Date;
  dateTo: Date;
  iniciado_por?: string;
}): Promise<SyncResult> {
  const { dateFrom, dateTo, iniciado_por } = options;
  const log = logger.child({ service: "dou-sync", dateFrom: formatDateISO(dateFrom), dateTo: formatDateISO(dateTo) });

  log.info("Starting DOU sync");

  const [syncLogRecord] = await db.insert(syncLogsTable).values({
    periodo_inicio: formatDateISO(dateFrom),
    periodo_fim: formatDateISO(dateTo),
    status: "running",
    iniciado_por: iniciado_por ?? null,
  }).returning({ id: syncLogsTable.id });

  const syncLogId = syncLogRecord!.id;

  const strategies = [
    { name: "dou_json_api", fn: fetchDOUJson },
    { name: "dou_rss", fn: fetchDOURss },
    { name: "dou_sec3_html", fn: fetchDOUSec3 },
    { name: "anvisa_gov_listing", fn: fetchAnvisaListing },
  ];

  let rawContent = "";
  let estrategia = "nenhuma";
  const strategyErrors: string[] = [];

  for (const strategy of strategies) {
    try {
      log.info({ strategy: strategy.name }, "Trying fetch strategy");
      const result = await strategy.fn(dateFrom, dateTo);
      if (result.content.length > 100) {
        rawContent = result.content;
        estrategia = result.strategy;
        log.info({ strategy: strategy.name, chars: rawContent.length }, "Strategy succeeded");
        break;
      }
    } catch (err) {
      const msg = `${strategy.name}: ${(err as Error).message}`;
      strategyErrors.push(msg);
      log.warn({ err, strategy: strategy.name }, "Strategy failed, trying next");
    }
  }

  if (!rawContent) {
    const mensagem = `Todos os métodos de busca falharam (provavelmente bloqueio Cloudflare). Erros: ${strategyErrors.join(" | ")}`;
    await db.update(syncLogsTable).set({
      fim: new Date(),
      status: "error",
      estrategia_usada: "nenhuma",
      total_encontrados: 0,
      total_inseridos: 0,
      total_atualizados: 0,
      total_erros: 0,
      mensagem,
      detalhes: { strategyErrors },
    }).where(eq(syncLogsTable.id, syncLogId));

    return {
      syncLogId,
      status: "error",
      estrategia: "nenhuma",
      total_encontrados: 0,
      total_inseridos: 0,
      total_atualizados: 0,
      total_erros: 0,
      mensagem,
      detalhes: { strategyErrors },
    };
  }

  log.info({ chars: rawContent.length }, "Parsing content with OpenAI");
  let parsedREs: ParsedRE[] = [];

  try {
    parsedREs = await parseWithOpenAI(rawContent, dateFrom);
    log.info({ count: parsedREs.length }, "OpenAI parsing complete");
  } catch (err) {
    const mensagem = `Falha no parsing OpenAI: ${(err as Error).message}`;
    await db.update(syncLogsTable).set({
      fim: new Date(),
      status: "error",
      estrategia_usada: estrategia,
      total_encontrados: 0,
      total_inseridos: 0,
      total_atualizados: 0,
      total_erros: 1,
      mensagem,
    }).where(eq(syncLogsTable.id, syncLogId));
    return { syncLogId, status: "error", estrategia, total_encontrados: 0, total_inseridos: 0, total_atualizados: 0, total_erros: 1, mensagem, detalhes: {} };
  }

  const { inseridos, atualizados, erros, erroDetails } = await upsertREs(parsedREs);

  const finalStatus = erros > 0 && inseridos + atualizados === 0 ? "error" : erros > 0 ? "partial" : "success";
  const mensagem = `Período ${formatDateBR(dateFrom)}-${formatDateBR(dateTo)} via ${estrategia}: ${parsedREs.length} REs encontradas, ${inseridos} inseridas, ${atualizados} atualizadas, ${erros} erros.`;

  await db.update(syncLogsTable).set({
    fim: new Date(),
    status: finalStatus,
    estrategia_usada: estrategia,
    total_encontrados: parsedREs.length,
    total_inseridos: inseridos,
    total_atualizados: atualizados,
    total_erros: erros,
    mensagem,
    detalhes: { strategyErrors, erroDetails, sample: parsedREs.slice(0, 3).map(r => r.numero_re) },
  }).where(eq(syncLogsTable.id, syncLogId));

  log.info({ syncLogId, inseridos, atualizados, erros }, "DOU sync complete");

  return { syncLogId, status: finalStatus, estrategia, total_encontrados: parsedREs.length, total_inseridos: inseridos, total_atualizados: atualizados, total_erros: erros, mensagem, detalhes: { erroDetails } };
}

/** Import REs from pasted text (admin manually pastes DOU content, AI parses it) */
export async function parseAndImportText(options: {
  texto: string;
  dataReferencia: Date;
  iniciado_por?: string;
}): Promise<SyncResult> {
  const { texto, dataReferencia, iniciado_por } = options;
  const dateStr = formatDateISO(dataReferencia);

  const [syncLogRecord] = await db.insert(syncLogsTable).values({
    periodo_inicio: dateStr,
    periodo_fim: dateStr,
    status: "running",
    estrategia_usada: "importacao_manual",
    iniciado_por: iniciado_por ?? null,
  }).returning({ id: syncLogsTable.id });

  const syncLogId = syncLogRecord!.id;

  let parsedREs: ParsedRE[] = [];
  try {
    parsedREs = await parseWithOpenAI(texto, dataReferencia);
  } catch (err) {
    const mensagem = `Falha no parsing OpenAI: ${(err as Error).message}`;
    await db.update(syncLogsTable).set({
      fim: new Date(), status: "error", total_encontrados: 0,
      total_inseridos: 0, total_atualizados: 0, total_erros: 1, mensagem,
    }).where(eq(syncLogsTable.id, syncLogId));
    return { syncLogId, status: "error", estrategia: "importacao_manual", total_encontrados: 0, total_inseridos: 0, total_atualizados: 0, total_erros: 1, mensagem, detalhes: {} };
  }

  const { inseridos, atualizados, erros, erroDetails } = await upsertREs(parsedREs);
  const finalStatus = erros > 0 && inseridos + atualizados === 0 ? "error" : erros > 0 ? "partial" : "success";
  const mensagem = `Importação manual (${dateStr}): ${parsedREs.length} REs extraídas pela IA, ${inseridos} inseridas, ${atualizados} atualizadas, ${erros} erros.`;

  await db.update(syncLogsTable).set({
    fim: new Date(), status: finalStatus, estrategia_usada: "importacao_manual",
    total_encontrados: parsedREs.length, total_inseridos: inseridos,
    total_atualizados: atualizados, total_erros: erros, mensagem,
    detalhes: { erroDetails, sample: parsedREs.slice(0, 3).map(r => r.numero_re) },
  }).where(eq(syncLogsTable.id, syncLogId));

  return { syncLogId, status: finalStatus, estrategia: "importacao_manual", total_encontrados: parsedREs.length, total_inseridos: inseridos, total_atualizados: atualizados, total_erros: erros, mensagem, detalhes: { erroDetails } };
}

/** Backfill: sync from a start date up to today in monthly chunks */
export async function backfillDOU(options: {
  startDate: Date;
  endDate?: Date;
  iniciado_por?: string;
}): Promise<SyncResult[]> {
  const end = options.endDate ?? new Date();
  const results: SyncResult[] = [];

  let current = new Date(options.startDate);
  current.setDate(1);

  while (current <= end) {
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const dateTo = monthEnd > end ? end : monthEnd;

    const result = await syncDOU({ dateFrom: current, dateTo, iniciado_por: options.iniciado_por });
    results.push(result);

    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    await new Promise(r => setTimeout(r, 2000));
  }

  return results;
}
