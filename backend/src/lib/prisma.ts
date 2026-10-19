import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// No Prisma 7 o PrismaClient precisa de um driver adapter; aqui usamos o do pg.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Instância única, compartilhada por toda a aplicação.
export const prisma = new PrismaClient({ adapter });
