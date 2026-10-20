import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';
import type { Pagination } from '../lib/pagination';
import { searchTerms } from '../lib/search-terms';
import { getCampaignsByIds, listCampaigns } from './campaign.service';

export type SearchFilters = Pagination & { q: string; category?: string };

// GET /campaigns/search: busca por texto no título e na descrição (a mesma da listagem com ?q=),
// com filtro opcional de categoria.
export function searchCampaigns(filters: SearchFilters) {
  return listCampaigns(filters);
}

// Acentos -> letras sem acento, para comparar no banco com o texto normalizado da pergunta.
// translate() + lower() são nativos do PostgreSQL: não precisam da extensão unaccent (que exigiria
// uma migration nova) e o resultado é o mesmo da normalização feita em src/lib/search-terms.ts.
const ACCENTED = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ';
const UNACCENTED = 'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn';

// Busca textual de campanhas relacionadas a uma pergunta (contexto do chatbot):
// - termos relevantes da pergunta (sem acentos, pontuação e palavras vazias);
// - cada termo vale 1 ponto se aparecer no título, na descrição ou no nome da categoria
//   (a categoria entra para perguntas como "tem campanha de educação?");
// - a campanha entra se bater a maioria dos termos, ou metade deles incluindo o mais específico
//   (o mais longo, ex.: "biblioteca" pesa mais que "bairro");
// - só campanhas ativas, ordenadas pelos pontos (e depois pelas mais recentes).
// Devolve no mesmo formato da listagem (getCampaignsByIds).
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

// Até `limit` campanhas relacionadas ao texto, usadas como contexto do chatbot (busca textual).
// O contexto é opcional: uma falha só gera log e o chat responde sem ele.
export async function findRelatedCampaigns(text: string, limit = 3) {
  try {
    return await findRelatedCampaignsByText(text, limit);
  } catch (error) {
    console.warn('[chat] Sem campanhas relacionadas:', error instanceof Error ? error.message : error);
    return [];
  }
}
