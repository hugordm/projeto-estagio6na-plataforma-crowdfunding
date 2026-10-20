import { HttpError } from '../lib/http-error';
import { AiError } from '../lib/ai-types';
import { GENERATED_SVG } from '../lib/image-type';
import { isAnthropicConfigured } from '../lib/anthropic';
import { completeImageGeneration, releaseImageGeneration, reserveImageGeneration } from './ai-usage.service';
import { saveImage } from './storage.service';
import { generateSvgCover } from './svg-cover.service';

export type CoverInput = { title: string; description: string; categoryName: string };

// COVER_PROVIDER=anthropic-svg (padrão): ilustração vetorial (SVG) escrita pelo Claude e sanitizada.
// Qualquer outro valor (ex.: o de um provedor antigo) deixa a capa por IA desligada, com aviso no log
// ao iniciar (features.service.ts).
export type CoverProvider = 'anthropic-svg';

// null quando COVER_PROVIDER tem um valor não suportado.
export function coverProvider(): CoverProvider | null {
  const value = process.env.COVER_PROVIDER?.trim();
  return !value || value === 'anthropic-svg' ? 'anthropic-svg' : null;
}

// Capa por IA disponível? Provedor válido e chave da Anthropic (o modelo tem padrão,
// ANTHROPIC_COVER_MODEL ou claude-sonnet-5-5).
export function isCoverConfigured(): boolean {
  return coverProvider() !== null && isAnthropicConfigured();
}

// SVG pela Anthropic: o svg-cover.service já devolve o código sanitizado (lista permitida).
async function generateVectorCover(input: CoverInput): Promise<string> {
  const svg = await generateSvgCover(input);
  return saveImage(Buffer.from(svg, 'utf8'), GENERATED_SVG);
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
  // Antes de reservar o limite: provedor inválido (COVER_PROVIDER antigo) ou sem chave.
  if (!isCoverConfigured()) throw friendlyError(new AiError('not_configured', 'Capa por IA desligada'));
  const reservationId = await reserveImageGeneration(userId); // 429 se passou do limite diário

  try {
    const url = await generateVectorCover(input);
    await completeImageGeneration(reservationId, url); // é por esta URL que o backend reconhece a capa de IA
    return url;
  } catch (error) {
    await releaseImageGeneration(reservationId); // falha não consome o limite do usuário
    if (error instanceof AiError) {
      console.error(`[capa IA] [${coverProvider() ?? 'desligado'}] [${error.kind}] ${error.message}`);
      throw friendlyError(error);
    }
    throw error;
  }
}
