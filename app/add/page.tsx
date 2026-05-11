"use client";


import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addInventory,
  isLoggedIn,
  searchIngredients,
} from "../../lib/api";
import {
  categoryNames,
  ingredientData,
  IngredientData,
} from "../data/ingredients";

// 백엔드 카테고리는 슬래시 구분이라 화면 표시는 그대로 사용
function makeDefaultExpiry(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function AddPage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true); // 로그인 검사 중인지 확인하는 상태를 추가 (기본값 true)

  const [selectedCategory, setSelectedCategory] = useState(categoryNames[0]);
  const [selectedIngredient, setSelectedIngredient] =
    useState<IngredientData | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [expireDate, setExpireDate] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인 체크 (SSR-safe: 클라이언트 마운트 후 localStorage 확인)
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthChecking(false);
  }, [router]);

  // 식재료 선택 시 기본 소비기한 자동 채움
  useEffect(() => {
    if (selectedIngredient) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpireDate(makeDefaultExpiry(selectedIngredient.defaultShelfDays));
    }
  }, [selectedIngredient]);

  const filteredIngredients = useMemo(
    () =>
      ingredientData.filter(
        (item) =>
          item.category === selectedCategory && item.name.includes(searchKeyword)
      ),
    [selectedCategory, searchKeyword]
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

    setSubmitting(true);
    try {
      // 1) 백엔드에서 ingredient_master_id 검색
      const search = await searchIngredients({
        q: selectedIngredient.name,
        category: selectedIngredient.category,
        limit: 5,
      });

      const match = search.data?.find(
        (i) =>
          i.name === selectedIngredient.name &&
          i.category === selectedIngredient.category
      );

      if (!match) {
        throw new Error(
          `백엔드 DB에 "${selectedIngredient.name}" 식재료가 없어요.`
        );
      }

      // 2) 재고 등록 API 호출
      await addInventory({
        ingredient_master_id: match.id,
        quantity: finalAmount,
        unit: selectedIngredient.unit,
        expire_date: expireDate,
      });

      // 3) 성공 → /fridge로 이동
      router.push("/fridge");
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
      setSubmitting(false);
    }
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-32">
        <span className="text-slate-400 font-bold">인증 정보 확인 중...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-32">
      <div className="mx-auto max-w-md bg-white shadow-xl">
        {/* ── 헤더 ── */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <Link
            href="/fridge"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-slate-800">식재료 추가</h1>
        </header>

        <div className="p-5">
          {/* ── 카테고리 ── */}
          <section className="mb-6">
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
          <section className="mb-6 rounded-2xl border-l-4 border-emerald-400 bg-white p-5 shadow-sm">
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
          </section>

          {/* ── 중량 선택 ── */}
          <section className="mb-6 rounded-2xl border-l-4 border-teal-400 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-extrabold text-slate-800">
              중량 선택
            </h2>

            {!selectedIngredient ? (
              <p className="text-sm text-slate-400">
                먼저 식재료를 선택해주세요
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedIngredient.amounts.map((amount) => {
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
                        {selectedIngredient.unit}
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
                    {selectedIngredient.unit}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* ── 소비기한 ── */}
          <section className="mb-6 rounded-2xl border-l-4 border-amber-400 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-extrabold text-slate-800">
              소비기한
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              {selectedIngredient
                ? `자동 추천: ${selectedIngredient.defaultShelfDays}일 후`
                : "식재료 선택 시 자동 추천 날짜가 설정돼요"}
            </p>
            <input
              type="date"
              value={expireDate}
              onChange={(e) => setExpireDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white"
              disabled={!selectedIngredient}
            />
          </section>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {error}
            </div>
          )}
        </div>

        {/* ── 하단 고정 등록 버튼 ── */}
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-slate-100 bg-white p-4 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.06)]">
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedIngredient}
            className="w-full rounded-2xl bg-emerald-500 py-4 text-sm font-extrabold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {submitting ? "등록 중..." : "냉장고에 추가"}
          </button>
        </div>
      </div>
    </main>
  );
}
