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

Checagem de tipos: `npx tsc --noEmit`.

No Prisma 7 o seed é configurado em `prisma.config.ts` (`migrations.seed`) e **não** roda automaticamente após `migrate dev`: execute `npx prisma db seed` manualmente.

## Variáveis de ambiente (`.env`)

| Nome | Uso |
|------|-----|
| `DATABASE_URL` | Conexão com o PostgreSQL (Neon) |
| `JWT_SECRET` | Chave para assinar os tokens JWT (obrigatória para login/registro) |
| `PORT` | Porta do servidor (padrão 3001) |
| `OPENROUTER_API_KEY` | Chave do OpenRouter (recursos de IA) |
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
├── scripts/                 # check-ai.ts (diagnóstico da IA) e backfill-embeddings.ts
├── docs/requests.http       # requisições de teste (com equivalentes curl)
└── prisma.config.ts         # configuração do CLI do Prisma (schema, migrations, seed)
```

## Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/` | — | Status da API |
| GET | `/health-db` | — | Testa a conexão com o banco |
| POST | `/auth/register` | — | Cria usuário; retorna `{ user, token }` (201). E-mail repetido: 409 |
| POST | `/auth/login` | — | Retorna `{ user, token }`. Credenciais inválidas: 401 |
| POST | `/auth/forgot-password` | — | Envia link de redefinição por e-mail. Sempre 200 com a mesma mensagem. Rate limit |
| POST | `/auth/reset-password` | — | `{ token, password }`: troca a senha. Token inválido/expirado/usado: 400. Rate limit |
| GET | `/categories` | — | Lista categorias |
| GET | `/campaigns` | — | Lista campanhas. Query: `category` (id ou nome), `q` (título/descrição), `page`, `limit` (máx. 50) |
| GET | `/campaigns/search` | — | Busca semântica: `q` (obrigatório), `category`, `page`, `limit`. Itens com `similarity`; `mode` e `notice` (fallback para texto). Rate limit |
| GET | `/campaigns/:id` | — | Detalhe com `raisedAmount`, `donorsCount`, `progress`, `daysLeft` e `imageGeneratedByAi` |
| POST | `/campaigns/ai-cover` | Bearer | `{ title, description, categoryId? }` → `{ url }` (201). Capa gerada por IA. Limite diário e rate limit |
| POST | `/campaigns` | Bearer | Cria campanha (201) |
| PUT | `/campaigns/:id` | Bearer (dono) | Atualiza campos (inclusive `status`). 403 se não for o dono, 404 se não existir |
| DELETE | `/campaigns/:id` | Bearer (dono) | Exclui (204). 409 se já houver doações: encerre com `status: "FINISHED"` |
| POST | `/campaigns/:id/donations` | Bearer | Doação simulada (201). Campanha ACTIVE e no prazo; o dono não pode doar (403) |
| GET | `/campaigns/:id/donations` | — | Doações (nome do doador, valor, data), mais recentes primeiro, paginado |
| POST | `/chat` | opcional | `{ messages: [{ role, content }] }` → `{ reply }` (texto puro). Rate limit |
| POST | `/uploads/campaign-image` | Bearer | Multipart, campo `image` (JPEG/PNG/WebP, até 5 MB). Retorna `{ url }` (201) |
| GET | `/uploads/<arquivo>` | — | Arquivos enviados (estáticos) |

Listas paginadas retornam `{ data: [...], meta: { page, limit, total, totalPages } }`.

## Convenções

- **Autenticação:** header `Authorization: Bearer <token>`. JWT válido por 7 dias, com `sub` = id do usuário. `passwordHash` nunca é retornado.
- **Erros:** sempre `{ "error": "mensagem em português" }`. Validação inválida → 400.
- **Valores monetários:** armazenados como `Decimal(12,2)` e manipulados com `Prisma.Decimal` (nunca `number`). Na entrada, aceitam número ou string com até 2 casas decimais. Na saída, são **sempre strings com 2 casas** (ex.: `"150.50"`). `progress` é um número percentual com 2 casas e pode passar de 100.
- **Valor arrecadado:** não é coluna; é a soma das doações calculada a cada consulta. `donorsCount` conta doadores distintos.

## Recuperação de senha

1. `POST /auth/forgot-password` gera um token aleatório de 256 bits (`crypto.randomBytes`), guarda **só o SHA-256** em `PasswordResetToken` (validade de 30 min), apaga tokens anteriores ainda não usados do usuário e envia o link `FRONTEND_URL/reset-password?token=...` pelo Resend (`src/lib/mailer.ts`). O envio é feito em segundo plano: a resposta não espera o Resend, tem sempre o mesmo texto e não revela se o e-mail existe.
2. `POST /auth/reset-password` confere o hash do token (existe, não usado, não expirado), aplica as regras de senha do cadastro, grava o novo hash bcrypt e marca `usedAt` na mesma transação (uso único, mesmo com requisições simultâneas).
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
- Limitação conhecida: imagens enviadas e não usadas em nenhuma campanha ficam na pasta (não há limpeza automática).

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
- Por minuto (em memória, por usuário ou IP): chat 15/min, busca inteligente 30/min, geração de capa 3 a cada 10 min.
- Diário de imagens: 5 capas por usuário a cada 24 h (janela móvel), contadas na tabela `AiImageGeneration`. Tabela em vez de contador em memória porque sobrevive a reinícios do servidor, funciona com mais de uma instância e serve de histórico. A geração é reservada antes de chamar a IA e a reserva é devolvida se a chamada falhar.

**Diagnóstico:** `npx tsx scripts/check-ai.ts` confere as variáveis (sem mostrar valores) e testa chat e embeddings; com `--image` testa também a geração de imagem (custa cerca de US$ 0,007).

## Busca semântica (pgvector)

- **Banco:** a migration `pgvector_campaign_embedding` habilita a extensão (`CREATE EXTENSION IF NOT EXISTS vector`, disponível em todos os planos do Neon), adiciona `Campaign.embedding vector(1024)` (no schema: `Unsupported("vector(1024)")`, lido e gravado com SQL bruto) e cria um índice **HNSW** com `vector_cosine_ops`. HNSW em vez de IVFFlat: pode ser criado com a tabela vazia (o IVFFlat precisa de dados para treinar as listas) e tem melhor relação velocidade/recall; ambos aceitam até 2000 dimensões.
- **Atenção nas próximas migrations:** o Prisma não suporta índices HNSW no schema e por isso tenta apagá-lo. Crie migrations com `npx prisma migrate dev --create-only --name <nome>`, remova do SQL gerado a linha `DROP INDEX "Campaign_embedding_hnsw_idx"` (se aparecer) e só então rode `npx prisma migrate dev`.
- **Geração:** ao criar uma campanha, ou ao editar título, descrição ou categoria, `src/services/embedding.service.ts` gera em segundo plano o embedding de "título + descrição + categoria" (a resposta não espera; uma falha só gera log). Para campanhas sem embedding: `npx tsx scripts/backfill-embeddings.ts` (com `--all` refaz todas).
- **Busca:** `GET /campaigns/search` (`src/services/search.service.ts`) gera o embedding da consulta e ordena pela distância de cosseno (`<=>`, similaridade = 1 − distância). Só entram resultados com similaridade ≥ `MIN_SIMILARITY` (0,45, calibrado com o `bge-m3`: nos testes, os resultados relevantes ficaram entre 0,45 e 0,61 e os sem relação até cerca de 0,41). Consultas de uma só palavra (ex.: "música") tendem a ficar abaixo do piso. Se a IA falhar, a rota usa a busca textual de `GET /campaigns`.
- **Trocar de modelo de embeddings** exige uma migration com a nova dimensão, ajustar `EMBEDDING_DIMENSIONS`, rodar o backfill com `--all` e recalibrar `MIN_SIMILARITY`.
- O Prisma CLI pode travar ou dar P1001 com o Neon nesta rede; se acontecer, rode com `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000` e confira o resultado com `npx prisma migrate status`.

## Capa gerada por IA

- `POST /campaigns/ai-cover` (`src/services/ai-cover.service.ts`): o **backend** monta o prompt, fixo e em inglês (os modelos de imagem seguem melhor instruções em inglês): ilustração plana e colorida, 16:9, sem texto, letras, logos ou marcas d'água, sem pessoas reais. Título, descrição (até 600 caracteres) e categoria entram só como contexto.
- Fluxo: reserva no limite diário → `generateImage` → confere pelos bytes que é JPEG/PNG/WebP → salva pelo `storage.service` (mesma pasta dos uploads) → grava a URL na reserva → devolve `{ url }`. Se algo falhar, a reserva é desfeita (não consome o limite) e o usuário recebe uma mensagem amigável (detalhes técnicos só no log).
- `Campaign.imageGeneratedByAi` é calculado pelo backend ao criar ou editar a imagem: é `true` só se a `imageUrl` estiver registrada em `AiImageGeneration`. O cliente não consegue marcar uma imagem qualquer como gerada por IA.

## Chatbot de suporte

- `POST /chat` (`src/services/chat.service.ts`) usa `OPENROUTER_CHAT_MODEL` (Gemini Flash-Lite). Login opcional (`optionalAuth`): com token, o rate limit conta por usuário; sem token, por IP.
- Entrada validada no controller: só `user`/`assistant` (o cliente não injeta mensagens `system`), última mensagem do usuário, até 1000 caracteres por mensagem e 50 no histórico; o serviço envia ao modelo só as 10 mais recentes.
- **System prompt fixo** no backend: explica como criar conta e campanha, doar e recuperar senha, e as regras (doação simulada, dono não doa na própria campanha, campanha encerrada não recebe doações). Manda responder em português, curto e cordial, sem inventar fatos e sem revelar dados de usuários, e lista as categorias reais do banco.
- **Sem markdown:** o prompt exige texto puro (enumerações com "1)", "2)"). Como rede de segurança, `src/lib/plain-text.ts` remove negrito, itálico, títulos, blocos de código, marcadores, tabelas e links markdown antes de devolver a resposta.
- **Contexto:** antes de responder, a busca semântica traz até 3 campanhas relacionadas à última pergunta (nome, categoria, situação e resumo de 160 caracteres), que o modelo pode citar. Se a busca falhar, o chat responde sem esse contexto.
- Falha da IA → 503 com mensagem amigável; o detalhe vai só para o log.
