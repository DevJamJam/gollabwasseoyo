import { describe, expect, it } from 'vitest';

import { cloneCandidate, cloneCandidateForEdit, cloneDecision } from '@/lib/clone';
import { toCandidate, toCandidateForm, toDecisionForm } from '@/lib/parse';

import { makeCandidate, makeDecision, makeReview } from './factory';

/* ══════════════════════════════════════════════════════════
   블록 21 — 깊은 복사로 참조를 끊는다

   얕은 복사(`{ ...obj }`)는 중첩된 배열과 객체의 '주소'만 베낀다.
   그래서 복사본의 pros에 push하면 원본의 pros도 같이 바뀐다.

   이 앱에서 참조 공유가 만드는 사고는 조용해서 발견하기 어렵다.
   저장 전에 원본이 이미 바뀌어 있으면 '취소'와 '저장 실패'가 의미를 잃는다.
   ══════════════════════════════════════════════════════════ */

describe('cloneCandidate', () => {
  it('중첩된 배열과 객체가 원본과 다른 것이 된다', () => {
    const source = makeCandidate({
      amount: { value: 500, unit: 'g' },
      pros: ['고소함'],
      cons: ['가격'],
    });

    const copy = cloneCandidate(source);

    // 값은 같지만
    expect(copy).toEqual(source);

    // 담고 있는 상자는 다르다
    expect(copy.pros).not.toBe(source.pros);
    expect(copy.cons).not.toBe(source.cons);
    expect(copy.amount).not.toBe(source.amount);
  });

  it('복사본을 고쳐도 원본이 그대로다', () => {
    const source = makeCandidate({
      amount: { value: 500, unit: 'g' },
      pros: ['고소함'],
    });

    const copy = cloneCandidate(source);
    copy.pros.push('대용량');
    copy.comparePrice = 99999;
    if (copy.amount) copy.amount.value = 1000;

    expect(source.pros).toEqual(['고소함']);
    expect(source.comparePrice).toBe(1000);
    expect(source.amount?.value).toBe(500);
  });

  it('구성량이 없으면 undefined를 유지한다', () => {
    expect(cloneCandidate(makeCandidate()).amount).toBeUndefined();
  });

  it('cloneCandidateForEdit는 같은 일을 한다 (이름만 다른 래퍼)', () => {
    const source = makeCandidate({ pros: ['고소함'] });
    const copy = cloneCandidateForEdit(source);

    expect(copy).toEqual(source);
    expect(copy.pros).not.toBe(source.pros);
  });
});

describe('cloneDecision', () => {
  it('주문 안의 평가 목록까지 참조를 끊는다', () => {
    const source = makeDecision({
      tags: ['원두', '고소한맛'],
      order: {
        purchasedAt: '2026-01-10',
        totalPaid: 1000,
        reason: '테스트',
        items: [
          {
            candidateId: 'c1',
            unitPrice: 1000,
            quantity: 1,
            amount: { value: 200, unit: 'g' },
            review: makeReview({ goods: ['일정한 맛'], bads: ['가격'] }),
          },
        ],
      },
    });

    const copy = cloneDecision(source);

    expect(copy).toEqual(source);
    expect(copy.tags).not.toBe(source.tags);
    expect(copy.candidates).not.toBe(source.candidates);
    expect(copy.order).not.toBe(source.order);
    expect(copy.order?.items[0].review).not.toBe(source.order?.items[0].review);
    expect(copy.order?.items[0].review?.goods).not.toBe(
      source.order?.items[0].review?.goods,
    );
  });

  it('주문이 없으면 null을 유지한다', () => {
    expect(cloneDecision(makeDecision()).order).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 22 — 도메인 ↔ 폼 왕복

   수정 화면은 저장된 값을 입력칸에 되돌려야 한다.
   역변환에서 `?? ''` 하나만 빠뜨려도 input의 value에 undefined가 들어가
   React가 "제어 컴포넌트가 비제어로 바뀌었다"고 경고한다.

   왕복 테스트는 그런 누락을 한 번에 잡는다.
   ══════════════════════════════════════════════════════════ */

describe('toCandidateForm ↔ toCandidate', () => {
  it('모든 필드를 채운 후보가 왕복해도 그대로다', () => {
    const original = makeCandidate({
      id: 'c1',
      name: '올드독',
      comparePrice: 18000,
      brand: '프릳츠',
      option: '홀빈',
      familiarity: 'used',
      amount: { value: 200, unit: 'g' },
      seller: '공식몰',
      link: 'https://example.com',
      shippingNote: '3만원 이상 무료배송',
      pros: ['고소함', '배송 빠름'],
      cons: ['가격'],
      memo: '리뷰에서 산미 얘기가 갈린다',
    });

    expect(toCandidate(toCandidateForm(original), original.id)).toEqual(original);
  });

  it('필수 필드만 있는 후보도 왕복해도 그대로다', () => {
    const minimal = makeCandidate();

    expect(toCandidate(toCandidateForm(minimal), minimal.id)).toEqual(minimal);
  });

  /**
   * 이 테스트가 `?? ''` 누락을 잡는다.
   * 폼 값에 undefined가 하나라도 있으면 그 입력칸이 비제어로 바뀐다.
   */
  it('폼 값에 undefined가 하나도 없다', () => {
    const form = toCandidateForm(makeCandidate());

    for (const [key, value] of Object.entries(form)) {
      expect(value, `${key}가 undefined다`).not.toBeUndefined();
    }
  });

  it('배열을 새로 만들어 원본과 참조를 공유하지 않는다', () => {
    const source = makeCandidate({ pros: ['고소함'] });
    const form = toCandidateForm(source);

    form.pros.push('추가');

    expect(source.pros).toEqual(['고소함']);
  });
});

describe('toDecisionForm', () => {
  it('예산이 없으면 빈 문자열, 있으면 문자열 숫자다', () => {
    expect(toDecisionForm(makeDecision()).budget).toBe('');
    expect(toDecisionForm(makeDecision({ budget: 40000 })).budget).toBe('40000');
    expect(toDecisionForm(makeDecision({ budget: 0 })).budget).toBe('0');
  });

  it('태그 배열을 복사한다', () => {
    const source = makeDecision({ tags: ['원두'] });
    const form = toDecisionForm(source);

    form.tags.push('추가');

    expect(source.tags).toEqual(['원두']);
  });

  it('폼 값에 undefined가 하나도 없다', () => {
    const form = toDecisionForm(makeDecision());

    for (const [key, value] of Object.entries(form)) {
      expect(value, `${key}가 undefined다`).not.toBeUndefined();
    }
  });
});
