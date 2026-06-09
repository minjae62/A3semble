"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/api";
import { Button, ErrorBanner } from "../../components/ui";
import { AppShell } from "../../components/layout";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email, password });
      const accessToken = res.data?.access_token;

      if (!accessToken) {
        throw new Error("토큰을 받지 못했습니다.");
      }

      localStorage.setItem("access_token", accessToken);
      router.push("/fridge");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell maxWidth="md" background="gradient" hideBottomNav>
      <div className="relative px-5 py-10 text-slate-800">
        <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-teal-200/20 blur-3xl" />
        <div className="relative">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-200">
            <span className="text-xl">🧊</span>
          </div>
          <span className="text-2xl font-extrabold tracking-tight">
            A3semble
          </span>
        </Link>

        <form
          onSubmit={handleLogin}
          className="mt-12 rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60"
        >
          <h1 className="text-3xl font-extrabold text-slate-900">로그인</h1>
          <p className="mt-2 text-sm text-slate-500">
            내 냉장고를 확인하려면 로그인해주세요
          </p>

          {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

          <div className="mt-6 grid gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
                이메일
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
                비밀번호
              </label>
              <input
                type="password"
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white"
                disabled={loading}
                required
              />
            </div>

            <Button type="submit" size="lg" loading={loading} fullWidth className="mt-3 !rounded-xl">
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            아직 계정이 없나요?{" "}
            <Link
              href="/signup"
              className="font-bold text-emerald-600 hover:underline"
            >
              회원가입
            </Link>
          </p>
        </form>
        </div>
      </div>
    </AppShell>
  );
}
