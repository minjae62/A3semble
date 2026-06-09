"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addInventory,
  isLoggedIn,
  searchIngredients,
  type Ingredient,
} from "../../lib/api";
import { Button, Card, ErrorBanner, LoadingScreen } from "../../components/ui";
import { AppShell } from "../../components/layout";

function makeDefaultExpiry(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getAmountOptions(unit: string) {
  if (unit === "g") return [100, 300, 500, 1000];
  if (unit === "kg") return [1, 2, 3, 5];
  if (unit === "ml") return [100, 300, 500, 1000];
  if (unit === "L") return [1, 2, 3];
  if (unit === "큰술") return [1, 2, 3, 5];
  if (unit === "작은술") return [1, 2, 3, 5];

  return [1, 2, 3, 5];
}

// ============================================================
// 임시 단위/중량 옵션
// 현재 백엔드 ingredients API에는 unit, amounts 값이 없어서
// 프론트에서 카테고리 기준으로 임시 단위와 중량 버튼을 생성한다.
// 추후 백엔드에서 unit, amounts를 내려주면 이 함수들은 제거 가능.
// ============================================================



export default function AddPage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [expireDate, setExpireDate] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 여기 추가!
  const categoryNames = useMemo(
    () => Array.from(new Set(ingredients.map((item) => item.category))),
    [ingredients]
  );


  useEffect(() => {
    if (selectedIngredient) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpireDate(makeDefaultExpiry(selectedIngredient.default_shelf_days));
      setSelectedUnit(selectedIngredient.allowed_units[0] ?? "");
      setSelectedAmount(null);
      setCustomAmount("");
    }
  }, [selectedIngredient]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthChecking(false);
  }, [router]);

  useEffect(() => {
    if (selectedIngredient) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpireDate(makeDefaultExpiry(selectedIngredient.default_shelf_days));
    }
  }, [selectedIngredient]);

  useEffect(() => {
    if (isAuthChecking) return;

    async function loadIngredients() {
      try {
        const res = await searchIngredients({ limit: 500 });
        setIngredients(res.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "식재료 목록을 불러오지 못했어요.");
      }
    }

    void loadIngredients();
  }, [isAuthChecking]);

  const filteredIngredients = useMemo(
    () =>
      ingredients.filter(
        (item) =>
          item.category === selectedCategory && item.name.includes(searchKeyword)
      ),
    [ingredients, selectedCategory, searchKeyword]
  );

  async function handleSubmit() {
    setError(null);

    if (!selectedIngredient) {
      setError("식재료를 선택해주세요.");
      return;
    }

    const finalAmount =
      customAmount !== "" ? Number(customAmount) : selectedAmount;
    if (!finalAmount || finalAmount <= 0) {
      setError("중량을 선택하거나 직접 입력해주세요.");
      return;
    }

    if (!selectedUnit) {
      setError("단위를 선택해주세요.");
      return;
    }
    setSubmitting(true);

    try {
      await addInventory({
        ingredient_master_id: selectedIngredient.id,
        quantity: finalAmount,
        unit: selectedUnit,
        expire_date: expireDate,
      });

      router.push("/fridge");
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
      setSubmitting(false);
    }
  }

  if (isAuthChecking) {
    return <LoadingScreen message="인증 정보 확인 중..." />;
  }

  return (
    <AppShell maxWidth="md" background="default" hideBottomNav>
      <div className="bg-white shadow-xl md:rounded-3xl md:my-4">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <Link
            href="/fridge"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-slate-800">식재료 추가</h1>
        </header>

        <div className="p-5 space-y-6">
          {/* ── OCR 진입 배너 ── */}
          <Link
            href="/add/scan"
            className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white shadow-md shadow-emerald-200 transition hover:shadow-lg active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur">
              📷
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">
                영수증 사진으로 한 번에 등록
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-50/90">
                OCR로 식재료를 자동 인식해드려요
              </p>
            </div>
            <span className="text-lg">→</span>
          </Link>

          {/* ── 카테고리 ── */}
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              카테고리
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {categoryNames.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedIngredient(null);
                      setSelectedAmount(null);
                      setCustomAmount("");
                      setSearchKeyword("");
                    }}
                    className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 식재료 선택 ── */}
          <Card accent="emerald">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-800">
                {selectedCategory}
              </h2>
              <span className="text-xs text-slate-400">
                {filteredIngredients.length}종
              </span>
            </div>

            <input
              className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white"
              placeholder="식재료 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />

            <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto pr-1">
              {filteredIngredients.length === 0 ? (
                <p className="py-4 text-sm text-slate-400">
                  검색 결과가 없어요
                </p>
              ) : (
                filteredIngredients.map((item) => {
                  const active = selectedIngredient?.name === item.name;
                  return (
                    <button
                      key={`${item.category}-${item.name}`}
                      onClick={() => {
                        setSelectedIngredient(item);
                        setSelectedAmount(null);
                        setCustomAmount("");
                      }}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* ── 중량 선택 ── */}
          <Card accent="teal">
            <h2 className="mb-4 text-base font-extrabold text-slate-800">
              중량 선택
            </h2>

            {!selectedIngredient ? (
              <p className="text-sm text-slate-400">
                먼저 식재료를 선택해주세요
              </p>
            ) : (
              <>
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold text-slate-400">단위 선택</p>
                <div className="flex flex-wrap gap-2">
                  {selectedIngredient.allowed_units.map((unit) => {
                    const active = selectedUnit === unit;

                    return (
                      <button
                        key={unit}
                        onClick={() => {
                          setSelectedUnit(unit);
                          setSelectedAmount(null);
                          setCustomAmount("");
                        }}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                          active
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                        }`}
                      >
                        {unit}
                      </button>
                    );
                  })}
                </div>
              </div>
                <div className="flex flex-wrap gap-2">
                  {getAmountOptions(selectedUnit).map((amount) => {
                    const active =
                      selectedAmount === amount && customAmount === "";
                    return (
                      <button
                        key={amount}
                        onClick={() => {
                          setSelectedAmount(amount);
                          setCustomAmount("");
                        }}
                        className={`rounded-full border px-5 py-2.5 text-sm font-bold transition ${
                          active
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300 hover:bg-teal-50"
                        }`}
                      >
                        {amount}
                        {selectedUnit}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-300 focus:border-teal-400 focus:bg-white"
                    placeholder="직접 입력 (숫자)"
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    min={0}
                  />
                  <span className="px-1 text-sm font-bold text-slate-500">
                    {selectedUnit}

                  </span>
                </div>
              </>
            )}
          </Card>

          {/* ── 소비기한 ── */}
          <Card accent="amber">
            <h2 className="mb-2 text-base font-extrabold text-slate-800">
              소비기한
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              {selectedIngredient
                ? `자동 추천: ${selectedIngredient.default_shelf_days}일 후`
                : "식재료 선택 시 자동 추천 날짜가 설정돼요"}
            </p>
            <input
              type="date"
              value={expireDate}
              onChange={(e) => setExpireDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white"
              disabled={!selectedIngredient}
            />
          </Card>

          {error && <ErrorBanner message={error} />}
        </div>

        {/* ── 하단 고정 등록 버튼 ── */}
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-slate-100 bg-white p-4 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.06)]">
          <Button
            onClick={handleSubmit}
            disabled={!selectedIngredient}
            loading={submitting}
            size="lg"
            fullWidth
            className="!rounded-2xl !py-4"
          >
            {submitting ? "등록 중..." : "냉장고에 추가"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
