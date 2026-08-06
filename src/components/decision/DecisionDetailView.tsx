'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { CandidateCompare } from '@/components/decision/CandidateCompare';
import { STATUS_TONE } from '@/components/statusTone';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { getReviewProgress, getStatus } from '@/lib/derive';
import { CATEGORY_LABEL, STATUS_LABEL, formatKRW } from '@/lib/format';
import { useDecisions } from '@/store/useDecisions';

/**
 * 고민 상세 — 비교·구매·평가의 허브.
 *
 * ── 세 갈래 분기가 이 화면의 뼈대다 ──
 * 서버는 데이터를 모르므로 '없는 id'를 서버에서 판단할 수 없다.
 * 클라이언트에서도 저장소를 읽기 전에는 판단하면 안 된다.
 *
 *   ① ready가 false   → 아직 안 읽었다. 스켈레톤
 *   ② 읽었는데 없다    → 이때만 '찾을 수 없음'
 *   ③ 있다            → 그린다
 *
 * ①과 ②를 뒤집으면 새로고침할 때마다 '찾을 수 없음'이 한 번 번쩍인다.
 * 이 순서를 지키려고 Server에서 notFound()를 부르지 않는다.
 */
export function DecisionDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { ready, getById, removeDecision } = useDecisions();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  // ① 아직 저장소를 읽지 않았다
  if (!ready) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
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

  const reviewCount = decision.order
    ? decision.order.items.filter((it) => it.review !== null).length
    : 0;

  function handleDelete(): void {
    setDeleteError(undefined);

    const result = removeDecision(id);

    if (!result.ok) {
      // 실패하면 다이얼로그를 닫지 않는다. 닫으면 지워진 줄 안다.
      setDeleteError(
        result.reason === 'not_found'
          ? '삭제할 기록을 찾을 수 없습니다.'
          : result.reason === 'quota'
            ? '저장 공간이 부족해 삭제하지 못했습니다.'
            : '이 브라우저에서는 기록을 변경할 수 없습니다.',
      );
      return;
    }

    // 성공했을 때만 화면을 옮긴다
    router.replace('/');
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{CATEGORY_LABEL[decision.category]}</Badge>
            <Badge tone={STATUS_TONE[status]}>{statusLabel}</Badge>
          </div>

          <div className="flex shrink-0 gap-2">
            <Link href={`/decisions/${decision.id}/edit`}>
              <Button size="sm">수정</Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setConfirmingDelete(true)}
            >
              삭제
            </Button>
          </div>
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

      <CandidateCompare decision={decision} />

      {/* 구매·평가 영역은 다음 단계에서 채운다 */}
      <section className="rounded-lg border border-dashed border-slate-300 px-5 py-8 text-center">
        <p className="text-sm text-slate-500">아직 구매하지 않았습니다.</p>
        <p className="mt-1 text-xs text-slate-400">
          구매 등록과 평가 화면은 다음 단계에서 만듭니다.
        </p>
      </section>

      <div>
        <Link href="/">
          <Button>목록으로</Button>
        </Link>
      </div>

      {/*
        무엇이 함께 사라지는지를 정확히 적는다.
        "정말 삭제할까요?"만으로는 후보 4개가 같이 없어진다는 걸 알 수 없다.
      */}
      <ConfirmDialog
        open={confirmingDelete}
        title="이 고민을 삭제할까요?"
        confirmLabel="삭제"
        error={deleteError}
        description={
          reviewCount > 0 ? (
            <>
              <strong className="text-red-700">
                구매 기록과 상품 평가 {reviewCount}개가 모두 삭제되며 복구할 수
                없습니다.
              </strong>
              <br />
              후보 {decision.candidates.length}개도 함께 사라집니다.
            </>
          ) : (
            <>
              후보 {decision.candidates.length}개가 함께 삭제됩니다.
              <br />
              삭제한 기록은 복구할 수 없습니다.
            </>
          )
        }
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmingDelete(false);
          setDeleteError(undefined);
        }}
      />
    </div>
  );
}
