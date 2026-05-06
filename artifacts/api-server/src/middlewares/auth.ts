import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "anvisa-re-monitor-secret";

export interface AuthRequest extends Request {
  usuario?: {
    id: string;
    nome: string;
    email: string;
    perfil: string;
    ativo: boolean;
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação necessário" });
  }

  const token = authHeader.slice(7);
  let payload: { userId: string; perfil: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      perfil: string;
    };
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }

  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.id, payload.userId))
    .limit(1);

  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ error: "Usuário inativo" });
  }

  req.usuario = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
  };

  return next();
}

export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      perfil: string;
    };

    const [usuario] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, payload.userId))
      .limit(1);

    if (usuario && usuario.ativo) {
      req.usuario = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
      };
    }
  } catch {
    // Silently ignore invalid token for optional auth
  }

  return next();
}

export function requirePerfil(...perfis: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    if (!perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ error: "Acesso não permitido para este perfil" });
    }
    return next();
  };
}
