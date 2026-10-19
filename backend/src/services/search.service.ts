import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { embed, isAiConfigured, OpenRouterError } from '../lib/openrouter';
import { buildMeta, type Pagination } from '../lib/pagination';
import { getCampaignsByIds, listCampaigns } from './campaign.service';
import { toVectorLiteral } from './embedding.service';

// Similaridade de cosseno mínima para um resultado aparecer. Sem um piso, a busca semântica
// devolveria todas as campanhas (só que em ordem), inclusive as sem nenhuma relação com a consulta.
// Calibrado com o modelo baai/bge-m3: nos testes, resultados relevantes ficaram entre 0,45 e 0,61
// e os sem relação até ~0,41. Outro modelo pode precisar de outro valor.
export const MIN_SIMILARITY = 0.45;

export type SearchFilters = Pagination & { q: string; category?: string };

// Busca por significado: transforma a consulta em vetor e ordena as campanhas pela
// distância de cosseno (operador <=> do pgvector; similaridade = 1 - distância).
async function semanticSearch({ q, category, page, limit }: SearchFilters) {
  const [vector] = await embed([q]);
  const queryVector = toVectorLiteral(vector);

  // Mesmo filtro de categoria da listagem: id (ex.: 3) ou nome (ex.: tecnologia), sem diferenciar maiúsculas.
  const categoryFilter = !category
    ? Prisma.empty
    : /^\d+$/.test(category)
      ? Prisma.sql`AND c."categoryId" = ${Number(category)}`
      : Prisma.sql`AND LOWER(cat."name") = LOWER(${category})`;

  const where = Prisma.sql`
    c."embedding" IS NOT NULL
    AND 1 - (c."embedding" <=> ${queryVector}::vector) >= ${MIN_SIMILARITY}
    ${categoryFilter}`;

  const rows = await prisma.$queryRaw<{ id: number; similarity: number }[]>`
    SELECT c."id", 1 - (c."embedding" <=> ${queryVector}::vector) AS similarity
    FROM "Campaign" c JOIN "Category" cat ON cat."id" = c."categoryId"
    WHERE ${where}
    ORDER BY c."embedding" <=> ${queryVector}::vector
    LIMIT ${limit} OFFSET ${(page - 1) * limit}`;

  const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*) AS total
    FROM "Campaign" c JOIN "Category" cat ON cat."id" = c."categoryId"
    WHERE ${where}`;

  const similarityById = new Map(rows.map((row) => [row.id, Math.round(row.similarity * 10000) / 10000]));
  const campaigns = await getCampaignsByIds(rows.map((row) => row.id));

  return {
    data: campaigns.map((campaign) => ({ ...campaign, similarity: similarityById.get(campaign.id) ?? 0 })),
    meta: buildMeta({ page, limit }, Number(total)),
  };
}

// GET /campaigns/search: tenta a busca semântica; se a IA falhar (ou não estiver configurada),
// usa a busca textual da listagem e avisa no campo "notice".
export async function searchCampaigns(filters: SearchFilters) {
  try {
    if (!isAiConfigured('embedding')) {
      throw new OpenRouterError('not_configured', 'Modelo de embeddings não configurado');
    }
    return { ...(await semanticSearch(filters)), mode: 'semantic' as const };
  } catch (error) {
    // Só falhas da IA caem para a busca textual; erros de banco seguem para o middleware de erro.
    if (!(error instanceof OpenRouterError)) throw error;
    console.warn(`[busca semântica] Usando busca textual: [${error.kind}] ${error.message}`);
    return {
      ...(await listCampaigns(filters)),
      mode: 'text' as const,
      notice: 'A busca inteligente está indisponível no momento. Mostrando resultados da busca por texto.',
    };
  }
}

// Até `limit` campanhas relacionadas ao texto, usadas como contexto do chatbot.
// O contexto é opcional: qualquer falha (IA ou banco) só gera log e devolve lista vazia.
export async function findRelatedCampaigns(text: string, limit = 3) {
  if (!isAiConfigured('embedding')) return [];
  try {
    return (await semanticSearch({ q: text, page: 1, limit })).data;
  } catch (error) {
    console.warn('[chat] Sem campanhas relacionadas:', error instanceof Error ? error.message : error);
    return [];
  }
}
