"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { isLoggedIn, logout } from "../../lib/api";

type AppShellProps = {
  children: ReactNode;
  /** 모바일에서 하단 네비를 숨길지 (예: 로그인/회원가입 화면) */
  hideBottomNav?: boolean;
  /** 최대 너비 변형 — 모바일 우선 페이지(fridge/add 등)는 md, 마케팅/대시보드는 5xl */
  maxWidth?: "md" | "3xl" | "5xl";
  /** main 컨테이너의 배경 — 그라디언트 hero가 있는 페이지는 자체 배경 사용 */
  background?: "default" | "gradient" | "none";
};

const MAX_WIDTH_CLASS = {
  md: "max-w-md",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
} as const;

const BG_CLASS = {
  default: "bg-slate-50",
  gradient: "bg-gradient-to-br from-emerald-50 via-white to-teal-50",
  none: "",
} as const;

export function AppShell({
  children,
  hideBottomNav = false,
  maxWidth = "md",
  background = "default",
}: AppShellProps) {
  return (
    <div className={`min-h-screen ${BG_CLASS[background]}`}>
      <DesktopNav />
      <main
        className={`mx-auto ${MAX_WIDTH_CLASS[maxWidth]} ${
          hideBottomNav ? "pb-12" : "pb-28 md:pb-12"
        }`}
      >
        {children}
      </main>
      {!hideBottomNav && <MobileBottomNav />}
      <Footer />
    </div>
  );
}

// ============================================================
// 데스크탑 상단 네비 — md 이상에서만 표시
// 모바일은 하단 네비 + 페이지별 sticky 헤더로 대체
// ============================================================
function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthState(isLoggedIn() ? "in" : "out");
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-40 hidden border-b border-slate-100 bg-white/80 backdrop-blur md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-200">
            <span className="text-base">🧊</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-800">
            A3semble
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {authState === "in" && (
            <>
              <DesktopNavLink href="/fridge" active={isActive("/fridge")}>
                냉장고
              </DesktopNavLink>
              <DesktopNavLink href="/recipe" active={isActive("/recipe")}>
                레시피
              </DesktopNavLink>
              <DesktopNavLink href="/impact" active={isActive("/impact")}>
                임팩트
              </DesktopNavLink>
              <DesktopNavLink href="/mypage" active={isActive("/mypage")}>
                내 정보
              </DesktopNavLink>
              <button
                onClick={() => {
                  logout();
                  setAuthState("out");
                  router.push("/");
                }}
                className="ml-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-200"
              >
                로그아웃
              </button>
            </>
          )}
          {authState === "out" && (
            <>
              <DesktopNavLink href="/login" active={isActive("/login")}>
                로그인
              </DesktopNavLink>
              <Link
                href="/signup"
                className="ml-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600"
              >
                회원가입
              </Link>
            </>
          )}
          {authState === "loading" && (
            <>
              <div className="h-8 w-16 animate-pulse rounded-full bg-slate-100" />
              <div className="h-8 w-20 animate-pulse rounded-full bg-emerald-100/40" />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function DesktopNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      }`}
    >
      {children}
    </Link>
  );
}

// ============================================================
// 모바일 하단 네비 — 로그인 사용자에게만 의미있음
// 비로그인 시에도 깔끔히 보이도록 처리
// ============================================================
function MobileBottomNav() {
  const pathname = usePathname();
  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthState(isLoggedIn() ? "in" : "out");
  }, [pathname]);

  if (authState !== "in") return null;

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-slate-100 bg-white/95 px-4 py-2 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.06)] backdrop-blur-lg md:hidden">
      <BottomNavItem href="/fridge" active={isActive("/fridge")} label="냉장고">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M4 10h16M8 14h.01M8 18h.01" />
        </svg>
      </BottomNavItem>
      <BottomNavItem href="/recipe" active={isActive("/recipe")} label="레시피">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2L15 8.5L22 9.3L17 14L18.5 21L12 17.8L5.5 21L7 14L2 9.3L9 8.5Z" />
        </svg>
      </BottomNavItem>
      <BottomNavItem href="/impact" active={isActive("/impact")} label="임팩트">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M16.24 16.24l2.83 2.83M18 12h4M16.24 7.76l2.83-2.83" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </BottomNavItem>
      <BottomNavItem href="/mypage" active={isActive("/mypage")} label="내 정보">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </BottomNavItem>
    </nav>
  );
}

function BottomNavItem({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1 ${
        active ? "text-emerald-500" : "text-slate-300 hover:text-slate-500"
      }`}
    >
      {children}
      <span className="text-[10px] font-extrabold">{label}</span>
    </Link>
  );
}

// ============================================================
// 푸터 — 데스크탑에서만 두드러짐, 모바일은 자연스럽게 작게
// ============================================================
function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-100 bg-white/50 py-6 text-center text-[11px] text-slate-400 md:py-8">
      <p>
        © 2026 <span className="font-bold text-slate-500">A3semble</span> — 냉장고 속 식재료를 스마트하게
      </p>
      <p className="mt-1 text-[10px] text-slate-300">
        Capstone Project · 임팩트 수치는 추정치입니다
      </p>
    </footer>
  );
}
