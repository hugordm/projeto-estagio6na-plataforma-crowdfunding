import type { ReactNode } from "react";

type FormFieldProps = {
  id: string; // id do campo; a mensagem fica em `${id}-help` (use em aria-describedby)
  label: string;
  error?: string;
  hint?: string; // texto de ajuda mostrado quando não há erro
  count?: number; // caracteres digitados (mostra o contador quando houver "max")
  max?: number;
  action?: ReactNode; // botão ao lado do rótulo (ex.: ação de IA)
  children: ReactNode;
};

// Moldura de um campo: rótulo, ação opcional, o próprio campo, e embaixo a mensagem de erro
// (ou a dica) e o contador de caracteres.
export function FormField({ id, label, error, hint, count, max, action, children }: FormFieldProps) {
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="label mb-0">
          {label}
        </label>
        {action}
      </div>
      {children}
      <div className="mt-1 flex items-start justify-between gap-3 text-xs">
        <p id={`${id}-help`} className={error ? "text-red-700" : "text-zinc-500"} aria-live="polite">
          {error || hint}
        </p>
        {max !== undefined && count !== undefined && (
          <span className={`shrink-0 tabular-nums ${count > max ? "text-red-700" : "text-zinc-500"}`}>
            {count}/{max}
          </span>
        )}
      </div>
    </div>
  );
}
