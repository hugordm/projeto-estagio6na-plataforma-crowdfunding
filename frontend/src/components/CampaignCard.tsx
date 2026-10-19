import Link from "next/link";
import type { Campaign } from "@/types/campaign";
import { daysUntil, formatCurrency, formatDaysLeft } from "@/lib/format";
import { AiBadge } from "./AiBadge";
import { CampaignImage } from "./CampaignImage";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

// Card da listagem: o card inteiro é um link para o detalhe da campanha.
export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="card flex flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="relative">
        <CampaignImage src={campaign.imageUrl} alt={campaign.title} className="h-40 w-full" />
        {campaign.imageGeneratedByAi && (
          <div className="absolute bottom-2 left-2">
            <AiBadge />
          </div>
        )}
      </div>

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
            <span className="text-zinc-600"> de {formatCurrency(campaign.goalAmount)}</span>
          </p>
          <p className="text-xs text-zinc-500">{formatDaysLeft(daysUntil(campaign.deadline), campaign.status)}</p>
        </div>
      </div>
    </Link>
  );
}
