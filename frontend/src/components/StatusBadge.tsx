import type { CampaignStatus } from "@/types/campaign";

// Etiqueta "Ativa" / "Encerrada" da campanha.
export function StatusBadge({ status }: { status: CampaignStatus }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"
      }`}
    >
      {active ? "Ativa" : "Encerrada"}
    </span>
  );
}
