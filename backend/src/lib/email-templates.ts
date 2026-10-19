import type { Email } from './mailer';

// Escapa caracteres especiais de HTML (o nome do usuário é texto livre).
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function passwordResetEmail(to: string, name: string, link: string, validMinutes: number): Email {
  const text = [
    `Olá, ${name}!`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta na Plataforma de Crowdfunding.',
    `Para criar uma nova senha, acesse o link abaixo (válido por ${validMinutes} minutos):`,
    '',
    link,
    '',
    'Se você não fez esse pedido, ignore este e-mail: sua senha continua a mesma.',
  ].join('\n');

  const html = `
<div style="font-family: Arial, sans-serif; font-size: 15px; color: #222; max-width: 520px;">
  <p>Olá, ${escapeHtml(name)}!</p>
  <p>Recebemos um pedido para redefinir a senha da sua conta na Plataforma de Crowdfunding.</p>
  <p>
    <a href="${link}" style="display: inline-block; background: #059669; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">
      Criar nova senha
    </a>
  </p>
  <p>O link é válido por ${validMinutes} minutos. Se o botão não funcionar, copie e cole no navegador:</p>
  <p style="word-break: break-all; color: #555;">${link}</p>
  <p>Se você não fez esse pedido, ignore este e-mail: sua senha continua a mesma.</p>
</div>`.trim();

  return { to, subject: 'Redefinição de senha', html, text };
}
