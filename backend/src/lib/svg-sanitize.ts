/*
 * Sanitização de SVG por lista permitida. Estratégia: LER e RECONSTRUIR.
 * O SVG recebido é lido por um tokenizador estrito (qualquer trecho que ele não reconheça faz
 * o arquivo ser rejeitado) e um SVG novo é montado só com elementos e atributos permitidos, com
 * valores conferidos. Nada que esteja fora das listas abaixo chega ao arquivo salvo.
 * Proibidos (somem ou fazem rejeitar): script, foreignObject, image, use, style, text, atributos on*,
 * links externos, javascript:, data:, url() que não seja referência interna (#id), entidades e comentários.
 */

export const MAX_SVG_BYTES = 200 * 1024;

// Elementos de desenho permitidos. Qualquer outro é removido junto com tudo o que estiver dentro dele.
const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask',
]);

// Elementos que de fato desenham algo (para rejeitar um SVG vazio).
const DRAWING_ELEMENTS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);

const ALLOWED_ATTRIBUTES = new Set([
  'id', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'fr',
  'width', 'height', 'points', 'viewBox', 'preserveAspectRatio', 'transform', 'opacity',
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap',
  'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit',
  'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform', 'spreadMethod',
  'clip-path', 'clip-rule', 'clipPathUnits', 'mask', 'maskUnits', 'maskContentUnits', 'style', 'href',
]);

// Propriedades aceitas dentro do atributo style="..." (o resto é descartado).
const ALLOWED_STYLE_PROPERTIES = new Set([
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap',
  'stroke-linejoin', 'stroke-dasharray', 'opacity', 'stop-color', 'stop-opacity', 'mix-blend-mode',
]);

const SAFE_VALUE = /^[^<>&"'`\\]*$/; // sem caracteres que permitam escapar do atributo ou usar entidades
const SAFE_ID = /^[A-Za-z_][\w.-]{0,63}$/;
const INTERNAL_REF = /^#[A-Za-z_][\w.-]{0,63}$/;

export class SvgRejectedError extends Error {}

// Valida o valor de um atributo; devolve o valor limpo ou null para descartar o atributo.
function cleanAttribute(name: string, raw: string): string | null {
  const value = raw.trim();
  if (!SAFE_VALUE.test(value)) return null;
  if (/javascript:|data:|vbscript:|expression\s*\(|@import/i.test(value)) return null;

  if (name === 'id') return SAFE_ID.test(value) ? value : null;
  // href só para referência interna (ex.: um gradiente herdando outro): nada de links externos.
  if (name === 'href') return INTERNAL_REF.test(value) ? value : null;
  if (name === 'style') return cleanStyle(value);

  return onlyInternalUrls(value) ? value : null;
}

// url(...) só pode ser referência interna, ex.: url(#gradiente). Toda ocorrência de "url(" precisa
// ser exatamente nesse formato; assim nem um url( aberto/cortado escapa da checagem.
function onlyInternalUrls(value: string): boolean {
  const occurrences = (value.match(/url\s*\(/gi) ?? []).length;
  const internal = (value.match(/url\(\s*#[A-Za-z_][\w.-]{0,63}\s*\)/g) ?? []).length;
  return occurrences === internal;
}

function cleanStyle(style: string): string | null {
  const declarations = style
    .split(';')
    .map((part) => {
      // Divide só no PRIMEIRO ":" (o valor pode conter ":", ex.: url(https://...), que será descartado).
      const colon = part.indexOf(':');
      return colon === -1 ? ['', ''] : [part.slice(0, colon).trim().toLowerCase(), part.slice(colon + 1).trim()];
    })
    .filter(([property, value]) => property && value && ALLOWED_STYLE_PROPERTIES.has(property))
    .filter(([, value]) => !value.includes(':') && onlyInternalUrls(value))
    .map(([property, value]) => `${property}:${value}`);
  return declarations.length > 0 ? declarations.join(';') : null;
}

// Tokens: tag de abertura/fechamento (com atributos entre aspas) ou texto.
const TOKEN = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[A-Za-z_:][\w:.-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>|([^<]+)/y;
const ATTRIBUTE = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

// Recebe o texto do SVG e devolve um SVG novo e seguro. Lança SvgRejectedError se não der.
export function sanitizeSvg(input: string): string {
  if (Buffer.byteLength(input, 'utf8') > MAX_SVG_BYTES) throw new SvgRejectedError('SVG maior que o limite');

  // Declaração XML e comentários são removidos; DOCTYPE/ENTITY/CDATA e instruções de processamento rejeitam.
  const source = input.replace(/^\s*<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (/<!|<\?/.test(source)) throw new SvgRejectedError('SVG com DOCTYPE, entidades, CDATA ou instruções');

  const output: string[] = [];
  const stack: { name: string; kept: boolean }[] = [];
  let skipDepth = 0; // > 0 enquanto estamos dentro de um elemento proibido
  let rootSeen = false;
  let drawings = 0;

  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < source.length) {
    const start = TOKEN.lastIndex;
    const match = TOKEN.exec(source);
    if (!match || match.index !== start) throw new SvgRejectedError('SVG mal formado');
    const [, closing, rawName, rawAttributes, selfClosing, text] = match;

    if (text !== undefined) {
      // Texto solto não é permitido (o SVG não pode conter texto); só espaços em branco.
      if (text.trim() && skipDepth === 0) throw new SvgRejectedError('SVG com texto solto');
      continue;
    }

    const name = rawName.replace(/^svg:/, '');

    if (closing) {
      const open = stack.pop();
      if (!open || open.name !== name) throw new SvgRejectedError('Tags do SVG não fecham corretamente');
      if (!open.kept) skipDepth--;
      else output.push(`</${name}>`);
      continue;
    }

    if (stack.length === 0) {
      if (rootSeen || name !== 'svg') throw new SvgRejectedError('O documento precisa ter um único <svg> raiz');
      rootSeen = true;
    }

    const kept = skipDepth === 0 && ALLOWED_ELEMENTS.has(name);
    if (kept) {
      const attributes: string[] = [];
      for (const [, attrName, doubleQuoted, singleQuoted] of rawAttributes.matchAll(ATTRIBUTE)) {
        const normalized = attrName === 'xlink:href' ? 'href' : attrName;
        if (!ALLOWED_ATTRIBUTES.has(normalized)) continue; // descarta on*, xmlns:*, xlink:* etc.
        if (name === 'svg' && ['width', 'height', 'viewBox'].includes(normalized)) continue; // definidos abaixo
        const value = cleanAttribute(normalized, doubleQuoted ?? singleQuoted ?? '');
        if (value !== null) attributes.push(` ${normalized}="${value}"`);
      }
      if (name === 'svg' && stack.length === 0) {
        // Raiz sempre com o namespace e o tamanho 16:9 esperados.
        attributes.unshift(' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675"');
      }
      if (DRAWING_ELEMENTS.has(name)) drawings++;
      output.push(`<${name}${attributes.join('')}${selfClosing ? '/>' : '>'}`);
    }

    if (!selfClosing) {
      stack.push({ name, kept });
      if (!kept) skipDepth++;
    }
  }

  if (!rootSeen || stack.length > 0) throw new SvgRejectedError('SVG incompleto');
  if (drawings === 0) throw new SvgRejectedError('SVG sem nenhum desenho');

  const svg = output.join('');
  if (Buffer.byteLength(svg, 'utf8') > MAX_SVG_BYTES) throw new SvgRejectedError('SVG maior que o limite');
  return svg;
}

// Separa o SVG do texto que o modelo possa ter escrito em volta (explicações, cercas de código).
export function extractSvg(text: string): string | null {
  const start = text.search(/<svg[\s>]/i);
  const end = text.toLowerCase().lastIndexOf('</svg>');
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + '</svg>'.length);
}
