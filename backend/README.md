# Backend — Plataforma de Crowdfunding

API REST em Node.js + Express 5 + TypeScript (ESM), com Prisma 7 (driver adapter `@prisma/adapter-pg`) e PostgreSQL no Neon.

## Como rodar

```bash
cp .env.example .env        # e preencha os valores (veja a tabela abaixo)
npm install
npx prisma migrate deploy   # aplica as migrations (em desenvolvimento: npx prisma migrate dev)
npx prisma generate         # gera o client em generated/prisma
npx prisma db seed          # cria as categorias (pode rodar mais de uma vez)
npm run dev                 # tsx watch src/server.ts
```

Checagens: `npx tsc --noEmit` (tipos) e `npm run lint` (ESLint).

Scripts úteis:

| Comando | O que faz |
|---------|-----------|
| `npm run lint` | ESLint (regras recomendadas do ESLint e do typescript-eslint, sem checagem por tipos) |
| `npm run check:ai` | Diagnóstico da IA (veja "IA (OpenRouter)" abaixo); `-- --cover` testa a capa SVG (pago) |
| `npm run seed:demo` / `npm run seed:demo:clean` | Cria / apaga os dados de demonstração (veja abaixo) |
| `npm run cleanup:uploads` | Lista arquivos órfãos em `uploads/`; com `-- --apply` apaga |
| `npx tsx scripts/backfill-embeddings.ts [--all]` | Gera embeddings que faltam (ou refaz todos) |

No Prisma 7 o seed é configurado em `prisma.config.ts` (`migrations.seed`) e **não** roda automaticamente após `migrate dev`: execute `npx prisma db seed` manualmente.

## Variáveis de ambiente (`.env`)

| Nome | Uso |
|------|-----|
| `DATABASE_URL` | Conexão com o PostgreSQL (Neon) |
| `JWT_SECRET` | Chave para assinar os tokens JWT (obrigatória para login/registro) |
| `PORT` | Porta do servidor (padrão 3001) |
| `CHAT_PROVIDER` | Provedor de texto (chatbot e IA do formulário): `openrouter` (padrão) ou `anthropic` |
| `COVER_PROVIDER` | Provedor da capa por IA: `openrouter` (padrão, imagem) ou `anthropic-svg` (ilustração SVG) |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic (Claude) |
| `ANTHROPIC_CHAT_MODEL` | Modelo de texto da Anthropic (padrão `claude-haiku-5-5`) |
| `ANTHROPIC_COVER_MODEL` | Modelo da capa SVG (padrão `claude-sonnet-5-5`) |
| `OPENROUTER_API_KEY` | Chave do OpenRouter (embeddings; chat e imagem quando esse for o provedor) |
| `OPENROUTER_CHAT_MODEL` | Modelo do chatbot (recomendado: `google/gemini-3.5-flash-lite`) |
| `OPENROUTER_EMBEDDING_MODEL` | Modelo de embeddings da busca semântica (recomendado: `baai/bge-m3`, 1024 dimensões) |
| `OPENROUTER_IMAGE_MODEL` | Modelo de geração de capas (recomendado: `recraft/recraft-v4.1-flash`) |
| `RESEND_API_KEY` | Chave da API do Resend (envio de e-mail). Sem ela, o link de recuperação só aparece no console (fora de produção) |
| `RESEND_FROM_EMAIL` | Remetente dos e-mails, ex.: `Crowdfunding <nao-responda@seudominio.com>` (domínio verificado no Resend) |
| `FRONTEND_URL` | URL do frontend usada nos links dos e-mails (padrão `http://localhost:3000`) |
| `BACKEND_URL` | Endereço público do backend, usado nas URLs das imagens enviadas (padrão `http://localhost:PORT`) |

## Estrutura de pastas

```
backend/
├── prisma/
│   ├── schema.prisma        # User, Category, Campaign, Donation, PasswordResetToken, AiImageGeneration
│   ├── migrations/          # histórico de migrations
│   └── seed.ts              # categorias iniciais
├── generated/prisma/        # Prisma Client gerado (não editar)
├── src/
│   ├── server.ts            # app Express, rotas e middleware de erro
│   ├── routes/              # definição das URLs
│   ├── controllers/         # leitura de req/res e validação (zod)
│   ├── services/            # regras de negócio, acesso ao Prisma e storage de arquivos
│   ├── middlewares/         # requireAuth, rate limit e tratamento de erros
│   ├── lib/                 # prisma, rede, jwt, dinheiro, paginação, HttpError, e-mail (Resend),
│   │                        # OpenRouter, tipo de imagem e limpeza de texto do chat
│   └── types/               # extensão de tipos do Express (req.userId)
├── uploads/                 # imagens enviadas (ignorada pelo git, exceto .gitkeep)
├── scripts/                 # check-ai.ts, backfill-embeddings.ts, seed-demo.ts e cleanup-orphan-uploads.ts
├── docs/requests.http       # requisições de teste (com equivalentes curl)
├── eslint.config.js         # configuração do ESLint (flat config)
└── prisma.config.ts         # configuração do CLI do Prisma (schema, migrations, seed)
```

## Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/` | — | Status da API |
| GET | `/health-db` | — | Testa a conexão com o banco |
| POST | `/auth/register` | — | Cria usuário; retorna `{ user, token }` (201). Senha de 8 a 72 caracteres. E-mail repetido: 409 |
| POST | `/auth/login` | — | Retorna `{ user, token }`. Credenciais inválidas: 401 |
| POST | `/auth/forgot-password` | — | Envia link de redefinição por e-mail. Sempre 200 com a mesma mensagem. Rate limit |
| POST | `/auth/reset-password` | — | `{ token, password }` (senha de 8 a 72 caracteres): troca a senha. Token inválido/expirado/usado: 400. Rate limit |
| GET | `/categories` | — | Lista categorias |
| GET | `/campaigns` | — | Lista campanhas. Query: `category` (id ou nome), `q` (título/descrição), `page`, `limit` (máx. 50) |
| GET | `/campaigns/search` | — | Busca semântica: `q` (obrigatório), `category`, `page`, `limit`. Itens com `similarity`; `mode` e `notice` (fallback para texto). Rate limit |
| GET | `/campaigns/:id` | — | Detalhe com `raisedAmount`, `donorsCount`, `progress`, `daysLeft` e `imageGeneratedByAi` |
| POST | `/campaigns/ai-cover` | Bearer | `{ title, description, categoryId? }` → `{ url }` (201). Capa gerada por IA. Limite diário e rate limit |
| POST | `/campaigns/ai-description` | Bearer | `{ title, description, category? }` → `{ description }` reescrita pela IA. Rate limit |
| POST | `/campaigns/ai-category` | Bearer | `{ title, description }` → `{ categoryId }` sugerido pela IA. Rate limit |
| POST | `/campaigns` | Bearer | Cria campanha (201) |
| PUT | `/campaigns/:id` | Bearer (dono) | Atualiza campos (inclusive `status`). 403 se não for o dono, 404 se não existir |
| DELETE | `/campaigns/:id` | Bearer (dono) | Exclui (204). 409 se já houver doações: encerre com `status: "FINISHED"` |
| POST | `/campaigns/:id/donations` | Bearer | Doação simulada (201). Campanha ACTIVE e no prazo; o dono não pode doar (403) |
| GET | `/campaigns/:id/donations` | — | Doações (nome do doador, valor, data), mais recentes primeiro, paginado |
| POST | `/chat` | opcional | `{ messages: [{ role, content }] }` → `{ reply }` (texto puro). Rate limit |
| POST | `/uploads/campaign-image` | Bearer | Multipart, campo `image` (JPEG/PNG/WebP, até 5 MB). Retorna `{ url }` (201) |
| GET | `/uploads/<arquivo>` | — | Arquivos enviados (estáticos) |
| GET | `/me/campaigns` | Bearer | Campanhas do usuário logado, paginado, com `raisedAmount`, `donorsCount`, `progress`, `status` e `daysLeft` |
| GET | `/me/donations` | Bearer | Doações feitas pelo usuário logado, paginado: `amount`, `message`, `createdAt` e `campaign { id, title }` |

Listas paginadas retornam `{ data: [...], meta: { page, limit, total, totalPages } }`.

## Convenções

- **Autenticação:** header `Authorization: Bearer <token>`. JWT válido por 7 dias, com `sub` = id do usuário e `ver` = `User.tokenVersion`. O middleware (`src/middlewares/auth.ts`) confere no banco se a versão do token é a atual; redefinir a senha incrementa a versão e invalida todos os tokens anteriores. `passwordHash` nunca é retornado.
- **Atenção na atualização:** tokens emitidos antes da migration `user_token_version` não têm `ver` e são recusados (401): **todos os usuários precisam entrar de novo** uma vez. O frontend trata esse 401 encerrando a sessão local e levando ao login.
- **Senha:** de 8 a 72 caracteres no cadastro e na redefinição (72 é o limite do bcrypt), com a mensagem "A senha deve ter de 8 a 72 caracteres."; o login não tem mínimo, então contas antigas com senha menor continuam entrando. O frontend repete a regra em `src/lib/password-rules.ts`.
- **Erros:** sempre `{ "error": "mensagem em português" }`. Validação inválida → 400.
- **Valores monetários:** armazenados como `Decimal(12,2)` e manipulados com `Prisma.Decimal` (nunca `number`). Na entrada, aceitam número ou string com até 2 casas decimais. Na saída, são **sempre strings com 2 casas** (ex.: `"150.50"`). `progress` é um número percentual com 2 casas e pode passar de 100.
- **Valor arrecadado:** não é coluna; é a soma das doações calculada a cada consulta. `donorsCount` conta doadores distintos.

## Recuperação de senha

1. `POST /auth/forgot-password` gera um token aleatório de 256 bits (`crypto.randomBytes`), guarda **só o SHA-256** em `PasswordResetToken` (validade de 30 min), apaga tokens anteriores ainda não usados do usuário e envia o link `FRONTEND_URL/reset-password?token=...` pelo Resend (`src/lib/mailer.ts`). O envio é feito em segundo plano: a resposta não espera o Resend, tem sempre o mesmo texto e não revela se o e-mail existe.
2. `POST /auth/reset-password` confere o hash do token (existe, não usado, não expirado), aplica as regras de senha do cadastro e, na mesma transação, marca `usedAt` (uso único, mesmo com requisições simultâneas), grava o novo hash bcrypt e incrementa `tokenVersion` (as sessões abertas com a senha antiga deixam de valer).
3. Rate limit (`src/middlewares/rate-limit.ts`, `express-rate-limit`): 10 pedidos a cada 15 min por IP (somando as duas rotas) e 3 por hora por e-mail no `forgot-password`. Os contadores ficam em memória (servidor único). Atrás de um proxy, ative `app.set('trust proxy', 1)` para o IP do cliente ser lido corretamente.

**Como testar o envio real:** crie uma conta no Resend, gere uma API key e preencha `RESEND_API_KEY` e `RESEND_FROM_EMAIL`. Sem domínio verificado, use `RESEND_FROM_EMAIL="Crowdfunding <onboarding@resend.dev>"`: nesse modo o Resend só entrega para o e-mail do dono da conta Resend, então cadastre um usuário com esse e-mail e peça a recuperação. **Sem Resend configurado:** o link aparece no console do servidor (apenas quando `NODE_ENV` não é `production`).

## Rede e conexão com o Neon

Dois ajustes para redes com latência alta:
- `src/lib/network.ts` aumenta o tempo por tentativa de conexão a cada IP de um host (`net.setDefaultAutoSelectFamilyAttemptTimeout`, de 250 ms para 2 s). É importado por `prisma.ts`, `openrouter.ts` e `mailer.ts`. Sem ele, parte das conexões com Neon e OpenRouter falhava com `ETIMEDOUT`.
- `src/lib/prisma.ts` aumenta o `maxWait` das transações de 2 s para 10 s. Sem isso, as rotas com `$transaction` respondiam 500 (P2028) quando precisavam abrir uma conexão nova com o Neon.

## Upload de imagens

- `src/services/storage.service.ts` define a interface `Storage` (`save`, `getPublicUrl`). A implementação atual (`DiskStorage`) grava em `backend/uploads/` com nome aleatório (UUID) e o Express serve a pasta em `/uploads` (com `X-Content-Type-Options: nosniff`). Em produção, com mais de um servidor ou disco efêmero, troque por uma implementação com S3, Cloudinary ou similar; o resto do código não muda.
- `src/middlewares/upload.ts` usa o `multer` em memória (limite de 5 MB, um arquivo). O tipo é decidido pelos primeiros bytes do arquivo (`src/lib/image-type.ts`), não pela extensão nem pelo Content-Type enviado.
- `imageUrl` da campanha aceita a URL devolvida pelo upload ou qualquer URL `http(s)` externa. Na edição, `imageUrl: null` remove a imagem.
- **Limpeza de órfãos:** imagens enviadas (ou capas geradas) e não usadas ficam na pasta. `npm run cleanup:uploads` lista os arquivos que nenhuma campanha (`imageUrl`) nem registro de geração de IA (`AiImageGeneration.url`) referencia e que têm mais de 24 h (um upload recente pode estar num formulário ainda não enviado); só com `-- --apply` eles são apagados. O `.gitkeep` nunca é apagado. Não roda sozinho: agende (ex.: cron) se precisar.

## IA: provedores

| Recurso | Provedor | Arquivo |
|---------|----------|---------|
| Texto (chatbot e IA do formulário) | `CHAT_PROVIDER`: `openrouter` ou `anthropic` | `src/lib/llm.ts` escolhe entre `openrouter.chat()` e `anthropic.chat()` |
| Capa | `COVER_PROVIDER`: `openrouter` (imagem) ou `anthropic-svg` | `src/services/ai-cover.service.ts` |
| Embeddings / busca semântica | sempre OpenRouter | `src/lib/openrouter.ts` |

- **Para alternar**, mude a variável no `.env` e reinicie o servidor (o `tsx watch` só reinicia sozinho quando o código muda).
- `src/lib/ai-types.ts` define o contrato comum: `ChatMessage`, `ChatOptions` e o erro `AiError` (`kind`: `not_configured`, `invalid_key`, `no_credits`, `rate_limited`, `timeout`, `unavailable`, `rejected`, `bad_response`). `OpenRouterError` e `AnthropicError` estendem `AiError`; os serviços tratam só `AiError` e mostram mensagens amigáveis.
- `src/lib/anthropic.ts` usa o SDK oficial `@anthropic-ai/sdk` (única dependência nova: dá erros tipados e o cliente suportado pela Anthropic). Chat com `ANTHROPIC_CHAT_MODEL` (padrão `claude-haiku-5-5`), timeout de 30 s, `effort: "low"` (respostas curtas e baratas) e sem `temperature` (o Claude Haiku 5.5 recusa valores fora do padrão). O Haiku 5.5 faz raciocínio interno ("thinking") que conta em `max_tokens`, por isso o limite é a cota da resposta + 2000 tokens. A retentativa automática do SDK fica desligada; `withRetry()` faz uma nova tentativa após 800 ms para limite de uso, indisponibilidade e rede (timeout não é repetido), igual ao OpenRouter.

## IA (OpenRouter)

`src/lib/openrouter.ts` é o único ponto de contato com o OpenRouter (`fetch`, base `https://openrouter.ai/api/v1`):

| Função | Endpoint | Timeout |
|--------|----------|---------|
| `chat(messages)` | `POST /chat/completions` | 30 s |
| `embed(textos)` | `POST /embeddings` | 15 s |
| `generateImage(prompt)` | `POST /images` (Image API; resposta em base64) | 90 s |

- Envia os cabeçalhos opcionais de identificação recomendados (`HTTP-Referer`, `X-OpenRouter-Title`).
- Uma nova tentativa após 800 ms para 429, 502, 503 e falha de rede. Timeout não é repetido (na imagem, poderia cobrar duas vezes).
- Erros viram `OpenRouterError` com `kind`: `not_configured`, `timeout`, `rate_limited`, `no_credits`, `unavailable`, `rejected`, `bad_response`. Também trata o caso de resposta 200 com objeto `error` (falha no meio da geração).
- Sem chave ou modelo, as funções lançam `not_configured`; quem chama decide o que fazer (nenhum recurso de IA derruba o servidor).

**Limites de uso** (`src/middlewares/rate-limit.ts` e `src/services/ai-usage.service.ts`):
- Curto prazo (em memória, por usuário ou IP): chat 15/min, busca inteligente 30/min, geração de capa 3 a cada 10 min, IA do formulário (descrição + categoria) 10 a cada 10 min.
- Diário de imagens: 5 capas por usuário a cada 24 h (janela móvel), contadas na tabela `AiImageGeneration`. Tabela em vez de contador em memória porque sobrevive a reinícios do servidor, funciona com mais de uma instância e serve de histórico. A geração é reservada antes de chamar a IA e a reserva é devolvida se a chamada falhar.

**Diagnóstico:** `npm run check:ai` (ou `npx tsx scripts/check-ai.ts`) mostra os provedores escolhidos, confere as variáveis (sem mostrar valores) e testa o chat (pelo provedor ativo) e os embeddings; com `--image` testa a imagem do OpenRouter (cerca de US$ 0,007) e com `--cover` a capa SVG da Anthropic (cerca de US$ 0,05 a 0,15; o arquivo vai para a pasta temporária do sistema).

## Busca semântica (pgvector)

- **Banco:** a migration `pgvector_campaign_embedding` habilita a extensão (`CREATE EXTENSION IF NOT EXISTS vector`, disponível em todos os planos do Neon), adiciona `Campaign.embedding vector(1024)` (no schema: `Unsupported("vector(1024)")`, lido e gravado com SQL bruto) e cria um índice **HNSW** com `vector_cosine_ops`. HNSW em vez de IVFFlat: pode ser criado com a tabela vazia (o IVFFlat precisa de dados para treinar as listas) e tem melhor relação velocidade/recall; ambos aceitam até 2000 dimensões.
- **Atenção nas próximas migrations:** o Prisma não suporta índices HNSW no schema e por isso tenta apagá-lo. Crie migrations com `npx prisma migrate dev --create-only --name <nome>`, remova do SQL gerado a linha `DROP INDEX "Campaign_embedding_hnsw_idx"` (se aparecer) e só então rode `npx prisma migrate dev`.
- **Geração:** ao criar uma campanha, ou ao editar título, descrição ou categoria, `src/services/embedding.service.ts` gera em segundo plano o embedding de "título + descrição + categoria" (a resposta não espera; uma falha só gera log). Para campanhas sem embedding: `npx tsx scripts/backfill-embeddings.ts` (com `--all` refaz todas).
- **Busca:** `GET /campaigns/search` (`src/services/search.service.ts`) gera o embedding da consulta e ordena pela distância de cosseno (`<=>`, similaridade = 1 − distância). Só entram resultados com similaridade ≥ `MIN_SIMILARITY` (0,45, calibrado com o `bge-m3`: nos testes, os resultados relevantes ficaram entre 0,45 e 0,61 e os sem relação até cerca de 0,41). Consultas de uma só palavra (ex.: "música") tendem a ficar abaixo do piso. Se a IA falhar, a rota usa a busca textual de `GET /campaigns`.
- **Trocar de modelo de embeddings** exige uma migration com a nova dimensão, ajustar `EMBEDDING_DIMENSIONS`, rodar o backfill com `--all` e recalibrar `MIN_SIMILARITY`.
- O Prisma CLI pode travar ou dar P1001 com o Neon nesta rede; se acontecer, rode com `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000` e confira o resultado com `npx prisma migrate status`.

## Capa gerada por IA

- `POST /campaigns/ai-cover` (`src/services/ai-cover.service.ts`) escolhe o provedor por `COVER_PROVIDER`. Com `openrouter` (padrão), o **backend** monta o prompt, fixo e em inglês (os modelos de imagem seguem melhor instruções em inglês): ilustração plana e colorida, 16:9, sem texto, letras, logos ou marcas d'água, sem pessoas reais. Título, descrição (até 600 caracteres) e categoria entram só como contexto.
- Fluxo: reserva no limite diário → `generateImage` → confere pelos bytes que é JPEG/PNG/WebP → salva pelo `storage.service` (mesma pasta dos uploads) → grava a URL na reserva → devolve `{ url }`. Se algo falhar, a reserva é desfeita (não consome o limite) e o usuário recebe uma mensagem amigável (detalhes técnicos só no log).
- **Capa em SVG (`COVER_PROVIDER=anthropic-svg`)** — `src/services/svg-cover.service.ts`: prompt fixo pedindo um único `<svg>` com `viewBox="0 0 1200 675"`, ilustração plana e geométrica com paleta coerente com o tema, sem texto, sem pessoas reais, sem imagens externas, sem scripts, e resposta só com o código. Usa `ANTHROPIC_COVER_MODEL` (padrão `claude-sonnet-5-5`) por streaming, `max_tokens` 32000 (inclui o raciocínio interno do modelo), `effort: "medium"`, prazo de 150 s e `fallbacks: "default"` (se o modelo recusar por regra de segurança, a API tenta outro modelo). O código é separado do texto em volta (`extractSvg`) e sanitizado; se vier inválido, há uma nova tentativa e depois uma mensagem amigável, com a cota devolvida.
- **Sanitização** (`src/lib/svg-sanitize.ts`): o SVG é lido por um tokenizador estrito e **reconstruído** só com elementos de desenho (`svg, g, path, rect, circle, ellipse, line, polyline, polygon, defs, linearGradient, radialGradient, stop, clipPath, mask`) e atributos permitidos. Somem: `script`, `foreignObject`, `image`, `use`, `style`, `text`, `a`, `animate`, atributos `on*`, `href` que não seja `#id`, `url()` que não seja `url(#id)`, `javascript:`, `data:` e comentários. Rejeitam o arquivo: DOCTYPE/entidades/CDATA, tags que não fecham, texto solto, SVG sem desenho e mais de 200 KB. Valores com `&`, `<`, `>` ou aspas são descartados (sem entidades).
- **Entrega**: salvo pelo `storage.service` como `<uuid>.svg`. Em `/uploads/*.svg` o servidor envia `Content-Type: image/svg+xml`, `X-Content-Type-Options: nosniff` e `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`. O frontend exibe sempre com `<img>` (o navegador não executa scripts de SVG carregado assim).
- **Upload manual continua só JPEG/PNG/WebP**: SVG enviado por usuário é recusado (o tipo é detectado pelos bytes). Em `imageUrl`, uma URL `.svg` só é aceita se for um arquivo deste servidor.
- `Campaign.imageGeneratedByAi` é calculado pelo backend ao criar ou editar a imagem: é `true` só se a `imageUrl` estiver registrada em `AiImageGeneration`. O cliente não consegue marcar uma imagem qualquer como gerada por IA.

## Chatbot de suporte

- `POST /chat` (`src/services/chat.service.ts`) usa a camada `src/lib/llm.ts`: Claude Haiku 5.5 com `CHAT_PROVIDER=anthropic`, ou `OPENROUTER_CHAT_MODEL` (Gemini Flash-Lite) com `openrouter`. Login opcional (`optionalAuth`): com token, o rate limit conta por usuário; sem token, por IP.
- Entrada validada no controller: só `user`/`assistant` (o cliente não injeta mensagens `system`), última mensagem do usuário, até 1000 caracteres por mensagem e 50 no histórico; o serviço envia ao modelo só as 10 mais recentes.
- **System prompt fixo** no backend: explica como criar conta e campanha, doar e recuperar senha, e as regras (doação simulada, dono não doa na própria campanha, campanha encerrada não recebe doações). Manda responder em português, curto e cordial, sem inventar fatos e sem revelar dados de usuários, e lista as categorias reais do banco.
- **Sem markdown:** o prompt exige texto puro (enumerações com "1)", "2)"). Como rede de segurança, `src/lib/plain-text.ts` remove negrito, itálico, títulos, blocos de código, marcadores, tabelas e links markdown antes de devolver a resposta.
- **Contexto:** antes de responder, a busca semântica traz até 3 campanhas relacionadas à última pergunta (nome, categoria, situação e resumo de 160 caracteres), que o modelo pode citar. Se a busca falhar, o chat responde sem esse contexto.
- Falha da IA → 503 com mensagem amigável; o detalhe vai só para o log.

## IA no formulário de campanha

Ambas usam a camada de texto `src/lib/llm.ts` (Claude Haiku 5.5 com `CHAT_PROVIDER=anthropic`) e o limitador `aiTextLimiter`. Falhas viram mensagens amigáveis por `src/lib/ai-http-error.ts`.

- **Melhorar descrição** — `POST /campaigns/ai-description` (`src/services/ai-description.service.ts`): prompt fixo manda reescrever em português, mais clara, honesta e envolvente, **sem inventar** fatos, números, nomes ou promessas, mantendo sentido e tamanho parecido, em texto puro. O texto do usuário vai entre marcadores `<descricao>` e o prompt manda ignorar instruções dentro dele. A resposta passa por `toPlainText()` e precisa ter entre 10 e 5000 caracteres. O frontend mostra a sugestão lado a lado com o texto original e só aplica com "Usar este texto".
- **Sugerir categoria** — `POST /campaigns/ai-category` (`src/services/ai-category.service.ts`): as categorias vêm do banco (`id = nome`) e o modelo responde só com o número; o backend confere se o id existe antes de devolver `{ categoryId }`.

## Dados de demonstração

`npm run seed:demo` (`scripts/seed-demo.ts`, opcional) cria 2 usuários e 5 campanhas claramente fictícias (títulos começam com `[Demo]`), com prazos no futuro, nas categorias do seed principal, e algumas doações de exemplo (sempre do outro usuário: o dono não doa na própria campanha). É idempotente: rodar de novo atualiza os mesmos registros, refaz as doações de exemplo e empurra os prazos para o futuro, sem duplicar.

| E-mail | Senha |
|--------|-------|
| `ana.demo@example.com` | `demo1234` |
| `bruno.demo@example.com` | `demo1234` |

- Se os embeddings do OpenRouter estiverem configurados, gera os embeddings das campanhas (para a busca inteligente); se não, só avisa.
- `npm run seed:demo:clean` apaga só o que o script cria: os dois usuários, as campanhas deles com as doações recebidas (sem elas a campanha não pode ser apagada) e as doações que eles fizeram. Tokens de senha e registros de geração de IA saem em cascata.
- Requer as categorias: rode antes `npx prisma db seed`.

## Lint

`npm run lint` roda o ESLint 10 com `eslint.config.js`: regras recomendadas do ESLint e do `typescript-eslint` (sem checagem por tipos, para ser rápido e simples) e variáveis com `_` no começo marcadas como ignoradas de propósito. Estado atual: 0 erros e 0 avisos.

O backend usa **TypeScript 6.0**: o `typescript-eslint` ainda não suporta o TypeScript 7 (a versão nativa em Go não tem a API JavaScript que o parser usa). O 7.0 é um port do 6.0 com o mesmo sistema de tipos; quando o `typescript-eslint` suportar o 7, basta atualizar.
