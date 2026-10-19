/*
 * Cliente único do OpenRouter (https://openrouter.ai/docs), usando fetch.
 * - chat():          POST /chat/completions  (modelo OPENROUTER_CHAT_MODEL)
 * - embed():         POST /embeddings        (modelo OPENROUTER_EMBEDDING_MODEL)
 * - generateImage(): POST /images            (modelo OPENROUTER_IMAGE_MODEL)
 * Toda falha vira OpenRouterError com um "kind" que o resto do código usa para decidir o que fazer.
 * A chave (OPENROUTER_API_KEY) nunca é registrada em log.
 */

import './network';

const BASE_URL = 'https://openrouter.ai/api/v1';
const RETRYABLE_STATUS = [429, 502, 503];
const RETRY_DELAY_MS = 800;

export type OpenRouterErrorKind =
  | 'not_configured' // falta chave ou modelo no .env
  | 'timeout'
  | 'rate_limited' // 429 do OpenRouter/provedor
  | 'no_credits' // 402
  | 'unavailable' // modelo/provedor fora do ar (502, 503) ou falha de rede
  | 'rejected' // 400, 401, 403 (ex.: moderação)
  | 'bad_response'; // resposta sem o conteúdo esperado

export class OpenRouterError extends Error {
  constructor(
    public readonly kind: OpenRouterErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

type ModelKind = 'chat' | 'embedding' | 'image';

const MODEL_ENV: Record<ModelKind, string> = {
  chat: 'OPENROUTER_CHAT_MODEL',
  embedding: 'OPENROUTER_EMBEDDING_MODEL',
  image: 'OPENROUTER_IMAGE_MODEL',
};

function getModel(kind: ModelKind): string {
  const model = process.env[MODEL_ENV[kind]];
  if (!model) throw new OpenRouterError('not_configured', `${MODEL_ENV[kind]} não definido no ambiente`);
  return model;
}

export function isAiConfigured(kind: ModelKind): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY && process.env[MODEL_ENV[kind]]);
}

function errorKindFromStatus(status: number): OpenRouterErrorKind {
  if (status === 402) return 'no_credits';
  if (status === 408) return 'timeout';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'unavailable';
  return 'rejected';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Faz o POST com timeout e uma nova tentativa curta para erros passageiros (429, 502, 503, rede).
// Timeout não é repetido: o usuário já esperou demais e, na geração de imagem, poderia cobrar duas vezes.
async function post<T>(path: string, body: unknown, timeoutMs: number, attempt = 1): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new OpenRouterError('not_configured', 'OPENROUTER_API_KEY não definido no ambiente');

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Cabeçalhos opcionais de identificação do app, recomendados pelo OpenRouter.
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-OpenRouter-Title': 'Plataforma de Crowdfunding',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new OpenRouterError('timeout', `OpenRouter não respondeu em ${timeoutMs / 1000} s`);
    }
    if (attempt === 1) {
      await sleep(RETRY_DELAY_MS);
      return post(path, body, timeoutMs, 2);
    }
    throw new OpenRouterError('unavailable', 'Falha de rede ao acessar o OpenRouter');
  }

  const data = (await response.json().catch(() => null)) as
    | ({ error?: { code?: number; message?: string } } & Record<string, unknown>)
    | null;

  if (!response.ok) {
    if (RETRYABLE_STATUS.includes(response.status) && attempt === 1) {
      await sleep(RETRY_DELAY_MS);
      return post(path, body, timeoutMs, 2);
    }
    const message = data?.error?.message ?? `HTTP ${response.status}`;
    throw new OpenRouterError(errorKindFromStatus(response.status), `OpenRouter: ${message}`, response.status);
  }

  // O OpenRouter pode responder 200 com um objeto "error" quando o modelo falha no meio da geração.
  if (!data || data.error) {
    throw new OpenRouterError('bad_response', `OpenRouter: ${data?.error?.message ?? 'resposta vazia'}`);
  }
  return data as T;
}

// ---------- Chat ----------

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ChatResponse = { choices?: { message?: { content?: string | null } }[] };

export async function chat(messages: ChatMessage[], options: { maxTokens?: number; temperature?: number } = {}) {
  const data = await post<ChatResponse>(
    '/chat/completions',
    {
      model: getModel('chat'),
      messages,
      max_tokens: options.maxTokens ?? 500,
      temperature: options.temperature ?? 0.3,
    },
    30_000,
  );
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new OpenRouterError('bad_response', 'OpenRouter: resposta do chat sem texto');
  return content;
}

// ---------- Embeddings ----------

type EmbeddingResponse = { data?: { embedding?: number[]; index?: number }[] };

// Recebe uma lista de textos e devolve um vetor por texto, na mesma ordem.
export async function embed(texts: string[]): Promise<number[][]> {
  const data = await post<EmbeddingResponse>(
    '/embeddings',
    { model: getModel('embedding'), input: texts, encoding_format: 'float' },
    15_000,
  );
  const items = [...(data.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const vectors = items.map((item) => item.embedding);
  if (vectors.length !== texts.length || vectors.some((v) => !Array.isArray(v) || v.length === 0)) {
    throw new OpenRouterError('bad_response', 'OpenRouter: resposta de embeddings incompleta');
  }
  return vectors as number[][];
}

// ---------- Imagem ----------

type ImageResponse = { data?: { b64_json?: string; media_type?: string }[] };

export type GeneratedImage = { content: Buffer; mediaType: string };

export async function generateImage(prompt: string, options: { aspectRatio?: string } = {}): Promise<GeneratedImage> {
  const data = await post<ImageResponse>(
    '/images',
    { model: getModel('image'), prompt, n: 1, aspect_ratio: options.aspectRatio ?? '16:9' },
    90_000,
  );
  const image = data.data?.[0];
  if (!image?.b64_json) throw new OpenRouterError('bad_response', 'OpenRouter: resposta sem imagem');
  return { content: Buffer.from(image.b64_json, 'base64'), mediaType: image.media_type ?? 'image/png' };
}
