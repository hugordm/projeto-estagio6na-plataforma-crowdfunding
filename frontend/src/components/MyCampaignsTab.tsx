"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteCampaign, errorMessage, getMyCampaigns, updateCampaign } from "@/lib/api";
import { useConfirm } from "@/contexts/ConfirmContext";
import type { MyCampaign } from "@/types/campaign";
import type { Paginated } from "@/types/pagination";
import { CampaignCard } from "./CampaignCard";
import { DeleteCampaignMessage } from "./DeleteCampaignMessage";
import { Pagination } from "./Pagination";
import { EmptyState, ErrorMessage, Loading } from "./StatusMessage";

// Aba "Minhas campanhas": cards com as ações Ver, Editar, Encerrar e Excluir (só sem doações,
// regra do backend). Encerrar e Excluir pedem confirmação no modal, que mostra o erro se falhar.
export function MyCampaignsTab() {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0); // muda para recarregar depois de encerrar ou excluir
  const [result, setResult] = useState<Paginated<MyCampaign> | null>(null);
  const [error, setError] = useState("");
  const askConfirm = useConfirm();

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
    const finished = await askConfirm({
      title: "Encerrar campanha?",
      message: <p>&ldquo;{campaign.title}&rdquo; deixará de receber doações.</p>,
      confirmLabel: "Encerrar campanha",
      pendingLabel: "Encerrando...",
      action: () => updateCampaign(campaign.id, { status: "FINISHED" }),
    });
    if (finished) setReloadKey((key) => key + 1);
  }

  async function handleDelete(campaign: MyCampaign) {
    const deleted = await askConfirm({
      title: "Excluir campanha?",
      message: <DeleteCampaignMessage title={campaign.title} />,
      confirmLabel: "Excluir campanha",
      pendingLabel: "Excluindo...",
      variant: "danger",
      action: () => deleteCampaign(campaign.id),
    });
    if (!deleted) return;
    // Se era o último card da página, volta uma página (a atual ficaria vazia).
    if (result && result.data.length === 1 && page > 1) setPage(page - 1);
    else setReloadKey((key) => key + 1);
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
                <button type="button" className="btn btn-secondary px-3 py-1.5 text-xs" onClick={() => handleFinish(campaign)}>
                  Encerrar
                </button>
              )}
              {campaign.donorsCount === 0 && (
                <button type="button" className="btn btn-danger px-3 py-1.5 text-xs" onClick={() => handleDelete(campaign)}>
                  Excluir
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
