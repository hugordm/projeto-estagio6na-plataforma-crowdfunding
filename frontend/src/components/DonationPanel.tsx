"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import type { CampaignDetail } from "@/types/campaign";
import { DonationForm } from "./DonationForm";

type DonationPanelProps = {
  campaign: CampaignDetail;
  onDonated: () => void;
};

// Decide se o formulário de doação aparece ou qual o motivo de não aparecer.
// As mesmas regras são validadas no backend; aqui é só para orientar o usuário.
export function DonationPanel({ campaign, onDonated }: DonationPanelProps) {
  const { user, ready } = useAuth();

  if (!ready) return null;

  if (campaign.status !== "ACTIVE" || campaign.daysLeft === 0) {
    return <Reason text="Esta campanha está encerrada e não aceita mais doações." />;
  }

  if (!user) {
    return (
      <p className="text-sm text-zinc-700">
        <Link href={`/login?next=/campaigns/${campaign.id}`} className="font-medium text-emerald-700 underline">
          Entre na sua conta
        </Link>{" "}
        para fazer uma doação.
      </p>
    );
  }

  if (user.id === campaign.ownerId) {
    return <Reason text="Você é o dono desta campanha e não pode doar para ela." />;
  }

  return <DonationForm campaignId={campaign.id} onDonated={onDonated} />;
}

function Reason({ text }: { text: string }) {
  return <p className="text-sm text-zinc-600">{text}</p>;
}
