"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { deleteCampaign, errorMessage, getCampaign, updateCampaign } from "@/lib/api";
import type { CampaignDetail } from "@/types/campaign";
import { CampaignForm, type CampaignFormValues } from "@/components/CampaignForm";
import { BackButton } from "@/components/BackButton";
import { RequireAuth } from "@/components/RequireAuth";
import { DeleteCampaignMessage } from "@/components/DeleteCampaignMessage";
import { ErrorMessage, Loading } from "@/components/StatusMessage";

// Edição da campanha (protegida por login; só o dono vê o formulário).
export default function EditCampaignPage() {
  return (
    <RequireAuth>
      <EditCampaign />
    </RequireAuth>
  );
}

function EditCampaign() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const askConfirm = useConfirm();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  // Aviso de sucesso de "Encerrar". Os erros de "Encerrar" e "Excluir" (ex.: 409 ao excluir com
  // doações) aparecem dentro do modal de confirmação.
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    getCampaign(id)
      .then((data) => {
        if (!ignore) setCampaign(data);
      })
      .catch((err) => {
        if (!ignore) setLoadError(errorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loadError) return <ErrorMessage message={loadError} />;
  if (!campaign) return <Loading text="Carregando campanha..." />;

  // O backend também bloqueia (403), mas assim o usuário entende antes de tentar.
  if (campaign.ownerId !== user?.id) {
    return <ErrorMessage message="Somente o dono pode editar esta campanha." />;
  }

  const { title } = campaign;

  // imageUrl null remove a imagem atual.
  async function handleUpdate(values: CampaignFormValues) {
    await updateCampaign(id, values);
    router.replace(`/campaigns/${id}`); // o formulário de edição sai do histórico
  }

  async function handleFinish() {
    setActionMessage("");
    const finished = await askConfirm({
      title: "Encerrar campanha?",
      message: <p>&ldquo;{title}&rdquo; deixará de receber doações.</p>,
      confirmLabel: "Encerrar campanha",
      pendingLabel: "Encerrando...",
      action: async () => setCampaign(await updateCampaign(id, { status: "FINISHED" })),
    });
    if (finished) setActionMessage("Campanha encerrada.");
  }

  async function handleDelete() {
    setActionMessage("");
    const deleted = await askConfirm({
      title: "Excluir campanha?",
      message: <DeleteCampaignMessage title={title} />,
      confirmLabel: "Excluir campanha",
      pendingLabel: "Excluindo...",
      variant: "danger",
      // Com doações o backend responde 409 explicando que é preciso encerrar em vez de excluir.
      action: () => deleteCampaign(id),
    });
    if (deleted) router.replace("/"); // a campanha excluída não fica no histórico
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <BackButton fallbackHref={`/campaigns/${id}`} />
        <h1 className="text-2xl font-bold">Editar campanha</h1>
      </div>

      <CampaignForm initial={campaign} submitLabel="Salvar alterações" cancelHref={`/campaigns/${id}`} onSubmit={handleUpdate} />

      <section className="card space-y-3 p-6">
        <h2 className="text-lg font-semibold">Ações</h2>
        <div className="flex flex-wrap gap-3">
          {campaign.status === "ACTIVE" ? (
            <button type="button" className="btn btn-secondary" onClick={handleFinish}>
              Encerrar campanha
            </button>
          ) : (
            <p className="text-sm text-zinc-600">Esta campanha já está encerrada.</p>
          )}
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Excluir campanha
          </button>
        </div>
        {actionMessage && <p className="text-sm text-emerald-700">{actionMessage}</p>}
      </section>
    </div>
  );
}
