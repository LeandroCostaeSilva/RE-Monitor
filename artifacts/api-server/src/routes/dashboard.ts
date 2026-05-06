import { Router } from "express";
import { db } from "@workspace/db";
import { resolucoesEspecificasTable, usuariosTable } from "@workspace/db";
import { eq, isNull, sql, desc } from "drizzle-orm";

const router = Router();

// GET /v1/dashboard/stats
router.get("/v1/dashboard/stats", async (req, res) => {
  try {
    const [statsResult, totalUsuarios, ultimaAtualizacao] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          vigentes: sql<number>`count(*) filter (where status = 'vigente')::int`,
          revogadas: sql<number>`count(*) filter (where status = 'revogada')::int`,
          encerradas: sql<number>`count(*) filter (where status = 'encerrada')::int`,
          em_analise: sql<number>`count(*) filter (where status = 'em_analise')::int`,
          novas_este_mes: sql<number>`count(*) filter (where date_trunc('month', created_at) = date_trunc('month', now()))::int`,
        })
        .from(resolucoesEspecificasTable)
        .where(isNull(resolucoesEspecificasTable.deleted_at)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(usuariosTable)
        .where(eq(usuariosTable.ativo, true)),
      db
        .select({ updated_at: resolucoesEspecificasTable.updated_at })
        .from(resolucoesEspecificasTable)
        .where(isNull(resolucoesEspecificasTable.deleted_at))
        .orderBy(desc(resolucoesEspecificasTable.updated_at))
        .limit(1),
    ]);

    const stats = statsResult[0];

    return res.json({
      total_resolucoes: stats?.total || 0,
      vigentes: stats?.vigentes || 0,
      revogadas: stats?.revogadas || 0,
      encerradas: stats?.encerradas || 0,
      em_analise: stats?.em_analise || 0,
      novas_este_mes: stats?.novas_este_mes || 0,
      total_usuarios: totalUsuarios[0]?.count || 0,
      ultima_atualizacao: ultimaAtualizacao[0]?.updated_at?.toISOString() || new Date().toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /v1/dashboard/recentes
router.get("/v1/dashboard/recentes", async (req, res) => {
  try {
    const { limit = "10" } = req.query as Record<string, string>;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

    const data = await db
      .select({
        id: resolucoesEspecificasTable.id,
        numero_re: resolucoesEspecificasTable.numero_re,
        nome_produto: resolucoesEspecificasTable.nome_produto,
        status: resolucoesEspecificasTable.status,
        tipo_produto: resolucoesEspecificasTable.tipo_produto,
        data_publicacao: resolucoesEspecificasTable.data_publicacao,
        fabricante_nome: resolucoesEspecificasTable.fabricante_nome,
        updated_at: resolucoesEspecificasTable.updated_at,
      })
      .from(resolucoesEspecificasTable)
      .where(isNull(resolucoesEspecificasTable.deleted_at))
      .orderBy(desc(resolucoesEspecificasTable.updated_at))
      .limit(limitNum);

    return res.json(data);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /v1/dashboard/por-categoria
router.get("/v1/dashboard/por-categoria", async (req, res) => {
  try {
    const data = await db
      .select({
        categoria: resolucoesEspecificasTable.tipo_produto,
        total: sql<number>`count(*)::int`,
        vigentes: sql<number>`count(*) filter (where status = 'vigente')::int`,
      })
      .from(resolucoesEspecificasTable)
      .where(isNull(resolucoesEspecificasTable.deleted_at))
      .groupBy(resolucoesEspecificasTable.tipo_produto)
      .orderBy(sql`count(*) desc`);

    return res.json(data);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /v1/dashboard/por-status
router.get("/v1/dashboard/por-status", async (req, res) => {
  try {
    const data = await db
      .select({
        status: resolucoesEspecificasTable.status,
        total: sql<number>`count(*)::int`,
      })
      .from(resolucoesEspecificasTable)
      .where(isNull(resolucoesEspecificasTable.deleted_at))
      .groupBy(resolucoesEspecificasTable.status)
      .orderBy(sql`count(*) desc`);

    return res.json(data);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
