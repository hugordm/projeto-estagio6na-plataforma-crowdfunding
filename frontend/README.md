# Frontend: Site da Plataforma de Crowdfunding

Site em **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4**. As páginas rodam no navegador (client components) e conversam com a API do `../backend` por `fetch`, através de um único módulo (`src/lib/api.ts`). Em produção fica na Vercel.

Visão geral, arquitetura, decisões técnicas e deploy: [README da raiz](../README.md). Aqui ficam os detalhes do código do frontend.

---

## Como rodar

```bash
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                        # http://localhost:3000 (com o backend rodando em 3001)
```

Com Docker, a partir da raiz: `docker compose up --build` (seção 10.2 do [README da raiz](../README.md#102-com-docker--docker-compose)).

## Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento do Next. |
| `npm run build` | Build de produção (gera também `.next/standalone`, usado pelo Docker). |
| `npm start` | Serve o build. |
| `npm run lint` | ESLint com `eslint-config-next`. |

## Como testar

Não há testes automatizados. A verificação é `npm run lint`, `npm run build` (que também checa os tipos) e o uso manual seguindo o [roteiro de demonstração](../README.md#12-roteiro-de-demonstração).

## Variáveis de ambiente

| Variável | Onde é usada | Descrição |
|----------|--------------|-----------|
| `NEXT_PUBLIC_API_URL` | `src/lib/api.ts` (navegador) e `src/app/campaigns/[id]/layout.tsx` | URL da API; padrão `http://localhost:3001`. Embutida no build: mudar exige rebuild/redeploy. |
| `API_INTERNAL_URL` | `src/app/campaigns/[id]/layout.tsx` (servidor do Next) | Opcional. URL da API vista de dentro do servidor do Next; no docker-compose é `http://backend:3001`. Na Vercel não é necessária. |

---

## Estrutura

```text
frontend/
├── .env.local.example         Modelo do .env.local.
├── .dockerignore              Exclui .env*, node_modules e .next da imagem.
├── .gitignore                 Ignora builds, dependências e .env*.
├── Dockerfile                 deps → build (recebe NEXT_PUBLIC_API_URL como build arg) → runtime standalone.
├── next.config.ts             output: "standalone".
├── package.json               Dependências e scripts.
├── tsconfig.json              TypeScript; atalho @/ → src/.
├── eslint.config.mjs          ESLint (eslint-config-next).
├── postcss.config.mjs         Plugin @tailwindcss/postcss.
├── AGENTS.md, CLAUDE.md       Instruções para agentes de IA criadas pelo Next.
├── public/                    SVGs padrão do template (file, globe, next, vercel, window).
└── src/
    ├── app/                   Páginas e layouts (App Router)
    ├── components/            Componentes de interface
    ├── contexts/              Estado global (sessão e recursos de IA)
    ├── hooks/                 Hooks reutilizáveis
    ├── lib/                   Acesso à API e regras/utilitários sem interface
    └── types/                 Tipos das respostas da API
```

### `src/app/` (páginas)

| Arquivo | Rota | Propósito |
|---------|------|-----------|
| `layout.tsx` | todas | Layout raiz: metadados padrão ("Crowdfunding", modelo `%s \| Crowdfunding`), `AuthProvider`, `FeaturesProvider`, `Navbar`, `NavigationTracker` e `ChatWidget`. |
| `globals.css` | — | Tailwind e classes reaproveitadas (botões, campos, cards). |
| `icon.svg`, `apple-icon.png` | — | Ícone do site (convenção de arquivos do App Router). |
| `page.tsx` | `/` | Lista de campanhas com busca, filtro por categoria e paginação. |
| `login/page.tsx` | `/login` | Entrar; volta para `?next=` (só caminhos internos); e-mail pode vir preenchido por `?email=`. |
| `register/page.tsx` | `/register` | Criar conta (já entra logado). |
| `forgot-password/page.tsx` | `/forgot-password` | Pede o link de redefinição por e-mail. |
| `reset-password/page.tsx` | `/reset-password?token=` | Define a nova senha com o token do e-mail. |
| `campaigns/new/page.tsx` | `/campaigns/new` | Criar campanha (exige login) com o `CampaignForm`. |
| `campaigns/[id]/layout.tsx` | `/campaigns/:id` | Componente de servidor: `generateMetadata` busca título e descrição na API (limite de 3 s) para a aba e o compartilhamento. |
| `campaigns/[id]/page.tsx` | `/campaigns/:id` | Detalhe: capa, progresso, prazo, compartilhar, painel de doação e lista de doadores. |
| `campaigns/[id]/edit/page.tsx` | `/campaigns/:id/edit` | Editar, encerrar ou excluir (só o dono). |
| `me/layout.tsx` | `/me` | Título da aba "Minha conta". |
| `me/page.tsx` | `/me` | Abas "Minhas campanhas" e "Minhas doações" (exige login). |

### `src/components/`

| Arquivo | Propósito | Usado por |
|---------|-----------|-----------|
| `Navbar.tsx` | Barra superior; links mudam com o login. | `layout.tsx` |
| `NavigationTracker.tsx` | Mantém a pilha de páginas visitadas (`lib/navigation.ts`). | `layout.tsx` |
| `BackButton.tsx` | "Voltar" inteligente (pula formulários e login; pergunta se houver alterações não salvas). | páginas |
| `RequireAuth.tsx` | Redireciona para `/login?next=` quem não está logado. | new, edit, me |
| `ChatWidget.tsx` | Botão flutuante e janela do chat; só aparece com `aiChat` ligado. | `layout.tsx` |
| `CampaignCard.tsx` | Card da listagem (link para o detalhe). | `/`, `CampaignPreview`, `MyCampaignsTab` |
| `CampaignFilters.tsx` | Busca por texto e seletor de categoria. | `/` |
| `Pagination.tsx` | "Anterior"/"Próxima". | listas |
| `ProgressBar.tsx` | Barra de progresso (limitada a 100% no visual). | card e detalhe |
| `StatusBadge.tsx` | Etiqueta "Ativa"/"Encerrada". | card e detalhe |
| `StatusMessage.tsx` | Mensagens de carregando, erro e lista vazia. | várias |
| `CampaignForm.tsx` | Formulário de criação/edição com validação por campo e aviso de alterações não salvas. | new, edit |
| `FormField.tsx` | Moldura do campo: rótulo, ação, erro/dica, contador. | formulários |
| `MoneyInput.tsx` | Campo em reais com máscara (`lib/money-input.ts`). | `CampaignForm`, `DonationForm` |
| `DatePicker.tsx` | Data dd/mm/aaaa com calendário em português e navegação por teclado. | `DeadlineInput` |
| `DeadlineInput.tsx` | Prazo com mínimo de hoje e atalhos 30/60/90 dias. | `CampaignForm` |
| `CampaignPreview.tsx` | "Como vai aparecer": o card montado com os dados digitados. | `CampaignForm` |
| `DescriptionAssistant.tsx` | "Melhorar descrição com IA" com comparação e "Usar este texto". | `CampaignForm` |
| `CategorySuggestion.tsx` | "Sugerir categoria". | `CampaignForm` |
| `CoverPicker.tsx` | Abas de origem da capa e área de pré-visualização. | `CampaignForm` |
| `ImageDropzone.tsx` | Área 16:9 com clique e arrastar e soltar. | `CoverPicker` |
| `ImageField.tsx` | Aba "Colar URL". | `CoverPicker` |
| `AiCoverGenerator.tsx` | "Gerar capa com IA": usar, gerar outra ou descartar. | `CoverPicker` |
| `CoverImage.tsx` | Mostra a capa inteira em 16:9 com fundo desfocado; placeholder se falhar. | card, detalhe, formulário |
| `AiBadge.tsx` | Selo "Capa gerada por IA". | card e detalhe |
| `ShareButton.tsx` | Web Share API ou cópia do link. | detalhe |
| `DonationPanel.tsx` | Decide se mostra o formulário de doação ou o motivo (dono, encerrada, sem login). | detalhe |
| `DonationForm.tsx` | Valor e mensagem da doação simulada. | `DonationPanel` |
| `DonorList.tsx` | Lista paginada de doadores. | detalhe |
| `PasswordInput.tsx` | Campo de senha com botão de olho. | login, register, reset |
| `MyCampaignsTab.tsx` | Aba "Minhas campanhas" (ver, editar, encerrar). | `/me` |
| `MyDonationsTab.tsx` | Aba "Minhas doações". | `/me` |

### `src/contexts/`, `src/hooks/`, `src/lib/`, `src/types/`

| Arquivo | Propósito |
|---------|-----------|
| `contexts/AuthContext.tsx` | Usuário logado, login/logout; restaura a sessão do `localStorage` e reage ao evento de sessão expirada. |
| `contexts/FeaturesContext.tsx` | Lê `GET /config/features` uma vez; enquanto carrega ou se falhar, tudo de IA fica desligado. |
| `hooks/useImageUpload.ts` | Checagem rápida do arquivo (tipo e 5 MB) e envio para `/uploads/campaign-image`. |
| `hooks/useUnsavedChangesWarning.ts` | Confirmação ao sair com alterações não salvas (`beforeunload` e navegação interna). |
| `lib/api.ts` | **Única porta para a API**: URL base, JSON/FormData, token Bearer, `ApiError` e uma função por endpoint (`login`, `getCampaigns`, `createDonation`, `generateAiCover`, `sendChatMessage`...). |
| `lib/session.ts` | Guarda usuário + token no `localStorage` (trade-off de segurança documentado no arquivo). |
| `lib/campaign-rules.ts` | Limites do formulário iguais aos do zod do backend. |
| `lib/password-rules.ts` | Regra de senha (8 a 72) igual à do backend. |
| `lib/date-input.ts` | Datas "AAAA-MM-DD" e "hoje" em America/Sao_Paulo (espelho de `backend/src/lib/dates.ts`). |
| `lib/money-input.ts` | Máscara brasileira de dinheiro (dígitos como centavos). |
| `lib/format.ts` | Formatação para exibição (R$, datas, dias restantes). |
| `lib/email-param.ts` | Valida o e-mail passado por `?email=`. |
| `lib/navigation.ts` | Pilha de páginas visitadas para o botão "Voltar". |
| `lib/unsaved-changes.ts` | Marca global de "há alterações não salvas". |
| `types/*.ts` | `campaign`, `category`, `chat`, `donation`, `features`, `pagination`, `user`: formatos das respostas e entradas da API. |

## Como as partes se conectam

- **Página → `lib/api.ts` → backend:** nenhuma página chama `fetch` direto para a API; todas usam as funções de `lib/api.ts`, que lê `NEXT_PUBLIC_API_URL`, anexa o token de `lib/session.ts` e transforma `{ error }` em `ApiError` (mostrada com `errorMessage`). Um 401 com sessão aberta limpa a sessão e avisa o `AuthContext`.
- **Layout raiz:** `AuthProvider` e `FeaturesProvider` envolvem todas as páginas, então qualquer componente sabe quem está logado e quais recursos de IA existem. O `ChatWidget` e os botões de IA do formulário só aparecem quando o recurso correspondente está ligado.
- **Regras espelhadas:** `campaign-rules.ts`, `password-rules.ts` e `date-input.ts` repetem as regras do backend para mostrar o erro antes de enviar; o backend valida de novo.
- **Metadados:** `campaigns/[id]/layout.tsx` roda no servidor do Next e busca a campanha na API (`API_INTERNAL_URL` ou `NEXT_PUBLIC_API_URL`) para o título e a descrição da página.

## Convenções

- Dinheiro chega da API como string (`"150.50"`) e é enviado como string com até 2 casas.
- Prazo é enviado como `"AAAA-MM-DD"`; os dias restantes exibidos vêm do backend (`daysLeft`/`expired`), exceto na pré-visualização, que usa a mesma regra localmente.
- Imagens de capa sempre com `<img>` comum (aceita qualquer domínio sem configurar `next/image` e não executa scripts de SVG).
