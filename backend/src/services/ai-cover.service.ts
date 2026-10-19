import { HttpError } from '../lib/http-error';
import { AiError } from '../lib/ai-types';
import { detectImageType, GENERATED_SVG } from '../lib/image-type';
import { generateImage, OpenRouterError } from '../lib/openrouter';
import { completeImageGeneration, releaseImageGeneration, reserveImageGeneration } from './ai-usage.service';
import { saveImage } from './storage.service';
import { generateSvgCover } from './svg-cover.service';

export type CoverInput = { title: string; description: string; categoryName: string };

// COVER_PROVIDER=openrouter (padrão): imagem (PNG/JPEG/WebP) pelo modelo OPENROUTER_IMAGE_MODEL.
// COVER_PROVIDER=anthropic-svg: ilustração vetorial (SVG) escrita pelo Claude e sanitizada.
export type CoverProvider = 'openrouter' | 'anthropic-svg';

export function coverProvider(): CoverProvider {
  return process.env.COVER_PROVIDER === 'anthropic-svg' ? 'anthropic-svg' : 'openrouter';
}

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

// Imagem pelo OpenRouter: confere pelos bytes que é mesmo JPEG/PNG/WebP antes de salvar.
async function generateImageCover(input: CoverInput): Promise<string> {
  const image = await generateImage(buildCoverPrompt(input), { aspectRatio: '16:9' });
  const type = detectImageType(image.content);
  if (!type) throw new OpenRouterError('bad_response', `Imagem em formato inesperado (${image.mediaType})`);
  return saveImage(image.content, type.extension);
}

// SVG pela Anthropic: o svg-cover.service já devolve o código sanitizado.
async function generateVectorCover(input: CoverInput): Promise<string> {
  const svg = await generateSvgCover(input);
  return saveImage(Buffer.from(svg, 'utf8'), GENERATED_SVG.extension);
}

// Mensagem para o usuário conforme o tipo de falha da IA (detalhes técnicos só no log).
function friendlyError(error: AiError): HttpError {
  if (error.kind === 'not_configured') return new HttpError(503, 'A geração de capas por IA não está configurada.');
  if (error.kind === 'no_credits' || error.kind === 'invalid_key') {
    return new HttpError(503, 'A geração de capas por IA está indisponível no momento.');
  }
  if (error.kind === 'rejected') return new HttpError(422, 'Não foi possível gerar uma capa para este conteúdo. Ajuste o texto e tente de novo.');
  if (error.kind === 'bad_response') return new HttpError(502, 'A IA não conseguiu desenhar uma capa válida desta vez. Tente gerar de novo.');
  return new HttpError(503, 'Não foi possível gerar a capa agora. Tente novamente em instantes.');
}

// Gera a capa, salva pelo storage (mesmo lugar dos uploads) e devolve a URL pública.
export async function generateCover(userId: number, input: CoverInput): Promise<string> {
  const reservationId = await reserveImageGeneration(userId); // 429 se passou do limite diário

  try {
    const url = coverProvider() === 'anthropic-svg' ? await generateVectorCover(input) : await generateImageCover(input);
    await completeImageGeneration(reservationId, url); // é por esta URL que o backend reconhece a capa de IA
    return url;
  } catch (error) {
    await releaseImageGeneration(reservationId); // falha não consome o limite do usuário
    if (error instanceof AiError) {
      console.error(`[capa IA] [${coverProvider()}] [${error.kind}] ${error.message}`);
      throw friendlyError(error);
    }
    throw error;
  }
}
