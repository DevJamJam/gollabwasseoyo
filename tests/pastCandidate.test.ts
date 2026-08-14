import { describe, expect, it } from 'vitest';

import { cloneCandidateForImport } from '@/lib/clone';
import { getPastCandidates } from '@/lib/derive';
import type { Decision } from '@/lib/types';

import { makeCandidate, makeDecision, makeReview } from './factory';

/* ══════════════════════════════════════════════════════════
   블록 46 — 불러올 수 있는 과거 후보

   후보 자체에는 '샀는지'가 없다. 그건 주문 쪽에 있다.
   고르는 화면에서는 둘을 나란히 봐야 하므로 여기서 한 번 합친다.
   ══════════════════════════════════════════════════════════ */

/** 안 산 후보 하나, 사고 평가한 후보 하나, 사고 평가 안 한 후보 하나. */
function threeCases(): Decision {
  return makeDecision({
    id: 'past',
    title: '겨울 홈카페 원두',
    candidates: [
      makeCandidate({ id: 'c1', name: '올드독', comparePrice: 18000 }),
      makeCandidate({ id: 'c2', name: '블렌드', comparePrice: 16000 }),
      makeCandidate({ id: 'c3', name: '디카페인', comparePrice: 24000 }),
    ],
    order: {
      purchasedAt: '2026-01-12',
      totalPaid: 50000,
      reason: '실패가 없어서',
      items: [
        {
          candidateId: 'c1',
          unitPrice: 18000,
          quantity: 1,
          review: makeReview({ rating: 4, oneLine: '늘 먹던 맛' }),
        },
        // 샀지만 아직 평가하지 않았다 — 개봉을 안 했을 수도 있다
        { candidateId: 'c2', unitPrice: 16000, quantity: 1, review: null },
      ],
    },
  });
}

describe('블록 46 — 과거 후보 목록', () => {
  it('모든 고민의 모든 후보를 모은다', () => {
    const a = makeDecision({ id: 'a', candidates: [makeCandidate({ id: 'a1' })] });
    const b = makeDecision({
      id: 'b',
      candidates: [makeCandidate({ id: 'b1' }), makeCandidate({ id: 'b2' })],
    });

    expect(getPastCandidates([a, b])).toHaveLength(3);
  });

  it('지금 고민은 제외한다 — 자기 후보를 자기한테 불러올 이유가 없다', () => {
    const a = makeDecision({ id: 'a', candidates: [makeCandidate({ id: 'a1' })] });
    const b = makeDecision({ id: 'b', candidates: [makeCandidate({ id: 'b1' })] });

    const result = getPastCandidates([a, b], 'a');

    expect(result).toHaveLength(1);
    expect(result[0].candidate.id).toBe('b1');
  });

  it('구매와 평가 여부를 후보마다 붙인다', () => {
    const result = getPastCandidates([threeCases()]);

    const [bought, boughtNoReview, notBought] = result;

    expect(bought.purchased).toBe(true);
    expect(bought.reviewed).toBe(true);
    expect(bought.rating).toBe(4);
    expect(bought.oneLine).toBe('늘 먹던 맛');

    // 샀지만 평가는 없다
    expect(boughtNoReview.purchased).toBe(true);
    expect(boughtNoReview.reviewed).toBe(false);
    expect(boughtNoReview.rating).toBeUndefined();

    // 아예 안 샀다
    expect(notBought.purchased).toBe(false);
    expect(notBought.reviewed).toBe(false);
  });

  it('어느 고민에서 왔는지 남긴다', () => {
    const result = getPastCandidates([threeCases()]);

    expect(result[0].decisionId).toBe('past');
    expect(result[0].decisionTitle).toBe('겨울 홈카페 원두');
  });

  it('주문이 없는 고민은 전부 미구매다', () => {
    const d = makeDecision({
      candidates: [makeCandidate({ id: 'c1' })],
      order: null,
    });

    expect(getPastCandidates([d])[0].purchased).toBe(false);
  });

  it('받은 순서를 유지한다 — 정렬은 여기서 하지 않는다', () => {
    const a = makeDecision({ id: 'a', candidates: [makeCandidate({ id: 'a1' })] });
    const b = makeDecision({ id: 'b', candidates: [makeCandidate({ id: 'b1' })] });

    expect(getPastCandidates([b, a]).map((p) => p.candidate.id)).toEqual([
      'b1',
      'a1',
    ]);
  });

  it('고민이 없으면 빈 목록이다', () => {
    expect(getPastCandidates([])).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════
   블록 47 — 불러오기는 독립 복사본을 만든다 ⭐
   ══════════════════════════════════════════════════════════ */

describe('블록 47 — 불러오기는 독립 복사본을 만든다', () => {
  it('새 id를 받는다 — 원본과 이어두지 않는다', () => {
    const source = makeCandidate({ id: 'old' });
    const copy = cloneCandidateForImport(source, 'new', { reviewed: false });

    expect(copy.id).toBe('new');
    expect(source.id).toBe('old');
  });

  it('값은 그대로 따라온다', () => {
    const source = makeCandidate({
      name: 'HHKB Pro Hybrid',
      comparePrice: 385000,
      brand: 'PFU',
      amount: { value: 1, unit: 'ea' },
      pros: ['타건감'],
      cons: ['예산을 넘김', '배열 적응'],
      memo: '배열이 특이하다',
    });

    const copy = cloneCandidateForImport(source, 'new', { reviewed: false });

    expect(copy.name).toBe('HHKB Pro Hybrid');
    expect(copy.comparePrice).toBe(385000);
    expect(copy.cons).toEqual(['예산을 넘김', '배열 적응']);
    expect(copy.memo).toBe('배열이 특이하다');
  });

  it('중첩된 값을 깊게 복사한다 — 고쳐도 원본이 안 바뀐다', () => {
    const source = makeCandidate({
      pros: ['원래'],
      amount: { value: 200, unit: 'g' },
    });

    const copy = cloneCandidateForImport(source, 'new', { reviewed: false });
    copy.pros.push('추가');
    copy.amount!.value = 500;

    expect(source.pros).toEqual(['원래']);
    expect(source.amount).toEqual({ value: 200, unit: 'g' });
  });

  /**
   * 이 규칙이 이 기능에서 제일 틀리기 쉬운 곳이다.
   *
   * "샀으니까 써봤겠지"가 자연스러워 보이지만, 원두를 사놓고 안 뜯었을 수 있다.
   * 별점과 후기를 쓰려면 실제로 써봐야 하므로 확실한 근거는 평가의 존재다.
   */
  it('평가가 있으면 사용 경험을 used로 바꾼다', () => {
    const source = makeCandidate({ familiarity: 'new' });
    const copy = cloneCandidateForImport(source, 'x', { reviewed: true });

    expect(copy.familiarity).toBe('used');
  });

  it('평가가 없으면 추측하지 않고 원래 값을 그대로 둔다', () => {
    const asNew = makeCandidate({ familiarity: 'new' });
    const asUsed = makeCandidate({ familiarity: 'used' });
    const unset = makeCandidate({ familiarity: undefined });

    expect(
      cloneCandidateForImport(asNew, 'x', { reviewed: false }).familiarity,
    ).toBe('new');
    // 평가가 없다고 안 써본 것은 아니다. used를 new로 되돌리지 않는다
    expect(
      cloneCandidateForImport(asUsed, 'x', { reviewed: false }).familiarity,
    ).toBe('used');
    expect(
      cloneCandidateForImport(unset, 'x', { reviewed: false }).familiarity,
    ).toBeUndefined();
  });

  it('평가가 있으면 원래 값이 무엇이든 used다', () => {
    const unset = makeCandidate({ familiarity: undefined });

    expect(
      cloneCandidateForImport(unset, 'x', { reviewed: true }).familiarity,
    ).toBe('used');
  });
});
