"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// Barra superior: muda os links conforme o usuário está logado ou não.
export function Navbar() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-emerald-700">
          Crowdfunding
        </Link>

        {/* Enquanto a sessão não é restaurada, não mostramos os links (evita "piscar"). */}
        {ready && (
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="hidden text-zinc-600 sm:inline">Olá, {user.name}</span>
                <Link href="/campaigns/new" className="btn btn-primary">
                  Nova campanha
                </Link>
                <button type="button" onClick={handleLogout} className="btn btn-secondary">
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary">
                  Entrar
                </Link>
                <Link href="/register" className="btn btn-primary">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
