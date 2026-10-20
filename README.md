# Plataforma de Crowdfunding com IA

Plataforma web de "vaquinhas" online: usuários criam campanhas de arrecadação, outras pessoas apoiam com doações (simuladas, sem pagamento real) e acompanham o progresso até a meta. Recursos de inteligência artificial ajudam a criar a campanha (capa ilustrada, melhoria do texto, sugestão de categoria), a encontrar campanhas por significado e a tirar dúvidas por meio de um chatbot de suporte.

Projeto desenvolvido na disciplina de **Estágio Supervisionado I** do curso de **Ciência da Computação** da **UNINASSAU**.

O repositório tem duas aplicações independentes:

- `backend/`: API REST em Node.js, Express 5 e TypeScript, com Prisma 7 e PostgreSQL (Neon).
- `frontend/`: interface em Next.js (App Router), React, TypeScript e Tailwind CSS.

Documentação específica: [`backend/README.md`](backend/README.md) e [`frontend/README.md`](frontend/README.md). Exemplos de requisições: [`backend/docs/requests.http`](backend/docs/requests.http).

---

## 1. Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| Cadastro e login | Conta com nome, e-mail e senha (8 a 72 caracteres). O login devolve um token JWT. Botão de olho para mostrar/ocultar a senha. |
| Recuperação de senha | "Esqueci minha senha" envia por e-mail (Resend) um link válido por 30 minutos e de uso único. Redefinir a senha encerra as sessões abertas. |
| Campanhas (CRUD) | Criar, ver, editar, encerrar e excluir (só o dono; campanha com doações só pode ser encerrada). Formulário com validação por campo, máscara de dinheiro, calendário próprio, atalhos de prazo, aviso de alterações não salvas e pré-visualização do card. |
| Upload de capa | Exibida sempre em 16:9 e inteira (sem cortes), com a própria imagem desfocada preenchendo as sobras. Imagem JPEG, PNG ou WebP até 5 MB, por clique ou arrastar e soltar, ou URL de uma imagem externa. Guardada no disco do servidor ou no Cloudinary (`STORAGE_PROVIDER`); a imagem trocada ou removida é apagada. |
| Capa gerada por IA | Ilustração criada a partir do título, da descrição e da categoria (SVG desenhado pelo Claude e sanitizado). Limite de 5 por usuário a cada 24 h. Selo "Capa gerada por IA". |
| Melhorar descrição com IA | Reescreve a descrição com mais clareza, sem inventar fatos; a pessoa compara e só aplica se quiser. |
| Sugerir categoria com IA | Escolhe uma das categorias cadastradas a partir do título e da descrição. |
| Doações simuladas | Valor e mensagem opcional. O dono não doa na própria campanha; campanha encerrada ou vencida não recebe doações. |
| Lista de doadores | Nome, valor, mensagem e data, paginada, na página da campanha. |
| Progresso e prazo | Valor arrecadado, percentual da meta, número de doadores e dias restantes ("30 dias restantes", "1 dia restante", "Último dia"), contados em dias de calendário no horário de Brasília. O prazo pode ser hoje, e a campanha recebe doações até 23:59:59 do dia do prazo. |
| Minha conta | Abas "Minhas campanhas" (ver, editar, encerrar) e "Minhas doações". |
| Compartilhar | Menu nativo de compartilhamento (Web Share API) ou cópia do link; título e descrição da página para quem recebe o link. |
| Chatbot de suporte | Responde dúvidas sobre a plataforma em texto puro e cita campanhas reais relacionadas à pergunta. |
| Busca | Busca por texto (título e descrição) e filtro por categoria. O chatbot usa uma busca textual própria para citar campanhas relacionadas à pergunta. |

Os recursos de IA só aparecem na interface quando estão configurados no servidor (rota `GET /config/features`).

---

## 2. Stack

Versões conforme os `package.json` e os pacotes instalados.

| Camada | Tecnologia | Versão | Uso |
|--------|------------|--------|-----|
| Frontend | Next.js (App Router) | 16.3.7 | Páginas, roteamento e build do site |
| Frontend | React / React DOM | 19.2.8 | Componentes da interface (páginas client-side) |
| Frontend | Tailwind CSS (`@tailwindcss/postcss`) | 4.3.3 | Estilos utilitários e classes reaproveitáveis (`globals.css`) |
| Frontend | TypeScript | 5.9.3 | Tipagem do frontend |
| Backend | Node.js | 20.x (testado em 20.20) | Ambiente de execução |
| Backend | Express | 5.2.1 | Servidor HTTP e rotas da API |
| Backend | TypeScript | 6.0.3 | Tipagem do backend (6.0 por compatibilidade com o `typescript-eslint`) |
| Backend | tsx | 4.23.15 | Executa o TypeScript direto (`npm run dev` e scripts) |
| Banco | PostgreSQL (Neon) | 18.6 | Banco de dados relacional gerenciado |
| Banco | pgvector | 0.8.6 | Extensão ainda instalada pelas migrations; a coluna `embedding` está sem uso (seção 15) |
| ORM | Prisma / Prisma Client | 7.10.1 | Schema, migrations e consultas |
| ORM | `@prisma/adapter-pg` + `pg` | 7.10.1 / 8.23.1 | Driver adapter exigido pelo Prisma 7 |
| Validação | zod | 4.6.7 | Validação de corpo, query e parâmetros nas rotas |
| Autenticação | jsonwebtoken | 9.0.3 | Tokens JWT (7 dias) |
| Autenticação | bcryptjs | 3.0.3 | Hash das senhas |
| Upload | multer | 2.4.0 | Recebe o arquivo da capa em memória |
| Segurança | express-rate-limit | 8.7.1 | Limites de requisições por IP ou usuário |
| Segurança | cors | 2.8.6 | Libera o acesso do frontend à API |
| IA (texto e capa SVG) | Anthropic Claude (`@anthropic-ai/sdk`) | SDK 0.133.0 | Chat e escrita com Claude Haiku 5.5; capa SVG com Claude Sonnet 5.5 |
| E-mail | Resend (API REST via `fetch`) | — | Envio do link de recuperação de senha |
| Configuração | dotenv | 18.0.4 | Carrega o `backend/.env` |
| Documentação da API | swagger-ui-express + OpenAPI 3.0 | 5.0.1 | Swagger UI em `/docs` e especificação em `/docs.json` |
| Build do backend | esbuild | 0.28.2 | Empacota `src/` em `dist/server.js` (usado no Docker e em `npm start`) |
| Containers | Docker + Docker Compose | — | Imagens do backend e do frontend, banco local opcional (pgvector) |
| Qualidade | ESLint + typescript-eslint (backend) | 10.13.0 / 8.72.0 | `npm run lint` no backend |
| Qualidade | ESLint + eslint-config-next (frontend) | 9.39.5 / 16.3.7 | `npm run lint` no frontend |
| Hospedagem planejada | Vercel (frontend) e Render (backend) | — | Deploy em andamento (seção 14) |

---

## 3. Arquitetura

O frontend é um site Next.js com páginas client-side. Toda comunicação com o backend passa por `frontend/src/lib/api.ts`, que envia JSON com o token no cabeçalho `Authorization: Bearer <token>`. No backend, cada requisição percorre camadas com uma responsabilidade cada:

1. **Página / componente** (`frontend/src/app/...`, `frontend/src/components/...`) chama uma função de `lib/api.ts` (ex.: `createCampaign`).
2. **`lib/api.ts`** monta a URL com `NEXT_PUBLIC_API_URL`, anexa o token e converte respostas `{ error }` em `ApiError`.
3. **Rota** (`backend/src/routes/*.routes.ts`) define método e caminho e aplica middlewares: autenticação (`requireAuth`/`optionalAuth`), rate limit e upload.
4. **Controller** (`backend/src/controllers/*.controller.ts`) lê `req`, valida com zod e chama o service.
5. **Service** (`backend/src/services/*.service.ts`) aplica as regras de negócio e acessa o banco pelo Prisma ou os serviços externos (IA, e-mail, arquivos).
6. **Prisma** (`backend/src/lib/prisma.ts`) executa as consultas no **PostgreSQL** (Neon), inclusive SQL bruto na busca textual do chat.
7. Erros lançados em qualquer camada chegam ao middleware `errorHandler`, que responde `{ "error": "mensagem" }`.

```mermaid
flowchart LR
  subgraph Navegador
    P["Página / componente (Next.js)"] --> A["lib/api.ts (fetch + Bearer JWT)"]
  end
  A -->|HTTP JSON| R["Rotas (routes/*.routes.ts)"]
  subgraph Backend["Backend Express"]
    R --> M["Middlewares (auth, rate limit, upload)"]
    M --> C["Controllers (validação zod)"]
    C --> S["Services (regras de negócio)"]
    S --> PR["Prisma Client"]
    S --> FS["storage.service (uploads/ ou Cloudinary)"]
    S --> L["lib/llm.ts e lib/anthropic.ts"]
    S --> MA["lib/mailer.ts"]
    C -. erro .-> E["errorHandler (resposta com error)"]
  end
  PR --> DB[("PostgreSQL Neon")]
  L --> AN["Anthropic Claude"]
  MA --> RE["Resend"]
```

Falhas em serviços externos (IA, e-mail) nunca derrubam o servidor nem impedem criar campanhas: viram mensagens amigáveis e o detalhe técnico vai só para o log.

---

## 4. Estrutura de pastas e arquivos

Árvore sem `node_modules/`, `.next/`, `backend/generated/` (Prisma Client gerado), `backend/uploads/` (arquivos enviados) e arquivos `.env`.

```
crowdfunding-plataforma/
├── README.md                         Este documento.
├── docker-compose.yml                Backend + frontend em containers; perfil opcional "local-db" (seção 13).
├── .env.example                      Variáveis do docker-compose (portas, URLs públicas, UID).
├── .gitignore                        Ignora .env, node_modules e pastas de ferramentas.
├── backend/
│   ├── package.json                  Dependências e scripts do backend (dev, build, start, lint, docs:check...).
│   ├── Dockerfile                    Imagem multi-stage do backend (seção 13).
│   ├── .dockerignore                 O que fica fora da imagem (node_modules, .env, uploads...).
│   ├── tsconfig.json                 TypeScript (ESM, strict, sem emitir JS: o tsx executa direto).
│   ├── eslint.config.js              ESLint (regras recomendadas + typescript-eslint).
│   ├── prisma.config.ts              CLI do Prisma 7: schema, migrations, seed e DATABASE_URL.
│   ├── .env.example                  Modelo das variáveis de ambiente (sem valores reais).
│   ├── .gitignore                    Ignora .env, generated/ e uploads/ (exceto .gitkeep).
│   ├── README.md                     Como rodar e entender o backend.
│   ├── docs/
│   │   └── requests.http             Requisições de teste da API (REST Client), com equivalentes em curl.
│   ├── prisma/
│   │   ├── schema.prisma             Modelos e relações (seção 5).
│   │   ├── seed.ts                   Cria as 6 categorias iniciais (npx prisma db seed).
│   │   └── migrations/               Histórico de migrations SQL (inclui a coluna embedding, hoje sem uso).
│   ├── scripts/
│   │   ├── check-ai.ts               Diagnóstico dos provedores de IA (sem mostrar valores do .env).
│   │   ├── docs-check.ts             Valida a especificação OpenAPI e confere se toda rota está documentada.
│   │   ├── docker-start.sh           Início do container: migrations + servidor compilado.
│   │   ├── cleanup-orphan-uploads.ts Lista/apaga imagens que nada referencia (uploads/ ou Cloudinary).
│   │   └── seed-demo.ts              Cria/apaga usuários, campanhas e doações de demonstração.
│   └── src/
│       ├── server.ts                 Ponto de entrada: sobe o app na porta PORT.
│       ├── app.ts                    App Express: trust proxy, CORS, rotas (routeMounts), /docs, /uploads estático e erros.
│       ├── docs/                     Especificação OpenAPI (seção 6.1).
│       │   ├── openapi.ts            Caminhos, tags e documento final.
│       │   ├── components.ts         Modelos de resposta, erros e esquema de segurança Bearer.
│       │   └── zod-schema.ts         Converte os schemas zod dos controllers em JSON Schema.
│       ├── routes/                   Caminho + middlewares de cada grupo; chamam os controllers.
│       │   ├── auth.routes.ts        /auth: cadastro, login, esqueci e redefinir senha (com rate limit).
│       │   ├── campaign.routes.ts    /campaigns: CRUD, busca, doações e rotas de IA do formulário.
│       │   ├── category.routes.ts    /categories.
│       │   ├── chat.routes.ts        /chat (login opcional + rate limit).
│       │   ├── config.routes.ts      /config/features.
│       │   ├── docs.routes.ts        /docs (Swagger UI) e /docs.json; desligável com DOCS_ENABLED=false.
│       │   ├── me.routes.ts          /me/campaigns e /me/donations (todas autenticadas).
│       │   └── upload.routes.ts      /uploads/campaign-image (auth, rate limit, multer).
│       ├── controllers/              Validam a entrada com zod e chamam os services.
│       │   ├── auth.controller.ts        E-mail e senha (8 a 72); usa auth e password-reset services.
│       │   ├── campaign.controller.ts    Schemas de campanha (título, meta, prazo, imageUrl), listagem e busca.
│       │   ├── donation.controller.ts    Schema de doação (valor, mensagem até 500 caracteres).
│       │   ├── category.controller.ts    Lista categorias (category.service).
│       │   ├── upload.controller.ts      Detecta o tipo pelos bytes (image-type) e salva (storage.service).
│       │   ├── ai-cover.controller.ts    Entrada da capa por IA; chama ai-cover.service.
│       │   ├── ai-writing.controller.ts  Melhorar descrição e sugerir categoria (services de IA).
│       │   ├── chat.controller.ts        Valida o histórico (só user/assistant); chama chat.service.
│       │   ├── me.controller.ts          Paginação das listas da conta (campaign e donation services).
│       │   └── config.controller.ts      Devolve features.service.getFeatures().
│       ├── services/                 Regras de negócio; acessam o Prisma e os módulos de lib/.
│       │   ├── auth.service.ts           Cadastro e login (bcrypt, JWT com tokenVersion).
│       │   ├── password-reset.service.ts Token de recuperação (SHA-256, 30 min, uso único) e e-mail (mailer).
│       │   ├── campaign.service.ts       CRUD, totais de doações, progresso e dias restantes.
│       │   ├── donation.service.ts       Regras de doação, doadores da campanha e doações do usuário.
│       │   ├── category.service.ts       Consulta de categorias.
│       │   ├── storage.service.ts        Interface Storage: disco (uploads/) ou Cloudinary (STORAGE_PROVIDER); salva e apaga.
│       │   ├── search.service.ts         Busca por texto (GET /campaigns/search) e busca textual de campanhas para o chat.
│       │   ├── ai-usage.service.ts       Limite diário de capas por IA (tabela AiImageGeneration).
│       │   ├── ai-cover.service.ts       Escolhe o provedor da capa (COVER_PROVIDER) e salva o resultado.
│       │   ├── svg-cover.service.ts      Prompt fixo da capa SVG (Claude Sonnet) + svg-sanitize.
│       │   ├── ai-description.service.ts Prompt fixo de "Melhorar descrição" (via llm.ts).
│       │   ├── ai-category.service.ts    Prompt fixo de "Sugerir categoria" e validação do id no banco.
│       │   ├── chat.service.ts           Prompt do chatbot (conforme os recursos ligados) e contexto de campanhas.
│       │   └── features.service.ts       Booleanos dos recursos de IA configurados.
│       ├── middlewares/
│       │   ├── auth.ts               requireAuth/optionalAuth: valida o JWT (jwt.ts) e a tokenVersion no banco.
│       │   ├── rate-limit.ts         Limitadores (senha, upload, chat, busca, capa e escrita por IA).
│       │   ├── upload.ts             multer em memória (1 arquivo, 5 MB) com erros em português.
│       │   └── error.ts              404 e tratamento global de erros ({ error }).
│       ├── lib/                      Utilitários e clientes externos, sem regra de negócio.
│       │   ├── prisma.ts             Instância única do Prisma Client com o adapter pg.
│       │   ├── http-config.ts        Origens do CORS (FRONTEND_URL) e trust proxy (TRUST_PROXY).
│       │   ├── network.ts            Tempo maior por tentativa de conexão (redes com latência alta).
│       │   ├── jwt.ts                Assina e valida tokens (claims sub e ver).
│       │   ├── http-error.ts         Classe HttpError (status + mensagem).
│       │   ├── money.ts              Validação e formatação de valores monetários (Decimal).
│       │   ├── dates.ts              Prazos em dias de calendário no fuso America/Sao_Paulo (hoje, diferença, fim do dia).
│       │   ├── pagination.ts         Schema de page/limit e montagem do meta.
│       │   ├── image-type.ts         Detecta JPEG/PNG/WebP pelos bytes; identifica URLs .svg.
│       │   ├── svg-sanitize.ts       Reconstrói o SVG só com elementos e atributos permitidos.
│       │   ├── mailer.ts             Envio de e-mail pela API do Resend.
│       │   ├── email-templates.ts    HTML e texto do e-mail de recuperação.
│       │   ├── ai-types.ts           Tipos comuns de IA e a classe AiError.
│       │   ├── ai-http-error.ts      Converte AiError em resposta com mensagem amigável.
│       │   ├── llm.ts                Camada de provedor de texto (CHAT_PROVIDER, hoje só anthropic).
│       │   ├── anthropic.ts          Cliente do Claude (chat e geração longa por streaming).
│       │   ├── cloudinary.ts         Cliente do Cloudinary (upload/destroy assinados e listagem, por fetch).
│       │   ├── plain-text.ts         Remove markdown das respostas de IA.
│       │   └── search-terms.ts       Normaliza a pergunta e remove palavras vazias (busca textual).
│       └── types/
│           └── express.d.ts          Adiciona req.userId ao tipo Request do Express.
└── frontend/
    ├── package.json                  Dependências e scripts (dev, build, start, lint).
    ├── next.config.ts                Configuração do Next (output "standalone", usado pela imagem Docker).
    ├── Dockerfile                    Imagem multi-stage do frontend (seção 13).
    ├── .dockerignore                 O que fica fora da imagem.
    ├── eslint.config.mjs             ESLint com eslint-config-next.
    ├── postcss.config.mjs            Plugin do Tailwind CSS 4.
    ├── tsconfig.json                 TypeScript com o alias @/ para src/.
    ├── .env.local.example            Modelo de NEXT_PUBLIC_API_URL.
    ├── AGENTS.md, CLAUDE.md          Instruções geradas pelo Next.js para assistentes de código.
    ├── README.md                     Estrutura e execução do frontend.
    ├── public/                       SVGs do modelo do Next (não usados pelo site).
    └── src/
        ├── app/                      Páginas (App Router): home, campanha, criar/editar, login, cadastro,
        │                             recuperação de senha e Minha conta; icon.svg e apple-icon.png (ícone do site).
        ├── components/               Componentes de interface (formulário, cards, chat, calendário...).
        ├── contexts/                 AuthContext (sessão) e FeaturesContext (recursos de IA ligados).
        ├── hooks/                    useImageUpload e useUnsavedChangesWarning.
        ├── lib/                      api.ts (único acesso à API), regras de formulário, formatação, sessão.
        └── types/                    Tipos das respostas da API.
```

Detalhamento de cada página, componente e módulo do frontend em [`frontend/README.md`](frontend/README.md).

---

## 5. Modelo de dados

Definido em `backend/prisma/schema.prisma`.

| Tabela | Campos principais | Observações |
|--------|-------------------|-------------|
| `User` | `id`, `name`, `email` (único), `passwordHash`, `tokenVersion`, `createdAt` | `tokenVersion` invalida tokens antigos após redefinir a senha. |
| `Category` | `id`, `name` (único) | 6 categorias criadas pelo seed (Saúde, Educação, Tecnologia, Arte e Cultura, Causas Sociais, Meio Ambiente). |
| `Campaign` | `id`, `title`, `description`, `goalAmount` (Decimal 12,2), `imageUrl`, `imageGeneratedByAi`, `deadline`, `status` (`ACTIVE`/`FINISHED`), `ownerId`, `categoryId`, `embedding` (vector 1024, **sem uso**), `createdAt`, `updatedAt` | O valor arrecadado não é coluna: é a soma das doações. Índices em `ownerId` e `categoryId`. `embedding` e seu índice HNSW vêm da fase de busca semântica e ficam sem uso (seção 15). |
| `Donation` | `id`, `amount` (Decimal 12,2), `message`, `donorId`, `campaignId`, `createdAt` | Doação simulada. Índices em `campaignId` e `donorId`. |
| `PasswordResetToken` | `id`, `userId`, `tokenHash` (único), `expiresAt`, `usedAt`, `createdAt` | Guarda só o SHA-256 do token. Apagado em cascata com o usuário. |
| `AiImageGeneration` | `id`, `userId`, `url`, `createdAt` | Limite diário de capas por IA e identificação das capas geradas. Apagado em cascata com o usuário. |

```mermaid
erDiagram
  User ||--o{ Campaign : "cria (ownerId)"
  User ||--o{ Donation : "faz (donorId)"
  User ||--o{ PasswordResetToken : "possui"
  User ||--o{ AiImageGeneration : "gera"
  Category ||--o{ Campaign : "classifica"
  Campaign ||--o{ Donation : "recebe"

  User {
    int id PK
    string name
    string email UK
    string passwordHash
    int tokenVersion
    datetime createdAt
  }
  Category {
    int id PK
    string name UK
  }
  Campaign {
    int id PK
    string title
    string description
    decimal goalAmount
    string imageUrl
    boolean imageGeneratedByAi
    datetime deadline
    string status
    int ownerId FK
    int categoryId FK
    string embedding "vector(1024)"
    datetime createdAt
    datetime updatedAt
  }
  Donation {
    int id PK
    decimal amount
    string message
    int donorId FK
    int campaignId FK
    datetime createdAt
  }
  PasswordResetToken {
    int id PK
    int userId FK
    string tokenHash UK
    datetime expiresAt
    datetime usedAt
    datetime createdAt
  }
  AiImageGeneration {
    int id PK
    int userId FK
    string url
    datetime createdAt
  }
```

---

## 6. Endpoints da API

Base local: `http://localhost:3001`. "Bearer" exige `Authorization: Bearer <token>`. Listas paginadas aceitam `page` e `limit` (máximo 50) e devolvem `{ data, meta: { page, limit, total, totalPages } }`.

| Método | Caminho | Autenticação | Descrição |
|--------|---------|--------------|-----------|
| GET | `/` | — | Status da API. |
| GET | `/health-db` | — | Testa a conexão com o banco. |
| POST | `/auth/register` | — | Cria conta; devolve `{ user, token }` (201). E-mail repetido: 409. |
| POST | `/auth/login` | — | Devolve `{ user, token }`. Credenciais inválidas: 401. |
| POST | `/auth/forgot-password` | — | Envia o link de redefinição; resposta sempre igual. Rate limit. |
| POST | `/auth/reset-password` | — | `{ token, password }`: troca a senha e invalida tokens antigos. Rate limit. |
| GET | `/config/features` | — | `{ aiCover, aiChat, aiWriting }` (só booleanos). |
| GET | `/categories` | — | Lista as categorias. |
| GET | `/campaigns` | — | Lista paginada; filtros `q` (título/descrição) e `category` (id ou nome). Cada campanha traz `daysLeft` e `expired`. |
| GET | `/campaigns/search` | — | Busca por texto no título e na descrição (`q` obrigatório, `category` opcional); mesmo formato da listagem. Rate limit. |
| GET | `/campaigns/:id` | — | Detalhe com `raisedAmount`, `donorsCount`, `progress`, `daysLeft`, `expired` e `imageGeneratedByAi`. |
| POST | `/campaigns` | Bearer | Cria campanha (201). `deadline`: `"AAAA-MM-DD"` (dia em Brasília; hoje ou depois). |
| PUT | `/campaigns/:id` | Bearer (dono) | Atualiza campos, inclusive `status`; `imageUrl: null` remove a capa. 403 se não for o dono. |
| DELETE | `/campaigns/:id` | Bearer (dono) | Exclui (204); com doações, 409 (deve ser encerrada). |
| POST | `/campaigns/ai-cover` | Bearer | `{ title, description, categoryId? }` → `{ url }` (201). Rate limit + limite diário. |
| POST | `/campaigns/ai-description` | Bearer | `{ title, description, category? }` → `{ description }`. Rate limit. |
| POST | `/campaigns/ai-category` | Bearer | `{ title, description }` → `{ categoryId }`. Rate limit. |
| GET | `/campaigns/:id/donations` | — | Doações da campanha (nome do doador, valor, mensagem, data), mais recentes primeiro. |
| POST | `/campaigns/:id/donations` | Bearer | `{ amount, message? }`: doação simulada (201). Dono: 403; encerrada/vencida: 400. |
| POST | `/uploads/campaign-image` | Bearer | Multipart, campo `image` (JPEG/PNG/WebP até 5 MB) → `{ url }` (201). Rate limit. |
| GET | `/uploads/<arquivo>` | — | Arquivos enviados e capas geradas (estáticos). |
| POST | `/chat` | Opcional | `{ messages: [{ role, content }] }` → `{ reply }` em texto puro. Rate limit. |
| GET | `/me/campaigns` | Bearer | Campanhas do usuário logado, com totais, `status`, `daysLeft` e `expired`. |
| GET | `/me/donations` | Bearer | Doações feitas pelo usuário logado, com título da campanha. |
| GET | `/docs` | Basic (opcional) | Swagger UI (documentação interativa). Desligável com `DOCS_ENABLED=false`; senha com `DOCS_USER`/`DOCS_PASSWORD`. |
| GET | `/docs.json` | Basic (opcional) | Especificação OpenAPI 3.0 em JSON. |

### 6.1 Documentação da API (Swagger)

Com o backend rodando:

- **Swagger UI:** `http://localhost:3001/docs` (tags em português, exemplos, "Try it out").
- **Especificação OpenAPI 3.0:** `http://localhost:3001/docs.json`.
- **Rotas autenticadas:** faça login em `POST /auth/login` (pela própria UI), clique em **Authorize** e cole só o token. As rotas com cadeado passam a enviar `Authorization: Bearer <token>`.
- **Como é gerada:** corpos e parâmetros vêm dos mesmos schemas zod usados na validação (`z.toJSONSchema`, nativo do zod 4), então a documentação acompanha as regras reais; respostas, erros (`{ error }`), paginação (`{ data, meta }`), dinheiro como texto e exemplos estão em `backend/src/docs/components.ts`.
- **Conferência:** `npm run docs:check` (no `backend/`) valida a especificação com o `@apidevtools/swagger-parser` e compara com as rotas registradas no Express: falha se alguma rota não estiver documentada ou se a documentação citar uma rota que não existe.
- **Senha (HTTP Basic):** com `DOCS_USER` e `DOCS_PASSWORD` definidos (as duas), `/docs`, `/docs.json` e os arquivos da UI pedem usuário e senha (o navegador abre a janela de login; no curl: `curl -u usuario:senha http://localhost:3001/docs.json`). Sem credenciais ou com credenciais erradas: 401 com `WWW-Authenticate: Basic realm="Docs"`. A comparação é em tempo constante (SHA-256 dos dois lados + `timingSafeEqual`). Sem as duas variáveis, a documentação fica aberta.
- **Rate limit:** 20 tentativas falhas (401/404) a cada 15 minutos por IP nas rotas `/docs*`; acessos com sucesso não contam.
- **Produção:** `DOCS_ENABLED=false` desliga `/docs` e `/docs.json` (respondem 404). Com a documentação ligada e sem credenciais em `NODE_ENV=production`, o servidor registra um aviso no log ao iniciar (sem imprimir valores).
- **`npm run docs:check`** não depende das credenciais: confere a especificação e as rotas sem abrir o servidor.

---

## 7. Decisões técnicas

| Decisão | Motivo |
|---------|--------|
| Camadas `routes` → `controllers` → `services` | Cada arquivo tem uma responsabilidade: a rota define caminho e middlewares; o controller só valida a entrada (zod); o service concentra a regra de negócio e o acesso a dados. Facilita ler, testar e trocar partes (ex.: outro provedor de IA). |
| Dinheiro como `Decimal(12,2)` e string na API | `number` em JavaScript perde precisão em somas (0,1 + 0,2). No banco e no código usa-se `Prisma.Decimal`; na saída, sempre string com 2 casas (`"150.50"`); na entrada, número ou string com até 2 casas. |
| JWT de 7 dias com `tokenVersion` | Token sem estado, simples de usar no frontend. A claim `ver` é conferida com `User.tokenVersion` a cada requisição autenticada; redefinir a senha incrementa a versão e invalida todas as sessões antigas. |
| Senha de 8 a 72 caracteres | 8 é um mínimo razoável; 72 é o limite de bytes que o bcrypt considera. A mesma regra e mensagem estão no backend (zod) e no frontend (`lib/password-rules.ts`). O login não tem mínimo, para contas antigas continuarem entrando. |
| Token de recuperação só como hash SHA-256 | O banco guarda apenas o hash: quem ler a tabela não consegue usar os links. Validade de 30 minutos, uso único garantido em transação, e a resposta de `forgot-password` é sempre a mesma (não revela se o e-mail existe). O e-mail é enviado em segundo plano, para o tempo de resposta também não revelar nada. |
| Paginação `{ data, meta }` | Formato único para todas as listas; o frontend usa o mesmo componente de paginação. |
| Erros `{ error }` | Todo erro (validação, regra de negócio, 404, 500) sai no mesmo formato, com mensagem em português, pelo middleware `errorHandler`. |
| IA só com a Anthropic, atrás de uma camada de provedores | Toda a IA usa o Claude: Haiku 5.5 para chat e escrita, Sonnet 5.5 para a capa em SVG. `lib/llm.ts` (`CHAT_PROVIDER`, padrão `anthropic`) e `ai-cover.service.ts` (`COVER_PROVIDER`, padrão `anthropic-svg`) continuam como ponto único de escolha do provedor, então outro provedor pode ser acrescentado sem mexer nos serviços. Valor não suportado nessas variáveis desliga o recurso e gera um aviso no log ao iniciar, sem derrubar o servidor. Os erros viram `AiError`, e os serviços mostram mensagens amigáveis. |
| Capa por IA em SVG sanitizado | O Claude desenha um SVG 1200x675; o código é lido por um tokenizador estrito e reconstruído só com elementos e atributos de desenho permitidos (sem `script`, `foreignObject`, `image`, `use`, `style`, atributos `on*`, links externos, `javascript:`, `data:` ou entidades). É salvo com nome aleatório e servido com `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` e `X-Content-Type-Options: nosniff`; o frontend o exibe sempre com `<img>`. Upload manual de SVG é recusado, e `imageUrl` terminada em `.svg` só é aceita se o arquivo for deste servidor. |
| Recursos de IA ocultos quando não configurados | `GET /config/features` devolve booleanos calculados pelas mesmas funções que os serviços usam (`isCoverConfigured`, `isChatConfigured`). O frontend esconde a aba de capa por IA, os botões de escrita e o chatbot desligados; o prompt do chat também só descreve o que está ligado. Se alguém chamar uma rota de IA desligada, recebe a mensagem amigável de sempre. |
| Chat em texto puro com busca textual | O prompt proíbe markdown e `toPlainText()` limpa o que escapar. O contexto do chat traz até 3 campanhas reais (só campos públicos) por uma busca textual: termos da pergunta sem acentos e sem palavras vazias, pontuados por aparecer no título, na descrição ou na categoria, só campanhas ativas. |
| Imagens no Cloudinary (ou em disco) | Em produção a nuvem é necessária: o disco de hospedagens como o Render é efêmero (apagado a cada deploy ou reinício) e não é compartilhado entre instâncias, então imagens gravadas em `backend/uploads/` sumiriam. `STORAGE_PROVIDER` escolhe onde as imagens novas são gravadas: `local` (padrão, `backend/uploads/`) ou `cloudinary` (pasta `CLOUDINARY_FOLDER`, nome UUID, URL `https` da CDN). As duas implementações da interface `Storage` continuam reconhecendo e apagando os próprios arquivos, então campanhas antigas com `/uploads/...` seguem funcionando. O cliente usa `fetch` com assinatura SHA-1 (como `mailer.ts`) em vez do SDK: só três chamadas são necessárias, sem dependência nova, e o endereço da API pode apontar para um servidor falso nos testes. A capa SVG da IA vai como `resource_type: image` (entregue como `image/svg+xml`) e a URL salva leva `fl_sanitize`, o sanitizador do próprio Cloudinary, por cima da nossa lista permitida; além disso, o arquivo fica no domínio `res.cloudinary.com`, longe da origem do site. Ao trocar, remover a capa ou excluir a campanha, o arquivo antigo é apagado se nenhuma outra campanha o usa; falha ao apagar só vai para o log. |
| Prazo em dias de calendário em America/Sao_Paulo | O prazo é um dia, não um instante. `backend/src/lib/dates.ts` e `frontend/src/lib/date-input.ts` contam "hoje" sempre no fuso de São Paulo (via `Intl.DateTimeFormat` com `timeZone`, sem biblioteca), qualquer que seja o fuso do servidor (o Render roda em UTC) ou do navegador. `daysLeft` = data do prazo − data de hoje: atalho "30 dias" → 30, prazo hoje → 0 ("Último dia"); antes, o cálculo ia até o fim do dia do prazo e arredondava para cima, mostrando 31. Nunca é negativo: prazo passado é 0 com `expired: true` ("Prazo encerrado"). O frontend envia `"AAAA-MM-DD"`; a API grava o fim desse dia (23:59:59.999 em Brasília), aceita doações até esse instante e também aceita data e hora ISO (vale o dia desse instante em Brasília). Listagem, detalhe, "Minha conta" e o card mostram o `daysLeft`/`expired` do backend; só a pré-visualização calcula localmente, com a mesma regra. |
| Capa sempre inteira em 16:9 (`CoverImage`) | Uploads e URLs externas têm qualquer proporção. `frontend/src/components/CoverImage.tsx` mostra a imagem com `object-contain` (sem cortar) e, atrás dela, a mesma imagem ampliada, desfocada e escurecida preenchendo as sobras; usa `<img>` comum (aceita qualquer domínio sem configurar o `next/image`, e não executa scripts de SVG). Imagem que falha ao carregar vira o placeholder "Sem imagem". |
| Ícone e metadados próprios | Ícone original (quadrado arredondado no verde `emerald-600` dos botões, `#009966`, com um coração branco) em `frontend/src/app/icon.svg`, e `apple-icon.png` 180x180 gerado a partir dele, pela convenção de arquivos do App Router (o `favicon.ico` padrão do Next foi removido). Título padrão "Crowdfunding" com modelo `%s \| Crowdfunding` para as páginas e descrição em português; a página da campanha busca título e descrição na API (`generateMetadata`). |
| Tipo de imagem pelos bytes | Extensão e Content-Type vêm do cliente e podem ser forjados; o upload só aceita arquivos cujos primeiros bytes são de JPEG, PNG ou WebP. |
| Rate limits | Protegem contra abuso e custo de IA: recuperação de senha (10 a cada 15 min por IP e 3 por hora por e-mail), upload (20 por hora), chat (15 por minuto), busca por texto em `/campaigns/search` (30 por minuto), capa por IA (3 a cada 10 min, mais 5 por dia persistidos no banco) e escrita por IA (10 a cada 10 min). |
| Neon | PostgreSQL gerenciado com plano gratuito. A extensão pgvector continua instalada pela migration da antiga busca semântica; a coluna `embedding` não foi apagada para não exigir uma migration destrutiva (seção 15). |
| Swagger derivado do zod | Os corpos e parâmetros da especificação OpenAPI são gerados dos mesmos schemas zod da validação (`z.toJSONSchema`, nativo do zod 4, sem biblioteca extra); só respostas e exemplos são escritos à mão. O `npm run docs:check` impede que uma rota nova fique sem documentação. |
| Build com esbuild e servidor compilado no Docker | Em desenvolvimento o `tsx` executa o TypeScript direto; para produção, o esbuild empacota `src/` (com o Prisma Client gerado) em um único `dist/server.js` e deixa os pacotes do `node_modules` de fora. A imagem final não precisa de TypeScript nem de dependências de desenvolvimento. |

---

## 8. Segurança

- Senhas com bcrypt (custo 10); `passwordHash` nunca sai da API.
- JWT assinado com `JWT_SECRET`, validade de 7 dias e versão conferida no banco; redefinir a senha encerra todas as sessões.
- Recuperação de senha com token aleatório de 256 bits, guardado só como SHA-256, 30 minutos, uso único e resposta que não revela se o e-mail existe.
- Mesma mensagem para e-mail inexistente e senha errada no login.
- Validação de todas as entradas com zod; ids e paginação validados.
- Rate limits nas rotas sensíveis e de custo (seção 7); atrás de proxy, `TRUST_PROXY` faz o limite usar o IP real do cliente.
- CORS restrito às origens de `FRONTEND_URL`.
- Imagens Docker sem segredos (`.env*` fora do contexto de build) e rodando com usuário sem privilégios.
- Upload: limite de 5 MB e um arquivo, tipo detectado pelos bytes, nome aleatório (UUID) e `X-Content-Type-Options: nosniff`.
- SVG gerado por IA reconstruído por lista permitida, servido com CSP restritiva (local) ou com `fl_sanitize` no domínio do Cloudinary, e exibido só via `<img>`; SVG enviado por usuário é recusado, e `imageUrl` `.svg` só é aceita se for da plataforma (`/uploads` deste servidor ou a pasta e a conta do Cloudinary configuradas).
- Cloudinary: chave e segredo só no `backend/.env`, nunca em log (mensagens de erro do provedor passam por um filtro que troca os valores por `***`); o cliente recebe só `{ error }` genérico (502, ou 503 sem configuração).
- Prompts de IA fixos no backend; o texto do usuário entra entre marcadores e é tratado como conteúdo. O cliente não pode enviar mensagens `system` ao chat.
- O contexto do chat usa só dados públicos das campanhas (nunca e-mails ou doadores).
- Chaves de API nunca são registradas em log nem expostas pela API; `/config/features` devolve só booleanos.
- O redirecionamento pós-login aceita apenas caminhos internos; o e-mail passado pela URL só preenche o campo se tiver formato de e-mail.
- O token fica no `localStorage` do navegador (trade-off documentado em `frontend/src/lib/session.ts`); um 401 por token antigo encerra a sessão local.

---

## 9. Variáveis de ambiente

Os modelos estão em `backend/.env.example` e `frontend/.env.local.example`. Nenhum `.env` é versionado.

**backend/.env**

| Nome | Obrigatória | Descrição |
|------|-------------|-----------|
| `DATABASE_URL` | Sim | Conexão com o PostgreSQL (Neon), de preferência a URL com `-pooler`. |
| `JWT_SECRET` | Sim | Chave para assinar os tokens JWT (longa e aleatória). |
| `PORT` | Não | Porta da API (padrão 3001). |
| `BACKEND_URL` | Não | Endereço público da API, usado nas URLs das imagens (padrão `http://localhost:PORT`). |
| `FRONTEND_URL` | Não | Endereço do frontend (padrão `http://localhost:3000`): links dos e-mails e **CORS** (só essas origens chamam a API pelo navegador; mais de uma, separadas por vírgula). |
| `TRUST_PROXY` | Não | Proxies confiáveis na frente da API, para o rate limit ler o IP real: vazio/`false` (padrão), `1` (um proxy, ex.: Render), `true` ou lista de IPs/sub-redes. |
| `DOCS_ENABLED` | Não | `false` desliga `/docs` e `/docs.json` (padrão: ligado). |
| `DOCS_USER` | Não | Usuário do login HTTP Basic de `/docs` e `/docs.json` (só vale junto com `DOCS_PASSWORD`). |
| `DOCS_PASSWORD` | Não | Senha do login HTTP Basic da documentação. Sem as duas, `/docs` fica aberto (aviso no log em produção). |
| `STORAGE_PROVIDER` | Não | Onde gravar as imagens novas: `local` (padrão, `backend/uploads/`) ou `cloudinary`. |
| `CLOUDINARY_CLOUD_NAME` | Se `STORAGE_PROVIDER=cloudinary` | Nome da conta (cloud name) no Cloudinary. |
| `CLOUDINARY_API_KEY` | Se `STORAGE_PROVIDER=cloudinary` | API Key do Cloudinary. |
| `CLOUDINARY_API_SECRET` | Se `STORAGE_PROVIDER=cloudinary` | API Secret do Cloudinary (segredo; nunca vai para o log). |
| `CLOUDINARY_URL` | Alternativa às três acima | `cloudinary://<api_key>:<api_secret>@<cloud_name>`, como aparece no painel. Usada só se as três não estiverem definidas. |
| `CLOUDINARY_FOLDER` | Não | Pasta das capas (padrão `crowdfunding/campaigns`). |
| `RESEND_API_KEY` | Para e-mail | Chave do Resend. Sem ela, fora de produção, o link de recuperação aparece no console. |
| `RESEND_FROM_EMAIL` | Para e-mail | Remetente, ex.: `Crowdfunding <nao-responda@seudominio.com>` (domínio verificado no Resend). |
| `CHAT_PROVIDER` | Não | Provedor de texto (chat e escrita): `anthropic` (padrão, e único aceito). Outro valor desliga o recurso, com aviso no log. |
| `COVER_PROVIDER` | Não | Provedor da capa: `anthropic-svg` (padrão, e único aceito). Outro valor desliga o recurso, com aviso no log. |
| `ANTHROPIC_API_KEY` | Se usar a Anthropic | Chave da API da Anthropic. |
| `ANTHROPIC_CHAT_MODEL` | Não | Modelo de texto (padrão `claude-haiku-5-5`). |
| `ANTHROPIC_COVER_MODEL` | Não | Modelo da capa SVG (padrão `claude-sonnet-5-5`). |

`NODE_ENV=production` (definida pela hospedagem) impede que o link de recuperação apareça no console.

**Como alternar os provedores de IA** (no `backend/.env`, depois reiniciar o backend):

| Objetivo | Configuração |
|----------|--------------|
| Chat e escrita com o Claude Haiku | `CHAT_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` |
| Capa em SVG desenhada pelo Claude Sonnet | `COVER_PROVIDER=anthropic-svg` + `ANTHROPIC_API_KEY` |

**Como configurar o Cloudinary** (armazenamento das imagens):

1. Crie uma conta gratuita em [cloudinary.com](https://cloudinary.com/users/register_free) (plano Free; não precisa de cartão).
2. No painel (Console), abra **Settings → API Keys** (ou o card "Product Environment" no Dashboard): ali estão o **Cloud name**, a **API Key** e o **API Secret** (clique para revelar). A mesma tela mostra a `CLOUDINARY_URL` pronta.
3. No `backend/.env`: `STORAGE_PROVIDER=cloudinary` e as três variáveis (ou só `CLOUDINARY_URL`). Reinicie o backend.
4. Não é preciso criar a pasta nem um upload preset: o backend envia uploads assinados e a pasta `crowdfunding/campaigns` é criada no primeiro envio.
5. Se usar a capa SVG da IA (`COVER_PROVIDER=anthropic-svg`), confira em **Settings → Security** que SVG não está em "Restricted media types" (em algumas contas a entrega de certos formatos vem bloqueada).

**frontend/.env.local**

| Nome | Obrigatória | Descrição |
|------|-------------|-----------|
| `NEXT_PUBLIC_API_URL` | Não | URL da API usada pelo navegador (padrão `http://localhost:3001`). Embutida no build. |
| `API_INTERNAL_URL` | Não | URL da API usada pelo servidor do Next (metadados da página da campanha). Só necessária quando difere da anterior, como no Docker (`http://backend:3001`). |

---

## 10. Como rodar localmente

**Pré-requisitos:** Node.js 20 ou superior, npm, um banco PostgreSQL com a extensão pgvector (ex.: projeto gratuito no Neon) e, opcionalmente, chaves da Anthropic (IA), do Resend (e-mail) e do Cloudinary (imagens).

```bash
# 1. Backend
cd backend
cp .env.example .env              # preencha DATABASE_URL e JWT_SECRET (o resto é opcional)
npm install
npx prisma migrate deploy         # aplica as migrations
npx prisma generate               # gera o Prisma Client em generated/prisma
npx prisma db seed                # cria as categorias
npm run seed:demo                 # opcional: usuários e campanhas de demonstração
npm run dev                       # API em http://localhost:3001

# 2. Frontend (outro terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                       # site em http://localhost:3000
```

**Scripts do backend** (`backend/package.json`):

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Inicia a API com `tsx watch` (reinicia ao salvar). |
| `npm run build` / `npm start` | Compila com esbuild para `dist/server.js` / roda o servidor compilado. |
| `npm run docs:check` | Valida a especificação OpenAPI e confere se toda rota está documentada. |
| `npm run lint` | ESLint. |
| `npm run check:ai` | Diagnóstico da IA. |
| `npm run seed:demo` / `npm run seed:demo:clean` | Cria / apaga os dados de demonstração. |
| `npm run cleanup:uploads` | Lista imagens órfãs; com `-- --apply` apaga (no Cloudinary, `-- --apply --confirm-cloudinary`). |

Checagem de tipos: `npx tsc --noEmit`. O script `npm test` é o placeholder padrão do npm (não há testes automatizados).

**Scripts do frontend** (`frontend/package.json`): `npm run dev` (desenvolvimento), `npm run build` (build de produção), `npm run start` (serve o build) e `npm run lint`.

**Portas:** frontend 3000, backend 3001. Documentação da API em `http://localhost:3001/docs`.

**Atualizando de uma versão anterior:** rode `npx prisma migrate deploy` (migration `user_token_version`). Os tokens antigos deixam de valer e todos os usuários precisam entrar de novo uma vez.

---

## 11. Scripts úteis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `check-ai.ts` | `npm run check:ai` | Mostra os provedores ativos, quais variáveis da Anthropic estão definidas (sem valores) e os recursos ligados; testa o chat. Com `-- --cover` testa a capa SVG (com custo). |
| `cleanup-orphan-uploads.ts` | `npm run cleanup:uploads [-- --apply]` | Lista imagens do provedor ativo (`uploads/` ou a pasta do Cloudinary) com mais de 24 h que nenhuma campanha nem geração de IA referencia. Local: apaga com `--apply` (nunca o `.gitkeep`). Cloudinary: só apaga com `--apply --confirm-cloudinary`. |
| `docs-check.ts` | `npm run docs:check` | Valida a especificação OpenAPI e confere, nos dois sentidos, se as rotas registradas no Express e as documentadas batem. Sai com código 1 se houver diferença. |
| `seed-demo.ts` | `npm run seed:demo` / `npm run seed:demo:clean` | Cria, de forma idempotente, os usuários `ana.demo@example.com` e `bruno.demo@example.com` (senha `demo1234`), 5 campanhas fictícias com prazo futuro e doações de exemplo; `--clean` apaga só o que o script cria. |

---

## 12. Roteiro de demonstração

1. Rode `npm run seed:demo` no backend e abra `http://localhost:3000`.
2. Na página inicial, busque por "horta" e filtre por categoria.
3. Entre como `ana.demo@example.com` (senha `demo1234`); teste o botão de olho da senha.
4. Clique em "Nova campanha": preencha título e descrição, use "Melhorar descrição com IA" e "Sugerir categoria", digite a meta (máscara R$), escolha o prazo no calendário ou pelos atalhos, gere a capa na aba "Gerar com IA" (ou arraste uma imagem) e acompanhe o card em "Como vai aparecer".
5. Crie a campanha; na página dela, use "Compartilhar".
6. Saia e entre como `bruno.demo@example.com`; abra a campanha e faça uma doação. Veja o progresso e a lista de doadores.
7. Abra "Minha conta" e confira as abas de campanhas e doações.
8. Pergunte ao chatbot "Me explica sobre a horta comunitária?" e "Como recupero minha senha?".
9. Em "Entrar", use "Esqueci minha senha" (com o Resend configurado, o link chega por e-mail; sem ele, aparece no console do backend).
10. Ao final, `npm run seed:demo:clean` remove os dados de demonstração.

Requisições prontas para testar a API sem a interface: `backend/docs/requests.http`.

---

## 13. Docker

O repositório tem um `Dockerfile` para cada aplicação e um `docker-compose.yml` na raiz.

| Arquivo | O que faz |
|---------|-----------|
| `backend/Dockerfile` | Multi-stage em `node:24-bookworm-slim`: instala as dependências, roda `prisma generate` e `npm run build` (esbuild); a imagem final tem só as dependências de produção, roda como usuário `node` (sem privilégios) e, ao iniciar (`scripts/docker-start.sh`), aplica `prisma migrate deploy` (com novas tentativas enquanto o banco sobe) e roda `node dist/server.js`. `HEALTHCHECK` em `/`. |
| `frontend/Dockerfile` | Multi-stage com `output: "standalone"` do Next: a imagem final tem só o servidor mínimo (`server.js`), `public/` e `.next/static`, roda como `node`. `NEXT_PUBLIC_API_URL` é build arg (fica embutida no código do navegador). `HEALTHCHECK` em `/`. |
| `.dockerignore` (nos dois) | Mantêm fora das imagens `node_modules`, `.next`, `dist`, `uploads`, `.env*` e `.git`. Nenhum segredo entra nas imagens. |
| `docker-compose.yml` | Serviços `backend` e `frontend` com healthchecks, `env_file` (`backend/.env` e `frontend/.env.local`), volume `./backend/uploads` (imagens do provedor local e as antigas) e portas configuráveis. Perfil opcional `local-db`: Postgres 18 + pgvector 0.8.6 (`pgvector/pgvector:0.8.6-pg18`). |
| `.env.example` (raiz) | Variáveis do compose: `BACKEND_PORT`, `FRONTEND_PORT`, `PUBLIC_BACKEND_URL`, `PUBLIC_FRONTEND_URL`, `APP_UID`, `LOCAL_DATABASE_URL`, `DB_PORT`. |

**Subir com o banco do Neon** (o `DATABASE_URL` do `backend/.env`):

```bash
cp backend/.env.example backend/.env              # se ainda não existir; preencha os valores
cp frontend/.env.local.example frontend/.env.local
cp .env.example .env                              # opcional: portas e URLs (padrão 3000/3001)
docker compose up --build                         # ou: docker-compose up --build
```

- Frontend em `http://localhost:3000`, API em `http://localhost:3001` e documentação em `http://localhost:3001/docs`.
- Em Linux, para o container gravar em `backend/uploads`, defina `APP_UID` com o seu UID (`id -u`) no `.env` da raiz.
- O compose define dentro do container: `PORT=3001`, `BACKEND_URL`/`FRONTEND_URL` a partir de `PUBLIC_BACKEND_URL`/`PUBLIC_FRONTEND_URL`, e `API_INTERNAL_URL=http://backend:3001` no frontend (o servidor do Next fala com a API pela rede interna).
- **CORS:** a API só aceita chamadas do navegador vindas de `FRONTEND_URL`, que o compose preenche com `PUBLIC_FRONTEND_URL`. Ela precisa ser exatamente a origem que aparece no navegador (esquema, domínio e porta); a barra final é ignorada.
- **`TRUST_PROXY`:** fica no `backend/.env`. Com o compose acessado direto, deixe vazio; se puser um proxy reverso (Nginx, Traefik) na frente do container, use `1`, para o rate limit ler o IP real do cliente.
- **Swagger:** `/docs` segue `DOCS_ENABLED`, `DOCS_USER` e `DOCS_PASSWORD` do `backend/.env`.
- **Imagens:** com `STORAGE_PROVIDER=local` elas ficam no volume `./backend/uploads`; com `cloudinary`, o volume só serve as antigas.
- Para mudar as portas, ajuste juntas `BACKEND_PORT` e `PUBLIC_BACKEND_URL` (e `FRONTEND_PORT` e `PUBLIC_FRONTEND_URL`); a URL da API fica embutida no build do frontend, então use `--build` depois de mudar.

**Subir com o banco local (sem internet para o banco):**

```bash
# no .env da raiz: LOCAL_DATABASE_URL=postgresql://crowdfunding:crowdfunding@db:5432/crowdfunding
docker compose --profile local-db up --build
# categorias iniciais (do host, com as dependências do backend instaladas):
cd backend && DATABASE_URL=postgresql://crowdfunding:crowdfunding@localhost:5433/crowdfunding npx prisma db seed
```

O backend aplica todas as migrations no banco novo (a imagem `pgvector` é necessária porque uma migration antiga cria a extensão). Para apagar o banco local: `docker compose --profile local-db down -v`.

**Testado:** build das duas imagens e `docker-compose up` (1.29) com portas alternativas: containers saudáveis, migrations, `/health-db`, `/docs`, CORS, metadados da página da campanha pelo `API_INTERNAL_URL`, upload gravando no volume e o site no navegador; perfil `local-db` aplicando as 7 migrations num banco vazio.

---

## 14. Deploy planejado (em andamento)

**Situação: em andamento.** O projeto ainda não está publicado; abaixo está o plano, conferido com o código atual. Nenhum valor real de chave aparece aqui: tudo é configurado no painel de cada serviço.

**Backend no Render** (Web Service, raiz `backend/`)

- **Como rodar:** pelo `Dockerfile` (aplica `prisma migrate deploy` e sobe `dist/server.js`), ou como serviço Node com build `npm ci && npx prisma generate && npm run build` e start `npx prisma migrate deploy && npm start`. O Render define `PORT`; o servidor já a usa.
- **Health check:** `/health-db` (responde 200 só se o banco responder). Cada verificação consulta o banco, o que mantém o Neon acordado; para não gastar o compute do Neon, use `/`, que só confere o servidor.
- **Variáveis obrigatórias:** `DATABASE_URL` (URL do Neon com `-pooler`), `JWT_SECRET` (longa e aleatória), `NODE_ENV=production`, `BACKEND_URL` (URL pública do serviço, ex.: `https://<servico>.onrender.com`) e `FRONTEND_URL` (seção abaixo).
- **`FRONTEND_URL` exato:** a URL da Vercel do jeito que aparece no navegador (`https://<projeto>.vercel.app`, com `https`, sem caminho; a barra final é ignorada). É a única origem liberada no CORS e a base dos links dos e-mails. Para liberar também um domínio próprio ou um preview, separe por vírgula.
- **`TRUST_PROXY=1`:** o Render fica na frente da API como um proxy; sem isso, todo mundo parece ter o mesmo IP e o rate limit por IP vira um só.
- **Imagens:** `STORAGE_PROVIDER=cloudinary` e `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (ou `CLOUDINARY_URL`), porque o disco do Render é efêmero. Use um `CLOUDINARY_FOLDER` diferente do de desenvolvimento se as duas usarem a mesma conta. Não defina `CLOUDINARY_UPLOAD_PREFIX`.
- **Documentação:** `DOCS_ENABLED=false` para esconder, ou `DOCS_USER` e `DOCS_PASSWORD` para pedir login (o Render serve em HTTPS, então a senha do HTTP Basic não trafega aberta). Sem nenhum dos dois, o servidor avisa no log que `/docs` está público.
- **Opcionais:** `RESEND_API_KEY` e `RESEND_FROM_EMAIL` (recuperação de senha por e-mail), e as variáveis de IA desejadas (`ANTHROPIC_API_KEY` e, se quiser trocar os modelos, `ANTHROPIC_CHAT_MODEL` e `ANTHROPIC_COVER_MODEL`).
- **Fuso:** o Render roda em UTC; não é preciso configurar nada, porque o prazo é sempre contado em America/Sao_Paulo (`lib/dates.ts`).

**Frontend na Vercel** (raiz `frontend/`)

- **`NEXT_PUBLIC_API_URL`:** a URL pública da API (a mesma de `BACKEND_URL`). Defina-a **antes** do primeiro build: ela é embutida no código do navegador durante o build, então mudar depois exige um novo deploy.
- `API_INTERNAL_URL` não é necessária na Vercel (só no Docker).
- Depois do primeiro deploy, copie a URL final da Vercel para o `FRONTEND_URL` do Render e reinicie o backend.

---

## 15. Limitações conhecidas e próximos passos

- **Pagamento real (Pix):** hoje a doação é simulada: o registro é criado direto no banco, sem dinheiro envolvido. Mostrar só a chave Pix do dono não resolveria, porque a plataforma não teria como confirmar se o pagamento aconteceu nem de quanto foi. O caminho correto é um provedor de pagamentos (Mercado Pago, Asaas ou similar):
  - criar uma cobrança Pix por doação (QR Code e "copia e cola"), com a doação ainda pendente;
  - confirmar por webhook, verificando a assinatura enviada pelo provedor;
  - tratar duplicidade (o mesmo aviso pode chegar mais de uma vez), expiração da cobrança e estorno;
  - testar tudo no sandbox do provedor antes de usar dinheiro real.
- A busca semântica com embeddings foi implementada e depois removida do escopo; a coluna `embedding` permanece sem uso. Ela (e o índice HNSW `Campaign_embedding_hnsw_idx`, além da extensão `vector`) pode ser removida por uma migration futura; enquanto existir, novas migrations precisam do cuidado descrito em `backend/README.md` (seção 8).
- Armazenamento no Cloudinary testado com um servidor falso local (assinatura, upload, exclusão e listagem); falta validar com uma conta real (ver seção 9).
- Não há migração automática das imagens antigas de `backend/uploads/` para o Cloudinary.
- Rate limits em memória: valem para um único servidor e zeram ao reiniciar (com várias instâncias, seria preciso um store compartilhado como Redis).
- Token de sessão no `localStorage` (um cookie httpOnly seria mais seguro, mas exige mudar a API).
- Qualidade variável das capas em SVG geradas por IA.
- Sem testes automatizados; a verificação é manual (`backend/docs/requests.http` e o roteiro acima).
- O aviso de alterações não salvas não consegue bloquear o botão "voltar" do próprio navegador.
- O título da aba da campanha é buscado na API com limite de 3 s; se o banco (Neon) estiver acordando, a página sai com o título padrão "Crowdfunding" naquela requisição.
- Prazo e "Último dia" seguem sempre o horário de Brasília, mesmo para quem acessa de outro fuso; os horários das doações aparecem no fuso do navegador.
- Os navegadores guardam o ícone em cache: quem já acessou o site pode ver o ícone antigo do Next até o cache expirar.
- A limpeza de uploads órfãos é manual (script); pode ser agendada.
- Próximos passos: deploy (seção 14), validar o Cloudinary com uma conta real, testes automatizados, pagamento Pix real (acima) e painel administrativo.

---

## 16. Autor e orientação

- **Autor:** Hugo Melo
- **Orientação:** (preencher com o nome do(a) professor(a) orientador(a) da disciplina)
- **Instituição:** UNINASSAU, curso de Ciência da Computação, disciplina Estágio Supervisionado I
