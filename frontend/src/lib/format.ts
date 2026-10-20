import type { CampaignStatus } from "@/types/campaign";

// Formatação de valores para exibição (padrão brasileiro).

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

// "150.50" -> "R$ 150,50". A API envia dinheiro como string; Number() basta para exibir.
export function formatCurrency(value: string | number): string {
  return currencyFormatter.format(Number(value));
}

// "2026-12-20T02:59:59.999Z" -> "19/12/2026". Fuso fixo de São Paulo, como o prazo.
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// "2026-10-19T12:25:58.868Z" -> "19/10/2026, 09:25"
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

// Texto do prazo a partir de daysLeft e expired calculados pelo backend (dias de calendário em
// America/Sao_Paulo). Campanha encerrada pelo dono não mostra dias restantes, mesmo com prazo aberto.
export function formatDaysLeft({ daysLeft, expired, status }: { daysLeft: number; expired: boolean; status: CampaignStatus }): string {
  if (status === "FINISHED") return "Campanha encerrada";
  if (expired) return "Prazo encerrado";
  if (daysLeft === 0) return "Último dia";
  return daysLeft === 1 ? "1 dia restante" : `${daysLeft} dias restantes`;
}
