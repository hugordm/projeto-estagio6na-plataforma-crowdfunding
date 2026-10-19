import { AiError } from './ai-types';
import { HttpError } from './http-error';

// Converte uma falha de IA em resposta HTTP com mensagem amigável em português.
// O detalhe técnico vai só para o log, com o nome do recurso para facilitar a busca.
export function aiErrorToHttp(error: AiError, feature: string): HttpError {
  console.error(`[${feature}] [${error.kind}] ${error.message}`);
  if (error.kind === 'not_configured') return new HttpError(503, 'Este recurso de IA não está configurado.');
  if (error.kind === 'rejected') return new HttpError(422, 'A IA não conseguiu atender a este pedido. Ajuste o texto e tente de novo.');
  if (error.kind === 'bad_response') return new HttpError(502, 'A IA não deu uma resposta válida desta vez. Tente novamente.');
  return new HttpError(503, 'A IA está indisponível no momento. Tente novamente em instantes.');
}
