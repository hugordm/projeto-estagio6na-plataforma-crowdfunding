import { Prisma, type CampaignStatus } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/http-error';
import { calcProgress, formatMoney } from '../lib/money';
import { buildMeta, type Pagination } from '../lib/pagination';
import { isAiGeneratedImage } from './ai-usage.service';
import { deleteImage } from './storage.service';
import { diffCalendarDays, isDeadlineOver } from '../lib/dates';

const campaignInclude = {
  owner: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
} satisfies Prisma.CampaignInclude;

type CampaignWithRelations = Prisma.CampaignGetPayload<{ include: typeof campaignInclude }>;

type DonationStats = { raised: Prisma.Decimal; donorsCount: number };

// Soma das doações e número de doadores distintos por campanha, numa única consulta.
async function getDonationStats(campaignIds: number[]): Promise<Map<number, DonationStats>> {
  const stats = new Map<number, DonationStats>();
  if (campaignIds.length === 0) return stats;

  const groups = await prisma.donation.groupBy({
    by: ['campaignId', 'donorId'],
    where: { campaignId: { in: campaignIds } },
    _sum: { amount: true },
  });

  for (const group of groups) {
    const current = stats.get(group.campaignId) ?? { raised: new Prisma.Decimal(0), donorsCount: 0 };
    stats.set(group.campaignId, {
      raised: current.raised.plus(group._sum.amount ?? 0),
      donorsCount: current.donorsCount + 1,
    });
  }
  return stats;
}

function serializeCampaign(campaign: CampaignWithRelations, stats: DonationStats | undefined) {
  const raised = stats?.raised ?? new Prisma.Decimal(0);
  return {
    ...campaign,
    goalAmount: formatMoney(campaign.goalAmount),
    raisedAmount: formatMoney(raised),
    donorsCount: stats?.donorsCount ?? 0,
    progress: calcProgress(raised, campaign.goalAmount),
    daysLeft: daysLeft(campaign.deadline),
    expired: isDeadlineOver(campaign.deadline),
  };
}

// Dias de calendário até o prazo em America/Sao_Paulo (prazo hoje = 0, "Último dia"), nunca negativo.
// Prazo passado também dá 0: quem distingue é expired (isDeadlineOver). Usado também no chatbot.
export function daysLeft(deadline: Date): number {
  return Math.max(0, diffCalendarDays(deadline));
}

async function ensureCategoryExists(categoryId: number) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new HttpError(400, 'Categoria não encontrada');
}

// Busca a campanha e garante que o usuário é o dono (404 se não existe, 403 se não é dono).
async function findOwnedCampaign(id: number, userId: number) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw new HttpError(404, 'Campanha não encontrada');
  if (campaign.ownerId !== userId) throw new HttpError(403, 'Você não tem permissão para alterar esta campanha');
  return campaign;
}

export type ListCampaignsFilters = Pagination & { category?: string; q?: string };

export async function listCampaigns({ page, limit, category, q }: ListCampaignsFilters) {
  const where: Prisma.CampaignWhereInput = {};

  // ?category= aceita o id (ex.: 3) ou o nome (ex.: Tecnologia).
  if (category) {
    where.category = /^\d+$/.test(category)
      ? { id: Number(category) }
      : { name: { equals: category, mode: 'insensitive' } };
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, campaigns] = await prisma.$transaction([
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({
      where,
      include: campaignInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const stats = await getDonationStats(campaigns.map((c) => c.id));
  return {
    data: campaigns.map((c) => serializeCampaign(c, stats.get(c.id))),
    meta: buildMeta({ page, limit }, total),
  };
}

// Campanhas na ordem dos ids recebidos (a busca semântica já traz os ids ordenados por similaridade).
export async function getCampaignsByIds(ids: number[]) {
  const [campaigns, stats] = await Promise.all([
    prisma.campaign.findMany({ where: { id: { in: ids } }, include: campaignInclude }),
    getDonationStats(ids),
  ]);
  const byId = new Map(campaigns.map((c) => [c.id, c]));
  return ids.flatMap((id) => {
    const campaign = byId.get(id);
    return campaign ? [serializeCampaign(campaign, stats.get(id))] : [];
  });
}

// Campanhas criadas pelo usuário (todas as situações), mais recentes primeiro.
export async function listOwnCampaigns(ownerId: number, { page, limit }: Pagination) {
  const where = { ownerId };
  const [total, campaigns] = await prisma.$transaction([
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({
      where,
      include: campaignInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const stats = await getDonationStats(campaigns.map((c) => c.id));
  return {
    data: campaigns.map((c) => serializeCampaign(c, stats.get(c.id))),
    meta: buildMeta({ page, limit }, total),
  };
}

export async function getCampaign(id: number) {
  const campaign = await prisma.campaign.findUnique({ where: { id }, include: campaignInclude });
  if (!campaign) throw new HttpError(404, 'Campanha não encontrada');

  const stats = await getDonationStats([id]);
  return serializeCampaign(campaign, stats.get(id));
}

export type CreateCampaignData = {
  title: string;
  description: string;
  goalAmount: Prisma.Decimal;
  deadline: Date;
  categoryId: number;
  imageUrl?: string;
};

export async function createCampaign(ownerId: number, data: CreateCampaignData) {
  await ensureCategoryExists(data.categoryId);
  // A etiqueta "Capa gerada por IA" é decidida aqui, pela URL, e não pelo cliente.
  const imageGeneratedByAi = await isAiGeneratedImage(data.imageUrl);
  const campaign = await prisma.campaign.create({ data: { ...data, imageGeneratedByAi, ownerId } });
  return getCampaign(campaign.id);
}

// Na edição, imageUrl pode ser null (remove a imagem).
export type UpdateCampaignData = Partial<Omit<CreateCampaignData, 'imageUrl'>> & {
  status?: CampaignStatus;
  imageUrl?: string | null;
};

export async function updateCampaign(id: number, userId: number, data: UpdateCampaignData) {
  const current = await findOwnedCampaign(id, userId);
  if (data.categoryId !== undefined) await ensureCategoryExists(data.categoryId);

  // Se a imagem mudou (ou foi removida), recalcula a etiqueta "Capa gerada por IA".
  const imageGeneratedByAi = data.imageUrl !== undefined ? await isAiGeneratedImage(data.imageUrl) : undefined;
  await prisma.campaign.update({ where: { id }, data: { ...data, imageGeneratedByAi } });
  if (data.imageUrl !== undefined && data.imageUrl !== current.imageUrl) await discardImage(current.imageUrl);
  return getCampaign(id);
}

// Campanha com doações não pode ser excluída (o histórico precisa ser mantido): o dono deve encerrá-la.
// O banco reforça a regra com ON DELETE RESTRICT na FK de Donation.
export async function deleteCampaign(id: number, userId: number) {
  const campaign = await findOwnedCampaign(id, userId);

  const donationsCount = await prisma.donation.count({ where: { campaignId: id } });
  if (donationsCount > 0) {
    throw new HttpError(
      409,
      'Esta campanha já recebeu doações e não pode ser excluída. Encerre-a alterando o status para FINISHED.',
    );
  }

  await prisma.campaign.delete({ where: { id } });
  await discardImage(campaign.imageUrl);
}

// Apaga do storage a imagem que a campanha deixou de usar (troca, remoção ou exclusão), se for nossa
// e nenhuma outra campanha usar a mesma URL. Falha ao apagar só vai para o log (deleteImage).
async function discardImage(url: string | null) {
  if (!url) return;
  if ((await prisma.campaign.count({ where: { imageUrl: url } })) > 0) return;
  await deleteImage(url);
}
