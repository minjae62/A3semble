"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyInfo, logout, type UserInfo } from "../../lib/api";

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
        // 401이면 api.ts에서 자동으로 /login 보냄
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
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-5 py-10 text-slate-800">
      <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-md">
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
            <p className="mt-8 text-sm text-slate-400">불러오는 중...</p>
          )}

          {error && !loading && (
            <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {error}
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

          <div className="mt-8 grid gap-2">
            <Link
              href="/fridge"
              className="rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-extrabold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 active:scale-95"
            >
              내 냉장고로 가기
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-rose-50 py-3.5 text-sm font-bold text-rose-500 transition hover:bg-rose-100 active:scale-95"
            >
              로그아웃
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
