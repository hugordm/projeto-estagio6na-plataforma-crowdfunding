import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não definido no ambiente');
  return secret;
}

// Dados lidos de um token válido. tokenVersion é conferido com o banco pelo middleware de autenticação.
export type TokenPayload = { userId: number; tokenVersion: number };

// O token carrega a versão atual do usuário (claim "ver"); ao redefinir a senha a versão
// no banco aumenta e os tokens antigos deixam de ser aceitos.
export function signToken(userId: number, tokenVersion: number): string {
  return jwt.sign({ ver: tokenVersion }, getSecret(), { subject: String(userId), expiresIn: '7d' });
}

// Retorna o id do usuário (claim sub) e a versão (claim ver), ou null se o token for inválido/expirado.
// Tokens sem "ver" (emitidos antes desta regra) são recusados: a pessoa precisa entrar de novo.
export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === 'string' || !payload.sub) return null;
    const userId = Number(payload.sub);
    const tokenVersion = payload.ver;
    if (!Number.isInteger(userId) || userId <= 0) return null;
    if (typeof tokenVersion !== 'number' || !Number.isInteger(tokenVersion)) return null;
    return { userId, tokenVersion };
  } catch {
    return null;
  }
}
