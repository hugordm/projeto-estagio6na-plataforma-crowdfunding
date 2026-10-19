// Palavras relevantes de uma pergunta em português, para a busca textual de campanhas relacionadas
// (usada pelo chatbot quando a busca semântica não está disponível).

// Palavras vazias comuns e palavras genéricas do domínio (toda campanha é uma "campanha"/"vaquinha").
// Já sem acentos, como o texto normalizado.
const STOPWORDS = new Set(
  `a o as os um uma uns umas de do da dos das no na nos nas em ao aos para pra pro por pelo pela pelos pelas
   com sem sobre entre ate e ou que se me te lhe nos voces eu tu ele ela eles elas meu minha seu sua isso isto
   esse essa este esta aquele aquela aqui ai la ja nao sim mais menos muito muita bem tambem so
   qual quais quem como onde quando quanto quanta porque pq ha tem tenho temos ter existe existem alguma algum
   algumas alguns todo toda todos todas outra outro explica explicar explique fala falar fale conta contar saber
   quero queria gostaria posso pode podem poderia preciso faco fazer faz ajuda ajudar mostra mostrar diz dizer ver encontrar
   procuro procurando busca buscar oi ola obrigado obrigada favor ser sao foi era esta estao
   campanha campanhas vaquinha vaquinhas projeto projetos doar doacao doacoes plataforma site`.split(/\s+/),
);

// Minúsculas, sem acentos e sem pontuação: "Biblioteca Comunitária!" -> "biblioteca comunitaria".
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Termos de busca, sem repetição. Plural simples vira singular ("cachorros" -> "cachorro"),
// e como a busca é por "contém", o singular também encontra o plural no texto da campanha.
export function searchTerms(question: string, max = 8): string[] {
  const terms = normalizeText(question)
    .split(' ')
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
    .map((word) => (word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word))
    .filter((word) => !STOPWORDS.has(word));
  return [...new Set(terms)].slice(0, max);
}
