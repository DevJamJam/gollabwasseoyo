import { describe, expect, it } from 'vitest';

import { checkDecisionInvariants } from '@/lib/invariants';
import type { Violation } from '@/lib/invariants';
import type { DecisionCreateInput } from '@/lib/types';

/**
 * Provider 불변식은 폼 검증과 목적이 다르다.
 *
 * 폼 검증은 사용자에게 안내하는 것이고, 여기는 **데이터가 절대 그 상태가
 * 되지 않게 막는 마지막 관문**이다. 액션을 직접 호출하거나, 리팩터링에서
 * 검증 호출이 빠지거나, 손상된 저장소에서 읽은 값이 흘러들어도 여기서 걸린다.
 */

const base: DecisionCreateInput = {
  title: '겨울 홈카페 원두',
  category: 'food',
  tags: ['원두'],
  purpose: '매일 아침 2잔',
  candidates: [
    { id: 'c1', name: '올드독', comparePrice: 18000, pros: [], cons: [] },
  ],
};

const repeat = (n: number) => 'ㄱ'.repeat(n);

/** base의 첫 후보를 부분 수정한 입력을 만든다. */
function withCandidate(patch: Record<string, unknown>): DecisionCreateInput {
  return {
    ...base,
    candidates: [{ ...base.candidates[0], ...patch }],
  } as DecisionCreateInput;
}

/* ══════════════════════════════════════════════════════════
   블록 19 — 숫자 불변식
   ══════════════════════════════════════════════════════════ */

describe('checkDecisionInvariants — 숫자', () => {
  it('정상 입력은 통과한다', () => {
    expect(checkDecisionInvariants(base)).toBeNull();
  });

  /**
   * NaN을 반드시 막아야 하는 이유:
   * JSON.stringify({ price: NaN }) 는 '{"price":null}' 이다.
   * 통과시키면 저장할 때 조용히 null로 바뀌어 다음에 읽을 때 깨진다.
   */
  it('후보 가격이 NaN이면 거부한다', () => {
    expect(checkDecisionInvariants(withCandidate({ comparePrice: NaN })))
      .toBe('candidate_price_invalid');
  });

  it('후보 가격은 1 이상 정수다', () => {
    expect(checkDecisionInvariants(withCandidate({ comparePrice: 0 })))
      .toBe('candidate_price_invalid');
    expect(checkDecisionInvariants(withCandidate({ comparePrice: -1 })))
      .toBe('candidate_price_invalid');
    expect(checkDecisionInvariants(withCandidate({ comparePrice: 1.5 })))
      .toBe('candidate_price_invalid');
    expect(checkDecisionInvariants(withCandidate({ comparePrice: 1 })))
      .toBeNull();
  });

  it('구성량은 소수를 허용하지만 NaN·0 이하·잘못된 단위는 막는다', () => {
    const amount = (value: unknown, unit = 'g') =>
      checkDecisionInvariants(withCandidate({ amount: { value, unit } }));

    expect(amount(NaN)).toBe('candidate_amount_invalid');
    expect(amount(0)).toBe('candidate_amount_invalid');
    expect(amount(-1)).toBe('candidate_amount_invalid');
    expect(amount(Infinity)).toBe('candidate_amount_invalid');
    expect(amount(1.5, 'kg')).toBeNull(); // 소수는 정상
    expect(amount(200, 'oz')).toBe('candidate_amount_invalid'); // 없는 단위
  });

  it('예산은 0 이상 정수만 허용한다', () => {
    expect(checkDecisionInvariants({ ...base, budget: -1 })).toBe('budget_invalid');
    expect(checkDecisionInvariants({ ...base, budget: 1.5 })).toBe('budget_invalid');
    expect(checkDecisionInvariants({ ...base, budget: NaN })).toBe('budget_invalid');
    expect(checkDecisionInvariants({ ...base, budget: 0 })).toBeNull();
    expect(checkDecisionInvariants({ ...base, budget: undefined })).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 20 — 문자열·목록 불변식
   ══════════════════════════════════════════════════════════ */

describe('checkDecisionInvariants — 문자열과 목록', () => {
  type Case = { patch: Partial<DecisionCreateInput>; reason: Exclude<Violation, null> };

  const cases = [
    { patch: { title: 'ㄱ' }, reason: 'title_invalid' },
    { patch: { title: repeat(61) }, reason: 'title_invalid' },
    { patch: { purpose: repeat(201) }, reason: 'purpose_invalid' },
    { patch: { tags: [] }, reason: 'tags_min' },
    { patch: { tags: ['a', 'b', 'c', 'd'] }, reason: 'tags_max' },
    { patch: { tags: ['원두', '원두'] }, reason: 'tag_duplicated' },
    { patch: { tags: [repeat(13)] }, reason: 'tag_invalid' },
    { patch: { candidates: [] }, reason: 'candidates_min' },
  ] satisfies Case[];

  it.each(cases)('$reason 을 거부한다', ({ patch, reason }) => {
    expect(checkDecisionInvariants({ ...base, ...patch })).toBe(reason);
  });

  /** 앞뒤 공백이 남아 있다는 건 파서를 거치지 않고 들어온 값이라는 뜻이다. */
  it('공백이 정리되지 않은 문자열을 거부한다', () => {
    expect(checkDecisionInvariants({ ...base, title: '  제목  ' }))
      .toBe('title_invalid');
    expect(checkDecisionInvariants({ ...base, tags: [' 원두 '] }))
      .toBe('tag_invalid');
  });

  it('후보 문자열 제한을 다시 검사한다', () => {
    expect(checkDecisionInvariants(withCandidate({ name: '' })))
      .toBe('candidate_name_invalid');
    expect(checkDecisionInvariants(withCandidate({ name: repeat(51) })))
      .toBe('candidate_name_invalid');
    expect(checkDecisionInvariants(withCandidate({ brand: repeat(31) })))
      .toBe('candidate_brand_invalid');
    expect(checkDecisionInvariants(withCandidate({ memo: repeat(201) })))
      .toBe('candidate_memo_invalid');
  });

  it('링크는 http(s)만 허용한다', () => {
    expect(checkDecisionInvariants(withCandidate({ link: 'ftp://example.com' })))
      .toBe('candidate_link_invalid');
    expect(checkDecisionInvariants(withCandidate({ link: '그냥 글자' })))
      .toBe('candidate_link_invalid');
    expect(checkDecisionInvariants(withCandidate({ link: 'https://example.com' })))
      .toBeNull();
  });

  it('기대·걱정은 개수를 먼저, 그다음 항목 길이를 본다', () => {
    expect(checkDecisionInvariants(withCandidate({ pros: ['1', '2', '3', '4'] })))
      .toBe('candidate_list_max');
    expect(checkDecisionInvariants(withCandidate({ pros: [repeat(31)] })))
      .toBe('candidate_pros_invalid');
    expect(checkDecisionInvariants(withCandidate({ cons: [repeat(31)] })))
      .toBe('candidate_cons_invalid');
  });

  it('후보 id는 비어 있거나 중복일 수 없다', () => {
    expect(checkDecisionInvariants(withCandidate({ id: '' })))
      .toBe('candidate_id_invalid');

    expect(
      checkDecisionInvariants({
        ...base,
        candidates: [base.candidates[0], { ...base.candidates[0] }],
      }),
    ).toBe('candidate_id_duplicated');
  });

  it('후보는 최대 4개다', () => {
    const five = [1, 2, 3, 4, 5].map((n) => ({
      ...base.candidates[0],
      id: 'c' + n,
    }));

    expect(checkDecisionInvariants({ ...base, candidates: five }))
      .toBe('candidates_max');
  });
});
