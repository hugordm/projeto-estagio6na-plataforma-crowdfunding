/**
 * Cliente mínimo do Cloudinary (https://cloudinary.com/documentation/image_upload_api_reference), usando fetch.
 *
 * Usamos só três chamadas: upload e destroy (Upload API, assinadas com SHA-1 do segredo) e a listagem
 * de recursos (Admin API, HTTP Basic), esta só no script de limpeza. Sem o SDK oficial: o projeto já
 * fala com o Resend por fetch, não é preciso outra dependência, e o endereço da API pode
 * ser trocado (CLOUDINARY_UPLOAD_PREFIX, o mesmo nome usado pelo SDK) para testar com um servidor falso.
 *
 * Nunca registre em log o objeto de configuração nem o corpo das requisições (têm a chave e a assinatura).
 */
import { createHash } from 'node:crypto';
import './network';

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };
export type ResourceType = 'image' | 'raw';
export type CloudinaryAsset = { publicId: string; format: string; bytes: number; createdAt: Date; secureUrl: string };

const DEFAULT_FOLDER = 'crowdfunding/campaigns';
const UPLOAD_TIMEOUT_MS = 30_000;
const API_TIMEOUT_MS = 10_000;

// CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET, ou CLOUDINARY_URL
// (cloudinary://<api_key>:<api_secret>@<cloud_name>, como aparece no painel). null se faltar algo.
export function cloudinaryConfig(): CloudinaryConfig | null {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };

  const url = process.env.CLOUDINARY_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'cloudinary:' || !parsed.hostname || !parsed.username || !parsed.password) return null;
    return {
      cloudName: parsed.hostname,
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password),
    };
  } catch {
    return null;
  }
}

// Pasta das capas (CLOUDINARY_FOLDER, padrão crowdfunding/campaigns). Só letras, números, "_", "-" e "/".
export function cloudinaryFolder(): string {
  const folder = process.env.CLOUDINARY_FOLDER?.trim().replace(/^\/+|\/+$/g, '');
  return folder && /^[\w-]+(\/[\w-]+)*$/.test(folder) ? folder : DEFAULT_FOLDER;
}

function apiBase(): string {
  return (process.env.CLOUDINARY_UPLOAD_PREFIX || 'https://api.cloudinary.com').replace(/\/+$/, '');
}

// Erro do Cloudinary (ou da rede). A mensagem já vem sem a chave e o segredo; serve só para o log.
export class CloudinaryError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CloudinaryError';
  }
}

function redact(text: string, config: CloudinaryConfig): string {
  return text.split(config.apiSecret).join('***').split(config.apiKey).join('***');
}

// Assinatura da Upload API: parâmetros (sem file, api_key, resource_type, cloud_name) em ordem
// alfabética, "chave=valor" unidos por "&", seguidos do segredo; SHA-1 em hexadecimal.
export function signParams(params: Record<string, string>, apiSecret: string): string {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(serialized + apiSecret).digest('hex');
}

async function send(config: CloudinaryConfig, url: string, init: RequestInit, timeoutMs: number): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new CloudinaryError(0, `Falha de rede: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
  }
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !body) {
    const message = (body?.error as { message?: unknown } | undefined)?.message;
    throw new CloudinaryError(response.status, redact(typeof message === 'string' ? message : `HTTP ${response.status}`, config));
  }
  return body;
}

function signedForm(config: CloudinaryConfig, params: Record<string, string>): FormData {
  const signed = { ...params, timestamp: String(Math.floor(Date.now() / 1000)) };
  const form = new FormData();
  for (const [key, value] of Object.entries(signed)) form.append(key, value);
  form.append('api_key', config.apiKey);
  form.append('signature', signParams(signed, config.apiSecret));
  return form;
}

// Envia o arquivo com o public_id dado (sem sobrescrever um existente) e devolve a secure_url (https).
export async function uploadAsset(
  config: CloudinaryConfig,
  content: Buffer,
  options: { publicId: string; mimeType: string; resourceType: ResourceType },
): Promise<string> {
  const form = signedForm(config, { public_id: options.publicId, overwrite: 'false' });
  form.append('file', new Blob([new Uint8Array(content)], { type: options.mimeType }), 'upload');
  const url = `${apiBase()}/v1_1/${encodeURIComponent(config.cloudName)}/${options.resourceType}/upload`;
  const body = await send(config, url, { method: 'POST', body: form }, UPLOAD_TIMEOUT_MS);
  if (typeof body.secure_url !== 'string' || !body.secure_url.startsWith('https://')) {
    throw new CloudinaryError(502, 'Resposta sem secure_url');
  }
  return body.secure_url;
}

// Apaga um arquivo (e invalida o cache da CDN). "not found" não é erro: já não existe.
export async function destroyAsset(config: CloudinaryConfig, publicId: string, resourceType: ResourceType): Promise<void> {
  const form = signedForm(config, { public_id: publicId, invalidate: 'true' });
  const url = `${apiBase()}/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/destroy`;
  const body = await send(config, url, { method: 'POST', body: form }, API_TIMEOUT_MS);
  if (body.result !== 'ok' && body.result !== 'not found') {
    throw new CloudinaryError(502, `Resultado inesperado ao apagar: ${String(body.result)}`);
  }
}

// Lista todos os arquivos com o prefixo dado (Admin API, paginada por next_cursor). Usado só no script de limpeza.
export async function listAssets(config: CloudinaryConfig, prefix: string, resourceType: ResourceType = 'image'): Promise<CloudinaryAsset[]> {
  const auth = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`;
  const assets: CloudinaryAsset[] = [];
  let cursor: string | undefined;
  do {
    const query = new URLSearchParams({ prefix, max_results: '500' });
    if (cursor) query.set('next_cursor', cursor);
    const url = `${apiBase()}/v1_1/${encodeURIComponent(config.cloudName)}/resources/${resourceType}/upload?${query}`;
    const body = await send(config, url, { headers: { Authorization: auth } }, API_TIMEOUT_MS);
    for (const item of (body.resources as Record<string, unknown>[] | undefined) ?? []) {
      assets.push({
        publicId: String(item.public_id),
        format: String(item.format ?? ''),
        bytes: Number(item.bytes ?? 0),
        createdAt: new Date(String(item.created_at)),
        secureUrl: String(item.secure_url ?? ''),
      });
    }
    cursor = typeof body.next_cursor === 'string' ? body.next_cursor : undefined;
  } while (cursor);
  return assets;
}

// "https://res.cloudinary.com/<cloud>/image/upload/[fl_sanitize/][v123/]<pasta>/<id>.<ext>" -> public_id e tipo.
// null se a URL não for desta conta e desta pasta.
export function parseDeliveryUrl(url: string, cloudName: string): { publicId: string; resourceType: ResourceType } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' || parsed.search || parsed.hash) return null;

  const match = parsed.pathname.match(/^\/([^/]+)\/(image|raw)\/upload\/(?:fl_sanitize\/)?(?:v\d+\/)?([\w/-]+)\.(jpg|png|webp|svg)$/);
  if (!match || match[1] !== cloudName) return null;
  const [, , resourceType, path, extension] = match;
  if (!path.startsWith(`${cloudinaryFolder()}/`)) return null;
  // Em "image", o public_id não tem extensão; em "raw", tem.
  return { publicId: resourceType === 'raw' ? `${path}.${extension}` : path, resourceType: resourceType as ResourceType };
}
