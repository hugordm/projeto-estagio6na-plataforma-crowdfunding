-- CreateTable
CREATE TABLE "AiImageGeneration" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiImageGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiImageGeneration_userId_createdAt_idx" ON "AiImageGeneration"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiImageGeneration" ADD CONSTRAINT "AiImageGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
