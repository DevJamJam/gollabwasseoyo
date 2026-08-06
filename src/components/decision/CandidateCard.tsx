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
 * ── 줄을 맞추는 진짜 방법 ──
 * 처음에는 '모든 카드가 같은 항목을 갖게' 하면 줄이 맞을 줄 알았다. 틀렸다.
 * 항목이 같아도 내용 줄 수가 다르면(기대되는 점이 1개인 카드와 2개인 카드)
 * 그 아래가 전부 밀린다. 같은 '구조'와 같은 '높이'는 다른 얘기였다.
 *
 * 그래서 카드들이 **하나의 격자를 공유**하게 만든다(CSS subgrid).
 * 부모가 줄을 정의하고 각 카드가 그 줄을 그대로 쓰면,
 * 한 줄의 높이는 그 줄에서 가장 큰 칸에 맞춰진다.
 *
 * 그러려면 이 카드의 자식들이 모두 **격자의 직접 자식**이어야 한다.
 * <dl>로 감싸면 그 <dl> 하나가 한 칸을 차지해 안쪽 줄은 다시 어긋난다.
 * 그래서 줄들을 평평하게 나열한다.
 *
 * ── 기대와 실제를 한 카드에 둔다 ──
 * 이 앱이 하려는 일은 '구매 전 기대'와 '사용 후 실제'를 잇는 것이다.
 * 둘을 다른 영역에 떼어놓으면 스크롤해 오가며 기억해야 한다.
 *
 * 상품 이미지는 쓰지 않는다. 눈이 그쪽으로 가고 정작 비교해야 할 숫자를
 * 안 보게 된다.
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
   * 주문이 없으면 모든 카드가 `-`뿐이라 줄만 늘어난다. 전부 함께 숨긴다.
   */
  showPurchaseRows: boolean;
  /** 상세 줄을 펼칠지. **부모가 들고 있다.** */
  expanded: boolean;
}

const FAMILIARITY_LABEL = {
  new: '처음 보는 상품',
  used: '사용해본 상품',
} as const;

/**
 * 라벨 + 값 한 줄. 값이 없으면 `-`.
 *
 * 이 div 하나가 격자의 한 줄을 차지한다.
 * 안쪽의 라벨 너비를 5.5rem으로 고정해 카드끼리 값의 시작점이 같아진다.
 */
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
      <span className="text-slate-400">{label}</span>
      <span className={empty ? 'text-slate-300' : 'text-slate-700'}>
        {empty ? '-' : children}
      </span>
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

  return (
    <article
      className={[
        'rounded-lg border p-4',
        // 좁은 화면에서는 세로로 쌓이므로 줄을 맞출 필요가 없다.
        'flex flex-col',
        // 나란히 놓이는 폭에서만 부모의 격자를 그대로 물려받는다.
        'lg:grid lg:row-[1/-1] lg:[grid-template-rows:subgrid]',
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

      {/* 비교 가격과 단위 가격은 가장 자주 보는 값이라 위로 올린다 */}
      <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
        {formatKRW(candidate.comparePrice)}
      </p>
      <p className="text-sm font-medium text-blue-700">
        {formatUnitPrice(unitPrice)}
      </p>

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
          <span className="flex flex-col gap-0.5">
            {candidate.pros.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </span>
        )}
      </Row>
      <Row label="걱정되는 점">
        {candidate.cons.length > 0 && (
          <span className="flex flex-col gap-0.5">
            {candidate.cons.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </span>
        )}
      </Row>

      {/* 산 뒤의 기록. 주문이 있는 고민에서만 그린다 */}
      {showPurchaseRows && (
        <Row label="실제 구매">
          {purchase && (
            <span className="flex flex-col gap-0.5">
              {purchasedAt && (
                <span className="text-slate-500">{formatDate(purchasedAt)}</span>
              )}
              <span className="font-medium">
                {formatKRW(purchase.unitPrice)} × {purchase.quantity}개
              </span>
              {totalAmount && (
                <span className="text-slate-500">
                  총 {formatAmount(totalAmount)}
                </span>
              )}
            </span>
          )}
        </Row>
      )}

      {showPurchaseRows && (
        <Row label="사용 후 평가">
          {review && (
            <span className="flex flex-col gap-0.5">
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
            </span>
          )}
        </Row>
      )}

      {expanded && <Row label="구매처">{candidate.seller}</Row>}
      {expanded && (
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
      )}
      {expanded && <Row label="메모">{candidate.memo}</Row>}

      {expanded && showPurchaseRows && (
        <Row label="만족한 점">
          {review && review.goods.length > 0 && (
            <span className="flex flex-col gap-0.5">
              {review.goods.map((g) => (
                <span key={g}>{g}</span>
              ))}
            </span>
          )}
        </Row>
      )}
      {expanded && showPurchaseRows && (
        <Row label="아쉬운 점">
          {review && review.bads.length > 0 && (
            <span className="flex flex-col gap-0.5">
              {review.bads.map((b) => (
                <span key={b}>{b}</span>
              ))}
            </span>
          )}
        </Row>
      )}
      {expanded && showPurchaseRows && (
        <Row label="다음엔">{review?.nextChange}</Row>
      )}
    </article>
  );
}
