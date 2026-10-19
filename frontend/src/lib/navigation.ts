// Pilha das páginas do site visitadas nesta aba, na mesma ordem do histórico do navegador.
// Quem mantém a pilha é o NavigationTracker (no layout); quem usa é o botão "Voltar" (e o "Cancelar"),
// para decidir o destino sem depender de um router.back() "cego".
// Fica na sessionStorage: sobrevive a recarregar a página e é separada por aba.

const KEY = "crowdfunding:pilha-de-navegacao";
const MAX_ENTRIES = 50; // mesmo limite prático do histórico dos navegadores

// Páginas que o "Voltar" pula: formulários e telas de autenticação. Voltar para elas
// (ex.: da campanha recém-criada para o formulário vazio) não faz sentido para quem navega.
const SKIPPED_PAGES = [
  /^\/campaigns\/new$/,
  /^\/campaigns\/\d+\/edit$/,
  /^\/login$/,
  /^\/register$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
];

export function isSkippedPage(path: string): boolean {
  return SKIPPED_PAGES.some((pattern) => pattern.test(path));
}

function readStack(): string[] {
  try {
    const stack = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(stack) ? stack.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-MAX_ENTRIES)));
  } catch {
    // sessionStorage indisponível: o "Voltar" usa o endereço de reserva.
  }
}

// Como a página atual entrou no histórico:
// - "push": navegação nova (link ou router.push) -> empilha;
// - "replace": redirecionamento que substitui a entrada atual (router.replace) -> troca o topo;
// - "pop": botão voltar/avançar do navegador (ou o próprio "Voltar") -> volta a pilha até a página.
export function recordNavigation(path: string, kind: "push" | "replace" | "pop"): void {
  const stack = readStack();

  if (kind === "pop") {
    const index = stack.lastIndexOf(path, stack.length - 2);
    if (index !== -1) {
      writeStack(stack.slice(0, index + 1));
      return;
    }
    // Não estava na pilha (ex.: "avançar"): trata como navegação nova.
  }

  if (kind === "replace" && stack.length > 0) stack[stack.length - 1] = path;
  else if (stack[stack.length - 1] !== path) stack.push(path);
  writeStack(stack);
}

// Garante que a página atual está no topo (primeira página aberta na aba, ou após recarregar).
// Histórico com uma única entrada = aba nova ou link aberto direto: a pilha recomeça
// (o navegador pode ter copiado a sessionStorage da aba de origem).
export function recordInitialPage(path: string): void {
  const stack = window.history.length <= 1 ? [] : readStack();
  if (stack[stack.length - 1] !== path) writeStack([...stack, path]);
  else writeStack(stack);
}

// Volta para a entrada válida mais recente da pilha (pulando as páginas de SKIPPED_PAGES e a própria
// página atual repetida). Se não houver nenhuma (ex.: link aberto direto), vai para o endereço de reserva.
export function goBack(router: { push(href: string): void }, fallbackHref = "/"): void {
  const stack = readStack();
  const current = stack[stack.length - 1];

  for (let index = stack.length - 2; index >= 0; index--) {
    const path = stack[index];
    if (path === current || isSkippedPage(path)) continue;
    const steps = stack.length - 1 - index; // ex.: 1, ou 2 para pular o formulário
    if (steps > window.history.length - 1) break; // a pilha não bate com o histórico desta aba
    window.history.go(-steps);
    return;
  }
  router.push(fallbackHref);
}
