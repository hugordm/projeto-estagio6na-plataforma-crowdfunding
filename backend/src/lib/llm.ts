// Camada fina de texto (chat): escolhe o provedor pela variável CHAT_PROVIDER.
//   CHAT_PROVIDER=anthropic (padrão) -> anthropic.chat(), modelo ANTHROPIC_CHAT_MODEL (claude-haiku-5-5)
// Qualquer outro valor (ex.: o de um provedor antigo) deixa o texto por IA desligado, com aviso no log
// ao iniciar (features.service.ts). Todo uso de texto gerado por IA passa por aqui.

import * as anthropic from './anthropic';
import { AiError, type ChatMessage, type ChatOptions } from './ai-types';

export type { ChatMessage, ChatOptions } from './ai-types';
export { AiError } from './ai-types';

export type ChatProvider = 'anthropic';

// null quando CHAT_PROVIDER tem um valor não suportado.
export function chatProvider(): ChatProvider | null {
  const value = process.env.CHAT_PROVIDER?.trim();
  return !value || value === 'anthropic' ? 'anthropic' : null;
}

// Texto por IA disponível? Provedor válido e chave da Anthropic (o modelo tem padrão, claude-haiku-5-5).
export function isChatConfigured(): boolean {
  return chatProvider() !== null && anthropic.isAnthropicConfigured();
}

export function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  if (!chatProvider()) {
    return Promise.reject(new AiError('not_configured', `CHAT_PROVIDER não suportado: use "anthropic"`));
  }
  return anthropic.chat(messages, options);
}
