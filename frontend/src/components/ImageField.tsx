"use client";

import { useState, type ChangeEvent } from "react";
import { errorMessage, uploadCampaignImage } from "@/lib/api";
import { CampaignImage } from "./CampaignImage";
import { ErrorMessage } from "./StatusMessage";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ImageFieldProps = {
  value: string; // URL atual da imagem ("" = sem imagem)
  onChange: (url: string) => void;
};

// Campo da imagem de capa: envio de arquivo (com pré-visualização) ou, como alternativa, colar uma URL.
export function ImageField({ value, onChange }: ImageFieldProps) {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;

    // Checagem rápida no navegador; o backend valida de novo pelo conteúdo do arquivo.
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato não suportado. Envie uma imagem JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Imagem muito grande. O tamanho máximo é 5 MB.");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const { url } = await uploadCampaignImage(file);
      onChange(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

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
      <span className="label">Imagem de capa (opcional)</span>

      {value ? (
        <div className="space-y-2">
          <CampaignImage src={value} alt="Pré-visualização da capa" className="h-48 w-full rounded-md border border-zinc-200" />
          <button type="button" className="btn btn-secondary" onClick={() => onChange("")}>
            Remover imagem
          </button>
        </div>
      ) : mode === "file" ? (
        <div className="space-y-1">
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            aria-label="Escolher imagem de capa"
            disabled={uploading}
            onChange={handleFile}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-emerald-800 hover:file:bg-emerald-100"
          />
          <p className="text-xs text-zinc-500">JPEG, PNG ou WebP, até 5 MB.</p>
          {uploading && <p className="text-sm text-zinc-600">Enviando imagem...</p>}
          <button type="button" className="text-sm text-emerald-700 underline" onClick={() => setMode("url")}>
            Prefiro colar o endereço (URL) de uma imagem
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://..."
              aria-label="URL da imagem"
              className="input"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
            />
            <button type="button" className="btn btn-secondary" onClick={applyUrl}>
              Usar
            </button>
          </div>
          <button type="button" className="text-sm text-emerald-700 underline" onClick={() => setMode("file")}>
            Enviar um arquivo do computador
          </button>
        </div>
      )}

      {error && <ErrorMessage message={error} />}
    </div>
  );
}
