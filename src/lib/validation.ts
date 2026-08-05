/**
 * 폼 검증.
 *
 * 도메인 불변식(invariants.ts)과 목적이 다르다.
 *   폼 검증  — 사용자에게 **왜** 안 되는지 한국어로 알려준다
 *   불변식   — 데이터가 **절대** 그 상태가 되지 않게 막는다
 *
 * 검증 함수는 언제나 **폼 타입**을 받는다. 도메인 타입을 받는 검증 함수는
 * 존재할 수 없다 — 도메인 타입에는 이미 유효한 값만 들어 있기 때문이다.
 * 검증의 대상은 항상 '사용자가 방금 타이핑한 문자열'이다.
 */

import type {
  Candidate,
  CandidateFormValues,
  DecisionFormValues,
} from './types';

/** 필드 이름 → 오류 메시지. 한 필드에 메시지는 하나만 붙는다. */
export type Errors<T> = Partial<Record<keyof T, string>>;

export function hasError<T>(e: Errors<T>): boolean {
  return Object.values(e).some((v) => v !== undefined);
}

/**
 * 선택 항목이라 빈 값은 통과시킨다.
 * 정규식으로 URL을 검사하지 않는다 — 표준 API가 이미 정확하게 한다.
 */
export function isValidUrl(s: string): boolean {
  const t = s.trim();
  if (t === '') return true;

  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 빈 문자열은 통과시키지 않는다. Number('')가 0이라 그냥 두면 0으로 통과한다. */
function isPositiveInt(s: string, min: number): boolean {
  const t = s.trim();
  if (t === '') return false;

  const n = Number(t);
  return Number.isFinite(n) && Number.isInteger(n) && n >= min;
}

/* ────────────────────────────────────────────────────────────
   고민 폼
   ──────────────────────────────────────────────────────────── */

export function validateDecisionForm(
  v: DecisionFormValues,
): Errors<DecisionFormValues> {
  const e: Errors<DecisionFormValues> = {};
  const title = v.title.trim();

  if (title.length < 2) e.title = '제목을 2자 이상 입력해 주세요.';
  else if (title.length > 60) e.title = '제목은 60자 이내로 입력해 주세요.';

  // 폼 타입이 CategoryId | '' 라서 이 검사가 실제로 의미를 갖는다.
  // 도메인 타입(CategoryId)으로 뒀다면 '' 가 될 수 없어 죽은 코드가 된다.
  if (v.category === '') e.category = '카테고리를 선택해 주세요.';

  const tags = v.tags.map((t) => t.trim()).filter((t) => t !== '');
  if (tags.length < 1) e.tags = '태그를 1개 이상 입력해 주세요.';
  else if (tags.length > 3) e.tags = '태그는 최대 3개까지 입력할 수 있습니다.';
  else if (new Set(tags).size !== tags.length) e.tags = '중복된 태그가 있습니다.';
  else if (tags.some((tag) => tag.length > 12)) {
    e.tags = '태그는 하나당 12자 이내로 입력해 주세요.';
  }

  const purpose = v.purpose.trim();
  if (purpose === '') {
    e.purpose = '구매 목적이나 중요 조건을 입력해 주세요.';
  } else if (purpose.length > 200) {
    e.purpose = '200자 이내로 입력해 주세요.';
  }

  if (v.budget.trim() !== '' && !isPositiveInt(v.budget, 0)) {
    e.budget = '예산은 0원 이상의 정수로 입력해 주세요.';
  }

  return e;
}

/* ────────────────────────────────────────────────────────────
   후보 폼
   ──────────────────────────────────────────────────────────── */

export function validateCandidateForm(
  v: CandidateFormValues,
): Errors<CandidateFormValues> {
  const e: Errors<CandidateFormValues> = {};

  const name = v.name.trim();
  if (name === '') e.name = '상품명을 입력해 주세요.';
  else if (name.length > 50) e.name = '상품명은 50자 이내로 입력해 주세요.';

  if (!isPositiveInt(v.comparePrice, 1)) {
    e.comparePrice = '비교 가격을 1원 이상 입력해 주세요.';
  }

  // 선택 문자열의 길이도 실제로 검사한다.
  // 표에만 적어두면 코드와 어긋난다.
  if (v.brand.trim().length > 30) {
    e.brand = '브랜드는 30자 이내로 입력해 주세요.';
  }
  if (v.option.trim().length > 60) {
    e.option = '옵션·모델은 60자 이내로 입력해 주세요.';
  }
  if (v.seller.trim().length > 40) {
    e.seller = '구매처는 40자 이내로 입력해 주세요.';
  }
  if (v.shippingNote.trim().length > 80) {
    e.shippingNote = '배송 조건 메모는 80자 이내로 입력해 주세요.';
  }
  if (v.memo.trim().length > 200) {
    e.memo = '후보 메모는 200자 이내로 입력해 주세요.';
  }

  // 구성량을 입력했으면 단위가 필수다 (규칙 C-3)
  const amount = v.amountValue.trim();
  if (amount !== '') {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      e.amountValue = '구성량은 0보다 커야 합니다.';
    }
    if (v.amountUnit === '') {
      e.amountUnit = '단위를 선택해 주세요.';
    }
  }

  // 개수와 길이를 else if로 잇는다.
  // 한 필드에는 메시지가 하나만 붙으므로, 따로 쓰면 나중 것이 앞을 덮는다.
  // 항목이 4개인데 "항목당 30자"를 안내하면 뭘 먼저 고칠지 알 수 없다.
  const pros = normalizedList(v.pros);
  if (pros.length > 3) {
    e.pros = '기대되는 점은 최대 3개까지 입력할 수 있습니다.';
  } else if (pros.some((item) => item.length > 30)) {
    e.pros = '기대되는 점은 항목당 30자 이내로 입력해 주세요.';
  }

  const cons = normalizedList(v.cons);
  if (cons.length > 3) {
    e.cons = '걱정되는 점은 최대 3개까지 입력할 수 있습니다.';
  } else if (cons.some((item) => item.length > 30)) {
    e.cons = '걱정되는 점은 항목당 30자 이내로 입력해 주세요.';
  }

  if (!isValidUrl(v.link)) e.link = '올바른 주소 형식이 아닙니다.';

  return e;
}

function normalizedList(items: string[]): string[] {
  return items.map((i) => i.trim()).filter(Boolean);
}

/* ────────────────────────────────────────────────────────────
   후보 개수 (규칙 D-3)
   ──────────────────────────────────────────────────────────── */

/**
 * 후보는 폼 값이 아니라 이미 도메인 객체다.
 * 그래서 Errors<T>에 담지 않고 문자열 하나로 돌려준다.
 */
export function validateCandidateCount(
  candidates: Candidate[],
): string | undefined {
  if (candidates.length < 1) return '후보를 1개 이상 등록해 주세요.';
  if (candidates.length > 4) return '후보는 최대 4개까지 등록할 수 있습니다.';
  return undefined;
}

/* ────────────────────────────────────────────────────────────
   오류 필드 찾기
   ──────────────────────────────────────────────────────────── */

/**
 * 포커스를 옮길 순서는 **화면에 보이는 순서**여야 한다.
 *
 * 오류 객체를 그냥 순회하면 키 순서에 의존하게 되고,
 * 나중에 타입의 필드 순서를 바꾸면 조용히 어긋난다. 상수로 고정한다.
 *
 * `satisfies`는 "이 배열이 keyof T의 목록이 맞는지" 검사만 하고
 * 타입을 넓히지는 않는다. 오타를 쓰면 컴파일 에러가 난다.
 */
export const DECISION_FIELD_ORDER = [
  'title',
  'category',
  'tags',
  'purpose',
  'budget',
] as const satisfies readonly (keyof DecisionFormValues)[];

export const CANDIDATE_FIELD_ORDER = [
  'name',
  'comparePrice',
  'brand',
  'option',
  'familiarity',
  'amountValue',
  'amountUnit',
  'seller',
  'link',
  'shippingNote',
  'pros',
  'cons',
  'memo',
] as const satisfies readonly (keyof CandidateFormValues)[];

/** 오류가 있는 첫 필드의 이름. 없으면 undefined. */
export function firstErrorField<T>(
  errors: Errors<T>,
  order: readonly (keyof T)[],
): keyof T | undefined {
  return order.find((key) => errors[key] !== undefined);
}
