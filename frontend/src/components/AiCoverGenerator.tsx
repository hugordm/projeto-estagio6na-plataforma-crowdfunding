"use client";

import { useState } from "react";
import { errorMessage, generateAiCover } from "@/lib/api";
import { aiMissingHint } from "@/lib/campaign-rules";
import { ErrorMessage } from "./StatusMessage";

type AiCoverGeneratorProps = {
  title: string;
  description: string;
  categoryId: string; // "" quando ainda não escolhida
  candidate: string; // sugestão atual da IA ("" = nenhuma); a imagem aparece na pré-visualização do CoverPicker
  onCandidateChange: (url: string) => void;
  onAccept: (url: string) => void;
};

// Botão "Gerar capa com IA" e as ações sobre a sugestão: usar, gerar outra ou descartar.
export function AiCoverGenerator({ title, description, categoryId, candidate, onCandidateChange, onAccept }: AiCoverGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const missing = aiMissingHint(title, description); // "" = pode gerar

  async function handleGenerate() {
    setError("");
    setGenerating(true);
    try {
      const { url } = await generateAiCover({
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId ? Number(categoryId) : undefined,
      });
      onCandidateChange(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  function handleAccept() {
    onAccept(candidate);
    onCandidateChange("");
  }

  return (
    <div className="space-y-2">
      {candidate ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={handleAccept} disabled={generating}>
            Usar esta capa
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleGenerate} disabled={generating}>
            {generating ? "Gerando..." : "Gerar outra"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onCandidateChange("")} disabled={generating}>
            Descartar
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-ai"
            onClick={handleGenerate}
            disabled={Boolean(missing) || generating}
            aria-describedby={missing ? "cover-ai-hint" : undefined}
          >
            {generating ? "Gerando capa..." : "Gerar capa com IA"}
          </button>
          {/* Texto só com o botão desabilitado: o que falta, ou o aviso de espera durante a geração. */}
          {(missing || generating) && (
            <span id="cover-ai-hint" className="text-xs text-zinc-600" aria-live="polite">
              {generating ? "Isso pode levar alguns segundos." : missing}
            </span>
          )}
        </div>
      )}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
