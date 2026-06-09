"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signup } from "../../lib/api";
import { Button, ErrorBanner } from "../../components/ui";
import { AppShell } from "../../components/layout";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password || !passwordCheck) {
      setError("모든 항목을 입력해주세요.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요.");
      return;
    }

    if (password !== passwordCheck) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await signup({ email, password });
      const accessToken = res.data?.access_token;

      if (accessToken) {
        localStorage.setItem("access_token", accessToken);
        router.push("/fridge");
      } else {
        setError("가입 완료! 이메일 인증 후 로그인해주세요.");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
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
          onSubmit={handleSignup}
          className="mt-12 rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60"
        >
          <h1 className="text-3xl font-extrabold text-slate-900">회원가입</h1>
          <p className="mt-2 text-sm text-slate-500">
            A3semble에서 나만의 냉장고를 만들어보세요
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

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
                비밀번호 확인
              </label>
              <input
                type="password"
                placeholder="다시 한 번 입력"
                value={passwordCheck}
                onChange={(e) => setPasswordCheck(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white"
                disabled={loading}
                required
              />
            </div>

            <Button type="submit" size="lg" loading={loading} fullWidth className="mt-3 !rounded-xl">
              {loading ? "가입 중..." : "회원가입"}
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            이미 계정이 있나요?{" "}
            <Link
              href="/login"
              className="font-bold text-emerald-600 hover:underline"
            >
              로그인
            </Link>
          </p>
        </form>
        </div>
      </div>
    </AppShell>
  );
}
