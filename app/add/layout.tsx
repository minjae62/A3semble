import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "식재료 추가",
  description: "냉장고에 식재료를 등록하세요. 영수증 OCR로 한 번에 등록도 가능해요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
