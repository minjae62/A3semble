"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteInventory,
  getInventory,
  isLoggedIn,
  logout,
  updateInventory,
  type InventoryItemRaw,
  type TrafficLight,
} from "../../lib/api";

// ============================================================
// 화면용 타입 (백엔드 응답을 평평하게 가공)
// ============================================================
type FridgeItem = {
  id: number;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  expire_date: string;
  traffic_light: TrafficLight;
  score: number;
};

// ============================================================
// 카테고리 → 이모지
// ============================================================
const CATEGORY_EMOJI: Record<string, string> = {
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
const getEmoji = (category: string) => CATEGORY_EMOJI[category] || "📦";

// ============================================================
// 신호등 스타일
// ============================================================
const TRAFFIC: Record<
  TrafficLight,
  {
    border: string;
    iconBg: string;
    chip: string;
    chipText: string;
    dday: string;
    label: string;
    statBg: string;
    statText: string;
    statDot: string;
  }
> = {
  red: {
    border: "border-l-rose-400",
    iconBg: "bg-rose-50",
    chip: "bg-rose-100",
    chipText: "text-rose-600",
    dday: "text-rose-500",
    label: "즉시소진",
    statBg: "bg-rose-50 border-rose-100",
    statText: "text-rose-600",
    statDot: "bg-rose-400",
  },
  yellow: {
    border: "border-l-amber-400",
    iconBg: "bg-amber-50",
    chip: "bg-amber-100",
    chipText: "text-amber-700",
    dday: "text-amber-500",
    label: "기한임박",
    statBg: "bg-amber-50 border-amber-100",
    statText: "text-amber-600",
    statDot: "bg-amber-400",
  },
  green: {
    border: "border-l-emerald-400",
    iconBg: "bg-emerald-50",
    chip: "bg-emerald-100",
    chipText: "text-emerald-700",
    dday: "text-emerald-600",
    label: "안전상태",
    statBg: "bg-emerald-50 border-emerald-100",
    statText: "text-emerald-600",
    statDot: "bg-emerald-400",
  },
};

// ============================================================
// 헬퍼
// ============================================================
function getDday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

function formatDday(d: number): string {
  if (d > 0) return `D-${d}`;
  if (d === 0) return "D-Day";
  return `D+${-d}`;
}

function rawToItem(raw: InventoryItemRaw): FridgeItem {
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

// ============================================================
// 메인 컴포넌트
// ============================================================
export default function FridgePage() {
  const router = useRouter();
  // 로그인 검사 중인지 확인하는 상태를 추가(기본값 true)
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [items, setItems] = useState<FridgeItem[]>([]);
  const [sort, setSort] = useState<"recommended" | "expire_date">("recommended");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editQty, setEditQty] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getInventory(sort);
      const list = (res.data?.items ?? []).map(rawToItem);
      setItems(list);
    } catch (e) {
      console.error("재고 조회 실패:", e);
      setItems([]);
      setLoadError(e instanceof Error ? e.message : "재고를 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  // 마운트 시 로그인 체크 (SSR-safe: 클라이언트 마운트 후 localStorage 확인)
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthChecking(false);
  }, [router]);

  // 정렬 변경 시 다시 로드
  useEffect(() => {
    if (!isLoggedIn()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInventory();
  }, [loadInventory]);

  function openEdit(item: FridgeItem) {
    setEditingItem(item);
    setEditDate(item.expire_date);
    setEditQty(parseFloat(item.quantity) || 0);
  }

  async function handleSave() {
    if (!editingItem) return;
    try {
      await updateInventory(editingItem.id, {
        quantity: editQty,
        expire_date: editDate,
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? { ...i, quantity: String(editQty), expire_date: editDate }
            : i
        )
      );
      setEditingItem(null);
      showToast("수정 완료");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "수정 실패");
    }
  }

  async function handleDelete() {
    if (!editingItem) return;
    if (!confirm(`"${editingItem.name}" 을(를) 삭제할까요?`)) return;
    try {
      await deleteInventory(editingItem.id);
      setItems((prev) => prev.filter((i) => i.id !== editingItem.id));
      setEditingItem(null);
      showToast("삭제 완료");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  // 통계
  const stats = items.reduce(
    (acc, i) => {
      acc[i.traffic_light]++;
      return acc;
    },
    { red: 0, yellow: 0, green: 0 } as Record<TrafficLight, number>
  );
  const warningCount = stats.red + stats.yellow;

  // return 전에 로그인 검사 중이면 로딩 화면 보여주기
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-32">
        <span className="text-slate-400 font-bold">인증 정보 확인 중...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="relative mx-auto min-h-screen max-w-md overflow-hidden bg-white pb-24 shadow-2xl">
        {/* ── 헤더 (그라디언트) ── */}
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 px-6 pt-12 pb-24">
          {/* 장식 원 */}
          <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute top-10 -right-2 w-24 h-24 rounded-full bg-white/10" />

          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-lg backdrop-blur">
                  🧊
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                    My Refrigerator
                  </p>
                  <h1 className="text-xl font-extrabold tracking-tight text-white">
                    A3semble
                  </h1>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/25 hover:text-white"
              >
                로그아웃
              </button>
            </div>

            <div className="mt-8">
              <p className="mb-1 text-sm font-semibold text-white/80">
                {warningCount > 0
                  ? `⚠️ 주의가 필요한 재료가 있어요`
                  : items.length === 0
                  ? `🥬 냉장고가 비어있어요`
                  : `✅ 냉장고 상태가 좋아요`}
              </p>
              <p className="text-4xl font-extrabold text-white">
                {items.length}
                <span className="ml-1 text-2xl font-bold text-emerald-100">
                  개
                </span>
              </p>
              <p className="mt-0.5 text-sm text-white/60">등록된 식재료</p>
            </div>
          </div>
        </header>

        {/* ── 통계 칩 카드 ── */}
        <div className="relative z-10 mb-5 -mt-12 px-4">
          <div className="flex gap-2.5 rounded-2xl bg-white p-4 shadow-lg shadow-slate-200/80">
            {(["red", "yellow", "green"] as const).map((key) => {
              const s = TRAFFIC[key];
              return (
                <div
                  key={key}
                  className={`flex flex-1 flex-col items-center rounded-xl border py-2.5 ${s.statBg}`}
                >
                  <div
                    className={`mb-1.5 h-2 w-2 rounded-full ${s.statDot}`}
                  />
                  <div className={`text-xl font-extrabold ${s.statText}`}>
                    {stats[key]}
                  </div>
                  <div
                    className={`text-[10px] font-bold opacity-70 ${s.statText}`}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 에러 알림 ── */}
        {loadError && !loading && (
          <div className="mx-4 mb-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs text-rose-600">
            ⚠️ {loadError}
          </div>
        )}

        {/* ── 정렬 + 리스트 ── */}
        <div className="px-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-800">
              재고 현황
            </h2>
            <button
              onClick={() =>
                setSort((s) =>
                  s === "recommended" ? "expire_date" : "recommended"
                )
              }
              className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-200"
            >
              {sort === "recommended" ? "추천순" : "소비기한순"}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          {loading && (
            <div className="py-16 text-center text-sm text-slate-400">
              불러오는 중...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="py-16 text-center">
              <div className="mb-3 text-5xl">🥬</div>
              <p className="font-bold text-slate-700">냉장고가 비어있어요</p>
              <p className="mt-1 text-sm text-slate-400">
                식재료를 추가해보세요
              </p>
              <Link
                href="/add"
                className="mt-5 inline-block rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600"
              >
                식재료 추가하러 가기
              </Link>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {items.map((item, idx) => {
                const s = TRAFFIC[item.traffic_light];
                const dday = getDday(item.expire_date);
                return (
                  <button
                    key={item.id}
                    onClick={() => openEdit(item)}
                    className={`group flex animate-fade-in-up items-center justify-between rounded-2xl border border-slate-100 border-l-4 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${s.border}`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${s.iconBg}`}
                      >
                        {getEmoji(item.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-800">
                          {item.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
                            {item.quantity}
                            {item.unit}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${s.chip} ${s.chipText}`}
                          >
                            {s.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-lg font-extrabold ${s.dday}`}>
                        {formatDday(dday)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-300">
                        {item.expire_date.slice(5)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FAB ── */}
        <Link
          href="/add"
          className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-500 py-4 pl-5 pr-6 text-sm font-extrabold text-white shadow-xl shadow-emerald-300/60 transition-all hover:bg-emerald-600 active:scale-95"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-base font-bold">
            +
          </span>
          식재료 등록
        </Link>

        {/* ── 하단 네비 ── */}
        <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-center justify-between border-t border-slate-100 bg-white/95 px-8 py-3 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.06)] backdrop-blur-lg">
          <Link href="/fridge" className="flex flex-col items-center gap-1 text-emerald-500">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M4 10h16M8 14h.01M8 18h.01" />
            </svg>
            <span className="text-[10px] font-extrabold">냉장고</span>
          </Link>
          <Link href="/recipe" className="flex flex-col items-center gap-1 text-slate-300 hover:text-slate-500">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L15 8.5L22 9.3L17 14L18.5 21L12 17.8L5.5 21L7 14L2 9.3L9 8.5Z" />
            </svg>
            <span className="text-[10px] font-extrabold">레시피</span>
          </Link>
          <Link href="/mypage" className="flex flex-col items-center gap-1 text-slate-300 hover:text-slate-500">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span className="text-[10px] font-extrabold">내 정보</span>
          </Link>
        </nav>
      </div>

      {/* ── 수정 모달 ── */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="w-full max-w-md animate-slide-up rounded-t-3xl border-t border-slate-100 bg-white p-6 pb-10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-slate-200" />

            <div className="mb-5 flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${TRAFFIC[editingItem.traffic_light].iconBg}`}
              >
                {getEmoji(editingItem.category)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold text-slate-800">
                  {editingItem.name}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {editingItem.category}
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-2 text-slate-300 transition hover:text-slate-500"
              >
                ✕
              </button>
            </div>

            {/* 수량 +/- */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                수량
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1.5">
                <button
                  onClick={() => setEditQty((q) => Math.max(0, q - 1))}
                  className="h-9 w-9 rounded-lg bg-white font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                >
                  −
                </button>
                <input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-transparent text-center font-extrabold text-slate-800 outline-none"
                  min={0}
                />
                <span className="px-2 text-sm text-slate-500">
                  {editingItem.unit}
                </span>
                <button
                  onClick={() => setEditQty((q) => q + 1)}
                  className="h-9 w-9 rounded-lg bg-white font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* 소비기한 */}
            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                소비기한
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800 outline-none transition focus:border-emerald-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-rose-50 py-3.5 font-bold text-rose-500 transition hover:bg-rose-100 active:scale-95"
              >
                삭제
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] rounded-xl bg-emerald-500 py-3.5 font-extrabold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 active:scale-95"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed bottom-32 left-1/2 z-[60] -translate-x-1/2 animate-toast-in rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}
