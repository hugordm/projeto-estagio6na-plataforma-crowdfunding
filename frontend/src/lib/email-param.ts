// E-mail passado entre páginas pela URL (?email=...), ex.: do cadastro para "Entrar" e "Esqueci minha senha".
// Só aceita algo com formato de e-mail e tamanho razoável; qualquer outra coisa vira "".
// O valor apenas preenche um campo de formulário (o React o trata como texto, sem interpretar HTML).

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
const MAX_LENGTH = 254;

export function emailFromParam(value: string | null): string {
  const email = (value ?? "").trim();
  return email.length <= MAX_LENGTH && EMAIL.test(email) ? email : "";
}

// Monta o link com o e-mail codificado para a URL.
export function withEmailParam(path: string, email: string): string {
  const safe = emailFromParam(email);
  return safe ? `${path}?email=${encodeURIComponent(safe)}` : path;
}
