"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { markInternalNavigation } from "@/lib/navigation";

// Fica no layout e não desenha nada: quando a página muda dentro do site e isso cria uma nova
// entrada no histórico (router.push ou clique em link), registra que existe histórico interno
// para o botão "Voltar". Redirecionamentos com router.replace (ex.: RequireAuth mandando para
// /login) não aumentam o histórico e por isso não contam: voltar ali sairia do site.
export function NavigationTracker() {
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  const historyLength = useRef<number | null>(null);

  useEffect(() => {
    const previousLength = historyLength.current;
    historyLength.current = window.history.length;
    if (pathname === firstPath.current || previousLength === null) return;
    if (window.history.length > previousLength) markInternalNavigation();
  }, [pathname]);

  return null;
}
