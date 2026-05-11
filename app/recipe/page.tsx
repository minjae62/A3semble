"use client";

import Link from "next/link";

export default function RecipePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto min-h-screen max-w-md bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <Link
            href="/"
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
          <h1 className="font-extrabold text-slate-800">레시피 추천</h1>
        </header>

        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 text-4xl">
            ⭐
          </div>
          <p className="font-extrabold text-slate-700">준비 중이에요</p>
          <p className="text-sm leading-relaxed text-slate-400">
            냉장고 속 재료로 만들 수 있는 요리를
            <br />
            추천해드릴 예정이에요
          </p>
        </div>
      </div>
    </main>
  );
}
