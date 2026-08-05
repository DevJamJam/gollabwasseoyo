/**
 * 폼 값 → 도메인 입력.
 *
 * ⚠️ **검증을 통과한 직후에만** 부른다. 호출 지점을 폼 제출 핸들러 한 곳으로 제한한다.
 *
 * 아래에 타입 단언(`as`)이 몇 개 있다. `form.category`의 타입은
 * `CategoryId | ''`인데 여기서는 `''`가 아님이 보장된다 — 검증이 막았으니까.
 * 이 보장을 타입으로 표현하려면 `ValidatedDecisionForm` 같은 브랜디드 타입을
 * 하나 더 만들어야 하는데, 7일 프로젝트에는 과한 장치다.
 *
 * 대신 **검증 직후에만 호출한다는 규칙**을 지키고, 그 사실을 여기 적어둔다.
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
  DecisionCreateInput,
  DecisionFormValues,
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

/** 도메인 → 폼. 수정 화면에서 저장된 값을 입력칸에 되돌릴 때 쓴다. */
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
