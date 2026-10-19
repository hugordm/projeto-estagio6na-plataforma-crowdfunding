"use client";

import { useState } from "react";
import { errorMessage, generateAiCover } from "@/lib/api";
import { CampaignImage } from "./CampaignImage";
import { ErrorMessage } from "./StatusMessage";

type AiCoverGeneratorProps = {
  title: string;
  description: string;
  categoryId: string; // "" quando ainda não escolhida
  onAccept: (url: string) => void;
};

// Botão "Gerar capa com IA": gera uma sugestão, mostra a pré-visualização
// e deixa o usuário usar a capa, gerar outra ou descartar.
export function AiCoverGenerator({ title, description, categoryId, onAccept }: AiCoverGeneratorProps) {
  const [candidate, setCandidate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Mesmos mínimos do backend para título e descrição.
  const canGenerate = title.trim().length >= 3 && description.trim().length >= 10;

  async function handleGenerate() {
    setError("");
    setGenerating(true);
    try {
      const { url } = await generateAiCover({
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId ? Number(categoryId) : undefined,
      });
      setCandidate(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  function handleAccept() {
    onAccept(candidate);
    setCandidate("");
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-violet-300 bg-violet-50/50 p-3">
      {candidate ? (
        <>
          <CampaignImage src={candidate} alt="Capa sugerida pela IA" className="h-48 w-full rounded-md" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={handleAccept} disabled={generating}>
              Usar esta capa
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleGenerate} disabled={generating}>
              {generating ? "Gerando..." : "Gerar outra"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setCandidate("")} disabled={generating}>
              Descartar
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-ai"
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
          >
            {generating ? "Gerando capa..." : "Gerar capa com IA"}
          </button>
          <span className="text-xs text-zinc-600">
            {generating
              ? "Isso pode levar alguns segundos."
              : canGenerate
                ? "A IA cria uma ilustração a partir do título, da descrição e da categoria."
                : "Preencha o título e a descrição para gerar uma capa."}
          </span>
        </div>
      )}

      {error && <ErrorMessage message={error} />}
    </div>
  );
}
