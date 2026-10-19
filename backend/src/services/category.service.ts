import { prisma } from '../lib/prisma';

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}
