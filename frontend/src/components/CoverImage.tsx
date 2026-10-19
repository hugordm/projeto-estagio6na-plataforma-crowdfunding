"use client";

import { useState } from "react";
import { AiBadge } from "./AiBadge";

type CoverImageProps = {
  src: string | null;
  alt: string;
  size: "card" | "detail" | "preview"; // card da listagem, página da campanha, área da capa no formulário
  aiGenerated?: boolean; // mostra o selo "Capa gerada por IA" sobre a imagem
};

// Arredondamento por uso: o card já recorta os cantos (overflow-hidden); a área do formulário
// tem a própria borda tracejada.
const ROUNDED: Record<CoverImageProps["size"], string> = {
  card: "",
  detail: "rounded-lg",
  preview: "",
};

// Capa da campanha sempre em 16:9 e inteira, sem cortes: a imagem fica com object-contain e,
// atrás dela, a mesma imagem ampliada, desfocada e escurecida preenche as sobras (sem faixas vazias),
// seja ela horizontal, vertical, quadrada ou um SVG gerado por IA.
//
// Usamos <img> comum em vez de next/image porque a URL é digitada pelo usuário e pode vir de qualquer
// domínio; o next/image exigiria liberar cada domínio no next.config. O SVG da IA também é exibido
// com <img>, que não executa scripts.
export function CoverImage({ src, alt, size, aiGenerated = false }: CoverImageProps) {
  // URL que falhou ao carregar: mostra o placeholder até a URL mudar.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && src !== failedSrc;

  return (
    // preview ocupa a área da capa do formulário, que já tem proporção 16:9 (e borda).
    <div
      className={`relative w-full overflow-hidden ${size === "preview" ? "h-full" : "aspect-video"} ${ROUNDED[size]} ${
        showImage ? "bg-zinc-900" : "bg-emerald-50"
      }`}
    >
      {showImage && src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- fundo decorativo, mesma URL (vem do cache) */}
          <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} onError={() => setFailedSrc(src)} className="relative h-full w-full object-contain" />
        </>
      ) : (
        <div className={`flex h-full items-center justify-center text-emerald-700 ${size === "detail" ? "text-base" : "text-sm"}`}>
          Sem imagem
        </div>
      )}
      {aiGenerated && showImage && (
        <div className="absolute bottom-2 left-2">
          <AiBadge />
        </div>
      )}
    </div>
  );
}
