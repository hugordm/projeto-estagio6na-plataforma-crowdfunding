// Registro simples de "há alterações não salvas na página". O formulário de campanha liga/desliga
// a marca; o botão "Voltar" e o "Cancelar" perguntam antes de sair quando ela está ligada.

const LEAVE_MESSAGE = "Você tem alterações não salvas. Deseja sair mesmo assim?";

let hasUnsavedChanges = false;

export function setUnsavedChanges(value: boolean): void {
  hasUnsavedChanges = value;
}

// true se pode sair (não há alterações ou a pessoa confirmou).
export function confirmLeave(): boolean {
  return !hasUnsavedChanges || window.confirm(LEAVE_MESSAGE);
}
