/**
 * 파생·계산 순수 함수.
 *
 * 이 파일은 React를 import하지 않는다. 그래서 테스트가 가볍고 빠르다.
 * 이 프로젝트의 단위 테스트는 대부분 이 파일을 겨눈다.
 */

import type {
  Amount,
  Candidate,
  CategoryId,
  Decision,
  DecisionStatus,
  Filters,
  PurchasedItem,
} from './types';

/* ────────────────────────────────────────────────────────────
   상태 파생 (규칙 S-1 ~ S-4)
   ──────────────────────────────────────────────────────────── */

/**
 * 고민의 상태를 계산한다. Decision에 status 필드는 없다.
 *
 * 상태를 저장하지 않는 이유: 상태를 바꾸는 경로가 setOrder·cancelOrder·
 * setReview·removeReview·updateDecision로 5개다. 저장하면 그 5곳 모두에서
 * status를 함께 갱신해야 하고, 한 곳만 빠져도 데이터가 거짓말을 한다.
 *
 * 특히 removeReview(평가 삭제)는 '평가 완료 → 구매 완료'로 **되돌아가는** 전환인데,
 * 파생이면 review = null 한 줄로 자동 성립한다. 이 함수는 손댈 필요가 없다.
 */
export function getStatus(d: Decision): DecisionStatus {
  if (!d.order) return 'considering';

  const allReviewed = d.order.items.every((it) => it.review !== null);
  return allReviewed ? 'reviewed' : 'purchased';
}

/**
 * 평가 진행률. '구매 상품 2개 중 1개 평가 완료 (1/2)' 표시에 쓴다.
 * 일부만 평가한 상태는 별도 상태값이 아니라 '구매 완료 + 진행률'로 표현한다 (규칙 R-5).
 */
export function getReviewProgress(d: Decision): { done: number; total: number } {
  if (!d.order) return { done: 0, total: 0 };

  const total = d.order.items.length;
  const done = d.order.items.filter((it) => it.review !== null).length;

  return { done, total };
}

/* ────────────────────────────────────────────────────────────
   단위 정규화와 단위 가격 (규칙 C-5)
   ──────────────────────────────────────────────────────────── */

/**
 * 비교 기준을 통일한다. kg → g, L → ml.
 * 1kg짜리와 500g짜리를 나란히 비교하려면 같은 단위로 환산해야 한다.
 *
 * switch에 모든 Unit을 다 적었으므로, 나중에 UNITS에 단위를 추가하면
 * TypeScript가 '반환값이 undefined일 수 있다'고 알려준다.
 */
function toBase(a: Amount): { value: number; base: 'g' | 'ml' | 'ea' } {
  switch (a.unit) {
    case 'kg':
      return { value: a.value * 1000, base: 'g' };
    case 'g':
      return { value: a.value, base: 'g' };
    case 'L':
      return { value: a.value * 1000, base: 'ml' };
    case 'ml':
      return { value: a.value, base: 'ml' };
    case 'ea':
      return { value: a.value, base: 'ea' };
  }
}

export interface UnitPrice {
  value: number;
  label: '100g당' | '100ml당' | '개당';
}

/**
 * 단위 가격. 저장하지 않고 표시 시점에 계산한다 (규칙 C-5).
 *
 * 계산할 수 없는 경우(구성량 미입력, 0 이하)는 null을 돌려주고 화면은 '-'를 그린다.
 * '개'는 100 단위로 환산할 수 없으므로 라벨이 '개당'으로 바뀐다.
 *
 * Math.round는 여기 한 번만 쓴다. 반환 직전에 한 번 반올림하는 것이 규칙이다.
 */
export function getUnitPrice(price: number, amount?: Amount): UnitPrice | null {
  if (!amount || amount.value <= 0 || price <= 0) return null;

  const { value, base } = toBase(amount);

  if (base === 'ea') {
    return { value: Math.round(price / value), label: '개당' };
  }

  return {
    value: Math.round((price / value) * 100),
    label: base === 'g' ? '100g당' : '100ml당',
  };
}

/* ────────────────────────────────────────────────────────────
   총 구매량 (규칙 P-4)
   ──────────────────────────────────────────────────────────── */

/**
 * 총 구매량 = 실제 구성량 × 구매 개수. 자동 계산하고 저장하지 않는다.
 *
 * 표시는 원래 단위를 유지한다 — 1kg × 2개는 '2kg'이지 '2000g'이 아니다.
 *
 * 반올림하지 않고 계산 결과를 그대로 돌려준다.
 * 0.3 * 3 = 0.8999999999999999 같은 부동소수점 오차는 표시 계층인
 * formatAmount()가 흡수한다. 반올림 지점을 여러 함수에 흩뿌리면
 * 어디서 값이 바뀌었는지 추적할 수 없다.
 */
export function getTotalAmount(item: PurchasedItem): Amount | null {
  if (!item.amount) return null;

  return {
    value: item.amount.value * item.quantity,
    unit: item.amount.unit,
  };
}

/* ────────────────────────────────────────────────────────────
   태그 파생
   ──────────────────────────────────────────────────────────── */

/**
 * 태그 목록을 고민들의 tags 배열에서 뽑아낸다.
 *
 * 태그 마스터 데이터를 따로 두지 않는다. 그래서 어떤 태그를 쓰는 마지막
 * 고민이 삭제되면 그 태그도 목록에서 저절로 사라진다. 정리 코드가 필요 없다.
 */
export function getTagsByCategory(
  list: Decision[],
  category?: CategoryId,
): string[] {
  const target = category
    ? list.filter((d) => d.category === category)
    : list;

  return [...new Set(target.flatMap((d) => d.tags))].sort((a, b) =>
    a.localeCompare(b, 'ko'),
  );
}

/* ────────────────────────────────────────────────────────────
   후보와 구매의 관계
   ──────────────────────────────────────────────────────────── */

export function isPurchased(d: Decision, candidateId: string): boolean {
  return d.order?.items.some((it) => it.candidateId === candidateId) ?? false;
}

export function getUnselectedCandidates(d: Decision): Candidate[] {
  if (!d.order) return d.candidates;

  const bought = new Set(d.order.items.map((it) => it.candidateId));
  return d.candidates.filter((c) => !bought.has(c.id));
}

/** 구매되어 삭제할 수 없는 후보 id. order가 없으면 빈 배열. */
export function getLockedCandidateIds(decision: Decision): string[] {
  return decision.order?.items.map((item) => item.candidateId) ?? [];
}

/**
 * 후보를 지울 수 있는가.
 *
 * 저장된 Decision이 아니라 '지금 화면에 있는 후보 배열'과 '잠긴 id 목록'을 받는다.
 * 수정 폼이 들고 있는 건 저장된 데이터가 아니라 아직 저장 전인 초안이라서,
 * Decision을 받으면 폼에서 후보를 하나 추가해도 개수가 그대로로 보인다.
 * 이렇게 두면 상세 화면·수정 폼·등록 폼이 같은 함수를 쓴다.
 */
export function canDeleteCandidate(
  candidates: Candidate[],
  lockedCandidateIds: string[],
  candidateId: string,
): boolean {
  const remainsAtLeastOne = candidates.length > 1;
  const locked = lockedCandidateIds.includes(candidateId);

  return remainsAtLeastOne && !locked;
}

/* ────────────────────────────────────────────────────────────
   목록 필터와 정렬
   ──────────────────────────────────────────────────────────── */

/** 모든 필터는 AND로 결합한다. */
export function filterDecisions(list: Decision[], f: Filters): Decision[] {
  const q = f.q?.trim().toLowerCase() ?? '';

  return list.filter((d) => {
    if (f.status && getStatus(d) !== f.status) return false;
    if (f.category && d.category !== f.category) return false;
    if (f.tag && !d.tags.includes(f.tag)) return false;
    if (!q) return true;

    const haystack = [
      d.title,
      ...d.tags,
      ...d.candidates.flatMap((c) => [c.name, c.brand ?? '']),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}

/**
 * 최근 수정순. 정렬 UI는 두지 않는다.
 *
 * updatedAt은 ISO 8601 UTC 문자열이라 사전순 비교가 곧 시간순이다.
 * 시간 정렬에 localeCompare를 쓸 이유가 없다.
 */
export function sortByUpdated(list: Decision[]): Decision[] {
  return [...list].sort((a, b) => {
    if (a.updatedAt === b.updatedAt) return 0;
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
}

export function countByStatus(
  list: Decision[],
): Record<DecisionStatus, number> {
  return {
    considering: list.filter((d) => getStatus(d) === 'considering').length,
    purchased: list.filter((d) => getStatus(d) === 'purchased').length,
    reviewed: list.filter((d) => getStatus(d) === 'reviewed').length,
  };
}
