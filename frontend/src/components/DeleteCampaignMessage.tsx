// Texto do modal "Excluir campanha?", igual na edição e em "Minha conta". Segue o backend
// (campaign.service.ts): campanha com doações não é excluída (409) e a capa guardada pela
// plataforma (upload ou IA) é apagada junto, se nenhuma outra campanha a usar.
export function DeleteCampaignMessage({ title }: { title: string }) {
  return (
    <>
      <p>
        A campanha <strong>&ldquo;{title}&rdquo;</strong> será excluída permanentemente, junto com a imagem de capa
        enviada ou gerada na plataforma. Esta ação não pode ser desfeita.
      </p>
      <p className="text-zinc-500">Campanhas que já receberam doações não podem ser excluídas, apenas encerradas.</p>
    </>
  );
}
