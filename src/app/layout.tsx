import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "골라봤어요",
  description:
    "구매 전 고민한 후보와 실제 선택, 사용 후 평가를 연결하는 개인 구매 의사결정 아카이브",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
