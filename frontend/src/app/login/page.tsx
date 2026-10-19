"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage } from "@/lib/api";
import { emailFromParam } from "@/lib/email-param";
import { ErrorMessage } from "@/components/StatusMessage";
import { BackButton } from "@/components/BackButton";
import { PasswordInput } from "@/components/PasswordInput";

// O Next exige <Suspense> em volta de componentes que usam useSearchParams.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Vindo do cadastro (?email=...), o e-mail já chega preenchido (só se tiver formato válido).
  const [email, setEmail] = useState(() => emailFromParam(searchParams.get("email")));
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Página para onde voltar depois do login. Só aceita caminhos internos ("/..."),
  // para que um link malicioso não redirecione o usuário para outro site.
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  // Vindo da página de redefinição de senha (?reset=1), mostramos um aviso de sucesso.
  const passwordWasReset = searchParams.get("reset") === "1";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push(next);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <BackButton fallbackHref="/" />
      <h1 className="mb-6 text-2xl font-bold">Entrar</h1>
      {passwordWasReset && (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Senha redefinida com sucesso. Entre com a nova senha.
        </p>
      )}
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label htmlFor="email" className="label">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Senha
          </label>
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} />
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-emerald-700 underline">
            Esqueci minha senha
          </Link>
        </div>

        {error && <ErrorMessage message={error} />}

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        Não tem conta?{" "}
        <Link href="/register" className="font-medium text-emerald-700 underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
