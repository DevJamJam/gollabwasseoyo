import { describe, expect, it } from 'vitest';

import { getFormSubtotal, getSubtotal } from '@/lib/derive';
import { toOrderInput, toPurchaseForm } from '@/lib/parse';
import type { Decision, PurchaseFormValues } from '@/lib/types';
import {
  firstPurchaseErrorField,
  hasPurchaseError,
  validatePurchaseForm,
} from '@/lib/validation';

import { makeCandidate, makeDecision } from './factory';

/* ══════════════════════════════════════════════════════════
   블록 28 — 구매 폼 검증

   이 폼만 오류 구조가 다르다. items가 배열이라 Errors<T>로는
   "2번째 상품의 수량이 잘못됐다"를 표현할 자리가 없다.
   그래서 주문 공통 오류 + candidateId별 항목 오류, 두 층을 쓴다.
   ══════════════════════════════════════════════════════════ */

const base: PurchaseFormValues = {
  purchasedAt: '2026-01-12',
  totalPaid: '47000',
  seller: '네이버 스마트스토어',
  reason: '올드독은 실패가 없어서 유지',
  items: [
    {
      candidateId: 'c1',
      selected: true,
      unitPrice: '18000',
      quantity: '1',
      amountValue: '200',
      amountUnit: 'g',
    },
    {
      candidateId: 'c2',
      selected: false,
      unitPrice: '',
      quantity: '1',
      amountValue: '',
      amountUnit: '',
    },
  ],
};

describe('블록 28 — 구매 폼 검증', () => {
  it('정상 입력이면 hasPurchaseError가 false다', () => {
    const errors = validatePurchaseForm(base);

    expect(errors.itemErrors).toEqual({});
    expect(hasPurchaseError(errors)).toBe(false);
  });

  /**
   * hasError()를 그대로 쓰면 여기서 걸린다.
   * itemErrors는 오류가 없어도 {} 라서 undefined가 아니고,
   * Object.values(e).some(v => v !== undefined)가 언제나 true가 된다.
   */
  it('오류가 없어도 itemErrors는 객체로 남는다 — hasError로는 못 판단한다', () => {
    const errors = validatePurchaseForm(base);

    expect(errors.itemErrors).not.toBeUndefined();
    expect(Object.keys(errors.itemErrors)).toHaveLength(0);
  });

  it('선택된 상품이 없으면 폼 수준 오류가 붙는다', () => {
    const errors = validatePurchaseForm({
      ...base,
      items: base.items.map((it) => ({ ...it, selected: false })),
    });

    expect(errors.items).toBe('구매한 상품을 1개 이상 선택해 주세요.');
    expect(hasPurchaseError(errors)).toBe(true);
  });

  /**
   * 체크 해제된 행의 입력값은 폼 배열에 남아 있지만 검사하지 않는다.
   * 검사하면 "안 산 상품의 단가가 비었습니다"로 제출이 막힌다.
   */
  it('체크 해제된 행은 값이 비어 있어도 검사하지 않는다', () => {
    const errors = validatePurchaseForm(base);

    expect(errors.itemErrors.c2).toBeUndefined();
    expect(hasPurchaseError(errors)).toBe(false);
  });

  it('체크 해제된 행에 잘못된 값이 있어도 통과한다', () => {
    const errors = validatePurchaseForm({
      ...base,
      items: [
        base.items[0],
        { ...base.items[1], unitPrice: '-999', quantity: '0' },
      ],
    });

    expect(hasPurchaseError(errors)).toBe(false);
  });

  it('오류가 항목별로 나뉜다 — 어느 행인지 알 수 있다', () => {
    const errors = validatePurchaseForm({
      ...base,
      items: [
        { ...base.items[0], quantity: '0' },
        { ...base.items[1], selected: true, unitPrice: '' },
      ],
    });

    expect(errors.itemErrors.c1?.quantity).toBeDefined();
    expect(errors.itemErrors.c1?.unitPrice).toBeUndefined();
    expect(errors.itemErrors.c2?.unitPrice).toBeDefined();
  });

  it('단가는 0원을 허용하고 개수는 1개부터다', () => {
    const zeroPrice = validatePurchaseForm({
      ...base,
      items: [{ ...base.items[0], unitPrice: '0' }, base.items[1]],
    });
    expect(zeroPrice.itemErrors.c1?.unitPrice).toBeUndefined();

    const zeroQty = validatePurchaseForm({
      ...base,
      items: [{ ...base.items[0], quantity: '0' }, base.items[1]],
    });
    expect(zeroQty.itemErrors.c1?.quantity).toBeDefined();
  });

  it('빈 문자열은 0으로 통과하지 않는다', () => {
    // Number('')는 0이다. 그냥 두면 단가가 비어 있어도 통과한다.
    const errors = validatePurchaseForm({
      ...base,
      items: [{ ...base.items[0], unitPrice: '' }, base.items[1]],
    });

    expect(errors.itemErrors.c1?.unitPrice).toBeDefined();
  });

  it('소수는 개수·단가에서 거부한다', () => {
    const errors = validatePurchaseForm({
      ...base,
      items: [
        { ...base.items[0], unitPrice: '1000.5', quantity: '1.5' },
        base.items[1],
      ],
    });

    expect(errors.itemErrors.c1?.unitPrice).toBeDefined();
    expect(errors.itemErrors.c1?.quantity).toBeDefined();
  });

  it('구성량은 선택이지만 넣었으면 단위가 필수다', () => {
    const noUnit = validatePurchaseForm({
      ...base,
      items: [{ ...base.items[0], amountValue: '200', amountUnit: '' }, base.items[1]],
    });
    expect(noUnit.itemErrors.c1?.amountUnit).toBeDefined();

    const empty = validatePurchaseForm({
      ...base,
      items: [{ ...base.items[0], amountValue: '', amountUnit: '' }, base.items[1]],
    });
    expect(empty.itemErrors.c1).toBeUndefined();
  });

  it('존재하지 않는 날짜를 거부한다', () => {
    expect(
      validatePurchaseForm({ ...base, purchasedAt: '2026-02-30' }).purchasedAt,
    ).toBeDefined();

    expect(
      validatePurchaseForm({ ...base, purchasedAt: '2026-02-28' }).purchasedAt,
    ).toBeUndefined();
  });

  /** 미래 날짜는 안내만 한다. 오류에 넣으면 제출이 막힌다. */
  it('미래 날짜는 오류가 아니다', () => {
    const errors = validatePurchaseForm({ ...base, purchasedAt: '2099-12-31' });

    expect(errors.purchasedAt).toBeUndefined();
    expect(hasPurchaseError(errors)).toBe(false);
  });

  it('구매처는 40자, 이유는 300자가 경계다', () => {
    expect(
      validatePurchaseForm({ ...base, seller: 'ㄱ'.repeat(40) }).seller,
    ).toBeUndefined();
    expect(
      validatePurchaseForm({ ...base, seller: 'ㄱ'.repeat(41) }).seller,
    ).toBeDefined();

    expect(
      validatePurchaseForm({ ...base, reason: 'ㄱ'.repeat(300) }).reason,
    ).toBeUndefined();
    expect(
      validatePurchaseForm({ ...base, reason: 'ㄱ'.repeat(301) }).reason,
    ).toBeDefined();
  });

  it('이유는 공백만 있으면 비어 있는 것으로 본다', () => {
    expect(validatePurchaseForm({ ...base, reason: '   ' }).reason).toBe(
      '선택한 이유나 메모를 입력해 주세요.',
    );
  });

  it('결제금액은 0원을 허용한다 — 전액 포인트 결제가 있다', () => {
    expect(
      validatePurchaseForm({ ...base, totalPaid: '0' }).totalPaid,
    ).toBeUndefined();
    expect(
      validatePurchaseForm({ ...base, totalPaid: '-1' }).totalPaid,
    ).toBeDefined();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 29 — 오류가 있는 첫 칸 찾기

   포커스가 가야 할 곳은 '화면에 보이는 첫 번째 오류'다.
   itemErrors를 그냥 순회하면 객체 키 순서에 기대게 되고,
   행 순서가 바뀌면 조용히 어긋난다.
   ══════════════════════════════════════════════════════════ */

describe('블록 29 — 오류가 있는 첫 칸', () => {
  it('오류가 없으면 undefined다', () => {
    expect(firstPurchaseErrorField(base, validatePurchaseForm(base))).toBeUndefined();
  });

  it('상품 미선택이 가장 먼저다', () => {
    const v = { ...base, items: base.items.map((it) => ({ ...it, selected: false })) };

    expect(firstPurchaseErrorField(v, validatePurchaseForm(v))).toEqual({
      kind: 'common',
      field: 'items',
    });
  });

  it('상품 행 오류가 주문 공통 오류보다 먼저다', () => {
    const v: PurchaseFormValues = {
      ...base,
      totalPaid: '', // 공통 오류
      items: [{ ...base.items[0], quantity: '0' }, base.items[1]],
    };

    expect(firstPurchaseErrorField(v, validatePurchaseForm(v))).toEqual({
      kind: 'item',
      candidateId: 'c1',
      field: 'quantity',
    });
  });

  it('행 순서를 따른다 — 객체 키 순서가 아니라', () => {
    const v: PurchaseFormValues = {
      ...base,
      items: [
        { ...base.items[1], selected: true, unitPrice: '' }, // c2가 위
        { ...base.items[0], quantity: '0' },
      ],
    };

    const target = firstPurchaseErrorField(v, validatePurchaseForm(v));

    expect(target).toEqual({ kind: 'item', candidateId: 'c2', field: 'unitPrice' });
  });

  it('한 행 안에서는 단가 → 개수 → 구성량 순이다', () => {
    const v: PurchaseFormValues = {
      ...base,
      items: [
        { ...base.items[0], unitPrice: '', quantity: '0', amountValue: '-1' },
        base.items[1],
      ],
    };

    expect(firstPurchaseErrorField(v, validatePurchaseForm(v))).toEqual({
      kind: 'item',
      candidateId: 'c1',
      field: 'unitPrice',
    });
  });

  it('공통 오류는 구매일 → 결제금액 → 구매처 → 이유 순이다', () => {
    const v: PurchaseFormValues = {
      ...base,
      purchasedAt: '엉망',
      totalPaid: '',
      reason: '',
    };

    expect(firstPurchaseErrorField(v, validatePurchaseForm(v))).toEqual({
      kind: 'common',
      field: 'purchasedAt',
    });
  });
});

/* ══════════════════════════════════════════════════════════
   블록 30 — 폼 ↔ 주문 변환과 합계
   ══════════════════════════════════════════════════════════ */

function decisionWithCandidates(): Decision {
  return makeDecision({
    candidates: [
      makeCandidate({ id: 'c1', name: '올드독', comparePrice: 18000 }),
      makeCandidate({
        id: 'c2',
        name: '블렌드',
        comparePrice: 16000,
        amount: { value: 500, unit: 'g' },
      }),
    ],
  });
}

describe('블록 30 — 폼 ↔ 주문 변환', () => {
  it('체크된 항목만 저장된다', () => {
    const input = toOrderInput(base);

    expect(input.items).toHaveLength(1);
    expect(input.items[0].candidateId).toBe('c1');
  });

  it('문자열이 숫자로 바뀐다', () => {
    const input = toOrderInput(base);

    expect(input.totalPaid).toBe(47000);
    expect(input.items[0].unitPrice).toBe(18000);
    expect(input.items[0].quantity).toBe(1);
    expect(input.items[0].amount).toEqual({ value: 200, unit: 'g' });
  });

  it('빈 구매처는 undefined가 된다 — 빈 문자열을 저장하지 않는다', () => {
    expect(toOrderInput({ ...base, seller: '   ' }).seller).toBeUndefined();
  });

  it('주문이 없으면 모든 행이 미선택으로 시작한다', () => {
    const form = toPurchaseForm(decisionWithCandidates(), '2026-08-08');

    expect(form.items).toHaveLength(2);
    expect(form.items.every((it) => !it.selected)).toBe(true);
    expect(form.purchasedAt).toBe('2026-08-08');
    expect(form.totalPaid).toBe('');
  });

  /**
   * 단가는 비워둔다. 비교 가격은 '살펴볼 때 본 값'이고
   * 단가는 '실제로 낸 값'이라 서로 다른 개념이다.
   * 미리 채우면 다르게 산 경우에도 그대로 저장되기 쉽다.
   */
  it('단가는 비교 가격으로 미리 채우지 않는다', () => {
    const form = toPurchaseForm(decisionWithCandidates(), '2026-08-08');

    expect(form.items[0].unitPrice).toBe('');
  });

  it('구성량은 후보의 값에서 가져오고 개수는 1로 시작한다', () => {
    const form = toPurchaseForm(decisionWithCandidates(), '2026-08-08');

    expect(form.items[1].amountValue).toBe('500');
    expect(form.items[1].amountUnit).toBe('g');
    expect(form.items[1].quantity).toBe('1');
  });

  it('주문이 있으면 산 후보만 체크되고 값이 복원된다', () => {
    const d = decisionWithCandidates();
    const withOrder: Decision = {
      ...d,
      order: {
        purchasedAt: '2026-01-12',
        totalPaid: 47000,
        seller: '스마트스토어',
        reason: '싸서',
        items: [
          {
            candidateId: 'c2',
            unitPrice: 16000,
            quantity: 2,
            amount: { value: 500, unit: 'g' },
            review: null,
          },
        ],
      },
    };

    const form = toPurchaseForm(withOrder, '2026-08-08');

    expect(form.items[0].selected).toBe(false);
    expect(form.items[1].selected).toBe(true);
    expect(form.items[1].unitPrice).toBe('16000');
    expect(form.items[1].quantity).toBe('2');
    expect(form.purchasedAt).toBe('2026-01-12');
    expect(form.totalPaid).toBe('47000');
  });

  it('폼 → 주문 → 폼 왕복이 값을 잃지 않는다', () => {
    const d = decisionWithCandidates();
    const input = toOrderInput(base);

    const restored = toPurchaseForm(
      {
        ...d,
        candidates: [d.candidates[0]],
        order: {
          ...input,
          items: input.items.map((it) => ({ ...it, review: null })),
        },
      },
      '2026-08-08',
    );

    expect(restored.purchasedAt).toBe(base.purchasedAt);
    expect(restored.totalPaid).toBe(base.totalPaid);
    expect(restored.seller).toBe(base.seller);
    expect(restored.reason).toBe(base.reason);
    expect(restored.items[0].unitPrice).toBe(base.items[0].unitPrice);
    expect(restored.items[0].quantity).toBe(base.items[0].quantity);
  });
});

describe('블록 30 — 단가 합계', () => {
  it('단가 × 개수의 합이다', () => {
    expect(
      getSubtotal([
        { unitPrice: 18000, quantity: 1 },
        { unitPrice: 16000, quantity: 2 },
      ]),
    ).toBe(50000);
  });

  it('빈 목록은 0이다', () => {
    expect(getSubtotal([])).toBe(0);
  });

  it('폼에서도 같은 값이 나온다', () => {
    const v: PurchaseFormValues = {
      ...base,
      items: [
        base.items[0],
        { ...base.items[1], selected: true, unitPrice: '16000', quantity: '2' },
      ],
    };

    expect(getFormSubtotal(v)).toBe(50000);
  });

  /**
   * 입력 중에는 값이 비어 있을 수 있다.
   * 0으로 치면 '합계 0원'이라는 거짓말을 하게 되므로 null을 돌려준다.
   */
  it('입력이 덜 됐으면 null이다 — 0이 아니라', () => {
    expect(
      getFormSubtotal({
        ...base,
        items: [{ ...base.items[0], unitPrice: '' }, base.items[1]],
      }),
    ).toBeNull();

    expect(
      getFormSubtotal({
        ...base,
        items: [{ ...base.items[0], quantity: '  ' }, base.items[1]],
      }),
    ).toBeNull();
  });

  it('선택된 상품이 없으면 null이다', () => {
    expect(
      getFormSubtotal({
        ...base,
        items: base.items.map((it) => ({ ...it, selected: false })),
      }),
    ).toBeNull();
  });

  it('체크 해제된 행은 합계에 들어가지 않는다', () => {
    expect(getFormSubtotal(base)).toBe(18000);
  });
});
