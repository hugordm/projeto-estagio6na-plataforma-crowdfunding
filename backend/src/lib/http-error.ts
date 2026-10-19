// Erro de negócio com status HTTP; o middleware de erro transforma em { error: message }.
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
