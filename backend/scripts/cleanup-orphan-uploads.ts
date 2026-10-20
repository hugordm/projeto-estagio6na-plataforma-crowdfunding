// Lista (e, com confirmação, apaga) imagens que ninguém usa no provedor ativo (STORAGE_PROVIDER):
// nenhuma campanha as tem como capa e nenhum registro de geração de IA aponta para elas. Por segurança
// só entram arquivos com mais de 24 h (um upload recente pode estar num formulário ainda não enviado).
//   local:      arquivos de uploads/ (nunca apaga .gitkeep). Apaga com --apply.
//   cloudinary: arquivos da pasta CLOUDINARY_FOLDER. Apagar da nuvem exige --apply --confirm-cloudinary.
// Uso: npx tsx scripts/cleanup-orphan-uploads.ts [--apply] [--confirm-cloudinary]
//      (ou npm run cleanup:uploads -- --apply)
import 'dotenv/config';
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { cloudinaryConfig, cloudinaryFolder, destroyAsset, listAssets, parseDeliveryUrl } from '../src/lib/cloudinary';
import { storageProvider, UPLOADS_DIR, UPLOADS_ROUTE } from '../src/services/storage.service';

const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const apply = process.argv.includes('--apply');
const confirmCloudinary = process.argv.includes('--confirm-cloudinary');

type Orphan = { name: string; size: number; remove: () => Promise<void> };

// Todas as URLs de imagem guardadas no banco (capas e gerações de IA).
async function referencedUrls(): Promise<string[]> {
  const [campaigns, generations] = await Promise.all([
    prisma.campaign.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
    prisma.aiImageGeneration.findMany({ where: { url: { not: null } }, select: { url: true } }),
  ]);
  return [...campaigns.map((c) => c.imageUrl), ...generations.map((g) => g.url)].filter((url): url is string => url !== null);
}

// Nome do arquivo a partir de uma URL salva (".../uploads/<nome>"); null se não for deste servidor.
function uploadName(url: string): string | null {
  const marker = `${UPLOADS_ROUTE}/`;
  const index = url.lastIndexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

async function localOrphans(urls: string[]): Promise<{ used: number; orphans: Orphan[] }> {
  const used = new Set(urls.map(uploadName).filter((name): name is string => name !== null));
  const now = Date.now();
  const orphans: Orphan[] = [];
  for (const entry of await readdir(UPLOADS_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === '.gitkeep' || used.has(entry.name)) continue;
    const file = path.join(UPLOADS_DIR, entry.name);
    const info = await stat(file);
    if (now - info.mtimeMs < MIN_AGE_MS) continue;
    orphans.push({ name: entry.name, size: info.size, remove: () => unlink(file) });
  }
  return { used: used.size, orphans };
}

async function cloudinaryOrphans(urls: string[]): Promise<{ used: number; orphans: Orphan[] }> {
  const config = cloudinaryConfig();
  if (!config) throw new Error('STORAGE_PROVIDER=cloudinary sem credenciais do Cloudinary.');
  const used = new Set(urls.map((url) => parseDeliveryUrl(url, config.cloudName)?.publicId).filter((id): id is string => Boolean(id)));
  const now = Date.now();
  const orphans: Orphan[] = (await listAssets(config, `${cloudinaryFolder()}/`))
    .filter((asset) => !used.has(asset.publicId) && now - asset.createdAt.getTime() >= MIN_AGE_MS)
    .map((asset) => ({
      name: `${asset.publicId}.${asset.format}`,
      size: asset.bytes,
      remove: () => destroyAsset(config, asset.publicId, 'image'),
    }));
  return { used: used.size, orphans };
}

async function main() {
  const provider = storageProvider();
  const urls = await referencedUrls();
  const { used, orphans } = provider === 'cloudinary' ? await cloudinaryOrphans(urls) : await localOrphans(urls);

  const totalKb = Math.round(orphans.reduce((sum, file) => sum + file.size, 0) / 1024);
  console.log(`[${provider}] ${used} arquivo(s) em uso. ${orphans.length} órfão(s) com mais de 24 h (${totalKb} KB):`);
  for (const file of orphans) console.log(`  ${file.name} (${Math.round(file.size / 1024)} KB)`);

  if (!apply) {
    console.log('Simulação: nada foi apagado. Rode com --apply para remover.');
    return;
  }
  if (provider === 'cloudinary' && !confirmCloudinary) {
    console.log('Nada foi apagado. Para apagar do Cloudinary (sem volta), rode com --apply --confirm-cloudinary.');
    return;
  }
  for (const file of orphans) await file.remove();
  console.log(`${orphans.length} arquivo(s) removido(s).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
