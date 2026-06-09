import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "임팩트 리포트",
  description: "절약한 금액 · 탄소 발자국 · 물 사용량을 한눈에. 매일의 작은 절약이 만드는 큰 변화.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
