import { daysFromToday } from "./date-input";
import { formatCurrency } from "./format";
import { moneyInputToApi } from "./money-input";

// Regras do formulário de campanha: os MESMOS limites validados pelo backend (zod), para o usuário
// ver o erro ao lado do campo antes de enviar. O backend continua validando de novo.
export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 5000;
export const GOAL_MIN = 0.01; // backend: maior que zero, com até 2 casas decimais
export const GOAL_MAX = 9999999999.99;
export const GOAL_HINT = `De ${formatCurrency(GOAL_MIN)} a ${formatCurrency(GOAL_MAX)}.`;

export type CampaignFieldValues = {
  title: string;
  description: string;
  goalAmount: string; // mascarado, ex.: "5.000,00"
  deadline: string; // "AAAA-MM-DD"
  categoryId: string;
};

export type CampaignField = keyof CampaignFieldValues;
export type CampaignErrors = Partial<Record<CampaignField, string>>;

// Devolve a mensagem de erro do campo, ou "" se estiver válido.
export function validateField(field: CampaignField, values: CampaignFieldValues): string {
  switch (field) {
    case "title": {
      const length = values.title.trim().length;
      if (length === 0) return "Informe o título.";
      if (length < TITLE_MIN) return `O título deve ter pelo menos ${TITLE_MIN} caracteres.`;
      if (length > TITLE_MAX) return `O título deve ter no máximo ${TITLE_MAX} caracteres.`;
      return "";
    }
    case "description": {
      const length = values.description.trim().length;
      if (length === 0) return "Informe a descrição.";
      if (length < DESCRIPTION_MIN) return `A descrição deve ter pelo menos ${DESCRIPTION_MIN} caracteres.`;
      if (length > DESCRIPTION_MAX) return `A descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.`;
      return "";
    }
    case "goalAmount": {
      const amount = Number(moneyInputToApi(values.goalAmount));
      if (!values.goalAmount || !(amount >= GOAL_MIN)) return `Informe uma meta de pelo menos ${formatCurrency(GOAL_MIN)}.`;
      if (amount > GOAL_MAX) return `A meta pode ser de no máximo ${formatCurrency(GOAL_MAX)}.`;
      return "";
    }
    case "deadline":
      if (!values.deadline) return "Escolha o prazo da campanha.";
      // Comparar as strings "AAAA-MM-DD" funciona porque o formato é ordenável.
      if (values.deadline < daysFromToday(0)) return "O prazo deve ser hoje ou uma data futura.";
      return "";
    case "categoryId":
      return values.categoryId ? "" : "Escolha uma categoria.";
  }
}

export function validateAll(values: CampaignFieldValues): CampaignErrors {
  const errors: CampaignErrors = {};
  for (const field of Object.keys(values) as CampaignField[]) {
    const message = validateField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}

// Dica dos botões de IA (melhorar descrição, sugerir categoria, gerar capa): uma frase curta dizendo
// exatamente o que falta. "" quando título e descrição já têm o mínimo e a IA pode ser usada.
export function aiMissingHint(title: string, description: string): string {
  const titleMissing = title.trim().length < TITLE_MIN;
  const descriptionMissing = description.trim().length < DESCRIPTION_MIN;
  if (titleMissing && descriptionMissing) {
    return `Faltam o título e a descrição (mín. ${TITLE_MIN} e ${DESCRIPTION_MIN} caracteres).`;
  }
  if (titleMissing) return `Falta o título (mín. ${TITLE_MIN} caracteres).`;
  if (descriptionMissing) return `Falta a descrição (mín. ${DESCRIPTION_MIN} caracteres).`;
  return "";
}
