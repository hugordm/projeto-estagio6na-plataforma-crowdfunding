import type { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import * as passwordResetService from '../services/password-reset.service';

const emailSchema = z
  .string({ error: 'E-mail é obrigatório' })
  .trim()
  .toLowerCase()
  .pipe(z.email('E-mail inválido'));

// Mesmas regras no cadastro e na redefinição de senha (bcrypt usa no máximo 72 bytes).
const passwordSchema = z
  .string({ error: 'Senha é obrigatória' })
  .min(6, 'Senha deve ter pelo menos 6 caracteres')
  .max(72, 'Senha deve ter no máximo 72 caracteres');

const registerSchema = z.object({
  name: z.string({ error: 'Nome é obrigatório' }).trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Senha é obrigatória' }).min(1, 'Senha é obrigatória'),
});

const forgotPasswordSchema = z.object({ email: emailSchema });

const resetPasswordSchema = z.object({
  token: z.string({ error: 'Token é obrigatório' }).trim().min(1, 'Token é obrigatório').max(200, 'Token inválido'),
  password: passwordSchema,
});

export async function register(req: Request, res: Response) {
  const data = registerSchema.parse(req.body ?? {});
  res.status(201).json(await authService.register(data));
}

export async function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body ?? {});
  res.json(await authService.login(data));
}

// Sempre a mesma resposta, exista ou não o e-mail.
export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body ?? {});
  await passwordResetService.requestPasswordReset(email);
  res.json({ message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.' });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body ?? {});
  await passwordResetService.resetPassword(token, password);
  res.json({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
}
