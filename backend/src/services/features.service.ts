import { chatProvider, isChatConfigured } from '../lib/llm';
import { coverProvider, isCoverConfigured } from './ai-cover.service';

// Quais recursos de IA estão configurados neste servidor. Só booleanos: nada de valores,
// nomes de variáveis ou modelos. O frontend usa isso para mostrar ou esconder botões e opções.
export type Features = {
  aiCover: boolean; // "Gerar com IA" na capa
  aiChat: boolean; // chatbot de suporte
  aiWriting: boolean; // "Melhorar descrição com IA" e "Sugerir categoria"
};

export function getFeatures(): Features {
  const textAi = isChatConfigured(); // chat e escrita usam o mesmo provedor de texto (llm.ts)
  return {
    aiCover: isCoverConfigured(),
    aiChat: textAi,
    aiWriting: textAi,
  };
}

// Avisos de configuração na inicialização. A IA usa só a Anthropic: um valor antigo ou inválido
// em CHAT_PROVIDER ou COVER_PROVIDER desliga o recurso, sem derrubar o servidor.
export function warnAiConfig(): void {
  if (!chatProvider()) {
    console.warn('[IA] CHAT_PROVIDER com valor não suportado: chat e escrita por IA ficam desligados. Use "anthropic" (ou deixe vazio).');
  }
  if (!coverProvider()) {
    console.warn('[IA] COVER_PROVIDER com valor não suportado: a capa por IA fica desligada. Use "anthropic-svg" (ou deixe vazio).');
  }
}
