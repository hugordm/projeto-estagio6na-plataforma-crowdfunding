"use client";

import { useEffect, useState, type FormEvent } from "react";
import { errorMessage, getCategories } from "@/lib/api";
import type { CampaignDetail, CampaignInput } from "@/types/campaign";
import type { Category } from "@/types/category";
import { AiCoverGenerator } from "./AiCoverGenerator";
import { ImageField } from "./ImageField";
import { ErrorMessage } from "./StatusMessage";

// Valores enviados pelo formulário. imageUrl null = sem imagem (na edição, remove a atual).
export type CampaignFormValues = Omit<CampaignInput, "imageUrl"> & { imageUrl: string | null };

type CampaignFormProps = {
  // Na edição, os campos começam com os dados atuais da campanha.
  initial?: CampaignDetail;
  submitLabel: string;
  onSubmit: (values: CampaignFormValues) => Promise<void>;
};

// "2026-12-31T23:59:59.000Z" -> "2026-12-31" (formato do <input type="date">, no fuso local).
function toDateInput(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// "2026-12-31" -> ISO do fim desse dia no fuso local (a campanha vale o dia inteiro).
function fromDateInput(value: string): string {
  return new Date(`${value}T23:59:59`).toISOString();
}

// Formulário compartilhado pelas páginas de criação e edição de campanha.
export function CampaignForm({ initial, submitLabel, onSubmit }: CampaignFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [goalAmount, setGoalAmount] = useState(initial?.goalAmount ?? "");
  const [deadline, setDeadline] = useState(initial ? toDateInput(initial.deadline) : "");
  const [categoryId, setCategoryId] = useState(initial ? String(initial.categoryId) : "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");

  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => setError(`Não foi possível carregar as categorias: ${errorMessage(err)}`));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!(Number(goalAmount) > 0)) {
      setError("A meta deve ser maior que zero.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        goalAmount,
        deadline: fromDateInput(deadline),
        categoryId: Number(categoryId),
        imageUrl: imageUrl || null,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div>
        <label htmlFor="title" className="label">
          Título
        </label>
        <input
          id="title"
          required
          minLength={3}
          maxLength={120}
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="description" className="label">
          Descrição
        </label>
        <textarea
          id="description"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="goalAmount" className="label">
            Meta (R$)
          </label>
          <input
            id="goalAmount"
            type="number"
            min="0.01"
            step="0.01"
            required
            className="input"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="deadline" className="label">
            Prazo
          </label>
          <input
            id="deadline"
            type="date"
            required
            className="input"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="categoryId" className="label">
          Categoria
        </label>
        <select
          id="categoryId"
          required
          className="input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Selecione...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <ImageField value={imageUrl} onChange={setImageUrl} />
      <AiCoverGenerator title={title} description={description} categoryId={categoryId} onAccept={setImageUrl} />

      {error && <ErrorMessage message={error} />}

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
