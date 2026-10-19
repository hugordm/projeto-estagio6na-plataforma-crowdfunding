"use client";

import { useEffect } from "react";
import { confirmLeave, setUnsavedChanges } from "@/lib/unsaved-changes";

// Enquanto "dirty" for true, pede confirmação antes de sair da página:
// - fechar/recarregar a aba (aviso padrão do navegador, via beforeunload);
// - clicar em qualquer link do site (ex.: menu do topo);
// - botões "Voltar" e "Cancelar" (consultam o mesmo registro em lib/unsaved-changes.ts).
// Limitação: o botão "voltar" do próprio navegador não pode ser bloqueado de forma confiável.
export function useUnsavedChangesWarning(dirty: boolean): void {
  useEffect(() => {
    setUnsavedChanges(dirty);
    if (!dirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    // Fase de captura no document: roda antes do clique chegar ao <Link> do Next.
    function handleLinkClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link || link.getAttribute("target") === "_blank" || event.ctrlKey || event.metaKey) return;
      if (!confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      setUnsavedChanges(false);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [dirty]);
}
