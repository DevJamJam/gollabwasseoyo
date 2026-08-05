import { describe, expect, it } from 'vitest';

import {
  normalizeTags,
  normalizeTextList,
  optionalAmount,
  optionalInt,
  optionalText,
} from '@/lib/normalize';
import { toCandidate, toDecisionInput } from '@/lib/parse';
import {
  CANDIDATE_FIELD_ORDER,
  DECISION_FIELD_ORDER,
  firstErrorField,
  hasError,
  validateCandidateCount,
  validateCandidateForm,
  validateDecisionForm,
} from '@/lib/validation';
import {
  EMPTY_CANDIDATE_FORM,
  EMPTY_DECISION_FORM,
} from '@/lib/types';
import type { CandidateFormValues, DecisionFormValues } from '@/lib/types';

import { makeCandidate } from './factory';

/** 검증을 통과하는 기본 고민 폼. 여기서 한 필드씩 망가뜨려 본다. */
const baseDecision: DecisionFormValues = {
  ...EMPTY_DECISION_FORM,
  title: '겨울 홈카페 원두',
  category: 'food',
  tags: ['원두'],
  purpose: '매일 아침 2잔',
};

const baseCandidate: CandidateFormValues = {
  ...EMPTY_CANDIDATE_FORM,
  name: '올드독',
  comparePrice: '18000',
};

/** 한글 한 글자를 n번 반복. 경계값 테스트용. */
const repeat = (n: number) => 'ㄱ'.repeat(n);

/* ══════════════════════════════════════════════════════════
   블록 14 — 고민 폼 경계값
   ══════════════════════════════════════════════════════════ */

describe('validateDecisionForm', () => {
  it('정상 입력에는 오류가 없다', () => {
    expect(hasError(validateDecisionForm(baseDecision))).toBe(false);
  });

  it('제목은 2~60자다', () => {
    expect(validateDecisionForm({ ...baseDecision, title: 'ㄱ' }).title)
      .toBeDefined();
    expect(validateDecisionForm({ ...baseDecision, title: repeat(2) }).title)
      .toBeUndefined();
    expect(validateDecisionForm({ ...baseDecision, title: repeat(60) }).title)
      .toBeUndefined();
    expect(validateDecisionForm({ ...baseDecision, title: repeat(61) }).title)
      .toBeDefined();
  });

  /**
   * 폼 타입이 CategoryId | '' 라서 이 검사가 실제로 동작한다.
   * 도메인 타입(CategoryId)으로 뒀다면 ''가 될 수 없어 죽은 코드가 된다.
   */
  it('카테고리를 고르지 않으면 오류다', () => {
    expect(validateDecisionForm({ ...baseDecision, category: '' }).category)
      .toBeDefined();
  });

  it('태그는 1~3개이고 항목당 12자다', () => {
    expect(validateDecisionForm({ ...baseDecision, tags: [] }).tags)
      .toBeDefined();
    expect(validateDecisionForm({ ...baseDecision, tags: ['a', 'b', 'c'] }).tags)
      .toBeUndefined();
    expect(
      validateDecisionForm({ ...baseDecision, tags: ['a', 'b', 'c', 'd'] }).tags,
    ).toBeDefined();

    expect(validateDecisionForm({ ...baseDecision, tags: [repeat(12)] }).tags)
      .toBeUndefined();
    expect(validateDecisionForm({ ...baseDecision, tags: [repeat(13)] }).tags)
      .toBeDefined();
  });

  it('같은 고민 안에 중복 태그를 넣을 수 없다', () => {
    expect(validateDecisionForm({ ...baseDecision, tags: ['원두', '원두'] }).tags)
      .toBeDefined();
  });

  it('목적은 1~200자다', () => {
    expect(validateDecisionForm({ ...baseDecision, purpose: '  ' }).purpose)
      .toBeDefined();
    expect(validateDecisionForm({ ...baseDecision, purpose: repeat(200) }).purpose)
      .toBeUndefined();
    expect(validateDecisionForm({ ...baseDecision, purpose: repeat(201) }).purpose)
      .toBeDefined();
  });

  it('예산은 선택이지만 넣으면 0 이상 정수여야 한다', () => {
    expect(validateDecisionForm({ ...baseDecision, budget: '' }).budget)
      .toBeUndefined();
    expect(validateDecisionForm({ ...baseDecision, budget: '0' }).budget)
      .toBeUndefined();
    expect(validateDecisionForm({ ...baseDecision, budget: '-1' }).budget)
      .toBeDefined();
    expect(validateDecisionForm({ ...baseDecision, budget: '1.5' }).budget)
      .toBeDefined();
    expect(validateDecisionForm({ ...baseDecision, budget: 'abc' }).budget)
      .toBeDefined();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 15 — 후보 폼 경계값과 확정 제한값
   ══════════════════════════════════════════════════════════ */

describe('validateCandidateForm', () => {
  it('정상 입력에는 오류가 없다', () => {
    expect(hasError(validateCandidateForm(baseCandidate))).toBe(false);
  });

  /**
   * 경계값은 **통과하는 쪽과 실패하는 쪽을 쌍으로** 확인한다.
   * 한쪽만 검사하면 >= 와 > 를 잘못 쓴 실수를 못 잡는다.
   */
  it('확정 제한값을 정확히 적용한다', () => {
    const pairs: Array<[keyof CandidateFormValues, number]> = [
      ['name', 50],
      ['brand', 30],
      ['option', 60],
      ['seller', 40],
      ['shippingNote', 80],
      ['memo', 200],
    ];

    for (const [field, max] of pairs) {
      expect(
        validateCandidateForm({ ...baseCandidate, [field]: repeat(max) })[field],
        `${field} ${max}자는 통과해야 한다`,
      ).toBeUndefined();

      expect(
        validateCandidateForm({ ...baseCandidate, [field]: repeat(max + 1) })[field],
        `${field} ${max + 1}자는 막아야 한다`,
      ).toBeDefined();
    }
  });

  it('상품명은 비울 수 없다', () => {
    expect(validateCandidateForm({ ...baseCandidate, name: '   ' }).name)
      .toBeDefined();
  });

  it('비교 가격은 1 이상 정수다', () => {
    expect(validateCandidateForm({ ...baseCandidate, comparePrice: '' }).comparePrice)
      .toBeDefined();
    expect(validateCandidateForm({ ...baseCandidate, comparePrice: '0' }).comparePrice)
      .toBeDefined();
    expect(validateCandidateForm({ ...baseCandidate, comparePrice: '1' }).comparePrice)
      .toBeUndefined();
    expect(validateCandidateForm({ ...baseCandidate, comparePrice: '1.5' }).comparePrice)
      .toBeDefined();
  });

  it('구성량을 입력하면 단위가 필수다 (규칙 C-3)', () => {
    const onlyValue = validateCandidateForm({
      ...baseCandidate,
      amountValue: '200',
      amountUnit: '',
    });
    expect(onlyValue.amountUnit).toBeDefined();

    const withUnit = validateCandidateForm({
      ...baseCandidate,
      amountValue: '200',
      amountUnit: 'g',
    });
    expect(withUnit.amountUnit).toBeUndefined();
    expect(withUnit.amountValue).toBeUndefined();
  });

  it('구성량은 소수를 허용하되 0 이하는 막는다', () => {
    expect(
      validateCandidateForm({ ...baseCandidate, amountValue: '1.5', amountUnit: 'kg' })
        .amountValue,
    ).toBeUndefined();

    expect(
      validateCandidateForm({ ...baseCandidate, amountValue: '0', amountUnit: 'g' })
        .amountValue,
    ).toBeDefined();
  });

  it('기대·걱정은 3개 이하이고 항목당 30자다', () => {
    expect(
      validateCandidateForm({ ...baseCandidate, pros: ['1', '2', '3'] }).pros,
    ).toBeUndefined();
    expect(
      validateCandidateForm({ ...baseCandidate, pros: ['1', '2', '3', '4'] }).pros,
    ).toBeDefined();

    expect(
      validateCandidateForm({ ...baseCandidate, pros: [repeat(30)] }).pros,
    ).toBeUndefined();
    expect(
      validateCandidateForm({ ...baseCandidate, pros: [repeat(31)] }).pros,
    ).toBeDefined();

    expect(
      validateCandidateForm({ ...baseCandidate, cons: [repeat(31)] }).cons,
    ).toBeDefined();
  });

  /**
   * 개수와 길이가 동시에 잘못돼도 메시지는 하나만 붙는다.
   * 먼저 고쳐야 할 문제(개수)를 먼저 보여준다.
   */
  it('개수와 길이가 함께 틀리면 개수를 먼저 안내한다', () => {
    const e = validateCandidateForm({
      ...baseCandidate,
      pros: [repeat(31), repeat(31), repeat(31), repeat(31)],
    });

    expect(e.pros).toContain('최대 3개');
  });

  it('링크는 비워도 되지만 넣으면 http(s)여야 한다', () => {
    expect(validateCandidateForm({ ...baseCandidate, link: '' }).link)
      .toBeUndefined();
    expect(
      validateCandidateForm({ ...baseCandidate, link: 'https://example.com' }).link,
    ).toBeUndefined();
    expect(validateCandidateForm({ ...baseCandidate, link: 'ftp://example.com' }).link)
      .toBeDefined();
    expect(validateCandidateForm({ ...baseCandidate, link: '그냥 글자' }).link)
      .toBeDefined();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 16 — 후보 개수와 오류 필드 순서
   ══════════════════════════════════════════════════════════ */

describe('validateCandidateCount / firstErrorField', () => {
  it('후보는 1~4개다 (규칙 D-3)', () => {
    expect(validateCandidateCount([])).toBeDefined();
    expect(validateCandidateCount([makeCandidate()])).toBeUndefined();

    const four = [1, 2, 3, 4].map((n) => makeCandidate({ id: 'c' + n }));
    expect(validateCandidateCount(four)).toBeUndefined();

    const five = [1, 2, 3, 4, 5].map((n) => makeCandidate({ id: 'c' + n }));
    expect(validateCandidateCount(five)).toBeDefined();
  });

  /**
   * 포커스 순서는 화면에 보이는 순서여야 한다.
   * 오류 객체의 키 순서에 의존하면 타입의 필드 순서를 바꿀 때 조용히 어긋난다.
   */
  it('화면 순서대로 첫 오류 필드를 찾는다', () => {
    const errors = validateDecisionForm({
      ...baseDecision,
      title: '',      // 화면상 첫 번째
      purpose: '',    // 네 번째
    });

    expect(firstErrorField(errors, DECISION_FIELD_ORDER)).toBe('title');
  });

  it('앞쪽 필드가 멀쩡하면 뒤쪽 오류를 찾는다', () => {
    const errors = validateCandidateForm({ ...baseCandidate, memo: repeat(201) });

    expect(firstErrorField(errors, CANDIDATE_FIELD_ORDER)).toBe('memo');
  });

  it('오류가 없으면 undefined다', () => {
    expect(firstErrorField(validateDecisionForm(baseDecision), DECISION_FIELD_ORDER))
      .toBeUndefined();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 17 — 정규화는 조용히 값을 바꾸지 않는다
   ══════════════════════════════════════════════════════════ */

describe('normalize', () => {
  it('빈 선택 문자열은 저장하지 않는다', () => {
    expect(optionalText('  ')).toBeUndefined();
    expect(optionalText('  프릳츠  ')).toBe('프릳츠');
  });

  /**
   * 1.9를 1로 깎지 않는다. 사용자가 입력하지 않은 값을 저장하면 안 된다.
   * 잘못된 값이면 undefined를 주고, 애초에 검증이 막아야 한다.
   */
  it('정수 파싱은 잘못된 입력을 보정하지 않는다', () => {
    expect(optionalInt('')).toBeUndefined();
    expect(optionalInt('abc')).toBeUndefined();
    expect(optionalInt('1.9')).toBeUndefined();
    expect(optionalInt('100')).toBe(100);
    expect(optionalInt('  100  ')).toBe(100);
  });

  it('구성량은 소수를 유지한다', () => {
    expect(optionalAmount('1.5', 'kg')).toEqual({ value: 1.5, unit: 'kg' });
    expect(optionalAmount('200', 'g')).toEqual({ value: 200, unit: 'g' });
  });

  it('값이나 단위가 하나라도 없으면 구성량을 만들지 않는다', () => {
    expect(optionalAmount('', 'kg')).toBeUndefined();
    expect(optionalAmount('200', '')).toBeUndefined();
    expect(optionalAmount('0', 'g')).toBeUndefined();
    expect(optionalAmount('abc', 'g')).toBeUndefined();
  });

  /**
   * 일반 목록은 순서와 중복을 보존한다. 중복 금지 규칙이 있는 건 태그뿐이다.
   * 개수 초과도 자르지 않는다 — 검증이 막고, 정규화는 조용히 버리지 않는다.
   */
  it('일반 목록은 공백만 다듬고 중복·순서·개수를 건드리지 않는다', () => {
    expect(normalizeTextList([' 고소함 ', '', '  ', '가격'])).toEqual([
      '고소함',
      '가격',
    ]);
    expect(normalizeTextList(['같음', '같음'])).toEqual(['같음', '같음']);
    expect(normalizeTextList(['1', '2', '3', '4'])).toHaveLength(4);
  });

  it('태그만 중복을 없앤다 (규칙 T-4)', () => {
    expect(normalizeTags([' 원두 ', '원두', '고소한맛'])).toEqual([
      '원두',
      '고소한맛',
    ]);
  });
});

/* ══════════════════════════════════════════════════════════
   블록 18 — 폼 값이 도메인 값으로 바뀌는 경계
   ══════════════════════════════════════════════════════════ */

describe('parse', () => {
  it('빈 선택 필드는 undefined가 되고 키만 남지 않는다', () => {
    const c = toCandidate(baseCandidate, 'c1');

    expect(c.brand).toBeUndefined();
    expect(c.option).toBeUndefined();
    expect(c.familiarity).toBeUndefined();
    expect(c.amount).toBeUndefined();
    expect(c.memo).toBeUndefined();

    // 저장되는 값에 '' 이나 NaN 이 없어야 한다
    expect(Object.values(c).some((v) => v === '')).toBe(false);
    expect(Object.values(c).some((v) => Number.isNaN(v))).toBe(false);
  });

  it('숫자는 문자열에서 숫자로 바뀐다', () => {
    const c = toCandidate({ ...baseCandidate, comparePrice: '18000' }, 'c1');

    expect(c.comparePrice).toBe(18000);
    expect(typeof c.comparePrice).toBe('number');
  });

  it('고민 입력에서 태그 중복이 제거되고 예산이 숫자가 된다', () => {
    const input = toDecisionInput(
      { ...baseDecision, tags: [' 원두 ', '원두'], budget: '40000' },
      [makeCandidate()],
    );

    expect(input.tags).toEqual(['원두']);
    expect(input.budget).toBe(40000);
    expect(input.category).toBe('food');
  });

  it('예산을 비우면 키가 undefined다', () => {
    const input = toDecisionInput({ ...baseDecision, budget: '' }, [
      makeCandidate(),
    ]);

    expect(input.budget).toBeUndefined();
  });
});
