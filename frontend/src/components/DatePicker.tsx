"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import {
  addDays,
  addMonths,
  dateInputToDate,
  dateInputToDisplay,
  dateToDateInput,
  daysFromToday,
  displayToDateInput,
  maskDateText,
  MONTH_NAMES,
  WEEKDAY_NAMES,
} from "@/lib/date-input";

type DatePickerProps = {
  id: string;
  value: string; // "AAAA-MM-DD" ou "" (vazio, incompleto ou inválido)
  onChange: (value: string) => void;
  onBlur?: () => void; // quando o foco sai do campo e do calendário
  min?: string; // "AAAA-MM-DD": dias anteriores ficam desabilitados
  invalid?: boolean;
  describedBy?: string;
};

// Campo de data com digitação em dd/mm/aaaa (máscara) e um calendário em português que abre
// num popover. Teclado no calendário: setas (dia/semana), PageUp/PageDown (mês),
// Shift+PageUp/PageDown (ano), Home/End (início/fim da semana), Enter escolhe, Esc fecha.
export function DatePicker({ id, value, onChange, onBlur, min, invalid, describedBy }: DatePickerProps) {
  const [text, setText] = useState(value ? dateInputToDisplay(value) : "");
  const [open, setOpen] = useState(false);
  const [focusDay, setFocusDay] = useState(""); // dia com foco no calendário ("AAAA-MM-DD")

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // O valor pode mudar por fora (ex.: atalho "30 dias"): o texto acompanha.
  // Texto incompleto equivale a "" e não é apagado enquanto a pessoa digita.
  if (displayToDateInput(text) !== value) setText(value ? dateInputToDisplay(value) : "");

  const today = daysFromToday(0);
  const isDisabled = (day: string) => Boolean(min && day < min);

  function openCalendar() {
    const start = value && !isDisabled(value) ? value : min && today < min ? min : today;
    setFocusDay(start);
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) inputRef.current?.focus();
  }

  function select(day: string) {
    if (isDisabled(day)) return;
    onChange(day);
    close(true);
  }

  // Leva o foco ao dia ativo sempre que o calendário abre ou o dia muda pelo teclado.
  useEffect(() => {
    if (open) popoverRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [open, focusDay]);

  // Fecha ao clicar fora do componente.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Em telas estreitas, desloca o popover para dentro da tela se ele passar da borda direita.
  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (!open || !popover) return;
    popover.style.transform = "";
    const overflow = popover.getBoundingClientRect().right - (window.innerWidth - 8);
    if (overflow > 0) popover.style.transform = `translateX(-${overflow}px)`;
  }, [open]);

  function handleText(raw: string) {
    const masked = maskDateText(raw);
    setText(masked);
    onChange(displayToDateInput(masked));
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (containerRef.current?.contains(event.relatedTarget as Node | null)) return;
    setOpen(false);
    onBlur?.();
  }

  function moveFocus(next: string) {
    setFocusDay(min && next < min ? min : next);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const date = dateInputToDate(focusDay);
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      Home: () => addDays(focusDay, -date.getDay()),
      End: () => addDays(focusDay, 6 - date.getDay()),
      PageUp: () => addMonths(focusDay, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusDay, event.shiftKey ? 12 : 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveFocus(move());
  }

  // Mês mostrado = mês do dia com foco.
  const view = dateInputToDate(focusDay || today);
  const viewYear = view.getFullYear();
  const viewMonth = view.getMonth();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthName = MONTH_NAMES[viewMonth];
  const monthLabel = `${monthName[0].toUpperCase()}${monthName.slice(1)} de ${viewYear}`; // "Outubro de 2026"
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateToDateInput(new Date(viewYear, viewMonth, i + 1))),
  ];
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Não deixa navegar para meses inteiramente antes da data mínima.
  const minMonthStart = min ? min.slice(0, 7) : "";
  const canGoBack = (months: number) => !minMonthStart || addMonths(focusDay, -months).slice(0, 7) >= minMonthStart;

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          className="input pr-11"
          value={text}
          onChange={(e) => handleText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && e.altKey) {
              e.preventDefault();
              openCalendar();
            }
          }}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => (open ? close(true) : openCalendar())}
          aria-label={open ? "Fechar calendário" : "Abrir calendário"}
          aria-expanded={open}
          aria-controls={`${id}-calendar`}
          aria-haspopup="dialog"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-zinc-500 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600"
        >
          <CalendarIcon />
        </button>
      </div>

      {open && (
        <div
          ref={popoverRef}
          id={`${id}-calendar`}
          role="dialog"
          aria-label="Escolher data" // z-[60]: acima do botão flutuante do chatbot (z-50)
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close(true);
            }
          }}
          className="card absolute top-full left-0 z-[60] mt-2 w-[min(20rem,calc(100vw-2rem))] p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <NavButton label="Ano anterior" disabled={!canGoBack(12)} onClick={() => moveFocus(addMonths(focusDay, -12))}>
              «
            </NavButton>
            <NavButton label="Mês anterior" disabled={!canGoBack(1)} onClick={() => moveFocus(addMonths(focusDay, -1))}>
              ‹
            </NavButton>
            <p className="flex-1 text-center text-sm font-semibold text-zinc-800" aria-live="polite">
              {monthLabel}
            </p>
            <NavButton label="Próximo mês" onClick={() => moveFocus(addMonths(focusDay, 1))}>
              ›
            </NavButton>
            <NavButton label="Próximo ano" onClick={() => moveFocus(addMonths(focusDay, 12))}>
              »
            </NavButton>
          </div>

          <div role="grid" aria-label={monthLabel} onKeyDown={handleGridKeyDown}>
            <div role="row" className="grid grid-cols-7 text-center text-xs font-medium text-zinc-500">
              {WEEKDAY_NAMES.map((name) => (
                <abbr key={name} role="columnheader" title={name} className="py-1 no-underline">
                  {name.slice(0, 3)}
                </abbr>
              ))}
            </div>
            {weeks.map((week, row) => (
              <div key={row} role="row" className="grid grid-cols-7 gap-0.5">
                {week.map((day, col) =>
                  day ? (
                    <div key={day} role="gridcell" aria-selected={day === value}>
                      <DayButton
                        day={day}
                        selected={day === value}
                        isToday={day === today}
                        disabled={isDisabled(day)}
                        focused={day === focusDay}
                        onSelect={select}
                      />
                    </div>
                  ) : (
                    <div key={`vazio-${col}`} role="gridcell" />
                  ),
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-zinc-500">Setas para mudar o dia, Enter para escolher, Esc para fechar.</p>
        </div>
      )}
    </div>
  );
}

type DayButtonProps = {
  day: string;
  selected: boolean;
  isToday: boolean;
  disabled: boolean;
  focused: boolean;
  onSelect: (day: string) => void;
};

function DayButton({ day, selected, isToday, disabled, focused, onSelect }: DayButtonProps) {
  const date = dateInputToDate(day);
  const label = `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}, ${WEEKDAY_NAMES[date.getDay()]}${
    isToday ? ", hoje" : ""
  }${disabled ? ", indisponível" : ""}`;

  const style = selected
    ? "bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
    : disabled
      ? "cursor-not-allowed text-zinc-300"
      : "text-zinc-800 hover:bg-emerald-50";

  return (
    <button
      type="button"
      data-day={day}
      tabIndex={focused ? 0 : -1} // só o dia ativo entra no Tab; as setas mudam o dia
      aria-label={label}
      aria-current={isToday ? "date" : undefined}
      aria-disabled={disabled || undefined}
      onClick={() => onSelect(day)}
      className={`flex h-9 w-full items-center justify-center rounded-md text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 ${style} ${
        isToday && !selected ? "font-semibold ring-1 ring-emerald-600 ring-inset" : ""
      }`}
    >
      {date.getDate()}
    </button>
  );
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
