"use client";

import { maskMoneyInput } from "@/lib/money-input";

type MoneyInputProps = {
  id: string;
  value: string; // já mascarado, ex.: "5.000,00"
  onChange: (masked: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  placeholder?: string;
};

// Campo de valor em reais com prefixo "R$" e máscara brasileira aplicada enquanto se digita.
export function MoneyInput({ id, value, onChange, onBlur, invalid, placeholder }: MoneyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">R$</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="input pl-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(maskMoneyInput(e.target.value))}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={`${id}-help`}
      />
    </div>
  );
}
