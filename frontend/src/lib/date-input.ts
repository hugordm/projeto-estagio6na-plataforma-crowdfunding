// Conversões para o <input type="date"> (formato "AAAA-MM-DD", no fuso local do navegador).

function toInputFormat(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// "2026-12-31T23:59:59.000Z" -> "2026-12-31"
export function isoToDateInput(iso: string): string {
  return toInputFormat(new Date(iso));
}

// "2026-12-31" -> ISO do fim desse dia no fuso local (a campanha vale o dia inteiro).
export function dateInputToIso(value: string): string {
  return new Date(`${value}T23:59:59`).toISOString();
}

// Data de hoje + N dias, no formato do input (ex.: daysFromToday(1) = amanhã).
export function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toInputFormat(date);
}

// ---------- Calendário (DatePicker) e digitação em dd/mm/aaaa ----------

export const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
export const WEEKDAY_NAMES = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

// "AAAA-MM-DD" -> Date no fuso local (meia-noite).
export function dateInputToDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateToDateInput(date: Date): string {
  return toInputFormat(date);
}

// Soma dias a uma data "AAAA-MM-DD" (aceita negativos).
export function addDays(value: string, days: number): string {
  const date = dateInputToDate(value);
  date.setDate(date.getDate() + days);
  return toInputFormat(date);
}

// Soma meses mantendo o dia quando possível (31/01 + 1 mês = 28 ou 29/02).
export function addMonths(value: string, months: number): string {
  const date = dateInputToDate(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toInputFormat(date);
}

// "2026-11-18" -> "18/11/2026"
export function dateInputToDisplay(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

// "18/11/2026" -> "2026-11-18"; "" se estiver incompleta ou não existir (ex.: 31/02/2026).
export function displayToDateInput(text: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return "";
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  const exists = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return exists ? toInputFormat(date) : "";
}

// Máscara de digitação: só dígitos, com as barras colocadas sozinhas ("18112026" -> "18/11/2026").
export function maskDateText(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
