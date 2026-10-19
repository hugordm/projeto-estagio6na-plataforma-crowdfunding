"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { errorMessage, sendChatMessage } from "@/lib/api";
import type { ChatMessage } from "@/types/chat";

const MAX_CHARS = 1000; // mesmo limite do backend
const HISTORY_SENT = 10; // o backend também usa só as 10 últimas

// Botão flutuante + janela de chat de suporte, presente em todas as páginas (fica no layout).
// A classe chat-widget permite subir o botão em páginas com barra de ações fixa (globals.css).
// O histórico fica só na memória: some ao recarregar a página.
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Ao abrir, coloca o foco no campo de texto.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Rola até a mensagem mais recente.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setError("");
    setSending(true);
    try {
      const { reply } = await sendChatMessage(history.slice(-HISTORY_SENT));
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  // Enter envia; Shift+Enter quebra a linha.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="chat-widget fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          id="chat-panel"
          role="dialog"
          aria-label="Assistente de ajuda"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="card flex h-[28rem] max-h-[calc(100vh-6rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 bg-emerald-600 px-4 py-3 text-white">
            <span className="font-semibold">Assistente de ajuda</span>
            <button type="button" aria-label="Fechar chat" className="text-xl leading-none" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
            <Bubble role="assistant">
              Olá! Posso ajudar com dúvidas sobre como criar campanhas, doar ou recuperar sua senha.
            </Bubble>
            {messages.map((message, index) => (
              <Bubble key={index} role={message.role}>
                {message.content}
              </Bubble>
            ))}
            {sending && <p className="text-xs text-zinc-500">Digitando...</p>}
            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-zinc-200 p-3">
            <label htmlFor="chat-input" className="sr-only">
              Sua pergunta
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={2}
              maxLength={MAX_CHARS}
              placeholder="Escreva sua dúvida..."
              className="input resize-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => setOpen(!open)}
        className="btn btn-primary rounded-full px-5 py-3 shadow-lg"
      >
        {open ? "Fechar ajuda" : "Precisa de ajuda?"}
      </button>
    </div>
  );
}

// Balão de mensagem. whitespace-pre-wrap mantém as quebras de linha do texto puro;
// o conteúdo é exibido como texto (sem interpretar markdown nem HTML).
function Bubble({ role, children }: { role: ChatMessage["role"]; children: ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] rounded-lg px-3 py-2 whitespace-pre-wrap ${
          isUser ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-800"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
