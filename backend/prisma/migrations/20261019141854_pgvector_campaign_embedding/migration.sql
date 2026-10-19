-- Habilita o pgvector (no Neon está disponível em todos os planos; é instalado por banco).
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "embedding" vector(1024);

-- Índice HNSW para distância de cosseno (operador <=>). HNSW pode ser criado com a tabela vazia
-- e tem melhor relação velocidade/recall que IVFFlat (que precisa de dados para treinar as listas).
CREATE INDEX "Campaign_embedding_hnsw_idx" ON "Campaign" USING hnsw ("embedding" vector_cosine_ops);
