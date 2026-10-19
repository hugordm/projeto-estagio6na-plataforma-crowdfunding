"use client";

import { useEffect, useState } from "react";
import { errorMessage, getCampaigns, getCategories, searchCampaigns } from "@/lib/api";
import type { Campaign } from "@/types/campaign";
import type { Category } from "@/types/category";
import type { Paginated } from "@/types/pagination";
import { CampaignCard } from "@/components/CampaignCard";
import { CampaignFilters } from "@/components/CampaignFilters";
import { Pagination } from "@/components/Pagination";
import { EmptyState, ErrorMessage, Loading } from "@/components/StatusMessage";

const PAGE_SIZE = 9;

// Página inicial: lista de campanhas com busca, filtro por categoria e paginação.
export default function HomePage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [smart, setSmart] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  // notice: aviso do backend quando a busca inteligente caiu para a busca por texto.
  const [result, setResult] = useState<(Paginated<Campaign> & { notice?: string }) | null>(null);
  const [error, setError] = useState("");

  // Categorias para o filtro (se falhar, o filtro só fica vazio).
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Recarrega as campanhas sempre que a busca, a categoria, a página ou o tipo de busca mudam.
  // A busca inteligente só é usada quando há texto; sem texto, mostra a listagem normal.
  useEffect(() => {
    let ignore = false;
    const filters = { q, category, page, limit: PAGE_SIZE };
    const load = smart && q ? searchCampaigns(filters) : getCampaigns(filters);
    load
      .then((data) => {
        if (ignore) return;
        setResult(data);
        setError("");
      })
      .catch((err) => {
        if (!ignore) setError(errorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [q, category, page, smart]);

  // Ao mudar um filtro, volta para a primeira página.
  function handleSearch(text: string) {
    setQ(text);
    setPage(1);
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    setPage(1);
  }

  function handleSmartChange(value: boolean) {
    setSmart(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <p className="text-sm text-zinc-600">Encontre um projeto e ajude a tirá-lo do papel.</p>
      </div>

      <CampaignFilters
        categories={categories}
        category={category}
        smart={smart}
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
        onSmartChange={handleSmartChange}
      />

      {result?.notice && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{result.notice}</p>
      )}

      {error ? (
        <ErrorMessage message={error} />
      ) : !result ? (
        <Loading text="Carregando campanhas..." />
      ) : result.data.length === 0 ? (
        <EmptyState text="Nenhuma campanha encontrada." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
          <Pagination page={page} totalPages={result.meta.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
