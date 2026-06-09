"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  completeRecipe,
  getInventory,
  isLoggedIn,
} from "../../../lib/api";
import { rawToItem, type FridgeItem } from "../../../lib/inventory-utils";
import {
  DIFFICULTY_LABEL,
  fetchRecipe,
  matchRecipes,
  type RecipeIngredient,
  type RecipeMatch,
} from "../../../lib/recipes";
import { recordEvent } from "../../../lib/impact-tracking";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingScreen,
  Modal,
  useToast,
} from "../../../components/ui";
import { AppShell } from "../../../components/layout";

// ============================================================
// 요리 완료 모달용 행 상태
// ============================================================
type CookingRow = {
  ingredient: RecipeIngredient;
  used: number;            // 실제 사용량 (kg/g/개 등)
  /** 정량/일부/미사용 — UI 토글 */
  mode: "full" | "partial" | "skip";
};

function initCookingRow(ing: RecipeIngredient): CookingRow {
  return { ingredient: ing, used: ing.quantity, mode: "full" };
}

// ============================================================
// 페이지
// ============================================================
export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const recipeId = Number(params.id);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [match, setMatch] = useState<RecipeMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cookOpen, setCookOpen] = useState(false);
  const [cookingRows, setCookingRows] = useState<CookingRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthChecking(false);
  }, [router]);

  const load = useCallback(async () => {
    if (!recipeId || Number.isNaN(recipeId)) {
      setLoadError("잘못된 레시피 ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [recipe, inv] = await Promise.all([
        fetchRecipe(recipeId),
        getInventory("recommended").catch(
          () => ({ data: { items: [] } } as const)
        ),
      ]);
      if (!recipe) {
        setLoadError("레시피를 찾을 수 없어요");
        return;
      }
      const inventory: FridgeItem[] = (inv.data?.items ?? []).map(rawToItem);
      const matches = matchRecipes([recipe], inventory);
      setMatch(matches[0]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    if (isAuthChecking) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isAuthChecking, load]);

  function openCookModal() {
    if (!match) return;
    setCookingRows((match.recipe.ingredients ?? []).map(initCookingRow));
    setCookOpen(true);
  }

  function updateCookingRow(idx: number, patch: Partial<CookingRow>) {
    setCookingRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  }

  // ============================================================
  // FIFO 차감 — 같은 이름 재고를 expire_date 오름차순으로 차감
  // 실제 백엔드에선 POST /api/v1/recipes/{id}/complete 가 처리
  // ============================================================
    async function handleCookComplete() {
      if (!match) return;

      setSubmitting(true);

      try {
        const ingredients = cookingRows
          .filter((row) => row.mode !== "skip" && row.used > 0)
          .map((row) => ({
            ingredient_master_id: row.ingredient.ingredient_master_id ?? 0,
            quantity: row.used,
          }))
          .filter((item) => item.ingredient_master_id > 0);

        if (ingredients.length === 0) {
          toast.show("차감할 재료가 없어요", "default");
          setSubmitting(false);
          return;
        }

        await completeRecipe(recipeId, {
          ingredients,
        });

        for (const row of cookingRows) {
          if (row.mode === "skip" || row.used <= 0) continue;

          recordEvent({
            inventoryId: 0,
            ingredientName: row.ingredient.name,
            category: "",
            action: "consumed",
            quantity: row.used,
            unit: row.ingredient.unit,
          });
        }

        toast.show("요리가 완료되었어요! 재고가 차감되었습니다.", "success");
        setCookOpen(false);
        router.push("/impact");
      } catch (e) {
        toast.show(
          e instanceof Error ? e.message : "요리 완료 처리에 실패했어요",
          "error"
        );
      } finally {
        setSubmitting(false);
      }
    }

 

  if (isAuthChecking) {
    return <LoadingScreen message="인증 정보 확인 중..." />;
  }

  return (
    <AppShell maxWidth="md" background="default" hideBottomNav>
      <div className="bg-white shadow-xl md:rounded-3xl md:my-4">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <Link
            href="/recipe"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-slate-800">레시피</h1>
        </header>

        {loading && (
          <div className="p-8 text-center text-sm text-slate-400">
            불러오는 중...
          </div>
        )}

        {!loading && loadError && (
          <div className="p-5">
            <ErrorBanner message={loadError} />
            <div className="mt-4 text-center">
              <Link
                href="/recipe"
                className="text-sm font-bold text-emerald-600 hover:underline"
              >
                ← 목록으로 돌아가기
              </Link>
            </div>
          </div>
        )}

        {!loading && !loadError && !match && (
          <EmptyState
            emoji="🔍"
            title="레시피를 찾을 수 없어요"
            action={
              <Link
                href="/recipe"
                className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white"
              >
                목록으로
              </Link>
            }
          />
        )}

        {!loading && match && (
          <>
            {/* 히어로 */}
            <section className="bg-gradient-to-br from-amber-50 to-orange-50 px-6 py-8 text-center">
              <div className="text-6xl">{match.recipe.emoji}</div>
              <h2 className="mt-3 text-2xl font-extrabold text-slate-900">
                {match.recipe.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {match.recipe.description}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] font-bold">
                <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm">
                  ⏱ {match.recipe.cooking_time_min}분
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm">
                  {DIFFICULTY_LABEL[match.recipe.difficulty].emoji}{" "}
                  {DIFFICULTY_LABEL[match.recipe.difficulty].label}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm">
                  🍽 {match.recipe.servings}인분
                </span>
              </div>
            </section>

            <div className="space-y-5 p-5 pb-32">
              {/* 매칭 상태 카드 */}
              <Card
                padding="md"
                accent={match.canCook ? "emerald" : "amber"}
                className={match.canCook ? "bg-emerald-50/40" : "bg-amber-50/40"}
              >
                {match.canCook ? (
                  <p className="text-sm font-extrabold text-emerald-700">
                    ✓ 모든 재료가 준비됐어요!
                  </p>
                ) : (
                  <p className="text-sm font-extrabold text-amber-700">
                    🛒 재료 {Math.round(match.matchRatio * 100)}% 일치
                  </p>
                )}
                {match.urgencyScore > 5 && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    🔥 임박 재료를 활용하기 좋은 레시피예요
                  </p>
                )}
              </Card>

              {/* 재료 */}
              <section>
                <h3 className="mb-3 text-base font-extrabold text-slate-800">
                  재료 ({match.recipe.servings}인분 기준)
                </h3>
                <div className="space-y-2">
                  {(match.matched ?? []).map((m, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                        m.hasEnough
                          ? "border-emerald-100 bg-emerald-50/50"
                          : m.inStock
                          ? "border-amber-100 bg-amber-50/50"
                          : "border-rose-100 bg-rose-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {m.hasEnough ? "✓" : m.inStock ? "⚠️" : "✕"}
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {m.ingredient.name}
                        </span>
                        {m.ingredient.optional && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                            선택
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-slate-700">
                          {String(m.ingredient.quantity).trim() === "0" || Number(m.ingredient.quantity) === 0 || !m.ingredient.quantity
                            ? m.ingredient.unit
                            : `${m.ingredient.quantity}${m.ingredient.unit}`}
                        </p>
                        {m.inventoryItem && (
                          <p className="text-[10px] text-slate-400">
                            보유 {m.inventoryItem.quantity}
                            {m.inventoryItem.unit}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 조리법 */}
              <section>
                <h3 className="mb-3 text-base font-extrabold text-slate-800">
                  조리법
                </h3>
                <ol className="space-y-3">
                  {(match.recipe.steps ?? []).length > 0 ? (
                    (match.recipe.steps ?? []).map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-3 rounded-xl border border-slate-100 bg-white p-4"
                      >
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-extrabold text-white">
                          {i + 1}
                        </div>
                        <p className="text-sm text-slate-700">{step}</p>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-400">
                      등록된 조리법이 없어요.
                    </li>
                  )}
                </ol>
              </section>

              {/* 영양 */}
              {match.recipe.nutrition && (
                <section>
                  <h3 className="mb-3 text-base font-extrabold text-slate-800">
                    영양 정보 (1인분)
                  </h3>
                  <Card padding="md" className="grid grid-cols-4 text-center">
                    <NutritionCell label="칼로리" value={`${match.recipe.nutrition.kcal}`} unit="kcal" />
                    <NutritionCell label="단백질" value={`${match.recipe.nutrition.protein_g}`} unit="g" />
                    <NutritionCell label="탄수화물" value={`${match.recipe.nutrition.carbs_g}`} unit="g" />
                    <NutritionCell label="지방" value={`${match.recipe.nutrition.fat_g}`} unit="g" />
                  </Card>
                </section>
              )}
            </div>

            {/* 하단 고정 CTA */}
            <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-slate-100 bg-white p-4 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.06)]">
              <Button
                onClick={openCookModal}
                size="lg"
                fullWidth
                className="!rounded-2xl !py-4"
                disabled={!match.canCook && match.matchRatio < 0.5}
              >
                {match.canCook ? "🍳 요리 완료 — 재료 차감하기" : "재료가 부족해요"}
              </Button>
              {!match.canCook && match.matchRatio >= 0.5 && (
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  부족한 재료는 &quot;사용 안함&quot;으로 표시할 수 있어요
                </p>
              )}
            </div>

            {/* 요리 완료 모달 */}
            <Modal open={cookOpen} onClose={() => !submitting && setCookOpen(false)}>
              <div className="mb-5 flex items-center gap-3">
                <div className="text-3xl">{match.recipe.emoji}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold text-slate-800">
                    {match.recipe.name} 완료!
                  </h2>
                  <p className="text-xs text-slate-400">
                    실제 사용한 양을 확인해주세요
                  </p>
                </div>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto">
                {cookingRows.map((row, i) => (
                  <CookingRowEditor
                    key={i}
                    row={row}
                    onChange={(p) => updateCookingRow(i, p)}
                  />
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-700">
                💡 FIFO 방식으로 소비기한 임박 재고부터 차감돼요. 임팩트 통계에 자동 반영됩니다.
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  className="!rounded-xl flex-1"
                  onClick={() => setCookOpen(false)}
                  disabled={submitting}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="!rounded-xl flex-[2]"
                  onClick={handleCookComplete}
                  loading={submitting}
                >
                  {submitting ? "차감 중..." : "재료 차감"}
                </Button>
              </div>
            </Modal>
          </>
        )}
      </div>
    </AppShell>
  );
}

function NutritionCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="border-r border-slate-100 last:border-r-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-base font-extrabold text-slate-800">
        {value}
        <span className="ml-0.5 text-[10px] font-bold text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

// ============================================================
// 모달 안 한 재료 행
// ============================================================
function CookingRowEditor({
  row,
  onChange,
}: {
  row: CookingRow;
  onChange: (patch: Partial<CookingRow>) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition ${
        row.mode === "skip"
          ? "border-slate-100 bg-slate-50/50 opacity-60"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-extrabold text-slate-800">
          {row.ingredient.name}
        </p>
        <p className="text-[11px] text-slate-400">
          레시피: {String(row.ingredient.quantity).trim() === "0" || Number(row.ingredient.quantity) === 0 || !row.ingredient.quantity
            ? row.ingredient.unit
            : `${row.ingredient.quantity}${row.ingredient.unit}`}
        </p>
      </div>

      <div className="flex gap-1">
        {(
          [
            ["full", "정량"],
            ["partial", "일부만"],
            ["skip", "사용 안함"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() =>
              onChange({
                mode,
                used:
                  mode === "skip"
                    ? 0
                    : mode === "full"
                    ? row.ingredient.quantity
                    : row.used,
              })
            }
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
              row.mode === mode
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {row.mode === "partial" && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
          <input
            type="number"
            value={row.used}
            onChange={(e) =>
              onChange({ used: parseFloat(e.target.value) || 0 })
            }
            min={0}
            max={row.ingredient.quantity}
            step={row.ingredient.quantity / 10}
            className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
          />
          <span className="text-xs font-bold text-slate-500">
            {row.ingredient.unit}
          </span>
        </div>
      )}
    </div>
  );
}
