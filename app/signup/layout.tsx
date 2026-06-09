import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "A3semble에서 나만의 스마트 냉장고를 시작해보세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
