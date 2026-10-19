"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { deleteCampaign, errorMessage, getCampaign, updateCampaign } from "@/lib/api";
import type { CampaignDetail } from "@/types/campaign";
import { CampaignForm, type CampaignFormValues } from "@/components/CampaignForm";
import { RequireAuth } from "@/components/RequireAuth";
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

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  // Erro/aviso das ações "Encerrar" e "Excluir" (ex.: 409 ao excluir com doações).
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busy, setBusy] = useState(false);

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

  // imageUrl null remove a imagem atual.
  async function handleUpdate(values: CampaignFormValues) {
    await updateCampaign(id, values);
    router.push(`/campaigns/${id}`);
  }

  async function handleFinish() {
    if (!window.confirm("Encerrar a campanha? Ela deixará de receber doações.")) return;
    setActionError("");
    setActionMessage("");
    setBusy(true);
    try {
      setCampaign(await updateCampaign(id, { status: "FINISHED" }));
      setActionMessage("Campanha encerrada.");
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Excluir a campanha definitivamente? Esta ação não pode ser desfeita.")) return;
    setActionError("");
    setActionMessage("");
    setBusy(true);
    try {
      await deleteCampaign(id);
      router.push("/");
    } catch (err) {
      // Com doações o backend responde 409 explicando que é preciso encerrar em vez de excluir.
      setActionError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Editar campanha</h1>
        <Link href={`/campaigns/${id}`} className="text-sm text-emerald-700 underline">
          Voltar para a campanha
        </Link>
      </div>

      <CampaignForm initial={campaign} submitLabel="Salvar alterações" onSubmit={handleUpdate} />

      <section className="card space-y-3 p-6">
        <h2 className="text-lg font-semibold">Ações</h2>
        <div className="flex flex-wrap gap-3">
          {campaign.status === "ACTIVE" ? (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={handleFinish}>
              Encerrar campanha
            </button>
          ) : (
            <p className="text-sm text-zinc-600">Esta campanha já está encerrada.</p>
          )}
          <button type="button" className="btn btn-danger" disabled={busy} onClick={handleDelete}>
            Excluir campanha
          </button>
        </div>
        {actionError && <ErrorMessage message={actionError} />}
        {actionMessage && <p className="text-sm text-emerald-700">{actionMessage}</p>}
      </section>
    </div>
  );
}
