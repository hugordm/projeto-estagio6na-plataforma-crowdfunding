// Mensagem do chat de suporte (POST /chat). As respostas do assistente são texto puro.
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
