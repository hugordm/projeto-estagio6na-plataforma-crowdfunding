// Rede de segurança do chatbot: o prompt já pede texto puro, mas se o modelo mandar markdown,
// removemos as marcações antes de devolver a resposta (o frontend mostra o texto como está).
export function toPlainText(text: string): string {
  return (
    text
      .replace(/\r\n/g, '\n')
      // Blocos de código ```...```: mantém o conteúdo, tira as cercas.
      .replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1')
      // Código em linha `x`
      .replace(/`([^`\n]+)`/g, '$1')
      // Imagens ![alt](url) -> alt; links [texto](url) -> texto (url)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)')
      // Nas regras por linha usamos [ \t] em vez de \s, porque \s também casa com a quebra de linha.
      // Títulos (# Título), citações (> texto) e linhas horizontais (---, ***)
      .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
      .replace(/^[ \t]{0,3}>[ \t]?/gm, '')
      .replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, '')
      // Tabelas: remove a linha separadora |---|---| e troca as barras por " - "
      .replace(/^[ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*\n?/gm, '')
      .replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, (_line, cells: string) => cells.split('|').map((c) => c.trim()).join(' - '))
      // Marcadores de lista (-, *, +, •) no início da linha
      .replace(/^([ \t]*)[-*+•][ \t]+/gm, '$1')
      // Listas numeradas "1. item" -> "1) item" (formato pedido no prompt)
      .replace(/^([ \t]*)(\d+)\.[ \t]+/gm, '$1$2) ')
      // Negrito **x** / __x__ e tachado ~~x~~
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      // Itálico *x* / _x_ só quando envolve palavras (preserva snake_case, URLs e contas como 2*3)
      .replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s).,!?:;]|$)/gm, '$1$2')
      .replace(/(^|[\s(])_(?!\s)([^_\n]+?)_(?=[\s).,!?:;]|$)/gm, '$1$2')
      // No máximo uma linha em branco seguida
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}
