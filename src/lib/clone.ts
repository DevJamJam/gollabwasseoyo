/**
 * 깊은 복사.
 *
 * 얕은 복사(`{ ...obj }`)는 중첩된 배열과 객체의 '참조'를 그대로 넘긴다.
 * 그래서 복사본의 pros 배열에 push하면 원본의 pros도 같이 바뀐다.
 *
 * 이 앱에서 참조 공유가 만드는 사고는 두 가지다.
 *   1. 수정 폼 초안이 Provider 상태와 참조를 공유하면,
 *      취소하거나 저장에 실패해도 원본이 이미 바뀌어 있다.
 *   2. 액션에 넘긴 입력과 저장 상태가 참조를 공유하면,
 *      저장 뒤 호출자가 그 입력을 고칠 때 commit()을 우회해
 *      React 상태만 몰래 바뀐다.
 *
 * 둘 다 조용히 일어나서 발견하기 어렵다.
 */

import type { Candidate, Decision } from './types';

export function cloneCandidate(candidate: Candidate): Candidate {
  return {
    ...candidate,
    amount: candidate.amount ? { ...candidate.amount } : undefined,
    pros: [...candidate.pros],
    cons: [...candidate.cons],
  };
}

/** 수정 폼이라는 호출 의도를 이름으로 남기는 얇은 래퍼. */
export function cloneCandidateForEdit(candidate: Candidate): Candidate {
  return cloneCandidate(candidate);
}

/**
 * 과거 후보를 지금 고민으로 불러온다 (규칙 L-1 ~ L-3).
 *
 * ── 독립 복사본이다 ──
 * 새 id를 받는다. 원본과 이어두면 "이 상품의 전체 구매 이력" 같은 화면을
 * 만들 수 있어 솔깃하지만, 그러면 원본 고민을 지울 때 여기가 깨진다.
 * 불러온 뒤 값을 고쳐도 원본은 그대로여야 한다.
 *
 * ── 사용 경험을 바꾸는 근거는 '구매'가 아니라 '평가'다 ──
 * 처음에는 샀으면 'used'로 바꿔줬다. 그런데 원두를 사놓고 안 뜯었을 수 있다.
 * 별점과 후기를 쓰려면 실제로 써봐야 하므로, 확실한 근거는 평가의 존재다.
 *
 * 반대로 평가가 없다고 안 써본 것도 아니다. 그래서 그때는 **추측하지 않고
 * 원래 값을 그대로 둔다.** 모르는 것을 아는 척 채우지 않는다.
 */
export function cloneCandidateForImport(
  source: Candidate,
  id: string,
  opts: { reviewed: boolean },
): Candidate {
  return {
    ...cloneCandidate(source),
    id,
    familiarity: opts.reviewed ? 'used' : source.familiarity,
  };
}

export function cloneDecision(decision: Decision): Decision {
  return {
    ...decision,
    tags: [...decision.tags],
    candidates: decision.candidates.map(cloneCandidate),
    order: decision.order
      ? {
          ...decision.order,
          items: decision.order.items.map((item) => ({
            ...item,
            amount: item.amount ? { ...item.amount } : undefined,
            review: item.review
              ? {
                  ...item.review,
                  goods: [...item.review.goods],
                  bads: [...item.review.bads],
                }
              : null,
          })),
        }
      : null,
  };
}
