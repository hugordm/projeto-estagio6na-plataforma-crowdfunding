import type { AuthResponse } from "@/types/user";
import type { Category } from "@/types/category";
import type {
  Campaign,
  CampaignDetail,
  MyCampaign,
  CampaignFilters,
  CampaignInput,
  CampaignUpdate,
} from "@/types/campaign";
import type { ChatMessage } from "@/types/chat";
import type { Features } from "@/types/features";
import type { Donation, DonationInput, MyDonation } from "@/types/donation";
import type { Paginated } from "@/types/pagination";
import { clearSession, getToken, SESSION_EXPIRED_EVENT } from "./session";

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
    // Token recusado (expirou ou a senha foi redefinida em outro lugar): encerra a sessão local.
    if (response.status === 401 && token && !path.startsWith("/auth/")) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      throw new ApiError("Sua sessão expirou. Entre novamente.", 401);
    }
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

// ---------- Configuração ----------

// Recursos de IA ligados no servidor (só booleanos).
export function getFeatures() {
  return request<Features>("/config/features");
}

// ---------- Categorias ----------

export function getCategories() {
  return request<Category[]>("/categories");
}

// ---------- Campanhas ----------

export function getCampaigns(filters: CampaignFilters = {}) {
  return request<Paginated<Campaign>>(`/campaigns${toQuery(filters)}`);
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

// ---------- IA no formulário ----------

// Reescreve a descrição (mais clara, sem inventar fatos). Nada é aplicado sem a confirmação do usuário.
export function improveDescription(input: { title: string; description: string; category?: string }) {
  return request<{ description: string }>("/campaigns/ai-description", { method: "POST", body: input });
}

// Sugere uma das categorias existentes a partir do título e da descrição.
export function suggestCategory(input: { title: string; description: string }) {
  return request<{ categoryId: number }>("/campaigns/ai-category", { method: "POST", body: input });
}

// ---------- Doações ----------

export function getDonations(campaignId: number | string, page = 1, limit = 10) {
  return request<Paginated<Donation>>(`/campaigns/${campaignId}/donations${toQuery({ page, limit })}`);
}

export function createDonation(campaignId: number | string, input: DonationInput) {
  return request<unknown>(`/campaigns/${campaignId}/donations`, { method: "POST", body: input });
}

// ---------- Minha conta ----------

export function getMyCampaigns(page = 1, limit = 9) {
  return request<Paginated<MyCampaign>>(`/me/campaigns${toQuery({ page, limit })}`);
}

export function getMyDonations(page = 1, limit = 10) {
  return request<Paginated<MyDonation>>(`/me/donations${toQuery({ page, limit })}`);
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
