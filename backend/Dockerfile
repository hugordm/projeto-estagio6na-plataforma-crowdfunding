# Imagem do backend (API Express + Prisma 7).
# Estágios: build (dependências completas, prisma generate e esbuild) -> prod-deps (só dependências
# de produção) -> runtime (usuário sem privilégios, aplica as migrations e sobe o servidor compilado).
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
# openssl: exigido pelo motor de migrations do Prisma (prisma migrate deploy).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Gera o Prisma Client (generated/prisma) e empacota src/ em dist/server.js. O prisma.config.ts exige
# DATABASE_URL, mas o generate não conecta ao banco: um valor fictício basta (não vai para a imagem final).
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate && npm run build

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    NPM_CONFIG_UPDATE_NOTIFIER=false
# UID do usuário da aplicação. Em Linux, use o mesmo UID do seu usuário (id -u) para o container
# conseguir gravar em backend/uploads montado do host.
ARG APP_UID=1000
RUN if [ "$APP_UID" != "1000" ]; then usermod -u "$APP_UID" node && chown -R node /home/node; fi
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node scripts/docker-start.sh ./docker-start.sh
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["sh", "./docker-start.sh"]
