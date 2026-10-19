import type { Metadata } from "next";

// A página é client-side; o título da aba vem deste layout (componente de servidor).
export const metadata: Metadata = {
  title: "Minha conta",
  description: "Suas campanhas e suas doações.",
};

export default function MyAccountLayout({ children }: LayoutProps<"/me">) {
  return children;
}
