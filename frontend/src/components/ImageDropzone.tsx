"use client";

import { useRef, useState, type DragEvent } from "react";
import { ACCEPTED_IMAGE_TYPES } from "@/hooks/useImageUpload";
import { CoverImage } from "./CoverImage";

type ImageDropzoneProps = {
  src: string; // imagem mostrada ("" = vazia)
  alt: string;
  emptyText: string;
  aiMode: boolean; // aba "Gerar com IA": borda e selo roxos
  candidate: boolean; // a imagem é uma sugestão da IA ainda não aplicada
  uploading: boolean;
  canPick: boolean; // clique abre o seletor de arquivos
  onFile: (file: File) => void;
  onRemove?: () => void; // mostra o botão "Remover imagem"
};

// Área da capa: caixa tracejada 16:9 (mesma proporção do card) com a pré-visualização.
// Aceita arrastar e soltar uma imagem e, quando canPick, clique para escolher o arquivo.
export function ImageDropzone(props: ImageDropzoneProps) {
  const { src, alt, emptyText, aiMode, candidate, uploading, canPick, onFile, onRemove } = props;
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0); // dragenter/dragleave disparam também nos elementos internos

  function handleDragEnter(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault(); // sem isso o navegador abre o arquivo na aba
    dragDepth.current = 0;
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !uploading) onFile(file);
  }

  const border = dragging
    ? "border-emerald-600 bg-emerald-50"
    : aiMode
      ? "border-violet-400 bg-violet-50/60"
      : "border-zinc-300 bg-zinc-50";

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative aspect-video w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors focus-within:ring-2 focus-within:ring-emerald-600 ${border}`}
    >
      {src ? (
        <CoverImage src={src} alt={alt} size="preview" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-zinc-600">
          <ImageIcon />
          <span>{dragging ? "Solte a imagem aqui" : emptyText}</span>
        </div>
      )}

      {/* Rótulo cobrindo a área: o clique (ou Enter/Espaço no campo, que é focável) abre o seletor. */}
      {canPick && (
        <label className="absolute inset-0 cursor-pointer">
          <span className="sr-only">Escolher imagem de capa</span>
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            disabled={uploading}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // permite escolher o mesmo arquivo de novo
              if (file) onFile(file);
            }}
          />
        </label>
      )}

      {aiMode && (
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">
          <SparkIcon /> {candidate ? "Sugestão da IA (ainda não aplicada)" : "IA"}
        </span>
      )}

      {onRemove && src && !candidate && (
        <button type="button" onClick={onRemove} className="btn btn-secondary absolute top-2 right-2 z-10 px-3 py-1 text-xs">
          Remover imagem
        </button>
      )}

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-medium text-zinc-700" aria-live="polite">
          Enviando imagem...
        </div>
      )}
    </div>
  );
}

function ImageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7L12 2z" />
    </svg>
  );
}
