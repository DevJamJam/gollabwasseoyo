'use client';

import { Button } from '@/components/ui/Button';
import { getSubtotal, getTotalAmount } from '@/lib/derive';
import { formatAmount, formatDate, formatKRW } from '@/lib/format';
import type { Decision, Order } from '@/lib/types';

/**
 * 주문 요약.
 *
 * 산 다음에 이 화면에서 제일 자주 보는 것은 '얼마 냈나'와 '왜 골랐나'다.
 * 그래서 결제금액을 크게 두고, 선택한 이유를 접지 않고 그대로 펼쳐둔다.
 * 이유를 접어두면 3개월 뒤에 펼쳐볼 일이 없고, 그러면 적을 이유도 없어진다.
 *
 * 평가 영역은 여기 두지 않는다. 평가는 상품 하나하나에 붙는 것이라
 * 주문 요약이 아니라 ReviewSection이 맡는다.
 */

interface Props {
  decision: Decision;
  onEdit: () => void;
  onCancel: () => void;
}

/** 상품명은 후보에서 가져온다. 주문에는 candidateId만 있다. */
function nameOf(decision: Decision, candidateId: string): string {
  return (
    decision.candidates.find((c) => c.id === candidateId)?.name ?? '(삭제된 후보)'
  );
}

export function OrderSummary({ decision, onEdit, onCancel }: Props) {
  const order: Order | null = decision.order;
  if (!order) return null;

  const subtotal = getSubtotal(order.items);
  const diff = order.totalPaid - subtotal;

  return (
    <section
      aria-labelledby="order-summary-title"
      className="rounded-lg border border-slate-300 bg-white p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="order-summary-title"
            className="text-base font-semibold text-slate-900"
          >
            구매 기록
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {formatDate(order.purchasedAt)}
            {order.seller && ` · ${order.seller}`}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={onEdit}>
            구매정보 수정
          </Button>
          <Button size="sm" variant="dangerOutline" onClick={onCancel}>
            구매 기록 취소
          </Button>
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {formatKRW(order.totalPaid)}
      </p>

      {/*
        차액은 오류가 아니라 정보다. 쿠폰·배송비가 붙는 게 정상이다.
        같을 때는 아무 말도 하지 않는다 — 맞는 걸 매번 알릴 이유가 없다.
      */}
      {diff !== 0 && (
        <p className="mt-1 text-xs text-slate-500">
          단가 합계 {formatKRW(subtotal)}보다{' '}
          {diff < 0
            ? `${formatKRW(-diff)} 적게 냈습니다.`
            : `${formatKRW(diff)} 더 냈습니다.`}
        </p>
      )}

      <ul className="mt-4 flex flex-col divide-y divide-slate-100 border-y border-slate-100">
        {order.items.map((item) => {
          const totalAmount = getTotalAmount(item);

          return (
            <li
              key={item.candidateId}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5"
            >
              <span className="text-sm font-medium text-slate-900">
                {nameOf(decision, item.candidateId)}
              </span>
              <span className="text-sm text-slate-600">
                {formatKRW(item.unitPrice)} × {item.quantity}개
                {totalAmount && (
                  <span className="ml-2 text-slate-400">
                    총 {formatAmount(totalAmount)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <p className="text-xs text-slate-400">선택한 이유</p>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
          {order.reason}
        </p>
      </div>
    </section>
  );
}
