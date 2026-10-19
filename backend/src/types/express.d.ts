// Adiciona o userId (preenchido pelo requireAuth) ao Request do Express.
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export {};
