import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Rota não encontrada' });
}

// Middleware de erro global: toda resposta de erro sai como { error: "mensagem" }.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'Dados inválidos' });
    return;
  }

  // JSON malformado no corpo (erro lançado pelo express.json()).
  if (err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
    return;
  }

  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
