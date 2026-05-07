import {
  pgTable,
  text,
  varchar,
  date,
  timestamp,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const syncLogsTable = pgTable("sync_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  inicio: timestamp("inicio", { withTimezone: true }).notNull().defaultNow(),
  fim: timestamp("fim", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  periodo_inicio: date("periodo_inicio").notNull(),
  periodo_fim: date("periodo_fim").notNull(),
  estrategia_usada: varchar("estrategia_usada", { length: 80 }),
  total_encontrados: integer("total_encontrados").default(0),
  total_inseridos: integer("total_inseridos").default(0),
  total_atualizados: integer("total_atualizados").default(0),
  total_erros: integer("total_erros").default(0),
  mensagem: text("mensagem"),
  detalhes: jsonb("detalhes"),
  iniciado_por: uuid("iniciado_por"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SyncLog = typeof syncLogsTable.$inferSelect;
