import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { FeaturesProvider } from "@/contexts/FeaturesContext";
import { ChatWidget } from "@/components/ChatWidget";
import { Navbar } from "@/components/Navbar";
import { NavigationTracker } from "@/components/NavigationTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plataforma de Crowdfunding",
  description: "Crie campanhas e apoie projetos com doações.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <FeaturesProvider>
            <NavigationTracker />
            <Navbar />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
            <ChatWidget />
          </FeaturesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
