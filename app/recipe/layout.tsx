import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "레시피 추천",
  description: "냉장고 속 재료로 만들 수 있는 요리를 추천해드려요. 임박 재료 우선 활용 레시피.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
