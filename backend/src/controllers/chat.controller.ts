import type { Request, Response } from 'express';
import { z } from 'zod';
import * as chatService from '../services/chat.service';

export const MAX_MESSAGE_CHARS = 1000;

// Só "user" e "assistant": o cliente não pode enviar mensagens "system" (instruções ao modelo).
const messageSchema = z.object({
  role: z.enum(['user', 'assistant'], { error: 'role deve ser "user" ou "assistant"' }),
  content: z
    .string({ error: 'Mensagem deve ser um texto' })
    .trim()
    .min(1, 'Mensagem vazia')
    .max(MAX_MESSAGE_CHARS, `Cada mensagem deve ter no máximo ${MAX_MESSAGE_CHARS} caracteres`),
});

const chatSchema = z.object({
  messages: z
    .array(messageSchema, { error: 'Envie o histórico em "messages"' })
    .min(1, 'Envie ao menos uma mensagem')
    .max(50, 'Histórico muito longo')
    .refine((messages) => messages[messages.length - 1]?.role === 'user', 'A última mensagem deve ser do usuário'),
});

// POST /chat { messages: [{ role, content }] } -> { reply } (texto puro)
export async function send(req: Request, res: Response) {
  const { messages } = chatSchema.parse(req.body ?? {});
  res.json({ reply: await chatService.answer(messages) });
}
