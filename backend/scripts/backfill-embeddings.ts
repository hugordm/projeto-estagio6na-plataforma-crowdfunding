// Gera embeddings para campanhas que ainda não têm (criadas antes da busca semântica
// ou cuja geração em segundo plano falhou). Com --all, refaz o embedding de todas.
// Uso: npx tsx scripts/backfill-embeddings.ts [--all]
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { embed, OpenRouterError } from '../src/lib/openrouter';
import { campaignText, saveEmbedding } from '../src/services/embedding.service';

const BATCH_SIZE = 20; // textos por chamada ao OpenRouter
const redoAll = process.argv.includes('--all');

async function main() {
  // A coluna embedding não existe no Prisma Client (tipo Unsupported): filtramos com SQL bruto.
  const rows = redoAll
    ? await prisma.$queryRaw<{ id: number }[]>`SELECT "id" FROM "Campaign" ORDER BY "id"`
    : await prisma.$queryRaw<{ id: number }[]>`SELECT "id" FROM "Campaign" WHERE "embedding" IS NULL ORDER BY "id"`;
  console.log(`${rows.length} campanha(s) para processar.`);

  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const ids = rows.slice(i, i + BATCH_SIZE).map((row) => row.id);
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, description: true, category: { select: { name: true } } },
    });

    try {
      const vectors = await embed(campaigns.map(campaignText));
      for (const [index, campaign] of campaigns.entries()) {
        await saveEmbedding(campaign.id, vectors[index]);
      }
      done += campaigns.length;
      console.log(`  ${done}/${rows.length}`);
    } catch (error) {
      const detail = error instanceof OpenRouterError ? `[${error.kind}] ${error.message}` : String(error);
      console.error(`Falha no lote ${ids.join(', ')}: ${detail}`);
      process.exitCode = 1;
    }
  }
  console.log(`Concluído: ${done} embedding(s) gravado(s).`);
}

main().finally(() => prisma.$disconnect());
