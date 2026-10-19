// Lista (e, com --apply, apaga) arquivos de uploads/ que ninguém usa: nenhuma campanha os tem
// como capa e nenhum registro de geração de IA aponta para eles. Por segurança só entram arquivos
// com mais de 24 h (um upload recente pode estar num formulário ainda não enviado). Nunca apaga .gitkeep.
// Uso: npx tsx scripts/cleanup-orphan-uploads.ts [--apply]   (ou npm run cleanup:uploads -- --apply)
import 'dotenv/config';
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { UPLOADS_DIR, UPLOADS_ROUTE } from '../src/services/storage.service';

const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const apply = process.argv.includes('--apply');

// Nome do arquivo a partir de uma URL salva (".../uploads/<nome>"); null se não for deste servidor.
function uploadName(url: string | null): string | null {
  if (!url) return null;
  const marker = `${UPLOADS_ROUTE}/`;
  const index = url.lastIndexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

async function referencedNames(): Promise<Set<string>> {
  const [campaigns, generations] = await Promise.all([
    prisma.campaign.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
    prisma.aiImageGeneration.findMany({ where: { url: { not: null } }, select: { url: true } }),
  ]);
  const urls = [...campaigns.map((c) => c.imageUrl), ...generations.map((g) => g.url)];
  return new Set(urls.map(uploadName).filter((name): name is string => name !== null));
}

async function main() {
  const used = await referencedNames();
  const now = Date.now();
  const orphans: { name: string; size: number }[] = [];

  for (const entry of await readdir(UPLOADS_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === '.gitkeep' || used.has(entry.name)) continue;
    const info = await stat(path.join(UPLOADS_DIR, entry.name));
    if (now - info.mtimeMs < MIN_AGE_MS) continue;
    orphans.push({ name: entry.name, size: info.size });
  }

  const totalKb = Math.round(orphans.reduce((sum, file) => sum + file.size, 0) / 1024);
  console.log(`${used.size} arquivo(s) em uso. ${orphans.length} órfão(s) com mais de 24 h (${totalKb} KB):`);
  for (const file of orphans) console.log(`  ${file.name} (${Math.round(file.size / 1024)} KB)`);

  if (!apply) {
    console.log('Simulação: nada foi apagado. Rode com --apply para remover.');
    return;
  }
  for (const file of orphans) await unlink(path.join(UPLOADS_DIR, file.name));
  console.log(`${orphans.length} arquivo(s) removido(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
