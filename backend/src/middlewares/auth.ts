import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

// Lê o token do cabeçalho Authorization e devolve o id do usuário se ele for válido E ainda
// estiver na versão atual do banco (a versão muda ao redefinir a senha). Senão, null.
async function authenticatedUserId(req: Request): Promise<number | null> {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { tokenVersion: true } });
  if (!user || user.tokenVersion !== payload.tokenVersion) return null;
  return payload.userId;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    throw new HttpError(401, 'Token de autenticação não informado');
  }

  const userId = await authenticatedUserId(req);
  if (userId === null) {
    throw new HttpError(401, 'Token inválido ou expirado');
  }

  req.userId = userId;
  next();
}

// Para uso em rotas protegidas por requireAuth: devolve o userId já como number.
export function getUserId(req: Request): number {
  if (req.userId === undefined) throw new HttpError(401, 'Não autenticado');
  return req.userId;
}

// Para rotas que funcionam com ou sem login (ex.: chat): se houver um token válido, preenche
// req.userId; se não houver (ou for inválido), segue como visitante, sem erro.
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = await authenticatedUserId(req);
  if (userId !== null) req.userId = userId;
  next();
}
