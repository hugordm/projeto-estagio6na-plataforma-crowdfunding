-- Versão dos tokens de login (invalida tokens antigos ao redefinir a senha).
-- A linha DROP INDEX "Campaign_embedding_hnsw_idx" gerada pelo Prisma foi removida (ver README).

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
