import type { Request, Response } from 'express';
import { getUserId } from '../middlewares/auth';
import { paginationSchema } from '../lib/pagination';
import * as campaignService from '../services/campaign.service';
import * as donationService from '../services/donation.service';

// GET /me/campaigns?page=&limit= -> campanhas do usuário logado
export async function campaigns(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  res.json(await campaignService.listOwnCampaigns(getUserId(req), pagination));
}

// GET /me/donations?page=&limit= -> doações feitas pelo usuário logado
export async function donations(req: Request, res: Response) {
  const pagination = paginationSchema.parse(req.query);
  res.json(await donationService.listUserDonations(getUserId(req), pagination));
}
