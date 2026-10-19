import { dateInputToIso, daysFromToday } from "@/lib/date-input";
import { moneyInputToApi } from "@/lib/money-input";
import type { Campaign } from "@/types/campaign";
import type { Category } from "@/types/category";
import { CampaignCard } from "./CampaignCard";

type CampaignPreviewProps = {
  title: string;
  description: string;
  goalAmount: string; // mascarado, ex.: "5.000,00"
  deadline: string; // "AAAA-MM-DD"
  category?: Category;
  imageUrl: string;
  imageFromAi: boolean;
};

// "Como vai aparecer": o mesmo CampaignCard da listagem, montado com os dados digitados
// (ainda sem doações: arrecadado = 0). Atualiza a cada tecla porque é recalculado a cada render.
export function CampaignPreview(props: CampaignPreviewProps) {
  const campaign: Campaign = {
    id: 0,
    title: props.title.trim() || "Título da sua campanha",
    description: props.description,
    goalAmount: moneyInputToApi(props.goalAmount) || "0.00",
    raisedAmount: "0.00",
    progress: 0,
    donorsCount: 0,
    imageUrl: props.imageUrl || null,
    imageGeneratedByAi: props.imageFromAi && Boolean(props.imageUrl),
    deadline: dateInputToIso(props.deadline || daysFromToday(30)),
    status: "ACTIVE",
    ownerId: 0,
    categoryId: props.category?.id ?? 0,
    createdAt: "", // não aparecem no card
    updatedAt: "",
    owner: { id: 0, name: "" },
    category: props.category ?? { id: 0, name: "Categoria" },
  };

  return (
    <section aria-label="Pré-visualização da campanha" className="space-y-2">
      <h2 className="text-sm font-semibold text-zinc-700">Como vai aparecer</h2>
      <CampaignCard campaign={campaign} asLink={false} goalText={props.goalAmount ? undefined : "R$ —"} />
      <p className="text-xs text-zinc-500">Assim o card aparece na lista de campanhas.</p>
    </section>
  );
}
