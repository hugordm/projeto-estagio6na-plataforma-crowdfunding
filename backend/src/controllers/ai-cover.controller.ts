import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/http-error';
import { getUserId } from '../middlewares/auth';
import * as aiCoverService from '../services/ai-cover.service';

const aiCoverSchema = z.object({
  title: z.string({ error: 'Título é obrigatório' }).trim().min(3, 'Título deve ter pelo menos 3 caracteres').max(120, 'Título deve ter no máximo 120 caracteres'),
  description: z.string({ error: 'Descrição é obrigatória' }).trim().min(10, 'Descrição deve ter pelo menos 10 caracteres').max(5000, 'Descrição deve ter no máximo 5000 caracteres'),
  categoryId: z.coerce.number({ error: 'Categoria inválida' }).int('Categoria inválida').positive('Categoria inválida').optional(),
});

// POST /campaigns/ai-cover { title, description, categoryId? } -> { url }
export async function create(req: Request, res: Response) {
  const { title, description, categoryId } = aiCoverSchema.parse(req.body ?? {});

  let categoryName = 'Geral';
  if (categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new HttpError(400, 'Categoria não encontrada');
    categoryName = category.name;
  }

  const url = await aiCoverService.generateCover(getUserId(req), { title, description, categoryName });
  res.status(201).json({ url });
}
