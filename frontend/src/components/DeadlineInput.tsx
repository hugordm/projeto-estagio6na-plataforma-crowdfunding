"use client";

import { daysFromToday } from "@/lib/date-input";
import { DatePicker } from "./DatePicker";

const SHORTCUTS = [30, 60, 90];

type DeadlineInputProps = {
  id: string;
  value: string; // "AAAA-MM-DD"
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
};

// Prazo da campanha: calendário (DatePicker) com mínimo de amanhã e atalhos de 30, 60 e 90 dias
// a partir de hoje. O atalho que corresponde à data escolhida fica destacado.
export function DeadlineInput({ id, value, onChange, onBlur, invalid }: DeadlineInputProps) {
  return (
    <div className="space-y-2">
      <DatePicker
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        min={daysFromToday(1)}
        invalid={invalid}
        describedBy={`${id}-help`}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos de prazo">
        {SHORTCUTS.map((days) => {
          const active = value === daysFromToday(days);
          return (
            <button
              key={days}
              type="button"
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                active
                  ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-800"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              }`}
              onClick={() => onChange(daysFromToday(days))}
            >
              {days} dias
            </button>
          );
        })}
      </div>
    </div>
  );
}
