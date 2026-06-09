import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "내 정보",
  description: "계정 정보와 임팩트 누적치를 확인하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
