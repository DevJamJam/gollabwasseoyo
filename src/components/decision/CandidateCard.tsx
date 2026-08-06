'use client';

import { Badge } from '@/components/ui/Badge';
import { daysBetween } from '@/lib/date';
import { getTotalAmount, getUnitPrice } from '@/lib/derive';
import {
  REPURCHASE_LABEL,
  formatAmount,
  formatDate,
  formatKRW,
  formatUnitPrice,
} from '@/lib/format';
import type { Candidate, PurchasedItem, Rating } from '@/lib/types';

/**
 * 후보 비교 카드.
 *
 * ── 모든 카드가 같은 행 구조를 유지한다 ──
 * 값이 없다고 그 줄을 없애면 카드마다 높이가 달라져 가로로 비교할 수 없다.
 * A의 세 번째 줄과 B의 세 번째 줄이 다른 항목이 되어버린다.
 * 그래서 빈 값은 줄을 지우지 않고 `-`를 그린다.
 *
 * ── 기대와 실제를 한 카드에 둔다 ──
 * 이 앱이 하려는 일은 '구매 전 기대'와 '사용 후 실제'를 잇는 것이다.
 * 둘을 다른 영역에 떼어놓으면 스크롤해 오가며 기억해야 하고,
 * 그러면 핵심 가치가 화면 구조 때문에 약해진다.
 *
 *   기대되는 점  고소함, 배송 빠름     ← 사기 전에 쓴 것
 *   사용 후 평가  ★★★★☆ 재구매 있음    ← 써보고 쓴 것
 *
 * 아래쪽 구매·평가 영역은 남긴다. 거기는 **조작**(수정·삭제)을 맡는다.
 *
 * 상품 이미지는 쓰지 않는다. 이미지가 있으면 눈이 그쪽으로 가고,
 * 정작 비교해야 할 숫자를 안 보게 된다.
 */

interface Props {
  index: number;
  candidate: Candidate;
  /**
   * 이 후보의 구매 기록. 안 샀으면 undefined.
   * 이 값의 존재 여부가 곧 '구매함'이라 따로 플래그를 받지 않는다.
   */
  purchase?: PurchasedItem;
  /** 주문의 구매일. 주문 단위라 구매한 후보끼리는 같은 값이다. */
  purchasedAt?: string;
  /**
   * 구매·평가 줄을 그릴지.
   *
   * 아직 아무것도 안 산 고민이면 모든 카드가 `-`뿐이라 줄만 늘어난다.
   * 주문이 없으면 전부 함께 숨긴다 — 전부 숨기므로 정렬은 그대로다.
   */
  showPurchaseRows: boolean;
  /** 상세 줄을 펼칠지. **부모가 들고 있다.** */
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
    children === false ||
    children === '';

  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 border-t border-slate-100 py-2 text-sm">
      <dt className="text-slate-400">{label}</dt>
      <dd className={empty ? 'text-slate-300' : 'text-slate-700'}>
        {empty ? '-' : children}
      </dd>
    </div>
  );
}

/** 별점. 색만으로 전달하지 않으려고 읽을 수 있는 라벨을 함께 준다. */
function Stars({ rating }: { rating: Rating }) {
  return (
    <span className="text-amber-500">
      <span aria-hidden>
        {'★'.repeat(rating)}
        {'☆'.repeat(5 - rating)}
      </span>
      <span className="sr-only">5점 만점에 {rating}점</span>
    </span>
  );
}

export function CandidateCard({
  index,
  candidate,
  purchase,
  purchasedAt,
  showPurchaseRows,
  expanded,
}: Props) {
  const unitPrice = getUnitPrice(candidate.comparePrice, candidate.amount);
  const purchased = purchase !== undefined;

  const totalAmount = purchase ? getTotalAmount(purchase) : null;
  const review = purchase?.review ?? null;

  // 사고 나서 며칠 만에 평가했나. 저장하지 않고 두 날짜의 차이로 계산한다.
  // 사자마자 쓴 후기와 두 달 써보고 쓴 후기는 무게가 다르다.
  const daysToReview =
    purchasedAt && review ? daysBetween(purchasedAt, review.updatedAt) : null;

  // 구매한 후보와 아닌 것의 대비를 확실히 한다.
  // 강조에 ring을 쓰는 이유: ring은 레이아웃에 영향을 주지 않는다.
  // border 두께를 바꾸면 그 카드만 밀려서 줄이 어긋난다.
  return (
    <article
      className={[
        'flex flex-col rounded-lg border p-4',
        purchased
          ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-200'
          : 'border-slate-300 bg-white',
      ].join(' ')}
    >
      <div className="flex min-h-6 items-start justify-between gap-2">
        <span
          className={[
            'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            purchased ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600',
          ].join(' ')}
        >
          {index + 1}
        </span>
        {purchased && <Badge tone="blue">구매함</Badge>}
      </div>

      <h3 className="mt-2 font-semibold break-words text-slate-900">
        {candidate.name}
      </h3>

      {/*
        비교 가격과 단위 가격은 카드에서 가장 자주 보는 값이라 위로 올린다.
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

        {/* 산 뒤의 기록. 주문이 있는 고민에서만 그린다 */}
        {showPurchaseRows && (
          <>
            <Row label="실제 구매">
              {purchase && (
                <div className="flex flex-col gap-0.5">
                  {purchasedAt && (
                    <span className="text-slate-500">
                      {formatDate(purchasedAt)}
                    </span>
                  )}
                  <span className="font-medium">
                    {formatKRW(purchase.unitPrice)} × {purchase.quantity}개
                  </span>
                  {totalAmount && (
                    <span className="text-slate-500">
                      총 {formatAmount(totalAmount)}
                    </span>
                  )}
                </div>
              )}
            </Row>

            <Row label="사용 후 평가">
              {review && (
                <div className="flex flex-col gap-0.5">
                  <span>
                    <Stars rating={review.rating} />
                    <span className="ml-1.5 text-slate-500">
                      재구매 {REPURCHASE_LABEL[review.repurchase]}
                    </span>
                  </span>
                  <span className="break-words">{review.oneLine}</span>
                  <span className="text-xs text-slate-400">
                    {formatDate(review.updatedAt)} 평가
                    {daysToReview !== null && ` · 구매 후 ${daysToReview}일`}
                  </span>
                </div>
              )}
            </Row>
          </>
        )}

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
            {showPurchaseRows && (
              <>
                <Row label="만족한 점">
                  {review && review.goods.length > 0 && (
                    <ul className="flex flex-col gap-0.5">
                      {review.goods.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  )}
                </Row>
                <Row label="아쉬운 점">
                  {review && review.bads.length > 0 && (
                    <ul className="flex flex-col gap-0.5">
                      {review.bads.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </Row>
                <Row label="다음엔">{review?.nextChange}</Row>
              </>
            )}
          </>
        )}
      </dl>
    </article>
  );
}
