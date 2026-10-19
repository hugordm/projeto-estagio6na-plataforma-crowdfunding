"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { errorMessage, resetPassword } from "@/lib/api";
import { ErrorMessage } from "@/components/StatusMessage";
import { BackButton } from "@/components/BackButton";
import { PasswordInput } from "@/components/PasswordInput";
import { PASSWORD_HINT, PASSWORD_MAX, validatePassword } from "@/lib/password-rules";

// O Next exige <Suspense> em volta de componentes que usam useSearchParams.
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

// Define a nova senha usando o token recebido no link do e-mail (?token=...).
function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState(""); // regra de 8 a 72 caracteres
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <BackButton fallbackHref="/" />
        <ErrorMessage message="Link inválido: o token não foi encontrado. Solicite um novo link." />
        <Link href="/forgot-password" className="btn btn-primary">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Mesma regra e mensagem do backend; a mensagem aparece abaixo do campo.
    const problem = validatePassword(password);
    setPasswordError(problem);
    if (problem) {
      document.getElementById("password")?.focus();
      return;
    }

    if (password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      // O aviso de sucesso é mostrado na página de login.
      router.push("/login?reset=1");
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <BackButton fallbackHref="/" />
      <h1 className="mb-6 text-2xl font-bold">Criar nova senha</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label htmlFor="password" className="label">
            Nova senha
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
        <div>
          <label htmlFor="confirmation" className="label">
            Confirme a nova senha
          </label>
          <PasswordInput
            id="confirmation"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            value={confirmation}
            onChange={setConfirmation}
          />
        </div>

        {error && <ErrorMessage message={error} />}

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        Link expirado?{" "}
        <Link href="/forgot-password" className="font-medium text-emerald-700 underline">
          Solicite outro
        </Link>
      </p>
    </div>
  );
}
