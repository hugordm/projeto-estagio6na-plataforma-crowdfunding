// Regra de senha do cadastro e da redefinição: a MESMA do backend (zod em auth.controller.ts),
// com a mesma mensagem. O login não tem mínimo (vale a senha que a pessoa já tem).
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // limite do bcrypt
export const PASSWORD_HINT = `${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres.`;

// Devolve a mensagem de erro, ou "" se a senha atende à regra.
export function validatePassword(password: string): string {
  return password.length < PASSWORD_MIN || password.length > PASSWORD_MAX
    ? `A senha deve ter de ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres.`
    : "";
}
