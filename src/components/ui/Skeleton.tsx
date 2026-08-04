/**
 * 로딩 자리표시.
 *
 * 이 앱에서 스켈레톤은 '느려서' 보여주는 게 아니다.
 * localStorage는 마운트 뒤에야 읽을 수 있어서 첫 프레임에는 데이터가 없다.
 * 서버가 그린 HTML과 클라이언트 첫 렌더가 둘 다 스켈레톤이어야
 * hydration 불일치가 생기지 않는다.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

export function DecisionCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="mt-3 h-6 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-4 h-4 w-1/3" />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {/*
          key로 너비 클래스를 쓰면 안 된다 — 'w-20'이 두 번 나와서 형제끼리
          key가 겹친다. 이 목록은 순서가 바뀌지도 늘거나 줄지도 않는
          고정 자리표시라 index를 key로 써도 안전하다.
          (반대로 정렬·필터되는 목록에서 index를 쓰면 잘못된 요소가 재사용된다)
        */}
        {['w-16', 'w-20', 'w-24', 'w-20'].map((w, i) => (
          <Skeleton key={i} className={`h-11 rounded-full ${w}`} />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <DecisionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
