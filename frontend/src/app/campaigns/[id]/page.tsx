"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage, getCampaign } from "@/lib/api";
import { formatCurrency, formatDate, formatDaysLeft } from "@/lib/format";
import type { CampaignDetail } from "@/types/campaign";
import { AiBadge } from "@/components/AiBadge";
import { BackButton } from "@/components/BackButton";
import { CoverImage } from "@/components/CoverImage";
import { DonationPanel } from "@/components/DonationPanel";
import { DonorList } from "@/components/DonorList";
import { ProgressBar } from "@/components/ProgressBar";
import { ShareButton } from "@/components/ShareButton";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorMessage, Loading } from "@/components/StatusMessage";

// Detalhe da campanha: dados, progresso, formulário de doação e lista de doadores.
export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState("");
  // Incrementado após cada doação para recarregar os totais e a lista de doadores.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    getCampaign(id)
      .then((data) => {
        if (ignore) return;
        setCampaign(data);
        setError("");
      })
      .catch((err) => {
        if (!ignore) setError(errorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [id, reloadKey]);

  if (error) return <ErrorMessage message={error} />;
  if (!campaign) return <Loading text="Carregando campanha..." />;

  const isOwner = user?.id === campaign.ownerId;

  return (
    <div>
      <BackButton fallbackHref="/" />
      <div className="grid gap-6 lg:grid-cols-3">
        <article className="space-y-4 lg:col-span-2">
          <CoverImage src={campaign.imageUrl} alt={campaign.title} size="detail" />

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-emerald-700">{campaign.category.name}</span>
            <StatusBadge status={campaign.status} />
            {campaign.imageGeneratedByAi && <AiBadge />}
          </div>

          <h1 className="text-2xl font-bold">{campaign.title}</h1>
          <p className="text-sm text-zinc-600">
            Criada por {campaign.owner.name} · Prazo: {formatDate(campaign.deadline)}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {isOwner && (
              <Link href={`/campaigns/${campaign.id}/edit`} className="btn btn-secondary">
                Editar campanha
              </Link>
            )}
            <ShareButton title={campaign.title} text={`Apoie a campanha "${campaign.title}"`} />
          </div>

          <p className="whitespace-pre-line text-zinc-800">{campaign.description}</p>

          <section className="card p-4">
            <h2 className="mb-2 text-lg font-semibold">Doadores</h2>
            <DonorList campaignId={campaign.id} reloadKey={reloadKey} />
          </section>
        </article>

        <aside className="space-y-4">
          <section className="card space-y-3 p-4">
            <p>
              <span className="text-2xl font-bold text-emerald-700">{formatCurrency(campaign.raisedAmount)}</span>
              <span className="block text-sm text-zinc-600">arrecadados de {formatCurrency(campaign.goalAmount)}</span>
            </p>
            <ProgressBar progress={campaign.progress} />
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-zinc-500">Doadores</dt>
                <dd className="font-semibold">{campaign.donorsCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Prazo</dt>
                <dd className="font-semibold">{formatDaysLeft(campaign.daysLeft, campaign.status)}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-lg font-semibold">Apoiar esta campanha</h2>
            <DonationPanel campaign={campaign} onDonated={() => setReloadKey((key) => key + 1)} />
          </section>
        </aside>
      </div>
    </div>
  );
}
