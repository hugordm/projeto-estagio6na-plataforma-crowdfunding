import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { embed, isAiConfigured, OpenRouterError } from '../lib/openrouter';
import { buildMeta, type Pagination } from '../lib/pagination';
import { searchTerms } from '../lib/search-terms';
import { getCampaignsByIds, listCampaigns } from './campaign.service';
import { toVectorLiteral } from './embedding.service';

// Similaridade de cosseno mínima para um resultado aparecer. Sem um piso, a busca semântica
// devolveria todas as campanhas (só que em ordem), inclusive as sem nenhuma relação com a consulta.
// Calibrado com o modelo baai/bge-m3: nos testes, resultados relevantes ficaram entre 0,45 e 0,61
// e os sem relação até ~0,41. Outro modelo pode precisar de outro valor.
export const MIN_SIMILARITY = 0.45;

export type SearchFilters = Pagination & { q: string; category?: string };

// Busca semântica disponível? Precisa da chave do OpenRouter e do modelo de embeddings.
export function isSemanticSearchConfigured(): boolean {
  return isAiConfigured('embedding');
}

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
    if (!isSemanticSearchConfigured()) {
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

// Acentos -> letras sem acento, para comparar no banco com o texto normalizado da pergunta.
// translate() + lower() são nativos do PostgreSQL: não precisam da extensão unaccent (que exigiria
// uma migration nova) e o resultado é o mesmo da normalização feita em src/lib/search-terms.ts.
const ACCENTED = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ';
const UNACCENTED = 'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn';

// Busca textual de campanhas relacionadas a uma pergunta (alternativa à semântica):
// - termos relevantes da pergunta (sem acentos, pontuação e palavras vazias);
// - cada termo vale 1 ponto se aparecer no título, na descrição ou no nome da categoria
//   (a categoria entra para perguntas como "tem campanha de educação?");
// - a campanha entra se bater a maioria dos termos, ou metade deles incluindo o mais específico
//   (o mais longo, ex.: "biblioteca" pesa mais que "bairro");
// - só campanhas ativas, ordenadas pelos pontos (e depois pelas mais recentes).
// Devolve no mesmo formato da busca semântica (getCampaignsByIds, o mesmo da listagem).
export async function findRelatedCampaignsByText(question: string, limit = 3) {
  const terms = searchTerms(question);
  if (terms.length === 0) return [];

  const specific = [...terms].sort((a, b) => b.length - a.length)[0];
  const majority = Math.floor(terms.length / 2) + 1;
  const half = Math.ceil(terms.length / 2);

  const text = Prisma.sql`lower(translate(c."title" || ' ' || c."description" || ' ' || cat."name", ${ACCENTED}, ${UNACCENTED}))`;
  const hit = (term: string) => Prisma.sql`(CASE WHEN ${text} LIKE ${`%${term}%`} THEN 1 ELSE 0 END)`;

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT "id" FROM (
      SELECT c."id", c."createdAt", (${Prisma.join(terms.map(hit), ' + ')}) AS score, ${hit(specific)} AS specific
      FROM "Campaign" c JOIN "Category" cat ON cat."id" = c."categoryId"
      WHERE c."status" = 'ACTIVE'
    ) ranked
    WHERE score >= ${majority} OR (score >= ${half} AND specific = 1)
    ORDER BY score DESC, "createdAt" DESC
    LIMIT ${limit}`;

  return getCampaignsByIds(rows.map((row) => row.id));
}

// Até `limit` campanhas relacionadas ao texto, usadas como contexto do chatbot.
// Usa a busca semântica quando os embeddings estão configurados; se não estiverem, ou se a IA
// falhar, cai para a busca textual. O contexto é opcional: qualquer outra falha só gera log.
export async function findRelatedCampaigns(text: string, limit = 3) {
  try {
    if (isSemanticSearchConfigured()) {
      try {
        return (await semanticSearch({ q: text, page: 1, limit })).data;
      } catch (error) {
        if (!(error instanceof OpenRouterError)) throw error;
        console.warn(`[chat] Busca semântica indisponível, usando busca textual: [${error.kind}] ${error.message}`);
      }
    }
    return await findRelatedCampaignsByText(text, limit);
  } catch (error) {
    console.warn('[chat] Sem campanhas relacionadas:', error instanceof Error ? error.message : error);
    return [];
  }
}
