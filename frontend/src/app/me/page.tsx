"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { MyCampaignsTab } from "@/components/MyCampaignsTab";
import { MyDonationsTab } from "@/components/MyDonationsTab";
import { RequireAuth } from "@/components/RequireAuth";

type Tab = "campaigns" | "donations";

const TABS: { id: Tab; label: string }[] = [
  { id: "campaigns", label: "Minhas campanhas" },
  { id: "donations", label: "Minhas doações" },
];

// Área "Minha conta" (somente logado): duas abas, campanhas criadas e doações feitas.
export default function MyAccountPage() {
  return (
    <RequireAuth>
      <MyAccount />
    </RequireAuth>
  );
}

function MyAccount() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("campaigns");

  return (
    <div className="space-y-6">
      <div>
        <BackButton fallbackHref="/" />
        <h1 className="text-2xl font-bold">Minha conta</h1>
        <p className="text-sm text-zinc-600">{user?.email}</p>
      </div>

      <div role="tablist" aria-label="Seções da conta" className="flex gap-1 border-b border-zinc-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`me-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="me-panel"
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === item.id ? "border-emerald-600 text-emerald-800" : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div id="me-panel" role="tabpanel" aria-labelledby={`me-tab-${tab}`}>
        {tab === "campaigns" ? <MyCampaignsTab /> : <MyDonationsTab />}
      </div>
    </div>
  );
}
