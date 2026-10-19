import type { AuthResponse } from "@/types/user";

// Guarda a sessão (usuário + token) no localStorage do navegador.
//
// Troca de segurança: o localStorage é simples e sobrevive ao recarregar a página,
// mas qualquer script rodando na página consegue lê-lo. Se o site sofrer um ataque
// de XSS (script malicioso injetado), o token pode ser roubado. A alternativa mais
// segura seria um cookie httpOnly definido pelo backend (o JavaScript não consegue
// ler), mas isso exigiria mudar a API. Para um projeto acadêmico aceitamos o risco,
// e o React já escapa o texto exibido, o que reduz as chances de XSS.
//
// Todo acesso fica em try/catch porque o localStorage pode não existir (no servidor)
// ou estar bloqueado (modo privado, permissões do navegador).

const STORAGE_KEY = "crowdfunding:session";

// Disparado quando a API recusa o token (expirou ou a senha foi trocada): o AuthContext encerra a sessão.
export const SESSION_EXPIRED_EVENT = "crowdfunding:session-expired";

export function loadSession(): AuthResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthResponse): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Sem armazenamento: a sessão vale só até recarregar a página.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada a fazer.
  }
}

export function getToken(): string | null {
  return loadSession()?.token ?? null;
}
