import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth';
import { chatLimiter } from '../middlewares/rate-limit';
import * as chatController from '../controllers/chat.controller';

export const chatRoutes = Router();

// Login opcional: com token, o rate limit conta por usuário; sem token, por IP.
chatRoutes.post('/', optionalAuth, chatLimiter, chatController.send);
