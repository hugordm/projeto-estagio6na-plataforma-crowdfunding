// Recursos de IA ligados no servidor (GET /config/features).
export type Features = {
  semanticSearch: boolean; // "Busca inteligente"
  aiCover: boolean; // "Gerar com IA" na capa
  aiChat: boolean; // chatbot de suporte
  aiWriting: boolean; // "Melhorar descrição com IA" e "Sugerir categoria"
};
