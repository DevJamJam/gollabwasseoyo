import { describe, expect, it } from 'vitest';

import { toReviewForm, toReviewInput } from '@/lib/parse';
import type { Review, ReviewFormValues } from '@/lib/types';
import { EMPTY_REVIEW_FORM } from '@/lib/types';
import {
  REVIEW_FIELD_ORDER,
  firstErrorField,
  hasError,
  validateReviewForm,
} from '@/lib/validation';

import { makeReview } from './factory';

/* ══════════════════════════════════════════════════════════
   블록 40 — 평가 폼 검증

   구매 폼과 달리 배열 필드가 있어도 Errors<T>로 충분하다.
   goods·bads는 한 덩어리로 판정하므로 '몇 번째 항목'을 가리킬 일이 없다.
   ══════════════════════════════════════════════════════════ */

const base: ReviewFormValues = {
  rating: 4,
  repurchase: 'yes',
  oneLine: '늘 먹던 맛. 아침에 실패가 없다',
  goods: ['일정한 맛'],
  bads: ['200g이 2주 만에 떨어짐'],
  nextChange: '500g으로 파는지 찾아보기',
};

describe('블록 40 — 평가 폼 검증', () => {
  it('정상 입력이면 오류가 없다', () => {
    expect(hasError(validateReviewForm(base))).toBe(false);
  });

  it('빈 폼은 별점·재구매·후기 세 곳이 걸린다', () => {
    const e = validateReviewForm(EMPTY_REVIEW_FORM);

    expect(e.rating).toBe('별점을 선택해 주세요.');
    expect(e.repurchase).toBe('재구매 의사를 선택해 주세요.');
    expect(e.oneLine).toBe('한 줄 후기를 입력해 주세요.');
    // 선택 항목은 비어 있어도 오류가 아니다
    expect(e.goods).toBeUndefined();
    expect(e.nextChange).toBeUndefined();
  });

  /**
   * 별점에 기본값을 두지 않은 이유가 이 테스트다.
   * 3을 미리 채웠다면 '보통이라고 답함'과 '아직 안 고름'이 같은 값이 된다.
   */
  it('별점 0은 없다 — 안 고른 상태는 null이다', () => {
    expect(validateReviewForm({ ...base, rating: null }).rating).toBe(
      '별점을 선택해 주세요.',
    );
    expect(validateReviewForm({ ...base, rating: 1 }).rating).toBeUndefined();
    expect(validateReviewForm({ ...base, rating: 5 }).rating).toBeUndefined();
  });

  it('공백만 있는 후기는 비어 있는 것으로 본다', () => {
    expect(validateReviewForm({ ...base, oneLine: '   ' }).oneLine).toBe(
      '한 줄 후기를 입력해 주세요.',
    );
  });

  it('한 줄 후기는 100자가 경계다', () => {
    expect(
      validateReviewForm({ ...base, oneLine: 'ㄱ'.repeat(100) }).oneLine,
    ).toBeUndefined();
    expect(
      validateReviewForm({ ...base, oneLine: 'ㄱ'.repeat(101) }).oneLine,
    ).toBe('한 줄 후기는 100자 이내로 입력해 주세요.');
  });

  it('앞뒤 공백은 길이에서 빼고 센다', () => {
    // trim 후 100자면 통과해야 한다. 저장될 값이 그것이기 때문이다.
    const padded = '  ' + 'ㄱ'.repeat(100) + '  ';
    expect(validateReviewForm({ ...base, oneLine: padded }).oneLine).toBeUndefined();
  });

  it('만족한 점과 아쉬운 점은 3개가 경계다', () => {
    const three = ['가', '나', '다'];
    const four = [...three, '라'];

    expect(validateReviewForm({ ...base, goods: three }).goods).toBeUndefined();
    expect(validateReviewForm({ ...base, goods: four }).goods).toBe(
      '만족한 점은 최대 3개까지 입력할 수 있습니다.',
    );
    expect(validateReviewForm({ ...base, bads: four }).bads).toBe(
      '아쉬운 점은 최대 3개까지 입력할 수 있습니다.',
    );
  });

  it('빈 항목은 세지 않는다', () => {
    // ListInput이 빈 값을 넣지는 않지만, 손상된 데이터가 폼으로 흘러들 수 있다
    const withBlanks = ['가', '  ', '나', '', '다'];
    expect(
      validateReviewForm({ ...base, goods: withBlanks }).goods,
    ).toBeUndefined();
  });

  /**
   * 개수와 길이를 else if로 이은 결과를 박아둔다.
   * 4개이면서 긴 항목이 섞여 있어도 '개수' 안내가 먼저다.
   * 뭘 먼저 고쳐야 하는지가 분명해진다.
   */
  it('개수가 넘치면 길이 안내로 덮어쓰지 않는다', () => {
    const e = validateReviewForm({
      ...base,
      goods: ['가', '나', '다', 'ㄹ'.repeat(31)],
    });

    expect(e.goods).toBe('만족한 점은 최대 3개까지 입력할 수 있습니다.');
  });

  it('항목당 30자가 경계다', () => {
    expect(
      validateReviewForm({ ...base, goods: ['ㄱ'.repeat(30)] }).goods,
    ).toBeUndefined();
    expect(validateReviewForm({ ...base, goods: ['ㄱ'.repeat(31)] }).goods).toBe(
      '만족한 점은 항목당 30자 이내로 입력해 주세요.',
    );
  });

  it('다음에 바꿀 점은 선택이지만 100자가 경계다', () => {
    expect(
      validateReviewForm({ ...base, nextChange: '' }).nextChange,
    ).toBeUndefined();
    expect(
      validateReviewForm({ ...base, nextChange: 'ㄱ'.repeat(101) }).nextChange,
    ).toBe('다음에 바꿀 점은 100자 이내로 입력해 주세요.');
  });
});

/* ══════════════════════════════════════════════════════════
   블록 41 — 오류가 있는 첫 칸
   ══════════════════════════════════════════════════════════ */

describe('블록 41 — 오류가 있는 첫 칸', () => {
  it('오류가 없으면 undefined다', () => {
    expect(
      firstErrorField(validateReviewForm(base), REVIEW_FIELD_ORDER),
    ).toBeUndefined();
  });

  it('화면 순서를 따른다 — 별점이 가장 먼저다', () => {
    expect(
      firstErrorField(validateReviewForm(EMPTY_REVIEW_FORM), REVIEW_FIELD_ORDER),
    ).toBe('rating');
  });

  it('별점을 고르면 다음 오류로 내려간다', () => {
    const e = validateReviewForm({ ...EMPTY_REVIEW_FORM, rating: 4 });
    expect(firstErrorField(e, REVIEW_FIELD_ORDER)).toBe('repurchase');
  });

  it('위쪽이 다 맞으면 아래쪽 목록 오류를 가리킨다', () => {
    const e = validateReviewForm({ ...base, goods: ['가', '나', '다', '라'] });
    expect(firstErrorField(e, REVIEW_FIELD_ORDER)).toBe('goods');
  });
});

/* ══════════════════════════════════════════════════════════
   블록 42 — 폼 ↔ 평가 변환
   ══════════════════════════════════════════════════════════ */

describe('블록 42 — 폼 ↔ 평가 변환', () => {
  /**
   * checkReviewInvariants는 `input.oneLine !== oneLine.trim()`이면 거부한다.
   * 여기서 trim을 빠뜨리면 저장이 조용히 실패한다.
   */
  it('한 줄 후기의 앞뒤 공백을 없앤다', () => {
    const input = toReviewInput({ ...base, oneLine: '  괜찮았다  ' });
    expect(input.oneLine).toBe('괜찮았다');
  });

  it('빈 다음에 바꿀 점은 undefined가 된다 — 빈 문자열을 저장하지 않는다', () => {
    expect(toReviewInput({ ...base, nextChange: '' }).nextChange).toBeUndefined();
    expect(toReviewInput({ ...base, nextChange: '   ' }).nextChange).toBeUndefined();
  });

  it('목록의 빈 항목과 공백을 정리한다', () => {
    const input = toReviewInput({
      ...base,
      goods: ['  일정한 맛  ', '', '   ', '배송 빠름'],
    });

    expect(input.goods).toEqual(['일정한 맛', '배송 빠름']);
  });

  it('updatedAt은 입력에 없다 — Provider가 찍는다', () => {
    expect('updatedAt' in toReviewInput(base)).toBe(false);
  });

  it('저장된 평가를 폼으로 되돌린다', () => {
    const review = makeReview({
      rating: 3,
      repurchase: 'maybe',
      oneLine: '산미가 있었다',
      goods: ['양이 넉넉함'],
      bads: ['산미'],
      nextChange: '홀빈으로',
    });

    expect(toReviewForm(review)).toEqual({
      rating: 3,
      repurchase: 'maybe',
      oneLine: '산미가 있었다',
      goods: ['양이 넉넉함'],
      bads: ['산미'],
      nextChange: '홀빈으로',
    });
  });

  it('nextChange가 없으면 빈 문자열로 되돌린다', () => {
    const review = makeReview({ nextChange: undefined });
    expect(toReviewForm(review).nextChange).toBe('');
  });

  it('목록을 복사한다 — 폼을 고쳐도 원본이 안 바뀐다', () => {
    const review = makeReview({ goods: ['원래'] });
    const form = toReviewForm(review);

    form.goods.push('추가');

    expect(review.goods).toEqual(['원래']);
  });

  it('폼 → 평가 → 폼 왕복이 값을 잃지 않는다', () => {
    const input = toReviewInput(base);
    const restored = toReviewForm({ ...input, updatedAt: '2026-01-01T00:00:00.000Z' } as Review);

    expect(restored).toEqual(base);
  });
});
