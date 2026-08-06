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
 * 고민 등록·수정 공용 폼.
 *
 * ── 등록은 2단계, 수정은 한 화면 ──
 * 등록은 처음 쓰는 사람이 한 번에 다 채우기 벅차서 나눈다.
 * 수정은 보통 필드 하나를 고치러 오는데, 단계를 밟게 하면 불필요한 마찰이다.
 *
 * ── 라우트는 각각 하나씩 ──
 * 등록의 2단계는 /decisions/new 안에서 step 상태로 전환한다.
 * 라우트를 늘리면 뒤로가기와 검증 처리 비용만 커진다.
 *
 * ── props를 유니온으로 둔 이유 ──
 * mode가 'edit'이면 decisionId가 반드시 있어야 한다.
 * decisionId?: string 으로 두면 빠뜨려도 컴파일이 통과하고,
 * 그러면 '수정했는데 아무 일도 안 일어나는' 버그가 된다.
 */
type DecisionFormProps =
  | { mode: 'create' }
  | {
      mode: 'edit';
      decisionId: string;
      initialForm: DecisionFormValues;
      initialCandidates: Candidate[];
      /** 구매되어 삭제할 수 없는 후보 id */
      lockedCandidateIds: string[];
    };

const STEP_LABEL = ['고민 정보', '후보 등록'] as const;

/**
 * 실패 사유를 사용자 문구로 바꾼다.
 *
 * 'invalid'는 정상 흐름에서는 나오면 안 되는 값이다.
 * 폼 검증이 이미 막았어야 하므로, 이게 보이면 개발 중 버그다.
 */
function messageFor(
  reason: 'not_found' | 'invalid' | 'quota' | 'unavailable',
): string {
  switch (reason) {
    case 'quota':
      return '저장 공간이 부족합니다. 오래된 기록을 삭제한 뒤 다시 시도해 주세요.';
    case 'unavailable':
      return '이 브라우저에서는 기록을 저장할 수 없습니다.';
    case 'not_found':
      return '수정할 기록을 찾을 수 없습니다. 삭제되었을 수 있습니다.';
    case 'invalid':
      return '저장할 수 없는 상태입니다. 입력을 확인해 주세요.';
  }
}

export function DecisionForm(props: DecisionFormProps) {
  const router = useRouter();
  const { decisions, createDecision, updateDecision } = useDecisions();

  const isEdit = props.mode === 'edit';

  const [step, setStep] = useState<0 | 1>(0);
  const [values, setValues] = useState<DecisionFormValues>(
    props.mode === 'edit' ? props.initialForm : EMPTY_DECISION_FORM,
  );
  const [candidates, setCandidates] = useState<Candidate[]>(
    props.mode === 'edit' ? props.initialCandidates : [],
  );

  const [errors, setErrors] = useState<Errors<DecisionFormValues>>({});
  const [candidateError, setCandidateError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();

  const lockedCandidateIds =
    props.mode === 'edit' ? props.lockedCandidateIds : [];

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

      // 등록 화면에서 기본정보가 틀렸으면 1단계로 되돌려야 고칠 수 있다.
      // 수정 화면은 두 섹션이 다 보이므로 되돌릴 곳이 없다.
      if (hasError(nextErrors)) {
        if (!isEdit) {
          setStep(0);
          // 단계 전환 뒤에 입력칸이 생기므로 다음 프레임에 포커스한다
          requestAnimationFrame(() => focusFirstError(nextErrors));
        } else {
          focusFirstError(nextErrors);
        }
      }
      return;
    }

    const input = toDecisionInput(values, candidates);

    /*
      두 액션의 반환 타입이 다르다.
        createDecision → ActionResult<{ id: string }>   새 id를 알려준다
        updateDecision → ActionResult<undefined>        이미 id를 알고 있다

      삼항으로 한 변수에 담으면 두 타입이 합쳐져 data가
      `{ id: string } | undefined` 가 되고, result.data.id를 못 쓴다.
      분기를 나눠 각각의 타입을 유지한다.

      저장에 실패하면 폼과 입력값을 그대로 두고 이유만 알린다.
      성공했을 때만 화면을 옮긴다. push가 아니라 replace라서
      뒤로가기로 폼에 되돌아오지 않는다.
    */
    if (props.mode === 'edit') {
      const result = updateDecision(props.decisionId, input);

      if (!result.ok) {
        setSubmitError(messageFor(result.reason));
        return;
      }

      router.replace(`/decisions/${props.decisionId}`);
      return;
    }

    const result = createDecision(input);

    if (!result.ok) {
      setSubmitError(messageFor(result.reason));
      return;
    }

    router.replace(`/decisions/${result.data.id}`);
  }

  // 카테고리를 고르면 그 카테고리에서 이미 쓴 태그를 추천한다.
  // 첫 사용자는 0개이므로 직접 입력이 언제나 가능해야 한다.
  const tagSuggestions = values.category
    ? getTagsByCategory(decisions, values.category)
    : [];

  const infoSection = (
    <DecisionInfoFields
      values={values}
      errors={errors}
      tagSuggestions={tagSuggestions}
      onField={setField}
    />
  );

  const candidateSection = (
    <CandidateSection
      candidates={candidates}
      onChange={(next) => {
        setCandidates(next);
        setCandidateError(undefined);
      }}
      lockedCandidateIds={lockedCandidateIds}
      error={candidateError}
    />
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        {isEdit ? '고민 수정' : '새 고민 만들기'}
      </h1>

      {/* 등록만 단계를 밟는다 */}
      {!isEdit && (
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
      )}

      <div className="mt-6">
        {isEdit ? (
          // 수정은 한 화면에 두 섹션을 모두 펼친다
          <div className="flex flex-col gap-8">
            {infoSection}
            <div className="border-t border-slate-100 pt-8">
              {candidateSection}
            </div>
          </div>
        ) : step === 0 ? (
          infoSection
        ) : (
          candidateSection
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
        {isEdit ? (
          <>
            <Button onClick={() => router.back()}>취소</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={candidates.length === 0}
            >
              저장
            </Button>
          </>
        ) : step === 0 ? (
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

      {!isEdit && (
        <p className="mt-4 text-xs text-slate-400">
          등록 도중 새로고침하면 입력한 내용이 사라집니다. 저장은 마지막 단계에서
          한 번만 일어납니다.
        </p>
      )}
    </div>
  );
}
