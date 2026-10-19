"use client";

import { useRouter } from "next/navigation";
import { createCampaign } from "@/lib/api";
import { CampaignForm, type CampaignFormValues } from "@/components/CampaignForm";
import { RequireAuth } from "@/components/RequireAuth";

// Criação de campanha (somente usuários logados).
export default function NewCampaignPage() {
  const router = useRouter();

  // Erros lançados aqui são exibidos pelo próprio CampaignForm.
  async function handleCreate({ imageUrl, ...values }: CampaignFormValues) {
    // Sem imagem, o campo simplesmente não é enviado.
    const campaign = await createCampaign({ ...values, imageUrl: imageUrl ?? undefined });
    router.push(`/campaigns/${campaign.id}`);
  }

  return (
    <RequireAuth>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Nova campanha</h1>
        <CampaignForm submitLabel="Criar campanha" onSubmit={handleCreate} />
      </div>
    </RequireAuth>
  );
}
