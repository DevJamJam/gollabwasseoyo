'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { flexInputClass } from '@/components/ui/Field';
import { cloneCandidateForImport } from '@/lib/clone';
import { getPastCandidates } from '@/lib/derive';
import type { PastCandidate } from '@/lib/derive';
import { formatKRW } from '@/lib/format';
import { newId } from '@/lib/id';
import type { Candidate } from '@/lib/types';
import { useDecisions } from '@/store/useDecisions';

/**
 * 과거 후보 불러오기 (규칙 L-1 ~ L-3).
 *
 * ── 왜 불러오는가 ──
 * 사지 않은 후보도 지워지지 않는다. 지난번에 예산 때문에 접었던 키보드를
 * 다음 고민에서 다시 꺼내볼 수 있어야 한다. 그때 적어둔 걱정되는 점까지
 * 같이 따라오는 것이 이 기능의 값어치다.
 *
 * ── 왜 목록에 결과를 같이 보여주는가 ──
 * "그때 이걸 샀었나, 샀으면 어땠나"가 고르는 기준이다.
 * 이름만 나열하면 어느 것이 그 후보인지 알아도 다시 고를 이유는 알 수 없다.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (candidates: Candidate[]) => void;
  /** 지금 편집 중인 고민. 자기 후보는 목록에서 뺀다. */
  currentDecisionId?: string;
  /** 앞으로 몇 개까지 더 담을 수 있는가 (규칙 D-3) */
  remaining: number;
}

/** 후보 id는 고민 안에서만 유일하다고 보고 고민 id까지 붙여 키를 만든다. */
function keyOf(p: PastCandidate): string {
  return `${p.decisionId}:${p.candidate.id}`;
}

function matches(p: PastCandidate, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;

  const haystack = [
    p.candidate.name,
    p.candidate.brand ?? '',
    p.candidate.option ?? '',
    p.decisionTitle,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

export function PastCandidateModal({
  open,
  onClose,
  onImport,
  currentDecisionId,
  remaining,
}: Props) {
  const { decisions } = useDecisions();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const past = useMemo(
    () => getPastCandidates(decisions, currentDecisionId),
    [decisions, currentDecisionId],
  );

  const visible = past.filter((p) => matches(p, query));
  const full = selected.length >= remaining;

  function toggle(p: PastCandidate): void {
    const key = keyOf(p);

    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // 담을 자리가 없으면 늘리지 않는다. 담아두고 나중에 거절하면
      // 무엇이 빠졌는지 알 수 없다.
      if (prev.length >= remaining) return prev;
      return [...prev, key];
    });
  }

  function handleImport(): void {
    const picked = past.filter((p) => selected.includes(keyOf(p)));

    onImport(
      picked.map((p) =>
        cloneCandidateForImport(p.candidate, newId(), { reviewed: p.reviewed }),
      ),
    );

    setQuery('');
    setSelected([]);
  }

  function handleClose(): void {
    setQuery('');
    setSelected([]);
    onClose();
  }

  return (
    <Modal
      open={open}
      title="과거 후보 불러오기"
      onClose={handleClose}
      footer={
        <>
          <Button type="button" onClick={handleClose}>
            취소
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleImport}
            disabled={selected.length === 0}
          >
            {selected.length === 0
              ? '불러오기'
              : `${selected.length}개 불러오기`}
          </Button>
        </>
      }
    >
      {past.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-600">불러올 과거 후보가 없습니다.</p>
          <p className="mt-1.5 text-sm text-slate-500">
            다른 고민에 후보를 등록해두면 여기서 그대로 꺼내올 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="past-candidate-search"
              className="text-sm font-medium text-slate-800"
            >
              검색
            </label>
            <input
              id="past-candidate-search"
              type="search"
              value={query}
              placeholder="상품명 · 브랜드 · 고민 제목"
              onChange={(e) => setQuery(e.target.value)}
              className={flexInputClass}
            />
          </div>

          <p className="text-xs text-slate-500">
            {full
              ? `더 담을 수 없습니다. 후보는 최대 4개까지입니다.`
              : `${remaining - selected.length}개 더 담을 수 있습니다.`}
          </p>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              검색 결과가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visible.map((p) => {
                const key = keyOf(p);
                const checked = selected.includes(key);

                return (
                  <li key={key}>
                    <label
                      className={[
                        'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3',
                        checked
                          ? 'border-blue-400 bg-blue-50/40'
                          : 'border-slate-200',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        // 자리가 없을 때는 새로 고르는 것만 막는다.
                        // 이미 고른 것은 풀 수 있어야 바꿔 담을 수 있다.
                        disabled={!checked && full}
                        onChange={() => toggle(p)}
                        className="mt-0.5 size-4 shrink-0 rounded border-slate-400 accent-blue-600 disabled:cursor-not-allowed"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-900">
                            {p.candidate.name}
                          </span>
                          {p.purchased && <Badge tone="blue">구매함</Badge>}
                          {p.reviewed && p.rating !== undefined && (
                            <Badge tone="amber">별점 {p.rating}</Badge>
                          )}
                        </span>

                        <span className="mt-0.5 block text-xs text-slate-500">
                          {formatKRW(p.candidate.comparePrice)}
                          {p.candidate.brand && ` · ${p.candidate.brand}`}
                          {` · ${p.decisionTitle}`}
                        </span>

                        {p.oneLine && (
                          <span className="mt-1 block text-xs text-slate-600">
                            “{p.oneLine}”
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
