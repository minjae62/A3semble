"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/api";
import {
  aggregate,
  aggregateMonthly,
  calcBadges,
  calcStreakDays,
  topConsumed,
  topDiscarded,
  useImpactEvents,
  type MonthBucket,
} from "../../lib/impact-tracking";
import { getEmoji } from "../../lib/inventory-utils";
import { Card, EmptyState } from "../../components/ui";
import { AppShell } from "../../components/layout";

export default function ImpactPage() {
  const router = useRouter();
  const events = useImpactEvents();

  // 로그인 가드 (이벤트는 localStorage라 비로그인에도 보일 수 있지만 일관성 위해)
  if (typeof window !== "undefined" && !isLoggedIn()) {
    router.replace("/login");
  }

  const totals = useMemo(() => aggregate(events), [events]);
  const monthly = useMemo(() => aggregateMonthly(events, 6), [events]);
  const champs = useMemo(() => topConsumed(events, 3), [events]);
  const discarded = useMemo(() => topDiscarded(events, 3), [events]);
  const streakDays = useMemo(() => calcStreakDays(events), [events]);
  const badges = useMemo(
    () => calcBadges(totals, streakDays),
    [totals, streakDays]
  );

  const hasData = events.length > 0;
  const achievedBadges = badges.filter((b) => b.achieved);

  return (
    <AppShell maxWidth="md" background="default">
      <div className="bg-white shadow-xl md:rounded-3xl md:my-4">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-slate-800">임팩트 리포트</h1>
        </header>

        {!hasData ? (
          <div className="p-5">
            <EmptyState
              emoji="🌱"
              title="아직 임팩트 데이터가 없어요"
              description={
                "재료를 다 먹고 \"다 먹었어요\" 버튼을 눌러보세요.\n얼마나 잘 살리고 있는지 보여드려요."
              }
              action={
                <Link
                  href="/fridge"
                  className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600"
                >
                  냉장고로 가기
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {/* ── Hero ── */}
            <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-white shadow-md shadow-emerald-200">
              <div className="absolute -mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-50/80">
                My Impact
              </div>
              <div className="mt-7 flex items-baseline gap-2">
                <p className="text-5xl font-extrabold">{totals.consumedCount}</p>
                <p className="text-lg font-bold text-emerald-50">
                  개 재료 살림
                </p>
              </div>
              {totals.discardedCount > 0 && (
                <p className="mt-2 text-xs font-medium text-emerald-50/90">
                  버린 재료 {totals.discardedCount}개 — 다음엔 더 잘 활용해봐요
                </p>
              )}
            </section>

            {/* ── 요약 카드 (소진/폐기 개수) ── */}
            <section className="grid grid-cols-2 gap-3">
              <Card padding="md" accent="emerald">
                <p className="text-xs font-bold text-emerald-600">살린 재료</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-800">
                  {totals.consumedCount}
                  <span className="ml-1 text-base font-bold text-slate-400">개</span>
                </p>
              </Card>
              <Card padding="md" accent="red">
                <p className="text-xs font-bold text-rose-500">버린 재료</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-800">
                  {totals.discardedCount}
                  <span className="ml-1 text-base font-bold text-slate-400">개</span>
                </p>
              </Card>
            </section>

            {/* ── 월별 추세 ── */}
            <section>
              <h2 className="mb-3 text-base font-extrabold text-slate-800">
                최근 6개월 추세
              </h2>
              <Card padding="md">
                <MonthlyChart data={monthly} />
              </Card>
            </section>

            {/* ── 스트릭 + 배지 (M7) ── */}
            <section>
              <h2 className="mb-3 text-base font-extrabold text-slate-800">
                나의 성취
              </h2>
              <Card padding="md">
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-orange-50 p-3">
                  <span className="text-3xl">🔥</span>
                  <div className="flex-1">
                    <p className="text-2xl font-extrabold text-orange-600">
                      {streakDays}일
                    </p>
                    <p className="text-xs font-bold text-orange-500">
                      연속 무폐기 스트릭
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {badges.map((b) => (
                    <div
                      key={b.id}
                      className={`flex flex-col items-center rounded-xl border p-2 text-center ${
                        b.achieved
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-100 bg-slate-50 opacity-40"
                      }`}
                      title={`${b.title} — ${b.desc}`}
                    >
                      <span className="text-2xl">{b.emoji}</span>
                      <p className="mt-1 text-[10px] font-extrabold leading-tight text-slate-700">
                        {b.title}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  획득 {achievedBadges.length} / {badges.length}
                </p>
              </Card>
            </section>

            {/* ── 챔피언 재료 ── */}
            {champs.length > 0 && (
              <section>
                <h2 className="mb-3 text-base font-extrabold text-slate-800">
                  🏆 가장 많이 살린 재료
                </h2>
                <div className="space-y-2">
                  {champs.map((c, i) => (
                    <Card key={c.name} padding="md" accent="emerald">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-extrabold text-emerald-700">
                          {i + 1}
                        </div>
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                          {getEmoji(c.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-slate-800">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {c.count}회 소진
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* ── 행동 인사이트 (M6): 자주 버리는 재료 ── */}
            {discarded.length > 0 && (
              <section>
                <h2 className="mb-3 text-base font-extrabold text-slate-800">
                  ⚠️ 자주 버리는 재료
                </h2>
                <Card padding="md" accent="red">
                  <p className="mb-3 text-xs text-slate-500">
                    다음 구매 시엔 양을 줄이거나 보관법을 바꿔봐요
                  </p>
                  <div className="space-y-2">
                    {discarded.map((d) => (
                      <div
                        key={d.name}
                        className="flex items-center gap-3 rounded-xl bg-rose-50/60 p-3"
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-xl">
                          {getEmoji(d.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {d.name}
                          </p>
                          <p className="text-[11px] text-rose-500">
                            {d.count}회 폐기
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ============================================================
// 월별 막대 그래프 (인라인 SVG, 의존성 없음) — 소진/폐기 "개수" 기준
// ============================================================
function MonthlyChart({ data }: { data: MonthBucket[] }) {
  const W = 320;
  const H = 140;
  const PADDING = { top: 12, right: 8, bottom: 24, left: 8 };

  const innerW = W - PADDING.left - PADDING.right;
  const innerH = H - PADDING.top - PADDING.bottom;

  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.consumedCount, d.discardedCount))
  );
  const barGroupW = innerW / data.length;
  const barW = Math.max(6, barGroupW * 0.35);

  const hasAny = data.some(
    (d) => d.consumedCount > 0 || d.discardedCount > 0
  );

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="월별 소진/폐기 개수 그래프"
      >
        {/* baseline */}
        <line
          x1={PADDING.left}
          y1={H - PADDING.bottom}
          x2={W - PADDING.right}
          y2={H - PADDING.bottom}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        {data.map((bucket, i) => {
          const cx = PADDING.left + barGroupW * i + barGroupW / 2;
          const consumedH = (bucket.consumedCount / max) * innerH;
          const discardedH = (bucket.discardedCount / max) * innerH;
          return (
            <g key={bucket.key}>
              {/* consumed (emerald) */}
              <rect
                x={cx - barW - 1}
                y={H - PADDING.bottom - consumedH}
                width={barW}
                height={consumedH}
                rx={2}
                fill="#10b981"
              />
              {/* discarded (rose) */}
              <rect
                x={cx + 1}
                y={H - PADDING.bottom - discardedH}
                width={barW}
                height={discardedH}
                rx={2}
                fill="#fb7185"
              />
              {/* label */}
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
                fontWeight="700"
              >
                {bucket.label}
              </text>
            </g>
          );
        })}
        {!hasAny && (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            fontSize="11"
            fill="#cbd5e1"
            fontWeight="600"
          >
            아직 데이터가 없어요
          </text>
        )}
      </svg>

      {/* 범례 */}
      <div className="mt-2 flex justify-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="font-bold text-slate-600">소진</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="font-bold text-slate-600">폐기</span>
        </div>
      </div>
    </div>
  );
}
