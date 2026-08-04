import Link from 'next/link';

/**
 * 헤더.
 *
 * 'use client'가 없다 — Server Component다.
 * 내부 링크만 있고 상태도 이벤트 핸들러도 없어서 클라이언트로 내려보낼 이유가 없다.
 *
 * 로그인·사용자 메뉴·푸터는 두지 않는다.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="rounded text-base font-semibold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
        >
          골라봤어요
        </Link>

        <Link
          href="/decisions/new"
          className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          새 고민 만들기
        </Link>
      </div>
    </header>
  );
}
