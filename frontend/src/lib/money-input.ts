// Máscara de dinheiro brasileira para campos de digitação (ex.: "5.000,00").
// Os dígitos digitados são lidos como centavos: digitar 5, 0, 0, 0, 0, 0 mostra 5.000,00.

const MAX_DIGITS = 12; // até 9.999.999.999,99, o máximo aceito pela API

// Qualquer texto -> texto mascarado ("500000" -> "5.000,00"; "" -> "").
export function maskMoneyInput(text: string): string {
  const digits = text.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);
  if (!digits) return "";
  const padded = digits.padStart(3, "0");
  const integer = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${integer},${padded.slice(-2)}`;
}

// Texto mascarado -> formato da API, com ponto e duas casas ("5.000,00" -> "5000.00").
export function moneyInputToApi(masked: string): string {
  if (!masked) return "";
  return masked.replace(/\./g, "").replace(",", ".");
}

// Formato da API -> texto mascarado ("5000.00" -> "5.000,00"), usado ao editar.
export function apiToMoneyInput(value: string): string {
  return maskMoneyInput(Number(value).toFixed(2));
}
