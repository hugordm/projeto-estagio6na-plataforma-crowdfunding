import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/http-error';

// Gerações de imagem por usuário a cada 24 horas (janela móvel, sem depender de fuso horário).
export const DAILY_IMAGE_LIMIT = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;

// Reserva uma geração ANTES de chamar a IA (assim pedidos simultâneos já contam uns aos outros)
// e devolve o id da reserva. Lança 429 se o limite do dia já foi atingido.
export async function reserveImageGeneration(userId: number): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS);
  const used = await prisma.aiImageGeneration.count({ where: { userId, createdAt: { gte: since } } });
  if (used >= DAILY_IMAGE_LIMIT) {
    throw new HttpError(
      429,
      `Você atingiu o limite de ${DAILY_IMAGE_LIMIT} capas geradas por IA nas últimas 24 horas. Tente novamente mais tarde.`,
    );
  }
  const record = await prisma.aiImageGeneration.create({ data: { userId } });
  return record.id;
}

// Se a geração falhar, a reserva é devolvida para não consumir o limite do usuário.
export async function releaseImageGeneration(id: number): Promise<void> {
  await prisma.aiImageGeneration.delete({ where: { id } }).catch(() => undefined);
}

// Depois do sucesso, guarda a URL da imagem gerada na reserva.
export async function completeImageGeneration(id: number, url: string): Promise<void> {
  await prisma.aiImageGeneration.update({ where: { id }, data: { url } });
}

// true se a URL é de uma capa gerada pela IA deste sistema (o cliente não consegue "fingir" isso).
export async function isAiGeneratedImage(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  return (await prisma.aiImageGeneration.count({ where: { url } })) > 0;
}
