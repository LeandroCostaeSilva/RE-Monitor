import { Router } from "express";
import { db } from "@workspace/db";
import { resolucoesEspecificasTable } from "@workspace/db";
import { isNull, sql, desc, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /v1/relatorios/mensal
router.get("/v1/relatorios/mensal", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const {
      ano = String(now.getFullYear()),
      mes = String(now.getMonth() + 1),
    } = req.query as Record<string, string>;

    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes);

    const startDate = `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;
    const endDate = new Date(anoNum, mesNum, 0);
    const endDateStr = `${anoNum}-${String(mesNum).padStart(2, "0")}-${endDate.getDate()}`;

    const baseCondition = and(
      isNull(resolucoesEspecificasTable.deleted_at),
      gte(resolucoesEspecificasTable.data_publicacao, startDate),
      lte(resolucoesEspecificasTable.data_publicacao, endDateStr),
    );

    const [totalResult, porCategoria, porStatus, resolucoes] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(resolucoesEspecificasTable)
        .where(baseCondition),
      db
        .select({
          categoria: resolucoesEspecificasTable.tipo_produto,
          total: sql<number>`count(*)::int`,
          vigentes: sql<number>`count(*) filter (where status = 'vigente')::int`,
        })
        .from(resolucoesEspecificasTable)
        .where(baseCondition)
        .groupBy(resolucoesEspecificasTable.tipo_produto)
        .orderBy(sql`count(*) desc`),
      db
        .select({
          status: resolucoesEspecificasTable.status,
          total: sql<number>`count(*)::int`,
        })
        .from(resolucoesEspecificasTable)
        .where(baseCondition)
        .groupBy(resolucoesEspecificasTable.status),
      db
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
        .where(baseCondition)
        .orderBy(desc(resolucoesEspecificasTable.data_publicacao)),
    ]);

    return res.json({
      ano: anoNum,
      mes: mesNum,
      total_novas: totalResult[0]?.count || 0,
      por_categoria: porCategoria,
      por_status: porStatus,
      resolucoes,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
