import 'dotenv/config';
import './network';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// No Prisma 7 o PrismaClient precisa de um driver adapter; aqui usamos o do pg.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Instância única, compartilhada por toda a aplicação.
// maxWait: quanto um $transaction espera por uma conexão livre. O padrão (2 s) é menor que o tempo
// de abrir uma conexão nova com o Neon (e bem menor que o de acordar um compute em repouso).
export const prisma = new PrismaClient({
  adapter,
  transactionOptions: { maxWait: 10_000, timeout: 15_000 },
});
