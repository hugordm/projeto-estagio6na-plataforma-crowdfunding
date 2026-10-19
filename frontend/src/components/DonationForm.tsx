"use client";

import { useState, type FormEvent } from "react";
import { createDonation, errorMessage } from "@/lib/api";
import { ErrorMessage } from "./StatusMessage";

type DonationFormProps = {
  campaignId: number;
  onDonated: () => void;
};

// Formulário de doação (simulada: não há pagamento real).
export function DonationForm({ campaignId, onDonated }: DonationFormProps) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!(Number(amount) > 0)) {
      setError("Informe um valor maior que zero.");
      return;
    }

    setSubmitting(true);
    try {
      // O backend aceita o valor como string com até 2 casas decimais.
      await createDonation(campaignId, { amount, message: message.trim() || undefined });
      setAmount("");
      setMessage("");
      setSuccess("Obrigado! Sua doação foi registrada.");
      onDonated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="amount" className="label">
          Valor (R$)
        </label>
        <input
          id="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="message" className="label">
          Mensagem (opcional)
        </label>
        <textarea
          id="message"
          rows={3}
          maxLength={500}
          className="input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {error && <ErrorMessage message={error} />}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? "Enviando..." : "Doar"}
      </button>
    </form>
  );
}
