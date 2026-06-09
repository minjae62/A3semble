// ============================================================
// 식재료별 임팩트 추정치 (가격 / 탄소발자국 / 물발자국)
//
// 정확도 노트:
//   - 가격: 한국 농수산식품유통공사·이마트·쿠팡 평균 대략값 (2024-25 기준)
//   - CO₂: Our World in Data (2020) — kg CO₂e per kg of food
//   - 물: Mekonnen & Hoekstra (2011) — water footprint, L per kg
//
//   이 데이터는 **추정치**이며 절대 수치보다 "상대적 임팩트 비교"에 적합.
//   ingredient_master에 정식 컬럼이 추가되면 이 파일은 제거 가능.
// ============================================================

export type ImpactPerKg = {
  /** 1kg(또는 1L)당 추정 가격 (원) */
  pricePerKg: number;
  /** 1kg당 CO₂ 등가 (kg CO₂e) */
  co2PerKg: number;
  /** 1kg당 물 발자국 (L) */
  waterPerKg: number;
};

// ============================================================
// 카테고리별 기본값 — 매칭되는 개별 식재료가 없으면 이 값 사용
// ============================================================
export const CATEGORY_DEFAULT: Record<string, ImpactPerKg> = {
  "육류":         { pricePerKg: 30000, co2PerKg: 30.0, waterPerKg: 5000 },
  "생선/해산물":   { pricePerKg: 25000, co2PerKg: 5.0,  waterPerKg: 3000 },
  "유제품/치즈":   { pricePerKg: 8000,  co2PerKg: 3.0,  waterPerKg: 1000 },
  "계란/콩/두부":  { pricePerKg: 8000,  co2PerKg: 2.0,  waterPerKg: 1500 },
  "채소":         { pricePerKg: 5000,  co2PerKg: 0.5,  waterPerKg: 300 },
  "과일/견과":     { pricePerKg: 8000,  co2PerKg: 1.0,  waterPerKg: 800 },
  "곡류/면/떡":    { pricePerKg: 4000,  co2PerKg: 1.5,  waterPerKg: 1500 },
  "김치/절임/묵":  { pricePerKg: 7000,  co2PerKg: 1.0,  waterPerKg: 500 },
  "해조류/건어물": { pricePerKg: 15000, co2PerKg: 2.0,  waterPerKg: 1000 },
  "가공식품/기타": { pricePerKg: 8000,  co2PerKg: 3.0,  waterPerKg: 1500 },
  "조미료":       { pricePerKg: 10000, co2PerKg: 1.0,  waterPerKg: 500 },
};

// ============================================================
// 주요 식재료별 개별 override
// 카테고리 평균보다 정확. 키는 ingredient.name 정확 매칭.
// ============================================================
export const INGREDIENT_OVERRIDE: Record<string, ImpactPerKg> = {
  // 육류 (실측 가까이)
  "소고기":     { pricePerKg: 45000, co2PerKg: 60.0, waterPerKg: 15000 },
  "돼지고기":   { pricePerKg: 25000, co2PerKg: 7.0,  waterPerKg: 6000 },
  "닭고기":     { pricePerKg: 15000, co2PerKg: 6.0,  waterPerKg: 4300 },

  // 생선
  "연어":       { pricePerKg: 35000, co2PerKg: 11.9, waterPerKg: 3000 },
  "고등어":     { pricePerKg: 12000, co2PerKg: 3.0,  waterPerKg: 2000 },

  // 유제품
  "우유":       { pricePerKg: 2500,  co2PerKg: 3.2,  waterPerKg: 1000 },
  "치즈":       { pricePerKg: 25000, co2PerKg: 21.0, waterPerKg: 5000 },
  "버터":       { pricePerKg: 18000, co2PerKg: 12.0, waterPerKg: 5500 },

  // 계란/콩
  "달걀":       { pricePerKg: 7000,  co2PerKg: 4.5,  waterPerKg: 3300 },
  "두부":       { pricePerKg: 5000,  co2PerKg: 1.0,  waterPerKg: 800 },

  // 채소
  "양파":       { pricePerKg: 3000,  co2PerKg: 0.5,  waterPerKg: 280 },
  "감자":       { pricePerKg: 3500,  co2PerKg: 0.5,  waterPerKg: 290 },
  "토마토":     { pricePerKg: 6000,  co2PerKg: 1.4,  waterPerKg: 215 },
  "오이":       { pricePerKg: 5000,  co2PerKg: 0.5,  waterPerKg: 350 },
  "당근":       { pricePerKg: 4000,  co2PerKg: 0.4,  waterPerKg: 200 },
  "무":         { pricePerKg: 2500,  co2PerKg: 0.4,  waterPerKg: 280 },
  "대파":       { pricePerKg: 5000,  co2PerKg: 0.4,  waterPerKg: 200 },
  "콩나물":     { pricePerKg: 4000,  co2PerKg: 0.5,  waterPerKg: 600 },
  "배추":       { pricePerKg: 3500,  co2PerKg: 0.4,  waterPerKg: 240 },
  "상추":       { pricePerKg: 7000,  co2PerKg: 0.4,  waterPerKg: 240 },

  // 과일
  "사과":       { pricePerKg: 6000,  co2PerKg: 0.4,  waterPerKg: 820 },
  "바나나":     { pricePerKg: 4000,  co2PerKg: 0.7,  waterPerKg: 790 },
  "딸기":       { pricePerKg: 15000, co2PerKg: 1.1,  waterPerKg: 350 },

  // 곡류
  "쌀":         { pricePerKg: 3500,  co2PerKg: 4.0,  waterPerKg: 2500 },
  "빵":         { pricePerKg: 8000,  co2PerKg: 1.1,  waterPerKg: 1600 },

  // 와인 (와인 1L 기준)
  "레드와인":   { pricePerKg: 25000, co2PerKg: 1.8,  waterPerKg: 870 },
  "화이트와인": { pricePerKg: 25000, co2PerKg: 1.8,  waterPerKg: 870 },
};

// ============================================================
// 단위 → kg 환산
// 무게/부피 단위는 정확, 개수 단위는 평균치 추정
// ============================================================
const UNIT_TO_KG: Record<string, number> = {
  // 정확
  "kg":  1,
  "g":   0.001,
  "mg":  0.000001,
  "l":   1,        // 액체는 1L ≈ 1kg 가정
  "ml":  0.001,
  // 추정 (개수 단위)
  "개":   0.1,     // 평균 100g
  "단":   0.3,     // 채소 1단 ≈ 300g
  "팩":   0.3,
  "봉":   0.3,
  "캔":   0.4,
  "병":   0.5,
  "구":   0.05,
  "박스": 1.0,
};

export function unitToKg(quantity: number, unit: string): number {
  const key = (unit ?? "").toLowerCase().trim();
  const factor = UNIT_TO_KG[key] ?? 0.1; // 모르는 단위는 100g 가정
  return quantity * factor;
}

// ============================================================
// 임팩트 계산
// ============================================================
export type ImpactValue = {
  priceKrw: number;
  co2Kg: number;
  waterL: number;
};

export function calcImpact(
  ingredientName: string,
  category: string,
  quantity: number,
  unit: string
): ImpactValue {
  const perKg =
    INGREDIENT_OVERRIDE[ingredientName] ??
    CATEGORY_DEFAULT[category] ??
    { pricePerKg: 5000, co2PerKg: 1, waterPerKg: 500 };

  const kg = unitToKg(quantity, unit);
  return {
    priceKrw: Math.round(perKg.pricePerKg * kg),
    co2Kg: Math.round(perKg.co2PerKg * kg * 100) / 100,   // 소수 둘째자리
    waterL: Math.round(perKg.waterPerKg * kg),
  };
}

// ============================================================
// 비교 메타포 — 추상적 숫자를 직관적 비교로 변환
// ============================================================
export function compareCo2(kg: number): string {
  // 승용차 평균 0.171 kg CO₂/km (한국 환경부)
  const km = kg / 0.171;
  if (km >= 1) return `자동차로 ${km.toFixed(1)}km 안 탄 셈`;
  const phones = kg / 0.008; // 스마트폰 1회 충전 ≈ 8g CO₂
  if (phones >= 1) return `스마트폰 ${Math.round(phones)}회 충전 안 한 셈`;
  return "오늘부터 시작이에요";
}

export function compareWater(litres: number): string {
  // 일반 샤워 1회 = 약 60L
  const showers = litres / 60;
  if (showers >= 1) return `샤워 ${Math.round(showers)}회 분량`;
  const bottles = litres / 0.5; // 생수 500ml 병
  if (bottles >= 1) return `생수 ${Math.round(bottles)}병 분량`;
  return "한 컵 분량";
}

export function comparePrice(krw: number): string {
  if (krw >= 50000) return `삼겹살 ${Math.round(krw / 25000)}인분 값`;
  if (krw >= 10000) return `편의점 도시락 ${Math.round(krw / 5000)}끼 값`;
  if (krw >= 3000) return `편의점 음료 ${Math.round(krw / 2000)}병 값`;
  return "한 끼의 가치";
}
