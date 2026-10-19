"use client";

import { useState } from "react";

type ShareButtonProps = {
  title: string;
  text?: string;
};

// "Compartilhar": usa o menu nativo de compartilhamento (Web Share API) quando o navegador tem;
// senão copia o link da página e mostra "Link copiado!".
export function ShareButton({ title, text }: ShareButtonProps) {
  const [feedback, setFeedback] = useState("");

  function show(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback(""), 3000);
  }

  async function handleClick() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // A pessoa fechou o menu de compartilhamento: não é erro.
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Outra falha: tenta copiar o link abaixo.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      show("Link copiado!");
    } catch {
      show("Não foi possível copiar. Copie o endereço da barra do navegador.");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleClick} className="btn btn-secondary">
        Compartilhar
      </button>
      <span role="status" aria-live="polite" className="text-sm text-emerald-700">
        {feedback}
      </span>
    </span>
  );
}
