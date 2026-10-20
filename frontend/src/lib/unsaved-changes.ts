// Registro simples de "há alterações não salvas na página". O formulário de campanha liga/desliga
// a marca; o botão "Voltar", o "Cancelar" e os links do site perguntam antes de sair quando ela está ligada.
// A pergunta é o modal do ConfirmProvider (contexts/ConfirmContext.tsx), que se registra aqui.

const LEAVE_MESSAGE = "Você tem alterações não salvas. Se sair agora, elas serão perdidas.";

type LeaveConfirmer = (message: string) => Promise<boolean>;

let hasUnsavedChanges = false;
let leaveConfirmer: LeaveConfirmer | null = null;

export function setUnsavedChanges(value: boolean): void {
  hasUnsavedChanges = value;
}

// Chamado pelo ConfirmProvider; devolve a função que desfaz o registro.
export function setLeaveConfirmer(confirmer: LeaveConfirmer): () => void {
  leaveConfirmer = confirmer;
  return () => {
    if (leaveConfirmer === confirmer) leaveConfirmer = null;
  };
}

// true se pode sair (não há alterações ou a pessoa confirmou). Sem o provider montado (não deveria
// acontecer: ele fica no layout raiz), deixa sair.
export async function confirmLeave(): Promise<boolean> {
  if (!hasUnsavedChanges || !leaveConfirmer) return true;
  return leaveConfirmer(LEAVE_MESSAGE);
}
