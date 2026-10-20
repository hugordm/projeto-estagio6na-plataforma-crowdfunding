/*
 * Cliente da Anthropic (Claude), com o SDK oficial @anthropic-ai/sdk.
 * - chat(): mensagens + opções -> texto (assinatura usada por llm.ts), modelo
 *   ANTHROPIC_CHAT_MODEL (padrão claude-haiku-5-5).
 * - generateLongText(): respostas longas (ex.: o código SVG da capa), por streaming e com prazo maior.
 * Toda falha vira AnthropicError (um AiError, ver ai-types.ts), com um "kind" que os serviços traduzem em mensagens amigáveis.
 * A chave (ANTHROPIC_API_KEY) nunca é registrada em log.
 */

import './network';
import Anthropic from '@anthropic-ai/sdk';
import { AiError, type AiErrorKind, type ChatMessage, type ChatOptions } from './ai-types';

export const DEFAULT_CHAT_MODEL = 'claude-haiku-5-5';
export const DEFAULT_COVER_MODEL = 'claude-sonnet-5-5';
// Modelos que aceitam o fallback no servidor (fallbacks: "default"): se o modelo recusar o pedido
// por uma regra de segurança, a própria API tenta de novo em outro modelo. O Haiku não aceita.
const SERVER_FALLBACK_MODELS = ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1'];
const CHAT_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 800;
// O Claude Haiku 5.5 "pensa" antes de responder (thinking adaptativo) e esse raciocínio conta
// dentro de max_tokens. Somamos uma margem para a resposta não ser cortada antes de começar.
const THINKING_MARGIN_TOKENS = 2000;

export class AnthropicError extends AiError {
  constructor(kind: AiErrorKind, message: string, status?: number) {
    super(kind, message, status);
    this.name = 'AnthropicError';
  }
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Cliente criado a cada uso (barato): assim a chave é lida do ambiente na hora.
// maxRetries: 0 porque a nova tentativa é feita por withRetry().
export function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicError('not_configured', 'ANTHROPIC_API_KEY não definido no ambiente');
  return new Anthropic({ apiKey, maxRetries: 0 });
}

// Converte as exceções tipadas do SDK para o nosso AiError.
export function toAnthropicError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  // Timeout do SDK ou o nosso prazo total (AbortSignal) estourou.
  if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof Anthropic.APIUserAbortError) {
    return new AnthropicError('timeout', 'A Anthropic não respondeu a tempo');
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AnthropicError('unavailable', 'Falha de rede ao acessar a Anthropic');
  }
  if (error instanceof Anthropic.APIError) {
    const message = `Anthropic: ${error.message}`;
    if (error instanceof Anthropic.AuthenticationError) return new AnthropicError('invalid_key', message, 401);
    if (error instanceof Anthropic.RateLimitError) return new AnthropicError('rate_limited', message, 429);
    // Saldo insuficiente: billing_error (402) ou um 400 cuja mensagem cita o saldo de créditos.
    if (error.status === 402 || error.type === 'billing_error' || /credit balance/i.test(error.message)) {
      return new AnthropicError('no_credits', message, error.status);
    }
    if (error instanceof Anthropic.InternalServerError) return new AnthropicError('unavailable', message, error.status);
    return new AnthropicError('rejected', message, error.status);
  }
  return new AnthropicError('unavailable', `Anthropic: ${String(error)}`);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Uma nova tentativa curta para erros passageiros (limite de uso, indisponível, rede).
// Timeout não é repetido: o usuário já esperou demais e a chamada pode ter sido cobrada.
export async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const aiError = toAnthropicError(error);
    if (aiError.kind !== 'rate_limited' && aiError.kind !== 'unavailable') throw aiError;
    await sleep(RETRY_DELAY_MS);
    try {
      return await run();
    } catch (secondError) {
      throw toAnthropicError(secondError);
    }
  }
}

// Junta os blocos de texto da resposta (pode haver blocos de "thinking" antes, que ignoramos).
export function responseText(message: Anthropic.Message | Anthropic.Beta.BetaMessage): string {
  if (message.stop_reason === 'refusal') {
    throw new AnthropicError('rejected', 'Anthropic: o modelo recusou o pedido');
  }
  const text = message.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
    .trim();
  if (!text) throw new AnthropicError('bad_response', `Anthropic: resposta sem texto (stop_reason: ${message.stop_reason})`);
  return text;
}

export async function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const client = getClient();

  // Na API da Anthropic as instruções de sistema vão no campo "system", e a conversa
  // precisa começar com uma mensagem do usuário.
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const conversation = messages.filter((m) => m.role !== 'system');
  while (conversation.length > 0 && conversation[0].role !== 'user') conversation.shift();
  if (conversation.length === 0) throw new AnthropicError('rejected', 'Anthropic: conversa sem mensagem do usuário');

  const response = await withRetry(() =>
    client.messages.create(
      {
        model: options.model ?? (process.env.ANTHROPIC_CHAT_MODEL || DEFAULT_CHAT_MODEL),
        max_tokens: (options.maxTokens ?? 500) + THINKING_MARGIN_TOKENS,
        // Respostas de suporte são simples: esforço baixo deixa a resposta rápida e barata.
        // temperature não é enviado: o Claude Haiku 5.5 recusa (400) valores fora do padrão.
        output_config: { effort: 'low' },
        system: system || undefined,
        messages: conversation.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      },
      { timeout: CHAT_TIMEOUT_MS },
    ),
  );
  return responseText(response);
}

export type LongTextRequest = {
  system: string;
  prompt: string;
  model?: string;
  maxTokens: number; // inclui o raciocínio interno do modelo ("thinking")
  effort: 'low' | 'medium' | 'high';
  timeoutMs: number; // prazo total da geração
};

// Geração longa por streaming (recomendado pela Anthropic para respostas grandes) e devolve o texto final.
// O prazo total é controlado por um AbortSignal; a resposta só é usada quando termina.
export async function generateLongText(request: LongTextRequest): Promise<string> {
  const client = getClient();
  const model = request.model ?? DEFAULT_COVER_MODEL;
  const fallback = SERVER_FALLBACK_MODELS.includes(model)
    ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
    : {};

  const message = await withRetry(() =>
    client.beta.messages
      .stream(
        {
          model,
          max_tokens: request.maxTokens,
          output_config: { effort: request.effort },
          system: request.system,
          messages: [{ role: 'user', content: request.prompt }],
          ...fallback,
        },
        { signal: AbortSignal.timeout(request.timeoutMs) },
      )
      .finalMessage(),
  );
  return responseText(message);
}
