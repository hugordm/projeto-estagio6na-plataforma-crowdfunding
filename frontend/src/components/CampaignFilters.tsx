"use client";

import { useState, type FormEvent } from "react";
import type { Category } from "@/types/category";

type CampaignFiltersProps = {
  categories: Category[];
  category: string;
  onSearch: (q: string) => void;
  onCategoryChange: (category: string) => void;
};

// Campo de busca por texto (aplicado ao enviar) e seletor de categoria (aplicado ao trocar).
export function CampaignFilters({ categories, category, onSearch, onCategoryChange }: CampaignFiltersProps) {
  const [text, setText] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(text.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
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
    </form>
  );
}
