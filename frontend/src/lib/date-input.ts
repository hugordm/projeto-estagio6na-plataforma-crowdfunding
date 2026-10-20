// Datas de calendário no formato "AAAA-MM-DD". "Hoje" e o prazo são sempre contados no fuso
// America/Sao_Paulo, qualquer que seja o fuso do navegador: a mesma regra de backend/src/lib/dates.ts.

export const TIME_ZONE = "America/Sao_Paulo";

const DAY_MS = 24 * 60 * 60 * 1000;
// en-CA formata como "AAAA-MM-DD".
const calendarFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

function toInputFormat(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Data de calendário do instante em São Paulo.
export function calendarDateInSaoPaulo(date: Date): string {
  return calendarFormatter.format(date);
}

export function todayInSaoPaulo(now: Date = new Date()): string {
  return calendarDateInSaoPaulo(now);
}

// "2026-12-20T02:59:59.999Z" (prazo gravado pela API) -> "2026-12-19" (o dia em São Paulo)
export function isoToDateInput(iso: string): string {
  return calendarDateInSaoPaulo(new Date(iso));
}

// "AAAA-MM-DD" -> número do dia (dias desde 1970-01-01), para subtrair datas de calendário.
function dayNumber(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

// Dias de calendário de hoje (São Paulo) até o prazo "AAAA-MM-DD": hoje = 0, amanhã = 1, ontem = -1.
// Usado só na pré-visualização; nas demais telas o daysLeft vem do backend.
export function diffCalendarDays(deadline: string, now: Date = new Date()): number {
  return dayNumber(deadline) - dayNumber(todayInSaoPaulo(now));
}

// Data de hoje + N dias em São Paulo (ex.: daysFromToday(30) = atalho "30 dias").
export function daysFromToday(days: number, now: Date = new Date()): string {
  return addDays(todayInSaoPaulo(now), days);
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

// Soma dias a uma data "AAAA-MM-DD" (aceita negativos). Conta em UTC: não sofre com horário de verão.
export function addDays(value: string, days: number): string {
  return new Date((dayNumber(value) + days) * DAY_MS).toISOString().slice(0, 10);
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
