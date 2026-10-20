import type { Category } from "./category";
import type { PaginationMeta } from "./pagination";

export type CampaignStatus = "ACTIVE" | "FINISHED";

// Valores monetários chegam como string com 2 casas (ex.: "150.50").
// Datas chegam como string ISO (ex.: "2026-12-31T23:59:59.000Z").
export type Campaign = {
  id: number;
  title: string;
  description: string;
  goalAmount: string;
  raisedAmount: string;
  progress: number; // percentual, pode passar de 100
  donorsCount: number;
  imageUrl: string | null;
  imageGeneratedByAi: boolean; // definido pelo backend: a capa foi gerada pela IA da plataforma
  deadline: string; // fim do dia do prazo em America/Sao_Paulo
  daysLeft: number; // dias de calendário até o prazo (hoje = 0), nunca negativo
  expired: boolean; // o dia do prazo já terminou
  status: CampaignStatus;
  ownerId: number;
  categoryId: number;
  createdAt: string;
  updatedAt: string;
  owner: { id: number; name: string };
  category: Category;
};

// GET /campaigns/:id: mesmo formato da listagem.
export type CampaignDetail = Campaign;

// Item de GET /me/campaigns: mesmo formato da listagem.
export type MyCampaign = Campaign;

// Corpo de POST /campaigns.
export type CampaignInput = {
  title: string;
  description: string;
  goalAmount: string;
  deadline: string; // "AAAA-MM-DD": dia do prazo em America/Sao_Paulo
  categoryId: number;
  imageUrl?: string;
};

// Corpo de PUT /campaigns/:id: todos os campos são opcionais; imageUrl null remove a imagem.
export type CampaignUpdate = Partial<Omit<CampaignInput, "imageUrl">> & {
  status?: CampaignStatus;
  imageUrl?: string | null;
};

// Resposta de GET /campaigns/search: lista paginada + modo usado. Se a IA falhar, o backend
// usa a busca por texto (mode "text") e explica em "notice".
export type CampaignSearchResult = {
  data: (Campaign & { similarity?: number })[];
  meta: PaginationMeta;
  mode: "semantic" | "text";
  notice?: string;
};

// Filtros de GET /campaigns.
export type CampaignFilters = {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
};
