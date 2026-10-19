// Camada fina de texto (chat): escolhe o provedor pela variável CHAT_PROVIDER.
//   CHAT_PROVIDER=openrouter (padrão) -> openrouter.chat(), modelo OPENROUTER_CHAT_MODEL
//   CHAT_PROVIDER=anthropic           -> anthropic.chat(),  modelo ANTHROPIC_CHAT_MODEL (claude-haiku-5-5)
// Todo uso de texto gerado por IA passa por aqui. Embeddings e imagens continuam no openrouter.ts.

import * as anthropic from './anthropic';
import * as openrouter from './openrouter';
import type { ChatMessage, ChatOptions } from './ai-types';

export type { ChatMessage, ChatOptions } from './ai-types';
export { AiError } from './ai-types';

export type ChatProvider = 'openrouter' | 'anthropic';

export function chatProvider(): ChatProvider {
  return process.env.CHAT_PROVIDER === 'anthropic' ? 'anthropic' : 'openrouter';
}

export function isChatConfigured(): boolean {
  return chatProvider() === 'anthropic' ? anthropic.isAnthropicConfigured() : openrouter.isAiConfigured('chat');
}

export function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  return chatProvider() === 'anthropic' ? anthropic.chat(messages, options) : openrouter.chat(messages, options);
}
