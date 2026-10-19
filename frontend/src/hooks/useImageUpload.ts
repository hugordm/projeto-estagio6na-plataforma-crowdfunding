"use client";

import { useState } from "react";
import { errorMessage, uploadCampaignImage } from "@/lib/api";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_RULES_TEXT = "JPEG, PNG ou WebP, até 5 MB.";

// Checagem rápida no navegador; o backend valida de novo pelo conteúdo do arquivo.
// Devolve a mensagem de erro, ou "" se o arquivo pode ser enviado.
export function validateImageFile(file: File): string {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Formato não suportado. Envie uma imagem JPEG, PNG ou WebP.";
  if (file.size > MAX_IMAGE_BYTES) return "Imagem muito grande. O tamanho máximo é 5 MB.";
  return "";
}

// Envio da imagem de capa (escolhida no seletor de arquivos ou arrastada para a área da capa).
export function useImageUpload(onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    const problem = validateImageFile(file);
    setError(problem);
    if (problem) return;

    setUploading(true);
    try {
      const { url } = await uploadCampaignImage(file);
      onUploaded(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error, clearError: () => setError("") };
}
