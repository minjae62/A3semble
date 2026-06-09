// ============================================================
// OCR API 타입 (docs/api-spec-ocr.md 와 일치)
// ============================================================
export type RecommendedAction =
  | "auto_candidate"
  | "needs_confirmation"
  | "no_candidate"
  | "excluded";

export type MatchType = "override" | "exact" | "fuzzy" | "";

export type OcrCandidate = {
  ingredient_id: number;
  name: string;
  score: number;
};

export type ReceiptMatchRow = {
  ocr_name: string;
  normalized_name: string;
  count: string;
  price: string;
  name_confidence: number;
  is_excluded: boolean;
  is_processed_food: boolean;
  match_type: MatchType;
  matched_by_keyword: string;
  candidates: OcrCandidate[];
  recommended_action: RecommendedAction;
};

export type OcrReceiptResponse = {
  success: boolean;
  data: { items: ReceiptMatchRow[] };
  message?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

type BackendOcrAction = "register" | "review" | "skip";

type BackendOcrCandidate = {
  ingredient_master_id: number;
  ingredient_name: string;
  confidence: number;
};

type BackendOcrItem = {
  raw_text: string;
  recommended_action: BackendOcrAction;
  candidates: BackendOcrCandidate[];
};

type BackendOcrResponse = {
  success: boolean;
  data: { items: BackendOcrItem[] };
  message?: string;
};

export type OcrConfirmItem = {
  ingredient_master_id: number;
  quantity: number;
  expire_date?: string;
};

export type OcrConfirmResponse = {
  success: boolean;
  data: {
    registered: unknown[];
    errors: unknown[];
  };
  message?: string;
};

function mapRecommendedAction(action: BackendOcrAction): RecommendedAction {
  if (action === "register") return "auto_candidate";
  if (action === "review") return "needs_confirmation";
  return "excluded";
}

function mapBackendItemToReceiptRow(item: BackendOcrItem): ReceiptMatchRow {
  const firstCandidate = item.candidates[0];
  const recommendedAction = mapRecommendedAction(item.recommended_action);

  return {
    ocr_name: item.raw_text,
    normalized_name: firstCandidate?.ingredient_name ?? item.raw_text,
    count: "1",
    price: "",
    name_confidence: firstCandidate ? firstCandidate.confidence / 100 : 0,
    is_excluded: item.recommended_action === "skip",
    is_processed_food: false,
    match_type:
      item.recommended_action === "register"
        ? "exact"
        : item.recommended_action === "review"
        ? "fuzzy"
        : "",
    matched_by_keyword: "",
    candidates: item.candidates.map((candidate) => ({
      ingredient_id: candidate.ingredient_master_id,
      name: candidate.ingredient_name,
      score: candidate.confidence,
    })),
    recommended_action: recommendedAction,
  };
}

export function makeOcrExpireDate(days = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ============================================================
// Mock 응답 (Notion 1차 테스트 결과 그대로)
// ============================================================
const MOCK_ROWS: ReceiptMatchRow[] = [
  {
    ocr_name: "앙시앙팡 샤르도네 소",
    normalized_name: "화이트와인",
    count: "1",
    price: "12900",
    name_confidence: 0.95,
    is_excluded: false,
    is_processed_food: false,
    match_type: "override",
    matched_by_keyword: "샤르도네",
    candidates: [{ ingredient_id: 401, name: "화이트와인", score: 100 }],
    recommended_action: "auto_candidate",
  },
  {
    ocr_name: "V9 카버네 소비뇽",
    normalized_name: "레드와인",
    count: "1",
    price: "15900",
    name_confidence: 0.97,
    is_excluded: false,
    is_processed_food: false,
    match_type: "override",
    matched_by_keyword: "카버네 소비뇽",
    candidates: [{ ingredient_id: 402, name: "레드와인", score: 100 }],
    recommended_action: "auto_candidate",
  },
  {
    // needs_confirmation 케이스 (UI 데모용) — fuzzy 점수 65~85 사이
    ocr_name: "동원 흰살참치",
    normalized_name: "흰살참치",
    count: "2",
    price: "4900",
    name_confidence: 0.86,
    is_excluded: false,
    is_processed_food: false,
    match_type: "fuzzy",
    matched_by_keyword: "",
    candidates: [
      { ingredient_id: 161, name: "참치", score: 72 },
      { ingredient_id: 158, name: "황태", score: 45 },
      { ingredient_id: 159, name: "참치캔", score: 68 },
    ],
    recommended_action: "needs_confirmation",
  },
  {
    ocr_name: "*제주상생무",
    normalized_name: "무",
    count: "1",
    price: "2900",
    name_confidence: 0.98,
    is_excluded: false,
    is_processed_food: false,
    match_type: "exact",
    matched_by_keyword: "",
    candidates: [{ ingredient_id: 201, name: "무", score: 100 }],
    recommended_action: "auto_candidate",
  },
  {
    ocr_name: "*CJ 동물복지 유정란",
    normalized_name: "달걀",
    count: "1",
    price: "7900",
    name_confidence: 0.98,
    is_excluded: false,
    is_processed_food: false,
    match_type: "override",
    matched_by_keyword: "동물복지 유정란",
    candidates: [{ ingredient_id: 42, name: "달걀", score: 100 }],
    recommended_action: "auto_candidate",
  },
  {
    ocr_name: "*청정원 전주 콩나물",
    normalized_name: "콩나물",
    count: "1",
    price: "1990",
    name_confidence: 0.96,
    is_excluded: false,
    is_processed_food: false,
    match_type: "exact",
    matched_by_keyword: "",
    candidates: [{ ingredient_id: 203, name: "콩나물", score: 100 }],
    recommended_action: "auto_candidate",
  },
  {
    ocr_name: "*노르웨이 고등어 순",
    normalized_name: "고등어",
    count: "1",
    price: "8900",
    name_confidence: 0.94,
    is_excluded: false,
    is_processed_food: false,
    match_type: "exact",
    matched_by_keyword: "",
    candidates: [{ ingredient_id: 152, name: "고등어", score: 100 }],
    recommended_action: "auto_candidate",
  },
  {
    ocr_name: "*오늘좋은 1등급 저지",
    normalized_name: "저지",
    count: "1",
    price: "3900",
    name_confidence: 0.85,
    is_excluded: false,
    is_processed_food: false,
    match_type: "fuzzy",
    matched_by_keyword: "",
    candidates: [
      { ingredient_id: 18, name: "가지", score: 50 },
      { ingredient_id: 92, name: "낙지", score: 40 },
    ],
    recommended_action: "no_candidate",
  },
  {
    ocr_name: "SGS 어금니형 치간 칫",
    normalized_name: "sgs 어금니형 치간 칫",
    count: "1",
    price: "5900",
    name_confidence: 0.78,
    is_excluded: false,
    is_processed_food: false,
    match_type: "fuzzy",
    matched_by_keyword: "",
    candidates: [{ ingredient_id: 220, name: "시금치", score: 25 }],
    recommended_action: "no_candidate",
  },
];

/**
 * Mock OCR API. 실제 백엔드가 준비되면 이 함수를 다음으로 교체:
 *
 *   export async function postReceiptOcr(file: File): Promise<OcrReceiptResponse> {
 *     const form = new FormData();
 *     form.append("file", file);
 *     const res = await fetch("/api/v1/ocr/receipt", {
 *       method: "POST",
 *       headers: { Authorization: `Bearer ${getToken()}` }, // Content-Type은 자동
 *       body: form,
 *     });
 *     if (!res.ok) throw new Error(await res.text());
 *     return await res.json();
 *   }
 */
export async function postReceiptOcr(
  file: File
): Promise<OcrReceiptResponse> {
  if (!file) {
    throw new Error("파일을 선택해주세요.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("jpeg, png, pdf 파일만 업로드할 수 있어요.");
  }

  const token = getToken();

  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }

  const formData = new FormData();

  // Swagger 기준: 필드 이름은 반드시 image
  formData.append("image", file);

  const res = await fetch(`${API_BASE_URL}/api/v1/ocr/scan`, {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      body?.error?.message ??
      body?.detail ??
      body?.message ??
      `OCR 요청 실패 (${res.status})`;

    throw new Error(message);
  }

  const backendResponse = body as BackendOcrResponse;

  return {
    success: backendResponse.success,
    data: {
      items: (backendResponse.data?.items ?? []).map(
        mapBackendItemToReceiptRow
      ),
    },
    message: backendResponse.message ?? "",
  };
}

export async function confirmReceiptOcrItems(
  items: OcrConfirmItem[]
): Promise<OcrConfirmResponse> {
  const token = getToken();

  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }

  if (items.length === 0) {
    throw new Error("등록할 식재료가 없어요.");
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/ocr/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items,
    }),
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      body?.error?.message ??
      body?.detail ??
      body?.message ??
      `OCR 확정 등록 실패 (${res.status})`;

    throw new Error(message);
  }

  return body as OcrConfirmResponse;
}

// ============================================================
// recommended_action 라벨/스타일
// ============================================================
export const ACTION_LABEL: Record<RecommendedAction, string> = {
  auto_candidate: "자동 등록 가능",
  needs_confirmation: "확인 필요",
  no_candidate: "후보 없음",
  excluded: "비식재료",
};
