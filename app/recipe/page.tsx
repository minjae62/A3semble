"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getInventory, isLoggedIn } from "../../lib/api";
import { rawToItem, type FridgeItem } from "../../lib/inventory-utils";
import {
  DIFFICULTY_LABEL,
  fetchRecipes,
  matchRecipes,
  type Recipe,
  type RecipeMatch,
} from "../../lib/recipes";
import {
  Card,
  EmptyState,
  ErrorBanner,
  LoadingScreen,
  SkeletonRecipeCard,
} from "../../components/ui";
import { AppShell } from "../../components/layout";

type FilterMode = "all" | "cookable" | "nearly";

export default function RecipePage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<FridgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthChecking(false);
  }, [router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [recipeData, inv] = await Promise.all([
        fetchRecipes(),
        getInventory("recommended").catch(() => ({ data: { items: [] } } as const)),
      ]);
      
      setRecipes(recipeData);
      setInventory((inv.data?.items ?? []).map(rawToItem));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "레시피를 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthChecking) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [isAuthChecking, loadAll]);

  const matched = useMemo(
    () => matchRecipes(recipes, inventory),
    [recipes, inventory]
  );

  const filtered = useMemo(() => {
  let list = matched;

  if (filter === "all") {
    list = list.filter((m) => m.matchRatio >= 0.8);
  }

  if (filter === "cookable") {
    list = list.filter((m) => m.canCook);
  }

  if (filter === "nearly") {
    list = list.filter((m) => !m.canCook && m.matchRatio >= 0.5);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (m) =>
        m.recipe.name.toLowerCase().includes(q) ||
        m.recipe.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  return list;
}, [matched, filter, search]);

  const cookableCount = matched.filter((m) => m.canCook).length;

  if (isAuthChecking) {
    return <LoadingScreen message="인증 정보 확인 중..." />;
  }

  return (
    <AppShell maxWidth="md" background="default">
      <div className="bg-white shadow-xl md:rounded-3xl md:my-4">
        {/* 헤더 */}
        <header className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-400 px-6 pt-12 pb-12">
          <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute top-10 -right-2 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-50">
              Recipe Recommendations
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">
              오늘 뭐 먹을까?
            </h1>
            <p className="mt-2 text-sm text-orange-50/90">
              {loading
                ? "추천 레시피 준비 중..."
                : cookableCount > 0
                ? `🍳 지금 만들 수 있는 요리 ${cookableCount}개`
                : "재료를 더 채우면 추천 폭이 넓어져요"}
            </p>
          </div>
        </header>

        <div className="p-5 space-y-4">
          {/* 검색 + 필터 */}
          <div className="space-y-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="레시피 또는 태그 검색..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-300 focus:border-amber-400 focus:bg-white"
            />
            <div className="flex gap-2">
              {(
                [
                  ["all", "전체"],
                  ["cookable", "🍳 지금 가능"],
                  ["nearly", "🛒 거의 다 됨"],
                ] as const
              ).map(([key, label]) => {
                const active = filter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 본문 */}
          {loading && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SkeletonRecipeCard />
              <SkeletonRecipeCard />
              <SkeletonRecipeCard />
              <SkeletonRecipeCard />
            </div>
          )}

          {!loading && loadError && <ErrorBanner message={loadError} />}

          {!loading && !loadError && filtered.length === 0 && (
            <EmptyState
              emoji="🍳"
              title="추천할 레시피가 없어요"
              description={
                filter === "cookable"
                  ? "지금 만들 수 있는 요리가 없어요.\n재료를 더 추가해보세요!"
                  : search
                  ? "검색 결과가 없어요"
                  : "잠시 후 다시 시도해주세요"
              }
              action={
                filter !== "all" || search ? (
                  <button
                    onClick={() => {
                      setFilter("all");
                      setSearch("");
                    }}
                    className="rounded-full bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    필터 해제
                  </button>
                ) : (
                  <Link
                    href="/add"
                    className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600"
                  >
                    식재료 추가하기
                  </Link>
                )
              }
            />
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filtered.map((m) => (
                <RecipeCard key={m.recipe.id} match={m} />
              ))}
            </div>
          )}


        </div>
      </div>
    </AppShell>
  );
}

// ============================================================
// 레시피 카드
// ============================================================
function RecipeCard({ match }: { match: RecipeMatch }) {
  const { recipe, matched, matchRatio, canCook, urgencyScore } = match;
  const diff = DIFFICULTY_LABEL[recipe.difficulty];
  const missing = matched.filter((m) => !m.hasEnough && !m.ingredient.optional);

  return (
    <Link href={`/recipe/${recipe.id}`} className="block">
      <Card
        padding="md"
        interactive
        accent={canCook ? "emerald" : matchRatio >= 0.5 ? "amber" : "none"}
      >
        <div className="flex gap-3">
          <div
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-3xl ${
              canCook ? "bg-emerald-50" : "bg-slate-50"
            }`}
          >
            {recipe.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="truncate text-base font-extrabold text-slate-800">
                {recipe.name}
              </h3>
              {urgencyScore > 5 && (
                <span title="임박 재료 활용에 좋아요" className="text-xs">
                  🔥
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              {recipe.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                ⏱ {recipe.cooking_time_min}분
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                {diff.emoji} {diff.label}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                🍽 {recipe.servings}인분
              </span>
              {canCook ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                  ✓ 지금 가능
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                  {Math.round(matchRatio * 100)}% 일치
                </span>
              )}
            </div>
            {!canCook && missing.length > 0 && (
              <p className="mt-1.5 truncate text-[10px] text-rose-500">
                부족: {missing.slice(0, 3).map((m) => m.ingredient.name).join(", ")}
                {missing.length > 3 && ` 외 ${missing.length - 3}개`}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
