import { AiError } from '../lib/ai-types';
import { generateLongText } from '../lib/anthropic';
import { extractSvg, sanitizeSvg, SvgRejectedError } from '../lib/svg-sanitize';
import type { CoverInput } from './ai-cover.service';

const MAX_DESCRIPTION_CHARS = 600;
const ATTEMPTS = 2; // uma nova tentativa se o SVG vier inválido
const TIMEOUT_MS = 150_000; // bem maior que o do chat: o modelo escreve um arquivo inteiro
const MAX_TOKENS = 32_000; // SVG + raciocínio interno do modelo

// Instruções fixas, montadas só no backend. O usuário fornece apenas título, descrição e categoria.
const SYSTEM_PROMPT = `Você é um ilustrador que desenha capas para campanhas de financiamento coletivo usando SVG.
Responda SOMENTE com o código de UM elemento <svg>, do <svg> ao </svg>, sem markdown, sem cercas de código e sem nenhuma explicação.

Regras obrigatórias do SVG:
- viewBox="0 0 1200 675" (proporção 16:9), cobrindo toda a área com um fundo.
- Estilo de ilustração plana e geométrica, com formas simples, composição limpa e uma paleta de 4 a 6 cores coerente com o tema e a categoria da campanha.
- Use apenas os elementos: svg, g, path, rect, circle, ellipse, line, polyline, polygon, defs, linearGradient, radialGradient, stop, clipPath e mask.
- SEM texto, letras ou números (não use <text>), SEM pessoas reais ou reconhecíveis (personagens, se houver, devem ser figuras geométricas genéricas), SEM imagens externas (<image>), SEM <use>, SEM <style>, SEM scripts, SEM atributos de evento e SEM links.
- Atributos com aspas duplas e cores em hexadecimal. Mantenha o arquivo enxuto: no máximo cerca de 150 elementos.`;

function buildPrompt({ title, description, categoryName }: CoverInput): string {
  const summary = description.replace(/\s+/g, ' ').slice(0, MAX_DESCRIPTION_CHARS);
  return `Desenhe a capa desta campanha.\nCategoria: ${categoryName}\nTítulo: ${title}\nResumo: ${summary}`;
}

// Pede o SVG ao Claude (ANTHROPIC_COVER_MODEL, padrão claude-sonnet-5-5), separa o código do texto
// em volta e sanitiza. Se o SVG vier inválido, tenta mais uma vez; depois desiste com AiError.
export async function generateSvgCover(input: CoverInput): Promise<string> {
  let lastProblem = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const text = await generateLongText({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(input),
      model: process.env.ANTHROPIC_COVER_MODEL || undefined,
      maxTokens: MAX_TOKENS,
      effort: 'medium', // equilíbrio entre qualidade do desenho, tempo e custo
      timeoutMs: TIMEOUT_MS,
    });

    const svg = extractSvg(text);
    if (!svg) {
      lastProblem = 'resposta sem <svg>';
      continue;
    }
    try {
      return sanitizeSvg(svg);
    } catch (error) {
      if (!(error instanceof SvgRejectedError)) throw error;
      lastProblem = error.message;
      console.warn(`[capa SVG] Tentativa ${attempt} descartada: ${lastProblem}`);
    }
  }
  throw new AiError('bad_response', `SVG inválido após ${ATTEMPTS} tentativas (${lastProblem})`);
}
