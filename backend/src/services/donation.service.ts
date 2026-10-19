import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/http-error';
import { formatMoney } from '../lib/money';
import { buildMeta, type Pagination } from '../lib/pagination';

// Doação simulada: não há gateway de pagamento, o registro é criado direto no banco.
export async function createDonation(
  campaignId: number,
  donorId: number,
  data: { amount: Prisma.Decimal; message?: string },
) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new HttpError(404, 'Campanha não encontrada');
  if (campaign.ownerId === donorId) throw new HttpError(403, 'Você não pode doar para a própria campanha');
  if (campaign.status !== 'ACTIVE' || campaign.deadline <= new Date()) {
    throw new HttpError(400, 'Esta campanha não está mais aceitando doações');
  }

  // A meta pode ser ultrapassada: não há limite pelo valor arrecadado.
  const donation = await prisma.donation.create({
    data: { amount: data.amount, message: data.message, donorId, campaignId },
  });
  return { ...donation, amount: formatMoney(donation.amount) };
}

export async function listDonations(campaignId: number, { page, limit }: Pagination) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
  if (!campaign) throw new HttpError(404, 'Campanha não encontrada');

  const where = { campaignId };
  const [total, donations] = await prisma.$transaction([
    prisma.donation.count({ where }),
    prisma.donation.findMany({
      where,
      select: { id: true, amount: true, message: true, createdAt: true, donor: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: donations.map(({ donor, amount, ...rest }) => ({
      ...rest,
      donorName: donor.name,
      amount: formatMoney(amount),
    })),
    meta: buildMeta({ page, limit }, total),
  };
}
