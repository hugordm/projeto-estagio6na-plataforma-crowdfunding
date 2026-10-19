import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { forgotPasswordEmailLimiter, passwordResetIpLimiter } from '../middlewares/rate-limit';

export const authRoutes = Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.post('/forgot-password', passwordResetIpLimiter, forgotPasswordEmailLimiter, authController.forgotPassword);
authRoutes.post('/reset-password', passwordResetIpLimiter, authController.resetPassword);
