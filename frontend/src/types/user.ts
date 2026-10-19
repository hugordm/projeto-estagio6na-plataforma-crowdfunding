// Usuário como a API retorna (a senha nunca vem na resposta).
export type User = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

// Resposta de POST /auth/login e POST /auth/register.
export type AuthResponse = {
  user: User;
  token: string;
};
