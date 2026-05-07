import { Router } from "express";
import { db } from "@workspace/db";
import { usuariosTable } from "@workspace/db";
import { eq, ilike, or, sql, desc } from "drizzle-orm";
import * as crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// GET /v1/usuarios - List users
router.get("/v1/usuarios", async (req, res) => {
  try {
    const { page = "1", limit = "20", q } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let whereClause: any = undefined;
    if (q) {
      whereClause = or(
        ilike(usuariosTable.nome, `%${q}%`),
        ilike(usuariosTable.email, `%${q}%`),
      );
    }

    const [countResult, data] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(usuariosTable)
        .where(whereClause),
      db
        .select({
          id: usuariosTable.id,
          nome: usuariosTable.nome,
          email: usuariosTable.email,
          perfil: usuariosTable.perfil,
          ativo: usuariosTable.ativo,
          ultimo_acesso: usuariosTable.ultimo_acesso,
          created_at: usuariosTable.created_at,
        })
        .from(usuariosTable)
        .where(whereClause)
        .orderBy(desc(usuariosTable.created_at))
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

// POST /v1/usuarios - Create user
router.post("/v1/usuarios", async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
      return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
    }

    const validPerfis = ["administrador", "fiscal", "profissional_saude", "cidadao"];
    if (!validPerfis.includes(perfil)) {
      return res.status(400).json({ error: "Perfil inválido" });
    }

    const [existing] = await db
      .select({ id: usuariosTable.id })
      .from(usuariosTable)
      .where(eq(usuariosTable.email, email))
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const [usuario] = await db
      .insert(usuariosTable)
      .values({
        nome,
        email,
        senha_hash: hashPassword(senha),
        perfil,
        ativo: true,
      })
      .returning({
        id: usuariosTable.id,
        nome: usuariosTable.nome,
        email: usuariosTable.email,
        perfil: usuariosTable.perfil,
        ativo: usuariosTable.ativo,
        created_at: usuariosTable.created_at,
        ultimo_acesso: usuariosTable.ultimo_acesso,
      });

    return res.status(201).json(usuario);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PUT /v1/usuarios/:id - Update user
router.put("/v1/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, perfil, ativo, senha } = req.body;

    const [existing] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const updateData: Record<string, any> = {};
    if (nome !== undefined) updateData.nome = nome;
    if (perfil !== undefined) updateData.perfil = perfil;
    if (ativo !== undefined) updateData.ativo = ativo;
    if (senha !== undefined) updateData.senha_hash = hashPassword(senha);

    const [updated] = await db
      .update(usuariosTable)
      .set(updateData)
      .where(eq(usuariosTable.id, id))
      .returning({
        id: usuariosTable.id,
        nome: usuariosTable.nome,
        email: usuariosTable.email,
        perfil: usuariosTable.perfil,
        ativo: usuariosTable.ativo,
        created_at: usuariosTable.created_at,
        ultimo_acesso: usuariosTable.ultimo_acesso,
      });

    return res.json(updated);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
