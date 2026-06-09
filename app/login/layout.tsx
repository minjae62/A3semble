import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "A3semble에 로그인하고 내 냉장고를 확인하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
