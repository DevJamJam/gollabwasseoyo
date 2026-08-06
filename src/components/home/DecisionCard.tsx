import Link from 'next/link';

import { STATUS_TONE } from '@/components/statusTone';
import { Badge } from '@/components/ui/Badge';
import { Tag } from '@/components/ui/Tag';
import { getReviewProgress, getStatus } from '@/lib/derive';
import { CATEGORY_LABEL, STATUS_LABEL, formatKRW } from '@/lib/format';
import type { Decision } from '@/lib/types';

/**
 * 목록의 고민 카드.
 *
 * 상태와 진행률을 저장된 값에서 읽지 않고 getStatus / getReviewProgress로
 * 계산한다. 배지·필터 개수·상세 화면이 전부 같은 함수를 쓰기 때문에
 * 여기만 따로 틀릴 일이 없다.
 */

function formatUpdatedAt(iso: string): string {
  // ISO 문자열의 날짜 부분만 쓴다. 시각까지 보여줄 이유가 없다.
  return iso.slice(0, 10).replace(/-/g, '.');
}

export function DecisionCard({ decision }: { decision: Decision }) {
  const status = getStatus(decision);
  const progress = getReviewProgress(decision);

  // '구매 완료 1/2'처럼 진행률을 배지에 함께 쓴다.
  // 전부 평가했거나 아직 안 샀으면 분수를 붙이지 않는다.
  const statusLabel =
    status === 'purchased'
      ? `${STATUS_LABEL[status]} ${progress.done}/${progress.total}`
      : STATUS_LABEL[status];

  const names = decision.candidates.map((c) => c.name);
  const nameSummary =
    names.length <= 2
      ? names.join(' · ')
      : `${names.slice(0, 2).join(' · ')} 외 ${names.length - 2}개`;

  return (
    <Link
      href={`/decisions/${decision.id}`}
      className="flex flex-col rounded-lg border border-slate-300 bg-white p-4 transition-colors hover:border-slate-500 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <Badge>{CATEGORY_LABEL[decision.category]}</Badge>
        <Badge tone={STATUS_TONE[status]}>{statusLabel}</Badge>
      </div>

      <h2 className="mt-3 text-base font-semibold text-slate-900">
        {decision.title}
      </h2>

      <div className="mt-2 flex flex-wrap gap-1">
        {decision.tags.map((t) => (
          <Tag key={t} name={t} />
        ))}
      </div>

      <p className="mt-3 text-sm text-slate-600">
        후보 {decision.candidates.length}개
        {decision.budget !== undefined && ` · 예산 ${formatKRW(decision.budget)}`}
      </p>

      <p className="mt-1 truncate text-sm text-slate-500">{nameSummary}</p>

      <p className="mt-3 text-xs text-slate-400">
        {formatUpdatedAt(decision.updatedAt)} 수정
      </p>
    </Link>
  );
}
