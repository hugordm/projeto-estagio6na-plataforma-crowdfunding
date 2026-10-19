import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import * as meController from '../controllers/me.controller';

// Rotas da área "Minha conta": sempre do usuário logado (o id vem do token, nunca da URL).
export const meRoutes = Router();

meRoutes.use(requireAuth);
meRoutes.get('/campaigns', meController.campaigns);
meRoutes.get('/donations', meController.donations);
