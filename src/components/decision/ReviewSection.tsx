'use client';

import { useState } from 'react';

import { ReviewPanel } from '@/components/decision/ReviewPanel';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getReviewProgress } from '@/lib/derive';
import { REPURCHASE_LABEL, formatDate } from '@/lib/format';
import type { Decision, PurchasedItem, Rating } from '@/lib/types';
import { useDecisions } from '@/store/useDecisions';

/**
 * 구매한 상품마다 평가를 붙이는 영역.
 *
 * ── 평가를 지워도 구매는 남는다 ──
 * 구매 취소와 평가 삭제는 다른 일이다. 평가만 지우면 상태가
 * '평가 완료 → 구매 완료'로 **되돌아간다.** 이 역방향 전환이
 * `review = null` 한 줄로 성립하는 것은 상태를 저장하지 않고
 * 매번 계산하기 때문이다(1일차 결정).
 *
 * 그래서 이 영역의 삭제 확인 문구는 구매 취소만큼 무겁지 않다.
 * 실제로 잃는 것이 평가 하나뿐이라서다. 문구의 무게는
 * 실제로 사라지는 것의 크기를 따라가야 한다.
 */

interface Props {
  decision: Decision;
}

/** 읽기용 별점. 입력이 아니므로 라디오가 아니라 글자로 그린다. */
function Stars({ value }: { value: Rating }) {
  return (
    <span className="text-sm" title={`${value}점`}>
      <span aria-hidden className="text-amber-500">
        {'★'.repeat(value)}
      </span>
      <span aria-hidden className="text-slate-300">
        {'★'.repeat(5 - value)}
      </span>
      <span className="sr-only">별점 {value}점</span>
    </span>
  );
}

export function ReviewSection({ decision }: Props) {
  const { removeReview } = useDecisions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string>();

  const order = decision.order;
  if (!order) return null;

  const progress = getReviewProgress(decision);

  function nameOf(candidateId: string): string {
    return (
      decision.candidates.find((c) => c.id === candidateId)?.name ??
      '(삭제된 후보)'
    );
  }

  function handleDelete(): void {
    if (confirmingId === null) return;
    setDeleteError(undefined);

    const result = removeReview(decision.id, confirmingId);

    if (!result.ok) {
      // 실패하면 닫지 않는다. 닫으면 지워진 줄 안다.
      setDeleteError(
        result.reason === 'not_found'
          ? '삭제할 평가를 찾을 수 없습니다.'
          : result.reason === 'quota'
            ? '저장 공간이 부족해 삭제하지 못했습니다.'
            : '이 브라우저에서는 기록을 변경할 수 없습니다.',
      );
      return;
    }

    setConfirmingId(null);
  }

  // 패널이 열려 있으면 목록 대신 폼이 자리를 차지한다.
  // 구매 패널과 같은 규칙이다 — 지금 하는 일 하나만 보이게 한다.
  if (editingId !== null) {
    return (
      <ReviewPanel
        decision={decision}
        candidateId={editingId}
        onSaved={() => setEditingId(null)}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  return (
    <section
      aria-labelledby="review-section-title"
      className="rounded-lg border border-slate-300 bg-white p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="review-section-title"
          className="text-base font-semibold text-slate-900"
        >
          상품 평가
        </h2>
        <p className="text-sm text-slate-500">
          {progress.done}/{progress.total} 작성
        </p>
      </div>

      <ul className="mt-4 flex flex-col divide-y divide-slate-100 border-t border-slate-100">
        {order.items.map((item) => (
          <ReviewRow
            key={item.candidateId}
            item={item}
            name={nameOf(item.candidateId)}
            onWrite={() => setEditingId(item.candidateId)}
            onDelete={() => setConfirmingId(item.candidateId)}
          />
        ))}
      </ul>

      <ConfirmDialog
        open={confirmingId !== null}
        title="이 평가를 지울까요?"
        confirmLabel="평가 삭제"
        error={deleteError}
        description={
          <>
            {confirmingId !== null && (
              <strong className="text-slate-900">
                {nameOf(confirmingId)}
              </strong>
            )}
            {
              '의 별점과 후기가 사라집니다. 구매 기록은 그대로 남고, 상태는 ‘구매 완료’로 돌아갑니다.'
            }
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmingId(null);
          setDeleteError(undefined);
        }}
      />
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   한 상품의 줄
   ──────────────────────────────────────────────────────────── */

function ReviewRow({
  item,
  name,
  onWrite,
  onDelete,
}: {
  item: PurchasedItem;
  name: string;
  onWrite: () => void;
  onDelete: () => void;
}) {
  const review = item.review;

  return (
    <li className="flex flex-col gap-2 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-900">{name}</span>

        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={onWrite}>
            {review ? '평가 수정' : '평가 쓰기'}
          </Button>
          {review && (
            <Button size="sm" variant="dangerOutline" onClick={onDelete}>
              평가 삭제
            </Button>
          )}
        </div>
      </div>

      {review === null ? (
        <p className="text-sm text-slate-400">아직 평가하지 않았습니다.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars value={review.rating} />
            <span className="text-xs text-slate-500">
              다시 살 의향 {REPURCHASE_LABEL[review.repurchase]}
            </span>
            <span className="text-xs text-slate-400">
              {formatDate(review.updatedAt)}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-slate-700">
            {review.oneLine}
          </p>

          {(review.goods.length > 0 || review.bads.length > 0) && (
            <dl className="flex flex-col gap-1 text-xs">
              {review.goods.length > 0 && (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-slate-400">만족</dt>
                  <dd className="text-slate-600">
                    {review.goods.join(' · ')}
                  </dd>
                </div>
              )}
              {review.bads.length > 0 && (
                <div className="flex gap-2">
                  <dt className="shrink-0 text-slate-400">아쉬움</dt>
                  <dd className="text-slate-600">{review.bads.join(' · ')}</dd>
                </div>
              )}
            </dl>
          )}

          {review.nextChange && (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              다음엔 — {review.nextChange}
            </p>
          )}
        </>
      )}
    </li>
  );
}
