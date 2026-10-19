// Imagem da campanha ou um placeholder quando não há imageUrl.
//
// Usamos <img> comum em vez de next/image porque a URL é digitada pelo usuário e pode
// vir de qualquer domínio; o next/image exigiria liberar cada domínio no next.config.
export function CampaignImage({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-emerald-50 text-sm text-emerald-700 ${className}`}>
        Sem imagem
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className}`} />;
}
