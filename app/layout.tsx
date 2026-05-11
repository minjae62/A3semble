import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A3semble - 스마트 냉장고",
  description: "냉장고 속 식재료를 스마트하게 관리하고 레시피를 추천받아보세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard - 한글 모던 웹폰트 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
