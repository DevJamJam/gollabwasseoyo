/**
 * 폼 값 → 도메인 입력.
 *
 * 검증을 통과한 직후에만 부른다. 호출 지점을 폼 제출 핸들러 한 곳으로 제한한다.
 *
 * 아래에 타입 단언(`as`)이 몇 개 있다. `form.category`의 타입은
 * `CategoryId | ''`인데 여기서는 `''`가 아님이 보장된다 — 검증이 막았으니까.
 * 이 보장을 타입으로 표현하려면 `ValidatedDecisionForm` 같은 브랜디드 타입을
 * 하나 더 만들어야 하는데, 7일 프로젝트에는 과한 장치다.
 *
 * 대신 검증 직후에만 호출한다는 규칙을 지키고, 그 사실을 여기 적어둔다.
 * 의식적으로 선택한 타협이다.
 */

import {
  normalizeTags,
  normalizeTextList,
  optionalAmount,
  optionalInt,
  optionalText,
  requiredInt,
  requiredText,
} from './normalize';
import type {
  Candidate,
  CandidateFormValues,
  CategoryId,
  Decision,
  DecisionCreateInput,
  DecisionFormValues,
  OrderInput,
  PurchaseFormValues,
  PurchasedItemFormValues,
  Rating,
  Repurchase,
  Review,
  ReviewFormValues,
  ReviewInput,
} from './types';

export function toDecisionInput(
  form: DecisionFormValues,
  candidates: Candidate[],
): DecisionCreateInput {
  return {
    title: requiredText(form.title),
    category: form.category as CategoryId, // 검증 통과 후이므로 '' 아님
    tags: normalizeTags(form.tags),
    purpose: requiredText(form.purpose),
    budget: optionalInt(form.budget),
    candidates,
  };
}

export function toCandidate(
  form: CandidateFormValues,
  id: string,
): Candidate {
  return {
    id,
    name: requiredText(form.name),
    comparePrice: requiredInt(form.comparePrice),
    brand: optionalText(form.brand),
    option: optionalText(form.option),
    familiarity: form.familiarity === '' ? undefined : form.familiarity,
    amount: optionalAmount(form.amountValue, form.amountUnit),
    seller: optionalText(form.seller),
    link: optionalText(form.link),
    shippingNote: optionalText(form.shippingNote),
    pros: normalizeTextList(form.pros),
    cons: normalizeTextList(form.cons),
    memo: optionalText(form.memo),
  };
}

/**
 * 구매 폼 → 주문 입력.
 *
 * 체크된 항목만 저장한다. 체크 해제된 행의 입력값은 폼 배열에 그대로
 * 남아 있지만 여기서 걸러진다. 그래서 체크를 껐다 켜도 값이 살아 있다.
 */
export function toOrderInput(form: PurchaseFormValues): OrderInput {
  return {
    purchasedAt: form.purchasedAt,
    totalPaid: requiredInt(form.totalPaid),
    seller: optionalText(form.seller),
    reason: requiredText(form.reason),
    items: form.items
      .filter((it) => it.selected)
      .map((it) => ({
        candidateId: it.candidateId,
        unitPrice: requiredInt(it.unitPrice),
        quantity: requiredInt(it.quantity),
        amount: optionalAmount(it.amountValue, it.amountUnit),
      })),
  };
}

/**
 * 평가 폼 → 평가 입력.
 *
 * `as`가 두 개 있다. rating은 `Rating | null`, repurchase는 `Repurchase | ''`인데
 * 검증이 둘 다 막았으므로 여기서는 값이 있다. 파일 상단의 타협과 같은 이유다.
 *
 * oneLine을 반드시 trim한다. checkReviewInvariants가
 * `input.oneLine !== oneLine`이면 거부하기 때문이다 — 앞뒤 공백이 붙은 채로
 * 오면 저장이 조용히 실패한다.
 */
export function toReviewInput(form: ReviewFormValues): ReviewInput {
  return {
    rating: form.rating as Rating, // 검증 통과 후이므로 null 아님
    repurchase: form.repurchase as Repurchase, // 검증 통과 후이므로 '' 아님
    oneLine: requiredText(form.oneLine),
    goods: normalizeTextList(form.goods),
    bads: normalizeTextList(form.bads),
    nextChange: optionalText(form.nextChange),
  };
}

/* ────────────────────────────────────────────────────────────
   도메인 → 폼 (수정 화면용 역변환)

   규칙은 하나다.
     undefined → ''    숫자 → String()    배열 → 새 배열

   빠뜨리면 input의 value에 undefined가 들어가 React가 경고를 낸다.
   "제어 컴포넌트가 비제어로 바뀌었다"는 그 경고다.
   ──────────────────────────────────────────────────────────── */

export function toDecisionForm(d: Decision): DecisionFormValues {
  return {
    title: d.title,
    category: d.category,
    tags: [...d.tags],
    purpose: d.purpose,
    budget: d.budget === undefined ? '' : String(d.budget),
  };
}

/**
 * 구매 폼의 초기값.
 *
 * 체크된 것만 만들면 체크를 켜는 순간 행을 새로 끼워 넣어야 하고,
 * 껐다 켜면 입력값이 사라진다. 전부 만들어 두고 selected로 제어하면
 * 그 문제가 애초에 없다.
 *
 * 구성량은 후보의 값을 가져온다. 같은 상품이니 대개 그대로다.
 * 개수는 1로 둔다.
 *
 * 단가는 비워둔다. 비교 가격을 넣어두고 싶은 유혹이 있지만,
 * 비교 가격은 '살펴볼 때 본 값'이고 단가는 '실제로 낸 값'이다.
 * 미리 채워두면 쿠폰이나 할인으로 다르게 산 경우에도 그대로 저장되기 쉽고,
 * 그러면 기대와 실제를 비교한다는 이 앱의 목적이 무너진다.
 *
 * today를 인자로 받는 이유는 이 함수를 순수하게 두기 위해서다.
 * 안에서 new Date()를 부르면 테스트가 오늘 날짜에 따라 달라진다.
 */
export function toPurchaseForm(d: Decision, today: string): PurchaseFormValues {
  const purchased = new Map(
    (d.order?.items ?? []).map((it) => [it.candidateId, it]),
  );

  const items: PurchasedItemFormValues[] = d.candidates.map((c) => {
    const item = purchased.get(c.id);

    if (item) {
      return {
        candidateId: c.id,
        selected: true,
        unitPrice: String(item.unitPrice),
        quantity: String(item.quantity),
        amountValue: item.amount ? String(item.amount.value) : '',
        amountUnit: item.amount ? item.amount.unit : '',
      };
    }

    return {
      candidateId: c.id,
      selected: false,
      unitPrice: '',
      quantity: '1',
      amountValue: c.amount ? String(c.amount.value) : '',
      amountUnit: c.amount ? c.amount.unit : '',
    };
  });

  return {
    purchasedAt: d.order ? d.order.purchasedAt : today,
    totalPaid: d.order ? String(d.order.totalPaid) : '',
    seller: d.order?.seller ?? '',
    reason: d.order?.reason ?? '',
    items,
  };
}

/**
 * 저장된 평가 → 수정 폼.
 *
 * `updatedAt`은 되돌리지 않는다. 폼에 없는 값이고, 다시 저장할 때
 * Provider가 새로 찍는다. 사용자가 만질 수 있는 것만 폼에 담는다.
 */
export function toReviewForm(r: Review): ReviewFormValues {
  return {
    rating: r.rating,
    repurchase: r.repurchase,
    oneLine: r.oneLine,
    goods: [...r.goods],
    bads: [...r.bads],
    nextChange: r.nextChange ?? '',
  };
}

export function toCandidateForm(c: Candidate): CandidateFormValues {
  return {
    name: c.name,
    comparePrice: String(c.comparePrice),
    brand: c.brand ?? '',
    option: c.option ?? '',
    familiarity: c.familiarity ?? '',
    amountValue: c.amount ? String(c.amount.value) : '',
    amountUnit: c.amount ? c.amount.unit : '',
    seller: c.seller ?? '',
    link: c.link ?? '',
    shippingNote: c.shippingNote ?? '',
    pros: [...c.pros],
    cons: [...c.cons],
    memo: c.memo ?? '',
  };
}
