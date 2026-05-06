import { Router } from "express";
import { db } from "@workspace/db";
import { usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET || "anvisa-re-monitor-secret";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function generateToken(userId: string, perfil: string): string {
  return jwt.sign({ userId, perfil }, JWT_SECRET, { expiresIn: "24h" });
}

router.post("/v1/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const [usuario] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.email, email))
      .limit(1);

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (!verifyPassword(senha, usuario.senha_hash)) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    await db
      .update(usuariosTable)
      .set({ ultimo_acesso: new Date() })
      .where(eq(usuariosTable.id, usuario.id));

    const token = generateToken(usuario.id, usuario.perfil);

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        created_at: usuario.created_at,
        ultimo_acesso: new Date().toISOString(),
      },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/v1/auth/logout", (req, res) => {
  return res.json({ message: "Sessão encerrada com sucesso" });
});

router.get("/v1/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.slice(7);
    let payload: { userId: string; perfil: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        perfil: string;
      };
    } catch {
      return res.status(401).json({ error: "Token inválido" });
    }

    const [usuario] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, payload.userId))
      .limit(1);

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ error: "Usuário inativo ou não encontrado" });
    }

    return res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      created_at: usuario.created_at,
      ultimo_acesso: usuario.ultimo_acesso,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
