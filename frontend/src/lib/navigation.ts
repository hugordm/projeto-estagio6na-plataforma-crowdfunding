// Guarda (nesta aba) se o usuário já navegou entre páginas do próprio site.
// Serve para o botão "Voltar" decidir entre router.back() e um link de reserva: se a pessoa chegou
// direto por um link externo, voltar no histórico a tiraria do site.

const KEY = "crowdfunding:navegou-no-site";

export function markInternalNavigation(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // sessionStorage indisponível: o botão usa o link de reserva.
  }
}

export function hasInternalHistory(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1" && window.history.length > 1;
  } catch {
    return false;
  }
}

// Volta no histórico quando houver página anterior do site; senão vai para o endereço de reserva.
export function goBack(router: { back(): void; push(href: string): void }, fallbackHref: string): void {
  if (hasInternalHistory()) router.back();
  else router.push(fallbackHref);
}
