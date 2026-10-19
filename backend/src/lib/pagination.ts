import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number({ error: 'page deve ser um número' }).int('page deve ser inteiro').min(1, 'page deve ser no mínimo 1').default(1),
  limit: z.coerce
    .number({ error: 'limit deve ser um número' })
    .int('limit deve ser inteiro')
    .min(1, 'limit deve ser no mínimo 1')
    .max(50, 'limit deve ser no máximo 50')
    .default(10),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function buildMeta({ page, limit }: Pagination, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export const idParamSchema = z.object({
  id: z.coerce.number({ error: 'id inválido' }).int('id inválido').positive('id inválido'),
});
