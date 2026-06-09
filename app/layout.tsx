import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "../components/ui";

const SITE_URL = "https://a3semble.app";
const SITE_TITLE = "A3semble — 스마트 냉장고";
const SITE_DESC =
  "냉장고 속 식재료를 스마트하게 관리하고, 임박 재료 기반 레시피 추천을 받아보세요. OCR로 영수증 등록, 절약한 금액·CO₂·물까지 한눈에.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · A3semble",
  },
  description: SITE_DESC,
  applicationName: "A3semble",
  authors: [{ name: "CapstoneA3" }],
  keywords: [
    "냉장고 관리",
    "식재료",
    "레시피",
    "음식물 쓰레기",
    "OCR",
    "탄소 발자국",
    "A3semble",
  ],
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "A3semble",
    title: SITE_TITLE,
    description: SITE_DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#10b981" },
  ],
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
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
