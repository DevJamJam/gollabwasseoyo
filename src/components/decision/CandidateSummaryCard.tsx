'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getUnitPrice } from '@/lib/derive';
import { formatAmount, formatKRW, formatUnitPrice } from '@/lib/format';
import type { Candidate } from '@/lib/types';

/**
 * 등록·수정 화면의 후보 요약 카드.
 *
 * 단위 가격은 저장하지 않고 여기서 계산한다 (규칙 C-5).
 * 계산할 수 없으면 '-'를 그리고 빈칸으로 두지 않는다.
 */

interface Props {
  index: number;
  candidate: Candidate;
  /** 지울 수 있는가. 못 지우면 이유를 함께 준다. */
  deletable: boolean;
  undeletableReason?: string;
  onEdit: () => void;
  onDelete: () => void;
}

const FAMILIARITY_LABEL = {
  new: '처음 보는 상품',
  used: '사용해본 상품',
} as const;

export function CandidateSummaryCard({
  index,
  candidate,
  deletable,
  undeletableReason,
  onEdit,
  onDelete,
}: Props) {
  const unitPrice = getUnitPrice(candidate.comparePrice, candidate.amount);

  return (
    <li className="rounded-lg border border-slate-300 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {candidate.brand && (
              <span className="text-sm text-slate-500">{candidate.brand}</span>
            )}
            <span className="font-semibold text-slate-900">{candidate.name}</span>
            {candidate.option && (
              <span className="text-sm text-slate-500">{candidate.option}</span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-700">
            {formatKRW(candidate.comparePrice)}
            {candidate.amount && ` · ${formatAmount(candidate.amount)}`}
            {unitPrice && (
              <span className="text-slate-500"> · {formatUnitPrice(unitPrice)}</span>
            )}
          </p>

          {candidate.familiarity && (
            <p className="mt-1.5">
              <Badge>{FAMILIARITY_LABEL[candidate.familiarity]}</Badge>
            </p>
          )}

          {(candidate.pros.length > 0 || candidate.cons.length > 0) && (
            <p className="mt-2 text-xs text-slate-500">
              {candidate.pros.length > 0 && `기대 ${candidate.pros.join(', ')}`}
              {candidate.pros.length > 0 && candidate.cons.length > 0 && ' · '}
              {candidate.cons.length > 0 && `걱정 ${candidate.cons.join(', ')}`}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" onClick={onEdit}>
            수정
          </Button>
          {/*
            지울 수 없을 때 버튼을 숨기지 않는다.
            없어진 버튼은 사용자가 '왜 없지'를 물을 수도 없다.
            비활성으로 두고 이유를 카드 아래에 적는다.
          */}
          <Button
            size="sm"
            variant="dangerOutline"
            disabled={!deletable}
            title={deletable ? undefined : undeletableReason}
            onClick={onDelete}
          >
            삭제
          </Button>
        </div>
      </div>

      {!deletable && undeletableReason && (
        <p className="mt-2.5 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {undeletableReason}
        </p>
      )}
    </li>
  );
}
