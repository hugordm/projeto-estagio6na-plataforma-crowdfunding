# Plataforma de Crowdfunding

Projeto de estágio: plataforma de "vaquinhas" online em que usuários criam campanhas e recebem doações (simuladas, sem pagamento real). Inclui recuperação de senha por e-mail, upload de capa e recursos de IA: busca semântica, geração de capa e chatbot de suporte.

## Arquitetura

```
┌───────────────────────┐   fetch (JSON, Bearer JWT)    ┌──────────────────────────────┐
│ frontend/ (Next.js)   │ ────────────────────────────► │ backend/ (Express 5 + TS)    │
│ páginas client-side   │ ◄──────────────────────────── │ routes → controllers →       │
│ src/lib/api.ts        │   { data, meta } / { error }  │ services → Prisma 7          │
└───────────────────────┘                               └──────┬────────┬────────┬─────┘
                                                               │        │        │
                                     PostgreSQL (Neon) + pgvector   OpenRouter   Resend
                                     dados e embeddings             (IA)         (e-mail)
```

- **backend/**: API REST em Node.js, Express 5 e TypeScript (ESM). Camadas `routes` → `controllers` (validação com zod) → `services` (regras de negócio), com `middlewares` (auth, rate limit, upload, erros) e `lib` (Prisma, JWT, dinheiro, OpenRouter, Resend). Prisma 7 com o driver adapter `@prisma/adapter-pg` no PostgreSQL do Neon; a extensão pgvector guarda os embeddings da busca semântica. Detalhes em [`backend/README.md`](backend/README.md).
- **frontend/**: Next.js (App Router), TypeScript e Tailwind. Páginas client-side; `src/lib/api.ts` concentra o acesso à API e `src/contexts/AuthContext.tsx` guarda a sessão (token no localStorage).
- **Serviços externos**, cada um atrás de um único módulo e com timeout: OpenRouter (`backend/src/lib/openrouter.ts`) para chat, embeddings e imagens; Resend (`backend/src/lib/mailer.ts`) para e-mail. Falhas nesses serviços nunca derrubam o servidor nem impedem criar campanhas.

## Variáveis de ambiente

**backend/.env** (modelo em `backend/.env.example`):

| Nome | Obrigatória | Uso |
|------|-------------|-----|
| `DATABASE_URL` | sim | PostgreSQL (Neon) |
| `JWT_SECRET` | sim | Assinatura dos tokens JWT |
| `PORT` | não | Porta da API (padrão 3001) |
| `BACKEND_URL` | não | Endereço público da API, usado nas URLs das imagens (padrão `http://localhost:PORT`) |
| `FRONTEND_URL` | não | Endereço do frontend, usado nos links de e-mail (padrão `http://localhost:3000`) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | para e-mail | Envio do link de recuperação de senha |
| `OPENROUTER_API_KEY` | para IA | Chave do OpenRouter |
| `OPENROUTER_CHAT_MODEL` | para o chatbot | Recomendado: `google/gemini-3.5-flash-lite` |
| `OPENROUTER_EMBEDDING_MODEL` | para a busca inteligente | Recomendado: `baai/bge-m3` (a coluna é `vector(1024)`) |
| `OPENROUTER_IMAGE_MODEL` | para a capa por IA | Recomendado: `recraft/recraft-v4.1-flash` |

**frontend/.env.local** (modelo em `frontend/.env.local.example`):

| Nome | Uso |
|------|-----|
| `NEXT_PUBLIC_API_URL` | URL da API (padrão `http://localhost:3001`) |

Nenhum `.env` é versionado (veja os `.gitignore`).

## Como rodar

```bash
# 1. Backend
cd backend
cp .env.example .env          # preencha os valores
npm install
npx prisma migrate deploy     # aplica as migrations (inclui pgvector)
npx prisma generate
npx prisma db seed            # categorias
npx tsx scripts/check-ai.ts   # opcional: confere a configuração da IA
npx tsx scripts/backfill-embeddings.ts   # opcional: embeddings de campanhas já existentes
npm run dev                   # http://localhost:3001

# 2. Frontend (outro terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

Checagens: `npx tsc --noEmit` (backend); `npm run lint` e `npm run build` (frontend).

## Funcionalidades e páginas

| Página | O que faz |
|--------|-----------|
| `/` | Lista de campanhas com busca por texto, filtro por categoria, paginação e "Busca inteligente" (semântica) |
| `/campaigns/[id]` | Detalhe, progresso, doadores e formulário de doação |
| `/campaigns/new` e `/campaigns/[id]/edit` | Criar e editar campanha (capa por upload, URL ou IA), encerrar e excluir |
| `/login`, `/register` | Entrar e criar conta |
| `/forgot-password`, `/reset-password` | Recuperação de senha por e-mail |
| todas | Botão "Precisa de ajuda?" com o chatbot de suporte |

## Endpoints

Lista completa e exemplos em [`backend/README.md`](backend/README.md) e [`backend/docs/requests.http`](backend/docs/requests.http). Endpoints novos:

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/forgot-password` | Envia o link de redefinição de senha (resposta sempre igual) |
| POST | `/auth/reset-password` | Troca a senha com o token do link |
| POST | `/uploads/campaign-image` | Upload da capa (JPEG/PNG/WebP, até 5 MB) → `{ url }` |
| GET | `/campaigns/search` | Busca semântica (pgvector), com fallback para busca textual |
| POST | `/campaigns/ai-cover` | Gera uma capa com IA → `{ url }` (5 por usuário a cada 24 h) |
| POST | `/chat` | Chatbot de suporte (texto puro) |
