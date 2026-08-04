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
