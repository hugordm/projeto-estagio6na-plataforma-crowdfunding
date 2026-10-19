import { isChatConfigured } from '../lib/llm';
import { isCoverConfigured } from './ai-cover.service';
import { isSemanticSearchConfigured } from './search.service';

// Quais recursos de IA estão configurados neste servidor. Só booleanos: nada de valores,
// nomes de variáveis ou modelos. O frontend usa isso para mostrar ou esconder botões e opções.
export type Features = {
  semanticSearch: boolean; // "Busca inteligente" (embeddings no OpenRouter)
  aiCover: boolean; // "Gerar com IA" na capa
  aiChat: boolean; // chatbot de suporte
  aiWriting: boolean; // "Melhorar descrição com IA" e "Sugerir categoria"
};

export function getFeatures(): Features {
  const textAi = isChatConfigured(); // chat e escrita usam o mesmo provedor de texto (llm.ts)
  return {
    semanticSearch: isSemanticSearchConfigured(),
    aiCover: isCoverConfigured(),
    aiChat: textAi,
    aiWriting: textAi,
  };
}
