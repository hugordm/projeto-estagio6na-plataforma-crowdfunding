"use client";

import { useState } from "react";
import { errorMessage, improveDescription } from "@/lib/api";
import { aiMissingHint } from "@/lib/campaign-rules";
import { ErrorMessage } from "./StatusMessage";

type DescriptionAssistantProps = {
  title: string;
  description: string;
  categoryName?: string;
  onUse: (text: string) => void;
};

// "Melhorar descrição com IA": mostra a sugestão ao lado do texto atual e só troca
// a descrição se a pessoa clicar em "Usar este texto". Nunca sobrescreve sozinho.
export function DescriptionAssistant({ title, description, categoryName, onUse }: DescriptionAssistantProps) {
  const [suggestion, setSuggestion] = useState("");
  const [original, setOriginal] = useState(""); // texto que foi enviado para a IA
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const missing = aiMissingHint(title, description); // "" = pode usar a IA

  async function handleImprove() {
    setError("");
    setLoading(true);
    try {
      const sent = description.trim();
      const { description: improved } = await improveDescription({ title: title.trim(), description: sent, category: categoryName });
      setOriginal(sent);
      setSuggestion(improved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleUse() {
    onUse(suggestion);
    setSuggestion("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-ai-secondary px-3 py-1.5 text-xs"
          onClick={handleImprove}
          disabled={Boolean(missing) || loading}
          aria-describedby={missing ? "description-ai-hint" : undefined}
        >
          {loading ? "Melhorando..." : "Melhorar descrição com IA"}
        </button>
        {missing && (
          <span id="description-ai-hint" className="text-xs text-zinc-500">
            {missing}
          </span>
        )}
      </div>

      {error && <ErrorMessage message={error} />}

      {suggestion && (
        <div className="space-y-3 rounded-md border border-violet-200 bg-violet-50/60 p-3" aria-live="polite">
          <p className="text-sm font-medium text-violet-900">Compare antes de usar:</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-zinc-600">Seu texto</p>
              <p className="rounded bg-white p-2 text-sm whitespace-pre-wrap text-zinc-700">{original}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-violet-800">Sugestão da IA</p>
              <p className="rounded bg-white p-2 text-sm whitespace-pre-wrap text-zinc-900">{suggestion}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-600">Confira se a sugestão não mudou nenhum fato da sua campanha.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={handleUse}>
              Usar este texto
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setSuggestion("")}>
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
