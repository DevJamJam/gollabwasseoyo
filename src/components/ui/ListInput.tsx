'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { fieldErrorId, fieldId, flexInputClass } from './Field';

/**
 * 짧은 문장 여러 개를 받는 입력. 기대되는 점 · 걱정되는 점 · 만족한 점 · 아쉬운 점 네 곳에서 쓴다.
 *
 * 여기서는 max에 도달하면 *추가* 버튼을 비활성한다. 사용자가 네 번째를
 * 입력하고 제출한 뒤에야 "3개까지"라고 알려주는 것보다 낫다.
 *
 * 그런데도 validateCandidateForm에 개수 검사가 남아 있다. 죽은 코드가 아니다 —
 * 저장소 검증(isCandidateShape)은 배열 길이를 보지 않기 때문에,
 * 손상된 데이터에서 4개짜리 목록이 수정 폼으로 흘러드는 경로가 실제로 있다.
 * 그때는 이 검증이 유일한 방어선이다.
 *
 * 이미 들어 있는 항목을 잘라내지는 않는다. *추가를 막는 것*과
 * *입력된 값을 조용히 버리는 것*은 다른 일이다. 앞은 즉시 보이고 뒤는 안 보인다.
 */

interface ListInputProps {
  name: string;
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  max: number;
  maxLength: number;
  placeholder?: string;
  error?: string;
}

export function ListInput({
  name,
  label,
  values,
  onChange,
  max,
  maxLength,
  placeholder,
  error,
}: ListInputProps) {
  const [draft, setDraft] = useState('');

  const id = fieldId(name);
  const errorId = fieldErrorId(name);
  const full = values.length >= max;
  const canAdd = draft.trim() !== '' && !full;

  function add(): void {
    if (!canAdd) return;
    onChange([...values, draft.trim()]);
    setDraft('');
  }

  function removeAt(index: number): void {
    onChange(values.filter((_, i) => i !== index));
  }

  /**
   * Enter로도 추가한다.
   * 이 컴포넌트는 <form> 안에 들어가므로 preventDefault를 빠뜨리면
   * Enter가 폼 전체를 제출해 버린다.
   */
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    add();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-800">
          {label}
        </label>
        <span className="text-xs text-slate-400">
          {values.length}/{max}
        </span>
      </div>

      {values.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {values.map((value, index) => (
            // 같은 문장을 두 번 쓸 수 있으므로 값을 key로 쓰면 안 된다.
            // 삭제만 있고 순서가 바뀌지 않아 index로 충분하다.
            <li
              key={index}
              className="flex items-center gap-2 rounded-md bg-slate-50 py-1.5 pl-3 pr-1.5"
            >
              {/* min-w-0이 없으면 긴 문장이 칸을 밀어내 가로로 넘친다 */}
              <span className="min-w-0 flex-1 break-words text-sm text-slate-700">
                {value}
              </span>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
              >
                <span aria-hidden>×</span>
                <span className="sr-only">{value} 삭제</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          maxLength={maxLength}
          disabled={full}
          placeholder={full ? `최대 ${max}개까지 입력할 수 있습니다` : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={flexInputClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className="h-11 shrink-0 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          추가
        </button>
      </div>

      {error && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
