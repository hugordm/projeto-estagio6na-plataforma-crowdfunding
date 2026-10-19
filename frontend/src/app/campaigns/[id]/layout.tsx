import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DESCRIPTION_LENGTH = 160;

// A página de detalhe é client-side; o título e a descrição da aba (e de quem recebe o link)
// vêm deste layout, que roda no servidor e busca só o título e a descrição da campanha.
// Se a API falhar, ficam os metadados padrão do site.
export async function generateMetadata({ params }: LayoutProps<"/campaigns/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const response = await fetch(`${API_URL}/campaigns/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return {};
    const campaign = (await response.json()) as { title: string; description: string };
    const description = campaign.description.replace(/\s+/g, " ").trim().slice(0, DESCRIPTION_LENGTH);
    return {
      title: `${campaign.title} | Crowdfunding`,
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
