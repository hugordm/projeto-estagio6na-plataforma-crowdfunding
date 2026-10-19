// Carrega as variáveis do .env (no Prisma 7 o CLI não faz isso sozinho)
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // No Prisma 7 o seed é configurado aqui (não mais no package.json) e só roda com "prisma db seed".
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
