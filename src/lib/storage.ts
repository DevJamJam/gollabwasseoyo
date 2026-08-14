/**
 * localStorage 접근 유일 지점.
 *
 * 이 파일을 import하는 곳은 DecisionsProvider와 테스트뿐이다.
 * 컴포넌트는 'localStorage'라는 단어를 모른다.
 * 이 규칙이 깨지면 나중에 서버로 옮길 때 비용이 다시 커진다.
 *
 * 검증이 약속하는 범위:
 *   검사한다     — JSON 문법 · 스키마 버전 · 화면이 즉시 쓰는 필수 필드 ·
 *                  선택 문자열의 타입 · 후보와 주문의 참조 관계
 *   검사하지 않는다 — 개발자 도구로 임의 변조한 모든 의미적 오류.
 *                  updatedAt이 createdAt보다 앞서거나 태그가 공백뿐인 경우는 통과한다.
 *                  화면이 깨지지 않기 때문이다.
 *
 * 목표는 '화면을 즉시 깨뜨릴 수 있는 값을 corrupted로 걸러내는 것'이지
 * 데이터 정확성을 보장하는 것이 아니다. Zod나 전체 재귀 검증은 도입하지 않는다.
 */

import { CATEGORIES, UNITS } from './types';
import type {
  Amount,
  Candidate,
  Decision,
  Familiarity,
  Order,
  Repurchase,
  Review,
  StoreSchema,
  Unit,
} from './types';

const STORAGE_KEY = 'gollab:v1'; // 키에 버전을 포함한다
const SCHEMA_VERSION = 1 as const;

const EMPTY: StoreSchema = { version: SCHEMA_VERSION, decisions: [] };

/**
 * 판별 유니온. ok를 확인하면 TypeScript가 나머지 필드를 좁혀준다.
 * 실패해도 data에 빈 스키마를 담아 돌려주므로, 호출 측은 항상 data를 쓸 수 있고
 * ok를 보고 배너만 띄우면 된다.
 */
export type LoadResult =
  | { ok: true; data: StoreSchema }
  | { ok: false; data: StoreSchema; reason: 'unavailable' | 'corrupted' };

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' };

/* ────────────────────────────────────────────────────────────
   타입 가드 — any를 쓰지 않고 unknown을 좁힌다
   ──────────────────────────────────────────────────────────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** 선택 문자열: 없거나 문자열이어야 한다. {} 나 숫자는 화면에서 즉시 깨진다. */
function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isCategoryIdValue(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    CATEGORIES.some((category) => category.id === value)
  );
}

function isUnitValue(value: unknown): value is Unit {
  return typeof value === 'string' && UNITS.includes(value as Unit);
}

function isFamiliarityValue(value: unknown): value is Familiarity {
  return value === 'new' || value === 'used';
}

function isRepurchaseValue(value: unknown): value is Repurchase {
  return value === 'yes' || value === 'maybe' || value === 'no';
}

function isAmountShape(value: unknown): value is Amount {
  return (
    isRecord(value) &&
    typeof value.value === 'number' &&
    Number.isFinite(value.value) &&
    value.value > 0 &&
    isUnitValue(value.unit)
  );
}

function isCandidateShape(value: unknown): value is Candidate {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.comparePrice === 'number' &&
    Number.isFinite(value.comparePrice) &&
    value.comparePrice >= 1 &&
    (value.familiarity === undefined ||
      isFamiliarityValue(value.familiarity)) &&
    isStringArray(value.pros) &&
    isStringArray(value.cons) &&
    (value.amount === undefined || isAmountShape(value.amount)) &&
    // 선택 문자열도 타입을 확인한다. {} 가 들어오면 화면 렌더에서 터진다.
    isOptionalString(value.brand) &&
    isOptionalString(value.option) &&
    isOptionalString(value.seller) &&
    isOptionalString(value.link) &&
    isOptionalString(value.shippingNote) &&
    isOptionalString(value.memo)
  );
  // 주의: pros·cons의 '개수'는 여기서 검사하지 않는다.
  // 4개짜리 목록은 화면을 깨뜨리지 않으므로 corrupted로 버리면
  // 사용자 기록 전체를 잃는다. 폼 검증과 Provider 불변식이 잡는다.
}

function isReviewShape(value: unknown): value is Review {
  return (
    isRecord(value) &&
    typeof value.rating === 'number' &&
    Number.isInteger(value.rating) &&
    value.rating >= 1 &&
    value.rating <= 5 &&
    isRepurchaseValue(value.repurchase) &&
    typeof value.oneLine === 'string' &&
    isStringArray(value.goods) &&
    isStringArray(value.bads) &&
    isOptionalString(value.nextChange) &&
    typeof value.updatedAt === 'string'
  );
}

function isOrderShape(value: unknown): value is Order {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length < 1) {
    return false;
  }

  return (
    typeof value.purchasedAt === 'string' &&
    typeof value.totalPaid === 'number' &&
    Number.isFinite(value.totalPaid) &&
    value.totalPaid >= 0 &&
    isOptionalString(value.seller) &&
    typeof value.reason === 'string' &&
    value.items.every(
      (item: unknown) =>
        isRecord(item) &&
        typeof item.candidateId === 'string' &&
        typeof item.unitPrice === 'number' &&
        Number.isFinite(item.unitPrice) &&
        item.unitPrice >= 0 &&
        typeof item.quantity === 'number' &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        (item.amount === undefined || isAmountShape(item.amount)) &&
        (item.review === null || isReviewShape(item.review)),
    )
  );
}

function isDecisionShape(value: unknown): value is Decision {
  // isRecord를 먼저 통과시켜 value를 좁혀둔다.
  //
  // isRecord를 아래 긴 && 식 안에 넣어도 컴파일은 된다.
  // TypeScript 4.4+가 '별칭 조건 흐름 분석'을 하기 때문이다 —
  // 좁히기 조건을 const에 담아두면 나중에 그 const를 검사할 때 좁힘이 유지된다.
  //
  // 여기서 굳이 떼어낸 것은 타입 때문이 아니라 읽기 위해서다.
  // ①형태 검사와 ②참조 검사의 경계가 눈에 보인다.
  if (!isRecord(value)) return false;

  // ① 개별 필드와 중첩 형태
  const shapeOk =
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    isCategoryIdValue(value.category) &&
    isStringArray(value.tags) &&
    value.tags.length >= 1 &&
    value.tags.length <= 3 &&
    typeof value.purpose === 'string' &&
    (value.budget === undefined ||
      (typeof value.budget === 'number' && Number.isFinite(value.budget))) &&
    Array.isArray(value.candidates) &&
    value.candidates.length >= 1 &&
    value.candidates.length <= 4 &&
    value.candidates.every(isCandidateShape) &&
    (value.order === null || isOrderShape(value.order)) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string';

  if (!shapeOk) return false;

  // ② 형태가 맞은 뒤에만 후보와 주문의 참조 관계를 확인한다
  const candidates = value.candidates as Candidate[];
  const candidateIds = candidates.map((candidate) => candidate.id);

  // 후보 id가 중복이면 React key와 구매 참조가 모두 깨진다
  if (new Set(candidateIds).size !== candidateIds.length) return false;

  if (value.order !== null) {
    const order = value.order as Order;
    const orderCandidateIds = order.items.map((item) => item.candidateId);

    // 한 주문에 같은 후보가 두 번 (규칙 P-2 위반)
    if (new Set(orderCandidateIds).size !== orderCandidateIds.length) {
      return false;
    }

    // 존재하지 않는 후보를 가리키는 구매 항목
    const candidateIdSet = new Set(candidateIds);
    if (orderCandidateIds.some((id) => !candidateIdSet.has(id))) {
      return false;
    }
  }

  return true;
}

/** 화면이 즉시 접근하는 최소 중첩 형태까지 확인한다. */
function isStoreSchema(value: unknown): value is StoreSchema {
  if (!isRecord(value)) return false;
  if (value.version !== SCHEMA_VERSION) return false;

  if (!Array.isArray(value.decisions) || !value.decisions.every(isDecisionShape)) {
    return false;
  }

  const decisions = value.decisions as Decision[];
  const decisionIds = decisions.map((decision) => decision.id);

  // 같은 상세 URL과 액션 대상을 가리키는 Decision id는 Store 전체에서 유일해야 한다
  return new Set(decisionIds).size === decisionIds.length;
}

/* ────────────────────────────────────────────────────────────
   공개 API — load / save 두 개뿐
   ──────────────────────────────────────────────────────────── */

export function load(): LoadResult {
  // 서버에서 렌더될 때는 window가 없다. 이 가드는 storage.ts 안에만 존재하고
  // 컴포넌트에는 나타나지 않는다.
  if (typeof window === 'undefined') {
    return { ok: false, data: EMPTY, reason: 'unavailable' };
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // 사생활 보호 모드나 저장소 차단 설정에서는 접근 자체가 던진다
    return { ok: false, data: EMPTY, reason: 'unavailable' };
  }

  if (raw === null) return { ok: true, data: EMPTY }; // 첫 방문

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoreSchema(parsed)) {
      return { ok: false, data: EMPTY, reason: 'corrupted' };
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, data: EMPTY, reason: 'corrupted' };
  }
}

export function save(data: StoreSchema): SaveResult {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unavailable' };
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (error) {
    // DOMException.name은 브라우저마다 다르다.
    // Chromium/WebKit은 QuotaExceededError, Firefox는 NS_ERROR_DOM_QUOTA_REACHED.
    // 판별에 실패하면 unavailable로 떨어지지만, 어느 쪽이든 '저장 실패'라는
    // 결과는 같으므로 데이터는 안전하다.
    const isQuota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

    return { ok: false, reason: isQuota ? 'quota' : 'unavailable' };
  }
}
