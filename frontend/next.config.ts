import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone (servidor mínimo com só os arquivos necessários), usado pela imagem Docker.
  // `next start` continua funcionando normalmente.
  output: "standalone",
};

export default nextConfig;
