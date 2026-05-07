import { Router } from "express";
import { db } from "@workspace/db";
import {
  resolucoesEspecificasTable,
  resolucoesHistoricoTable,
  usuariosTable,
} from "@workspace/db";
import { eq, and, or, ilike, isNull, gte, lte, sql, desc, asc } from "drizzle-orm";

const router = Router();

// GET /v1/resolucoes - List with filters and pagination
router.get("/v1/resolucoes", async (req, res) => {
  try {
    const {
      q,
      status,
      tipo_produto,
      tipo_acao,
      data_inicio,
      data_fim,
      numero_re,
      numero_registro_anvisa,
      fabricante_cnpj,
      page = "1",
      limit = "20",
      order_by = "data_publicacao",
      order_dir = "desc",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [isNull(resolucoesEspecificasTable.deleted_at)];

    if (q) {
      conditions.push(
        or(
          ilike(resolucoesEspecificasTable.nome_produto, `%${q}%`),
          ilike(resolucoesEspecificasTable.principio_ativo || "", `%${q}%`),
          ilike(resolucoesEspecificasTable.fabricante_nome || "", `%${q}%`),
          ilike(resolucoesEspecificasTable.ementa, `%${q}%`),
          ilike(resolucoesEspecificasTable.numero_re, `%${q}%`),
        )!,
      );
    }

    if (numero_re) {
      conditions.push(eq(resolucoesEspecificasTable.numero_re, numero_re));
    }

    if (status) {
      conditions.push(eq(resolucoesEspecificasTable.status, status));
    }

    if (tipo_produto) {
      conditions.push(eq(resolucoesEspecificasTable.tipo_produto, tipo_produto));
    }

    if (tipo_acao) {
      conditions.push(
        sql`${resolucoesEspecificasTable.tipo_acao} @> ARRAY[${sql.raw(`'${tipo_acao}'`)}]::text[]`,
      );
    }

    if (data_inicio) {
      conditions.push(gte(resolucoesEspecificasTable.data_publicacao, data_inicio));
    }

    if (data_fim) {
      conditions.push(lte(resolucoesEspecificasTable.data_publicacao, data_fim));
    }

    if (numero_registro_anvisa) {
      conditions.push(
        ilike(
          resolucoesEspecificasTable.numero_registro_anvisa || "",
          `%${numero_registro_anvisa}%`,
        ),
      );
    }

    if (fabricante_cnpj) {
      conditions.push(
        ilike(resolucoesEspecificasTable.fabricante_cnpj || "", `%${fabricante_cnpj}%`),
      );
    }

    const where = and(...conditions);

    const ALLOWED_ORDER_COLS: Record<string, any> = {
      data_publicacao: resolucoesEspecificasTable.data_publicacao,
      numero_re: resolucoesEspecificasTable.numero_re,
      nome_produto: resolucoesEspecificasTable.nome_produto,
      status: resolucoesEspecificasTable.status,
      tipo_produto: resolucoesEspecificasTable.tipo_produto,
      created_at: resolucoesEspecificasTable.created_at,
      updated_at: resolucoesEspecificasTable.updated_at,
    };

    const orderCol = ALLOWED_ORDER_COLS[order_by] || resolucoesEspecificasTable.data_publicacao;
    const orderFn = order_dir === "asc" ? asc : desc;

    const [countResult, data] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(resolucoesEspecificasTable)
        .where(where),
      db
        .select()
        .from(resolucoesEspecificasTable)
        .where(where)
        .orderBy(orderFn(orderCol))
        .limit(limitNum)
        .offset(offset),
    ]);

    const total = countResult[0]?.count || 0;

    return res.json({
      data,
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /v1/resolucoes - Create new RE
router.post("/v1/resolucoes", async (req, res) => {
  try {
    const {
      numero_re,
      data_publicacao,
      data_vigencia_inicio,
      data_vigencia_fim,
      status,
      tipo_produto,
      tipo_acao,
      nome_produto,
      principio_ativo,
      fabricante_nome,
      fabricante_cnpj,
      numero_registro_anvisa,
      ementa,
      link_documento_oficial,
      arquivo_pdf_path,
    } = req.body;

    if (!numero_re || !data_publicacao || !data_vigencia_inicio || !status || !tipo_produto || !tipo_acao || !nome_produto || !ementa) {
      return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
    }

    const [existing] = await db
      .select({ id: resolucoesEspecificasTable.id })
      .from(resolucoesEspecificasTable)
      .where(eq(resolucoesEspecificasTable.numero_re, numero_re))
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: `Já existe uma RE com o número ${numero_re}` });
    }

    const [resolucao] = await db
      .insert(resolucoesEspecificasTable)
      .values({
        numero_re,
        data_publicacao,
        data_vigencia_inicio,
        data_vigencia_fim: data_vigencia_fim || null,
        status,
        tipo_produto,
        tipo_acao: Array.isArray(tipo_acao) ? tipo_acao : [tipo_acao],
        nome_produto,
        principio_ativo: principio_ativo || null,
        fabricante_nome: fabricante_nome || null,
        fabricante_cnpj: fabricante_cnpj || null,
        numero_registro_anvisa: numero_registro_anvisa || null,
        ementa,
        link_documento_oficial: link_documento_oficial || null,
        arquivo_pdf_path: arquivo_pdf_path || null,
        criado_por: null,
      })
      .returning();

    // Audit log
    await db.insert(resolucoesHistoricoTable).values({
      resolucao_id: resolucao.id,
      justificativa: "Registro inicial da RE",
      alterado_por: null,
      alterado_por_nome: null,
      fonte: "MANUAL",
      dados_novos: resolucao,
    });

    return res.status(201).json(resolucao);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /v1/resolucoes/exportar - Export results
router.get("/v1/resolucoes/exportar", async (req, res) => {
  try {
    const { formato = "csv", q, status, tipo_produto, tipo_acao, data_inicio, data_fim } =
      req.query as Record<string, string>;

    if (!["csv", "xlsx", "pdf"].includes(formato)) {
      return res.status(400).json({ error: "Formato inválido. Use: csv, xlsx ou pdf" });
    }

    const conditions = [isNull(resolucoesEspecificasTable.deleted_at)];
    if (q) conditions.push(or(
      ilike(resolucoesEspecificasTable.nome_produto, `%${q}%`),
      ilike(resolucoesEspecificasTable.ementa, `%${q}%`),
    )!);
    if (status) conditions.push(eq(resolucoesEspecificasTable.status, status));
    if (tipo_produto) conditions.push(eq(resolucoesEspecificasTable.tipo_produto, tipo_produto));
    if (data_inicio) conditions.push(gte(resolucoesEspecificasTable.data_publicacao, data_inicio));
    if (data_fim) conditions.push(lte(resolucoesEspecificasTable.data_publicacao, data_fim));

    const data = await db
      .select()
      .from(resolucoesEspecificasTable)
      .where(and(...conditions))
      .orderBy(desc(resolucoesEspecificasTable.data_publicacao))
      .limit(5000);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `resolucoes_${timestamp}.${formato}`;

    return res.json({
      url: `/api/v1/resolucoes/exportar/download?token=${timestamp}&formato=${formato}`,
      formato,
      total_registros: data.length,
      filename,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /v1/resolucoes/:id - Detail
router.get("/v1/resolucoes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [resolucao] = await db
      .select()
      .from(resolucoesEspecificasTable)
      .where(
        and(
          eq(resolucoesEspecificasTable.id, id),
          isNull(resolucoesEspecificasTable.deleted_at),
        ),
      )
      .limit(1);

    if (!resolucao) {
      return res.status(404).json({ error: "Resolução não encontrada" });
    }

    return res.json(resolucao);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PUT /v1/resolucoes/:id - Update RE
router.put("/v1/resolucoes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      data_vigencia_fim,
      status,
      tipo_produto,
      tipo_acao,
      nome_produto,
      principio_ativo,
      fabricante_nome,
      fabricante_cnpj,
      numero_registro_anvisa,
      ementa,
      link_documento_oficial,
      arquivo_pdf_path,
      justificativa_alteracao,
    } = req.body;

    const [existing] = await db
      .select()
      .from(resolucoesEspecificasTable)
      .where(
        and(
          eq(resolucoesEspecificasTable.id, id),
          isNull(resolucoesEspecificasTable.deleted_at),
        ),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Resolução não encontrada" });
    }

    const updateData: Record<string, any> = {};
    if (data_vigencia_fim !== undefined) updateData.data_vigencia_fim = data_vigencia_fim;
    if (status !== undefined) updateData.status = status;
    if (tipo_produto !== undefined) updateData.tipo_produto = tipo_produto;
    if (tipo_acao !== undefined) updateData.tipo_acao = Array.isArray(tipo_acao) ? tipo_acao : [tipo_acao];
    if (nome_produto !== undefined) updateData.nome_produto = nome_produto;
    if (principio_ativo !== undefined) updateData.principio_ativo = principio_ativo;
    if (fabricante_nome !== undefined) updateData.fabricante_nome = fabricante_nome;
    if (fabricante_cnpj !== undefined) updateData.fabricante_cnpj = fabricante_cnpj;
    if (numero_registro_anvisa !== undefined) updateData.numero_registro_anvisa = numero_registro_anvisa;
    if (ementa !== undefined) updateData.ementa = ementa;
    if (link_documento_oficial !== undefined) updateData.link_documento_oficial = link_documento_oficial;
    if (arquivo_pdf_path !== undefined) updateData.arquivo_pdf_path = arquivo_pdf_path;

    const [updated] = await db
      .update(resolucoesEspecificasTable)
      .set({ ...updateData, updated_at: new Date() })
      .where(eq(resolucoesEspecificasTable.id, id))
      .returning();

    // Audit log
    await db.insert(resolucoesHistoricoTable).values({
      resolucao_id: id,
      justificativa: justificativa_alteracao || "Atualização dos dados da RE",
      alterado_por: null,
      alterado_por_nome: null,
      fonte: "MANUAL",
      dados_anteriores: existing,
      dados_novos: updated,
    });

    return res.json(updated);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// DELETE /v1/resolucoes/:id - Soft delete
router.delete("/v1/resolucoes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(resolucoesEspecificasTable)
      .where(
        and(
          eq(resolucoesEspecificasTable.id, id),
          isNull(resolucoesEspecificasTable.deleted_at),
        ),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Resolução não encontrada" });
    }

    await db
      .update(resolucoesEspecificasTable)
      .set({ deleted_at: new Date() })
      .where(eq(resolucoesEspecificasTable.id, id));

    // Audit log
    await db.insert(resolucoesHistoricoTable).values({
      resolucao_id: id,
      campo_alterado: "deleted_at",
      justificativa: "Exclusão lógica da RE",
      alterado_por: null,
      alterado_por_nome: null,
      fonte: "MANUAL",
      dados_anteriores: existing,
    });

    return res.json({ message: "Resolução excluída com sucesso" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /v1/resolucoes/:id/historico - Version history
router.get("/v1/resolucoes/:id/historico", async (req, res) => {
  try {
    const { id } = req.params;

    const [resolucao] = await db
      .select({ id: resolucoesEspecificasTable.id })
      .from(resolucoesEspecificasTable)
      .where(eq(resolucoesEspecificasTable.id, id))
      .limit(1);

    if (!resolucao) {
      return res.status(404).json({ error: "Resolução não encontrada" });
    }

    const historico = await db
      .select()
      .from(resolucoesHistoricoTable)
      .where(eq(resolucoesHistoricoTable.resolucao_id, id))
      .orderBy(desc(resolucoesHistoricoTable.created_at));

    return res.json(historico);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
