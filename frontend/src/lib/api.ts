import type { AuthResponse } from "@/types/user";
import type { Category } from "@/types/category";
import type {
  Campaign,
  CampaignDetail,
  CampaignSearchResult,
  CampaignFilters,
  CampaignInput,
  CampaignUpdate,
} from "@/types/campaign";
import type { ChatMessage } from "@/types/chat";
import type { Donation, DonationInput } from "@/types/donation";
import type { Paginated } from "@/types/pagination";
import { getToken } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Erro de API com a mensagem do backend e o status HTTP (ex.: 409).
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

// Função única de acesso à API: monta a URL, envia JSON (ou FormData, para arquivos),
// anexa o token (se houver sessão) e transforma respostas { error } em ApiError.
async function request<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  // Com FormData o navegador define sozinho o Content-Type (multipart, com o "boundary").
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Tente novamente.", 0);
  }

  // 204 (ex.: DELETE) não tem corpo.
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error ?? `Erro inesperado (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

// Monta "?a=1&b=2" ignorando valores vazios.
function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

// ---------- Autenticação ----------

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
}

export function register(name: string, email: string, password: string) {
  return request<AuthResponse>("/auth/register", { method: "POST", body: { name, email, password } });
}

// Respostas sem dados, só com uma mensagem de confirmação.
type MessageResponse = { message: string };

export function forgotPassword(email: string) {
  return request<MessageResponse>("/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword(token: string, password: string) {
  return request<MessageResponse>("/auth/reset-password", { method: "POST", body: { token, password } });
}

// ---------- Categorias ----------

export function getCategories() {
  return request<Category[]>("/categories");
}

// ---------- Campanhas ----------

export function getCampaigns(filters: CampaignFilters = {}) {
  return request<Paginated<Campaign>>(`/campaigns${toQuery(filters)}`);
}

// Busca inteligente (por significado). Exige o texto da busca (q).
export function searchCampaigns(filters: CampaignFilters & { q: string }) {
  return request<CampaignSearchResult>(`/campaigns/search${toQuery(filters)}`);
}

export function getCampaign(id: number | string) {
  return request<CampaignDetail>(`/campaigns/${id}`);
}

export function createCampaign(input: CampaignInput) {
  return request<CampaignDetail>("/campaigns", { method: "POST", body: input });
}

export function updateCampaign(id: number | string, input: CampaignUpdate) {
  return request<CampaignDetail>(`/campaigns/${id}`, { method: "PUT", body: input });
}

export function deleteCampaign(id: number | string) {
  return request<void>(`/campaigns/${id}`, { method: "DELETE" });
}

// ---------- Upload de imagem ----------

// Envia a imagem de capa (campo "image") e devolve a URL pública dela.
export function uploadCampaignImage(file: File) {
  const form = new FormData();
  form.append("image", file);
  return request<{ url: string }>("/uploads/campaign-image", { method: "POST", body: form });
}

// ---------- Capa gerada por IA ----------

// Gera uma capa a partir dos dados da campanha. O prompt é montado pelo backend.
export function generateAiCover(input: { title: string; description: string; categoryId?: number }) {
  return request<{ url: string }>("/campaigns/ai-cover", { method: "POST", body: input });
}

// ---------- Doações ----------

export function getDonations(campaignId: number | string, page = 1, limit = 10) {
  return request<Paginated<Donation>>(`/campaigns/${campaignId}/donations${toQuery({ page, limit })}`);
}

export function createDonation(campaignId: number | string, input: DonationInput) {
  return request<unknown>(`/campaigns/${campaignId}/donations`, { method: "POST", body: input });
}

// ---------- Chat de suporte ----------

// Envia o histórico da conversa e recebe a resposta do assistente (texto puro).
export function sendChatMessage(messages: ChatMessage[]) {
  return request<{ reply: string }>("/chat", { method: "POST", body: { messages } });
}

// Extrai uma mensagem legível de qualquer erro capturado em um catch.
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado. Tente novamente.";
}
