import {
  pgTable,
  text,
  varchar,
  date,
  timestamp,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const acordaosDicolTable = pgTable("acordaos_dicol", {
  id: uuid("id").primaryKey().defaultRandom(),
  resolucao_id: uuid("resolucao_id").notNull(),
  numero_acordao: varchar("numero_acordao", { length: 150 }).notNull(),
  numero_processo: varchar("numero_processo", { length: 150 }),
  data_publicacao_dou: date("data_publicacao_dou").notNull(),
  data_decisao: date("data_decisao"),
  efeito_suspensivo: boolean("efeito_suspensivo").notNull().default(false),
  tipo_decisao: varchar("tipo_decisao", { length: 60 }),
  sumario_decisao: text("sumario_decisao"),
  relator: varchar("relator", { length: 200 }),
  link_dou: text("link_dou"),
  numero_dou_edicao: varchar("numero_dou_edicao", { length: 60 }),
  secao_dou: integer("secao_dou"),
  pagina_dou: integer("pagina_dou"),
  origem_dado: varchar("origem_dado", { length: 20 }).default("MANUAL"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAcordaoSchema = createInsertSchema(
  acordaosDicolTable,
).omit({ id: true, created_at: true, updated_at: true });
export type InsertAcordao = z.infer<typeof insertAcordaoSchema>;
export type AcordaoDicol = typeof acordaosDicolTable.$inferSelect;
