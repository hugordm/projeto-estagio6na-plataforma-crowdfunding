import { Router } from 'express';
import * as configController from '../controllers/config.controller';

// Configuração pública do servidor (sem autenticação).
export const configRoutes = Router();

configRoutes.get('/features', configController.features);
