'use client';

import { UNITS } from '@/lib/types';
import type { Unit } from '@/lib/types';

import { fieldErrorId, fieldId, inputClass } from './Field';

/**
 * 구성량 = 숫자 + 단위.
 *
 * 둘은 항상 붙어 다닌다. 값을 입력했으면 단위가 필수고(규칙 C-3),
 * 값이 없으면 단위도 저장하지 않는다. 따로 두면 그 관계가 화면에서 사라진다.
 *
 * ── inputMode를 decimal로 둔 이유 ──
 * 원두는 1.5kg처럼 소수가 정상이다. numeric으로 두면 모바일 키패드에
 * 소수점이 안 나와서 아예 입력할 수가 없다.
 * 금액과 개수는 정수라서 그쪽은 numeric을 쓴다.
 *
 * UNITS를 import하는 것은 ui/의 예외로 허용한다. 단위는 사실상 상수 목록이고,
 * 이걸 prop으로 받게 하면 쓰는 쪽마다 같은 배열을 넘겨야 한다.
 */

interface AmountInputProps {
  name: string;
  label: string;
  value: string;
  unit: Unit | '';
  onValueChange: (v: string) => void;
  onUnitChange: (u: Unit | '') => void;
  valueError?: string;
  unitError?: string;
  /** 아래에 곁들일 계산 결과 같은 것 (예: 100g당 9,000원) */
  hint?: React.ReactNode;
}

const UNIT_LABEL: Record<Unit, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  L: 'L',
  ea: '개',
};

export function AmountInput({
  name,
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
  valueError,
  unitError,
  hint,
}: AmountInputProps) {
  const valueId = fieldId(name);
  const unitId = fieldId(name + '-unit');
  const error = valueError ?? unitError;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={valueId} className="text-sm font-medium text-slate-800">
        {label}
      </label>

      <div className="flex gap-2">
        <input
          id={valueId}
          type="text"
          inputMode="decimal"
          value={value}
          placeholder="200"
          onChange={(e) => onValueChange(e.target.value)}
          aria-invalid={valueError ? true : undefined}
          aria-describedby={error ? fieldErrorId(name) : undefined}
          className={inputClass}
        />

        <select
          id={unitId}
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as Unit | '')}
          aria-label={`${label} 단위`}
          aria-invalid={unitError ? true : undefined}
          className={`${inputClass} w-24 shrink-0`}
        >
          <option value="">단위</option>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABEL[u]}
            </option>
          ))}
        </select>
      </div>

      {hint && <p className="text-xs text-slate-500">{hint}</p>}

      {error && (
        <p id={fieldErrorId(name)} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
