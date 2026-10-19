// Descobre o tipo da imagem pelos primeiros bytes do arquivo ("assinatura" ou magic number),
// sem confiar na extensão nem no Content-Type enviados pelo cliente.

export type ImageType = { extension: 'jpg' | 'png' | 'webp' | 'svg'; mimeType: string };

// SVG não tem assinatura binária e pode conter scripts, por isso NUNCA é aceito em upload:
// detectImageType() só reconhece JPEG, PNG e WebP. O único SVG que o sistema guarda é a capa
// gerada pela IA, já reconstruída por svg-sanitize.ts antes de ser salva.
export const GENERATED_SVG: ImageType = { extension: 'svg', mimeType: 'image/svg+xml' };

export function isSvgUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.svg');
  } catch {
    return false;
  }
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

export function detectImageType(buffer: Buffer): ImageType | null {
  // JPEG: FF D8 FF
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { extension: 'jpg', mimeType: 'image/jpeg' };

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: 'png', mimeType: 'image/png' };
  }

  // WebP: "RIFF" (bytes 0-3) + tamanho (4-7) + "WEBP" (bytes 8-11)
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { extension: 'webp', mimeType: 'image/webp' };
  }

  return null;
}
