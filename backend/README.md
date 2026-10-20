# Backend: Plataforma de Crowdfunding

API REST em Node.js, Express 5 e TypeScript (ESM), com Prisma 7 (driver adapter `@prisma/adapter-pg`) e PostgreSQL no Neon com a extensão pgvector. Visão geral do projeto, modelo de dados, lista completa de endpoints e decisões técnicas: [`../README.md`](../README.md). Requisições de teste: [`docs/requests.http`](docs/requests.http).

## 1. Como rodar

Pré-requisitos: Node.js 20 ou superior, npm e um PostgreSQL com pgvector (ex.: Neon).

```bash
cp .env.example .env        # preencha pelo menos DATABASE_URL e JWT_SECRET
npm install
npx prisma migrate deploy   # aplica as migrations (em desenvolvimento: npx prisma migrate dev)
npx prisma generate         # gera o Prisma Client em generated/prisma
npx prisma db seed          # cria as 6 categorias (pode rodar mais de uma vez)
npm run seed:demo           # opcional: dados de demonstração
npm run dev                 # tsx watch src/server.ts, em http://localhost:3001
```

No Prisma 7 o seed é configurado em `prisma.config.ts` (`migrations.seed`) e **não** roda automaticamente após `migrate dev`: execute `npx prisma db seed` manualmente. O `prisma.config.ts` também carrega o `.env` (no Prisma 7 o CLI não faz isso sozinho).

Checagens: `npx tsc --noEmit` (tipos) e `npm run lint` (ESLint). Não há testes automatizados (`npm test` é o placeholder padrão do npm).

As variáveis de ambiente estão descritas na seção 9 do [README da raiz](../README.md#9-variáveis-de-ambiente) e no `.env.example`.

## 2. Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Sobe a API com `tsx watch` (reinicia ao salvar um arquivo; mudanças no `.env` exigem reiniciar). |
| `npm run build` | Empacota `src/server.ts` com o esbuild em `dist/server.js` (pacotes do `node_modules` ficam externos). Requer `npx prisma generate` antes. |
| `npm start` | Roda o servidor compilado (`node dist/server.js`). Usado pela imagem Docker. |
| `npm run docs:check` | Valida a especificação OpenAPI e confere se toda rota registrada no Express está documentada (e vice-versa). |
| `npm run lint` | ESLint (regras recomendadas do ESLint e do `typescript-eslint`, sem checagem por tipos). |
| `npm run check:ai` | Diagnóstico da IA: provedores ativos, variáveis definidas (sem valores), recursos ligados, teste de chat e de embeddings. `-- --image` e `-- --cover` testam a geração de capa (com custo). |
| `npm run seed:demo` / `npm run seed:demo:clean` | Cria / apaga os dados de demonstração (seção 9). |
| `npm run cleanup:uploads` | Lista imagens órfãs do provedor ativo; com `-- --apply` apaga (Cloudinary: `-- --apply --confirm-cloudinary`) (seção 6). |
| `npx tsx scripts/backfill-embeddings.ts [--all]` | Gera os embeddings que faltam (ou refaz todos, com `--all`). |

## 3. Estrutura de `src/`

Cada requisição segue `routes` → `controllers` → `services` → Prisma. Middlewares tratam autenticação, rate limit, upload e erros; `lib/` reúne utilitários e clientes de serviços externos.

```
src/
├── server.ts                  Ponto de entrada: app.listen(PORT).
├── app.ts                     App Express: trust proxy, CORS, rotas (routeMounts), /docs, /uploads estático (CSP para SVG) e erros.
├── docs/                      Especificação OpenAPI 3.0 (servida em /docs e /docs.json).
│   ├── openapi.ts             Caminhos, tags e documento final.
│   ├── components.ts          Modelos de resposta, erros ({ error }), paginação e segurança Bearer.
│   └── zod-schema.ts          z.toJSONSchema: corpos e parâmetros a partir dos schemas zod dos controllers.
├── routes/                    Método + caminho + middlewares; chamam um controller.
│   ├── auth.routes.ts         /auth/register, /login, /forgot-password, /reset-password.
│   ├── campaign.routes.ts     /campaigns (CRUD, /search, /ai-cover, /ai-description, /ai-category, doações).
│   ├── category.routes.ts     /categories.
│   ├── chat.routes.ts         /chat (optionalAuth + chatLimiter).
│   ├── config.routes.ts       /config/features.
│   ├── docs.routes.ts         /docs (Swagger UI) e /docs.json; DOCS_ENABLED=false desliga; HTTP Basic opcional.
│   ├── me.routes.ts           /me/campaigns e /me/donations (requireAuth em todas).
│   └── upload.routes.ts       /uploads/campaign-image (requireAuth, uploadLimiter, multer).
├── controllers/               Leem req, validam com zod (schemas exportados, usados também pela documentação) e chamam o service.
├── services/                  Regras de negócio, Prisma e serviços externos.
│   ├── auth.service.ts            Cadastro e login (bcrypt custo 10, JWT com tokenVersion).
│   ├── password-reset.service.ts  Token de recuperação e envio do e-mail.
│   ├── campaign.service.ts        CRUD, totais de doações, progresso, daysLeft e expired.
│   ├── donation.service.ts        Regras de doação e listas de doações.
│   ├── category.service.ts        Categorias.
│   ├── storage.service.ts         Interface Storage: disco (uploads/) ou Cloudinary, por STORAGE_PROVIDER.
│   ├── embedding.service.ts       Embedding da campanha (geração em segundo plano).
│   ├── search.service.ts          Busca semântica e busca textual para o chat.
│   ├── ai-usage.service.ts        Limite diário de capas por IA.
│   ├── ai-cover.service.ts        Provedor da capa (COVER_PROVIDER) e fluxo de geração.
│   ├── svg-cover.service.ts       Capa em SVG pelo Claude Sonnet.
│   ├── ai-description.service.ts  "Melhorar descrição com IA".
│   ├── ai-category.service.ts     "Sugerir categoria".
│   ├── chat.service.ts            Chatbot: prompt e contexto de campanhas.
│   └── features.service.ts        Recursos de IA ligados (/config/features).
├── middlewares/
│   ├── auth.ts                requireAuth / optionalAuth / getUserId.
│   ├── rate-limit.ts          Todos os limitadores (express-rate-limit).
│   ├── upload.ts              multer em memória, 1 arquivo, 5 MB.
│   └── error.ts               404 e errorHandler ({ error }).
├── lib/
│   ├── prisma.ts              Prisma Client único (adapter pg, maxWait 10 s).
│   ├── http-config.ts         corsOrigins (FRONTEND_URL) e trustProxySetting (TRUST_PROXY).
│   ├── network.ts             Timeout de 2 s por tentativa de conexão (Neon, OpenRouter, Resend).
│   ├── jwt.ts                 signToken / verifyToken (claims sub e ver).
│   ├── http-error.ts          HttpError(status, mensagem).
│   ├── money.ts               moneySchema, formatMoney, calcProgress.
│   ├── dates.ts               todayInSaoPaulo, diffCalendarDays, endOfDeadlineDay, isDeadlineOver (fuso America/Sao_Paulo).
│   ├── pagination.ts          paginationSchema, buildMeta, idParamSchema.
│   ├── image-type.ts          detectImageType (bytes), isSvgUrl.
│   ├── svg-sanitize.ts        sanitizeSvg, extractSvg.
│   ├── mailer.ts              sendEmail pelo Resend (fetch, timeout de 10 s).
│   ├── email-templates.ts     E-mail de recuperação de senha (HTML e texto).
│   ├── ai-types.ts            ChatMessage, ChatOptions, AiError.
│   ├── ai-http-error.ts       AiError -> HttpError com mensagem amigável.
│   ├── llm.ts                 chat() e isChatConfigured() conforme CHAT_PROVIDER.
│   ├── anthropic.ts           Cliente do Claude (SDK oficial).
│   ├── openrouter.ts          Cliente do OpenRouter (fetch).
│   ├── cloudinary.ts          Cliente do Cloudinary (fetch): upload e destroy assinados (SHA-1), listagem (Admin API).
│   ├── plain-text.ts          toPlainText (remove markdown).
│   └── search-terms.ts        normalizeText e searchTerms (busca textual).
└── types/express.d.ts         req.userId.
```

Outras pastas e arquivos: `prisma/` (schema, migrations e seed), `scripts/` (seção 2, mais `docker-start.sh`), `docs/requests.http`, `Dockerfile` e `.dockerignore` (ver seção Docker do [README da raiz](../README.md#13-docker)), `dist/` (build, não versionado), `generated/prisma/` (Prisma Client gerado, não editar nem versionar) e `uploads/` (arquivos enviados; ignorada pelo git, exceto o `.gitkeep`).

## 4. Convenções da API

- **Autenticação:** `Authorization: Bearer <token>`. JWT de 7 dias com `sub` = id do usuário e `ver` = `User.tokenVersion`. `requireAuth` confere no banco se a versão é a atual; redefinir a senha incrementa a versão e invalida todos os tokens anteriores. Tokens sem `ver` (anteriores à migration `user_token_version`) são recusados com 401. `optionalAuth` (chat) segue como visitante se o token for inválido.
- **Senha:** 8 a 72 caracteres no cadastro e na redefinição (72 é o limite do bcrypt), mensagem "A senha deve ter de 8 a 72 caracteres."; o login não tem mínimo. `passwordHash` nunca é retornado.
- **Erros:** sempre `{ "error": "mensagem em português" }`; validação inválida (zod) → 400; JSON malformado → 400; rota inexistente → 404; erro não tratado → 500 com mensagem genérica (detalhe só no log).
- **Valores monetários:** `Decimal(12,2)` no banco e `Prisma.Decimal` no código. Entrada: número ou string com até 2 casas, maior que zero e até 9.999.999.999,99. Saída: sempre string com 2 casas (ex.: `"150.50"`). `progress` é um número percentual com 2 casas e pode passar de 100.
- **Valor arrecadado:** não é coluna; é a soma das doações calculada a cada consulta. `donorsCount` conta doadores distintos.
- **Prazo:** dia de calendário em America/Sao_Paulo (`lib/dates.ts`), qualquer que seja o fuso do servidor. Entrada `"AAAA-MM-DD"` (ou data e hora ISO, que vale o dia daquele instante em Brasília), hoje ou depois; gravado como o fim do dia (23:59:59.999 em Brasília). Toda campanha devolvida tem `daysLeft` (dias de calendário até o prazo: hoje = 0, nunca negativo) e `expired` (o dia do prazo já terminou). Doações são aceitas até o fim do dia do prazo.
- **Paginação:** `page` (mín. 1) e `limit` (1 a 50, padrão 10); resposta `{ data, meta: { page, limit, total, totalPages } }`.
- **CORS:** só as origens de `FRONTEND_URL` (separadas por vírgula; padrão `http://localhost:3000`) podem chamar a API pelo navegador. curl, scripts e a Swagger UI em `/docs` (mesma origem) não dependem disso.
- **Proxy:** `TRUST_PROXY` (vazio/`false` por padrão; `1` atrás de um proxy como o do Render) define quando confiar no `X-Forwarded-For`, para o rate limit usar o IP real.
- **Documentação:** Swagger UI em `/docs` e OpenAPI em `/docs.json` (desligue com `DOCS_ENABLED=false`; com `DOCS_USER` e `DOCS_PASSWORD`, exige HTTP Basic, com rate limit de 20 falhas/15 min por IP). Ao criar ou mudar uma rota, atualize `src/docs/openapi.ts` e rode `npm run docs:check`.

## 5. Recuperação de senha

1. `POST /auth/forgot-password` gera um token aleatório de 256 bits, guarda **só o SHA-256** em `PasswordResetToken` (validade de 30 min), apaga os tokens ainda não usados do usuário e envia o link `FRONTEND_URL/reset-password?token=...` pelo Resend (`lib/mailer.ts`). O envio é em segundo plano: a resposta não espera o Resend, tem sempre o mesmo texto e não revela se o e-mail existe.
2. `POST /auth/reset-password` confere o hash (existe, não usado, não expirado) e, numa transação, marca `usedAt` (uso único, mesmo com requisições simultâneas), grava o novo hash bcrypt e incrementa `tokenVersion`.
3. Rate limit: 10 pedidos a cada 15 min por IP (somando as duas rotas) e 3 por hora por e-mail no `forgot-password`.

**Testar o envio real:** com uma conta no Resend, preencha `RESEND_API_KEY` e `RESEND_FROM_EMAIL`. Sem domínio verificado, use `RESEND_FROM_EMAIL="Crowdfunding <onboarding@resend.dev>"`: o Resend só entrega para o e-mail do dono da conta. **Sem Resend configurado**, o link aparece no console do servidor (somente quando `NODE_ENV` não é `production`).

## 6. Upload de imagens

- `services/storage.service.ts` define a interface `Storage` (`save`, `owns`, `remove`) com duas implementações, escolhidas por `STORAGE_PROVIDER`:
  - `local` (padrão, `DiskStorage`): grava em `uploads/` com nome aleatório (UUID); o Express serve a pasta em `/uploads` com `X-Content-Type-Options: nosniff` (e CSP restritiva no SVG).
  - `cloudinary` (`CloudinaryStorage` + `lib/cloudinary.ts`): upload assinado para `CLOUDINARY_FOLDER/<uuid>` (padrão `crowdfunding/campaigns`), sem sobrescrever; a `imageUrl` é a `secure_url` (`https://res.cloudinary.com/...`). A capa SVG da IA (já sanitizada) vai como `resource_type: image`, e a URL salva recebe `fl_sanitize`. Falha do provedor → 502 com mensagem genérica; sem credenciais → 503 (e aviso ao iniciar). Chave e segredo nunca vão para o log.
  - O resto do código usa só `saveImage`, `deleteImage` e `isOwnUploadUrl`. As duas implementações reconhecem os próprios arquivos sempre, então URLs `/uploads/...` antigas continuam válidas (e apagáveis) com o Cloudinary ativo, e vice-versa (se as credenciais continuarem configuradas).
- **Testes sem conta real:** `CLOUDINARY_UPLOAD_PREFIX` (mesmo nome usado pelo SDK oficial; padrão `https://api.cloudinary.com`) troca o endereço da API, por exemplo para um servidor falso local. Não defina em produção.
- **Troca e remoção:** ao trocar a capa, removê-la (`imageUrl: null`) ou excluir a campanha, o arquivo antigo é apagado no provedor a que a URL pertence, se nenhuma outra campanha usar a mesma URL. Falha ao apagar é registrada no log e a requisição segue normalmente.
- `middlewares/upload.ts` usa o `multer` em memória (5 MB, um arquivo, campo `image`). O tipo é decidido pelos primeiros bytes (`lib/image-type.ts`): só JPEG, PNG e WebP; SVG enviado por usuário é recusado.
- `imageUrl` da campanha aceita a URL devolvida pelo upload ou uma URL `http(s)` externa, exceto `.svg`: SVG só é aceito se o arquivo for da plataforma (`/uploads` deste servidor ou a conta e a pasta do Cloudinary configuradas), ou seja, a capa gerada e sanitizada. Na edição, `imageUrl: null` remove a imagem.
- `Campaign.imageGeneratedByAi` é calculado pelo backend: `true` só se a `imageUrl` estiver registrada em `AiImageGeneration`.
- **Arquivos órfãos:** `npm run cleanup:uploads` lista, no provedor ativo, arquivos com mais de 24 h que nenhuma campanha (`imageUrl`) nem geração de IA (`AiImageGeneration.url`) referencia. Local: só apaga com `-- --apply` (o `.gitkeep` nunca é apagado). Cloudinary: lista a pasta pela Admin API e só apaga com `-- --apply --confirm-cloudinary`. Não roda sozinho (pode ser agendado).

## 7. IA

| Recurso | Provedor (variável) | Onde |
|---------|---------------------|------|
| Texto: chatbot, melhorar descrição, sugerir categoria | `CHAT_PROVIDER`: `anthropic` (Claude Haiku 5.5) ou `openrouter` | `lib/llm.ts` → `lib/anthropic.ts` ou `lib/openrouter.ts` |
| Capa | `COVER_PROVIDER`: `anthropic-svg` (Claude Sonnet 5.5) ou `openrouter` (imagem) | `services/ai-cover.service.ts` |
| Embeddings / busca semântica | Sempre OpenRouter | `lib/openrouter.ts` |

- **Contrato comum** (`lib/ai-types.ts`): erros viram `AiError` com `kind` (`not_configured`, `invalid_key`, `no_credits`, `rate_limited`, `timeout`, `unavailable`, `rejected`, `bad_response`); `OpenRouterError` e `AnthropicError` estendem `AiError`. Os serviços tratam só `AiError` e respondem com mensagem amigável (`lib/ai-http-error.ts`). Nenhuma falha de IA derruba o servidor.
- **Recursos ligados** (`GET /config/features`, `services/features.service.ts`): `semanticSearch` = `isSemanticSearchConfigured()` (chave do OpenRouter + `OPENROUTER_EMBEDDING_MODEL`); `aiCover` = `isCoverConfigured()` (`anthropic-svg`: chave da Anthropic, com modelo padrão; `openrouter`: chave + `OPENROUTER_IMAGE_MODEL`); `aiChat` e `aiWriting` = `isChatConfigured()`. O frontend esconde o que estiver desligado.
- **Anthropic** (`lib/anthropic.ts`, SDK oficial `@anthropic-ai/sdk`): chat com `ANTHROPIC_CHAT_MODEL` (padrão `claude-haiku-5-5`), timeout de 30 s, `effort: "low"` e sem `temperature` (o Haiku 5.5 recusa valores fora do padrão); o raciocínio interno conta em `max_tokens`, por isso o limite é a cota da resposta + 2000 tokens. A retentativa do SDK fica desligada; `withRetry()` tenta de novo após 800 ms em limite de uso, indisponibilidade e rede (timeout não é repetido).
- **OpenRouter** (`lib/openrouter.ts`, `fetch` em `https://openrouter.ai/api/v1`): `chat` (`/chat/completions`, 30 s), `embed` (`/embeddings`, 15 s) e `generateImage` (`/images`, 90 s). Nova tentativa após 800 ms para 429, 502, 503 e falha de rede; trata resposta 200 com objeto `error`.
- **Capa SVG** (`services/svg-cover.service.ts`): prompt fixo pedindo um único `<svg>` com `viewBox="0 0 1200 675"`, ilustração plana e geométrica, sem texto, pessoas reais, imagens externas ou scripts. Usa `ANTHROPIC_COVER_MODEL` (padrão `claude-sonnet-5-5`) por streaming, `max_tokens` 32000, `effort: "medium"`, prazo de 150 s e `fallbacks: "default"`. O código é separado do texto em volta (`extractSvg`) e sanitizado (`lib/svg-sanitize.ts`): reconstruído só com `svg, g, path, rect, circle, ellipse, line, polyline, polygon, defs, linearGradient, radialGradient, stop, clipPath, mask` e atributos permitidos; DOCTYPE/entidades/CDATA, tags que não fecham, texto solto, SVG vazio ou acima de 200 KB são rejeitados. SVG inválido: uma nova tentativa e depois mensagem amigável.
- **Capa por imagem** (`COVER_PROVIDER=openrouter`): prompt fixo em inglês (ilustração plana, 16:9, sem texto nem pessoas reais); o resultado é conferido pelos bytes antes de salvar.
- **Fluxo da capa:** reserva no limite diário → geração → salva pelo `storage.service` → grava a URL na reserva → `{ url }`. Em falha, a reserva é desfeita (não consome o limite).
- **Melhorar descrição** (`services/ai-description.service.ts`): prompt fixo que reescreve em português usando **somente** fatos, objetos, ações e números do título e da descrição originais, sem acrescentar atividades, benefícios, locais, públicos ou promessas; se faltar informação, só melhora clareza e gramática; mantém os verbos e as palavras principais quando corretos. O texto do usuário vai entre marcadores `<descricao>`; a resposta passa por `toPlainText()` e precisa ter de 10 a 5000 caracteres.
- **Sugerir categoria** (`services/ai-category.service.ts`): as categorias vêm do banco (`id = nome`); o modelo responde só o número e o backend confere se o id existe.
- **Chatbot** (`services/chat.service.ts`): histórico validado (só `user`/`assistant`, até 1000 caracteres por mensagem e 50 mensagens; o modelo recebe as 10 últimas). O prompt é montado por `buildSystemPrompt(getFeatures())` e só menciona recursos de IA ligados. Antes de responder, `findRelatedCampaigns` traz até 3 campanhas: busca semântica quando há embeddings; senão (ou se falhar), busca textual (`findRelatedCampaignsByText`: pergunta normalizada e sem palavras vazias por `lib/search-terms.ts`; cada termo vale 1 ponto se aparecer no título, na descrição ou na categoria; entram campanhas ativas que batem a maioria dos termos, ou metade incluindo o mais longo; comparação sem acentos com `translate()` + `lower()` no PostgreSQL, sem precisar da extensão `unaccent`). O contexto leva só campos públicos (título, categoria, resumo, meta, arrecadado, dias restantes e o caminho `/campaigns/<id>`). Resposta em texto puro (`toPlainText()`).
- **Limites de uso** (`middlewares/rate-limit.ts`, em memória, por usuário ou IP): chat 15/min, busca inteligente 30/min, capa 3 a cada 10 min, escrita por IA 10 a cada 10 min, upload 20/hora. Diário de capas: 5 por usuário a cada 24 h, contadas na tabela `AiImageGeneration` (sobrevive a reinícios).

## 8. Banco, migrations e busca semântica

- **Migrations** (`prisma/migrations/`): `add_user_password`, `campaigns_donations`, `password_reset_tokens`, `ai_image_generations`, `pgvector_campaign_embedding`, `ai_cover` e `user_token_version`.
- **pgvector:** a migration `pgvector_campaign_embedding` habilita a extensão, adiciona `Campaign.embedding vector(1024)` (no schema: `Unsupported("vector(1024)")`, lido e gravado com SQL bruto) e cria o índice **HNSW** `Campaign_embedding_hnsw_idx` com `vector_cosine_ops` (pode ser criado com a tabela vazia, ao contrário do IVFFlat).
- **Atenção em novas migrations:** o Prisma não representa índices HNSW no schema e tenta apagá-lo. Sempre crie a migration com `npx prisma migrate dev --create-only --name <nome>`, **remova do SQL gerado a linha `DROP INDEX "Campaign_embedding_hnsw_idx";`** e só então aplique com `npx prisma migrate dev` (ou `migrate deploy`). Depois, rode `npx prisma generate`.
- **Rede:** o Prisma CLI pode travar ou dar P1001 com o Neon em redes com latência alta; nesse caso, rode com `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000` e confira o resultado com `npx prisma migrate status`. Em tempo de execução, `lib/network.ts` aumenta o tempo por tentativa de conexão para 2 s e `lib/prisma.ts` aumenta o `maxWait` das transações para 10 s.
- **Geração de embeddings:** ao criar uma campanha ou editar título, descrição ou categoria, `embedding.service.ts` gera em segundo plano o embedding de "título + descrição + categoria" (falha só gera log). Para as que ficaram sem: `npx tsx scripts/backfill-embeddings.ts`.
- **Busca:** `GET /campaigns/search` ordena pela distância de cosseno (`<=>`) e só devolve resultados com similaridade ≥ 0,45 (`MIN_SIMILARITY`, calibrado com o `baai/bge-m3`). Sem embeddings ou com falha da IA, usa a busca textual da listagem e avisa em `notice`.
- **Estado atual:** busca semântica desligada (OpenRouter sem saldo). O código está pronto; ao configurar a chave e o modelo, rode o backfill.
- **Trocar o modelo de embeddings** exige migration com a nova dimensão, ajustar `EMBEDDING_DIMENSIONS`, backfill com `--all` e recalibrar `MIN_SIMILARITY`.

## 9. Dados de demonstração

`npm run seed:demo` (`scripts/seed-demo.ts`) cria 2 usuários e 5 campanhas fictícias (títulos começam com `[Demo]`), com prazos no futuro, nas categorias do seed, e doações de exemplo (sempre do outro usuário). É idempotente: rodar de novo atualiza os mesmos registros e empurra os prazos para o futuro. Se os embeddings estiverem configurados, gera os embeddings; senão, só avisa. Requer as categorias (`npx prisma db seed`).

| E-mail | Senha |
|--------|-------|
| `ana.demo@example.com` | `demo1234` |
| `bruno.demo@example.com` | `demo1234` |

`npm run seed:demo:clean` apaga só o que o script cria: os dois usuários, as campanhas deles (com as doações recebidas) e as doações que eles fizeram.

## 10. Lint e TypeScript

`npm run lint` roda o ESLint 10 com `eslint.config.js`: regras recomendadas do ESLint e do `typescript-eslint` (sem checagem por tipos) e nomes começando com `_` tratados como ignorados de propósito.

O backend usa **TypeScript 6.0**: o `typescript-eslint` ainda não suporta o TypeScript 7 (a versão nativa em Go não tem a API JavaScript que o parser usa). O 7.0 é um port do 6.0 com o mesmo sistema de tipos; quando houver suporte, basta atualizar. O projeto não gera JavaScript compilado (`noEmit`): o `tsx` executa o TypeScript direto, em desenvolvimento e nos scripts.
