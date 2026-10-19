import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/http-error';
import { signToken } from '../lib/jwt';

export const BCRYPT_COST = 10;

// Campos públicos do usuário: passwordHash nunca sai da API.
const publicUserSelect = { id: true, name: true, email: true, createdAt: true } as const;

export async function register(data: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new HttpError(409, 'E-mail já cadastrado');

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash },
    select: publicUserSelect,
  });

  return { user, token: signToken(user.id) };
}

export async function login(data: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  // Mesma mensagem para e-mail inexistente e senha errada, para não revelar quais e-mails existem.
  const valid = user !== null && (await bcrypt.compare(data.password, user.passwordHash));
  if (!user || !valid) throw new HttpError(401, 'E-mail ou senha inválidos');

  const { passwordHash: _omit, ...publicUser } = user;
  return { user: publicUser, token: signToken(user.id) };
}
