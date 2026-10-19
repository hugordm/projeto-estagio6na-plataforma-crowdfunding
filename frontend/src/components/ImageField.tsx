"use client";

import { useState } from "react";
import { ErrorMessage } from "./StatusMessage";

type ImageFieldProps = {
  onChange: (url: string) => void;
};

// Aba "Colar URL" da capa: endereço de uma imagem da internet. A pré-visualização fica no CoverPicker;
// o envio de arquivo (clique ou arrastar e soltar) fica na área da capa (ImageDropzone).
export function ImageField({ onChange }: ImageFieldProps) {
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState("");

  function applyUrl() {
    const url = urlDraft.trim();
    if (!/^https?:\/\/\S+$/.test(url)) {
      setError("Informe uma URL começando com http:// ou https://");
      return;
    }
    setError("");
    setUrlDraft("");
    onChange(url);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://exemplo.com/minha-imagem.jpg"
          aria-label="URL da imagem"
          className="input"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={applyUrl}>
          Usar
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
