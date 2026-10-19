# Plataforma de Crowdfunding

Projeto de estágio: plataforma de "vaquinhas" online em que usuários criam campanhas e recebem doações (simuladas, sem pagamento real). Inclui recuperação de senha por e-mail, upload de capa, área "Minha conta" e recursos de IA: busca semântica, geração de capa (imagem ou SVG), ajuda para escrever a campanha e chatbot de suporte.

## Arquitetura

```
┌───────────────────────┐   fetch (JSON, Bearer JWT)    ┌──────────────────────────────┐
│ frontend/ (Next.js)   │ ────────────────────────────► │ backend/ (Express 5 + TS)    │
│ páginas client-side   │ ◄──────────────────────────── │ routes → controllers →       │
│ src/lib/api.ts        │   { data, meta } / { error }  │ services → Prisma 7          │
└───────────────────────┘                               └──────┬────────┬────────┬─────┘
                                                               │        │        │
                          PostgreSQL (Neon) + pgvector   Anthropic / OpenRouter   Resend
                          dados e embeddings             (IA)                     (e-mail)
```

- **backend/**: API REST em Node.js, Express 5 e TypeScript (ESM). Camadas `routes` → `controllers` (validação com zod) → `services` (regras de negócio), com `middlewares` (auth, rate limit, upload, erros) e `lib` (Prisma, JWT, dinheiro, OpenRouter, Resend). Prisma 7 com o driver adapter `@prisma/adapter-pg` no PostgreSQL do Neon; a extensão pgvector guarda os embeddings da busca semântica. Detalhes em [`backend/README.md`](backend/README.md).
- **frontend/**: Next.js (App Router), TypeScript e Tailwind. Páginas client-side; `src/lib/api.ts` concentra o acesso à API e `src/contexts/AuthContext.tsx` guarda a sessão (token no localStorage).
- **Serviços externos**, cada um atrás de um único módulo e com timeout: Anthropic (`backend/src/lib/anthropic.ts`) e OpenRouter (`backend/src/lib/openrouter.ts`) para texto, com a escolha feita em `backend/src/lib/llm.ts`; OpenRouter para embeddings e imagens; Resend (`backend/src/lib/mailer.ts`) para e-mail. Falhas nesses serviços nunca derrubam o servidor nem impedem criar campanhas.

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
| `CHAT_PROVIDER` | não | Texto por IA: `openrouter` (padrão) ou `anthropic` |
| `COVER_PROVIDER` | não | Capa por IA: `openrouter` (padrão, imagem) ou `anthropic-svg` |
| `ANTHROPIC_API_KEY` | se usar a Anthropic | Chave da API da Anthropic |
| `ANTHROPIC_CHAT_MODEL` | não | Padrão `claude-haiku-5-5` |
| `ANTHROPIC_COVER_MODEL` | não | Padrão `claude-sonnet-5-5` |
| `OPENROUTER_API_KEY` | para embeddings (e chat/imagem se for o provedor) | Chave do OpenRouter |
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
npm run check:ai              # opcional: confere a configuração da IA
npm run seed:demo             # opcional: usuários e campanhas de demonstração (senha demo1234)
npx tsx scripts/backfill-embeddings.ts   # opcional: embeddings de campanhas já existentes
npm run dev                   # http://localhost:3001

# 2. Frontend (outro terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

Checagens: `npx tsc --noEmit` e `npm run lint` (backend); `npm run lint` e `npm run build` (frontend).

**Atualizando de uma versão anterior:** rode `npx prisma migrate deploy` (migration `user_token_version`). Os tokens antigos deixam de valer e **todos os usuários precisam entrar de novo** uma vez.

### Alternar os provedores de IA

No `backend/.env`, e depois reinicie o backend:

| Quero... | Configuração |
|----------|--------------|
| Chat e textos com o Claude Haiku | `CHAT_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` |
| Chat e textos pelo OpenRouter | `CHAT_PROVIDER=openrouter` + `OPENROUTER_API_KEY` e `OPENROUTER_CHAT_MODEL` |
| Capa em SVG desenhada pelo Claude Sonnet | `COVER_PROVIDER=anthropic-svg` + `ANTHROPIC_API_KEY` |
| Capa como imagem pelo OpenRouter | `COVER_PROVIDER=openrouter` + `OPENROUTER_API_KEY` e `OPENROUTER_IMAGE_MODEL` |
| Busca inteligente | sempre OpenRouter: `OPENROUTER_API_KEY` e `OPENROUTER_EMBEDDING_MODEL` |

Sem a chave do provedor escolhido, o recurso mostra uma mensagem amigável e o resto do site funciona normalmente. `npm run check:ai` mostra o que está ativo.

### Scripts do backend

| Comando | O que faz |
|---------|-----------|
| `npm run seed:demo` / `npm run seed:demo:clean` | Cria (idempotente) / apaga os dados de demonstração: `ana.demo@example.com` e `bruno.demo@example.com`, senha `demo1234` |
| `npm run cleanup:uploads` | Lista imagens órfãs em `uploads/` com mais de 24 h; `-- --apply` apaga |
| `npm run check:ai` | Diagnóstico da IA, sem mostrar valores do `.env` |
| `npm run lint` | ESLint |

## Funcionalidades e páginas

| Página | O que faz |
|--------|-----------|
| `/` | Lista de campanhas com busca por texto, filtro por categoria, paginação e "Busca inteligente" (semântica) |
| `/campaigns/[id]` | Detalhe, progresso, doadores, formulário de doação e botão "Compartilhar" |
| `/campaigns/new` e `/campaigns/[id]/edit` | Criar e editar campanha (capa por upload, URL ou IA), encerrar e excluir |
| `/login`, `/register` | Entrar e criar conta |
| `/forgot-password`, `/reset-password` | Recuperação de senha por e-mail |
| `/me` | "Minha conta" (link na barra do topo quando logado): abas "Minhas campanhas" (Ver, Editar, Encerrar) e "Minhas doações" |
| todas | Botão "Precisa de ajuda?" com o chatbot de suporte |

## Detalhes da interface

- **Botão "Voltar"** (`src/components/BackButton.tsx`) acima do título das páginas internas (não aparece na home). Usa `router.back()` quando a pessoa chegou por outra página do site; se abriu o link direto, vai para um endereço de reserva (ex.: a home ou a página da campanha). Quem registra a navegação interna é `src/components/NavigationTracker.tsx` (no layout), guardando uma marca na `sessionStorage` da aba (`src/lib/navigation.ts`). Só contam mudanças de página que criam entrada no histórico: redirecionamentos com `router.replace` (ex.: página protegida mandando para o login) não contam, senão "Voltar" sairia do site.

- **Formulário de campanha** (`src/components/CampaignForm.tsx`, usado na criação e na edição):
  - Validação ao sair de cada campo e ao enviar, com a mensagem junto do campo (`src/lib/campaign-rules.ts` usa os mesmos limites do backend: título 3 a 120, descrição 10 a 5000, meta > 0, prazo a partir de amanhã, categoria obrigatória). O erro geral da API continua aparecendo.
  - Contadores de caracteres e placeholders com exemplos (`FormField`).
  - Meta com prefixo "R$" e máscara brasileira (`MoneyInput` + `src/lib/money-input.ts`: os dígitos viram centavos, `5.000,00`; no envio vira `"5000.00"`; na edição carrega formatada).
  - Prazo com calendário próprio, mínimo de amanhã e atalhos de 30, 60 e 90 dias (`DeadlineInput` + `DatePicker` + `src/lib/date-input.ts`).
  - Capa em um bloco único com abas "Enviar arquivo", "Gerar com IA" e "Colar URL" e uma só pré-visualização (`CoverPicker`, com `ImageDropzone` para arquivo, `ImageField` para URL e `AiCoverGenerator` para IA). "Gerar com IA" fica desabilitado e diz exatamente o que falta (título e/ou descrição).
  - Botão "Cancelar" e aviso de alterações não salvas ao cancelar, voltar, clicar em links do site ou fechar/recarregar a aba (`src/hooks/useUnsavedChangesWarning.ts` + `src/lib/unsaved-changes.ts`). O botão "voltar" do próprio navegador não pode ser bloqueado de forma confiável.
  - "Como vai aparecer": o mesmo `CampaignCard` (modo `preview`, sem link) com os dados digitados e arrecadado = 0, ao lado do formulário em telas largas e abaixo em telas estreitas (`CampaignPreview`).

- **IA no formulário**: "Melhorar descrição com IA" (`DescriptionAssistant`: compara o texto atual com a sugestão e só troca com "Usar este texto") e "Sugerir categoria" (`CategorySuggestion`: seleciona a categoria e avisa "Sugerida por IA. Você pode alterar.").

- **Minha conta** (`src/app/me/`, `MyCampaignsTab`, `MyDonationsTab`): estados de carregamento, erro e vazio; "Encerrar" pede confirmação.

- **Compartilhar** (`src/components/ShareButton.tsx`): usa o menu nativo (Web Share API) quando o navegador tem; senão copia o link e mostra "Link copiado!". Título e descrição da aba (e de quem recebe o link) vêm de `src/app/campaigns/[id]/layout.tsx`, um layout de servidor com `generateMetadata` que busca só o título e a descrição na API; a página continua client-side.

- **Sessão expirada**: se a API recusar o token (expirou ou a senha foi redefinida), `src/lib/api.ts` encerra a sessão local, avisa "Sua sessão expirou. Entre novamente." e as páginas protegidas levam ao login.

- **Capas SVG** geradas pela IA são exibidas sempre com `<img>` (nunca como HTML), o que impede a execução de scripts.

- **Senha**: cadastro e nova senha exigem de 8 a 72 caracteres (mesma regra e mensagem no backend e em `src/lib/password-rules.ts`), com a dica abaixo do campo; o login não tem mínimo. `src/components/PasswordInput.tsx` adiciona o botão de olho para mostrar/ocultar a senha (login, cadastro e nova senha), mantendo o `autoComplete` de cada tela.

- **Prazo da campanha**: `src/components/DatePicker.tsx`, calendário próprio em português (sem dependências) com digitação em dd/mm/aaaa, mínimo de amanhã, navegação por mês e ano, teclado (setas, PageUp/PageDown, Enter, Esc) e popover que não passa da borda da tela. `DeadlineInput` junta o calendário aos atalhos de 30, 60 e 90 dias, destacando o atalho da data escolhida. A API continua recebendo a data no mesmo formato.

- **Capa**: a área da imagem é uma caixa tracejada em 16:9 (mesma proporção do card) que aceita arrastar e soltar ou clicar para escolher (`ImageDropzone` + `src/hooks/useImageUpload.ts`, com as mesmas validações de tipo e tamanho). Na aba "Gerar com IA" a área fica roxa, com o selo "IA".

- **Formulário de campanha**: barra fixa no rodapé do formulário com "Cancelar" e "Criar campanha"/"Salvar alterações" (em telas estreitas o botão do chatbot sobe para não cobri-la); erros só depois de sair do campo ou de tentar enviar; "Melhorar descrição" e "Sugerir categoria" no mesmo estilo roxo secundário, com a dica do que falta só quando estão desabilitados; dica dos limites da meta (de R$ 0,01 a R$ 9.999.999.999,99, de `campaign-rules.ts`); a pré-visualização mostra "de R$ —" enquanto a meta está vazia.

- **Cadastro com e-mail já existente**: o 409 do backend aparece junto do campo de e-mail, com links "Entrar" e "Esqueci minha senha" que levam o e-mail digitado em `?email=` (codificado). `/login` e `/forgot-password` só preenchem o campo se o valor tiver formato de e-mail (`src/lib/email-param.ts`); o forgot-password continua respondendo sempre a mesma mensagem.

## Endpoints

Lista completa e exemplos em [`backend/README.md`](backend/README.md) e [`backend/docs/requests.http`](backend/docs/requests.http). Endpoints novos:

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/forgot-password` | Envia o link de redefinição de senha (resposta sempre igual) |
| POST | `/auth/reset-password` | Troca a senha com o token do link |
| POST | `/uploads/campaign-image` | Upload da capa (JPEG/PNG/WebP, até 5 MB) → `{ url }` |
| GET | `/campaigns/search` | Busca semântica (pgvector), com fallback para busca textual |
| POST | `/campaigns/ai-cover` | Gera uma capa com IA → `{ url }` (5 por usuário a cada 24 h) |
| POST | `/campaigns/ai-description` | Reescreve a descrição com IA → `{ description }` |
| POST | `/campaigns/ai-category` | Sugere a categoria com IA → `{ categoryId }` |
| POST | `/chat` | Chatbot de suporte (texto puro) |
| GET | `/me/campaigns` | Campanhas do usuário logado (paginado) |
| GET | `/me/donations` | Doações feitas pelo usuário logado (paginado) |
