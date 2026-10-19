import type { Request, Response } from 'express';
import { z } from 'zod';
import { getUserId } from '../middlewares/auth';
import { moneySchema } from '../lib/money';
import { idParamSchema, paginationSchema } from '../lib/pagination';
import * as campaignService from '../services/campaign.service';
import * as searchService from '../services/search.service';

const listQuerySchema = paginationSchema.extend({
  category: z.string().trim().optional(),
  q: z.string().trim().optional(),
});

const deadlineSchema = z.coerce
  .date({ error: 'Prazo (deadline) deve ser uma data válida' })
  .refine((date) => date > new Date(), 'Prazo (deadline) deve ser uma data futura');

const campaignSchema = z.object({
  title: z.string({ error: 'Título é obrigatório' }).trim().min(3, 'Título deve ter pelo menos 3 caracteres').max(120, 'Título deve ter no máximo 120 caracteres'),
  description: z.string({ error: 'Descrição é obrigatória' }).trim().min(10, 'Descrição deve ter pelo menos 10 caracteres').max(5000, 'Descrição deve ter no máximo 5000 caracteres'),
  goalAmount: moneySchema('Meta (goalAmount)'),
  deadline: deadlineSchema,
  categoryId: z.coerce.number({ error: 'Categoria é obrigatória' }).int('Categoria inválida').positive('Categoria inválida'),
  // Aceita URL externa ou a devolvida por POST /uploads/campaign-image (só http/https).
  imageUrl: z.url({ protocol: /^https?$/, error: 'URL da imagem inválida' }).optional(),
});

const updateCampaignSchema = campaignSchema
  .extend({
    status: z.enum(['ACTIVE', 'FINISHED'], { error: 'Status deve ser ACTIVE ou FINISHED' }),
    // Na edição, null remove a imagem.
    imageUrl: campaignSchema.shape.imageUrl.unwrap().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualizar');

export async function list(req: Request, res: Response) {
  const filters = listQuerySchema.parse(req.query);
  res.json(await campaignService.listCampaigns(filters));
}

const searchQuerySchema = paginationSchema.extend({
  q: z.string({ error: 'Informe o texto da busca (q)' }).trim().min(2, 'A busca deve ter pelo menos 2 caracteres').max(200, 'A busca deve ter no máximo 200 caracteres'),
  category: z.string().trim().optional(),
});

// GET /campaigns/search?q=...: busca semântica (com fallback para busca textual).
export async function search(req: Request, res: Response) {
  const filters = searchQuerySchema.parse(req.query);
  res.json(await searchService.searchCampaigns(filters));
}

export async function getById(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json(await campaignService.getCampaign(id));
}

export async function create(req: Request, res: Response) {
  const data = campaignSchema.parse(req.body ?? {});
  res.status(201).json(await campaignService.createCampaign(getUserId(req), data));
}

export async function update(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const data = updateCampaignSchema.parse(req.body ?? {});
  res.json(await campaignService.updateCampaign(id, getUserId(req), data));
}

export async function remove(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await campaignService.deleteCampaign(id, getUserId(req));
  res.status(204).end();
}
