import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error';
import { verifyToken } from '../lib/jwt';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Token de autenticação não informado');
  }

  const userId = verifyToken(token);
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
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
  if (scheme === 'Bearer' && token) {
    const userId = verifyToken(token);
    if (userId !== null) req.userId = userId;
  }
  next();
}
