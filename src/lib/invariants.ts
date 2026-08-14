/**
 * 도메인 불변식 — Provider가 저장 직전에 거는 마지막 관문.
 *
 * 폼 검증(validation.ts)과 역할이 다르다.
 *   - 폼 검증은 사용자에게 왜 안 되는지 알려주는 것이 목적이다. 한국어 메시지를 만든다.
 *   - 불변식은 데이터가 절대 그 상태가 되지 않게 막는 것이 목적이다.
 *     액션을 직접 호출하거나, 리팩터링 실수가 있거나, 손상된 저장소에서
 *     읽어온 값이 흘러들어도 여기서 걸린다.
 *
 * 다만 Provider는 파싱 전의 원시 폼 문자열을 볼 수 없다.
 * 파서는 폼 검증 직후에만 호출한다는 규칙이 별개로 존재한다.
 */

import { isValidDateOnly } from './date';
import { CATEGORIES, UNITS } from './types';
import type {
  Amount,
  Decision,
  DecisionCreateInput,
  DecisionEditInput,
  OrderInput,
  ReviewInput,
} from './types';

/** 위반 사유를 문자열로 돌려준다. null이면 통과. */
export type Violation = string | null;

/**
 * 위반 사유를 액션 결과로 바꾸는 유일한 지점.
 *
 * 사용자에게는 언제나 '저장할 수 없는 상태입니다' 하나로만 보인다.
 * 그런데 invalid는 정상 흐름에서는 나오면 안 되는 값이라, 개발 중에 이걸
 * 만났을 때 어떤 규칙이 걸렸는지 알 방법이 있어야 한다. 그게 없으면
 * candidate_link_invalid와 tag_duplicated를 구분해 돌려주는 의미가 없다.
 *
 * 프로덕션 번들에서는 조건 하나만 남고 아무것도 출력하지 않는다.
 * 테스트 환경(NODE_ENV === 'test')에서도 조용하다.
 */
export function rejectInvalid(
  violation: Exclude<Violation, null>,
  where: string,
): { ok: false; reason: 'invalid' } {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[invariant] ' + where + ': ' + violation);
  }
  return { ok: false, reason: 'invalid' };
}

/* ────────────────────────────────────────────────────────────
   공통 숫자 검사
   ──────────────────────────────────────────────────────────── */

/**
 * Number.isFinite는 전역 isFinite와 다르다.
 * 전역 isFinite('12')는 true를 주므로 쓰지 않는다.
 *
 * Number.isInteger는 NaN·Infinity에 이미 false를 주지만,
 * '유한하고 정수여야 한다'는 의도를 드러내기 위해 둘 다 적는다.
 */
function isNonNegativeInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 1;
}

/**
 * 구성량은 1.5kg처럼 소수가 정상이므로 정수 검사를 하지 않는다.
 * 대신 0 이하와 NaN·Infinity는 막는다.
 *
 * NaN을 막는 것이 특히 중요하다 — JSON.stringify(NaN)은 null이 되므로
 * 통과시키면 손상된 데이터가 조용히 저장된다.
 */
function isValidAmount(amount: Amount | undefined): boolean {
  if (amount === undefined) return true;

  return (
    Number.isFinite(amount.value) &&
    amount.value > 0 &&
    UNITS.includes(amount.unit)
  );
}

/* ────────────────────────────────────────────────────────────
   공통 문자열 검사
   ──────────────────────────────────────────────────────────── */

/**
 * value !== value.trim() 을 확인하는 이유:
 * 파싱 단계(normalize.ts)가 이미 trim을 마쳤어야 한다.
 * 앞뒤 공백이 남아 있다면 파서를 거치지 않고 들어온 값이라는 뜻이다.
 */
function hasTrimmedLength(
  value: unknown,
  min: number,
  max: number,
): value is string {
  if (typeof value !== 'string' || value !== value.trim()) return false;
  return value.length >= min && value.length <= max;
}

function isNonEmptyNormalizedString(value: unknown): value is string {
  return (
    typeof value === 'string' && value === value.trim() && value.length >= 1
  );
}

/** 선택 문자열: 없거나, 공백이 정리된 1~max자 문자열이어야 한다. */
function isOptionalTextWithin(value: unknown, max: number): boolean {
  return value === undefined || hasTrimmedLength(value, 1, max);
}

function isTextListWithin(
  value: unknown,
  maxItems: number,
  maxItemLength?: number,
): value is string[] {
  if (!Array.isArray(value) || value.length > maxItems) return false;

  return value.every(
    (item) =>
      typeof item === 'string' &&
      item === item.trim() &&
      item.length >= 1 &&
      (maxItemLength === undefined || item.length <= maxItemLength),
  );
}

/** 선택 항목이므로 undefined는 통과. 있다면 http/https여야 한다. */
function isHttpUrlOrUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== 'string' || value !== value.trim()) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/* ────────────────────────────────────────────────────────────
   Decision 불변식
   ──────────────────────────────────────────────────────────── */

export function checkDecisionInvariants(
  input: DecisionCreateInput | DecisionEditInput,
): Violation {
  if (!hasTrimmedLength(input.title, 2, 60)) return 'title_invalid';

  if (!CATEGORIES.some((category) => category.id === input.category)) {
    return 'category_invalid';
  }

  if (!hasTrimmedLength(input.purpose, 1, 200)) return 'purpose_invalid';

  // 태그 (규칙 D-2, T-4)
  if (!Array.isArray(input.tags)) return 'tags_invalid';

  const tags = input.tags;
  if (tags.length < 1) return 'tags_min';
  if (tags.length > 3) return 'tags_max';

  if (
    tags.some(
      (tag) =>
        typeof tag !== 'string' ||
        tag !== tag.trim() ||
        tag.length < 1 ||
        tag.length > 12,
    )
  ) {
    return 'tag_invalid';
  }

  if (new Set(tags).size !== tags.length) return 'tag_duplicated';

  // 후보 (규칙 D-3)
  if (!Array.isArray(input.candidates)) return 'candidates_invalid';
  if (input.candidates.length < 1) return 'candidates_min';
  if (input.candidates.length > 4) return 'candidates_max';

  const ids = input.candidates.map((candidate) => candidate.id);
  if (ids.some((id) => !isNonEmptyNormalizedString(id))) {
    return 'candidate_id_invalid';
  }
  if (new Set(ids).size !== ids.length) return 'candidate_id_duplicated';

  if (input.budget !== undefined && !isNonNegativeInteger(input.budget)) {
    return 'budget_invalid';
  }

  for (const candidate of input.candidates) {
    if (!hasTrimmedLength(candidate.name, 1, 50)) {
      return 'candidate_name_invalid';
    }
    if (!isPositiveInteger(candidate.comparePrice)) {
      return 'candidate_price_invalid';
    }
    if (!isOptionalTextWithin(candidate.brand, 30)) {
      return 'candidate_brand_invalid';
    }
    if (!isOptionalTextWithin(candidate.option, 60)) {
      return 'candidate_option_invalid';
    }
    if (
      candidate.familiarity !== undefined &&
      candidate.familiarity !== 'new' &&
      candidate.familiarity !== 'used'
    ) {
      return 'candidate_familiarity_invalid';
    }
    if (!isValidAmount(candidate.amount)) return 'candidate_amount_invalid';
    if (!isOptionalTextWithin(candidate.seller, 40)) {
      return 'candidate_seller_invalid';
    }
    if (!isHttpUrlOrUndefined(candidate.link)) return 'candidate_link_invalid';
    if (!isOptionalTextWithin(candidate.shippingNote, 80)) {
      return 'candidate_shipping_note_invalid';
    }

    if (!Array.isArray(candidate.pros) || !Array.isArray(candidate.cons)) {
      return 'candidate_list_invalid';
    }
    // 개수 초과는 사유를 구분해 먼저 돌려준다. 아래 두 줄은 이 지점을 통과한 뒤
    // 실행되므로 실제로 걸러내는 것은 '항목별 형태와 길이'다.
    if (candidate.pros.length > 3 || candidate.cons.length > 3) {
      return 'candidate_list_max';
    }
    if (!isTextListWithin(candidate.pros, 3, 30)) {
      return 'candidate_pros_invalid';
    }
    if (!isTextListWithin(candidate.cons, 3, 30)) {
      return 'candidate_cons_invalid';
    }

    if (!isOptionalTextWithin(candidate.memo, 200)) {
      return 'candidate_memo_invalid';
    }
  }

  return null;
}

/* ────────────────────────────────────────────────────────────
   Order 불변식
   ──────────────────────────────────────────────────────────── */

export function checkOrderInvariants(
  decision: Decision,
  input: OrderInput,
): Violation {
  if (!Array.isArray(input.items) || input.items.length < 1) return 'items_min';

  if (!isValidDateOnly(input.purchasedAt)) return 'purchased_at_invalid';
  if (!isNonNegativeInteger(input.totalPaid)) return 'total_paid_invalid';
  if (!isOptionalTextWithin(input.seller, 40)) return 'order_seller_invalid';
  if (!hasTrimmedLength(input.reason, 1, 300)) return 'reason_invalid';

  const candidateIds = new Set(
    decision.candidates.map((candidate) => candidate.id),
  );
  const seen = new Set<string>();

  for (const item of input.items) {
    // 존재하지 않는 후보를 가리키는 구매 항목은 화면에서 이름·가격이 undefined가 된다
    if (!candidateIds.has(item.candidateId)) return 'candidate_not_found';

    // 규칙 P-2 — 같은 후보를 한 주문에 두 번 넣을 수 없다. 수량은 quantity로 표현한다
    if (seen.has(item.candidateId)) return 'candidate_duplicated';
    seen.add(item.candidateId);

    if (!isNonNegativeInteger(item.unitPrice)) return 'unit_price_invalid';
    if (!isPositiveInteger(item.quantity)) return 'quantity_invalid';
    if (!isValidAmount(item.amount)) return 'item_amount_invalid';
  }

  return null;
}

/* ────────────────────────────────────────────────────────────
   Review 불변식
   ──────────────────────────────────────────────────────────── */

export function checkReviewInvariants(input: ReviewInput): Violation {
  if (
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    return 'rating_invalid';
  }

  if (
    input.repurchase !== 'yes' &&
    input.repurchase !== 'maybe' &&
    input.repurchase !== 'no'
  ) {
    return 'repurchase_invalid';
  }

  if (typeof input.oneLine !== 'string') return 'review_one_line_invalid';

  const oneLine = input.oneLine.trim();
  if (input.oneLine !== oneLine || oneLine.length < 1 || oneLine.length > 100) {
    return 'review_one_line_invalid';
  }

  if (!Array.isArray(input.goods) || !Array.isArray(input.bads)) {
    return 'review_list_invalid';
  }
  if (input.goods.length > 3 || input.bads.length > 3) {
    return 'review_list_max';
  }
  // 항목당 30자 — 후보의 pros·cons와 같은 제한이다
  if (
    !isTextListWithin(input.goods, 3, 30) ||
    !isTextListWithin(input.bads, 3, 30)
  ) {
    return 'review_list_invalid';
  }

  if (!isOptionalTextWithin(input.nextChange, 100)) {
    return 'review_next_change_invalid';
  }

  return null;
}
