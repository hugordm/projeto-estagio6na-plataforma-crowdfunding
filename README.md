# Plataforma de Crowdfunding com IA

Plataforma web de "vaquinhas" online. Qualquer pessoa cria uma conta, abre uma campanha de arrecadação (título, descrição, meta em reais, prazo, categoria e capa) e outras pessoas apoiam com doações. Recursos de inteligência artificial (Claude, da Anthropic) ajudam a escrever a descrição, sugerem a categoria, desenham uma capa ilustrada e respondem dúvidas num chat de suporte.

**As doações são simuladas:** nenhum pagamento é feito. A doação é só um registro no banco, para demonstrar o fluxo completo (meta, progresso, doadores e prazo).

Público: quem quer organizar uma arrecadação simples (causas sociais, saúde, educação, projetos) e quem quer apoiar. Projeto acadêmico da disciplina Estágio Supervisionado I (seção 15).

O repositório tem duas aplicações independentes:

- [`backend/`](backend/README.md): API REST em Node.js, Express 5 e TypeScript, com Prisma 7 e PostgreSQL (Neon).
- [`frontend/`](frontend/README.md): site em Next.js (App Router), React, TypeScript e Tailwind CSS.

Exemplos de requisições prontas: [`backend/docs/requests.http`](backend/docs/requests.http).

---

## Sumário

1. [Produção](#1-produção)
2. [Funcionalidades](#2-funcionalidades)
3. [Stack e motivos das escolhas](#3-stack-e-motivos-das-escolhas)
4. [Arquitetura](#4-arquitetura)
5. [Estrutura de pastas e arquivos](#5-estrutura-de-pastas-e-arquivos)
6. [Modelo de dados](#6-modelo-de-dados)
7. [API](#7-api)
8. [Decisões técnicas](#8-decisões-técnicas)
9. [Variáveis de ambiente](#9-variáveis-de-ambiente)
10. [Como rodar](#10-como-rodar)
11. [Deploy](#11-deploy)
12. [Roteiro de demonstração](#12-roteiro-de-demonstração)
13. [Limitações e próximos passos](#13-limitações-e-próximos-passos)
14. [Segurança (resumo)](#14-segurança-resumo)
15. [Autor e contexto acadêmico](#15-autor-e-contexto-acadêmico)

---

## 1. Produção

| Parte | Endereço |
|-------|----------|
| Site (Vercel) | https://crowdfunding-plataforma.vercel.app |
| API (Render) | https://crowdfunding-api-pcri.onrender.com |
| Documentação da API | https://crowdfunding-api-pcri.onrender.com/docs (protegida por usuário e senha HTTP Basic, definidos nas variáveis `DOCS_USER` e `DOCS_PASSWORD` do Render; não ficam no repositório) |

> **Antes de apresentar:** o plano gratuito do Render "dorme" depois de um tempo sem acessos e o banco do Neon também suspende. A primeira requisição pode levar de 30 s a 1 min. Abra a API (`/`) e depois o site alguns minutos antes, e recarregue até as campanhas aparecerem.

---

## 2. Funcionalidades

| Funcionalidade | Como funciona |
|----------------|---------------|
| Cadastro e login | Nome, e-mail e senha (8 a 72 caracteres). O login devolve um token JWT válido por 7 dias. Campo de senha com botão para mostrar/ocultar. |
| Recuperação de senha | "Esqueci minha senha" envia por e-mail (Resend) um link válido por 30 minutos e de uso único. Ao redefinir, todas as sessões abertas são encerradas. |
| Campanhas | Criar, ver, editar, encerrar e excluir (só o dono). Campanha que já recebeu doações não pode ser excluída, só encerrada. Formulário com validação por campo, máscara de dinheiro, calendário próprio, atalhos de prazo (30/60/90 dias), aviso de alterações não salvas e pré-visualização do card. |
| Busca e filtro | Na página inicial: busca por texto (título e descrição), filtro por categoria e paginação. |
| Doações (simuladas) | Valor e mensagem opcional. O dono não doa na própria campanha; campanha encerrada ou com prazo vencido não recebe doações. A meta pode ser ultrapassada. |
| Progresso e doadores | Valor arrecadado, percentual da meta, número de doadores e lista paginada (nome, valor, mensagem, data). |
| Prazos | Dias restantes em dias de calendário no horário de Brasília ("30 dias restantes", "1 dia restante", "Último dia", "Prazo encerrado"). O prazo pode ser hoje; a campanha recebe doações até 23:59:59 do dia do prazo. |
| Minha conta | Abas "Minhas campanhas" (ver, editar, encerrar) e "Minhas doações". |
| Compartilhar | Menu nativo do sistema (Web Share API) ou cópia do link; a página da campanha tem título e descrição próprios para quem recebe o link. |
| Upload de capa | JPEG, PNG ou WebP até 5 MB, por clique ou arrastar e soltar, ou URL de imagem externa. Exibida sempre inteira em 16:9, com a própria imagem desfocada preenchendo as sobras. Guardada em disco local ou no Cloudinary. |
| Capa por IA (SVG) | O Claude Sonnet desenha uma ilustração vetorial a partir do título, da descrição e da categoria; o SVG é sanitizado antes de ser salvo. Selo "Capa gerada por IA". Limite de 5 por usuário a cada 24 h e 3 a cada 10 min. |
| Descrição com IA | "Melhorar descrição com IA" reescreve o texto com mais clareza, sem inventar fatos; a pessoa compara e só aplica se quiser. |
| Categoria com IA | "Sugerir categoria" escolhe uma das categorias cadastradas a partir do título e da descrição. |
| Chat de suporte (IA) | Botão flutuante em todas as páginas. Responde em texto puro sobre o uso da plataforma e cita até 3 campanhas ativas relacionadas à pergunta. Funciona com ou sem login. |

Os recursos de IA só aparecem no site quando estão configurados no servidor (`GET /config/features`). Sem a chave da Anthropic, o site funciona normalmente, só sem esses botões.

---

## 3. Stack e motivos das escolhas

Versões conforme os `package.json`.

| Camada | Tecnologia | Por que foi escolhida |
|--------|------------|------------------------|
| Frontend | **Next.js 16 (App Router)** | Roteamento por pastas, layouts e metadados por página (título/descrição da campanha para compartilhamento), build de produção otimizado e deploy direto na Vercel. |
| Frontend | **React 19 + TypeScript** | Componentes reaproveitáveis (o mesmo card na listagem e na pré-visualização) e tipos compartilhados com o formato da API (`src/types/`). |
| Frontend | **Tailwind CSS 4** | Estilo direto nas classes, sem arquivos CSS por componente; classes repetidas centralizadas em `globals.css`. |
| Backend | **Express 5 (ESM) + TypeScript** | Framework HTTP simples e conhecido; o Express 5 repassa ao middleware de erro os erros lançados em funções `async`, sem `try/catch` em cada rota. |
| Banco | **Prisma 7 + PostgreSQL no Neon** | Prisma dá consultas tipadas e migrations versionadas; o Neon oferece Postgres gerenciado com plano gratuito. O Prisma 7 usa o driver `pg` via `@prisma/adapter-pg`. |
| Validação | **zod 4** | Um schema por entrada valida, converte (ex.: dinheiro para `Decimal`) e gera mensagens em português. Os mesmos schemas geram a documentação OpenAPI (`z.toJSONSchema`). |
| Autenticação | **JWT (jsonwebtoken)** | Sessão sem estado no servidor, simples de enviar pelo frontend (`Authorization: Bearer`). |
| Senhas | **bcryptjs** | Hash de senha com custo ajustável (10), em JavaScript puro, sem compilação nativa (funciona igual no Docker e no Render). |
| IA | **Anthropic: Claude Haiku 5.5 e Sonnet 5.5** (`@anthropic-ai/sdk`) | Haiku (`claude-haiku-5-5`) é rápido e barato para chat, descrição e categoria; Sonnet (`claude-sonnet-5-5`) desenha a capa SVG, que exige mais capacidade. |
| Imagens | **Cloudinary** | O disco do Render é efêmero (apagado a cada deploy); o Cloudinary guarda as capas e entrega por CDN. Em desenvolvimento, as imagens podem ficar em `backend/uploads/`. |
| E-mail | **Resend** | API HTTP simples para o e-mail de recuperação de senha, chamada com `fetch` (sem SDK). |
| Containers | **Docker + docker-compose** | Mesmo ambiente em qualquer máquina; o backend roda no Render a partir do mesmo `backend/Dockerfile`. |
| Hospedagem da API | **Render** (Docker, plano Free) | Roda o container do backend com HTTPS e health check, sem custo. |
| Hospedagem do site | **Vercel** | Plataforma feita para Next.js: build e deploy automáticos a cada push. |
| Ferramentas | tsx, esbuild, ESLint, swagger-ui-express | `tsx` executa TypeScript no desenvolvimento; `esbuild` empacota o backend em `dist/server.js`; ESLint nos dois projetos; Swagger UI em `/docs`. |

---

## 4. Arquitetura

### 4.1 Topologia em produção

```mermaid
flowchart LR
    U[Navegador] -->|HTML, JS| V[Vercel<br/>Next.js]
    U -->|"fetch JSON (CORS)"| R[Render<br/>API Express em Docker]
    V -->|generateMetadata da campanha| R
    R -->|Prisma + pg| N[(Neon<br/>PostgreSQL)]
    R -->|upload / exclusão de imagens| C[Cloudinary]
    U -->|carrega as capas| C
    R -->|chat, descrição, categoria, capa SVG| A[Anthropic<br/>Claude]
    R -->|e-mail de recuperação| E[Resend]
```

O navegador baixa o site da Vercel e chama a API do Render diretamente (o CORS só libera a origem configurada em `FRONTEND_URL`). O servidor do Next também consulta a API para montar o título e a descrição da página da campanha. Só o backend conhece as chaves de Neon, Cloudinary, Anthropic e Resend.

### 4.2 Caminho de uma requisição

Exemplo: a página de uma campanha registra uma doação.

```mermaid
sequenceDiagram
    participant P as Página<br/>app/campaigns/[id]/page.tsx<br/>(DonationForm)
    participant L as lib/api.ts
    participant RT as routes/campaign.routes.ts
    participant C as controllers/donation.controller.ts
    participant S as services/donation.service.ts
    participant PR as lib/prisma.ts (Prisma Client)
    participant DB as PostgreSQL (Neon)
    P->>L: createDonation(id, { amount, message })
    L->>RT: POST /campaigns/:id/donations + Bearer token
    RT->>RT: requireAuth (JWT + tokenVersion)
    RT->>C: create(req, res)
    C->>C: valida com zod (amount, message)
    C->>S: createDonation(campaignId, userId, data)
    S->>PR: busca campanha, aplica regras, cria doação
    PR->>DB: SELECT / INSERT
    DB-->>PR: linhas
    S-->>C: doação (amount como string)
    C-->>L: 201 JSON
    L-->>P: dados ou ApiError { error }
```

Em todas as rotas a divisão é a mesma: a **rota** define caminho e middlewares (login, rate limit, upload); o **controller** valida a entrada com zod e escolhe o status HTTP; o **service** contém a regra de negócio e o acesso ao banco. Qualquer erro lançado vira `{ error: "mensagem" }` no middleware `errorHandler`.

---

## 5. Estrutura de pastas e arquivos

Só os arquivos versionados. Pastas geradas (`node_modules/`, `backend/generated/`, `backend/dist/`, `frontend/.next/`) e arquivos `.env` ficam fora do git.

```text
crowdfunding-plataforma/
├── README.md                     Este documento (visão geral).
├── .env.example                  Modelo do .env da raiz: só portas, URLs públicas e UID usados pelo docker-compose.
├── .gitignore                    Ignora node_modules, .env, .env.local e pastas de ferramentas.
├── docker-compose.yml            Sobe backend + frontend (e, no perfil local-db, um Postgres com pgvector).
│
├── backend/                      API REST (detalhes em backend/README.md)
│   ├── README.md                 Documentação do backend.
│   ├── .env.example              Modelo do backend/.env (banco, JWT, CORS, Swagger, Cloudinary, Resend, IA).
│   ├── Dockerfile                Imagem multi-stage: build (prisma generate + esbuild) → runtime sem privilégios.
│   ├── .dockerignore             Mantém .env, node_modules e uploads fora da imagem.
│   ├── package.json              Dependências e scripts npm do backend.
│   ├── tsconfig.json             Configuração do TypeScript.
│   ├── eslint.config.js          ESLint (regras recomendadas + typescript-eslint).
│   ├── prisma.config.ts          Configuração do Prisma 7: schema, migrations, seed e DATABASE_URL.
│   ├── prisma/
│   │   ├── schema.prisma         Models User, Category, Campaign, Donation, PasswordResetToken, AiImageGeneration.
│   │   ├── migrations/           7 migrations SQL versionadas (aplicadas com prisma migrate deploy).
│   │   └── seed.ts               Cria as 6 categorias iniciais (npx prisma db seed).
│   ├── scripts/
│   │   ├── docker-start.sh       Início do container: prisma migrate deploy (com novas tentativas) + node dist/server.js.
│   │   ├── docs-check.ts         Valida a especificação OpenAPI e compara com as rotas do Express.
│   │   ├── seed-demo.ts          Cria/apaga 2 usuários, 5 campanhas e doações de demonstração.
│   │   ├── check-ai.ts           Diagnóstico da IA (provedores, variáveis definidas, chamada de teste).
│   │   └── cleanup-orphan-uploads.ts  Lista/apaga imagens que nenhuma campanha usa.
│   ├── docs/requests.http        Requisições de exemplo (REST Client) com equivalentes em curl.
│   ├── uploads/.gitkeep          Pasta das imagens no modo STORAGE_PROVIDER=local.
│   └── src/
│       ├── server.ts             Ponto de entrada: só chama app.listen(PORT).
│       ├── app.ts                Monta o Express: trust proxy, CORS, JSON, rotas, /docs, /uploads e erros.
│       ├── routes/               Caminhos + middlewares de cada grupo (/auth, /campaigns, /me...). → controllers
│       ├── controllers/          Validação zod da entrada e resposta HTTP. → services
│       ├── services/             Regras de negócio, Prisma, IA, armazenamento. → lib
│       ├── middlewares/          auth (JWT), rate-limit, upload (multer) e error (formato { error }).
│       ├── lib/                  Utilitários: prisma, jwt, dates, money, anthropic, llm, cloudinary, mailer, svg-sanitize...
│       ├── docs/                 Especificação OpenAPI montada a partir dos schemas zod (servida em /docs).
│       └── types/express.d.ts    Acrescenta req.userId ao tipo Request do Express.
│
└── frontend/                     Site Next.js (detalhes em frontend/README.md)
    ├── README.md                 Documentação do frontend.
    ├── .env.local.example        Modelo do frontend/.env.local (NEXT_PUBLIC_API_URL).
    ├── Dockerfile                Imagem com output "standalone" do Next.
    ├── .dockerignore             Mantém .env*, node_modules e .next fora da imagem.
    ├── package.json              Dependências e scripts (dev, build, start, lint).
    ├── next.config.ts            output: "standalone" (usado pela imagem Docker).
    ├── tsconfig.json             TypeScript, com o atalho @/ para src/.
    ├── eslint.config.mjs         ESLint com eslint-config-next.
    ├── postcss.config.mjs        Liga o Tailwind CSS 4 (@tailwindcss/postcss).
    ├── AGENTS.md, CLAUDE.md      Instruções para agentes de IA gerados pelo Next (não afetam o build).
    ├── public/                   SVGs padrão do template do Next.
    └── src/
        ├── app/                  Páginas (App Router): /, /login, /register, /forgot-password, /reset-password,
        │                         /campaigns/new, /campaigns/[id], /campaigns/[id]/edit, /me; layout, ícones e globals.css.
        ├── components/           Componentes de interface (formulários, cards, capa, chat, paginação...).
        ├── contexts/             AuthContext (sessão) e FeaturesContext (recursos de IA ligados).
        ├── hooks/                useImageUpload e useUnsavedChangesWarning.
        ├── lib/                  api.ts (única porta para a API), sessão, datas, dinheiro, regras de formulário.
        └── types/                Tipos TypeScript no formato das respostas da API.
```

**Como as partes se conectam:**

- **Frontend → backend:** todas as chamadas passam por `frontend/src/lib/api.ts`, que usa `NEXT_PUBLIC_API_URL`, anexa o token guardado por `lib/session.ts` e transforma respostas `{ error }` em `ApiError`. Um 401 com sessão aberta encerra a sessão local.
- **Backend por dentro:** `app.ts` registra os roteadores de `routes/` (lista `routeMounts`, também usada pelo `docs-check.ts`). Cada rota chama um controller, que chama services; os services usam `lib/prisma.ts` para o banco, `lib/llm.ts`/`lib/anthropic.ts` para a IA, `services/storage.service.ts` para imagens e `lib/mailer.ts` para e-mail.
- **Mesmas regras nos dois lados:** limites do formulário (`frontend/src/lib/campaign-rules.ts` ↔ schemas zod dos controllers), senha (`frontend/src/lib/password-rules.ts` ↔ `auth.controller.ts`) e prazo (`frontend/src/lib/date-input.ts` ↔ `backend/src/lib/dates.ts`). O frontend valida para orientar; o backend sempre valida de novo.

As árvores completas, arquivo por arquivo, estão em [`backend/README.md`](backend/README.md) e [`frontend/README.md`](frontend/README.md).

---

## 6. Modelo de dados

Gerado a partir de [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

```mermaid
erDiagram
    User ||--o{ Campaign : "cria (ownerId)"
    User ||--o{ Donation : "faz (donorId)"
    User ||--o{ PasswordResetToken : "pede (cascade)"
    User ||--o{ AiImageGeneration : "gera (cascade)"
    Category ||--o{ Campaign : "classifica"
    Campaign ||--o{ Donation : "recebe"

    User {
        Int id PK
        String name
        String email UK
        String passwordHash
        Int tokenVersion "default 0"
        DateTime createdAt
    }
    Category {
        Int id PK
        String name UK
    }
    Campaign {
        Int id PK
        String title
        String description
        Decimal goalAmount "Decimal(12,2)"
        String imageUrl "opcional"
        Boolean imageGeneratedByAi "default false"
        DateTime deadline "23:59:59.999 em Sao Paulo"
        CampaignStatus status "ACTIVE | FINISHED"
        Int ownerId FK
        Int categoryId FK
        DateTime createdAt
        DateTime updatedAt
        vector embedding "vector(1024), SEM USO"
    }
    Donation {
        Int id PK
        Decimal amount "Decimal(12,2)"
        String message "opcional"
        Int donorId FK
        Int campaignId FK
        DateTime createdAt
    }
    PasswordResetToken {
        Int id PK
        Int userId FK
        String tokenHash UK "SHA-256"
        DateTime expiresAt
        DateTime usedAt "opcional"
        DateTime createdAt
    }
    AiImageGeneration {
        Int id PK
        Int userId FK
        String url "opcional"
        DateTime createdAt
    }
```

- **Valor arrecadado não é coluna:** é a soma das doações, calculada em uma consulta (`groupBy`) em `campaign.service.ts`, junto com o número de doadores distintos.
- **Categorias** vêm do seed: Saúde, Educação, Tecnologia, Arte e Cultura, Causas Sociais e Meio Ambiente.
- **`AiImageGeneration`** registra cada capa gerada: serve para o limite diário (sobrevive a reinícios) e para o backend reconhecer, pela URL, que a capa escolhida foi gerada pela IA (o cliente não consegue marcar isso sozinho).
- **Exclusões:** tokens de senha e registros de IA são apagados em cascata com o usuário; `Donation → Campaign` não tem cascata, e o service impede excluir campanha com doações (409).
- **Coluna `embedding` (pgvector) sem uso:** sobrou da busca semântica, removida do projeto. A migration `20261019141854_pgvector_campaign_embedding` criou a extensão `vector`, a coluna `vector(1024)` e o índice HNSW `Campaign_embedding_hnsw_idx`. Foram mantidos para não exigir uma migration destrutiva; o código não lê nem grava a coluna. Cuidado ao criar novas migrations: o Prisma não enxerga esse índice e tenta apagá-lo (veja [`backend/README.md`](backend/README.md#banco-e-migrations)).

---

## 7. API

Base em produção: `https://crowdfunding-api-pcri.onrender.com` (local: `http://localhost:3001`). "Bearer" = exige `Authorization: Bearer <token>`. Listas paginadas aceitam `page` e `limit` (1 a 50) e devolvem `{ data, meta: { page, limit, total, totalPages } }`. Erros sempre como `{ "error": "mensagem" }`.

| Método | Caminho | Acesso | Descrição |
|--------|---------|--------|-----------|
| GET | `/` | Público | Status da API (também é o health check). |
| GET | `/health-db` | Público | Testa a conexão com o banco (conta usuários). |
| POST | `/auth/register` | Público | Cria conta; devolve `{ user, token }` (201). E-mail repetido: 409. |
| POST | `/auth/login` | Público | Devolve `{ user, token }`. Credenciais inválidas: 401. |
| POST | `/auth/forgot-password` | Público (rate limit) | Envia o link de redefinição; resposta sempre igual. |
| POST | `/auth/reset-password` | Público (rate limit) | `{ token, password }`: troca a senha e invalida as sessões antigas. |
| GET | `/config/features` | Público | `{ aiCover, aiChat, aiWriting }` (só booleanos). |
| GET | `/categories` | Público | Lista as categorias em ordem alfabética. |
| GET | `/campaigns` | Público | Lista paginada; filtros `q` (título/descrição) e `category` (id ou nome). |
| GET | `/campaigns/search` | Público (rate limit) | Busca por texto (`q` com 2 a 200 caracteres, `category` opcional); mesmo formato da listagem. |
| GET | `/campaigns/:id` | Público | Detalhe com `raisedAmount`, `donorsCount`, `progress`, `daysLeft`, `expired`, `imageGeneratedByAi`. |
| POST | `/campaigns` | Bearer | Cria campanha (201). `deadline` em `"AAAA-MM-DD"`, hoje ou depois. |
| PUT | `/campaigns/:id` | Bearer (dono) | Atualiza campos, inclusive `status`; `imageUrl: null` remove a capa. Não dono: 403. |
| DELETE | `/campaigns/:id` | Bearer (dono) | Exclui (204). Com doações: 409 (deve ser encerrada). |
| POST | `/campaigns/ai-cover` | Bearer (rate limit + limite diário) | `{ title, description, categoryId? }` → `{ url }` (201). |
| POST | `/campaigns/ai-description` | Bearer (rate limit) | `{ title, description, category? }` → `{ description }`. |
| POST | `/campaigns/ai-category` | Bearer (rate limit) | `{ title, description }` → `{ categoryId }`. |
| GET | `/campaigns/:id/donations` | Público | Doações da campanha, mais recentes primeiro. |
| POST | `/campaigns/:id/donations` | Bearer | `{ amount, message? }`: doação simulada (201). Dono: 403; encerrada/vencida: 400. |
| POST | `/uploads/campaign-image` | Bearer (rate limit) | Multipart, campo `image` (JPEG/PNG/WebP até 5 MB) → `{ url }` (201). |
| GET | `/uploads/{arquivo}` | Público | Arquivos estáticos do armazenamento local. |
| POST | `/chat` | Login opcional (rate limit) | `{ messages: [{ role, content }] }` → `{ reply }` em texto puro. |
| GET | `/me/campaigns` | Bearer | Campanhas do usuário logado. |
| GET | `/me/donations` | Bearer | Doações feitas pelo usuário logado, com o título da campanha. |
| GET | `/docs` | HTTP Basic (se configurado) | Swagger UI. |
| GET | `/docs.json` | HTTP Basic (se configurado) | Especificação OpenAPI 3 em JSON. |

### 7.1 Swagger (documentação interativa)

- **`/docs`** abre a Swagger UI; **`/docs.json`** devolve a especificação. Corpos e parâmetros são gerados dos mesmos schemas zod da validação (`backend/src/docs/zod-schema.ts`); respostas e exemplos estão em `backend/src/docs/components.ts` e as operações em `backend/src/docs/openapi.ts`.
- **`DOCS_ENABLED=false`** desliga as duas rotas (respondem 404). Padrão: ligadas.
- **Usuário e senha:** com `DOCS_USER` e `DOCS_PASSWORD` definidos (os dois), o navegador pede login HTTP Basic. No terminal: `curl -u <usuario>:<senha> <API>/docs.json`. Sem as duas variáveis, a documentação fica aberta (e o servidor avisa no log se for produção). Tentativas falhas têm rate limit (20 a cada 15 min por IP).
- **Rotas protegidas:** faça `POST /auth/login` pela própria UI, clique em **Authorize** e cole o token.
- **`npm run docs:check`** (no `backend/`) valida a especificação e confere, nos dois sentidos, se toda rota do Express está documentada. Não abre o servidor nem precisa das credenciais.

---

## 8. Decisões técnicas

Cada item abaixo foi conferido no código; o arquivo de referência está entre parênteses.

| Decisão | Detalhe e motivo |
|---------|------------------|
| Camadas rotas → controllers → services | A rota define caminho e middlewares, o controller valida com zod e responde, o service tem a regra de negócio e o Prisma. Cada arquivo tem uma responsabilidade e as regras ficam fáceis de achar (`backend/src/routes`, `controllers`, `services`). |
| `app.ts` separado de `server.ts` | `app.ts` monta e exporta o Express sem abrir porta; `server.ts` só chama `listen`. Assim `scripts/docs-check.ts` importa o app e `routeMounts` para conferir as rotas sem subir o servidor. |
| JWT de 7 dias com `tokenVersion` | O token leva `sub` (id) e `ver` (versão). A cada requisição autenticada, `middlewares/auth.ts` compara `ver` com `User.tokenVersion`; redefinir a senha incrementa a versão e derruba todas as sessões (`lib/jwt.ts`, `password-reset.service.ts`). |
| Reset de senha seguro | Token aleatório de 256 bits; no banco só o hash SHA-256; validade de 30 min; uso único garantido por `updateMany ... usedAt: null` dentro de transação; só o link mais recente vale; a resposta de `forgot-password` é sempre a mesma e o e-mail é enviado em segundo plano, para nem o tempo de resposta revelar se o e-mail existe (`password-reset.service.ts`). |
| CORS restrito | Só as origens de `FRONTEND_URL` (uma ou mais, separadas por vírgula; barra final ignorada) podem chamar a API pelo navegador (`lib/http-config.ts`). |
| Rate limits | Em memória (`express-rate-limit`), por usuário logado ou por IP (`middlewares/rate-limit.ts`): recuperação de senha 10/15 min por IP e 3/h por e-mail; upload 20/h; busca 30/min; chat 15/min; capa IA 3/10 min; descrição/categoria IA 10/10 min; falhas no `/docs` 20/15 min. |
| `TRUST_PROXY` | Atrás do proxy do Render, sem `trust proxy` todo mundo teria o IP do proxy e o rate limit por IP seria um só. Aceita vazio/`false` (padrão), `true`, número de saltos (ex.: `1`) ou lista de IPs/sub-redes (`lib/http-config.ts`). |
| Dinheiro como string | No banco `Decimal(12,2)`, no código `Prisma.Decimal` (nunca `number`, que perde precisão em somas). Entrada aceita número ou string com até 2 casas; saída sempre string `"150.50"` (`lib/money.ts`). |
| Prazo por dia de calendário em São Paulo | O formulário envia `"AAAA-MM-DD"`; a API exige hoje ou depois e grava o fim desse dia, **23:59:59.999 em America/Sao_Paulo**, qualquer que seja o fuso do servidor (o Render roda em UTC). `daysLeft` é a diferença de datas (prazo hoje = 0 = "Último dia") e no último dia a doação ainda é aceita; depois do fim do dia, `expired: true` (`lib/dates.ts`, `campaign.controller.ts`, `donation.service.ts`; espelho no frontend em `lib/date-input.ts`). Tudo com `Intl.DateTimeFormat`, sem biblioteca de datas. |
| IA atrás de provedores | Texto passa por `lib/llm.ts` (`CHAT_PROVIDER`, só `anthropic`); capa por `services/ai-cover.service.ts` (`COVER_PROVIDER`, só `anthropic-svg`). Valor vazio usa o padrão; valor não suportado desliga o recurso com aviso no log, sem derrubar o servidor. `GET /config/features` usa as mesmas funções (`isChatConfigured`, `isCoverConfigured`) e o frontend esconde o que estiver desligado; o prompt do chat também só descreve recursos ligados. |
| SVG sanitizado por allowlist | A capa gerada é lida por um tokenizador estrito e **reconstruída** só com elementos e atributos de desenho permitidos (sem `script`, `foreignObject`, `image`, `use`, `style`, `text`, atributos `on*`, links externos, `javascript:`, `data:`, entidades), limite de 200 KB (`lib/svg-sanitize.ts`). Servido com CSP `default-src 'none'; style-src 'unsafe-inline'; sandbox` e `nosniff` (local) ou com `fl_sanitize` (Cloudinary); exibido sempre via `<img>`. |
| Upload de SVG pelo usuário recusado | O tipo é detectado pelos primeiros bytes; só JPEG, PNG e WebP passam (`lib/image-type.ts`). `imageUrl` terminada em `.svg` só é aceita se o arquivo for da própria plataforma (`campaign.controller.ts`). |
| Limites de capas por IA | 5 por usuário em 24 h (janela móvel, contada na tabela `AiImageGeneration`, com reserva antes da chamada e devolução se falhar; `ai-usage.service.ts`) e 3 pedidos a cada 10 min (`aiImageLimiter`). |
| Armazenamento trocável | Interface `Storage` com duas implementações, disco (`local`) e Cloudinary, escolhidas por `STORAGE_PROVIDER`. As duas reconhecem e apagam os próprios arquivos, então URLs antigas `/uploads/...` continuam valendo após a troca. Imagem trocada ou removida é apagada se nenhuma outra campanha a usa (`storage.service.ts`, `campaign.service.ts`). |
| Erros num formato só | `HttpError`, erros do zod e JSON malformado viram `{ error }` com mensagem em português; o resto vira 500 genérico com log (`middlewares/error.ts`). |
| Remoção do OpenRouter e da busca semântica | A IA usa só a Anthropic. A busca semântica (embeddings + pgvector) foi retirada: a listagem e `/campaigns/search` buscam texto com `contains` sem diferenciar maiúsculas, e o chat usa uma busca textual própria com pontuação por termo, sem acentos (`search.service.ts`, `lib/search-terms.ts`). Restou só a coluna `embedding` sem uso (seção 6). |
| Swagger derivado do zod | Evita documentação desatualizada; `npm run docs:check` falha se uma rota nova não for documentada (`scripts/docs-check.ts`). |
| Build com esbuild | Em desenvolvimento o `tsx` roda o TypeScript direto; em produção o esbuild gera um único `dist/server.js`, e a imagem final não precisa de TypeScript nem das dependências de desenvolvimento (`backend/Dockerfile`). |

---

## 9. Variáveis de ambiente

Os valores reais ficam só em arquivos ignorados pelo git (`backend/.env`, `frontend/.env.local`, `.env` da raiz) ou nos painéis do Render e da Vercel. Os modelos são [`backend/.env.example`](backend/.env.example), [`frontend/.env.local.example`](frontend/.env.local.example) e [`.env.example`](.env.example).

### 9.1 Backend (`backend/.env` ou painel do Render)

| Variável | Obrigatória | Descrição | Exemplo (placeholder) |
|----------|-------------|-----------|------------------------|
| `DATABASE_URL` | Sim | Connection string do PostgreSQL (no Neon, a URL com `-pooler`). | `postgresql://USUARIO:SENHA@HOST-pooler.REGIAO.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Sim | Segredo que assina os tokens JWT. Longo e aleatório. | `<gere-uma-string-aleatoria-longa>` |
| `PORT` | Não (3001) | Porta do servidor. O Render define sozinho. | `3001` |
| `BACKEND_URL` | Não (`http://localhost:PORT`) | URL pública da API, usada nas URLs das imagens locais. Em produção, a URL do Render. | `https://<servico>.onrender.com` |
| `FRONTEND_URL` | Sim em produção (`http://localhost:3000`) | Origens liberadas no CORS e base dos links dos e-mails. Várias: separe por vírgula. | `https://<projeto>.vercel.app` |
| `TRUST_PROXY` | Não (desligado) | Proxies confiáveis na frente da API. No Render: `1`. | `1` |
| `NODE_ENV` | Não | `production` em produção (o Dockerfile já define). Muda avisos de log. | `production` |
| `DOCS_ENABLED` | Não (ligada) | `false` desliga `/docs` e `/docs.json`. | `true` |
| `DOCS_USER` / `DOCS_PASSWORD` | Não | As duas juntas protegem `/docs` com HTTP Basic. | `<usuario-docs>` / `<senha-docs>` |
| `STORAGE_PROVIDER` | Não (`local`) | `local` (pasta `uploads/`) ou `cloudinary`. Em produção: `cloudinary`. | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Com `cloudinary` | Credenciais do Cloudinary (ou use só `CLOUDINARY_URL`). | `<cloud-name>`, `<api-key>`, `<api-secret>` |
| `CLOUDINARY_URL` | Alternativa | As três credenciais numa URL. | `cloudinary://<api-key>:<api-secret>@<cloud-name>` |
| `CLOUDINARY_FOLDER` | Não (`crowdfunding/campaigns`) | Pasta das capas; use outra para separar desenvolvimento e produção. | `crowdfunding/campaigns` |
| `CLOUDINARY_UPLOAD_PREFIX` | Não | Só para testes: troca o endereço da API do Cloudinary por um servidor falso. Não está no `.env.example`; não use em produção. | — |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Não | E-mail de recuperação de senha. Sem elas, o link aparece só no console (fora de produção). | `<chave-resend>` / `Crowdfunding <nao-responda@seudominio.com>` |
| `CHAT_PROVIDER` | Não (`anthropic`) | Provedor de texto da IA. Outro valor desliga chat, descrição e categoria. | `anthropic` |
| `COVER_PROVIDER` | Não (`anthropic-svg`) | Provedor da capa. Outro valor desliga a capa por IA. | `anthropic-svg` |
| `ANTHROPIC_API_KEY` | Não (sem ela, IA oculta) | Chave da API da Anthropic. | `<chave-anthropic>` |
| `ANTHROPIC_CHAT_MODEL` | Não (`claude-haiku-5-5`) | Modelo do chat, descrição e categoria. | `claude-haiku-5-5` |
| `ANTHROPIC_COVER_MODEL` | Não (`claude-sonnet-5-5`) | Modelo da capa SVG. | `claude-sonnet-5-5` |

### 9.2 Frontend (`frontend/.env.local` ou painel da Vercel)

| Variável | Obrigatória | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | Sim em produção (`http://localhost:3001`) | URL da API usada pelo navegador. **Embutida no build**: mudar exige novo deploy. | `https://<servico>.onrender.com` |
| `API_INTERNAL_URL` | Não | Só no servidor do Next (metadados da página da campanha). Usada no Docker para falar com a API pela rede interna. | `http://backend:3001` |

### 9.3 Docker (`.env` da raiz, lido pelo `docker-compose.yml`)

Só portas, URLs públicas e UID. Os segredos continuam em `backend/.env` e `frontend/.env.local` (repassados por `env_file`).

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `BACKEND_PORT` / `FRONTEND_PORT` | `3001` / `3000` | Portas no seu computador. |
| `PUBLIC_BACKEND_URL` | `http://localhost:3001` | Vira `BACKEND_URL` do backend e `NEXT_PUBLIC_API_URL` do build do frontend. |
| `PUBLIC_FRONTEND_URL` | `http://localhost:3000` | Vira `FRONTEND_URL` do backend. |
| `APP_UID` | `1000` | UID do usuário do container do backend (Linux: `id -u`), para gravar em `backend/uploads`. |
| `LOCAL_DATABASE_URL` | vazio | Com o perfil `local-db`: `postgresql://crowdfunding:crowdfunding@db:5432/crowdfunding` (substitui o `DATABASE_URL`). |
| `DB_PORT` | `5433` | Porta do Postgres local no seu computador. |

---

## 10. Como rodar

**Pré-requisitos:** Node.js 20 ou superior (as imagens Docker usam Node 24), npm, um PostgreSQL com a extensão pgvector (ex.: projeto gratuito no Neon; a migration antiga cria a extensão) e, se quiser os extras, chaves da Anthropic, do Resend e do Cloudinary.

### 10.1 Local, sem Docker

```bash
# 1. Backend
cd backend
cp .env.example .env              # preencha DATABASE_URL e JWT_SECRET (o resto é opcional)
npm install
npx prisma generate               # gera o Prisma Client em generated/prisma
npx prisma migrate deploy         # aplica as migrations
npx prisma db seed                # cria as 6 categorias
npm run seed:demo                 # opcional: dados de demonstração
npm run dev                       # API em http://localhost:3001 (docs em /docs)

# 2. Frontend (outro terminal)
cd frontend
cp .env.local.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                       # site em http://localhost:3000
```

### 10.2 Com Docker / docker-compose

Precisa de `backend/.env` e `frontend/.env.local` preenchidos (seção 9). O `.env` da raiz é opcional (copie de `.env.example` para mudar portas).

```bash
docker compose up --build         # ou docker-compose up --build
```

- O backend aplica as migrations ao iniciar (`scripts/docker-start.sh`) e só depois o frontend sobe (`depends_on` com health check).
- Site em `http://localhost:3000`, API em `http://localhost:3001`.
- As imagens locais ficam em `backend/uploads/` (volume).

**Perfil `local-db` (Postgres + pgvector local, sem Neon):**

```bash
# no .env da raiz:
# LOCAL_DATABASE_URL=postgresql://crowdfunding:crowdfunding@db:5432/crowdfunding
docker compose --profile local-db up --build

# categorias iniciais (do host, com as dependências do backend instaladas):
cd backend && DATABASE_URL=postgresql://crowdfunding:crowdfunding@localhost:5433/crowdfunding npx prisma db seed
```

### 10.3 Scripts npm

**Backend** (`backend/package.json`):

| Script | O que faz |
|--------|-----------|
| `npm run dev` | API com `tsx watch` (reinicia ao salvar). |
| `npm run build` / `npm start` | Empacota com esbuild em `dist/server.js` / roda o servidor compilado. |
| `npm run lint` | ESLint. |
| `npm run docs:check` | Valida o OpenAPI e confere rotas × documentação (`scripts/docs-check.ts`). |
| `npm run seed:demo` / `npm run seed:demo:clean` | Cria/atualiza ou apaga os dados de demonstração (`scripts/seed-demo.ts`): usuários `ana.demo@example.com` e `bruno.demo@example.com`, 5 campanhas "[Demo]" e doações. A senha de demonstração está no próprio script. |
| `npm run check:ai` | Diagnóstico da IA (`scripts/check-ai.ts`); `npm run check:ai -- --cover` testa a capa (tem custo). |
| `npm run cleanup:uploads` | Lista imagens órfãs com mais de 24 h (`scripts/cleanup-orphan-uploads.ts`); `-- --apply` apaga (no Cloudinary, `-- --apply --confirm-cloudinary`). |

Checagem de tipos: `npx tsc --noEmit`. O `npm test` é o placeholder padrão do npm: **não há testes automatizados**.

**Frontend** (`frontend/package.json`): `npm run dev`, `npm run build`, `npm start` e `npm run lint`.

---

## 11. Deploy

Ordem recomendada: **banco (Neon) → backend (Render) → frontend (Vercel) → voltar ao Render e ajustar `FRONTEND_URL`.**

### 11.1 Backend no Render

Web Service a partir do repositório do GitHub:

| Campo | Valor |
|-------|-------|
| Language / Runtime | Docker |
| Instance Type | Free |
| Branch | `main` |
| Root Directory | (vazio) |
| Dockerfile Path | `backend/Dockerfile` |
| Docker Build Context Directory | `backend` |
| Health Check Path | `/` |

Não é preciso comando de build nem de start: o `Dockerfile` gera o Prisma Client e o `dist/server.js`, e o `docker-start.sh` aplica `prisma migrate deploy` antes de subir. O Render define `PORT` e o servidor já a usa. Use `/` no health check (e não `/health-db`) para não manter o Neon acordado à toa.

**Variáveis de ambiente no Render** (só os nomes; os valores ficam no painel):

- Obrigatórias: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `BACKEND_URL`, `TRUST_PROXY` (= `1`).
- Imagens: `STORAGE_PROVIDER` (= `cloudinary`), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (ou `CLOUDINARY_URL`), `CLOUDINARY_FOLDER`.
- Documentação: `DOCS_USER` e `DOCS_PASSWORD` (ou `DOCS_ENABLED` = `false`).
- E-mail: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- IA: `ANTHROPIC_API_KEY` e, opcionalmente, `ANTHROPIC_CHAT_MODEL`, `ANTHROPIC_COVER_MODEL`, `CHAT_PROVIDER`, `COVER_PROVIDER`.

O banco recebe as categorias uma vez, rodando `npx prisma db seed` de uma máquina com `DATABASE_URL` apontando para o Neon.

### 11.2 Frontend na Vercel

| Campo | Valor |
|-------|-------|
| Framework | Next.js (detectado) |
| Root Directory | `frontend` |
| Variável | `NEXT_PUBLIC_API_URL` = URL do Render (sem barra final) |

Defina `NEXT_PUBLIC_API_URL` **antes** do primeiro build (ela é embutida no código do navegador). `API_INTERNAL_URL` não é necessária na Vercel.

### 11.3 Fechando o ciclo

Depois do primeiro deploy da Vercel, coloque a URL final do site (`https://crowdfunding-plataforma.vercel.app`, com `https` e sem caminho) em **`FRONTEND_URL` no Render** e faça um redeploy do backend. Sem isso o CORS bloqueia o site e os links de recuperação de senha apontam para o endereço errado.

---

## 12. Roteiro de demonstração

Cerca de 5 a 7 minutos. Antes: acorde a API e o site (seção 1) e tenha duas contas prontas (ou crie-as no passo 2).

1. **Página inicial (30 s):** mostre a lista de campanhas, a busca por texto, o filtro por categoria e a paginação. Destaque barra de progresso e "dias restantes" nos cards.
2. **Conta (45 s):** clique em "Criar conta" (nome, e-mail, senha com o botão de olho). Mostre que já entra logado. Cite a recuperação de senha em "Entrar" → "Esqueci minha senha".
3. **Nova campanha com IA (2 min):** "Nova campanha", preencha título e uma descrição curta. Clique em "Melhorar descrição com IA", compare e use o texto; "Sugerir categoria"; meta com a máscara de reais; prazo pelo calendário ou atalho de 30 dias. Na capa, aba "Gerar com IA" → "Gerar capa com IA" (pode levar até 1 min; enquanto isso, mostre a pré-visualização do card). Salve.
4. **Página da campanha (45 s):** selo "Capa gerada por IA", progresso, prazo, botão "Compartilhar" (cópia do link). Mostre que o dono não vê o formulário de doação.
5. **Doação (1 min):** saia e entre com a segunda conta, abra a campanha e doe um valor com mensagem. Veja o progresso, o número de doadores e a lista de doadores atualizarem. Reforce que a doação é simulada.
6. **Minha conta (30 s):** abas "Minhas doações" e, com a conta dona, "Minhas campanhas" (editar, encerrar). Comente que campanha com doações não pode ser excluída, só encerrada.
7. **Chat (30 s):** abra o chat e pergunte "Como faço para doar?" e "Tem campanha de educação?" (cita campanhas reais).
8. **Bastidores (30 s, opcional):** abra `/docs` da API (usuário e senha das variáveis de ambiente) e mostre os endpoints e o botão Authorize.

Em ambiente local, `npm run seed:demo` cria duas contas e cinco campanhas prontas para o roteiro; `npm run seed:demo:clean` remove tudo depois.

---

## 13. Limitações e próximos passos

- **Pix real:** hoje a doação é simulada. O próximo passo é o dono da campanha cadastrar sua chave Pix e a plataforma integrar um provedor de pagamento (ex.: Mercado Pago, Asaas): cada doação gera uma cobrança Pix (QR Code / copia e cola) e fica pendente até o provedor confirmar o pagamento por **webhook** (com verificação de assinatura, tratamento de avisos duplicados, expiração e estorno), testado primeiro no sandbox. Só mostrar a chave Pix não basta, porque a plataforma não teria como confirmar o pagamento.
- **Testes automatizados:** não existem; a verificação é manual (`backend/docs/requests.http`, Swagger e o roteiro acima), com `npm run lint`, `npm run docs:check` e `npx tsc --noEmit`.
- **Dados de teste no banco:** o banco de produção pode conter contas e campanhas criadas em testes e demonstrações; não há painel administrativo para moderar ou limpar.
- **Cold start:** Render Free e Neon dormem sem uso; a primeira requisição demora. O título da página da campanha é buscado com limite de 3 s, então com o banco acordando a aba pode sair com o título padrão.
- Coluna `embedding`, índice HNSW e extensão `vector` sem uso, que podem ser removidos por uma migration futura (seção 6).
- Rate limits em memória: valem para uma instância e zeram ao reiniciar (várias instâncias exigiriam Redis ou similar).
- Token de sessão no `localStorage` (um cookie httpOnly seria mais seguro, mas exige mudar a API); o trade-off está em `frontend/src/lib/session.ts`.
- A qualidade das capas em SVG varia; a limpeza de imagens órfãs é manual (`npm run cleanup:uploads`).
- O aviso de alterações não salvas não bloqueia o botão "voltar" do próprio navegador.

---

## 14. Segurança (resumo)

- Senhas com bcrypt (custo 10); `passwordHash` nunca sai da API. Login com a mesma mensagem para e-mail inexistente e senha errada.
- JWT de 7 dias com versão conferida no banco; reset de senha com token em hash, 30 min, uso único.
- Todas as entradas validadas com zod; CORS restrito; rate limits nas rotas sensíveis e de custo.
- Upload: 5 MB, um arquivo, tipo pelos bytes, nome UUID, `nosniff`. SVG só o gerado pela IA, reconstruído por allowlist.
- Chaves nunca em log nem na API (`/config/features` só devolve booleanos; erros do Cloudinary têm chave e segredo trocados por `***`).
- Prompts de IA fixos no backend; o cliente não envia mensagens `system`; o contexto do chat usa só dados públicos das campanhas.
- Imagens Docker sem `.env` (`.dockerignore`) e rodando com usuário sem privilégios.

---

## 15. Autor e contexto acadêmico

- **Autor:** Hugo Melo Carvalho
- **Curso:** Ciência da Computação, UNINASSAU
- **Disciplina:** Estágio Supervisionado I, semestre 2026.2
