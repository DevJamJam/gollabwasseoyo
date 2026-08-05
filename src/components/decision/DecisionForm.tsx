'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { CandidateSection } from '@/components/decision/CandidateSection';
import { DecisionInfoFields } from '@/components/decision/DecisionInfoFields';
import { Button } from '@/components/ui/Button';
import { fieldId } from '@/components/ui/Field';
import { getTagsByCategory } from '@/lib/derive';
import { toDecisionInput } from '@/lib/parse';
import { EMPTY_DECISION_FORM } from '@/lib/types';
import type { Candidate, DecisionFormValues } from '@/lib/types';
import {
  DECISION_FIELD_ORDER,
  firstErrorField,
  hasError,
  validateCandidateCount,
  validateDecisionForm,
} from '@/lib/validation';
import type { Errors } from '@/lib/validation';
import { useDecisions } from '@/store/useDecisions';

/**
 * 새 고민 등록.
 *
 * 2단계지만 라우트는 하나다. /decisions/new 안에서 step 상태로 전환한다.
 * 라우트를 늘리면 뒤로가기와 검증 처리 비용만 커진다.
 *
 * **저장은 2단계 끝에서 한 번만** 일어난다. 1단계에서 저장하면
 * 후보가 0개인 고민이 남아 규칙 D-3이 깨진다.
 */

const STEP_LABEL = ['고민 정보', '후보 등록'] as const;

export function DecisionForm() {
  const router = useRouter();
  const { decisions, createDecision } = useDecisions();

  const [step, setStep] = useState<0 | 1>(0);
  const [values, setValues] = useState<DecisionFormValues>(EMPTY_DECISION_FORM);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [errors, setErrors] = useState<Errors<DecisionFormValues>>({});
  const [candidateError, setCandidateError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();

  function setField<K extends keyof DecisionFormValues>(
    key: K,
    value: DecisionFormValues[K],
  ): void {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  /** 첫 오류 필드로 포커스. 순서는 화면 순서를 고정한 상수를 따른다. */
  function focusFirstError(next: Errors<DecisionFormValues>): void {
    const field = firstErrorField(next, DECISION_FIELD_ORDER);
    if (field) document.getElementById(fieldId(field))?.focus();
  }

  function goToCandidates(): void {
    const next = validateDecisionForm(values);

    if (hasError(next)) {
      setErrors(next);
      focusFirstError(next);
      return;
    }

    setErrors({});
    setStep(1);
  }

  /**
   * 제출.
   *
   *   ① 검증 → 실패하면 여기서 끝. 저장 시도조차 하지 않는다
   *   ② 파싱 (검증 직후에만 부른다)
   *   ③ Provider가 불변식 검사 → 저장 → 성공 시 상태 반영
   *   ④ 성공했을 때만 화면을 옮긴다
   */
  function handleSubmit(): void {
    setSubmitError(undefined);

    const nextErrors = validateDecisionForm(values);
    const nextCandidateError = validateCandidateCount(candidates);

    if (hasError(nextErrors) || nextCandidateError) {
      setErrors(nextErrors);
      setCandidateError(nextCandidateError);

      // 기본정보가 틀렸으면 1단계로 되돌려야 사용자가 고칠 수 있다
      if (hasError(nextErrors)) {
        setStep(0);
        // 단계 전환 뒤에 입력칸이 생기므로 다음 프레임에 포커스한다
        requestAnimationFrame(() => focusFirstError(nextErrors));
      }
      return;
    }

    const result = createDecision(toDecisionInput(values, candidates));

    if (!result.ok) {
      // 저장에 실패했다. 폼과 입력값을 그대로 두고 이유만 알린다.
      setSubmitError(
        result.reason === 'quota'
          ? '저장 공간이 부족합니다. 오래된 기록을 삭제한 뒤 다시 시도해 주세요.'
          : result.reason === 'unavailable'
            ? '이 브라우저에서는 기록을 저장할 수 없습니다.'
            : '저장할 수 없는 상태입니다. 입력을 확인해 주세요.',
      );
      return;
    }

    // push가 아니라 replace다. 뒤로가기로 등록 폼에 되돌아오지 않게 한다.
    router.replace(`/decisions/${result.data.id}`);
  }

  // 카테고리를 고르면 그 카테고리에서 이미 쓴 태그를 추천한다.
  // 첫 사용자는 0개이므로 직접 입력이 언제나 가능해야 한다.
  const tagSuggestions = values.category
    ? getTagsByCategory(decisions, values.category)
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        새 고민 만들기
      </h1>

      {/* 스텝 인디케이터 */}
      <ol className="mt-5 flex gap-2" aria-label="등록 단계">
        {STEP_LABEL.map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? 'step' : undefined}
            className={[
              'flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm',
              step === i
                ? 'border-slate-900 bg-slate-900 font-medium text-white'
                : 'border-slate-200 text-slate-500',
            ].join(' ')}
          >
            <span
              className={[
                'flex size-5 shrink-0 items-center justify-center rounded-full text-xs',
                step === i ? 'bg-white text-slate-900' : 'bg-slate-100',
              ].join(' ')}
            >
              {i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <div className="mt-6">
        {step === 0 ? (
          <DecisionInfoFields
            values={values}
            errors={errors}
            tagSuggestions={tagSuggestions}
            onField={setField}
          />
        ) : (
          <CandidateSection
            candidates={candidates}
            onChange={(next) => {
              setCandidates(next);
              setCandidateError(undefined);
            }}
            lockedCandidateIds={[]}
            error={candidateError}
          />
        )}
      </div>

      {submitError && (
        <p
          role="alert"
          className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {submitError}
        </p>
      )}

      <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
        {step === 0 ? (
          <>
            <Button onClick={() => router.back()}>취소</Button>
            <Button variant="primary" onClick={goToCandidates}>
              다음
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setStep(0)}>이전</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={candidates.length === 0}
            >
              저장
            </Button>
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        등록 도중 새로고침하면 입력한 내용이 사라집니다. 저장은 마지막 단계에서
        한 번만 일어납니다.
      </p>
    </div>
  );
}
