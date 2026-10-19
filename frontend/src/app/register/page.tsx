"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, errorMessage } from "@/lib/api";
import { withEmailParam } from "@/lib/email-param";
import { PASSWORD_HINT, PASSWORD_MAX, validatePassword } from "@/lib/password-rules";
import { PasswordInput } from "@/components/PasswordInput";
import { ErrorMessage } from "@/components/StatusMessage";
import { BackButton } from "@/components/BackButton";

// Cadastro de usuário: após criar a conta, o usuário já fica logado.
export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState(""); // regra de 8 a 72 caracteres
  const [emailTaken, setEmailTaken] = useState(false); // 409: e-mail já cadastrado
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setEmailTaken(false);

    // Mesma regra e mensagem do backend; a mensagem aparece abaixo do campo.
    const problem = validatePassword(password);
    setPasswordError(problem);
    if (problem) {
      document.getElementById("password")?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await register(name.trim(), email, password);
      router.push("/");
    } catch (err) {
      // E-mail já cadastrado: a mensagem vai para o próprio campo, com os caminhos para entrar.
      if (err instanceof ApiError && err.status === 409) setEmailTaken(true);
      else setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <BackButton fallbackHref="/" />
      <h1 className="mb-6 text-2xl font-bold">Criar conta</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label htmlFor="name" className="label">
            Nome
          </label>
          <input
            id="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailTaken(false);
            }}
            aria-invalid={emailTaken}
            aria-describedby={emailTaken ? "email-taken" : undefined}
          />
          {emailTaken && (
            <div id="email-taken" role="alert" className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>Este e-mail já está cadastrado.</p>
              <p className="mt-1">
                <Link href={withEmailParam("/login", email)} className="font-medium text-emerald-700 underline">
                  Entrar
                </Link>
                {" ou "}
                <Link href={withEmailParam("/forgot-password", email)} className="font-medium text-emerald-700 underline">
                  Esqueci minha senha
                </Link>
              </p>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="password" className="label">
            Senha
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            value={password}
            onChange={(value) => {
              setPassword(value);
              setPasswordError("");
            }}
            invalid={Boolean(passwordError)}
            describedBy="password-help"
          />
          <p id="password-help" className={`mt-1 text-xs ${passwordError ? "text-red-700" : "text-zinc-500"}`} aria-live="polite">
            {passwordError || PASSWORD_HINT}
          </p>
        </div>

        {error && <ErrorMessage message={error} />}

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? "Criando conta..." : "Criar conta"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-emerald-700 underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
