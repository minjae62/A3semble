"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteInventory,
  getInventory,
  isLoggedIn,
  logout,
  updateInventory,
  type TrafficLight,
} from "../../lib/api";
import {
  FridgeItem,
  formatDday,
  getDday,
  getEmoji,
  rawToItem,
} from "../../lib/inventory-utils";
import { getStorageTip } from "../../lib/storage-tips";
import {
  getAllMemos,
  getMemo,
  removeMemo,
  setMemo,
} from "../../lib/item-memos";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingScreen,
  Modal,
  SkeletonListItem,
  useToast,
} from "../../components/ui";
import { AppShell } from "../../components/layout";
import { recordEvent } from "../../lib/impact-tracking";

// ============================================================
// 신호등 스타일
// ============================================================
const TRAFFIC: Record<
  TrafficLight,
  {
    accent: "red" | "yellow" | "green";
    iconBg: string;
    chip: string;
    chipText: string;
    dday: string;
    label: string;
    statBg: string;
    statBgActive: string;
    statText: string;
    statDot: string;
  }
> = {
  red: {
    accent: "red",
    iconBg: "bg-rose-50",
    chip: "bg-rose-100",
    chipText: "text-rose-600",
    dday: "text-rose-500",
    label: "즉시소진",
    statBg: "bg-rose-50 border-rose-100",
    statBgActive: "bg-rose-100 border-rose-300 ring-2 ring-rose-200",
    statText: "text-rose-600",
    statDot: "bg-rose-400",
  },
  yellow: {
    accent: "yellow",
    iconBg: "bg-amber-50",
    chip: "bg-amber-100",
    chipText: "text-amber-700",
    dday: "text-amber-500",
    label: "기한임박",
    statBg: "bg-amber-50 border-amber-100",
    statBgActive: "bg-amber-100 border-amber-300 ring-2 ring-amber-200",
    statText: "text-amber-600",
    statDot: "bg-amber-400",
  },
  green: {
    accent: "green",
    iconBg: "bg-emerald-50",
    chip: "bg-emerald-100",
    chipText: "text-emerald-700",
    dday: "text-emerald-600",
    label: "안전상태",
    statBg: "bg-emerald-50 border-emerald-100",
    statBgActive: "bg-emerald-100 border-emerald-300 ring-2 ring-emerald-200",
    statText: "text-emerald-600",
    statDot: "bg-emerald-400",
  },
};

// ============================================================
// 메인 컴포넌트
// ============================================================
export default function FridgePage() {
  const router = useRouter();
  const toast = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [items, setItems] = useState<FridgeItem[]>([]);
  const [sort, setSort] = useState<"recommended" | "expire_date">("recommended");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editQty, setEditQty] = useState(0);
  const [editMemo, setEditMemo] = useState("");
  // inventory id → 메모 (카드에 메모 아이콘 표시용)
  const [memos, setMemos] = useState<Record<string, string>>({});
  // 신호등 필터: null = 전체, "red"|"yellow"|"green" = 해당 항목만
  const [filter, setFilter] = useState<TrafficLight | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getInventory(sort);
      const list = (res.data?.items ?? []).map(rawToItem);
      setItems(list);
      setMemos(getAllMemos());
    } catch (e) {
      console.error("재고 조회 실패:", e);
      setItems([]);
      setLoadError(e instanceof Error ? e.message : "재고를 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthChecking(false);
  }, [router]);

  useEffect(() => {
    if (!isLoggedIn()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInventory();
  }, [loadInventory]);

  function openEdit(item: FridgeItem) {
    setEditingItem(item);
    setEditDate(item.expire_date);
    setEditQty(parseFloat(item.quantity) || 0);
    setEditMemo(getMemo(item.id));
  }

  async function handleSave() {
    if (!editingItem) return;
    try {
      await updateInventory(editingItem.id, {
        quantity: editQty,
        expire_date: editDate,
      });
      // 메모는 로컬에 저장 (백엔드 미지원)
      setMemo(editingItem.id, editMemo);
      setMemos(getAllMemos());
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? { ...i, quantity: String(editQty), expire_date: editDate }
            : i
        )
      );
      setEditingItem(null);
      toast.show("수정 완료", "success");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "수정 실패", "error");
    }
  }

  // 소진 (다 먹었어요) — 임팩트 이벤트 "consumed" 기록 + 재고 삭제
  async function handleConsume() {
    if (!editingItem) return;
    try {
      await deleteInventory(editingItem.id);
      recordEvent({
        inventoryId: editingItem.id,
        ingredientName: editingItem.name,
        category: editingItem.category,
        action: "consumed",
        quantity: parseFloat(editingItem.quantity) || 0,
        unit: editingItem.unit,
      });
      removeMemo(editingItem.id);
      setMemos(getAllMemos());
      setItems((prev) => prev.filter((i) => i.id !== editingItem.id));
      setEditingItem(null);
      toast.show("잘 드셨어요! 임팩트에 반영됐어요", "success");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "처리 실패", "error");
    }
  }

  // 폐기 (버렸어요) — 임팩트 이벤트 "discarded" 기록 + 재고 삭제
  async function handleDiscard() {
    if (!editingItem) return;
    if (!confirm(`"${editingItem.name}"을(를) 버린 것으로 기록할까요?`)) return;
    try {
      await deleteInventory(editingItem.id);
      recordEvent({
        inventoryId: editingItem.id,
        ingredientName: editingItem.name,
        category: editingItem.category,
        action: "discarded",
        quantity: parseFloat(editingItem.quantity) || 0,
        unit: editingItem.unit,
      });
      removeMemo(editingItem.id);
      setMemos(getAllMemos());
      setItems((prev) => prev.filter((i) => i.id !== editingItem.id));
      setEditingItem(null);
      toast.show("다음엔 더 잘 활용해봐요", "default");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "처리 실패", "error");
    }
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  // 통계
  const stats = useMemo(
    () =>
      items.reduce(
        (acc, i) => {
          acc[i.traffic_light]++;
          return acc;
        },
        { red: 0, yellow: 0, green: 0 } as Record<TrafficLight, number>
      ),
    [items]
  );

  // 필터 적용된 리스트
  const visibleItems = useMemo(
    () => (filter ? items.filter((i) => i.traffic_light === filter) : items),
    [items, filter]
  );

  function toggleFilter(key: TrafficLight) {
    setFilter((prev) => (prev === key ? null : key));
  }

  if (isAuthChecking) {
    return <LoadingScreen message="인증 정보 확인 중..." />;
  }

  return (
    <AppShell maxWidth="md" background="default">
      <div className="relative min-h-screen overflow-hidden bg-white pb-24 shadow-2xl md:rounded-3xl md:my-4">
        {/* ── 헤더 ── */}
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 px-6 pt-12 pb-24">
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
                {stats.red + stats.yellow > 0
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

        {/* ── 통계 칩 카드 (클릭으로 필터 토글) ── */}
        <div className="relative z-10 mb-3 -mt-12 px-4">
          <div className="flex gap-2.5 rounded-2xl bg-white p-4 shadow-lg shadow-slate-200/80">
            {(["red", "yellow", "green"] as const).map((key) => {
              const s = TRAFFIC[key];
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  aria-pressed={active}
                  className={`flex flex-1 flex-col items-center rounded-xl border py-2.5 transition active:scale-95 ${
                    active ? s.statBgActive : s.statBg
                  } hover:brightness-95`}
                >
                  <div className={`mb-1.5 h-2 w-2 rounded-full ${s.statDot}`} />
                  <div className={`text-xl font-extrabold ${s.statText}`}>
                    {stats[key]}
                  </div>
                  <div className={`text-[10px] font-bold opacity-70 ${s.statText}`}>
                    {s.label}
                  </div>
                </button>
              );
            })}
          </div>
          {filter && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-1.5 text-xs">
              <span className="font-bold text-slate-600">
                {TRAFFIC[filter].label} 항목만 표시 중 ({visibleItems.length}개)
              </span>
              <button
                onClick={() => setFilter(null)}
                className="font-bold text-slate-500 hover:text-slate-700"
              >
                전체 보기 ✕
              </button>
            </div>
          )}
        </div>

        {/* ── 긴급 경고 배너 (red ≥ 1) ── */}
        {stats.red > 0 && !filter && (
          <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100 px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500 text-xl shadow-md shadow-rose-200">
              🚨
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-rose-700">
                긴급 처리 필요한 재료 {stats.red}개
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-rose-600">
                지금 바로 소진하거나 처리해주세요
              </p>
            </div>
            <button
              onClick={() => setFilter("red")}
              className="flex-shrink-0 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-md shadow-rose-200 transition hover:bg-rose-600"
            >
              보기
            </button>
          </div>
        )}

        {/* ── 에러 알림 ── */}
        {loadError && !loading && (
          <div className="mx-4 mb-3">
            <ErrorBanner message={loadError} />
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
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          {loading && (
            <div className="flex flex-col gap-2.5">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          )}

          {!loading && items.length === 0 && (
            <EmptyState
              emoji="🥬"
              title="냉장고가 비어있어요"
              description="식재료를 추가해보세요"
              action={
                <Link
                  href="/add"
                  className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600"
                >
                  식재료 추가하러 가기
                </Link>
              }
            />
          )}

          {!loading && items.length > 0 && visibleItems.length === 0 && (
            <EmptyState
              emoji="🔍"
              title={`${TRAFFIC[filter!].label} 항목이 없어요`}
              description="필터를 해제하면 전체 재고가 보입니다"
              action={
                <button
                  onClick={() => setFilter(null)}
                  className="rounded-full bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                >
                  전체 보기
                </button>
              }
            />
          )}

          {!loading && visibleItems.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {visibleItems.map((item, idx) => {
                const s = TRAFFIC[item.traffic_light];
                const dday = getDday(item.expire_date);
                return (
                  <button
                    key={item.id}
                    onClick={() => openEdit(item)}
                    className="group flex animate-fade-in-up items-center justify-between text-left"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <Card
                      accent={s.accent}
                      interactive
                      padding="md"
                      className="flex w-full items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${s.iconBg}`}>
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
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${s.chip} ${s.chipText}`}>
                              {s.label}
                            </span>
                            {memos[String(item.id)] && (
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                                📝
                              </span>
                            )}
                          </div>
                          {memos[String(item.id)] && (
                            <div className="mt-1 truncate text-[11px] text-slate-400">
                              {memos[String(item.id)]}
                            </div>
                          )}
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
                    </Card>
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

      </div>

      {/* ── 수정 모달 ── */}
      <Modal open={!!editingItem} onClose={() => setEditingItem(null)}>
        {editingItem && (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${TRAFFIC[editingItem.traffic_light].iconBg}`}>
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

            {/* ── 보관 팁 ── */}
            <div className="mb-5 flex gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3">
              <span className="text-base leading-none">💡</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                  보관 팁
                </p>
                <p className="mt-0.5 text-[13px] font-medium leading-snug text-emerald-800">
                  {getStorageTip(editingItem.category, editingItem.name)}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                수량
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1.5">
                <button
                  onClick={() => setEditQty((q) => Math.max(0, q - 1))}
                  className="h-9 w-9 rounded-lg bg-white font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                >
                  -
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

            <div className="mb-5">
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

            {/* ── 커스텀 메모 ── */}
            <div className="mb-6">
              <label className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                <span>메모</span>
                <span className="font-medium normal-case tracking-normal text-slate-300">
                  {editMemo.length}/100
                </span>
              </label>
              <textarea
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value.slice(0, 100))}
                placeholder="예) 김치찌개용 · 반만 남음 · 냉동실 둘째 칸"
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-emerald-400"
              />
            </div>

            <div className="space-y-2">
              <Button variant="primary" size="lg" fullWidth className="!rounded-xl" onClick={handleSave}>
                저장하기
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="!rounded-xl flex-1 !bg-emerald-50 !text-emerald-700 !border-emerald-100 hover:!bg-emerald-100"
                  onClick={handleConsume}
                >
                  ✓ 다 먹었어요
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  className="!rounded-xl flex-1"
                  onClick={handleDiscard}
                >
                  🗑️ 버렸어요
                </Button>
              </div>
              <p className="pt-1 text-center text-[11px] text-slate-400">
                선택에 따라 임팩트 통계가 다르게 집계돼요
              </p>
            </div>
          </>
        )}
      </Modal>
    </AppShell>
  );
}
