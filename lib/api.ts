// ============================================================
// API 클라이언트
// 모든 백엔드 호출은 이 파일을 통해서만 이루어집니다.
// ============================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// ============================================================
// 공통 타입
// ============================================================
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: { code?: string; message?: string };
};

export type Ingredient = {
  id: number;
  bit_id: number;
  name: string;
  category: string;
  default_shelf_days: number;
  risk_factor: string;
};

export type TrafficLight = "red" | "yellow" | "green";

export type InventoryItemRaw = {
  id: number;
  user_id: string;
  ingredient_master_id: number;
  quantity: string;
  unit: string;
  expire_date: string;
  created_at: string;
  ingredient: Ingredient;
  traffic_light: TrafficLight;
  score: number;
};

export type UserInfo = {
  id: string;
  email: string;
  created_at: string;
};

// ============================================================
// 토큰 관리
// ============================================================
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const base: Record<string, string> = {
    "Content-Type": "application/json",
    accept: "application/json",
  };
  if (token) base.Authorization = `Bearer ${token}`;
  return base;
}

// ============================================================
// 공통 fetch 래퍼 - 401 자동 처리, 에러 메시지 추출
// ============================================================
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });

  // 401: 토큰 만료 → 자동 로그아웃 후 로그인 페이지로
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("로그인이 만료되었습니다.");
  }

  // 응답 본문 파싱 (JSON 아닐 수도 있음)
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!res.ok) {
    const errMsg =
      (body as { error?: { message?: string } })?.error?.message ??
      (body as { detail?: string })?.detail ??
      (body as { message?: string })?.message ??
      `요청 실패 (${res.status})`;
    throw new Error(errMsg);
  }

  return body as T;
}

// ============================================================
// 인증
// ============================================================
export function signup(data: { email: string; password: string }) {
  return request<ApiResponse<{ access_token: string; user: UserInfo }>>(
    "/api/v1/auth/signup",
    { method: "POST", body: JSON.stringify(data) }
  );
}

export function login(data: { email: string; password: string }) {
  return request<ApiResponse<{ access_token: string; user: UserInfo }>>(
    "/api/v1/auth/login",
    { method: "POST", body: JSON.stringify(data) }
  );
}

export function getMyInfo() {
  return request<ApiResponse<UserInfo>>("/api/v1/auth/me", { method: "GET" });
}

// ============================================================
// 식재료 마스터
// ============================================================
export function searchIngredients(params?: {
  q?: string;
  category?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.category) search.set("category", params.category);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return request<ApiResponse<Ingredient[]>>(
    `/api/v1/ingredients${qs ? `?${qs}` : ""}`,
    { method: "GET" }
  );
}

// ============================================================
// 재고 (Inventory)
// ============================================================
export function getInventory(sort: "recommended" | "expire_date" = "recommended") {
  return request<ApiResponse<{ total: number; items: InventoryItemRaw[] }>>(
    `/api/v1/inventory?sort=${sort}`,
    { method: "GET" }
  );
}

export function addInventory(data: {
  ingredient_master_id: number;
  quantity: number | string;
  unit?: string;
  expire_date?: string;
}) {
  return request<ApiResponse<InventoryItemRaw>>("/api/v1/inventory", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateInventory(
  id: number,
  data: {
    quantity?: number | string;
    unit?: string;
    expire_date?: string;
  }
) {
  return request<ApiResponse<InventoryItemRaw>>(`/api/v1/inventory/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteInventory(id: number) {
  return request<ApiResponse<null>>(`/api/v1/inventory/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// 헬퍼
// ============================================================
export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
  }
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}
