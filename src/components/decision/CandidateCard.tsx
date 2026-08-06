'use client';

import { Badge } from '@/components/ui/Badge';
import { getUnitPrice } from '@/lib/derive';
import { formatAmount, formatKRW, formatUnitPrice } from '@/lib/format';
import type { Candidate } from '@/lib/types';

/**
 * 후보 비교 카드.
 *
 * ── 모든 카드가 같은 행 구조를 유지한다 ──
 * 값이 없다고 그 줄을 없애면 카드마다 높이가 달라져 가로로 비교할 수 없다.
 * A의 세 번째 줄과 B의 세 번째 줄이 다른 항목이 되어버린다.
 * 그래서 빈 값은 줄을 지우지 않고 `-`를 그린다.
 *
 * 상품 이미지는 쓰지 않는다. 이미지가 있으면 눈이 그쪽으로 가고,
 * 정작 비교해야 할 숫자를 안 보게 된다.
 */

interface Props {
  index: number;
  candidate: Candidate;
  /** 구매한 후보인가. 강조 테두리와 배지가 붙는다. */
  purchased?: boolean;
  /**
   * 상세 줄을 펼칠지. **부모가 들고 있다.**
   *
   * 카드마다 따로 접었다 폈다 하면 줄 높이가 달라져 가로 비교가 깨진다.
   * A의 다섯 번째 줄과 B의 다섯 번째 줄이 다른 항목이 되어버린다.
   * 그래서 토글은 카드 밖에 하나만 두고 전부 같이 움직인다.
   */
  expanded: boolean;
}

const FAMILIARITY_LABEL = {
  new: '처음 보는 상품',
  used: '사용해본 상품',
} as const;

/** 라벨 + 값 한 줄. 값이 없으면 `-`. */
function Row({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  const empty =
    children === undefined ||
    children === null ||
    children === '' ||
    (Array.isArray(children) && children.length === 0);

  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 border-t border-slate-100 py-2 text-sm">
      <dt className="text-slate-400">{label}</dt>
      <dd className={empty ? 'text-slate-300' : 'text-slate-700'}>
        {empty ? '-' : children}
      </dd>
    </div>
  );
}

export function CandidateCard({
  index,
  candidate,
  purchased = false,
  expanded,
}: Props) {
  const unitPrice = getUnitPrice(candidate.comparePrice, candidate.amount);

  return (
    <article
      className={[
        'flex flex-col rounded-lg border p-4',
        purchased
          ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-200'
          : 'border-slate-200',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {index + 1}
        </span>
        {purchased && <Badge tone="blue">구매함</Badge>}
      </div>

      <h3 className="mt-2 font-semibold break-words text-slate-900">
        {candidate.name}
      </h3>

      {/*
        가격과 단위 가격은 카드에서 가장 자주 보는 값이라 위로 올린다.
        나머지는 아래 표에서 줄을 맞춰 비교한다.
      */}
      <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
        {formatKRW(candidate.comparePrice)}
      </p>
      <p className="text-sm font-medium text-blue-700">
        {formatUnitPrice(unitPrice)}
      </p>

      <dl className="mt-3">
        <Row label="브랜드">{candidate.brand}</Row>
        <Row label="옵션·모델">{candidate.option}</Row>
        <Row label="구성량">
          {candidate.amount ? formatAmount(candidate.amount) : undefined}
        </Row>
        <Row label="사용 경험">
          {candidate.familiarity && FAMILIARITY_LABEL[candidate.familiarity]}
        </Row>
        <Row label="배송 조건">{candidate.shippingNote}</Row>
        <Row label="기대되는 점">
          {candidate.pros.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {candidate.pros.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </Row>
        <Row label="걱정되는 점">
          {candidate.cons.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {candidate.cons.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </Row>

        {expanded && (
          <>
            <Row label="구매처">{candidate.seller}</Row>
            <Row label="상품 링크">
              {candidate.link && (
                <a
                  href={candidate.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-blue-700 underline underline-offset-2"
                >
                  {candidate.link}
                  <span className="sr-only"> (새 창에서 열림)</span>
                </a>
              )}
            </Row>
            <Row label="메모">{candidate.memo}</Row>
          </>
        )}
      </dl>
    </article>
  );
}
