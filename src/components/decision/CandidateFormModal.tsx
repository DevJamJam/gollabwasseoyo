'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import {
  Field,
  fieldId,
  flexInputClass,
  fullInputClass,
} from '@/components/ui/Field';
import { ListInput } from '@/components/ui/ListInput';
import { Modal } from '@/components/ui/Modal';
import { getUnitPrice } from '@/lib/derive';
import { formatUnitPrice } from '@/lib/format';
import { toCandidate } from '@/lib/parse';
import { EMPTY_CANDIDATE_FORM } from '@/lib/types';
import type { Candidate, CandidateFormValues, Unit } from '@/lib/types';
import {
  CANDIDATE_FIELD_ORDER,
  firstErrorField,
  hasError,
  validateCandidateForm,
} from '@/lib/validation';
import type { Errors } from '@/lib/validation';

/**
 * 후보 등록·수정 모달.
 *
 * 필드가 13개인데 필수는 상품명과 비교 가격 둘뿐이다 (규칙 C-2).
 * 나머지를 다 채우게 만들면 기록 자체를 안 하게 된다.
 *
 * 큰 폼이라 필드마다 useState를 두지 않고 **객체 하나 + setField**로 관리한다.
 * useState를 13개 만들면 초기화·검증·역변환을 전부 13번 써야 한다.
 */

interface Props {
  open: boolean;
  /** 수정이면 기존 값, 새로 만들면 undefined */
  initial?: { id: string; form: CandidateFormValues };
  onClose: () => void;
  onSubmit: (candidate: Candidate) => void;
  /** 새 후보의 id를 만든다. 수정일 때는 기존 id를 유지한다. */
  newId: () => string;
}

export function CandidateFormModal({
  open,
  initial,
  onClose,
  onSubmit,
  newId,
}: Props) {
  const [values, setValues] = useState<CandidateFormValues>(
    initial?.form ?? EMPTY_CANDIDATE_FORM,
  );
  const [errors, setErrors] = useState<Errors<CandidateFormValues>>({});

  /**
   * 모달이 열릴 때마다 폼을 초기값으로 되돌린다.
   *
   * key로 컴포넌트를 다시 마운트시키는 방법도 있지만,
   * 여기서는 부모가 open을 false로 만들었다가 다시 true로 만들 때
   * initial이 바뀌므로 그것을 기준으로 삼는다.
   */
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setValues(initial?.form ?? EMPTY_CANDIDATE_FORM);
    setErrors({});
  }

  /**
   * 제네릭 setField.
   *
   * K가 'name'이면 value는 string, 'pros'면 string[]로 좁혀진다.
   * setField('name', ['a'])처럼 잘못 쓰면 컴파일 에러가 난다.
   */
  function setField<K extends keyof CandidateFormValues>(
    key: K,
    value: CandidateFormValues[K],
  ): void {
    setValues((prev) => ({ ...prev, [key]: value }));

    // 이미 오류가 표시된 필드만 실시간으로 지운다.
    // 타이핑하는 내내 빨간 글씨가 깜빡이면 방해가 된다.
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const next = validateCandidateForm(values);

    if (hasError(next)) {
      setErrors(next);

      const field = firstErrorField(next, CANDIDATE_FIELD_ORDER);
      if (field) document.getElementById(fieldId(field))?.focus();
      return; // 여기서 끝. 저장 시도조차 하지 않는다
    }

    // 검증을 통과한 직후에만 파싱한다
    onSubmit(toCandidate(values, initial?.id ?? newId()));
  }

  // 가격과 구성량이 모두 유효하면 즉시 계산해 보여준다. 저장하지는 않는다.
  const unitPrice = getUnitPrice(
    Number(values.comparePrice),
    values.amountValue && values.amountUnit
      ? { value: Number(values.amountValue), unit: values.amountUnit as Unit }
      : undefined,
  );

  return (
    <Modal
      open={open}
      title={initial ? '후보 수정' : '후보 추가'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" type="submit" form="candidate-form">
            {initial ? '수정' : '추가'}
          </Button>
        </>
      }
    >
      {/*
        submit 버튼이 Modal의 footer에 있어서 form 밖에 있다.
        form 속성으로 id를 가리키면 밖에서도 제출할 수 있다.
      */}
      <form id="candidate-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field name="name" label="상품명" required error={errors.name}>
          {(a) => (
            <input
              {...a}
              type="text"
              value={values.name}
              maxLength={50}
              placeholder="올드독"
              onChange={(e) => setField('name', e.target.value)}
              className={fullInputClass}
            />
          )}
        </Field>

        <Field
          name="comparePrice"
          label="비교 가격"
          required
          error={errors.comparePrice}
          help="지금 보고 있는 가격입니다. 실제 구매가는 나중에 따로 적습니다."
        >
          {(a) => (
            <div className="flex items-center gap-2">
              <input
                {...a}
                type="text"
                inputMode="numeric"
                value={values.comparePrice}
                placeholder="18000"
                onChange={(e) => setField('comparePrice', e.target.value)}
                className={flexInputClass}
              />
              <span className="shrink-0 text-sm text-slate-500">원</span>
            </div>
          )}
        </Field>

        <AmountInput
          name="amountValue"
          label="상품 구성량"
          value={values.amountValue}
          unit={values.amountUnit}
          onValueChange={(v) => setField('amountValue', v)}
          onUnitChange={(u) => setField('amountUnit', u)}
          valueError={errors.amountValue}
          unitError={errors.amountUnit}
          hint={
            unitPrice ? (
              <span className="font-medium text-slate-700">
                {formatUnitPrice(unitPrice)}
              </span>
            ) : (
              '입력하면 100g당 가격을 계산해 보여줍니다.'
            )
          }
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="brand" label="브랜드" error={errors.brand}>
            {(a) => (
              <input
                {...a}
                type="text"
                value={values.brand}
                maxLength={30}
                placeholder="프릳츠"
                onChange={(e) => setField('brand', e.target.value)}
                className={fullInputClass}
              />
            )}
          </Field>

          <Field name="option" label="옵션·모델" error={errors.option}>
            {(a) => (
              <input
                {...a}
                type="text"
                value={values.option}
                maxLength={60}
                placeholder="홀빈 / 분쇄"
                onChange={(e) => setField('option', e.target.value)}
                className={fullInputClass}
              />
            )}
          </Field>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-slate-800">
            사용 경험
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {(
              [
                ['', '선택 안 함'],
                ['new', '처음 보는 상품'],
                ['used', '사용해본 상품'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-1.5 text-sm text-slate-700"
              >
                <input
                  type="radio"
                  name="familiarity"
                  value={value}
                  checked={values.familiarity === value}
                  onChange={() => setField('familiarity', value)}
                  className="size-4"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <ListInput
            name="pros"
            label="기대되는 점"
            values={values.pros}
            onChange={(next) => setField('pros', next)}
            max={3}
            maxLength={30}
            placeholder="고소한 맛"
            error={errors.pros}
          />

          <ListInput
            name="cons"
            label="걱정되는 점"
            values={values.cons}
            onChange={(next) => setField('cons', next)}
            max={3}
            maxLength={30}
            placeholder="가격이 비쌈"
            error={errors.cons}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="seller" label="구매처" error={errors.seller}>
            {(a) => (
              <input
                {...a}
                type="text"
                value={values.seller}
                maxLength={40}
                placeholder="공식몰"
                onChange={(e) => setField('seller', e.target.value)}
                className={fullInputClass}
              />
            )}
          </Field>

          <Field name="link" label="상품 링크" error={errors.link}>
            {(a) => (
              <input
                {...a}
                type="url"
                value={values.link}
                placeholder="https://"
                onChange={(e) => setField('link', e.target.value)}
                className={fullInputClass}
              />
            )}
          </Field>
        </div>

        <Field
          name="shippingNote"
          label="배송 조건 메모"
          error={errors.shippingNote}
          help="자유 메모입니다. 어떤 계산에도 쓰지 않습니다."
        >
          {(a) => (
            <input
              {...a}
              type="text"
              value={values.shippingNote}
              maxLength={80}
              placeholder="3만원 이상 무료배송"
              onChange={(e) => setField('shippingNote', e.target.value)}
              className={fullInputClass}
            />
          )}
        </Field>

        <Field name="memo" label="후보 메모" error={errors.memo}>
          {(a) => (
            <textarea
              {...a}
              rows={2}
              value={values.memo}
              maxLength={200}
              placeholder="리뷰에서 산미 얘기가 갈린다"
              onChange={(e) => setField('memo', e.target.value)}
              className={`${fullInputClass} h-auto py-2.5`}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
