-- (Removido o DROP INDEX "Campaign_embedding_hnsw_idx" gerado pelo Prisma: o índice HNSW da busca
-- semântica não é representável no schema e deve ser mantido. Veja o README.)

-- AlterTable
ALTER TABLE "AiImageGeneration" ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "imageGeneratedByAi" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "AiImageGeneration_url_idx" ON "AiImageGeneration"("url");
