"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordInitialPage, recordNavigation } from "@/lib/navigation";

// Fica no layout e não desenha nada: mantém a pilha de páginas visitadas (lib/navigation.ts)
// alinhada ao histórico do navegador, para o botão "Voltar" escolher o destino.
// Como cada mudança de página entrou no histórico:
// - evento popstate antes da mudança -> voltar/avançar do navegador;
// - history.length aumentou -> navegação nova (link ou router.push);
// - history.length igual -> router.replace (ex.: RequireAuth mandando para /login).
export function NavigationTracker() {
  const pathname = usePathname();
  const historyLength = useRef<number | null>(null);
  const popped = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const previousLength = historyLength.current;
    historyLength.current = window.history.length;

    if (previousLength === null) {
      recordInitialPage(pathname);
    } else if (popped.current) {
      recordNavigation(pathname, "pop");
    } else {
      recordNavigation(pathname, window.history.length > previousLength ? "push" : "replace");
    }
    popped.current = false;
  }, [pathname]);

  return null;
}
