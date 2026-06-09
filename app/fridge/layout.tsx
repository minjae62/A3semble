import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "내 냉장고",
  description: "내 냉장고의 식재료를 신호등으로 한눈에. 임박한 재료를 놓치지 마세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
