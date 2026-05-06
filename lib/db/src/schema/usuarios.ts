import {
  pgTable,
  text,
  varchar,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usuariosTable = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  senha_hash: text("senha_hash").notNull(),
  perfil: varchar("perfil", { length: 30 }).notNull().default("fiscal"),
  ativo: boolean("ativo").notNull().default(true),
  ultimo_acesso: timestamp("ultimo_acesso", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUsuarioSchema = createInsertSchema(usuariosTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuariosTable.$inferSelect;
