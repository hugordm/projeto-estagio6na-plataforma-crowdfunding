# Frontend: Plataforma de Crowdfunding

Interface em Next.js 16 (App Router), React 19, TypeScript e Tailwind CSS 4. As páginas são client-side (`"use client"`) e conversam com a API do backend por um único módulo, `src/lib/api.ts`. Visão geral do projeto, stack, endpoints e decisões técnicas: [`../README.md`](../README.md).

## 1. Como rodar

Pré-requisitos: Node.js 20 ou superior e o backend rodando (por padrão em `http://localhost:3001`).

```bash
cp .env.local.example .env.local   # ajuste NEXT_PUBLIC_API_URL se a API estiver em outro endereço
npm install
npm run dev                        # http://localhost:3000
```

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento. |
| `npm run build` | Build de produção (inclui a checagem de TypeScript). |
| `npm run start` | Serve o build de produção. |

O `next.config.ts` usa `output: "standalone"`: o build também gera `.next/standalone/server.js`, um servidor mínimo usado pela imagem Docker (`Dockerfile`, ver a seção Docker do [README da raiz](../README.md#13-docker)). `npm run start` continua funcionando.
| `npm run lint` | ESLint com `eslint-config-next`. |

## 2. Variáveis de ambiente

| Nome | Descrição |
|------|-----------|
| `NEXT_PUBLIC_API_URL` | URL base da API (padrão `http://localhost:3001`). Como começa com `NEXT_PUBLIC_`, é embutida no build e incluída no código enviado ao navegador: não coloque segredos aqui. |
| `API_INTERNAL_URL` | Opcional, só no servidor do Next: URL da API usada por `app/campaigns/[id]/layout.tsx` para montar o título da página. Sem ela, usa `NEXT_PUBLIC_API_URL`. Necessária no Docker, onde `localhost` é o próprio container (`http://backend:3001`). |

Modelo em `.env.local.example`. O `.env.local` não é versionado.

## 3. Estrutura de `src/`

```
src/
├── app/            Páginas e layouts (App Router).
├── components/     Componentes de interface.
├── contexts/       Estado global: sessão e recursos de IA ligados.
├── hooks/          Hooks reutilizáveis.
├── lib/            Acesso à API, regras de formulário, formatação e utilitários.
└── types/          Tipos das respostas da API.
```

O alias `@/` aponta para `src/` (ex.: `import { getCampaign } from "@/lib/api"`).

### 3.1 Páginas (`src/app/`)

| Arquivo | Rota | Descrição |
|---------|------|-----------|
| `layout.tsx` | todas | Layout raiz: fontes, `AuthProvider`, `FeaturesProvider`, `NavigationTracker`, `Navbar`, conteúdo e `ChatWidget`. Metadados padrão do site. |
| `globals.css` | — | Tailwind e classes reaproveitadas (`.input`, `.label`, `.card`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ai`, `.btn-ai-secondary`); regra que sobe o botão do chatbot quando há barra de ações fixa. |
| `page.tsx` | `/` | Lista de campanhas com busca por texto, filtro por categoria, paginação e "Busca inteligente" (só quando ligada). |
| `campaigns/[id]/page.tsx` | `/campaigns/:id` | Detalhe: capa, categoria, situação, selo de IA, descrição, progresso, prazo, doação, doadores, "Editar" (dono) e "Compartilhar". |
| `campaigns/[id]/layout.tsx` | `/campaigns/:id` | Layout de servidor com `generateMetadata`: busca título e descrição na API para a aba e para quem recebe o link. |
| `campaigns/new/page.tsx` | `/campaigns/new` | Criação (exige login) com o `CampaignForm`. |
| `campaigns/[id]/edit/page.tsx` | `/campaigns/:id/edit` | Edição (exige login; só o dono vê o formulário), encerrar e excluir. |
| `login/page.tsx` | `/login` | Entrar; aceita `?email=` (pré-preenche), `?next=` (volta para a página de origem, só caminhos internos) e `?reset=1` (aviso de senha redefinida). |
| `register/page.tsx` | `/register` | Cadastro; senha de 8 a 72 caracteres; com e-mail já cadastrado, mostra links para "Entrar" e "Esqueci minha senha". |
| `forgot-password/page.tsx` | `/forgot-password` | Pede o link de redefinição; aceita `?email=`. |
| `reset-password/page.tsx` | `/reset-password?token=` | Nova senha e confirmação. |
| `me/page.tsx` | `/me` | "Minha conta" (exige login): abas "Minhas campanhas" e "Minhas doações". |
| `me/layout.tsx` | `/me` | Metadados da página (componente de servidor). |

### 3.2 Contextos (`src/contexts/`)

| Arquivo | Descrição |
|---------|-----------|
| `AuthContext.tsx` | `AuthProvider` e `useAuth()`: usuário, token, `ready` (sessão já lida), `login`, `register` e `logout`. Restaura a sessão do `localStorage` e encerra a sessão quando a API recusa o token (evento disparado por `lib/api.ts`). |
| `FeaturesContext.tsx` | `FeaturesProvider` e `useFeatures()`: consulta `GET /config/features` uma vez ao abrir o site. Começa com tudo desligado (também em caso de erro) e controla a exibição da busca inteligente, da aba "Gerar com IA", dos botões de escrita por IA e do chatbot. |

### 3.3 Componentes (`src/components/`)

**Formulário de campanha**

| Componente | Descrição |
|------------|-----------|
| `CampaignForm.tsx` | Formulário compartilhado por criação e edição: validação por campo (só depois de sair do campo ou tentar enviar), contadores, barra de ações fixa ("Cancelar" e "Criar campanha"/"Salvar alterações"), aviso de alterações não salvas e pré-visualização. |
| `FormField.tsx` | Moldura do campo: rótulo, ação opcional, mensagem de erro ou dica e contador de caracteres. |
| `MoneyInput.tsx` | Meta com prefixo "R$" e máscara brasileira (`lib/money-input.ts`). |
| `DeadlineInput.tsx` | Prazo: `DatePicker` com mínimo de amanhã e atalhos de 30, 60 e 90 dias (o atalho da data escolhida fica destacado). |
| `DatePicker.tsx` | Calendário próprio em português: digitação dd/mm/aaaa com máscara, popover com navegação por mês e ano, dia atual destacado, dias antes do mínimo desabilitados, teclado (setas, PageUp/PageDown, Home/End, Enter, Esc), fecha ao clicar fora e não ultrapassa a borda da tela. |
| `CoverPicker.tsx` | Bloco da capa: abas "Enviar arquivo", "Gerar com IA" (só se ligada) e "Colar URL", com uma única área de pré-visualização. |
| `ImageDropzone.tsx` | Área 16:9 tracejada: arrastar e soltar ou clicar para escolher; selo e borda roxos na aba de IA; botão "Remover imagem". |
| `ImageField.tsx` | Aba "Colar URL". |
| `AiCoverGenerator.tsx` | "Gerar capa com IA": gerar, usar, gerar outra ou descartar a sugestão. |
| `DescriptionAssistant.tsx` | "Melhorar descrição com IA": mostra o texto original e a sugestão lado a lado; só troca com "Usar este texto". |
| `CategorySuggestion.tsx` | "Sugerir categoria": seleciona a categoria sugerida e mostra "Sugerida por IA. Você pode alterar." |
| `CampaignPreview.tsx` | "Como vai aparecer": o mesmo `CampaignCard` com os dados digitados (arrecadado = 0; "de R$ —" com a meta vazia). |

Os botões de IA mostram, só quando desabilitados, uma frase curta com o que falta (título e/ou descrição).

**Campanhas e doações**

| Componente | Descrição |
|------------|-----------|
| `CampaignCard.tsx` | Card da listagem (imagem 16:9, categoria, situação, título, progresso, valores e prazo); pode ser link ou só visual. |
| `CampaignFilters.tsx` | Busca por texto, filtro de categoria e opção "Busca inteligente" (só quando ligada). |
| `CampaignImage.tsx` | Imagem da campanha com `<img>` (aceita qualquer domínio) ou placeholder "Sem imagem". |
| `ProgressBar.tsx` | Barra de progresso (pode passar de 100%). |
| `StatusBadge.tsx` | Etiqueta "Ativa" / "Encerrada". |
| `AiBadge.tsx` | Selo "Capa gerada por IA". |
| `DonationPanel.tsx` | Decide se mostra o formulário de doação ou o motivo de não mostrar (não logado, dono, encerrada). |
| `DonationForm.tsx` | Valor e mensagem da doação simulada. |
| `DonorList.tsx` | Lista paginada de doadores. |
| `ShareButton.tsx` | "Compartilhar": Web Share API ou cópia do link com "Link copiado!". |
| `MyCampaignsTab.tsx` | Aba "Minhas campanhas": cards com Ver, Editar e Encerrar (com confirmação). |
| `MyDonationsTab.tsx` | Aba "Minhas doações": campanha, valor, mensagem e data. |

**Navegação, sessão e estrutura**

| Componente | Descrição |
|------------|-----------|
| `Navbar.tsx` | Barra superior; logado: "Minha conta", "Nova campanha" e "Sair"; visitante: "Entrar" e "Criar conta". |
| `BackButton.tsx` | Seta "Voltar" (acima do título das páginas internas): volta no histórico se veio de outra página do site; senão, vai para um endereço de reserva. |
| `NavigationTracker.tsx` | No layout, registra navegações internas que criam entrada no histórico (redirecionamentos com `replace` não contam). |
| `RequireAuth.tsx` | Protege páginas: sem login, redireciona para `/login?next=...`. |
| `PasswordInput.tsx` | Campo de senha com botão de olho (`aria-label` e `aria-pressed`), mantendo o `autoComplete` de cada tela. |
| `Pagination.tsx` | Botões "Anterior" / "Próxima". |
| `StatusMessage.tsx` | Mensagens padrão de carregamento, erro e lista vazia. |
| `ChatWidget.tsx` | Botão flutuante "Precisa de ajuda?" e janela do chatbot (só quando o chat está ligado); histórico em memória, respostas em texto puro. |

### 3.4 Hooks (`src/hooks/`)

| Arquivo | Descrição |
|---------|-----------|
| `useImageUpload.ts` | Validação no navegador (JPEG, PNG ou WebP, até 5 MB) e envio da capa; usado pelo `CoverPicker`. O backend valida de novo pelos bytes. |
| `useUnsavedChangesWarning.ts` | Pede confirmação ao sair com alterações não salvas: fechar/recarregar a aba, clicar em links do site, "Voltar" e "Cancelar". O botão "voltar" do navegador não pode ser bloqueado de forma confiável. |

### 3.5 Bibliotecas (`src/lib/`)

| Arquivo | Descrição |
|---------|-----------|
| `api.ts` | Único ponto de acesso à API: `request()` monta a URL, envia JSON ou `FormData`, anexa o token, converte `{ error }` em `ApiError` e, em 401 por token recusado, encerra a sessão ("Sua sessão expirou. Entre novamente."). Exporta uma função por endpoint. |
| `session.ts` | Lê, grava e apaga a sessão (usuário + token) no `localStorage`; o comentário do arquivo explica o trade-off de segurança. |
| `campaign-rules.ts` | Mesmos limites do backend (título 3 a 120, descrição 10 a 5000, meta de R$ 0,01 a R$ 9.999.999.999,99, prazo a partir de hoje em Brasília, categoria obrigatória) e a dica do que falta para usar a IA. |
| `password-rules.ts` | Regra de senha (8 a 72 caracteres) com a mesma mensagem do backend. |
| `money-input.ts` | Máscara de dinheiro (dígitos viram centavos) e conversão para o formato da API (`"5000.00"`) e de volta. |
| `date-input.ts` | Datas no formato `AAAA-MM-DD` (enviadas assim à API), "hoje" e atalhos de prazo sempre no fuso America/Sao_Paulo (`todayInSaoPaulo`, `daysFromToday`, `diffCalendarDays`, mesma regra de `backend/src/lib/dates.ts`), formato dd/mm/aaaa, máscara de digitação e utilitários do calendário. |
| `format.ts` | Moeda (R$), datas (prazo no fuso de Brasília) e o texto do prazo a partir de `daysLeft`/`expired` do backend ("N dias restantes", "1 dia restante", "Último dia", "Prazo encerrado"). |
| `email-param.ts` | E-mail passado pela URL (`?email=`): só aceita formato de e-mail. |
| `navigation.ts` | Marca na `sessionStorage` se houve navegação interna (usada pelo `BackButton`). |
| `unsaved-changes.ts` | Registro de "há alterações não salvas", consultado por "Voltar" e "Cancelar". |

### 3.6 Tipos (`src/types/`)

`campaign.ts` (campanha, detalhe, filtros, entrada de criação/edição, itens de "Minhas campanhas"), `category.ts`, `donation.ts` (doação da campanha, entrada e itens de "Minhas doações"), `user.ts` (usuário e resposta de login), `chat.ts`, `features.ts` e `pagination.ts` (`{ data, meta }`). Valores monetários chegam como string com 2 casas.

## 4. Convenções

- Toda chamada à API passa por `lib/api.ts`; componentes não usam `fetch` direto (exceção: `campaigns/[id]/layout.tsx`, que roda no servidor para os metadados).
- Textos da interface em português.
- Recursos de IA aparecem só quando `useFeatures()` indica que estão ligados; sem eles, a busca por texto e o formulário funcionam normalmente.
- Imagens de campanha (inclusive SVG gerado por IA) são exibidas sempre com `<img>`, nunca como HTML.
- Acessibilidade: rótulos associados aos campos, mensagens de erro ligadas por `aria-describedby`, foco visível e navegação por teclado no calendário e nas abas.
