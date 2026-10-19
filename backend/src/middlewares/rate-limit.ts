import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

// Limitadores de requisições (express-rate-limit). Os contadores ficam na memória do processo:
// simples e suficiente para um servidor único; com várias instâncias seria preciso um store
// compartilhado (ex.: Redis). Atrás de proxy (Render, Railway...), configure app.set('trust proxy', 1).

const MINUTE = 60 * 1000;

// Resposta no mesmo formato de erro da API.
function limitMessage(text: string) {
  return { error: text };
}

function clientIp(req: Request): string {
  // ipKeyGenerator agrupa endereços IPv6 por sub-rede (evita burlar trocando o fim do IPv6).
  return ipKeyGenerator(req.ip ?? 'desconhecido');
}

// Recuperação de senha por IP: 10 pedidos a cada 15 minutos, somando as duas rotas
// (forgot-password e reset-password usam este mesmo limitador).
export const passwordResetIpLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${clientIp(req)}`,
  message: limitMessage('Muitas tentativas. Aguarde alguns minutos e tente novamente.'),
});

// Recuperação de senha por e-mail: 3 pedidos por hora para o mesmo endereço
// (impede usar a rota para encher a caixa de entrada de alguém).
export const forgotPasswordEmailLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return email ? `email:${email}` : `ip:${clientIp(req)}`;
  },
  message: limitMessage('Muitos pedidos para este e-mail. Aguarde e tente novamente mais tarde.'),
});

// Chave por usuário logado (rotas com requireAuth); sem login, cai para o IP.
function userOrIp(req: Request): string {
  return req.userId !== undefined ? `user:${req.userId}` : `ip:${clientIp(req)}`;
}

// Upload de imagens: 20 por hora por usuário.
export const uploadLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: userOrIp,
  message: limitMessage('Limite de envios de imagem atingido. Tente novamente mais tarde.'),
});

// ---------- Rotas de IA ----------
// Protegem o custo do OpenRouter contra abuso. Complementam o limite diário de imagens
// (tabela AiImageGeneration), que é persistente; estes contadores são de curto prazo.

// Chatbot: 15 mensagens por minuto por usuário (ou IP, sem login).
export const chatLimiter = rateLimit({
  windowMs: MINUTE,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: userOrIp,
  message: limitMessage('Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente.'),
});

// Busca inteligente: 30 buscas por minuto por usuário/IP (cada busca gera um embedding).
export const semanticSearchLimiter = rateLimit({
  windowMs: MINUTE,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: userOrIp,
  message: limitMessage('Muitas buscas em pouco tempo. Aguarde um minuto e tente novamente.'),
});

// Geração de capa: no máximo 3 pedidos a cada 10 minutos (evita cliques repetidos em sequência).
export const aiImageLimiter = rateLimit({
  windowMs: 10 * MINUTE,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: userOrIp,
  message: limitMessage('Aguarde alguns minutos antes de gerar outra capa.'),
});

// IA no formulário ("Melhorar descrição" e "Sugerir categoria"): 10 pedidos a cada 10 minutos por usuário.
export const aiTextLimiter = rateLimit({
  windowMs: 10 * MINUTE,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: userOrIp,
  message: limitMessage('Muitos pedidos à IA em pouco tempo. Aguarde alguns minutos e tente novamente.'),
});
