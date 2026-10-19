import type { CampaignStatus } from "@/types/campaign";

// Formatação de valores para exibição (padrão brasileiro).

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

const DAY_MS = 24 * 60 * 60 * 1000;

// "150.50" -> "R$ 150,50". A API envia dinheiro como string; Number() basta para exibir.
export function formatCurrency(value: string | number): string {
  return currencyFormatter.format(Number(value));
}

// "2026-12-31T23:59:59.000Z" -> "31/12/2026"
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// "2026-10-19T12:25:58.868Z" -> "19/10/2026, 09:25"
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

// Mesmo cálculo do backend: dias (arredondados para cima) até o prazo, nunca negativo.
// Usado na listagem, que não traz daysLeft.
export function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));
}

// Campanha encerrada pelo dono não mostra dias restantes, mesmo que o prazo não tenha acabado.
export function formatDaysLeft(days: number, status: CampaignStatus = "ACTIVE"): string {
  if (status === "FINISHED") return "Campanha encerrada";
  if (days === 0) return "Prazo encerrado";
  return days === 1 ? "1 dia restante" : `${days} dias restantes`;
}
