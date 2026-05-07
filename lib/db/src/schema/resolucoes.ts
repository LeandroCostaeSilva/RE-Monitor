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

export const resolucoesEspecificasTable = pgTable("resolucoes_especificas", {
  id: uuid("id").primaryKey().defaultRandom(),
  numero_re: varchar("numero_re", { length: 30 }).unique().notNull(),
  data_publicacao: date("data_publicacao").notNull(),
  data_vigencia_inicio: date("data_vigencia_inicio").notNull(),
  data_vigencia_fim: date("data_vigencia_fim"),
  status: varchar("status", { length: 20 }).notNull().default("vigente"),
  tipo_produto: varchar("tipo_produto", { length: 100 }).notNull(),
  tipo_acao: text("tipo_acao").array().notNull().default([]),
  nome_produto: text("nome_produto").notNull(),
  principio_ativo: text("principio_ativo"),
  fabricante_nome: varchar("fabricante_nome", { length: 200 }),
  fabricante_cnpj: varchar("fabricante_cnpj", { length: 18 }),
  numero_registro_anvisa: varchar("numero_registro_anvisa", { length: 20 }),
  ementa: text("ementa").notNull(),
  link_documento_oficial: text("link_documento_oficial"),
  arquivo_pdf_path: text("arquivo_pdf_path"),
  lotes_afetados: text("lotes_afetados").array().default([]),
  recolhimento_determinado: boolean("recolhimento_determinado").default(false),
  numero_dou_edicao: varchar("numero_dou_edicao", { length: 60 }),
  origem_dado: varchar("origem_dado", { length: 20 }).default("manual"),
  pagina_dou: integer("pagina_dou"),
  secao_dou: integer("secao_dou"),
  criado_por: uuid("criado_por"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});

export const insertResolucaoSchema = createInsertSchema(
  resolucoesEspecificasTable,
).omit({ id: true, created_at: true, updated_at: true });
export type InsertResolucao = z.infer<typeof insertResolucaoSchema>;
export type Resolucao = typeof resolucoesEspecificasTable.$inferSelect;
