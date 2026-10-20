import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from '../lib/http-error';
import type { ImageType } from '../lib/image-type';
import { CloudinaryError, cloudinaryConfig, cloudinaryFolder, destroyAsset, parseDeliveryUrl, uploadAsset } from '../lib/cloudinary';

/*
 * Armazenamento de arquivos enviados (imagens de capa).
 *
 * O resto do código só conhece a interface Storage e as funções saveImage, deleteImage e isOwnUploadUrl.
 * STORAGE_PROVIDER escolhe onde os arquivos NOVOS são gravados:
 *   - local (padrão): pasta backend/uploads/, servida pelo Express em /uploads;
 *   - cloudinary: pasta CLOUDINARY_FOLDER (padrão crowdfunding/campaigns) na conta do Cloudinary.
 * As duas implementações continuam reconhecendo e apagando os próprios arquivos, então campanhas
 * antigas com URL /uploads/... seguem funcionando depois da troca para o Cloudinary.
 */
export interface Storage {
  readonly name: StorageProvider;
  // Grava o arquivo com nome aleatório e devolve a URL pública (absoluta).
  save(content: Buffer, type: ImageType): Promise<string>;
  // true se a URL aponta para um arquivo gravado por esta implementação.
  owns(url: string): boolean;
  // Apaga o arquivo da URL (que deve ser desta implementação). Arquivo já inexistente não é erro.
  remove(url: string): Promise<void>;
}

export type StorageProvider = 'local' | 'cloudinary';

export function storageProvider(): StorageProvider {
  return process.env.STORAGE_PROVIDER === 'cloudinary' ? 'cloudinary' : 'local';
}

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
export const UPLOADS_ROUTE = '/uploads';

// Endereço público do backend; padrão: localhost na porta do servidor.
function backendUrl(): string {
  return process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
}

// Nome gerado por nós (UUID + extensão conhecida). Impede apagar outro arquivo com "../" na URL.
const LOCAL_KEY = /^[0-9a-f-]{36}\.(jpg|png|webp|svg)$/;

class DiskStorage implements Storage {
  readonly name = 'local';

  async save(content: Buffer, type: ImageType): Promise<string> {
    await mkdir(UPLOADS_DIR, { recursive: true });
    // Nome aleatório: não usamos o nome original (vem do cliente e pode conter "../" ou colidir).
    const key = `${randomUUID()}.${type.extension}`;
    await writeFile(path.join(UPLOADS_DIR, key), content);
    return `${this.prefix()}${key}`;
  }

  owns(url: string): boolean {
    return url.startsWith(this.prefix());
  }

  async remove(url: string): Promise<void> {
    const key = url.slice(this.prefix().length);
    if (!LOCAL_KEY.test(key)) return;
    await unlink(path.join(UPLOADS_DIR, key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  private prefix(): string {
    return `${backendUrl()}${UPLOADS_ROUTE}/`;
  }
}

class CloudinaryStorage implements Storage {
  readonly name = 'cloudinary';

  async save(content: Buffer, type: ImageType): Promise<string> {
    const config = cloudinaryConfig();
    if (!config) throw new HttpError(503, 'O armazenamento de imagens não está configurado.');

    try {
      // Mesmo para o SVG da IA usamos resource_type "image": ele é entregue como image/svg+xml
      // e, com fl_sanitize na URL, o Cloudinary ainda passa o próprio sanitizador por cima do nosso.
      const url = await uploadAsset(config, content, {
        publicId: `${cloudinaryFolder()}/${randomUUID()}`,
        mimeType: type.mimeType,
        resourceType: 'image',
      });
      return type.extension === 'svg' ? url.replace('/image/upload/', '/image/upload/fl_sanitize/') : url;
    } catch (error) {
      // Detalhe só no log (já sem chaves); o cliente recebe a mensagem genérica.
      if (error instanceof CloudinaryError) {
        console.error(`[storage] [cloudinary] Falha no upload (HTTP ${error.status}): ${error.message}`);
        throw new HttpError(502, 'Não foi possível salvar a imagem agora. Tente novamente em instantes.');
      }
      throw error;
    }
  }

  owns(url: string): boolean {
    const config = cloudinaryConfig();
    return config !== null && parseDeliveryUrl(url, config.cloudName) !== null;
  }

  async remove(url: string): Promise<void> {
    const config = cloudinaryConfig();
    const asset = config && parseDeliveryUrl(url, config.cloudName);
    if (!config || !asset) return;
    await destroyAsset(config, asset.publicId, asset.resourceType);
  }
}

const storages: Record<StorageProvider, Storage> = { local: new DiskStorage(), cloudinary: new CloudinaryStorage() };

// Avisos de configuração na inicialização (nunca imprime os valores).
export function warnStorageConfig(): void {
  const raw = process.env.STORAGE_PROVIDER;
  if (raw && raw !== 'local' && raw !== 'cloudinary') {
    console.warn(`[storage] STORAGE_PROVIDER inválido; usando "local". Valores aceitos: local, cloudinary.`);
  }
  if (storageProvider() === 'cloudinary' && !cloudinaryConfig()) {
    console.error(
      '[storage] STORAGE_PROVIDER=cloudinary sem credenciais: defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e ' +
        'CLOUDINARY_API_SECRET (ou CLOUDINARY_URL). Os uploads vão responder 503.',
    );
  }
}

// true se a URL aponta para um arquivo salvo pela plataforma, em qualquer provedor (ex.: capa SVG da IA).
export function isOwnUploadUrl(url: string): boolean {
  return Object.values(storages).some((storage) => storage.owns(url));
}

// Salva no provedor ativo e devolve a URL pública (usado pelo upload e pela capa gerada por IA).
export async function saveImage(content: Buffer, type: ImageType): Promise<string> {
  return storages[storageProvider()].save(content, type);
}

// Apaga o arquivo no provedor a que a URL pertence; URL externa é ignorada.
// Falha só vai para o log: a requisição que trocou ou removeu a imagem não pode quebrar por isso.
export async function deleteImage(url: string): Promise<void> {
  const storage = Object.values(storages).find((candidate) => candidate.owns(url));
  if (!storage) return;
  try {
    await storage.remove(url);
  } catch (error) {
    const detail = error instanceof CloudinaryError ? `HTTP ${error.status}: ${error.message}` : error instanceof Error ? error.message : 'erro desconhecido';
    console.error(`[storage] [${storage.name}] Não foi possível apagar ${url}: ${detail}`);
  }
}
