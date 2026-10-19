"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "@/lib/api";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import type { AuthResponse, User } from "@/types/user";

// Sobre o armazenamento do token no localStorage (e seus riscos), veja src/lib/session.ts.

type AuthContextValue = {
  user: User | null;
  token: string | null;
  // false até lermos o localStorage; evita redirecionar para /login antes de restaurar a sessão.
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [ready, setReady] = useState(false);

  // Restaura a sessão ao carregar a página. Fica num efeito porque o localStorage
  // só existe no navegador (no servidor, a página é renderizada sem usuário).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de um sistema externo (localStorage)
    setSession(loadSession());
    setReady(true);
  }, []);

  function startSession(data: AuthResponse) {
    saveSession(data);
    setSession(data);
  }

  async function login(email: string, password: string) {
    startSession(await api.login(email, password));
  }

  async function register(name: string, email: string, password: string) {
    startSession(await api.register(name, email, password));
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  const value: AuthContextValue = {
    user: session?.user ?? null,
    token: session?.token ?? null,
    ready,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para acessar a sessão em qualquer componente dentro do AuthProvider.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  return context;
}
