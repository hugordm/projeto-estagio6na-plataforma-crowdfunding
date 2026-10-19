"use client";

import { useState } from "react";
import { useFeatures } from "@/contexts/FeaturesContext";
import { IMAGE_RULES_TEXT, useImageUpload } from "@/hooks/useImageUpload";
import { AiCoverGenerator } from "./AiCoverGenerator";
import { ImageDropzone, SparkIcon } from "./ImageDropzone";
import { ImageField } from "./ImageField";
import { ErrorMessage } from "./StatusMessage";

type Tab = "file" | "ai" | "url";

const TABS: { id: Tab; label: string }[] = [
  { id: "file", label: "Enviar arquivo" },
  { id: "ai", label: "Gerar com IA" },
  { id: "url", label: "Colar URL" },
];

type CoverPickerProps = {
  value: string; // URL da capa escolhida ("" = sem capa)
  onChange: (url: string, fromAi: boolean) => void; // fromAi: a capa veio do gerador de IA
  title: string;
  description: string;
  categoryId: string;
};

// Bloco único da imagem de capa: abas para escolher a origem e UMA área de pré-visualização
// (ImageDropzone), que também aceita arrastar e soltar ou clicar para escolher um arquivo.
// A aba "Gerar com IA" só aparece quando a capa por IA está configurada no servidor.
export function CoverPicker({ value, onChange, title, description, categoryId }: CoverPickerProps) {
  const { aiCover } = useFeatures();
  const [selectedTab, setTab] = useState<Tab>("file");
  const tab: Tab = selectedTab === "ai" && !aiCover ? "file" : selectedTab; // aba de IA some se o recurso desligar
  const tabs = aiCover ? TABS : TABS.filter((item) => item.id !== "ai");
  const [candidate, setCandidate] = useState(""); // sugestão da IA ainda não aceita
  const { upload, uploading, error: uploadError, clearError } = useImageUpload((url) => onChange(url, false));

  function selectTab(next: Tab) {
    setTab(next);
    setCandidate(""); // sugestão pendente só vale na aba de IA
    clearError();
  }

  // Arquivo escolhido ou solto na área, em qualquer aba: vai para a aba "Enviar arquivo".
  function handleFile(file: File) {
    if (tab !== "file") selectTab("file");
    upload(file);
  }

  const aiMode = tab === "ai";

  return (
    <fieldset className="space-y-3">
      <legend className="label">Imagem de capa (opcional)</legend>

      <div role="tablist" aria-label="Origem da imagem de capa" className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`cover-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="cover-panel"
            onClick={() => selectTab(item.id)}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap sm:px-3 sm:text-sm ${
              tab === item.id
                ? `bg-white shadow-sm ${item.id === "ai" ? "text-violet-800" : "text-emerald-800"}`
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {item.id === "ai" && <SparkIcon />}
            {item.label}
          </button>
        ))}
      </div>

      <ImageDropzone
        src={candidate || value}
        alt={candidate ? "Capa sugerida pela IA" : "Pré-visualização da capa"}
        emptyText={aiMode ? "A capa gerada pela IA aparece aqui" : "Arraste uma imagem ou clique para escolher"}
        aiMode={aiMode}
        candidate={Boolean(candidate)}
        uploading={uploading}
        canPick={!aiMode}
        onFile={handleFile}
        onRemove={() => onChange("", false)}
      />

      <div id="cover-panel" role="tabpanel" aria-labelledby={`cover-tab-${tab}`} className="space-y-2">
        {tab === "file" && <p className="text-xs text-zinc-500">{IMAGE_RULES_TEXT}</p>}
        {tab === "url" && <ImageField onChange={(url) => onChange(url, false)} />}
        {tab === "ai" && (
          <AiCoverGenerator
            title={title}
            description={description}
            categoryId={categoryId}
            candidate={candidate}
            onCandidateChange={setCandidate}
            onAccept={(url) => onChange(url, true)}
          />
        )}
        {uploadError && <ErrorMessage message={uploadError} />}
      </div>
    </fieldset>
  );
}
