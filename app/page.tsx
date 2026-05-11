"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // useRouter 추가
import { isLoggedIn, logout } from "../lib/api";

export default function Home() {
  const router = useRouter(); // 라우터 초기화
  const [loggedIn, setLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태 추가

  useEffect(() => {
    // 클라이언트 마운트 후 로그인 상태 확인 (SSR-safe: localStorage는 클라이언트에만 존재)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoggedIn(isLoggedIn());
    setIsLoading(false);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-6 py-8 text-slate-800">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-teal-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        {/* ── 헤더 ── */}
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
              // 로딩 중일 때 보여줄 스켈레톤 UI (깜빡임 방지)
              <>
                <div className="h-10 w-20 animate-pulse rounded-full bg-slate-200/60"></div>
                <div className="h-10 w-24 animate-pulse rounded-full bg-emerald-200/30"></div>
              </>
            ) : loggedIn ? (
              // 로그인 상태일 때 UI
              <>
                <Link
                  href="/mypage"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm border border-slate-100 transition hover:bg-slate-50"
                >
                  내 정보
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setLoggedIn(false);
                    router.push("/"); // 새로고침 없이 부드럽게 이동
                  }}
                  className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-200"
                >
                  로그아웃
                </button>
              </>
            ) : (
              // 비로그인 상태일 때 UI
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

        {/* ── 히어로 ── */}
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

        {/* ── 메뉴 카드 ── */}
        <section className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2">
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
    </main>
  );
}
