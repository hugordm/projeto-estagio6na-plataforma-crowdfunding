# Backend: API da Plataforma de Crowdfunding

API REST em **Node.js + Express 5 (ESM) + TypeScript**, com **Prisma 7** sobre **PostgreSQL** (Neon). Cuida de contas, campanhas, doações simuladas, upload de imagens, recursos de IA (Anthropic) e envio de e-mail (Resend). O frontend em `../frontend` é o único cliente pelo navegador.

Visão geral, arquitetura, modelo de dados, tabela completa de endpoints, decisões técnicas e deploy: [README da raiz](../README.md). Aqui ficam os detalhes do código do backend.

---

## Como rodar

```bash
cp .env.example .env         # preencha pelo menos DATABASE_URL e JWT_SECRET
npm install
npx prisma generate          # gera o Prisma Client em generated/prisma (necessário antes de rodar)
npx prisma migrate deploy    # aplica as migrations no banco
npx prisma db seed           # 6 categorias iniciais
npm run seed:demo            # opcional: dados de demonstração
npm run dev                  # http://localhost:3001  (Swagger em /docs)
```

Com Docker, a partir da raiz: `docker compose up --build` (seção 10.2 do [README da raiz](../README.md#102-com-docker--docker-compose)).

## Como testar

Não há testes automatizados (`npm test` é o placeholder do npm). A verificação é:

- `npm run lint` e `npx tsc --noEmit` (estilo e tipos);
- `npm run docs:check` (OpenAPI válido e igual às rotas registradas);
- `GET /` e `GET /health-db` (servidor e banco);
- Swagger UI em `/docs` ("Try it out" e **Authorize** com o token do login);
- [`docs/requests.http`](docs/requests.http): requisições prontas (REST Client / JetBrains), com o curl equivalente em comentário;
- `npm run check:ai` para conferir a IA sem abrir o site.

## Scripts

| Script | Arquivo | O que faz |
|--------|---------|-----------|
| `npm run dev` | `src/server.ts` | `tsx watch`: roda o TypeScript direto e reinicia ao salvar. |
| `npm run build` | `src/server.ts` | esbuild empacota `src/` em `dist/server.js` (ESM, Node 22+, pacotes do `node_modules` ficam de fora). |
| `npm start` | `dist/server.js` | Roda o servidor compilado (usado no Docker). |
| `npm run lint` | `eslint.config.js` | ESLint com as regras recomendadas e typescript-eslint. |
| `npm run docs:check` | `scripts/docs-check.ts` | Valida a especificação com `@apidevtools/swagger-parser` e compara, nos dois sentidos, as rotas de `routeMounts` com as operações documentadas. Sai com código 1 se houver diferença. |
| `npm run seed:demo` | `scripts/seed-demo.ts` | Cria/atualiza (idempotente) 2 usuários `@example.com`, 5 campanhas "[Demo]" com prazo futuro e doações. Precisa das categorias do seed. A senha de demonstração é uma constante do script. |
| `npm run seed:demo:clean` | `scripts/seed-demo.ts --clean` | Apaga só o que o script cria. |
| `npm run check:ai` | `scripts/check-ai.ts` | Mostra os provedores, quais variáveis da IA estão definidas (sem valores), os recursos ligados e faz uma chamada curta de chat. `-- --cover` gera uma capa (tem custo) e salva o SVG na pasta temporária do sistema. |
| `npm run cleanup:uploads` | `scripts/cleanup-orphan-uploads.ts` | Lista imagens do provedor ativo com mais de 24 h que nenhuma campanha nem registro de IA usa. `-- --apply` apaga no disco; no Cloudinary exige `-- --apply --confirm-cloudinary`. |
| `npx prisma db seed` | `prisma/seed.ts` | Cria as categorias (configurado em `prisma.config.ts`). |

`scripts/docker-start.sh` não é script npm: é o comando de início do container (migrations com até 10 tentativas + `node dist/server.js`; com `LOCAL_DATABASE_URL`, usa esse banco).

---

## Estrutura

```text
backend/
├── .env.example                 Modelo do .env (todas as variáveis, com comentários).
├── .dockerignore                Exclui .env*, node_modules, dist, generated, uploads e docs da imagem.
├── .gitignore                   Ignora .env, generated/, dist/ e o conteúdo de uploads/.
├── Dockerfile                   Estágios build → prod-deps → runtime (usuário node, HEALTHCHECK em /).
├── eslint.config.js             Configuração do ESLint (flat config).
├── package.json                 Dependências e scripts.
├── prisma.config.ts             Prisma 7: caminho do schema, das migrations, comando do seed e DATABASE_URL (via dotenv).
├── tsconfig.json                Configuração do TypeScript.
├── docs/requests.http           Requisições de exemplo para todas as rotas.
├── uploads/.gitkeep             Destino das imagens com STORAGE_PROVIDER=local (servido em /uploads).
├── prisma/
│   ├── schema.prisma            Models e enum CampaignStatus. Gera o client em ../generated/prisma.
│   ├── seed.ts                  Upsert das 6 categorias.
│   └── migrations/
│       ├── 20261019121326_add_user_password/          Tabela User com senha.
│       ├── 20261019122315_campaigns_donations/        Category, Campaign, Donation.
│       ├── 20261019135355_password_reset_tokens/      PasswordResetToken.
│       ├── 20261019141435_ai_image_generations/       AiImageGeneration (limite diário de capas).
│       ├── 20261019141854_pgvector_campaign_embedding/ Extensão vector, coluna embedding e índice HNSW (hoje sem uso).
│       ├── 20261019143747_ai_cover/                   Campanha: imageGeneratedByAi; registro: url.
│       ├── 20261019193515_user_token_version/         User.tokenVersion.
│       └── migration_lock.toml
├── scripts/                     docker-start.sh, docs-check.ts, seed-demo.ts, check-ai.ts, cleanup-orphan-uploads.ts.
└── src/
    ├── server.ts                Lê PORT e chama app.listen.
    ├── app.ts                   Monta o Express (ver "Como as partes se conectam").
    ├── types/express.d.ts       req.userId no tipo Request.
    ├── routes/
    │   ├── auth.routes.ts       /auth: register, login, forgot-password e reset-password (com rate limits).
    │   ├── campaign.routes.ts   /campaigns: CRUD, search, ai-cover, ai-description, ai-category e /:id/donations.
    │   ├── category.routes.ts   /categories: listagem.
    │   ├── chat.routes.ts       /chat: optionalAuth + chatLimiter.
    │   ├── config.routes.ts     /config/features.
    │   ├── me.routes.ts         /me/campaigns e /me/donations (requireAuth em todas).
    │   ├── upload.routes.ts     /uploads/campaign-image: requireAuth → uploadLimiter → multer.
    │   └── docs.routes.ts       /docs e /docs.json: DOCS_ENABLED, HTTP Basic (DOCS_USER/DOCS_PASSWORD), docsLimiter.
    ├── controllers/             Schemas zod de entrada + chamada ao service + status HTTP.
    │   ├── auth.controller.ts        Regras de nome, e-mail e senha (8 a 72); resposta fixa no forgot-password.
    │   ├── campaign.controller.ts    campaignSchema/updateCampaignSchema, prazo "AAAA-MM-DD", regra do SVG; list/search/getById/create/update/remove.
    │   ├── donation.controller.ts    amount (moneySchema) e message (até 500).
    │   ├── ai-cover.controller.ts    { title, description, categoryId? } → { url }.
    │   ├── ai-writing.controller.ts  Melhorar descrição e sugerir categoria.
    │   ├── chat.controller.ts        Histórico só com user/assistant, até 50 mensagens de até 1000 caracteres.
    │   ├── me.controller.ts          Campanhas e doações do usuário logado (id vem do token).
    │   ├── category.controller.ts    Lista categorias.
    │   ├── config.controller.ts      Devolve getFeatures().
    │   └── upload.controller.ts      Detecta o tipo pelos bytes e salva pelo storage.
    ├── services/
    │   ├── auth.service.ts           Cadastro e login (bcrypt custo 10), emissão do JWT.
    │   ├── password-reset.service.ts Token SHA-256, 30 min, uso único, incrementa tokenVersion.
    │   ├── campaign.service.ts       Listagem/filtros, totais (groupBy), daysLeft/expired, dono, exclusão com doações (409), descarte de imagens.
    │   ├── donation.service.ts       Regras da doação simulada e listagens paginadas.
    │   ├── category.service.ts       Categorias em ordem alfabética.
    │   ├── search.service.ts         /campaigns/search (texto) e busca pontuada de campanhas para o chat.
    │   ├── chat.service.ts           Prompt do assistente (depende dos recursos ligados), contexto de campanhas, histórico (10 últimas).
    │   ├── ai-description.service.ts Reescrita da descrição.
    │   ├── ai-category.service.ts    Escolha de uma categoria existente.
    │   ├── ai-cover.service.ts       COVER_PROVIDER, reserva/limite, geração e erros amigáveis.
    │   ├── svg-cover.service.ts      Prompt do SVG 1200x675, chamada ao Sonnet, sanitização (2 tentativas).
    │   ├── ai-usage.service.ts       Limite de 5 capas/24 h na tabela AiImageGeneration; reconhece capas da IA pela URL.
    │   ├── features.service.ts       { aiCover, aiChat, aiWriting } e avisos de configuração no início.
    │   └── storage.service.ts        Interface Storage: disco (local) ou Cloudinary; save/delete/isOwnUploadUrl.
    ├── middlewares/
    │   ├── auth.ts              requireAuth, optionalAuth, getUserId (JWT + tokenVersion no banco).
    │   ├── rate-limit.ts        Todos os limitadores (express-rate-limit, em memória).
    │   ├── upload.ts            multer em memória, 5 MB, um arquivo no campo "image"; erros em português.
    │   └── error.ts             404 e errorHandler: HttpError, ZodError e JSON inválido → { error }.
    ├── lib/
    │   ├── prisma.ts            Prisma Client com @prisma/adapter-pg (DATABASE_URL).
    │   ├── jwt.ts               signToken/verifyToken (7 dias, claims sub e ver).
    │   ├── http-config.ts       corsOrigins() (FRONTEND_URL) e trustProxySetting() (TRUST_PROXY).
    │   ├── http-error.ts        Classe HttpError(status, mensagem).
    │   ├── pagination.ts        idParamSchema, paginationSchema (limit até 50) e buildMeta.
    │   ├── money.ts             moneySchema (Decimal, até 2 casas), formatMoney, calcProgress.
    │   ├── dates.ts             Prazo em America/Sao_Paulo: endOfDeadlineDay, diffCalendarDays, isDeadlineOver.
    │   ├── image-type.ts        Detecção JPEG/PNG/WebP pelos bytes; GENERATED_SVG; isSvgUrl.
    │   ├── svg-sanitize.ts      Tokenizador estrito e reconstrução do SVG por allowlist (até 200 KB).
    │   ├── llm.ts               Camada de texto: CHAT_PROVIDER → anthropic.chat().
    │   ├── anthropic.ts         SDK oficial: chat (Haiku) e generateLongText por streaming (Sonnet), retry e tradução de erros.
    │   ├── ai-types.ts          ChatMessage, ChatOptions e AiError (kind: not_configured, timeout, rejected...).
    │   ├── ai-http-error.ts     AiError → HttpError com mensagem amigável.
    │   ├── plain-text.ts        Remove markdown que escape das respostas do chat.
    │   ├── search-terms.ts      Termos de busca sem acentos e sem palavras vazias.
    │   ├── cloudinary.ts        Upload, exclusão e listagem por fetch com assinatura SHA-1; esconde chaves nos logs.
    │   ├── mailer.ts            Envio pelo Resend (fetch) se RESEND_API_KEY e RESEND_FROM_EMAIL existirem.
    │   ├── email-templates.ts   E-mail de recuperação de senha (HTML com escape).
    │   └── network.ts           Aumenta o timeout de tentativa de conexão IPv4/IPv6 para 2 s.
    └── docs/
        ├── openapi.ts           Documento OpenAPI 3 (operações, tags, segurança Bearer).
        ├── components.ts        Schemas de resposta e exemplos escritos à mão.
        └── zod-schema.ts        Converte os schemas zod dos controllers em JSON Schema (z.toJSONSchema).
```

## Como as partes se conectam

1. **`app.ts`** configura `trust proxy` (`TRUST_PROXY`), CORS (`FRONTEND_URL`) e `express.json()`, define `/` e `/health-db`, registra os roteadores da lista `routeMounts` (`/auth`, `/categories`, `/campaigns`, `/uploads`, `/chat`, `/me`, `/config`), liga `/docs` se `DOCS_ENABLED` não for `false`, serve `uploads/` em `/uploads` (com `nosniff` e CSP nos SVG) e por último o 404 e o `errorHandler`.
2. **Rota → middlewares → controller:** por exemplo, `POST /campaigns/ai-cover` passa por `requireAuth` e `aiImageLimiter` antes de `ai-cover.controller.ts`.
3. **Controller → service:** o controller faz `schema.parse(req.body)` (um `ZodError` vira 400) e chama o service com dados já convertidos (`Decimal`, `Date`).
4. **Service → lib:** banco via `lib/prisma.ts`; IA via `lib/llm.ts` (texto) ou `svg-cover.service.ts` → `lib/anthropic.ts` (capa); imagens via `storage.service.ts` → disco ou `lib/cloudinary.ts`; e-mail via `lib/mailer.ts`.
5. **Erros:** services lançam `HttpError`; falhas de IA viram `AiError` e são traduzidas em mensagens amigáveis; tudo sai como `{ error }`.
6. **Documentação:** `docs/openapi.ts` importa os schemas zod exportados pelos controllers, então mudar uma regra de validação muda o Swagger. `scripts/docs-check.ts` importa `app` e `routeMounts`.

## Convenções da API

- Erros: `{ "error": "mensagem em português" }`.
- Listas: `{ data, meta: { page, limit, total, totalPages } }`, `limit` de 1 a 50.
- Dinheiro: entrada número ou string com até 2 casas; saída string `"150.50"`; `progress` é número e pode passar de 100.
- Prazo: entrada `"AAAA-MM-DD"` (ou ISO); gravado como 23:59:59.999 em São Paulo; saída com `daysLeft` (≥ 0) e `expired`.
- Autenticação: `Authorization: Bearer <token>`; o id do usuário sempre vem do token, nunca da URL.

## Variáveis de ambiente

Lista completa, com obrigatoriedade e exemplos, na [seção 9.1 do README da raiz](../README.md#91-backend-backendenv-ou-painel-do-render). Modelo comentado: [`.env.example`](.env.example). Resumo:

- **Mínimo para rodar:** `DATABASE_URL`, `JWT_SECRET`.
- **HTTP:** `PORT`, `BACKEND_URL`, `FRONTEND_URL`, `TRUST_PROXY`, `NODE_ENV`.
- **Swagger:** `DOCS_ENABLED`, `DOCS_USER`, `DOCS_PASSWORD`.
- **Imagens:** `STORAGE_PROVIDER`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_URL`, `CLOUDINARY_FOLDER` (e `CLOUDINARY_UPLOAD_PREFIX`, só para testes com servidor falso).
- **E-mail:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- **IA:** `CHAT_PROVIDER`, `COVER_PROVIDER`, `ANTHROPIC_API_KEY`, `ANTHROPIC_CHAT_MODEL`, `ANTHROPIC_COVER_MODEL`.

Ao iniciar, o servidor avisa no log (sem mostrar valores) sobre configurações incoerentes: só um de `DOCS_USER`/`DOCS_PASSWORD`, `/docs` aberto em produção, `STORAGE_PROVIDER` inválido ou sem credenciais, `CHAT_PROVIDER`/`COVER_PROVIDER` não suportados.

## Recursos específicos

**Recuperação de senha.** Sem Resend configurado e fora de produção, o link aparece no console do servidor (útil no desenvolvimento). Detalhes da segurança na seção 8 do [README da raiz](../README.md#8-decisões-técnicas).

**Imagens.** Upload por `POST /uploads/campaign-image` (multipart, campo `image`). Com `STORAGE_PROVIDER=local`, os arquivos vão para `uploads/` com nome UUID; com `cloudinary`, para `CLOUDINARY_FOLDER`. A capa SVG da IA é salva pelo mesmo `saveImage`; no Cloudinary a URL recebe `fl_sanitize`.

**IA.** Chat, descrição e categoria usam `ANTHROPIC_CHAT_MODEL` (padrão `claude-haiku-5-5`, esforço baixo, timeout de 30 s, uma nova tentativa em erro passageiro). A capa usa `ANTHROPIC_COVER_MODEL` (padrão `claude-sonnet-5-5`) por streaming, com prazo de 150 s e até 2 tentativas se o SVG vier inválido. Sem `ANTHROPIC_API_KEY`, os recursos ficam ocultos e as rotas de IA respondem 503 com mensagem amigável.

## Banco e migrations

- O Prisma Client é gerado em `generated/prisma` (fora do git): rode `npx prisma generate` depois de clonar ou de mudar o schema.
- Produção e Docker usam `npx prisma migrate deploy` (feito pelo `docker-start.sh`).
- **Cuidado com o índice HNSW:** a coluna `embedding` (`vector(1024)`) e o índice `Campaign_embedding_hnsw_idx` não são usados pelo código, mas continuam no banco. O Prisma não enxerga esse índice e tenta apagá-lo ao gerar migrations. Crie migrations com `npx prisma migrate dev --create-only`, remova a linha `DROP INDEX "Campaign_embedding_hnsw_idx"` do SQL gerado (a menos que a intenção seja remover a busca vetorial de vez) e só então aplique.
