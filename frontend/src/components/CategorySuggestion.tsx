"use client";

import { useState } from "react";
import { errorMessage, suggestCategory } from "@/lib/api";
import { aiMissingHint } from "@/lib/campaign-rules";

type CategorySuggestionProps = {
  title: string;
  description: string;
  onSuggest: (categoryId: number) => void;
};

// Botão "Sugerir categoria" (fica ao lado do rótulo do campo de categoria), no mesmo estilo
// do "Melhorar descrição com IA". Enquanto estiver desabilitado, diz o que falta.
export function CategorySuggestion({ title, description, onSuggest }: CategorySuggestionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const missing = aiMissingHint(title, description); // "" = pode usar a IA

  async function handleClick() {
    setError("");
    setLoading(true);
    try {
      const { categoryId } = await suggestCategory({ title: title.trim(), description: description.trim() });
      onSuggest(categoryId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-2 text-xs">
      {error && (
        <span role="alert" className="text-red-700">
          {error}
        </span>
      )}
      {missing && (
        <span id="category-ai-hint" className="text-zinc-500">
          {missing}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={Boolean(missing) || loading}
        aria-describedby={missing ? "category-ai-hint" : undefined}
        className="btn btn-ai-secondary px-3 py-1.5 text-xs"
      >
        {loading ? "Sugerindo..." : "Sugerir categoria"}
      </button>
    </span>
  );
}
