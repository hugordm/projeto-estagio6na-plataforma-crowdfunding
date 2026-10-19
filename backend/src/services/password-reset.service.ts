import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/http-error';
import { isMailerConfigured, sendEmail } from '../lib/mailer';
import { passwordResetEmail } from '../lib/email-templates';
import { BCRYPT_COST } from './auth.service';

const VALID_MINUTES = 30;

// Mensagem igual para token inexistente, usado ou expirado (não revela qual foi o caso).
const INVALID_TOKEN_MESSAGE = 'Link de redefinição inválido ou expirado. Solicite um novo.';

// O token vai no link do e-mail; no banco guardamos só o SHA-256 dele.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

// Gera o token e envia o e-mail. Não retorna nada: a resposta HTTP é a mesma
// exista ou não o e-mail, para não revelar quais e-mails estão cadastrados.
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = randomBytes(32).toString('base64url'); // 256 bits aleatórios
  const expiresAt = new Date(Date.now() + VALID_MINUTES * 60 * 1000);

  // Só o link mais recente vale: apaga os tokens ainda não usados do usuário.
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt } }),
  ]);

  const link = `${frontendUrl()}/reset-password?token=${token}`;

  if (!isMailerConfigured()) {
    // Ajuda no desenvolvimento sem Resend; nunca acontece em produção.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[recuperação de senha] E-mail não configurado. Link de teste para ${email}: ${link}`);
    } else {
      console.error('[recuperação de senha] E-mail não configurado (RESEND_API_KEY/MAIL_FROM).');
    }
    return;
  }

  // Envio em segundo plano: a resposta não espera o Resend, então o tempo de resposta
  // não denuncia se o e-mail existe, e uma falha no envio só gera log.
  sendEmail(passwordResetEmail(user.email, user.name, link, VALID_MINUTES)).catch((error) => {
    console.error('[recuperação de senha] Falha ao enviar e-mail:', error instanceof Error ? error.message : error);
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new HttpError(400, INVALID_TOKEN_MESSAGE);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  await prisma.$transaction(async (tx) => {
    // updateMany com usedAt: null garante uso único mesmo com duas requisições simultâneas.
    const { count } = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) throw new HttpError(400, INVALID_TOKEN_MESSAGE);

    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
  });
}
