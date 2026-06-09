"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInventory, isLoggedIn, logout } from "../lib/api";
import {
  FridgeItem,
  formatDday,
  getDday,
  getEmoji,
  rawToItem,
} from "../lib/inventory-utils";
import { Button, Spinner } from "../components/ui";
import { AppShell } from "../components/layout";

const TRAFFIC_STYLE = {
  red: {
    iconBg: "bg-rose-50",
    accentBorder: "border-l-rose-400",
    dday: "text-rose-500",
    label: "즉시소진",
    chip: "bg-rose-100 text-rose-600",
  },
  yellow: {
    iconBg: "bg-amber-50",
    accentBorder: "border-l-amber-400",
    dday: "text-amber-500",
    label: "기한임박",
    chip: "bg-amber-100 text-amber-700",
  },
  green: {
    iconBg: "bg-emerald-50",
    accentBorder: "border-l-emerald-400",
    dday: "text-emerald-600",
    label: "안전",
    chip: "bg-emerald-100 text-emerald-700",
  },
} as const;

export default function Home() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 임박 재료 위젯 상태
  const [urgent, setUrgent] = useState<FridgeItem[] | null>(null);
  const [urgentLoading, setUrgentLoading] = useState(false);
  const [urgentTotal, setUrgentTotal] = useState(0);

  useEffect(() => {
    // SSR-safe: localStorage는 클라이언트에만 존재
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoggedIn(isLoggedIn());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;

    async function loadUrgent() {
      setUrgentLoading(true);
      try {
        const res = await getInventory("recommended");
        if (cancelled) return;
        const all = (res.data?.items ?? []).map(rawToItem);
        const filtered = all
          .filter((i) => i.traffic_light !== "green")
          .slice(0, 3);
        setUrgent(filtered);
        setUrgentTotal(all.length);
      } catch (e) {
        console.error("임박 재료 조회 실패:", e);
        if (!cancelled) {
          setUrgent([]);
          setUrgentTotal(0);
        }
      } finally {
        if (!cancelled) setUrgentLoading(false);
      }
    }

    void loadUrgent();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  return (
    <AppShell maxWidth="5xl" background="gradient">
      <div className="relative px-6 py-8 text-slate-800">
        <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-teal-200/20 blur-3xl" />
        <div className="relative">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-200">
              <span className="text-xl">🧊</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-800">
              A3semble
            </span>
          </Link>

          <div className="flex gap-2">
            {isLoading ? (
              <>
                <div className="h-10 w-20 animate-pulse rounded-full bg-slate-200/60" />
                <div className="h-10 w-24 animate-pulse rounded-full bg-emerald-200/30" />
              </>
            ) : loggedIn ? (
              <>
                <Link
                  href="/mypage"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm border border-slate-100 transition hover:bg-slate-50"
                >
                  내 정보
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => {
                    logout();
                    setLoggedIn(false);
                    setUrgent(null);
                    router.push("/");
                  }}
                >
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm border border-slate-100 transition hover:bg-slate-50"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="mt-16">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-600">
            My Smart Refrigerator
          </p>
          <div className="mt-5 leading-tight">
            <h1 className="text-6xl font-extrabold text-slate-900 md:text-7xl">
              나의
            </h1>
            <h1 className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-6xl font-extrabold text-transparent md:text-7xl">
              냉장고
            </h1>
          </div>
          <p className="mt-8 max-w-xl text-xl leading-relaxed text-slate-500">
            냉장고 속 식재료를 스마트하게 관리하고
            <br />
            레시피를 추천받아보세요
          </p>
        </section>

        {/* ── 로그인 시: 임박 재료 위젯 ── */}
        {loggedIn && (
          <section className="mt-12">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">
                  Today&apos;s Priority
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                  오늘의 우선순위
                </h2>
              </div>
              <Link
                href="/fridge"
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                전체 보기 →
              </Link>
            </div>

            {urgentLoading && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-400">
                <Spinner size="sm" />
                <span>임박 재료 확인 중...</span>
              </div>
            )}

            {!urgentLoading && urgent && urgent.length === 0 && urgentTotal > 0 && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-6 text-center">
                <p className="text-2xl">✅</p>
                <p className="mt-2 font-bold text-emerald-700">
                  임박한 재료가 없어요
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  냉장고 상태가 안정적이에요
                </p>
              </div>
            )}

            {!urgentLoading && urgent && urgent.length === 0 && urgentTotal === 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white px-5 py-6 text-center">
                <p className="text-2xl">🥬</p>
                <p className="mt-2 font-bold text-slate-700">
                  냉장고가 비어있어요
                </p>
                <Link
                  href="/add"
                  className="mt-3 inline-block text-xs font-bold text-emerald-600 hover:underline"
                >
                  식재료 추가하러 가기 →
                </Link>
              </div>
            )}

            {!urgentLoading && urgent && urgent.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {urgent.map((item) => {
                  const s = TRAFFIC_STYLE[item.traffic_light];
                  const dday = getDday(item.expire_date);
                  return (
                    <Link
                      key={item.id}
                      href="/fridge"
                      className={`group flex items-center gap-3 rounded-2xl border border-slate-100 border-l-4 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${s.accentBorder}`}
                    >
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${s.iconBg}`}>
                        {getEmoji(item.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold text-slate-800">
                          {item.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${s.chip}`}>
                            {s.label}
                          </span>
                        </div>
                      </div>
                      <div className={`flex-shrink-0 text-base font-extrabold ${s.dday}`}>
                        {formatDday(dday)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── 메뉴 카드 ── */}
        <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Link
            href="/fridge"
            className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-100"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
              🧺
            </div>
            <h3 className="mt-8 text-3xl font-extrabold text-slate-900">
              내 냉장고 보기
            </h3>
            <p className="mt-3 text-base text-slate-500">
              저장된 식재료 목록과 소비기한을 확인해보세요
            </p>
          </Link>

          <Link
            href="/add"
            className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-100"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-3xl">
              ➕
            </div>
            <h3 className="mt-8 text-3xl font-extrabold text-slate-900">
              식재료 추가
            </h3>
            <p className="mt-3 text-base text-slate-500">
              새 식재료를 냉장고에 등록해요
            </p>
          </Link>

          <Link
            href="/impact"
            className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-100"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
              🌱
            </div>
            <h3 className="mt-8 text-3xl font-extrabold text-slate-900">
              나의 임팩트
            </h3>
            <p className="mt-3 text-base text-slate-500">
              지금까지 절약한 금액·CO₂·물을 한눈에
            </p>
          </Link>

          <Link
            href="/recipe"
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-8 shadow-lg shadow-emerald-200 transition hover:-translate-y-1 hover:shadow-xl md:col-span-2"
          >
            <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute top-8 right-12 h-24 w-24 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur">
                ⭐
              </div>
              <h3 className="mt-8 text-3xl font-extrabold text-white">
                오늘 뭐 먹을까?
              </h3>
              <p className="mt-3 text-base text-emerald-50">
                냉장고 속 재료로 만들 수 있는 요리를 추천해드려요
              </p>
            </div>
          </Link>
        </section>
        </div>
      </div>
    </AppShell>
  );
}
