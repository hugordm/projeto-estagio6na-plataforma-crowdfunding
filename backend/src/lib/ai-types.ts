// Contrato comum dos provedores de IA (OpenRouter e Anthropic): formato das mensagens,
// opções de chat e o erro tipado que o resto do código usa para decidir o que mostrar.

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type ChatOptions = {
  maxTokens?: number; // tamanho máximo da resposta
  temperature?: number; // usado só pelo OpenRouter (o Claude Haiku 5.5 rejeita valores fora do padrão)
  model?: string; // sobrescreve o modelo padrão do provedor
};

export type AiErrorKind =
  | 'not_configured' // falta chave ou modelo no .env
  | 'invalid_key' // chave recusada pelo provedor (401)
  | 'no_credits' // conta sem saldo (402 / billing)
  | 'rate_limited' // limite de uso do provedor (429)
  | 'timeout'
  | 'unavailable' // provedor/modelo fora do ar (5xx, 529) ou falha de rede
  | 'rejected' // pedido recusado (400, 403, moderação ou recusa do modelo)
  | 'bad_response'; // resposta sem o conteúdo esperado

export class AiError extends Error {
  constructor(
    public readonly kind: AiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AiError';
  }
}
