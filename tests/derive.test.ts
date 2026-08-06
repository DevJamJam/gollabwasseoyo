import { describe, expect, it } from 'vitest';

import {
  canDeleteCandidate,
  countByStatus,
  filterDecisions,
  getLockedCandidateIds,
  getPurchasedItem,
  getReviewProgress,
  getStatus,
  getTagsByCategory,
  getTotalAmount,
  getUnitPrice,
  sortByUpdated,
} from '@/lib/derive';
import { formatAmount } from '@/lib/format';
import type { Decision } from '@/lib/types';

import { makeCandidate, makeDecision, makeReview } from './factory';

/* ══════════════════════════════════════════════════════════
   블록 1 — 상태 파생 (규칙 S-1 ~ S-4)
   ══════════════════════════════════════════════════════════ */

describe('getStatus / getReviewProgress', () => {
  /** 후보 2개 + 주문 2건. 각 항목의 평가 유무를 인자로 받는다. */
  function twoItemDecision(hasReview: [boolean, boolean]): Decision {
    return makeDecision({
      candidates: [makeCandidate({ id: 'c1' }), makeCandidate({ id: 'c2' })],
      order: {
        purchasedAt: '2026-01-10',
        totalPaid: 3000,
        reason: '테스트',
        items: [
          {
            candidateId: 'c1',
            unitPrice: 1000,
            quantity: 1,
            review: hasReview[0] ? makeReview() : null,
          },
          {
            candidateId: 'c2',
            unitPrice: 2000,
            quantity: 1,
            review: hasReview[1] ? makeReview() : null,
          },
        ],
      },
    });
  }

  it('order가 null이면 고민 중이고 진행률은 0/0이다', () => {
    const d = makeDecision();

    expect(getStatus(d)).toBe('considering');
    expect(getReviewProgress(d)).toEqual({ done: 0, total: 0 });
  });

  it('구매했지만 평가가 하나도 없으면 구매 완료 0/2다', () => {
    const d = twoItemDecision([false, false]);

    expect(getStatus(d)).toBe('purchased');
    expect(getReviewProgress(d)).toEqual({ done: 0, total: 2 });
  });

  it('일부만 평가하면 구매 완료 1/2다', () => {
    const d = twoItemDecision([true, false]);

    expect(getStatus(d)).toBe('purchased');
    expect(getReviewProgress(d)).toEqual({ done: 1, total: 2 });
  });

  it('전부 평가하면 평가 완료 2/2다', () => {
    const d = twoItemDecision([true, true]);

    expect(getStatus(d)).toBe('reviewed');
    expect(getReviewProgress(d)).toEqual({ done: 2, total: 2 });
  });

  /**
   * 이 테스트가 '상태를 저장하지 않는다'는 결정을 검증한다.
   *
   * removeReview가 하는 일은 review를 null로 바꾸는 것뿐이다.
   * getStatus와 getReviewProgress는 한 글자도 고치지 않았는데
   * '평가 완료 → 구매 완료'라는 되돌아가는 전환이 자동으로 성립한다.
   *
   * status를 저장했다면 정방향 전환 4개에 더해 역방향까지 구현해야 했고,
   * 역방향을 빠뜨리는 것이 가장 흔한 버그다.
   */
  it('평가를 지우면 상태와 진행률이 다시 계산된다 (2/2 → 1/2)', () => {
    const reviewed = twoItemDecision([true, true]);

    expect(getStatus(reviewed)).toBe('reviewed');

    // removeReview가 만드는 것과 같은 형태 — review만 null이 된다
    const afterRemove: Decision = {
      ...reviewed,
      order: {
        ...reviewed.order!,
        items: reviewed.order!.items.map((item) =>
          item.candidateId === 'c1' ? { ...item, review: null } : item,
        ),
      },
    };

    expect(getStatus(afterRemove)).toBe('purchased');
    expect(getReviewProgress(afterRemove)).toEqual({ done: 1, total: 2 });
  });

  it('1/1에서 평가를 지우면 구매 완료 0/1이 된다', () => {
    const reviewed = makeDecision({
      order: {
        purchasedAt: '2026-01-10',
        totalPaid: 1000,
        reason: '테스트',
        items: [
          {
            candidateId: 'c1',
            unitPrice: 1000,
            quantity: 1,
            review: makeReview(),
          },
        ],
      },
    });

    expect(getStatus(reviewed)).toBe('reviewed');

    const afterRemove: Decision = {
      ...reviewed,
      order: {
        ...reviewed.order!,
        items: reviewed.order!.items.map((item) => ({ ...item, review: null })),
      },
    };

    expect(getStatus(afterRemove)).toBe('purchased');
    expect(getReviewProgress(afterRemove)).toEqual({ done: 0, total: 1 });
  });
});

/* ══════════════════════════════════════════════════════════
   블록 2 — 단위 가격 (규칙 C-5)
   ══════════════════════════════════════════════════════════ */

describe('getUnitPrice', () => {
  it('kg을 g으로 환산해 100g당 가격을 낸다', () => {
    expect(getUnitPrice(18000, { value: 1, unit: 'kg' })).toEqual({
      value: 1800,
      label: '100g당',
    });
  });

  it('g은 그대로 100g 기준으로 계산한다', () => {
    expect(getUnitPrice(18000, { value: 200, unit: 'g' })).toEqual({
      value: 9000,
      label: '100g당',
    });
  });

  it('L을 ml로 환산해 100ml당 가격을 낸다', () => {
    expect(getUnitPrice(6000, { value: 1, unit: 'L' })).toEqual({
      value: 600,
      label: '100ml당',
    });
  });

  it("단위가 '개'면 100 단위로 환산하지 않고 개당 가격을 낸다", () => {
    expect(getUnitPrice(15000, { value: 30, unit: 'ea' })).toEqual({
      value: 500,
      label: '개당',
    });
  });

  it('구성량이 없으면 null이다 (화면은 - 를 그린다)', () => {
    expect(getUnitPrice(18000, undefined)).toBeNull();
  });

  it('구성량이 0 이하면 null이다 (0으로 나누지 않는다)', () => {
    expect(getUnitPrice(18000, { value: 0, unit: 'g' })).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 3 — 총 구매량과 표시 반올림 (규칙 P-4)
   ══════════════════════════════════════════════════════════ */

describe('getTotalAmount / formatAmount', () => {
  it('1kg × 2개는 2kg이다 (원래 단위를 유지한다)', () => {
    const total = getTotalAmount({
      candidateId: 'c1',
      unitPrice: 18000,
      quantity: 2,
      amount: { value: 1, unit: 'kg' },
      review: null,
    });

    expect(total).toEqual({ value: 2, unit: 'kg' });
    expect(formatAmount(total ?? undefined)).toBe('2kg');
  });

  it('500g × 3개는 1500g이다 (1.5kg으로 바꿔 보여주지 않는다)', () => {
    const total = getTotalAmount({
      candidateId: 'c1',
      unitPrice: 14500,
      quantity: 3,
      amount: { value: 500, unit: 'g' },
      review: null,
    });

    expect(total).toEqual({ value: 1500, unit: 'g' });
    expect(formatAmount(total ?? undefined)).toBe('1500g');
  });

  it('구성량이 없으면 null이다', () => {
    expect(
      getTotalAmount({
        candidateId: 'c1',
        unitPrice: 1000,
        quantity: 1,
        review: null,
      }),
    ).toBeNull();
  });

  /**
   * 부동소수점 오차를 표시 계층에서만 흡수한다.
   *
   * 0.3 * 3 은 자바스크립트에서 0.8999999999999999 다.
   * 계산 함수는 이 값을 그대로 돌려주고(반올림 지점을 흩뿌리지 않는다),
   * formatAmount가 화면에 나가기 직전에만 정리한다.
   */
  it('0.3kg × 3개의 계산값은 오차를 갖지만 표시는 0.9kg이다', () => {
    const total = getTotalAmount({
      candidateId: 'c1',
      unitPrice: 5000,
      quantity: 3,
      amount: { value: 0.3, unit: 'kg' },
      review: null,
    });

    expect(total?.value).not.toBe(0.9); // 계산값에는 오차가 남아 있다
    expect(formatAmount(total ?? undefined)).toBe('0.9kg');
  });

  it('소수와 정수 모두 불필요한 0을 붙이지 않는다', () => {
    expect(formatAmount({ value: 1.5, unit: 'kg' })).toBe('1.5kg');
    expect(formatAmount({ value: 2, unit: 'kg' })).toBe('2kg');
    expect(formatAmount({ value: 200, unit: 'g' })).toBe('200g');
    expect(formatAmount({ value: 3, unit: 'ea' })).toBe('3개');
    expect(formatAmount(undefined)).toBe('-');
  });
});

/* ══════════════════════════════════════════════════════════
   블록 11 — 태그 파생 (규칙 T-1, T-2, T-5)
   ══════════════════════════════════════════════════════════ */

describe('getTagsByCategory', () => {
  const list = [
    makeDecision({ id: 'd1', category: 'food', tags: ['원두', '고소한맛'] }),
    makeDecision({ id: 'd2', category: 'food', tags: ['원두', '대용량'] }),
    makeDecision({ id: 'd3', category: 'digital', tags: ['키보드'] }),
  ];

  it('카테고리로 좁히고 중복을 없앤다', () => {
    expect(getTagsByCategory(list, 'food')).toEqual([
      '고소한맛',
      '대용량',
      '원두',
    ]);
  });

  it('다른 카테고리의 태그는 섞이지 않는다', () => {
    expect(getTagsByCategory(list, 'food')).not.toContain('키보드');
    expect(getTagsByCategory(list, 'digital')).toEqual(['키보드']);
  });

  it('카테고리를 주지 않으면 전체에서 뽑는다', () => {
    expect(getTagsByCategory(list)).toHaveLength(4);
  });

  it('기록이 없으면 빈 배열이다', () => {
    expect(getTagsByCategory([], 'food')).toEqual([]);
  });

  /** 태그 마스터가 없으므로 마지막 고민이 사라지면 태그도 저절로 사라진다 */
  it('그 태그를 쓰는 마지막 고민이 빠지면 목록에서도 사라진다', () => {
    const without = list.filter((d) => d.id !== 'd3');
    expect(getTagsByCategory(without)).not.toContain('키보드');
  });
});

/* ══════════════════════════════════════════════════════════
   블록 12 — 목록 필터·정렬·개수
   ══════════════════════════════════════════════════════════ */

describe('filterDecisions / sortByUpdated / countByStatus', () => {
  const bought = makeDecision({
    id: 'd2',
    category: 'digital',
    tags: ['키보드'],
    title: '재택용 키보드',
    candidates: [makeCandidate({ id: 'c1', name: 'RC930', brand: '레오폴드' })],
    order: {
      purchasedAt: '2026-01-10',
      totalPaid: 219000,
      reason: '테스트',
      items: [
        { candidateId: 'c1', unitPrice: 219000, quantity: 1, review: null },
      ],
    },
    updatedAt: '2026-02-01T00:00:00.000Z',
  });

  const thinking = makeDecision({
    id: 'd1',
    category: 'food',
    tags: ['원두'],
    title: '겨울 홈카페 원두',
    candidates: [makeCandidate({ id: 'c9', name: '올드독', brand: '프릳츠' })],
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  const list = [thinking, bought];

  it('필터가 없으면 전부 통과한다', () => {
    expect(filterDecisions(list, {})).toHaveLength(2);
  });

  it('상태·카테고리·태그는 AND로 결합한다', () => {
    expect(filterDecisions(list, { category: 'food' })).toEqual([thinking]);
    expect(filterDecisions(list, { status: 'purchased' })).toEqual([bought]);

    // 카테고리는 맞지만 상태가 어긋나면 0건
    expect(
      filterDecisions(list, { category: 'food', status: 'purchased' }),
    ).toHaveLength(0);
  });

  it('검색은 제목·태그·후보 상품명·브랜드를 훑는다', () => {
    expect(filterDecisions(list, { q: '홈카페' })).toEqual([thinking]); // 제목
    expect(filterDecisions(list, { q: '키보드' })).toEqual([bought]); // 태그
    expect(filterDecisions(list, { q: '올드독' })).toEqual([thinking]); // 상품명
    expect(filterDecisions(list, { q: '레오폴드' })).toEqual([bought]); // 브랜드
  });

  it('검색은 대소문자를 가리지 않고 앞뒤 공백을 무시한다', () => {
    expect(filterDecisions(list, { q: '  rc930  ' })).toEqual([bought]);
  });

  it('최근 수정순으로 정렬하고 원본 배열을 건드리지 않는다', () => {
    const sorted = sortByUpdated(list);

    expect(sorted.map((d) => d.id)).toEqual(['d2', 'd1']);
    expect(list.map((d) => d.id)).toEqual(['d1', 'd2']); // 원본 그대로
  });

  it('상태별 개수를 센다', () => {
    expect(countByStatus(list)).toEqual({
      considering: 1,
      purchased: 1,
      reviewed: 0,
    });
  });
});

/* ══════════════════════════════════════════════════════════
   블록 13 — 후보 삭제 가능 여부 (규칙 E-1)
   ══════════════════════════════════════════════════════════ */

describe('canDeleteCandidate / getLockedCandidateIds', () => {
  const purchased = makeDecision({
    candidates: [makeCandidate({ id: 'c1' })],
    order: {
      purchasedAt: '2026-01-10',
      totalPaid: 1000,
      reason: '테스트',
      items: [
        { candidateId: 'c1', unitPrice: 1000, quantity: 1, review: null },
      ],
    },
  });

  it('주문이 없으면 잠긴 후보도 없다', () => {
    expect(getLockedCandidateIds(makeDecision())).toEqual([]);
  });

  it('구매한 후보를 잠긴 목록으로 돌려준다', () => {
    expect(getLockedCandidateIds(purchased)).toEqual(['c1']);
  });

  it('후보가 하나뿐이면 지울 수 없다', () => {
    expect(canDeleteCandidate([makeCandidate({ id: 'c1' })], [], 'c1')).toBe(
      false,
    );
  });

  it('구매한 후보는 여러 개여도 지울 수 없다', () => {
    const two = [makeCandidate({ id: 'c1' }), makeCandidate({ id: 'c2' })];
    expect(canDeleteCandidate(two, ['c1'], 'c1')).toBe(false);
    expect(canDeleteCandidate(two, ['c1'], 'c2')).toBe(true);
  });

  /**
   * 이 테스트가 시그니처를 (candidates, lockedIds, id)로 바꾼 이유다.
   * Decision을 받았다면 초안 배열을 기준으로 판정할 방법이 없다.
   */
  it('수정 폼에서 후보를 더하면 초안 배열을 기준으로 다시 판정한다', () => {
    const locked = getLockedCandidateIds(purchased);

    // 저장된 상태: 후보 1개 + 구매됨 → 두 조건 모두 걸린다
    expect(canDeleteCandidate(purchased.candidates, locked, 'c1')).toBe(false);

    // 폼에서 후보를 하나 추가한 초안
    const draft = [...purchased.candidates, makeCandidate({ id: 'c2' })];

    expect(canDeleteCandidate(draft, locked, 'c1')).toBe(false); // 여전히 구매됨
    expect(canDeleteCandidate(draft, locked, 'c2')).toBe(true); // 새 후보는 가능
  });
});

/* ══════════════════════════════════════════════════════════
   블록 26 — 후보의 구매 기록 찾기
   ══════════════════════════════════════════════════════════ */

describe('getPurchasedItem', () => {
  const bought = makeDecision({
    candidates: [makeCandidate({ id: 'c1' }), makeCandidate({ id: 'c2' })],
    order: {
      purchasedAt: '2026-01-12',
      totalPaid: 47000,
      reason: '테스트',
      items: [
        { candidateId: 'c1', unitPrice: 18000, quantity: 1, review: null },
      ],
    },
  });

  it('산 후보의 구매 기록을 돌려준다', () => {
    expect(getPurchasedItem(bought, 'c1')?.unitPrice).toBe(18000);
  });

  it('안 산 후보는 undefined다', () => {
    expect(getPurchasedItem(bought, 'c2')).toBeUndefined();
  });

  it('주문이 없으면 undefined다', () => {
    expect(getPurchasedItem(makeDecision(), 'c1')).toBeUndefined();
  });

  it('없는 후보 id도 undefined다', () => {
    expect(getPurchasedItem(bought, 'ghost')).toBeUndefined();
  });
});
