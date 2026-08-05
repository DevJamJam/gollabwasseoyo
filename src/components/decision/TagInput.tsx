'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { fieldErrorId, fieldId, inputClass } from '@/components/ui/Field';
import { CHIP_TONE, TAG_TONE, toneForTag } from '@/components/ui/tone';

/**
 * 태그 입력 + 추천 칩.
 *
 * 추천 칩은 **보조 수단**이다. 첫 사용자는 추천이 0개이므로
 * 직접 입력이 언제나 가능해야 한다.
 *
 * 색은 카드에 그려지는 태그와 같은 규칙으로 정한다. 입력하는 순간부터
 * 목록에서 볼 색이 보이면, 나중에 그 태그를 찾을 때 눈이 먼저 기억한다.
 */

interface TagInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  /** 같은 카테고리에서 이미 쓴 태그. 없을 수 있다. */
  suggestions: string[];
  max: number;
  maxLength: number;
  error?: string;
}

export function TagInput({
  values,
  onChange,
  suggestions,
  max,
  maxLength,
  error,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const id = fieldId('tags');
  const errorId = fieldErrorId('tags');
  const full = values.length >= max;

  function add(raw: string): void {
    const tag = raw.trim();
    if (tag === '' || full) return;
    if (values.includes(tag)) {
      // 같은 고민 안에서는 중복을 허용하지 않는다 (규칙 T-4).
      // 검증 메시지로 알리기보다 입력칸만 비우는 쪽이 덜 번거롭다.
      setDraft('');
      return;
    }
    onChange([...values, tag]);
    setDraft('');
  }

  function removeAt(index: number): void {
    onChange(values.filter((_, i) => i !== index));
  }

  /** Enter와 쉼표로 확정한다. 폼 제출로 새지 않게 preventDefault가 필수다. */
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
      return;
    }
    // 빈 입력칸에서 백스페이스를 누르면 마지막 태그를 지운다
    if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      removeAt(values.length - 1);
    }
  }

  const unused = suggestions.filter((s) => !values.includes(s));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-800">
          자유 태그
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
          <span className="sr-only"> (필수)</span>
        </label>
        <span className="text-xs text-slate-400">
          {values.length}/{max}
        </span>
      </div>

      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((tag, index) => (
            <li key={tag}>
              <span
                className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-xs ${TAG_TONE[toneForTag(tag)]}`}
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="rounded-full px-1 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current"
                >
                  <span aria-hidden>×</span>
                  <span className="sr-only">{tag} 태그 삭제</span>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <input
        id={id}
        type="text"
        value={draft}
        maxLength={maxLength}
        disabled={full}
        placeholder={
          full ? `최대 ${max}개까지 입력할 수 있습니다` : 'Enter 또는 쉼표로 확정'
        }
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClass}
      />

      {unused.length > 0 && !full && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">이 카테고리에서 쓴 태그</span>
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={`rounded-full border px-2 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 ${CHIP_TONE[toneForTag(s)].off}`}
            >
              #{s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
