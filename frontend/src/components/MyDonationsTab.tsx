"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { errorMessage, getMyDonations } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { MyDonation } from "@/types/donation";
import type { Paginated } from "@/types/pagination";
import { Pagination } from "./Pagination";
import { StatusBadge } from "./StatusBadge";
import { EmptyState, ErrorMessage, Loading } from "./StatusMessage";

// Aba "Minhas doações": campanha, valor, mensagem e data de cada doação feita.
export function MyDonationsTab() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<MyDonation> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    getMyDonations(page)
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
  }, [page]);

  if (error) return <ErrorMessage message={error} />;
  if (!result) return <Loading text="Carregando suas doações..." />;
  if (result.data.length === 0) {
    return (
      <div className="text-center">
        <EmptyState text="Você ainda não fez nenhuma doação." />
        <Link href="/" className="btn btn-primary">
          Ver campanhas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="card divide-y divide-zinc-200">
        {result.data.map((donation) => (
          <li key={donation.id} className="space-y-1 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/campaigns/${donation.campaign.id}`} className="font-medium text-emerald-700 underline">
                {donation.campaign.title}
              </Link>
              <span className="font-semibold">{formatCurrency(donation.amount)}</span>
            </div>
            {donation.message && <p className="text-sm text-zinc-700">“{donation.message}”</p>}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{formatDateTime(donation.createdAt)}</span>
              <StatusBadge status={donation.campaign.status} />
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={result.meta.totalPages} onChange={setPage} />
    </div>
  );
}
