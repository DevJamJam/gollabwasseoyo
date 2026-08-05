'use client';

import Link from 'next/link';

import { STATUS_TONE } from '@/components/statusTone';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tag } from '@/components/ui/Tag';
import { Skeleton } from '@/components/ui/Skeleton';
import { getReviewProgress, getStatus } from '@/lib/derive';
import { CATEGORY_LABEL, STATUS_LABEL, formatKRW } from '@/lib/format';
import { useDecisions } from '@/store/useDecisions';

/**
 * 고민 상세.
 *
 * ⚠️ 지금은 **최소 형태**다. 후보 비교·구매·평가 영역은 아직 없다.
 * 등록을 마치면 여기로 오게 되어 있어서, 이 페이지가 없으면 저장 직후
 * 404가 뜬다. 흐름을 잇기 위해 뼈대만 먼저 세웠다.
 *
 * ── 세 갈래 분기가 이 화면의 핵심 구조다 ──
 * 서버는 데이터를 모르므로 '없는 id'를 서버에서 판단할 수 없다.
 * 클라이언트에서도 저장소를 읽기 전에는 판단하면 안 된다.
 * 그래서 순서가 중요하다.
 *
 *   ① ready가 false   → 아직 안 읽었다. 스켈레톤
 *   ② 읽었는데 없다    → 이때만 '찾을 수 없음'
 *   ③ 있다            → 그린다
 *
 * ①과 ②를 뒤집으면 새로고침할 때마다 '찾을 수 없음'이 한 번 번쩍인다.
 */
export function DecisionDetailView({ id }: { id: string }) {
  const { ready, getById } = useDecisions();

  // ① 아직 저장소를 읽지 않았다
  if (!ready) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  // ② 읽었는데 없다
  const decision = getById(id);
  if (!decision) {
    return (
      <EmptyState
        title="기록을 찾을 수 없습니다"
        description="삭제되었거나 잘못된 주소입니다."
        action={
          <Link href="/">
            <Button variant="primary">홈으로</Button>
          </Link>
        }
      />
    );
  }

  // ③ 있다
  const status = getStatus(decision);
  const progress = getReviewProgress(decision);

  const statusLabel =
    status === 'purchased'
      ? `${STATUS_LABEL[status]} ${progress.done}/${progress.total}`
      : STATUS_LABEL[status];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{CATEGORY_LABEL[decision.category]}</Badge>
          <Badge tone={STATUS_TONE[status]}>{statusLabel}</Badge>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {decision.title}
        </h1>

        <div className="flex flex-wrap gap-1.5">
          {decision.tags.map((t) => (
            <Tag key={t} name={t} />
          ))}
        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          {decision.purpose}
        </p>

        {decision.budget !== undefined && (
          <p className="text-sm text-slate-500">
            예산 {formatKRW(decision.budget)}
          </p>
        )}
      </header>

      <section className="rounded-lg border border-dashed border-slate-300 px-5 py-8 text-center">
        <p className="text-sm text-slate-500">
          후보 {decision.candidates.length}개가 등록되어 있습니다.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          후보 비교·구매 등록·평가 화면은 다음 단계에서 만듭니다.
        </p>
      </section>

      <div>
        <Link href="/">
          <Button>목록으로</Button>
        </Link>
      </div>
    </div>
  );
}
