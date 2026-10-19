import type { Request, Response } from 'express';
import { z } from 'zod';
import { getUserId } from '../middlewares/auth';
import { moneySchema } from '../lib/money';
import { idParamSchema, paginationSchema } from '../lib/pagination';
import * as donationService from '../services/donation.service';

export const donationSchema = z.object({
  amount: moneySchema('Valor da doação (amount)'),
  message: z.string('Mensagem deve ser um texto').trim().max(500, 'Mensagem deve ter no máximo 500 caracteres').optional(),
});

export async function create(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const data = donationSchema.parse(req.body ?? {});
  res.status(201).json(await donationService.createDonation(id, getUserId(req), data));
}

export async function list(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const pagination = paginationSchema.parse(req.query);
  res.json(await donationService.listDonations(id, pagination));
}
