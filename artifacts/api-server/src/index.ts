import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { syncDOU } from "./services/dou-sync";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Daily sync: run every day at 07:00 Brasília time (10:00 UTC)
  cron.schedule("0 10 * * *", async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    logger.info({ date: yesterday.toISOString().slice(0, 10) }, "Cron: starting daily DOU sync");
    try {
      const result = await syncDOU({ dateFrom: yesterday, dateTo: today });
      logger.info({ result }, "Cron: daily DOU sync complete");
    } catch (err) {
      logger.error({ err }, "Cron: daily DOU sync failed");
    }
  }, { timezone: "America/Sao_Paulo" });

  logger.info("Cron job scheduled: daily DOU sync at 07:00 BRT");
});
