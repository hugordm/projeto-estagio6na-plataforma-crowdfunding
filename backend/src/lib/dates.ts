// Datas de prazo em dias de calendário no fuso America/Sao_Paulo, independentemente do fuso do
// servidor (o Render roda em UTC). Só Intl.DateTimeFormat (com timeZone), sem biblioteca.
// O frontend tem as mesmas regras em frontend/src/lib/date-input.ts.

export const TIME_ZONE = 'America/Sao_Paulo';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// en-CA formata como "AAAA-MM-DD".
const calendarFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

// Data de calendário ("AAAA-MM-DD") do instante, no fuso de São Paulo.
export function calendarDateInSaoPaulo(date: Date): string {
  return calendarFormatter.format(date);
}

export function todayInSaoPaulo(now: Date = new Date()): string {
  return calendarDateInSaoPaulo(now);
}

// "AAAA-MM-DD" válida (existe no calendário, ex.: 2028-02-29 sim, 2026-02-29 não)?
export function isCalendarDate(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// "AAAA-MM-DD" -> número do dia (dias desde 1970-01-01), para subtrair datas de calendário.
function dayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

// Diferença do horário de São Paulo para o UTC, em ms, naquele instante (ex.: -3 h = -10800000).
function offsetMs(instant: number): number {
  const parts = Object.fromEntries(partsFormatter.formatToParts(instant).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

// Instante do início do dia "AAAA-MM-DD" em São Paulo. Recalcula o deslocamento no resultado para
// acertar dias com mudança de horário de verão (não há desde 2019, mas houve): se a meia-noite não
// existiu (o relógio pulou de 00:00 para 01:00), o dia começa no instante do pulo.
function startOfDayInSaoPaulo(value: string): number {
  const midnightUtc = dayNumber(value) * DAY_MS;
  const guess = midnightUtc - offsetMs(midnightUtc);
  const result = midnightUtc - offsetMs(guess);
  return offsetMs(result) === offsetMs(guess) ? result : guess;
}

// Soma dias a uma data de calendário ("AAAA-MM-DD"); aceita negativos.
export function addCalendarDays(value: string, days: number): string {
  return new Date((dayNumber(value) + days) * DAY_MS).toISOString().slice(0, 10);
}

// Dias de calendário entre hoje e o prazo, em São Paulo: prazo hoje = 0, amanhã = 1, ontem = -1.
export function diffCalendarDays(deadline: Date, now: Date = new Date()): number {
  return dayNumber(calendarDateInSaoPaulo(deadline)) - dayNumber(todayInSaoPaulo(now));
}

// Último instante do dia do prazo em São Paulo (23:59:59.999). A campanha recebe doações até ele.
// Aceita a data de calendário ("AAAA-MM-DD") ou um instante (vale a data dele em São Paulo).
export function endOfDeadlineDay(deadline: Date | string): Date {
  const day = typeof deadline === 'string' ? deadline : calendarDateInSaoPaulo(deadline);
  return new Date(startOfDayInSaoPaulo(addCalendarDays(day, 1)) - 1);
}

// O prazo já passou (o dia do prazo terminou em São Paulo)?
export function isDeadlineOver(deadline: Date, now: Date = new Date()): boolean {
  return now.getTime() > endOfDeadlineDay(deadline).getTime();
}
