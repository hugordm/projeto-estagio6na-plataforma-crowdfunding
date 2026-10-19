"use client";

import { useRouter } from "next/navigation";
import { goBack } from "@/lib/navigation";
import { confirmLeave } from "@/lib/unsaved-changes";

type BackButtonProps = {
  fallbackHref: string; // para onde ir quando não há página anterior dentro do site
};

// Seta "Voltar": volta no histórico se a pessoa veio de outra página do site;
// senão (ex.: abriu o link direto), leva ao endereço de reserva.
// Se a página tiver alterações não salvas (formulário), pede confirmação antes.
export function BackButton({ fallbackHref }: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (confirmLeave()) goBack(router, fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Voltar para a página anterior"
      className="mb-4 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-zinc-600 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      <span aria-hidden="true">←</span> Voltar
    </button>
  );
}
