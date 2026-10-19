import Link from "next/link";
import type { Campaign } from "@/types/campaign";
import { daysUntil, formatCurrency, formatDaysLeft } from "@/lib/format";
import { CoverImage } from "./CoverImage";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

type CampaignCardProps = {
  campaign: Campaign;
  asLink?: boolean; // false: mesmo visual, mas sem ser um link (pré-visualização, "Minha conta")
  goalText?: string; // texto no lugar da meta formatada (pré-visualização com a meta ainda vazia)
};

// Card da listagem: o card inteiro é um link para o detalhe da campanha.
export function CampaignCard({ campaign, asLink = true, goalText }: CampaignCardProps) {
  const content = (
    <>
      <CoverImage src={campaign.imageUrl} alt={campaign.title} size="card" aiGenerated={campaign.imageGeneratedByAi} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-emerald-700">{campaign.category.name}</span>
          <StatusBadge status={campaign.status} />
        </div>

        <h2 className="line-clamp-2 font-semibold">{campaign.title}</h2>

        <div className="mt-auto space-y-2">
          <ProgressBar progress={campaign.progress} />
          <p className="text-sm">
            <span className="font-semibold">{formatCurrency(campaign.raisedAmount)}</span>
            <span className="text-zinc-600"> de {goalText ?? formatCurrency(campaign.goalAmount)}</span>
          </p>
          <p className="text-xs text-zinc-500">{formatDaysLeft(daysUntil(campaign.deadline), campaign.status)}</p>
        </div>
      </div>
    </>
  );

  if (!asLink) return <div className="card flex flex-col overflow-hidden">{content}</div>;

  return (
    <Link href={`/campaigns/${campaign.id}`} className="card flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {content}
    </Link>
  );
}
