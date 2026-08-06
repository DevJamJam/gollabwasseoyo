import { describe, expect, it } from 'vitest';

import { daysBetween } from '@/lib/date';
import { getStatus, getUnitPrice } from '@/lib/derive';
import { checkDecisionInvariants, checkReviewInvariants } from '@/lib/invariants';
import { SAMPLE_DECISIONS } from '@/lib/sample';

/* ══════════════════════════════════════════════════════════
   블록 27 — 샘플 데이터의 앞뒤가 맞는가

   예시라고 대충 채우면 안 된다. 이 앱은 '내가 뭘 보고 뭘 골랐나'를
   기록하는 앱인데, 예시의 숫자가 서로 안 맞으면 화면이 무엇을 보여주려는
   건지도 흐려진다.

   실제로 한 번 틀렸다. 비교 가격 24,000원짜리를 실제로는 14,500원에 샀다고
   적어뒀는데, 40% 할인의 이유가 어디에도 없었다. 앱에 할인 사유를 적는
   필드를 두지 않기로 했으므로 그런 데이터는 애초에 만들면 안 됐다.
   ══════════════════════════════════════════════════════════ */

describe('SAMPLE_DECISIONS — 규칙 통과', () => {
  /**
   * 샘플도 사용자 데이터와 같은 관문을 지나야 한다.
   * 여기서 걸리면 seedSample()이 invalid로 거부당한다.
   */
  it.each(SAMPLE_DECISIONS.map((d) => [d.title, d] as const))(
    '%s — 도메인 불변식을 통과한다',
    (_title, decision) => {
      expect(checkDecisionInvariants(decision)).toBeNull();
    },
  );

  it.each(SAMPLE_DECISIONS.map((d) => [d.title, d] as const))(
    '%s — 모든 평가가 불변식을 통과한다',
    (_title, decision) => {
      for (const item of decision.order?.items ?? []) {
        if (item.review) {
          expect(checkReviewInvariants(item.review)).toBeNull();
        }
      }
    },
  );

  it('id가 서로 겹치지 않는다', () => {
    const ids = SAMPLE_DECISIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const d of SAMPLE_DECISIONS) {
      const candidateIds = d.candidates.map((c) => c.id);
      expect(new Set(candidateIds).size).toBe(candidateIds.length);
    }
  });
});

describe('SAMPLE_DECISIONS — 숫자가 서로 맞는가', () => {
  it('구매 항목이 실제로 있는 후보를 가리킨다', () => {
    for (const d of SAMPLE_DECISIONS) {
      const ids = new Set(d.candidates.map((c) => c.id));

      for (const item of d.order?.items ?? []) {
        expect(ids.has(item.candidateId), `${item.candidateId}`).toBe(true);
      }
    }
  });

  /**
   * 이 앱에는 '왜 싸게 샀는지'를 적는 필드가 없다.
   * 그러니 샘플에서 비교 가격과 실제 단가가 다르면 설명할 방법이 없다.
   * 같아야 한다.
   */
  it('실제 단가가 비교 가격과 같다 — 할인 사유를 기록할 곳이 없으므로', () => {
    for (const d of SAMPLE_DECISIONS) {
      for (const item of d.order?.items ?? []) {
        const candidate = d.candidates.find((c) => c.id === item.candidateId);

        expect(
          item.unitPrice,
          `${candidate?.name}: 비교 ${candidate?.comparePrice} vs 실제 ${item.unitPrice}`,
        ).toBe(candidate?.comparePrice);
      }
    }
  });

  /**
   * 단가 합계와 최종 결제금액이 달라도 되지만(쿠폰·배송비),
   * 그 차이가 설명 가능한 크기여야 한다.
   * 합계보다 많이 냈으면 배송비, 적게 냈으면 할인이다.
   */
  it('단가 합계와 최종 결제금액의 차이가 설명 가능하다', () => {
    for (const d of SAMPLE_DECISIONS) {
      if (!d.order) continue;

      const sum = d.order.items.reduce(
        (acc, it) => acc + it.unitPrice * it.quantity,
        0,
      );
      const diff = d.order.totalPaid - sum;

      // 절반 넘게 깎였거나 물건값만큼 배송비가 붙었으면 뭔가 잘못된 것이다
      expect(Math.abs(diff), `${d.title}: 합계 ${sum} / 결제 ${d.order.totalPaid}`)
        .toBeLessThan(sum * 0.5);
    }
  });

  it('구성량이 있으면 단위 가격이 계산된다', () => {
    for (const d of SAMPLE_DECISIONS) {
      for (const c of d.candidates) {
        if (!c.amount) continue;

        const unitPrice = getUnitPrice(c.comparePrice, c.amount);
        expect(unitPrice, `${c.name}`).not.toBeNull();
        expect(unitPrice!.value).toBeGreaterThan(0);
      }
    }
  });

  it('평가는 구매일보다 나중에 쓰였다', () => {
    for (const d of SAMPLE_DECISIONS) {
      if (!d.order) continue;

      for (const item of d.order.items) {
        if (!item.review) continue;

        const days = daysBetween(d.order.purchasedAt, item.review.updatedAt);

        expect(days, `${item.candidateId}`).not.toBeNull();
        expect(days!).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('등록일이 수정일보다 앞선다', () => {
    for (const d of SAMPLE_DECISIONS) {
      expect(d.createdAt <= d.updatedAt, d.title).toBe(true);
    }
  });
});

describe('SAMPLE_DECISIONS — 화면을 보여주기 좋은가', () => {
  /**
   * 샘플의 목적은 '이 앱이 뭘 하는지' 한눈에 보여주는 것이다.
   * 상태가 전부 같으면 배지 색도 진행률도 확인할 수 없다.
   */
  it('서로 다른 상태를 최소 두 가지 담는다', () => {
    const statuses = new Set(SAMPLE_DECISIONS.map(getStatus));
    expect(statuses.size).toBeGreaterThanOrEqual(2);
  });

  it('구매하지 않은 후보가 남아 있는 고민이 있다', () => {
    const hasUnselected = SAMPLE_DECISIONS.some((d) => {
      if (!d.order) return false;
      const bought = new Set(d.order.items.map((it) => it.candidateId));
      return d.candidates.some((c) => !bought.has(c.id));
    });

    // '사지 않은 후보도 남는다'가 이 앱의 핵심이라 샘플이 그걸 보여줘야 한다
    expect(hasUnselected).toBe(true);
  });
});
