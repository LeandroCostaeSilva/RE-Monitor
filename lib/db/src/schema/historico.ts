import {
  pgTable,
  text,
  varchar,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resolucoesHistoricoTable = pgTable("resolucoes_historico", {
  id: uuid("id").primaryKey().defaultRandom(),
  resolucao_id: uuid("resolucao_id").notNull(),
  campo_alterado: varchar("campo_alterado", { length: 100 }),
  valor_anterior: text("valor_anterior"),
  valor_novo: text("valor_novo"),
  justificativa: text("justificativa"),
  alterado_por: uuid("alterado_por"),
  alterado_por_nome: varchar("alterado_por_nome", { length: 200 }),
  fonte: varchar("fonte", { length: 50 }).notNull().default("MANUAL"),
  dados_anteriores: jsonb("dados_anteriores"),
  dados_novos: jsonb("dados_novos"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertHistoricoSchema = createInsertSchema(
  resolucoesHistoricoTable,
).omit({ id: true, created_at: true });
export type InsertHistorico = z.infer<typeof insertHistoricoSchema>;
export type Historico = typeof resolucoesHistoricoTable.$inferSelect;
