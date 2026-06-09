"use client";

// ============================================================
// 임팩트 이벤트 추적 — localStorage 기반 (서버 동기화는 추후)
//
// 사용자가 fridge 페이지에서 "다 먹었어요" 또는 "버렸어요"를 누를 때
// 이 모듈이 호출되어 ImpactEvent를 누적 저장.
//
// 백엔드에 transactions/events 테이블이 만들어지면 이 모듈을 그대로 두고
// recordEvent 안에서 백엔드 호출 + localStorage 캐시 형태로 확장 가능.
// ============================================================

import { useEffect, useState } from "react";
import { calcImpact, type ImpactValue } from "./impact-data";

export type ImpactAction = "consumed" | "discarded";

export type ImpactEvent = {
  id: string;                  // 클라이언트 생성 uuid
  inventoryId: number;         // 원본 inventory.id
  ingredientName: string;
  category: string;
  action: ImpactAction;
  quantity: number;
  unit: string;
  impact: ImpactValue;
  timestamp: string;           // ISO
};

const STORAGE_KEY = "a3semble:impact-events:v1";

// ============================================================
// Storage I/O
// ============================================================
function readAll(): ImpactEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ImpactEvent[];
  } catch {
    return [];
  }
}

function writeAll(events: ImpactEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    // 같은 탭에서도 hook들이 반응할 수 있도록 커스텀 이벤트 발행
    window.dispatchEvent(new Event("a3semble:impact-updated"));
  } catch {
    // quota exceeded 등은 조용히 무시
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ============================================================
// Public API
// ============================================================
export function recordEvent(input: {
  inventoryId: number;
  ingredientName: string;
  category: string;
  action: ImpactAction;
  quantity: number;
  unit: string;
}): ImpactEvent {
  const event: ImpactEvent = {
    id: newId(),
    inventoryId: input.inventoryId,
    ingredientName: input.ingredientName,
    category: input.category,
    action: input.action,
    quantity: input.quantity,
    unit: input.unit,
    impact: calcImpact(
      input.ingredientName,
      input.category,
      input.quantity,
      input.unit
    ),
    timestamp: new Date().toISOString(),
  };
  const list = readAll();
  list.push(event);
  writeAll(list);
  return event;
}

export function clearAllEvents(): void {
  writeAll([]);
}

// ============================================================
// React hook — 자동 동기화 (storage 이벤트 + 커스텀 이벤트)
// ============================================================
export function useImpactEvents(): ImpactEvent[] {
  const [events, setEvents] = useState<ImpactEvent[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvents(readAll());

    const handler = () => setEvents(readAll());
    window.addEventListener("storage", handler);
    window.addEventListener("a3semble:impact-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("a3semble:impact-updated", handler);
    };
  }, []);

  return events;
}

// ============================================================
// 집계 helpers
// ============================================================
export type ImpactTotals = {
  consumed: ImpactValue;
  discarded: ImpactValue;
  net: ImpactValue;        // consumed - discarded (절약 = 손실 차감)
  consumedCount: number;
  discardedCount: number;
};

const EMPTY_IMPACT: ImpactValue = { priceKrw: 0, co2Kg: 0, waterL: 0 };

function addImpact(a: ImpactValue, b: ImpactValue): ImpactValue {
  return {
    priceKrw: a.priceKrw + b.priceKrw,
    co2Kg: Math.round((a.co2Kg + b.co2Kg) * 100) / 100,
    waterL: a.waterL + b.waterL,
  };
}

function subImpact(a: ImpactValue, b: ImpactValue): ImpactValue {
  return {
    priceKrw: a.priceKrw - b.priceKrw,
    co2Kg: Math.round((a.co2Kg - b.co2Kg) * 100) / 100,
    waterL: a.waterL - b.waterL,
  };
}

export function aggregate(events: ImpactEvent[]): ImpactTotals {
  let consumed = EMPTY_IMPACT;
  let discarded = EMPTY_IMPACT;
  let consumedCount = 0;
  let discardedCount = 0;

  for (const e of events) {
    if (e.action === "consumed") {
      consumed = addImpact(consumed, e.impact);
      consumedCount++;
    } else {
      discarded = addImpact(discarded, e.impact);
      discardedCount++;
    }
  }

  return {
    consumed,
    discarded,
    net: subImpact(consumed, discarded),
    consumedCount,
    discardedCount,
  };
}

// ============================================================
// 월별 집계 (최근 N개월)
// ============================================================
export type MonthBucket = {
  /** "2026-05" 형식 */
  key: string;
  label: string;       // "5월"
  consumed: ImpactValue;
  discarded: ImpactValue;
  consumedCount: number;
  discardedCount: number;
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function aggregateMonthly(
  events: ImpactEvent[],
  monthsBack = 6
): MonthBucket[] {
  const buckets: Record<string, MonthBucket> = {};
  const now = new Date();
  // 빈 버킷 미리 채우기
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d);
    buckets[k] = {
      key: k,
      label: `${d.getMonth() + 1}월`,
      consumed: { ...EMPTY_IMPACT },
      discarded: { ...EMPTY_IMPACT },
      consumedCount: 0,
      discardedCount: 0,
    };
  }

  for (const e of events) {
    const d = new Date(e.timestamp);
    const k = monthKey(d);
    if (!buckets[k]) continue; // 너무 오래된 이벤트는 무시
    if (e.action === "consumed") {
      buckets[k].consumed = addImpact(buckets[k].consumed, e.impact);
      buckets[k].consumedCount++;
    } else {
      buckets[k].discarded = addImpact(buckets[k].discarded, e.impact);
      buckets[k].discardedCount++;
    }
  }

  return Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key));
}

// ============================================================
// 챔피언 (절약한 재료 TOP N)
// ============================================================
export type ChampionItem = {
  name: string;
  category: string;
  count: number;
  totalImpact: ImpactValue;
};

export function topConsumed(events: ImpactEvent[], n = 3): ChampionItem[] {
  const byName: Record<string, ChampionItem> = {};

  for (const e of events) {
    if (e.action !== "consumed") continue;
    const key = e.ingredientName;
    if (!byName[key]) {
      byName[key] = {
        name: e.ingredientName,
        category: e.category,
        count: 0,
        totalImpact: { ...EMPTY_IMPACT },
      };
    }
    byName[key].count++;
    byName[key].totalImpact = addImpact(byName[key].totalImpact, e.impact);
  }

  return Object.values(byName)
    .sort((a, b) => b.totalImpact.priceKrw - a.totalImpact.priceKrw)
    .slice(0, n);
}

// ============================================================
// 자주 버리는 재료 TOP N — B (행동 인사이트) 용
// ============================================================
export function topDiscarded(events: ImpactEvent[], n = 3): ChampionItem[] {
  const byName: Record<string, ChampionItem> = {};

  for (const e of events) {
    if (e.action !== "discarded") continue;
    const key = e.ingredientName;
    if (!byName[key]) {
      byName[key] = {
        name: e.ingredientName,
        category: e.category,
        count: 0,
        totalImpact: { ...EMPTY_IMPACT },
      };
    }
    byName[key].count++;
    byName[key].totalImpact = addImpact(byName[key].totalImpact, e.impact);
  }

  return Object.values(byName)
    .sort((a, b) => b.count - a.count || b.totalImpact.priceKrw - a.totalImpact.priceKrw)
    .slice(0, n);
}

// ============================================================
// 스트릭 계산 — C (게이미피케이션) 용
// 마지막 discarded 이벤트로부터 오늘까지의 일수
// ============================================================
export function calcStreakDays(events: ImpactEvent[]): number {
  const lastDiscard = [...events]
    .filter((e) => e.action === "discarded")
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  if (!lastDiscard) {
    // 한 번도 버린 적 없으면 첫 consumed 이벤트로부터 계산
    const firstConsumed = [...events]
      .filter((e) => e.action === "consumed")
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))[0];
    if (!firstConsumed) return 0;
    const diff =
      Date.now() - new Date(firstConsumed.timestamp).getTime();
    return Math.floor(diff / 86400000);
  }

  const diff = Date.now() - new Date(lastDiscard.timestamp).getTime();
  return Math.floor(diff / 86400000);
}

// ============================================================
// 배지 시스템
// ============================================================
export type Badge = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  achieved: boolean;
};

export function calcBadges(totals: ImpactTotals, streakDays: number): Badge[] {
  return [
    {
      id: "first_step",
      emoji: "🌱",
      title: "첫 걸음",
      desc: "첫 재료를 소진했어요",
      achieved: totals.consumedCount >= 1,
    },
    {
      id: "sapling",
      emoji: "🪴",
      title: "새싹 절약가",
      desc: "10개 재료 다 사용",
      achieved: totals.consumedCount >= 10,
    },
    {
      id: "tree",
      emoji: "🌳",
      title: "큰 나무",
      desc: "50개 재료 다 사용",
      achieved: totals.consumedCount >= 50,
    },
    {
      id: "frugal",
      emoji: "♻️",
      title: "알뜰 고수",
      desc: "25개 재료 살림",
      achieved: totals.consumedCount >= 25,
    },
    {
      id: "eco",
      emoji: "🌍",
      title: "지구 지킴이",
      desc: "100개 재료 살림",
      achieved: totals.consumedCount >= 100,
    },
    {
      id: "streak_7",
      emoji: "🔥",
      title: "일주일 무폐기",
      desc: "7일 연속 음식 안 버림",
      achieved: streakDays >= 7,
    },
    {
      id: "streak_30",
      emoji: "💎",
      title: "한 달 무폐기",
      desc: "30일 연속 음식 안 버림",
      achieved: streakDays >= 30,
    },
  ];
}
