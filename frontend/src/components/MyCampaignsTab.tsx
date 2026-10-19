"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { errorMessage, getMyCampaigns, updateCampaign } from "@/lib/api";
import type { MyCampaign } from "@/types/campaign";
import type { Paginated } from "@/types/pagination";
import { CampaignCard } from "./CampaignCard";
import { Pagination } from "./Pagination";
import { EmptyState, ErrorMessage, Loading } from "./StatusMessage";

// Aba "Minhas campanhas": cards com as ações Ver, Editar e Encerrar.
export function MyCampaignsTab() {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0); // muda para recarregar depois de encerrar
  const [result, setResult] = useState<Paginated<MyCampaign> | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [finishingId, setFinishingId] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    getMyCampaigns(page)
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
  }, [page, reloadKey]);

  async function handleFinish(campaign: MyCampaign) {
    if (!window.confirm(`Encerrar "${campaign.title}"? Ela deixará de receber doações.`)) return;
    setActionError("");
    setFinishingId(campaign.id);
    try {
      await updateCampaign(campaign.id, { status: "FINISHED" });
      setReloadKey((key) => key + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setFinishingId(null);
    }
  }

  if (error) return <ErrorMessage message={error} />;
  if (!result) return <Loading text="Carregando suas campanhas..." />;
  if (result.data.length === 0) {
    return (
      <div className="text-center">
        <EmptyState text="Você ainda não criou nenhuma campanha." />
        <Link href="/campaigns/new" className="btn btn-primary">
          Criar campanha
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && <ErrorMessage message={actionError} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.map((campaign) => (
          <div key={campaign.id} className="flex flex-col gap-2">
            <CampaignCard campaign={campaign} asLink={false} />
            <div className="flex flex-wrap gap-2">
              <Link href={`/campaigns/${campaign.id}`} className="btn btn-secondary px-3 py-1.5 text-xs">
                Ver
              </Link>
              <Link href={`/campaigns/${campaign.id}/edit`} className="btn btn-secondary px-3 py-1.5 text-xs">
                Editar
              </Link>
              {campaign.status === "ACTIVE" && (
                <button
                  type="button"
                  className="btn btn-secondary px-3 py-1.5 text-xs"
                  disabled={finishingId === campaign.id}
                  onClick={() => handleFinish(campaign)}
                >
                  {finishingId === campaign.id ? "Encerrando..." : "Encerrar"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={result.meta.totalPages} onChange={setPage} />
    </div>
  );
}
