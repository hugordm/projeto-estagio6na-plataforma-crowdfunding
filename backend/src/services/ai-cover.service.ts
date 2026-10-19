import { HttpError } from '../lib/http-error';
import { detectImageType } from '../lib/image-type';
import { generateImage, OpenRouterError } from '../lib/openrouter';
import { completeImageGeneration, releaseImageGeneration, reserveImageGeneration } from './ai-usage.service';
import { saveImage } from './storage.service';

export type CoverInput = { title: string; description: string; categoryName: string };

const MAX_DESCRIPTION_CHARS = 600;

// O prompt é montado SÓ no backend, com regras fixas; o usuário fornece apenas os dados da campanha.
// Fica em inglês porque os modelos de imagem seguem melhor instruções em inglês.
export function buildCoverPrompt({ title, description, categoryName }: CoverInput): string {
  const context = description.replace(/\s+/g, ' ').slice(0, MAX_DESCRIPTION_CHARS);
  return [
    'Flat, colorful editorial illustration to be used as the cover image of a crowdfunding campaign.',
    `Category: ${categoryName}. Campaign title (Portuguese): "${title}". Campaign summary (Portuguese): "${context}".`,
    'Style: friendly and optimistic illustration, soft colors, clean shapes, simple composition, wide 16:9 framing.',
    'Strict rules: absolutely no text, letters, numbers, captions, logos or watermarks anywhere in the image.',
    'Do not depict real or famous people; if people appear, they must be generic, stylized characters.',
  ].join('\n');
}

// Mensagem para o usuário conforme o tipo de falha da IA (detalhes técnicos só no log).
function friendlyError(error: OpenRouterError): HttpError {
  if (error.kind === 'not_configured') return new HttpError(503, 'A geração de capas por IA não está configurada.');
  if (error.kind === 'no_credits') return new HttpError(503, 'A geração de capas por IA está indisponível no momento.');
  if (error.kind === 'rejected') return new HttpError(422, 'Não foi possível gerar uma capa para este conteúdo. Ajuste o texto e tente de novo.');
  return new HttpError(503, 'Não foi possível gerar a capa agora. Tente novamente em instantes.');
}

// Gera a capa, salva pelo storage (mesmo lugar dos uploads) e devolve a URL pública.
export async function generateCover(userId: number, input: CoverInput): Promise<string> {
  const reservationId = await reserveImageGeneration(userId); // 429 se passou do limite diário

  try {
    const image = await generateImage(buildCoverPrompt(input), { aspectRatio: '16:9' });

    // Não confiamos cegamente na resposta: só salvamos se for mesmo JPEG/PNG/WebP.
    const type = detectImageType(image.content);
    if (!type) throw new OpenRouterError('bad_response', `Imagem em formato inesperado (${image.mediaType})`);

    const url = await saveImage(image.content, type.extension);
    await completeImageGeneration(reservationId, url);
    return url;
  } catch (error) {
    await releaseImageGeneration(reservationId); // falha não consome o limite do usuário
    if (error instanceof OpenRouterError) {
      console.error(`[capa IA] [${error.kind}] ${error.message}`);
      throw friendlyError(error);
    }
    throw error;
  }
}
