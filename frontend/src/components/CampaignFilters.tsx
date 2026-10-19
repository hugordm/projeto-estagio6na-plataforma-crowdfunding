"use client";

import { useState, type FormEvent } from "react";
import type { Category } from "@/types/category";

type CampaignFiltersProps = {
  categories: Category[];
  category: string;
  smart: boolean;
  onSearch: (q: string) => void;
  onCategoryChange: (category: string) => void;
  onSmartChange: (smart: boolean) => void;
};

// Campo de busca (aplicado ao enviar), seletor de categoria e opção de busca inteligente (aplicados ao trocar).
export function CampaignFilters({
  categories,
  category,
  smart,
  onSearch,
  onCategoryChange,
  onSmartChange,
}: CampaignFiltersProps) {
  const [text, setText] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(text.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Buscar campanhas..."
          aria-label="Buscar campanhas"
          className="input sm:flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select
          aria-label="Filtrar por categoria"
          className="input sm:w-56"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Buscar
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" checked={smart} onChange={(e) => onSmartChange(e.target.checked)} />
        Busca inteligente
        <span className="text-xs text-zinc-500">
          (entende o significado: &quot;ajudar animais&quot; encontra &quot;cirurgia do cachorro&quot;)
        </span>
      </label>
    </form>
  );
}
