import { Router } from "express";
import { db } from "@workspace/db";
import { syncLogsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { syncDOU, backfillDOU, parseAndImportText } from "../services/dou-sync";
import { logger } from "../lib/logger";

const router = Router();

// GET /v1/admin/sync-logs - List sync history
router.get("/v1/admin/sync-logs", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query["limit"] ?? "20")) || 20);
    const logs = await db.select().from(syncLogsTable).orderBy(desc(syncLogsTable.created_at)).limit(limit);
    res.json({ data: logs, total: logs.length });
  } catch (err) {
    req.log.error({ err }, "Error listing sync logs");
    res.status(500).json({ message: "Erro ao buscar histórico de sincronização" });
  }
});

// GET /v1/admin/sync-logs/latest - Get latest sync
router.get("/v1/admin/sync-logs/latest", async (req, res) => {
  try {
    const [latest] = await db.select().from(syncLogsTable).orderBy(desc(syncLogsTable.created_at)).limit(1);
    res.json({ data: latest ?? null });
  } catch (err) {
    req.log.error({ err }, "Error fetching latest sync");
    res.status(500).json({ message: "Erro ao buscar último sync" });
  }
});

// GET /v1/admin/sync-logs/:id - Get specific sync log
router.get("/v1/admin/sync-logs/:id", async (req, res) => {
  try {
    const id = req.params["id"]!;
    const logs = await db.select().from(syncLogsTable).where(sql`${syncLogsTable.id} = ${id}`).limit(1);
    const log = logs[0];
    if (!log) {
      res.status(404).json({ message: "Log não encontrado" });
      return;
    }
    res.json({ data: log });
  } catch (err) {
    req.log.error({ err }, "Error fetching sync log");
    res.status(500).json({ message: "Erro ao buscar log" });
  }
});

// POST /v1/admin/sync-dou - Trigger sync for date range
router.post("/v1/admin/sync-dou", async (req, res) => {
  const { date_from, date_to } = req.body as { date_from?: string; date_to?: string };

  const dateTo = date_to ? new Date(date_to) : new Date();
  const dateFrom = date_from ? new Date(date_from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
    res.status(400).json({ message: "Datas inválidas. Use formato AAAA-MM-DD." });
    return;
  }

  if (dateFrom > dateTo) {
    res.status(400).json({ message: "date_from deve ser anterior a date_to." });
    return;
  }

  const maxRangeDays = 90;
  const diffDays = (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > maxRangeDays) {
    res.status(400).json({ message: `Período máximo por sync manual: ${maxRangeDays} dias. Use o backfill para períodos maiores.` });
    return;
  }

  req.log.info({ dateFrom, dateTo }, "Manual DOU sync triggered");

  res.status(202).json({ message: "Sincronização iniciada", dateFrom: dateFrom.toISOString().slice(0, 10), dateTo: dateTo.toISOString().slice(0, 10) });

  syncDOU({ dateFrom, dateTo }).catch((err: unknown) => {
    logger.error({ err }, "Async DOU sync failed");
  });
});

// POST /v1/admin/sync-dou/backfill - Backfill from start date
router.post("/v1/admin/sync-dou/backfill", async (req, res) => {
  const { start_date, end_date } = req.body as { start_date?: string; end_date?: string };

  const startDate = start_date ? new Date(start_date) : new Date("2020-01-01");
  const endDate = end_date ? new Date(end_date) : new Date();

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ message: "Datas inválidas. Use formato AAAA-MM-DD." });
    return;
  }

  req.log.info({ startDate, endDate }, "Backfill DOU triggered");

  res.status(202).json({
    message: "Backfill iniciado em background. Pode levar vários minutos.",
    start_date: startDate.toISOString().slice(0, 10),
    end_date: endDate.toISOString().slice(0, 10),
  });

  backfillDOU({ startDate, endDate }).catch((err: unknown) => {
    logger.error({ err }, "Backfill DOU failed");
  });
});

// POST /v1/admin/sync-dou/import-text - Import REs from pasted DOU text (AI parsing)
router.post("/v1/admin/sync-dou/import-text", async (req, res) => {
  const { texto, data_referencia } = req.body as { texto?: string; data_referencia?: string };

  if (!texto || texto.trim().length < 50) {
    res.status(400).json({ message: "Texto muito curto. Cole o texto do DOU com as Resoluções Específicas." });
    return;
  }

  const dataRef = data_referencia ? new Date(data_referencia) : new Date();
  if (isNaN(dataRef.getTime())) {
    res.status(400).json({ message: "data_referencia inválida." });
    return;
  }

  req.log.info({ chars: texto.length }, "Manual text import triggered");

  res.status(202).json({ message: "Importação iniciada. O texto será processado pela IA.", chars: texto.length });

  parseAndImportText({ texto, dataReferencia: dataRef }).catch((err: unknown) => {
    logger.error({ err }, "Text import failed");
  });
});

export default router;
