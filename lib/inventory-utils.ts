import type { InventoryItemRaw, TrafficLight } from "./api";

// ============================================================
// 카테고리 → 이모지
// ============================================================
export const CATEGORY_EMOJI: Record<string, string> = {
  "육류": "🥩",
  "생선/해산물": "🐟",
  "유제품/치즈": "🥛",
  "계란/콩/두부": "🥚",
  "채소": "🥬",
  "과일/견과": "🍎",
  "곡류/면/떡": "🍞",
  "김치/절임/묵": "🥢",
  "해조류/건어물": "🍘",
  "가공식품/기타": "🥫",
  "조미료": "🧂",
};

export function getEmoji(category: string): string {
  return CATEGORY_EMOJI[category] || "📦";
}

// ============================================================
// D-day 계산
// ============================================================
export function getDday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (new Date(dateStr).getTime() - today.getTime()) / 86400000
  );
}

export function formatDday(d: number): string {
  if (d > 0) return `D-${d}`;
  if (d === 0) return "D-Day";
  return `D+${-d}`;
}

// ============================================================
// 화면용 평탄화 타입
// ============================================================
export type FridgeItem = {
  id: number;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  expire_date: string;
  traffic_light: TrafficLight;
  score: number;
};

export function rawToItem(raw: InventoryItemRaw): FridgeItem {
  return {
    id: raw.id,
    name: raw.ingredient.name,
    category: raw.ingredient.category,
    quantity: raw.quantity,
    unit: raw.unit,
    expire_date: raw.expire_date,
    traffic_light: raw.traffic_light,
    score: raw.score,
  };
}
