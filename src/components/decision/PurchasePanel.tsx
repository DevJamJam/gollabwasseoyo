'use client';

import { useState } from 'react';

import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import {
  Field,
  fieldId,
  fullInputClass,
  itemFieldId,
  itemFieldName,
} from '@/components/ui/Field';
import { isFutureDate, todayString } from '@/lib/date';
import { getFormSubtotal, getUnitPrice } from '@/lib/derive';
import { formatAmount, formatKRW } from '@/lib/format';
import { toOrderInput, toPurchaseForm } from '@/lib/parse';
import type {
  Amount,
  Decision,
  PurchaseFormValues,
  PurchasedItemFormValues,
  Unit,
} from '@/lib/types';
import {
  firstPurchaseErrorField,
  hasPurchaseError,
  validatePurchaseForm,
} from '@/lib/validation';
import type { PurchaseFormErrors } from '@/lib/validation';
import { useDecisions } from '@/store/useDecisions';

/**
 * 구매 등록·수정 패널.
 *
 * 상품을 여러 개 동시에 입력하고, 각 행이 어떤 후보인지 위쪽 비교 카드와
 * 대조해 가며 쓴다. 모달로 덮으면 그 대조가 불가능해진다.
 *
 * 체크된 것만 행을 만들면 체크할 때마다 행을 끼워 넣어야 하고, 껐다 켜면
 * 입력이 사라진다. 전부 만들어 두고 selected로 여닫으면 그 문제가 없다.
 * 저장할 때 toOrderInput이 체크된 것만 걸러낸다.
 *
 * 체크박스는 비활성되지만 단가·수량·구성량·구매일·결제금액·이유는 고칠 수 있다.
 * 금액에 0 하나를 잘못 넣은 걸 고치려고 평가를 지우게 만들 이유가 없다.
 */

interface Props {
  decision: Decision;
  /** 저장에 성공했을 때. 패널을 닫는 것은 부모의 몫이다. */
  onSaved: () => void;
  onCancel: () => void;
}

const EMPTY_ERRORS: PurchaseFormErrors = { itemErrors: {} };

function messageFor(reason: 'not_found' | 'invalid' | 'quota' | 'unavailable'): string {
  switch (reason) {
    case 'not_found':
      return '구매 기록을 찾을 수 없습니다.';
    case 'quota':
      return '저장 공간이 부족해 저장하지 못했습니다. 기록을 정리한 뒤 다시 시도해 주세요.';
    case 'unavailable':
      return '이 브라우저에서는 기록을 저장할 수 없습니다.';
    case 'invalid':
      return '저장할 수 없는 상태입니다. 입력값을 다시 확인해 주세요.';
  }
}

/**
 * 입력 중인 문자열을 양수로 읽는다. 아니면 null.
 *
 * Number('')는 0이고 Number('abc')는 NaN이다. 둘 다 걸러내지 않으면
 * 계산 결과에 NaN이 섞여 화면에 'NaN원'이 뜬다. 타이핑 도중에는
 * 값이 항상 미완성이므로 여기서 한 번에 막는다.
 */
function positiveNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;

  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 실제 구성량 × 개수. 행 아래에 곁들여 보여준다. */
function rowTotalAmount(row: PurchasedItemFormValues): Amount | null {
  const value = positiveNumber(row.amountValue);
  const quantity = positiveNumber(row.quantity);

  if (value === null || quantity === null || row.amountUnit === '') return null;

  return { value: value * quantity, unit: row.amountUnit };
}

/** 이 행의 단위 가격. 값이 덜 채워졌으면 그리지 않는다. */
function rowUnitPrice(row: PurchasedItemFormValues) {
  const price = positiveNumber(row.unitPrice);
  const value = positiveNumber(row.amountValue);

  if (price === null || value === null || row.amountUnit === '') return null;

  return getUnitPrice(price, { value, unit: row.amountUnit });
}

export function PurchasePanel({ decision, onSaved, onCancel }: Props) {
  const { setOrder } = useDecisions();

  // 렌더마다 새로 계산하면 자정을 넘길 때 값이 흔들린다. 마운트 때 한 번만 잡는다.
  const [today] = useState(todayString);
  const [form, setForm] = useState<PurchaseFormValues>(() =>
    toPurchaseForm(decision, today),
  );
  const [errors, setErrors] = useState<PurchaseFormErrors>(EMPTY_ERRORS);
  const [submitError, setSubmitError] = useState<string>();

  const editing = decision.order !== null;

  // 평가가 하나라도 있으면 구매 대상 후보는 고정된다 (규칙 E-3)
  const candidateSetLocked =
    decision.order?.items.some((it) => it.review !== null) ?? false;

  function setField<K extends keyof PurchaseFormValues>(
    key: K,
    value: PurchaseFormValues[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setRow(
    candidateId: string,
    patch: Partial<PurchasedItemFormValues>,
  ): void {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.candidateId === candidateId ? { ...it, ...patch } : it,
      ),
    }));
  }

  /** 오류가 있는 첫 칸으로 포커스를 옮긴다. 화면에 보이는 순서를 따른다. */
  function focusFirstError(
    values: PurchaseFormValues,
    e: PurchaseFormErrors,
  ): void {
    const target = firstPurchaseErrorField(values, e);
    if (!target) return;

    const id =
      target.kind === 'common'
        ? // 'items'는 필드가 아니라 목록 전체의 오류라 첫 체크박스로 보낸다
          target.field === 'items'
          ? itemFieldId(values.items[0]?.candidateId ?? '', 'selected')
          : fieldId(target.field)
        : target.field === 'amountUnit'
          ? itemFieldId(target.candidateId, 'amountValue-unit')
          : itemFieldId(target.candidateId, target.field);

    document.getElementById(id)?.focus();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitError(undefined);

    const nextErrors = validatePurchaseForm(form);
    setErrors(nextErrors);

    if (hasPurchaseError(nextErrors)) {
      focusFirstError(form, nextErrors);
      return;
    }

    const result = setOrder(decision.id, toOrderInput(form));

    if (!result.ok) {
      setSubmitError(messageFor(result.reason));
      return;
    }

    // 저장에 성공했을 때만 패널을 닫는다
    onSaved();
  }

  const subtotal = getFormSubtotal(form);
  const paidText = form.totalPaid.trim();
  const paid = Number(paidText);

  const diff =
    subtotal !== null && paidText !== '' && Number.isFinite(paid)
      ? paid - subtotal
      : null;

  const selectedCount = form.items.filter((it) => it.selected).length;

  return (
    <section
      aria-labelledby="purchase-panel-title"
      className="rounded-lg border border-slate-300 bg-white p-5"
    >
      <h2
        id="purchase-panel-title"
        className="text-base font-semibold text-slate-900"
      >
        {editing ? '구매정보 수정' : '구매 등록'}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        실제로 산 상품을 고르고, 낸 금액을 그대로 적습니다.
      </p>

      {/* 브라우저 기본 검증이 우리 메시지보다 먼저 끼어들지 않게 막는다 */}
      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-6">
        {/* ── 구매한 상품 고르기 ────────────────────────────── */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-slate-800">
            구매한 상품
            <span className="ml-1 text-red-600" aria-hidden>
              *
            </span>
            <span className="sr-only"> (필수)</span>
          </legend>

          {candidateSetLocked && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              평가가 작성되어 있어 구매한 상품은 바꿀 수 없습니다. 금액·개수·
              구성량과 주문 정보는 고칠 수 있습니다. 상품을 바꾸려면 구매 기록을
              취소해 주세요.
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {form.items.map((row) => {
              const candidate = decision.candidates.find(
                (c) => c.id === row.candidateId,
              );
              if (!candidate) return null;

              const rowErrors = errors.itemErrors[row.candidateId];
              const totalAmount = rowTotalAmount(row);
              const unitPrice = rowUnitPrice(row);

              return (
                <li
                  key={row.candidateId}
                  className={[
                    'rounded-lg border p-3',
                    row.selected
                      ? 'border-blue-400 bg-blue-50/40'
                      : 'border-slate-200 bg-white',
                  ].join(' ')}
                >
                  <label className="flex items-start gap-2.5">
                    <input
                      id={itemFieldId(row.candidateId, 'selected')}
                      type="checkbox"
                      checked={row.selected}
                      disabled={candidateSetLocked}
                      onChange={(e) =>
                        setRow(row.candidateId, { selected: e.target.checked })
                      }
                      className="mt-0.5 size-4 shrink-0 rounded border-slate-400 accent-blue-600 disabled:cursor-not-allowed"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">
                        {candidate.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        비교 가격 {formatKRW(candidate.comparePrice)}
                        {candidate.brand && ` · ${candidate.brand}`}
                      </span>
                    </span>
                  </label>

                  {row.selected && (
                    <div className="mt-3 flex flex-col gap-3 border-t border-blue-200 pt-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          name={itemFieldName(row.candidateId, 'unitPrice')}
                          label="실제 단가"
                          required
                          error={rowErrors?.unitPrice}
                        >
                          {(props) => (
                            <input
                              {...props}
                              type="text"
                              inputMode="numeric"
                              value={row.unitPrice}
                              placeholder="18000"
                              onChange={(e) =>
                                setRow(row.candidateId, {
                                  unitPrice: e.target.value,
                                })
                              }
                              className={fullInputClass}
                            />
                          )}
                        </Field>

                        <Field
                          name={itemFieldName(row.candidateId, 'quantity')}
                          label="구매 개수"
                          required
                          error={rowErrors?.quantity}
                        >
                          {(props) => (
                            <input
                              {...props}
                              type="text"
                              inputMode="numeric"
                              value={row.quantity}
                              placeholder="1"
                              onChange={(e) =>
                                setRow(row.candidateId, {
                                  quantity: e.target.value,
                                })
                              }
                              className={fullInputClass}
                            />
                          )}
                        </Field>
                      </div>

                      <AmountInput
                        name={itemFieldName(row.candidateId, 'amountValue')}
                        label="실제 구성량"
                        value={row.amountValue}
                        unit={row.amountUnit}
                        onValueChange={(v) =>
                          setRow(row.candidateId, { amountValue: v })
                        }
                        onUnitChange={(u: Unit | '') =>
                          setRow(row.candidateId, { amountUnit: u })
                        }
                        valueError={rowErrors?.amountValue}
                        unitError={rowErrors?.amountUnit}
                        hint={
                          totalAmount && (
                            <>
                              총 {formatAmount(totalAmount)}
                              {unitPrice &&
                                ` · ${unitPrice.label} ${formatKRW(unitPrice.value)}`}
                            </>
                          )
                        }
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {errors.items && (
            <p className="text-xs text-red-600">{errors.items}</p>
          )}
        </fieldset>

        {/* ── 주문 정보 ─────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="purchasedAt"
            label="구매일"
            required
            error={errors.purchasedAt}
            help={
              isFutureDate(form.purchasedAt, today)
                ? '미래 날짜입니다. 예약 구매나 입력 착오가 아닌지 확인해 주세요.'
                : undefined
            }
          >
            {(props) => (
              <input
                {...props}
                type="date"
                value={form.purchasedAt}
                onChange={(e) => setField('purchasedAt', e.target.value)}
                className={fullInputClass}
              />
            )}
          </Field>

          <Field
            name="totalPaid"
            label="최종 결제금액"
            required
            error={errors.totalPaid}
            help={diffMessage(subtotal, diff)}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                inputMode="numeric"
                value={form.totalPaid}
                placeholder="47000"
                onChange={(e) => setField('totalPaid', e.target.value)}
                className={fullInputClass}
              />
            )}
          </Field>
        </div>

        <Field
          name="seller"
          label="구매처"
          error={errors.seller}
          help="어디서 샀는지. 비워둘 수 있습니다."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              value={form.seller}
              placeholder="네이버 스마트스토어"
              onChange={(e) => setField('seller', e.target.value)}
              className={fullInputClass}
            />
          )}
        </Field>

        <Field
          name="reason"
          label="선택한 이유"
          required
          error={errors.reason}
          help="왜 이걸 골랐는지. 나중에 이 문장이 제일 쓸모 있습니다."
        >
          {(props) => (
            <textarea
              {...props}
              rows={3}
              value={form.reason}
              placeholder="올드독은 실패가 없어서 유지, 블렌드는 100g당 값이 싸서 시도"
              onChange={(e) => setField('reason', e.target.value)}
              className={`${fullInputClass} h-auto py-2.5 leading-relaxed`}
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

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary">
            {editing ? '수정 저장' : '구매 등록'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            취소
          </Button>

          <span className="ml-auto text-xs text-slate-500">
            {selectedCount}개 상품 선택됨
          </span>
        </div>
      </form>
    </section>
  );
}

/**
 * 단가 합계와 결제금액의 차액 안내.
 *
 * 오류가 아니다. 쿠폰·배송비·포인트가 붙는 게 정상이라 같기를 강제하면
 * 실제 영수증을 적을 수 없다(규칙 P-6). 다만 0을 하나 덜 쓴 오타는
 * 눈에 띄어야 하므로 차액을 그대로 보여준다.
 */
function diffMessage(subtotal: number | null, diff: number | null): string | undefined {
  if (subtotal === null || diff === null) return undefined;

  const base = `단가 합계 ${formatKRW(subtotal)}`;

  if (diff === 0) return `${base}과 같습니다.`;
  if (diff < 0) return `${base}보다 ${formatKRW(-diff)} 적습니다. (쿠폰·할인)`;
  return `${base}보다 ${formatKRW(diff)} 많습니다. (배송비 등)`;
}
