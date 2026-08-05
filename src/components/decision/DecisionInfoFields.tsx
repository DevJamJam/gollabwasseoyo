'use client';

import { TagInput } from '@/components/decision/TagInput';
import { Chip } from '@/components/ui/Chip';
import {
  Field,
  fieldErrorId,
  fieldId,
  flexInputClass,
  fullInputClass,
} from '@/components/ui/Field';
import { CATEGORIES } from '@/lib/types';
import type { CategoryId, DecisionFormValues } from '@/lib/types';
import type { Errors } from '@/lib/validation';

/**
 * 1단계 — 고민 기본정보.
 *
 * 값과 오류를 전부 위에서 받는다. 이 컴포넌트는 상태를 갖지 않는다.
 * 검증과 저장은 DecisionForm이 하고, 여기는 그리기만 한다.
 */

interface Props {
  values: DecisionFormValues;
  errors: Errors<DecisionFormValues>;
  /** 같은 카테고리에서 이미 쓴 태그 */
  tagSuggestions: string[];
  onField: <K extends keyof DecisionFormValues>(
    key: K,
    value: DecisionFormValues[K],
  ) => void;
}

export function DecisionInfoFields({
  values,
  errors,
  tagSuggestions,
  onField,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      <Field name="title" label="고민 제목" required error={errors.title}>
        {(a) => (
          <input
            {...a}
            type="text"
            value={values.title}
            maxLength={60}
            placeholder="겨울 홈카페 원두"
            onChange={(e) => onField('title', e.target.value)}
            className={fullInputClass}
          />
        )}
      </Field>

      {/*
        카테고리는 <Field>를 쓰지 않는다.
        Field는 label의 htmlFor로 입력칸 하나를 가리키는데,
        칩 7개 중 무엇을 가리켜야 할지 정할 수 없다.
        여러 개를 묶는 것은 fieldset과 legend의 일이다.
      */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-slate-800">
          상위 카테고리
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
          <span className="sr-only"> (필수)</span>
        </legend>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              selected={values.category === c.id}
              onClick={() => onField('category', c.id as CategoryId)}
            >
              {c.label}
            </Chip>
          ))}
        </div>

        {errors.category && (
          <p id={fieldErrorId('category')} className="text-xs text-red-600">
            {errors.category}
          </p>
        )}
      </fieldset>

      {/*
        카테고리를 바꿔도 이미 입력한 태그는 지우지 않는다.
        추천 목록만 바뀐다. 사용자가 쓴 것을 앱이 마음대로 지우면 안 된다.
      */}
      <TagInput
        values={values.tags}
        onChange={(next) => onField('tags', next)}
        suggestions={tagSuggestions}
        max={3}
        maxLength={12}
        error={errors.tags}
      />

      <Field
        name="purpose"
        label="구매 목적·중요 조건"
        required
        error={errors.purpose}
        help="나중에 왜 이걸 골랐는지 떠올릴 단서가 됩니다."
      >
        {(a) => (
          <textarea
            {...a}
            rows={2}
            value={values.purpose}
            maxLength={200}
            placeholder="매일 아침 2잔, 산미 적은 것"
            onChange={(e) => onField('purpose', e.target.value)}
            className={`${fullInputClass} h-auto py-2.5`}
          />
        )}
      </Field>

      <Field name="budget" label="예산" error={errors.budget} help="선택 항목입니다.">
        {(a) => (
          <div className="flex items-center gap-2">
            <input
              {...a}
              type="text"
              inputMode="numeric"
              value={values.budget}
              placeholder="40000"
              onChange={(e) => onField('budget', e.target.value)}
              className={flexInputClass}
            />
            <span className="shrink-0 text-sm text-slate-500">원</span>
          </div>
        )}
      </Field>
    </div>
  );
}

/** 포커스를 옮길 때 쓰는 id. 카테고리는 입력칸이 아니라 첫 칩으로 보낸다. */
export function decisionFieldElementId(key: keyof DecisionFormValues): string {
  return fieldId(key);
}
