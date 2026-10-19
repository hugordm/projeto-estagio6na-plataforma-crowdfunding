import type { Request, Response } from 'express';
import { z } from 'zod';
import * as aiDescriptionService from '../services/ai-description.service';
import * as aiCategoryService from '../services/ai-category.service';

// IA de apoio ao formulário de campanha: mesmos limites de título e descrição da campanha.
const titleSchema = z.string({ error: 'Título é obrigatório' }).trim().min(3, 'Título deve ter pelo menos 3 caracteres').max(120, 'Título deve ter no máximo 120 caracteres');
const descriptionSchema = z.string({ error: 'Descrição é obrigatória' }).trim().min(10, 'Descrição deve ter pelo menos 10 caracteres').max(5000, 'Descrição deve ter no máximo 5000 caracteres');

const descriptionInputSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  category: z.string('Categoria deve ser um texto').trim().max(60, 'Categoria inválida').optional(),
});

const categoryInputSchema = z.object({ title: titleSchema, description: descriptionSchema });

// POST /campaigns/ai-description { title, description, category? } -> { description }
export async function improveDescription(req: Request, res: Response) {
  const input = descriptionInputSchema.parse(req.body ?? {});
  res.json({ description: await aiDescriptionService.improveDescription(input) });
}

// POST /campaigns/ai-category { title, description } -> { categoryId }
export async function suggestCategory(req: Request, res: Response) {
  const { title, description } = categoryInputSchema.parse(req.body ?? {});
  res.json({ categoryId: await aiCategoryService.suggestCategory(title, description) });
}
