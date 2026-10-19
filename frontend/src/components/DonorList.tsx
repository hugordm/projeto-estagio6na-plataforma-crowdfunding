"use client";

import { useEffect, useState } from "react";
import { errorMessage, getDonations } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Donation } from "@/types/donation";
import type { Paginated } from "@/types/pagination";
import { Pagination } from "./Pagination";
import { EmptyState, ErrorMessage, Loading } from "./StatusMessage";

type DonorListProps = {
  campaignId: number;
  // Mudar este número força recarregar a lista (ex.: depois de uma nova doação).
  reloadKey: number;
};

// Lista paginada de doações da campanha, das mais recentes para as mais antigas.
export function DonorList({ campaignId, reloadKey }: DonorListProps) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<Donation> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // "ignore" descarta respostas antigas se o usuário trocar de página rapidamente.
    let ignore = false;
    getDonations(campaignId, page)
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
  }, [campaignId, page, reloadKey]);

  if (error) return <ErrorMessage message={error} />;
  if (!result) return <Loading text="Carregando doações..." />;
  if (result.data.length === 0) return <EmptyState text="Ainda não há doações. Seja o primeiro a apoiar!" />;

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-zinc-200">
        {result.data.map((donation) => (
          <li key={donation.id} className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{donation.donorName}</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(donation.amount)}</span>
            </div>
            {donation.message && <p className="mt-1 text-sm text-zinc-700">“{donation.message}”</p>}
            <p className="mt-1 text-xs text-zinc-500">{formatDateTime(donation.createdAt)}</p>
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={result.meta.totalPages} onChange={setPage} />
    </div>
  );
}
