import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não definido no ambiente');
  return secret;
}

export function signToken(userId: number): string {
  return jwt.sign({}, getSecret(), { subject: String(userId), expiresIn: '7d' });
}

// Retorna o id do usuário (claim sub) ou null se o token for inválido/expirado.
export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === 'string' || !payload.sub) return null;
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
