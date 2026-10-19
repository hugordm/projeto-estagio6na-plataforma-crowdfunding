"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { errorMessage, forgotPassword } from "@/lib/api";
import { ErrorMessage } from "@/components/StatusMessage";

// Pede o link de redefinição de senha por e-mail.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      // A API responde a mesma mensagem exista ou não o e-mail.
      const { message } = await forgotPassword(email);
      setSentMessage(message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-zinc-600">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>

      {sentMessage ? (
        <div className="card space-y-3 p-6 text-sm">
          <p className="text-emerald-700">{sentMessage}</p>
          <p className="text-zinc-600">O link vale por 30 minutos. Confira também a caixa de spam.</p>
        </div>
      ) : (
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

          {error && <ErrorMessage message={error} />}

          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-zinc-600">
        <Link href="/login" className="font-medium text-emerald-700 underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
