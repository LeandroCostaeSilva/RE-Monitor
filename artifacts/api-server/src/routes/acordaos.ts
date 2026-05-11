import { Router } from "express";
import { db } from "@workspace/db";
import {
  acordaosDicolTable,
  resolucoesEspecificasTable,
  resolucoesHistoricoTable,
} from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";

const router = Router();

// GET /v1/resolucoes/:id/acordaos — listar acórdãos de uma RE
router.get("/v1/resolucoes/:id/acordaos", async (req, res) => {
  try {
    const { id } = req.params;

    const [re] = await db
      .select({ id: resolucoesEspecificasTable.id })
      .from(resolucoesEspecificasTable)
      .where(
        and(
          eq(resolucoesEspecificasTable.id, id),
          isNull(resolucoesEspecificasTable.deleted_at),
        ),
      )
      .limit(1);

    if (!re) {
      return res.status(404).json({ error: "Resolução não encontrada" });
    }

    const acordaos = await db
      .select()
      .from(acordaosDicolTable)
      .where(eq(acordaosDicolTable.resolucao_id, id))
      .orderBy(desc(acordaosDicolTable.data_publicacao_dou));

    return res.json(acordaos);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /v1/resolucoes/:id/acordaos — registrar acórdão DICOL
router.post("/v1/resolucoes/:id/acordaos", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numero_acordao,
      numero_processo,
      data_publicacao_dou,
      data_decisao,
      efeito_suspensivo,
      tipo_decisao,
      sumario_decisao,
      relator,
      link_dou,
      numero_dou_edicao,
      secao_dou,
      pagina_dou,
      atualizar_status_re,
    } = req.body;

    if (!numero_acordao || !data_publicacao_dou || efeito_suspensivo === undefined) {
      return res.status(400).json({
        error: "Campos obrigatórios: numero_acordao, data_publicacao_dou, efeito_suspensivo",
      });
    }

    const [re] = await db
      .select()
      .from(resolucoesEspecificasTable)
      .where(
        and(
          eq(resolucoesEspecificasTable.id, id),
          isNull(resolucoesEspecificasTable.deleted_at),
        ),
      )
      .limit(1);

    if (!re) {
      return res.status(404).json({ error: "Resolução não encontrada" });
    }

    const [acordao] = await db
      .insert(acordaosDicolTable)
      .values({
        resolucao_id: id,
        numero_acordao,
        numero_processo: numero_processo || null,
        data_publicacao_dou,
        data_decisao: data_decisao || null,
        efeito_suspensivo: Boolean(efeito_suspensivo),
        tipo_decisao: tipo_decisao || null,
        sumario_decisao: sumario_decisao || null,
        relator: relator || null,
        link_dou: link_dou || null,
        numero_dou_edicao: numero_dou_edicao || null,
        secao_dou: secao_dou ? Number(secao_dou) : null,
        pagina_dou: pagina_dou ? Number(pagina_dou) : null,
        origem_dado: "MANUAL",
      })
      .returning();

    // Registro no histórico com metadados do acórdão
    const justificativa = efeito_suspensivo
      ? `Acórdão DICOL ${numero_acordao} confere EFEITO SUSPENSIVO à medida sanitária. Publicado no DOU em ${data_publicacao_dou}.`
      : `Acórdão DICOL ${numero_acordao} registrado — sem efeito suspensivo. Publicado no DOU em ${data_publicacao_dou}.`;

    await db.insert(resolucoesHistoricoTable).values({
      resolucao_id: id,
      campo_alterado: "acordao_dicol",
      valor_anterior: null,
      valor_novo: numero_acordao,
      justificativa,
      alterado_por: null,
      alterado_por_nome: "DICOL — Diretoria Colegiada",
      fonte: "DICOL_ACORDAO",
      dados_anteriores: null,
      dados_novos: acordao as Record<string, unknown>,
    });

    // Se efeito suspensivo e flag habilitada, atualiza status da RE para em_analise
    if (efeito_suspensivo && atualizar_status_re) {
      const estadoAnterior = { status: re.status };
      await db
        .update(resolucoesEspecificasTable)
        .set({ status: "em_analise", updated_at: new Date() })
        .where(eq(resolucoesEspecificasTable.id, id));

      await db.insert(resolucoesHistoricoTable).values({
        resolucao_id: id,
        campo_alterado: "status",
        valor_anterior: re.status,
        valor_novo: "em_analise",
        justificativa: `Status alterado para Em Análise em razão do efeito suspensivo conferido pelo ${numero_acordao}`,
        alterado_por: null,
        alterado_por_nome: "DICOL — Diretoria Colegiada",
        fonte: "DICOL_ACORDAO",
        dados_anteriores: estadoAnterior as Record<string, unknown>,
        dados_novos: { status: "em_analise", acordao_id: acordao.id } as Record<string, unknown>,
      });
    }

    return res.status(201).json(acordao);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// DELETE /v1/resolucoes/:resolucaoId/acordaos/:acordaoId
router.delete("/v1/resolucoes/:resolucaoId/acordaos/:acordaoId", async (req, res) => {
  try {
    const { resolucaoId, acordaoId } = req.params;

    const [acordao] = await db
      .select()
      .from(acordaosDicolTable)
      .where(
        and(
          eq(acordaosDicolTable.id, acordaoId),
          eq(acordaosDicolTable.resolucao_id, resolucaoId),
        ),
      )
      .limit(1);

    if (!acordao) {
      return res.status(404).json({ error: "Acórdão não encontrado" });
    }

    await db
      .delete(acordaosDicolTable)
      .where(eq(acordaosDicolTable.id, acordaoId));

    await db.insert(resolucoesHistoricoTable).values({
      resolucao_id: resolucaoId,
      campo_alterado: "acordao_dicol",
      valor_anterior: acordao.numero_acordao,
      valor_novo: null,
      justificativa: `Acórdão ${acordao.numero_acordao} removido do registro.`,
      alterado_por: null,
      alterado_por_nome: null,
      fonte: "MANUAL",
      dados_anteriores: acordao as Record<string, unknown>,
    });

    return res.json({ message: "Acórdão removido com sucesso" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /v1/acordaos/sync-dou — varrer DOU por acórdãos DICOL
router.post("/v1/acordaos/sync-dou", async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.body || {};

    // Calcular intervalo (padrão: últimos 60 dias)
    const endDate = data_fim ? new Date(data_fim) : new Date();
    const startDate = data_inicio
      ? new Date(data_inicio)
      : new Date(endDate.getTime() - 60 * 24 * 60 * 60 * 1000);

    const stats = {
      datas_varridas: 0,
      acordaos_encontrados: 0,
      acordaos_importados: 0,
      acordaos_ignorados: 0,
      erros: [] as string[],
      detalhes: [] as Record<string, unknown>[],
    };

    // Gerar lista de datas (apenas dias úteis, seg-sex)
    const datas: string[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dow = cur.getDay();
      if (dow >= 1 && dow <= 5) {
        const dd = String(cur.getDate()).padStart(2, "0");
        const mm = String(cur.getMonth() + 1).padStart(2, "0");
        const yyyy = cur.getFullYear();
        datas.push(`${dd}-${mm}-${yyyy}`);
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Buscar todos os números de RE existentes no banco para matching
    const resolucoesDB = await db
      .select({
        id: resolucoesEspecificasTable.id,
        numero_re: resolucoesEspecificasTable.numero_re,
      })
      .from(resolucoesEspecificasTable)
      .where(isNull(resolucoesEspecificasTable.deleted_at));

    // Mapa normalizado de número de RE → id
    const reMap = new Map<string, string>();
    for (const re of resolucoesDB) {
      const normalized = re.numero_re
        .replace(/[^0-9]/g, "")
        .replace(/^0+/, "");
      reMap.set(normalized, re.id);
    }

    // Varrer cada data
    for (const dataFmt of datas) {
      try {
        const url = `https://www.in.gov.br/leiturajornal?data=${dataFmt}&secao=do1`;
        const resp = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 ANVISA-RE-Monitor/1.0" },
          signal: AbortSignal.timeout(15000),
        });

        if (!resp.ok) continue;
        const html = await resp.text();

        // Extrair jsonArray da página
        const jsonStart = html.indexOf('{"pubName"');
        if (jsonStart === -1) {
          stats.datas_varridas++;
          continue;
        }

        // Encontrar início do array
        let arrStart = jsonStart - 1;
        while (arrStart > 0 && html[arrStart] !== "[") arrStart--;

        let depth = 0;
        let arrEnd = arrStart;
        for (let i = arrStart; i < Math.min(html.length, arrStart + 5000000); i++) {
          if (html[i] === "[") depth++;
          else if (html[i] === "]") {
            depth--;
            if (depth === 0) { arrEnd = i; break; }
          }
        }

        let items: Array<{ title?: string; content?: string; pubDate?: string; urlTitle?: string }> = [];
        try {
          items = JSON.parse(html.slice(arrStart, arrEnd + 1));
        } catch {
          stats.datas_varridas++;
          continue;
        }

        stats.datas_varridas++;

        // Filtrar itens DICOL com acórdão relacionado a medidas preventivas/RE
        const dicolItems = items.filter((item) => {
          const title = item.title || "";
          const content = item.content || "";
          return (
            /ACÓRDÃO|ACORDÃO|ACORD[ÃA]O/i.test(title) &&
            /DICOL|DIRETORIA COLEGIADA/i.test(content + title) &&
            /medida\s+preventiva|Resolu[çc][ão]o-RE|RE\s+n[°º]/i.test(content)
          );
        });

        for (const item of dicolItems) {
          stats.acordaos_encontrados++;

          // Extrair número da RE referenciada no conteúdo
          const reMatch = (item.content || "").match(
            /RE\s+n[°º\.]*\s*([\d.]+(?:\/\d{4})?)/i,
          );
          const reNumRaw = reMatch ? reMatch[1].replace(/\./g, "").replace(/^0+/, "") : null;
          const resolucaoId = reNumRaw ? reMap.get(reNumRaw) : null;

          if (!resolucaoId) {
            stats.acordaos_ignorados++;
            req.log.info({ reNumRaw, title: item.title }, "Acórdão DICOL sem RE correspondente no banco");
            continue;
          }

          // Verificar se já existe este acórdão (por numero_acordao)
          const numAcordaoMatch = (item.title || "").match(/ACÓRDÃO\s+N[°º]?\s*([\d./-]+)/i);
          const numAcordao = numAcordaoMatch
            ? `Acórdão nº ${numAcordaoMatch[1]}`
            : `Acórdão DOU ${dataFmt}`;

          const [existing] = await db
            .select({ id: acordaosDicolTable.id })
            .from(acordaosDicolTable)
            .where(
              and(
                eq(acordaosDicolTable.resolucao_id, resolucaoId),
                eq(acordaosDicolTable.numero_acordao, numAcordao),
              ),
            )
            .limit(1);

          if (existing) {
            stats.acordaos_ignorados++;
            continue;
          }

          // Detectar efeito suspensivo no conteúdo
          const efeitoSuspensivo = /efeito\s+suspensivo|recurso.*provid[oa]|conced.*suspensão/i.test(
            item.content || "",
          );

          // Detectar tipo de decisão
          let tipoDecisao = "provimento";
          if (/improvid[oa]|neg[ao].*provimento/i.test(item.content || "")) tipoDecisao = "improvimento";
          else if (/provimento\s+parcial/i.test(item.content || "")) tipoDecisao = "provimento_parcial";
          else if (/efeito\s+suspensivo|liminar/i.test(item.content || "")) tipoDecisao = "liminar_suspensiva";

          // Converter data DD-MM-YYYY para YYYY-MM-DD
          const [dd, mm, yyyy] = dataFmt.split("-");
          const dataISO = `${yyyy}-${mm}-${dd}`;

          // Extrair número do processo
          const procMatch = (item.content || "").match(
            /processo\s+n[°º]?\s*([\d./-]+)/i,
          );
          const numProcesso = procMatch ? procMatch[1] : null;

          // Extrair relator
          const relatorMatch = (item.content || "").match(
            /relator[a]?\s*:?\s*([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç\s]+(?:[A-Z][a-z]+\s*)+)/,
          );
          const relator = relatorMatch ? relatorMatch[1].trim() : null;

          const [novoAcordao] = await db
            .insert(acordaosDicolTable)
            .values({
              resolucao_id: resolucaoId,
              numero_acordao: numAcordao,
              numero_processo: numProcesso,
              data_publicacao_dou: dataISO,
              efeito_suspensivo: efeitoSuspensivo,
              tipo_decisao: tipoDecisao,
              sumario_decisao: (item.content || "").slice(0, 800),
              relator,
              link_dou: item.urlTitle
                ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}`
                : null,
              origem_dado: "DOU_SCAN",
            })
            .returning();

          // Histórico
          await db.insert(resolucoesHistoricoTable).values({
            resolucao_id: resolucaoId,
            campo_alterado: "acordao_dicol",
            valor_anterior: null,
            valor_novo: numAcordao,
            justificativa: efeitoSuspensivo
              ? `[DOU_SCAN] ${numAcordao} — EFEITO SUSPENSIVO conferido pela DICOL. DOU ${dataFmt}.`
              : `[DOU_SCAN] ${numAcordao} registrado — sem efeito suspensivo. DOU ${dataFmt}.`,
            alterado_por: null,
            alterado_por_nome: "DICOL — Diretoria Colegiada",
            fonte: "DICOL_ACORDAO",
            dados_anteriores: null,
            dados_novos: novoAcordao as Record<string, unknown>,
          });

          // Atualizar status da RE se efeito suspensivo
          if (efeitoSuspensivo) {
            await db
              .update(resolucoesEspecificasTable)
              .set({ status: "em_analise", updated_at: new Date() })
              .where(eq(resolucoesEspecificasTable.id, resolucaoId));
          }

          stats.acordaos_importados++;
          stats.detalhes.push({
            numero_acordao: numAcordao,
            resolucao_id: resolucaoId,
            data_publicacao_dou: dataISO,
            efeito_suspensivo: efeitoSuspensivo,
            tipo_decisao: tipoDecisao,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        stats.erros.push(`${dataFmt}: ${msg}`);
      }
    }

    return res.json(stats);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
