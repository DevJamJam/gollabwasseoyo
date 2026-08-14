'use client';

import type { Rating } from '@/lib/types';

import { fieldErrorId, fieldId } from './Field';

/**
 * 별점 입력.
 *
 * ── <div onClick>으로 만들지 않는다 ──
 * 별 다섯 개를 그리는 가장 쉬운 방법은 `<span onClick>` 다섯 개다.
 * 그러면 키보드로 고를 수 없고, 스크린리더는 "별"이라는 글자만 읽는다.
 * 지금 몇 점인지, 몇 점까지 줄 수 있는지 알 방법이 없다.
 *
 * 그래서 진짜 라디오 다섯 개를 두고 시각적으로만 감춘다.
 * 화살표로 이동하고 Space로 고르는 동작은 브라우저가 원래 해주는 것이고,
 * 우리는 그걸 없애지 않기만 하면 된다.
 *
 * ── 기본값을 두지 않는다 ──
 * 3점을 미리 찍어두면 '보통'이라고 답한 것인지 아직 안 고른 것인지
 * 구분할 수 없다. 그래서 `Rating | null`이고 null로 시작한다.
 */

const RATINGS: readonly Rating[] = [1, 2, 3, 4, 5];

/** 점수마다 뜻을 적는다. 별 개수만으로는 4점과 5점의 차이가 사람마다 다르다. */
const RATING_LABEL: Record<Rating, string> = {
  1: '많이 아쉬움',
  2: '아쉬움',
  3: '보통',
  4: '만족',
  5: '아주 만족',
};

interface RatingInputProps {
  name: string;
  label: string;
  value: Rating | null;
  onChange: (next: Rating) => void;
  error?: string;
}

export function RatingInput({
  name,
  label,
  value,
  onChange,
  error,
}: RatingInputProps) {
  const errorId = fieldErrorId(name);

  return (
    // 오류는 그룹 전체에 붙는다. 개별 라디오에 aria-invalid를 달면
    // "1점이 잘못됐다"는 뜻이 되어 버린다 — 잘못된 것은 '고르지 않은 것'이다.
    <fieldset
      role="radiogroup"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className="flex flex-col gap-1.5"
    >
      <legend className="mb-1.5 text-sm font-medium text-slate-800">
        {label}
        <span className="ml-1 text-red-600" aria-hidden>
          *
        </span>
        <span className="sr-only"> (필수)</span>
      </legend>

      <div className="flex items-center gap-1">
        {RATINGS.map((score) => {
          const filled = value !== null && score <= value;

          return (
            <label
              key={score}
              className="cursor-pointer p-0.5 leading-none"
              title={`${score}점 · ${RATING_LABEL[score]}`}
            >
              {/*
                sr-only는 화면에서만 감춘다. display:none이나 hidden으로 하면
                포커스를 받을 수 없어서 키보드로 고를 수 없게 된다.
              */}
              <input
                // 제출 실패 시 포커스를 받을 자리. 그룹의 첫 칸에만 붙인다.
                id={score === RATINGS[0] ? fieldId(name) : undefined}
                type="radio"
                name={name}
                value={score}
                checked={value === score}
                onChange={() => onChange(score)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={[
                  'block text-2xl transition-colors',
                  // 포커스 링을 별 자체에 그린다. 라디오가 감춰져 있어서
                  // 브라우저 기본 링이 화면에 안 보이기 때문이다.
                  'peer-focus-visible:rounded peer-focus-visible:outline-2',
                  'peer-focus-visible:outline-offset-2 peer-focus-visible:outline-slate-900',
                  filled ? 'text-amber-500' : 'text-slate-300',
                ].join(' ')}
              >
                ★
              </span>
              <span className="sr-only">
                {score}점 {RATING_LABEL[score]}
              </span>
            </label>
          );
        })}

        {/* 색만으로 구분하지 않는다. 고른 점수의 뜻을 글자로도 적는다. */}
        <span className="ml-2 text-sm text-slate-600">
          {value === null ? '아직 고르지 않았습니다' : RATING_LABEL[value]}
        </span>
      </div>

      {error && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
