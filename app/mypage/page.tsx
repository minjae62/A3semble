"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyInfo, logout, type UserInfo } from "../../lib/api";
import { Button, ErrorBanner, Spinner } from "../../components/ui";
import { AppShell } from "../../components/layout";

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMyInfo() {
      try {
        const result = await getMyInfo();
        setUser(result.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "정보를 불러오지 못했어요");
      } finally {
        setLoading(false);
      }
    }
    void loadMyInfo();
  }, []);

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <AppShell maxWidth="md" background="gradient">
      <div className="relative px-5 py-10 text-slate-800">
        <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="relative">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-200">
            <span className="text-xl">🧊</span>
          </div>
          <span className="text-2xl font-extrabold tracking-tight">
            A3semble
          </span>
        </Link>

        <section className="mt-12 rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
          <h1 className="text-3xl font-extrabold text-slate-900">내 정보</h1>

          {loading && (
            <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
              <Spinner size="sm" />
              <span>불러오는 중...</span>
            </div>
          )}

          {error && !loading && (
            <div className="mt-5">
              <ErrorBanner message={error} />
            </div>
          )}

          {user && !loading && (
            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  사용자 ID
                </p>
                <p className="mt-1 break-all font-mono text-sm font-bold text-slate-700">
                  {user.id}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  이메일
                </p>
                <p className="mt-1 text-lg font-extrabold text-slate-800">
                  {user.email}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  가입일
                </p>
                <p className="mt-1 font-bold text-slate-700">
                  {new Date(user.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </div>
          )}

          <Link
            href="/impact"
            className="mt-8 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white shadow-md shadow-emerald-200 transition hover:shadow-lg active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur">
              🌱
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">나의 임팩트 리포트</p>
              <p className="mt-0.5 text-[11px] text-emerald-50/90">
                절약한 금액 · CO₂ · 물 사용량을 확인해보세요
              </p>
            </div>
            <span className="text-lg">→</span>
          </Link>

          <div className="mt-4 grid gap-2">
            <Link
              href="/fridge"
              className="rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-extrabold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 active:scale-95"
            >
              내 냉장고로 가기
            </Link>
            <Button variant="danger" size="lg" fullWidth className="!rounded-xl" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </section>
        </div>
      </div>
    </AppShell>
  );
}
