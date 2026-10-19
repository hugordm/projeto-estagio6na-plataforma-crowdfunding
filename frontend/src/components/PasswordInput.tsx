"use client";

import { useState } from "react";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password"; // login usa current-password; cadastro e nova senha, new-password
  maxLength?: number;
  invalid?: boolean;
  describedBy?: string;
};

// Campo de senha com botão de olho à direita para mostrar/ocultar o texto.
// Só o "type" do campo muda; id, name e autoComplete continuam iguais (gerenciadores de senha seguem funcionando).
export function PasswordInput({ id, value, onChange, autoComplete, maxLength, invalid, describedBy }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        maxLength={maxLength}
        autoCapitalize="none"
        spellCheck={false}
        className="input pr-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-zinc-500 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
