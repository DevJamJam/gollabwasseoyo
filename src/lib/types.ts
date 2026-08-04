/**
 * 골라봤어요 — 타입 정의
 *
 * 이 파일은 세 층의 타입을 담는다. 층을 섞지 않는 것이 이 프로젝트의 핵심 결정이다.
 *
 *   1. 도메인 타입 — 실제로 저장되는 데이터. '미선택' 상태가 존재하지 않는다.
 *   2. 입력 타입   — 검증·파싱을 마치고 Provider 액션에 넘기는 값.
 *                    id·createdAt·order가 없다는 것이 곧 안전장치다.
 *   3. 폼 타입     — 화면이 들고 있는 값. 미선택은 '', 숫자는 문자열이다.
 *
 * 이 파일에는 함수를 두지 않는다. 타입과 상수만 둔다.
 */

/* ────────────────────────────────────────────────────────────
   공통 리터럴 유니온
   ──────────────────────────────────────────────────────────── */

/**
 * 상위 카테고리 7개 (규칙 D-1). 고정 목록이다.
 *
 * `as const`가 없으면 이 배열의 타입은 `{ id: string; label: string }[]`이 되어
 * 아래 CategoryId가 그냥 `string`이 된다. `as const`를 붙이면 각 id가
 * 'food' | 'beauty' | ... 라는 리터럴 타입으로 좁혀지고,
 * 오타가 컴파일 에러로 잡힌다.
 */
export const CATEGORIES = [
  { id: 'food', label: '식품·음료' },
  { id: 'beauty', label: '뷰티·생활' },
  { id: 'fashion', label: '패션·잡화' },
  { id: 'digital', label: '디지털·가전' },
  { id: 'hobby', label: '취미·운동' },
  { id: 'pet', label: '반려동물' },
  { id: 'etc', label: '기타' },
] as const;

/** 'food' | 'beauty' | 'fashion' | 'digital' | 'hobby' | 'pet' | 'etc' */
export type CategoryId = (typeof CATEGORIES)[number]['id'];

/** 구성량 단위. 'ea'는 '개'를 뜻한다. */
export const UNITS = ['g', 'kg', 'ml', 'L', 'ea'] as const;
export type Unit = (typeof UNITS)[number];

/** 사용 경험 — 처음 보는 상품 / 사용해본 상품 */
export type Familiarity = 'new' | 'used';

/** 재구매 의사 — 있음 / 고민 / 없음 */
export type Repurchase = 'yes' | 'maybe' | 'no';

/** 별점. 1~5 정수만 허용한다. number로 두면 0이나 6이 들어온다. */
export type Rating = 1 | 2 | 3 | 4 | 5;

/**
 * 고민의 상태 (규칙 S-1).
 *
 * 이 타입은 '계산 결과'를 담기 위한 것이다.
 * Decision에 status 필드를 만들지 않는다 — getStatus()가 매번 계산한다.
 */
export type DecisionStatus = 'considering' | 'purchased' | 'reviewed';

/** 구성량. value가 있으면 unit은 반드시 존재한다 (규칙 C-3). */
export interface Amount {
  value: number;
  unit: Unit;
}

/* ────────────────────────────────────────────────────────────
   도메인 타입 — 저장되는 형태
   ──────────────────────────────────────────────────────────── */

export interface Candidate {
  id: string;
  name: string; // 필수
  comparePrice: number; // 필수, 1 이상 정수
  brand?: string;
  option?: string;
  familiarity?: Familiarity;
  amount?: Amount; // 없으면 단위 가격을 계산할 수 없다
  seller?: string;
  link?: string;
  shippingNote?: string;
  pros: string[]; // 최대 3개, 항목당 30자
  cons: string[]; // 최대 3개, 항목당 30자
  memo?: string;
}

export interface Review {
  rating: Rating;
  repurchase: Repurchase;
  oneLine: string;
  goods: string[]; // 최대 3개, 항목당 30자
  bads: string[]; // 최대 3개, 항목당 30자
  nextChange?: string;
  updatedAt: string; // ISO
}

/**
 * 구매한 상품 한 건.
 *
 * 별도 id를 두지 않는다. 규칙 P-2에 따라 한 주문에 같은 후보가 두 번 들어올 수
 * 없으므로 candidateId가 이미 주문 안에서 유일하다. 쓰이지 않는 식별자는 만들지 않는다.
 *
 * review를 여기에 중첩한 것도 의도적이다. 별도 컬렉션으로 두면
 * "구매 취소 시 평가도 삭제"(규칙 E-4)를 매번 손으로 챙겨야 하고 고아 데이터가 생긴다.
 * 중첩하면 order = null 한 줄로 규칙이 자동 충족된다.
 */
export interface PurchasedItem {
  candidateId: string;
  unitPrice: number; // 실제 단가
  quantity: number; // 1 이상 정수
  amount?: Amount; // 실제 구성량
  review: Review | null;
}

export interface Order {
  purchasedAt: string; // 'YYYY-MM-DD'
  totalPaid: number; // 최종 결제금액
  seller?: string;
  reason: string; // 필수
  items: PurchasedItem[]; // 1개 이상, candidateId 중복 불가
}

export interface Decision {
  id: string;
  title: string;
  category: CategoryId;
  tags: string[]; // 1~3개, 각 12자
  purpose: string;
  budget?: number;
  candidates: Candidate[]; // 1~4개
  order: Order | null; // null이면 '고민 중'
  createdAt: string; // ISO
  updatedAt: string; // ISO, 목록 정렬 기준
}

/** localStorage에 저장되는 최상위 형태. */
export interface StoreSchema {
  version: 1;
  decisions: Decision[];
}

/* ────────────────────────────────────────────────────────────
   입력 타입 — Provider 액션 경계
   ──────────────────────────────────────────────────────────── */

/** 새 고민 생성. id·createdAt·updatedAt·order는 Provider가 만든다. */
export interface DecisionCreateInput {
  title: string;
  category: CategoryId;
  tags: string[];
  purpose: string;
  budget?: number;
  candidates: Candidate[];
}

/**
 * 고민 수정. 형태는 CreateInput과 같지만 의미가 달라 별칭을 쓰지 않고 따로 둔다.
 *
 * 이 타입에 order / review / id / createdAt이 없다는 것이 곧 안전장치다.
 * Partial<Decision>을 쓰면 수정 폼이 평가까지 덮어쓸 수 있고,
 * 그 실수를 컴파일러가 잡아주지 못한다.
 */
export interface DecisionEditInput {
  title: string;
  category: CategoryId;
  tags: string[];
  purpose: string;
  budget?: number;
  candidates: Candidate[];
}

/** 구매 등록·수정. review는 Provider가 기존 값에서 보존하거나 null로 시작한다. */
export type PurchasedItemInput = Omit<PurchasedItem, 'review'>;

export interface OrderInput {
  purchasedAt: string;
  totalPaid: number;
  seller?: string;
  reason: string;
  items: PurchasedItemInput[];
}

/** 평가 등록·수정. updatedAt은 Provider가 채운다. */
export type ReviewInput = Omit<Review, 'updatedAt'>;

/* ────────────────────────────────────────────────────────────
   폼 타입 — 화면 상태
   ──────────────────────────────────────────────────────────── */

/**
 * <input>의 값은 항상 문자열이고 라디오는 미선택 상태를 가진다.
 * 도메인 타입으로 폼을 표현하면 ''와 NaN이 도메인에 스며든다.
 * 그래서 폼은 문자열 중심으로 두고, 경계에서 한 번만 파싱한다.
 */
export interface DecisionFormValues {
  title: string;
  category: CategoryId | ''; // '' = 미선택
  tags: string[];
  purpose: string;
  budget: string; // '' 허용
}

export interface CandidateFormValues {
  name: string;
  comparePrice: string;
  brand: string;
  option: string;
  familiarity: Familiarity | '';
  amountValue: string;
  amountUnit: Unit | '';
  seller: string;
  link: string;
  shippingNote: string;
  pros: string[];
  cons: string[];
  memo: string;
}

/**
 * 구매 폼의 상품 행.
 *
 * 후보 '전체'에 대해 이 객체를 만들고 selected로 제어한다.
 * 체크를 해제해도 입력값이 배열에 남아 있어 다시 체크하면 복원되고,
 * 저장 시점에는 selected === true인 항목만 도메인 타입으로 변환한다.
 */
export interface PurchasedItemFormValues {
  candidateId: string;
  selected: boolean;
  unitPrice: string;
  quantity: string;
  amountValue: string;
  amountUnit: Unit | '';
}

export interface PurchaseFormValues {
  purchasedAt: string;
  totalPaid: string;
  seller: string;
  reason: string;
  items: PurchasedItemFormValues[]; // 후보 전체, selected로 제어
}

export interface ReviewFormValues {
  rating: Rating | null;
  repurchase: Repurchase | '';
  oneLine: string;
  goods: string[];
  bads: string[];
  nextChange: string;
}

/* ────────────────────────────────────────────────────────────
   초기 폼 값
   ──────────────────────────────────────────────────────────── */

export const EMPTY_DECISION_FORM: DecisionFormValues = {
  title: '',
  category: '',
  tags: [],
  purpose: '',
  budget: '',
};

export const EMPTY_CANDIDATE_FORM: CandidateFormValues = {
  name: '',
  comparePrice: '',
  brand: '',
  option: '',
  familiarity: '',
  amountValue: '',
  amountUnit: '',
  seller: '',
  link: '',
  shippingNote: '',
  pros: [],
  cons: [],
  memo: '',
};

export const EMPTY_REVIEW_FORM: ReviewFormValues = {
  rating: null,
  repurchase: '',
  oneLine: '',
  goods: [],
  bads: [],
  nextChange: '',
};

/* ────────────────────────────────────────────────────────────
   액션 결과
   ──────────────────────────────────────────────────────────── */

/**
 * 모든 Provider 액션이 돌려주는 값.
 *
 * 판별 유니온이라 ok를 확인하면 나머지 필드가 좁혀진다.
 * 호출한 쪽은 ok === true일 때만 화면을 옮기거나 모달을 닫는다.
 * 이 반환값을 무시하는 호출이 하나라도 있으면 '저장 성공 후에만 화면 변경'이
 * 그 지점에서 무효가 된다.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not_found' | 'invalid' | 'quota' | 'unavailable' };

/**
 * commit()의 반환값. 저장 단계에서만 나올 수 있는 실패라
 * not_found와 invalid가 없다.
 */
export type CommitResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' };

/** 사용자에게 보여줄 저장소 상태 안내. */
export type StorageNoticeKind = 'corrupted' | 'unavailable' | 'quota';

/* ────────────────────────────────────────────────────────────
   필터
   ──────────────────────────────────────────────────────────── */

/**
 * 홈의 적용된 필터. 단일 진실 공급원은 URL이다.
 *
 * 이 타입을 types.ts에 두는 이유: derive.ts의 filterDecisions()와
 * urlFilters.ts의 toFilters()가 모두 이 타입을 쓴다.
 * 어느 한쪽 파일에 정의하면 두 파일이 서로를 import하는 순환 참조가 생긴다.
 */
export interface Filters {
  q?: string;
  status?: DecisionStatus;
  category?: CategoryId;
  tag?: string;
}
