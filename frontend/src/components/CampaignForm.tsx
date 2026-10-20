"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFeatures } from "@/contexts/FeaturesContext";
import { errorMessage, getCategories } from "@/lib/api";
import {
  DESCRIPTION_MAX,
  GOAL_HINT,
  TITLE_MAX,
  validateAll,
  validateField,
  type CampaignField,
  type CampaignFieldValues,
} from "@/lib/campaign-rules";
import { isoToDateInput } from "@/lib/date-input";
import { apiToMoneyInput, moneyInputToApi } from "@/lib/money-input";
import { goBack } from "@/lib/navigation";
import { confirmLeave } from "@/lib/unsaved-changes";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import type { CampaignDetail, CampaignInput } from "@/types/campaign";
import type { Category } from "@/types/category";
import { CampaignPreview } from "./CampaignPreview";
import { CategorySuggestion } from "./CategorySuggestion";
import { CoverPicker } from "./CoverPicker";
import { DeadlineInput } from "./DeadlineInput";
import { DescriptionAssistant } from "./DescriptionAssistant";
import { FormField } from "./FormField";
import { MoneyInput } from "./MoneyInput";
import { ErrorMessage } from "./StatusMessage";

// Valores enviados pelo formulário, já no formato da API. imageUrl null = sem imagem (na edição, remove a atual).
export type CampaignFormValues = Omit<CampaignInput, "imageUrl"> & { imageUrl: string | null };

type CampaignFormProps = {
  initial?: CampaignDetail; // na edição, os campos começam com os dados atuais da campanha
  submitLabel: string;
  cancelHref: string; // para onde o "Cancelar" leva se não houver página anterior do site
  onSubmit: (values: CampaignFormValues) => Promise<void>;
};

const FIELD_ORDER: CampaignField[] = ["title", "description", "goalAmount", "deadline", "categoryId"];

function initialValues(initial?: CampaignDetail): CampaignFieldValues & { imageUrl: string } {
  return {
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    goalAmount: initial ? apiToMoneyInput(initial.goalAmount) : "",
    deadline: initial ? isoToDateInput(initial.deadline) : "",
    categoryId: initial ? String(initial.categoryId) : "",
    imageUrl: initial?.imageUrl ?? "",
  };
}

// Formulário compartilhado pelas páginas de criação e edição de campanha, com validação por campo,
// capa (arquivo, IA ou URL), aviso de alterações não salvas e pré-visualização do card.
export function CampaignForm({ initial, submitLabel, cancelHref, onSubmit }: CampaignFormProps) {
  const router = useRouter();
  const { aiWriting } = useFeatures(); // "Melhorar descrição" e "Sugerir categoria"
  const [start] = useState(() => initialValues(initial)); // para saber se algo mudou

  const [title, setTitle] = useState(start.title);
  const [description, setDescription] = useState(start.description);
  const [goalAmount, setGoalAmount] = useState(start.goalAmount);
  const [deadline, setDeadline] = useState(start.deadline);
  const [categoryId, setCategoryId] = useState(start.categoryId);
  const [imageUrl, setImageUrl] = useState(start.imageUrl);
  const [imageFromAi, setImageFromAi] = useState(initial?.imageGeneratedByAi ?? false);
  const [categoryFromAi, setCategoryFromAi] = useState(false); // mostra o aviso "Sugerida por IA"

  const [categories, setCategories] = useState<Category[]>([]);
  const [touched, setTouched] = useState<Set<CampaignField>>(new Set()); // campos que já mostram erro
  const [error, setError] = useState(""); // erro geral (ex.: resposta da API)
  const [submitting, setSubmitting] = useState(false);

  const values: CampaignFieldValues = { title, description, goalAmount, deadline, categoryId };
  const dirty = FIELD_ORDER.some((field) => values[field] !== start[field]) || imageUrl !== start.imageUrl;
  useUnsavedChangesWarning(dirty && !submitting);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => setError(`Não foi possível carregar as categorias: ${errorMessage(err)}`));
  }, []);

  // A mensagem aparece só depois que a pessoa sai do campo (onBlur) ou tenta enviar:
  // um campo vazio que acabou de receber o foco nunca mostra erro.
  function errorFor(field: CampaignField): string {
    return touched.has(field) ? validateField(field, values) : "";
  }

  function touch(field: CampaignField) {
    setTouched((current) => new Set(current).add(field));
  }

  function handleCoverChange(url: string, fromAi: boolean) {
    setImageUrl(url);
    setImageFromAi(fromAi);
  }

  function handleCategorySuggestion(id: number) {
    setCategoryId(String(id));
    setCategoryFromAi(true);
    touch("categoryId");
  }

  const selectedCategory = categories.find((c) => String(c.id) === categoryId);

  function handleCancel() {
    if (confirmLeave()) goBack(router, cancelHref);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTouched(new Set(FIELD_ORDER));

    const errors = validateAll(values);
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setError("Corrija os campos destacados antes de continuar.");
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        goalAmount: moneyInputToApi(goalAmount), // "5.000,00" -> "5000.00"
        deadline, // "AAAA-MM-DD": o backend interpreta no fuso de São Paulo
        categoryId: Number(categoryId),
        imageUrl: imageUrl || null,
      });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  const fieldProps = (field: CampaignField) => ({
    id: field,
    onBlur: () => touch(field),
    "aria-invalid": Boolean(errorFor(field)),
    "aria-describedby": `${field}-help`,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={handleSubmit} noValidate className="card space-y-5 p-6">
        <FormField id="title" label="Título" error={errorFor("title")} count={title.length} max={TITLE_MAX}>
          <input
            {...fieldProps("title")}
            maxLength={TITLE_MAX}
            className="input"
            placeholder="Ex.: Reforma da biblioteca comunitária do bairro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormField>

        <FormField
          id="description"
          label="Descrição"
          error={errorFor("description")}
          hint="Conte quem será ajudado, por que isso importa e como o dinheiro será usado."
          count={description.length}
          max={DESCRIPTION_MAX}
        >
          <textarea
            {...fieldProps("description")}
            maxLength={DESCRIPTION_MAX}
            rows={6}
            className="input"
            placeholder="Ex.: A biblioteca atende 200 crianças por semana, mas o telhado tem goteiras. Com a meta, vamos trocar as telhas e comprar estantes novas."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        {aiWriting && (
          <DescriptionAssistant
            title={title}
            description={description}
            categoryName={selectedCategory?.name}
            onUse={(text) => {
              setDescription(text);
              touch("description");
            }}
          />
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="goalAmount" label="Meta" error={errorFor("goalAmount")} hint={`Quanto quer arrecadar. ${GOAL_HINT}`}>
            <MoneyInput
              id="goalAmount"
              placeholder="5.000,00"
              value={goalAmount}
              onChange={setGoalAmount}
              onBlur={() => touch("goalAmount")}
              invalid={Boolean(errorFor("goalAmount"))}
            />
          </FormField>

          <FormField id="deadline" label="Prazo" error={errorFor("deadline")} hint="Último dia para receber doações.">
            <DeadlineInput
              id="deadline"
              value={deadline}
              onChange={setDeadline}
              onBlur={() => touch("deadline")}
              invalid={Boolean(errorFor("deadline"))}
            />
          </FormField>
        </div>

        <FormField
          id="categoryId"
          label="Categoria"
          error={errorFor("categoryId")}
          hint={categoryFromAi ? "Sugerida por IA. Você pode alterar." : undefined}
          action={
            aiWriting ? <CategorySuggestion title={title} description={description} onSuggest={handleCategorySuggestion} /> : undefined
          }
        >
          <select
            {...fieldProps("categoryId")}
            className="input"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setCategoryFromAi(false); // escolha manual: tira o aviso de sugestão
            }}
          >
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>

        <CoverPicker
          value={imageUrl}
          onChange={handleCoverChange}
          title={title}
          description={description}
          categoryId={categoryId}
        />

        {error && <ErrorMessage message={error} />}

        {/* Barra de ações fixa no rodapé do formulário, sempre visível ao rolar. data-sticky-actions
            faz o botão do chatbot subir em telas estreitas para não cobri-la (globals.css). */}
        <div
          data-sticky-actions
          className="sticky bottom-0 z-20 -mx-6 -mb-6 flex flex-wrap justify-end gap-3 rounded-b-lg border-t border-zinc-200 bg-white/95 px-6 py-3 backdrop-blur"
        >
          <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Salvando..." : submitLabel}
          </button>
        </div>
      </form>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <CampaignPreview
          title={title}
          description={description}
          goalAmount={goalAmount}
          deadline={deadline}
          category={selectedCategory}
          imageUrl={imageUrl}
          imageFromAi={imageFromAi}
        />
      </aside>
    </div>
  );
}
