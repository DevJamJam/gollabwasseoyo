import type { Metadata } from "next";
import "./globals.css";

import { AppHeader } from "@/components/layout/AppHeader";
import { StorageNotice } from "@/components/layout/StorageNotice";
import { DecisionsProvider } from "@/store/DecisionsProvider";

export const metadata: Metadata = {
  title: "골라봤어요",
  description:
    "구매 전 고민한 후보와 실제 선택, 사용 후 평가를 연결하는 개인 구매 의사결정 아카이브",
};

/**
 * 이 파일은 Server Component다. 'use client'가 없다.
 *
 * 그런데 <DecisionsProvider>는 Client Component다.
 * Client가 Server의 자식을 감쌀 수 있는 이유는 children prop을 통해서다.
 * layout이 <AppHeader />와 {children}을 만들어 넘기면, Provider는 이미
 * 만들어진 결과물을 받아 자리에 끼우기만 한다. Provider가 그것들을
 * 직접 import해서 그리는 게 아니다.
 *
 * 그래서 AppHeader는 Server Component로 남고 클라이언트 번들에 들어가지 않는다.
 * App Router에서 가장 자주 쓰는 경계 패턴이다.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-white text-slate-900 antialiased">
        <DecisionsProvider>
          <AppHeader />
          <StorageNotice />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </DecisionsProvider>
      </body>
    </html>
  );
}
