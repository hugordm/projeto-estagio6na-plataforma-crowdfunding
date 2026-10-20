import type { Metadata } from "next";

// Esta busca roda no servidor do Next. Em Docker, "localhost" é o próprio container do frontend:
// API_INTERNAL_URL (opcional, só no servidor) aponta para a API pela rede interna (ex.: http://backend:3001).
function apiUrl(): string {
  return process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

const DESCRIPTION_LENGTH = 160;

// A página de detalhe é client-side; o título e a descrição da aba (e de quem recebe o link)
// vêm deste layout, que roda no servidor e busca só o título e a descrição da campanha.
// Se a API falhar, ficam os metadados padrão do site.
export async function generateMetadata({ params }: LayoutProps<"/campaigns/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const response = await fetch(`${apiUrl()}/campaigns/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return {};
    const campaign = (await response.json()) as { title: string; description: string };
    const description = campaign.description.replace(/\s+/g, " ").trim().slice(0, DESCRIPTION_LENGTH);
    return {
      // absolute: já leva o sufixo; sem isso o template do layout raiz o repetiria.
      title: { absolute: `${campaign.title} | Crowdfunding` },
      description,
      openGraph: { title: campaign.title, description },
    };
  } catch {
    return {};
  }
}

export default function CampaignLayout({ children }: LayoutProps<"/campaigns/[id]">) {
  return children;
}
