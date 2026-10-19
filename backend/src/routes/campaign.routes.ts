import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { aiImageLimiter, aiTextLimiter, semanticSearchLimiter } from '../middlewares/rate-limit';
import * as campaignController from '../controllers/campaign.controller';
import * as donationController from '../controllers/donation.controller';
import * as aiCoverController from '../controllers/ai-cover.controller';
import * as aiWritingController from '../controllers/ai-writing.controller';

export const campaignRoutes = Router();

campaignRoutes.get('/', campaignController.list);
// Precisa vir antes de '/:id', senão "search" seria tratado como um id.
campaignRoutes.get('/search', semanticSearchLimiter, campaignController.search);
campaignRoutes.get('/:id', campaignController.getById);
campaignRoutes.post('/', requireAuth, campaignController.create);
campaignRoutes.post('/ai-cover', requireAuth, aiImageLimiter, aiCoverController.create);
campaignRoutes.post('/ai-description', requireAuth, aiTextLimiter, aiWritingController.improveDescription);
campaignRoutes.post('/ai-category', requireAuth, aiTextLimiter, aiWritingController.suggestCategory);
campaignRoutes.put('/:id', requireAuth, campaignController.update);
campaignRoutes.delete('/:id', requireAuth, campaignController.remove);

campaignRoutes.get('/:id/donations', donationController.list);
campaignRoutes.post('/:id/donations', requireAuth, donationController.create);
