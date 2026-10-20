"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { errorMessage } from "@/lib/api";
import { setLeaveConfirmer } from "@/lib/unsaved-changes";

export type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  // Ação executada ao confirmar, com o modal aberto e o botão em carregamento. Se falhar, o erro
  // aparece dentro do modal e ele continua aberto (a pessoa pode tentar de novo ou cancelar).
  action?: () => Promise<unknown>;
};

// true = confirmou (e a ação, se houver, deu certo); false = cancelou.
type Confirm = (options: ConfirmOptions) => Promise<boolean>;

type DialogState = { options: ConfirmOptions; pending: boolean; error: string };

const ConfirmContext = createContext<Confirm | null>(null);

// Um único modal de confirmação para o site inteiro, aberto com:
//   const askConfirm = useConfirm();
//   if (await askConfirm({ title, message, confirmLabel, action })) { ... }
// Também atende ao aviso de alterações não salvas (lib/unsaved-changes.ts).
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  const askConfirm = useCallback<Confirm>((options) => {
    // Um pedido novo substitui o anterior, que conta como cancelado.
    resolveRef.current?.(false);
    setDialog({ options, pending: false, error: "" });
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  useEffect(
    () =>
      setLeaveConfirmer((message) =>
        askConfirm({ title: "Sair sem salvar?", message, confirmLabel: "Sair sem salvar", cancelLabel: "Continuar editando", variant: "danger" }),
      ),
    [askConfirm],
  );

  async function handleConfirm() {
    if (!dialog) return;
    const { action } = dialog.options;
    if (!action) return close(true);
    setDialog({ ...dialog, pending: true, error: "" });
    try {
      await action();
      close(true);
    } catch (err) {
      setDialog((current) => current && { ...current, pending: false, error: errorMessage(err) });
    }
  }

  return (
    <ConfirmContext.Provider value={askConfirm}>
      {children}
      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.options.title ?? ""}
        message={dialog?.options.message}
        confirmLabel={dialog?.options.confirmLabel ?? ""}
        pendingLabel={dialog?.options.pendingLabel}
        cancelLabel={dialog?.options.cancelLabel}
        variant={dialog?.options.variant}
        pending={dialog?.pending}
        error={dialog?.error}
        onConfirm={handleConfirm}
        onCancel={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const askConfirm = useContext(ConfirmContext);
  if (!askConfirm) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>");
  return askConfirm;
}
