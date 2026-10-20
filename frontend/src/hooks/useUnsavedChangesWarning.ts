"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmLeave, setUnsavedChanges } from "@/lib/unsaved-changes";

// Enquanto "dirty" for true, pede confirmação antes de sair da página:
// - fechar/recarregar a aba: aviso padrão do navegador, via beforeunload (o navegador não deixa
//   estilizar nem trocar essa caixa);
// - clicar em qualquer link do site (ex.: menu do topo): modal do ConfirmProvider;
// - botões "Voltar" e "Cancelar" (consultam o mesmo registro em lib/unsaved-changes.ts).
// Limitação: o botão "voltar" do próprio navegador não pode ser bloqueado de forma confiável.
export function useUnsavedChangesWarning(dirty: boolean): void {
  const router = useRouter();

  useEffect(() => {
    setUnsavedChanges(dirty);
    if (!dirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    // Fase de captura no document: roda antes do clique chegar ao <Link> do Next. O modal é
    // assíncrono, então a navegação é sempre interrompida aqui e refeita se a pessoa confirmar.
    function handleLinkClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      event.preventDefault();
      event.stopPropagation();
      const url = new URL(link.href);
      void confirmLeave().then((ok) => {
        if (!ok) return;
        if (url.origin === window.location.origin) {
          router.push(url.pathname + url.search + url.hash);
        } else {
          // Já confirmado no modal: sem o beforeunload, o navegador não pergunta de novo.
          window.removeEventListener("beforeunload", handleBeforeUnload);
          window.location.assign(url.href);
        }
      });
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      setUnsavedChanges(false);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [dirty, router]);
}
