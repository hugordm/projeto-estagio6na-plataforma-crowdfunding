import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/*
 * Armazenamento de arquivos enviados (imagens de capa).
 *
 * O resto do código só conhece a interface Storage (save e getPublicUrl). A implementação
 * atual grava em disco, na pasta backend/uploads/, servida pelo Express em /uploads.
 * Em produção (vários servidores ou disco temporário, como em Render/Heroku) basta criar
 * outra implementação da mesma interface usando S3, Cloudinary etc. e trocar a exportação abaixo.
 */
export interface Storage {
  // Grava o arquivo e devolve a chave (nome) com que ele foi salvo.
  save(content: Buffer, extension: string): Promise<string>;
  // URL pública (absoluta) para acessar o arquivo.
  getPublicUrl(key: string): string;
}

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
export const UPLOADS_ROUTE = '/uploads';

// Endereço público do backend; padrão: localhost na porta do servidor.
function backendUrl(): string {
  return process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
}

class DiskStorage implements Storage {
  async save(content: Buffer, extension: string): Promise<string> {
    await mkdir(UPLOADS_DIR, { recursive: true });
    // Nome aleatório: não usamos o nome original (vem do cliente e pode conter "../" ou colidir).
    const key = `${randomUUID()}.${extension}`;
    await writeFile(path.join(UPLOADS_DIR, key), content);
    return key;
  }

  getPublicUrl(key: string): string {
    return `${backendUrl()}${UPLOADS_ROUTE}/${key}`;
  }
}

export const storage: Storage = new DiskStorage();

// true se a URL aponta para um arquivo salvo por este servidor (ex.: capa SVG gerada pela IA).
export function isOwnUploadUrl(url: string): boolean {
  return url.startsWith(`${backendUrl()}${UPLOADS_ROUTE}/`);
}

// Salva e já devolve a URL pública (usado pelo upload e pela capa gerada por IA).
export async function saveImage(content: Buffer, extension: string): Promise<string> {
  const key = await storage.save(content, extension);
  return storage.getPublicUrl(key);
}
