/**
 * 테스트 픽스처 팩토리.
 *
 * 매 테스트에서 Decision을 손으로 만들면 금방 지친다.
 * 기본값을 주고 필요한 필드만 patch로 덮어쓴다.
 *
 * 여기서 Partial<Decision>을 쓰는 것은 허용된다.
 * 금지 대상은 Provider 액션의 Partial<Decision>이다 —
 * 테스트 픽스처는 프로덕션 상태 변경 경로가 아니다.
 */

import type { Candidate, Decision, Review } from '@/lib/types';

export function makeCandidate(patch: Partial<Candidate> = {}): Candidate {
  return {
    id: 'c1',
    name: '테스트 상품',
    comparePrice: 1000,
    pros: [],
    cons: [],
    ...patch,
  };
}

export function makeReview(patch: Partial<Review> = {}): Review {
  return {
    rating: 4,
    repurchase: 'maybe',
    oneLine: '무난했다',
    goods: [],
    bads: [],
    updatedAt: '2026-01-20T00:00:00.000Z',
    ...patch,
  };
}

export function makeDecision(patch: Partial<Decision> = {}): Decision {
  return {
    id: 'd1',
    title: '테스트 고민',
    category: 'food',
    tags: ['원두'],
    purpose: '테스트',
    candidates: [makeCandidate()],
    order: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  };
}

/**
 * storage 테스트 전용.
 *
 * load()가 '거부해야 하는' 값을 넣어야 하므로 Decision 타입으로 좁히지 않고
 * unknown을 반환한다. makeDecision을 쓰면 brand: {} 같은 잘못된 값을 넣는 순간
 * 컴파일이 막혀서 정작 테스트하고 싶은 것을 테스트할 수 없다.
 */
export function makeStoredDecision(
  patch: Record<string, unknown> = {},
): unknown {
  return { ...makeDecision(), ...patch };
}
