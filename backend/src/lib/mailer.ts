// Envio de e-mail pela API REST do Resend (https://resend.com/docs/api-reference/emails/send-email).
// Usamos fetch direto em vez do SDK: é uma única chamada HTTP e assim controlamos o timeout.

import './network';

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

// Lança erro se o envio falhar; quem chama decide se isso é grave (na recuperação de senha, só registramos log).
export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('E-mail não configurado (RESEND_API_KEY ou RESEND_FROM_EMAIL ausente)');

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    // O corpo do erro do Resend não contém a chave; registramos só status e mensagem.
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`Resend respondeu ${response.status}: ${body?.message ?? 'erro desconhecido'}`);
  }
}
