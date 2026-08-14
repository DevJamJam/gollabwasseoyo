'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, fieldId, fullInputClass } from '@/components/ui/Field';
import { ListInput } from '@/components/ui/ListInput';
import { RatingInput } from '@/components/ui/RatingInput';
import { REPURCHASE_LABEL } from '@/lib/format';
import { toReviewForm, toReviewInput } from '@/lib/parse';
import type {
  Decision,
  Repurchase,
  Review,
  ReviewFormValues,
} from '@/lib/types';
import { EMPTY_REVIEW_FORM } from '@/lib/types';
import type { Errors } from '@/lib/validation';
import {
  REVIEW_FIELD_ORDER,
  firstErrorField,
  hasError,
  validateReviewForm,
} from '@/lib/validation';
import { useDecisions } from '@/store/useDecisions';

/**
 * 상품 하나에 대한 평가 폼.
 *
 * 한 번에 원두 두 봉지를 샀어도 하나는 좋고 하나는 별로일 수 있다.
 * 주문 단위로 별점을 하나만 받으면 그 차이가 사라진다.
 * 그리고 다음에 같은 상품을 다시 고민할 때 꺼내볼 것은
 * "그때 그 주문"이 아니라 "그때 그 상품"이다.
 *
 * 상세 화면 안의 패널이다. 모달로 덮으면 위쪽 후보 카드의 기대와
 * 지금 쓰는 실제 평가를 나란히 놓고 볼 수 없다.
 */

interface Props {
  decision: Decision;
  candidateId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const REPURCHASE_OPTIONS: readonly Repurchase[] = ['yes', 'maybe', 'no'];

function messageFor(reason: 'not_found' | 'invalid' | 'quota' | 'unavailable'): string {
  switch (reason) {
    case 'not_found':
      return '평가를 남길 상품을 찾을 수 없습니다.';
    case 'quota':
      return '저장 공간이 부족해 저장하지 못했습니다. 기록을 정리한 뒤 다시 시도해 주세요.';
    case 'unavailable':
      return '이 브라우저에서는 기록을 저장할 수 없습니다.';
    case 'invalid':
      return '저장할 수 없는 상태입니다. 입력값을 다시 확인해 주세요.';
  }
}

export function ReviewPanel({
  decision,
  candidateId,
  onSaved,
  onCancel,
}: Props) {
  const { setReview } = useDecisions();

  const item = decision.order?.items.find(
    (it) => it.candidateId === candidateId,
  );
  const existing: Review | null = item?.review ?? null;

  const [form, setForm] = useState<ReviewFormValues>(() =>
    existing ? toReviewForm(existing) : EMPTY_REVIEW_FORM,
  );
  const [errors, setErrors] = useState<Errors<ReviewFormValues>>({});
  const [submitError, setSubmitError] = useState<string>();

  // 주문에 없는 상품이면 그릴 것이 없다. 부모가 목록에서 골라 넘기므로
  // 정상 경로에서는 일어나지 않지만, 그리다 말고 터지는 것보다 낫다.
  if (!item) return null;

  const candidateName =
    decision.candidates.find((c) => c.id === candidateId)?.name ??
    '(삭제된 후보)';

  function setField<K extends keyof ReviewFormValues>(
    key: K,
    value: ReviewFormValues[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitError(undefined);

    const nextErrors = validateReviewForm(form);
    setErrors(nextErrors);

    if (hasError(nextErrors)) {
      const target = firstErrorField(nextErrors, REVIEW_FIELD_ORDER);
      if (target) document.getElementById(fieldId(target))?.focus();
      return;
    }

    const result = setReview(decision.id, candidateId, toReviewInput(form));

    if (!result.ok) {
      setSubmitError(messageFor(result.reason));
      return;
    }

    onSaved();
  }

  return (
    <section
      aria-labelledby="review-panel-title"
      className="rounded-lg border border-slate-300 bg-white p-5"
    >
      <h2
        id="review-panel-title"
        className="text-base font-semibold text-slate-900"
      >
        {existing ? '평가 수정' : '평가 쓰기'}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        <span className="font-medium text-slate-700">{candidateName}</span>
        {' — 써보고 나서 어땠는지 남깁니다.'}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-6">
        <RatingInput
          name="rating"
          label="별점"
          value={form.rating}
          onChange={(next) => setField('rating', next)}
          error={errors.rating}
        />

        {/* 오류는 그룹에 붙인다. 개별 라디오의 aria-invalid는 무효다 */}
        <fieldset
          role="radiogroup"
          aria-invalid={errors.repurchase ? true : undefined}
          aria-describedby={errors.repurchase ? 'repurchase-error' : undefined}
          className="flex flex-col gap-1.5"
        >
          <legend className="mb-1.5 text-sm font-medium text-slate-800">
            다시 살 의향
            <span className="ml-1 text-red-600" aria-hidden>
              *
            </span>
            <span className="sr-only"> (필수)</span>
          </legend>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {REPURCHASE_OPTIONS.map((value, index) => (
              <label
                key={value}
                className="flex items-center gap-1.5 text-sm text-slate-700"
              >
                <input
                  // 그룹의 첫 칸만 포커스 대상이 된다
                  id={index === 0 ? fieldId('repurchase') : undefined}
                  type="radio"
                  name="repurchase"
                  value={value}
                  checked={form.repurchase === value}
                  onChange={() => setField('repurchase', value)}
                  className="size-4"
                />
                {REPURCHASE_LABEL[value]}
              </label>
            ))}
          </div>

          {errors.repurchase && (
            <p id="repurchase-error" className="text-xs text-red-600">
              {errors.repurchase}
            </p>
          )}
        </fieldset>

        <Field
          name="oneLine"
          label="한 줄 후기"
          required
          error={errors.oneLine}
          help="3개월 뒤의 내가 읽습니다. 별점보다 이 문장이 오래 갑니다."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              value={form.oneLine}
              maxLength={100}
              placeholder="늘 먹던 맛. 아침에 실패가 없다"
              onChange={(e) => setField('oneLine', e.target.value)}
              className={fullInputClass}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <ListInput
            name="goods"
            label="만족한 점"
            values={form.goods}
            onChange={(next) => setField('goods', next)}
            max={3}
            maxLength={30}
            placeholder="일정한 맛"
            error={errors.goods}
          />
          <ListInput
            name="bads"
            label="아쉬운 점"
            values={form.bads}
            onChange={(next) => setField('bads', next)}
            max={3}
            maxLength={30}
            placeholder="200g이 2주 만에 떨어짐"
            error={errors.bads}
          />
        </div>

        <Field
          name="nextChange"
          label="다음에 바꿀 점"
          error={errors.nextChange}
          help="다음에 비슷한 걸 살 때 무엇을 다르게 할지. 비워둘 수 있습니다."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              value={form.nextChange}
              maxLength={100}
              placeholder="같은 원두를 500g으로 파는지 찾아보기"
              onChange={(e) => setField('nextChange', e.target.value)}
              className={fullInputClass}
            />
          )}
        </Field>

        {submitError && (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {submitError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary">
            {existing ? '평가 수정' : '평가 저장'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            취소
          </Button>
        </div>
      </form>
    </section>
  );
}
