"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ErrorMessage } from "./StatusMessage";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  pendingLabel?: string; // texto do botão enquanto a ação roda (ex.: "Excluindo...")
  cancelLabel?: string;
  variant?: "danger" | "primary";
  pending?: boolean;
  error?: string; // erro da API, mostrado dentro do modal
  onConfirm: () => void;
  onCancel: () => void;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal de confirmação no lugar da caixa nativa do navegador. Foco inicial em "Cancelar", foco preso dentro do
// modal, Esc e clique no fundo cancelam (exceto durante o carregamento) e a página não rola enquanto aberto.
// Normalmente é aberto pelo useConfirm (contexts/ConfirmContext.tsx), não diretamente.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancelar",
  variant = "primary",
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Os handlers mudam a cada render; o efeito de teclado lê sempre a versão atual.
  const latest = useRef({ pending, onCancel });
  useEffect(() => {
    latest.current = { pending, onCancel };
  });

  // Ao abrir: trava a rolagem, foca "Cancelar" e, ao fechar, devolve o foco a quem abriu.
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!latest.current.pending) latest.current.onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      // Foco preso: Tab no último volta ao primeiro; Shift+Tab no primeiro vai ao último.
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = dialogRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/50 p-4"
      onMouseDown={(event) => {
        // Só o clique no próprio fundo (não dentro da caixa) cancela.
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        aria-busy={pending}
        tabIndex={-1}
        className="card w-full max-w-md space-y-4 p-6 shadow-lg outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div id={messageId} className="space-y-2 text-sm text-zinc-700">
          {message}
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="flex flex-wrap justify-end gap-3">
          <button ref={cancelRef} type="button" className="btn btn-secondary" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${variant === "danger" ? "btn-danger" : "btn-primary"}`}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
