import { prisma } from '../lib/prisma';
import { embed, isAiConfigured } from '../lib/openrouter';

// Dimensão da coluna "embedding" (vector(1024)), igual à do modelo baai/bge-m3.
// Trocar de modelo exige uma migration nova com a dimensão certa e rodar o backfill.
export const EMBEDDING_DIMENSIONS = 1024;

type CampaignForEmbedding = { title: string; description: string; category: { name: string } };

// Texto que representa a campanha na busca semântica.
export function campaignText(campaign: CampaignForEmbedding): string {
  return `${campaign.title}\n${campaign.description}\nCategoria: ${campaign.category.name}`;
}

// O pgvector aceita o vetor como texto no formato "[0.1,0.2,...]".
export function toVectorLiteral(vector: number[]): string {
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding com ${vector.length} dimensões; a coluna espera ${EMBEDDING_DIMENSIONS}`);
  }
  return `[${vector.join(',')}]`;
}

export async function saveEmbedding(campaignId: number, vector: number[]): Promise<void> {
  await prisma.$executeRaw`UPDATE "Campaign" SET "embedding" = ${toVectorLiteral(vector)}::vector WHERE "id" = ${campaignId}`;
}

// Gera e grava o embedding de uma campanha.
export async function updateCampaignEmbedding(campaignId: number): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { title: true, description: true, category: { select: { name: true } } },
  });
  if (!campaign) return;

  const [vector] = await embed([campaignText(campaign)]);
  await saveEmbedding(campaignId, vector);
}

// Atualiza o embedding em segundo plano: não atrasa a resposta de criar/editar campanha,
// e uma falha (IA fora do ar, sem créditos, sem configuração) só gera log.
// Campanhas que ficarem sem embedding podem ser completadas depois com scripts/backfill-embeddings.ts.
export function scheduleCampaignEmbedding(campaignId: number): void {
  if (!isAiConfigured('embedding')) return;
  updateCampaignEmbedding(campaignId).catch((error) => {
    console.error(`[embeddings] Falha ao gerar embedding da campanha ${campaignId}:`, error instanceof Error ? error.message : error);
  });
}
