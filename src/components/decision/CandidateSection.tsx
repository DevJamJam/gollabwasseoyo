'use client';

import { useState } from 'react';

import { CandidateFormModal } from '@/components/decision/CandidateFormModal';
import { CandidateSummaryCard } from '@/components/decision/CandidateSummaryCard';
import { Button } from '@/components/ui/Button';
import { canDeleteCandidate } from '@/lib/derive';
import { newId } from '@/lib/id';
import { toCandidateForm } from '@/lib/parse';
import type { Candidate, CandidateFormValues } from '@/lib/types';

/**
 * 2단계 — 후보 등록.
 *
 * 후보는 사용자가 *새 후보 추가*를 눌렀을 때만 생긴다 (규칙 C-1).
 * 빈 카드를 시스템이 미리 만들어두지 않는다. 안 채운 카드가 남으면
 * 그게 '아직 안 쓴 것'인지 '비워둔 것'인지 알 수 없다.
 */

const MAX = 4;

interface Props {
  candidates: Candidate[];
  onChange: (next: Candidate[]) => void;
  /** 구매되어 지울 수 없는 후보 id. 등록 화면에서는 항상 빈 배열. */
  lockedCandidateIds: string[];
  error?: string;
}

export function CandidateSection({
  candidates,
  onChange,
  lockedCandidateIds,
  error,
}: Props) {
  /** null이면 닫힘, 'new'면 추가, 객체면 수정 */
  const [editing, setEditing] = useState<
    null | 'new' | { id: string; form: CandidateFormValues }
  >(null);

  /**
   * 모달을 열 때마다 1씩 오르는 값. 모달의 key로 쓴다.
   *
   * key가 바뀌면 React는 그 컴포넌트를 버리고 새로 만든다.
   * 그러면 안에 있던 useState가 처음부터 시작하므로,
   * '이전 입력이 남아 있다'는 문제가 생길 수 없다.
   *
   * '새 후보 추가'를 두 번 연속 누르는 경우가 문제였다.
   * 넘기는 값(initial)이 두 번 다 undefined라서 값 비교로는 구분할 수 없다.
   * 열린 횟수를 세면 언제나 달라진다.
   */
  const [openCount, setOpenCount] = useState(0);

  function openNew(): void {
    setEditing('new');
    setOpenCount((n) => n + 1);
  }

  function openEdit(c: Candidate): void {
    setEditing({ id: c.id, form: toCandidateForm(c) });
    setOpenCount((n) => n + 1);
  }

  const full = candidates.length >= MAX;

  function upsert(candidate: Candidate): void {
    const exists = candidates.some((c) => c.id === candidate.id);

    onChange(
      exists
        ? candidates.map((c) => (c.id === candidate.id ? candidate : c))
        : [...candidates, candidate],
    );

    setEditing(null);
  }

  function remove(id: string): void {
    onChange(candidates.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-800">
          비교할 후보
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
        </h2>
        <span className="text-xs text-slate-400">
          {candidates.length}/{MAX}
        </span>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">
            아직 등록한 후보가 없습니다
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            비교할 상품을 추가해 고민을 기록해 보세요.
          </p>
          <div className="mt-5">
            <Button variant="primary" onClick={openNew}>
              + 새 후보 추가
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {candidates.map((c, i) => {
              const deletable = canDeleteCandidate(
                candidates,
                lockedCandidateIds,
                c.id,
              );

              return (
                <CandidateSummaryCard
                  key={c.id}
                  index={i}
                  candidate={c}
                  deletable={deletable}
                  undeletableReason={
                    lockedCandidateIds.includes(c.id)
                      ? '구매한 후보는 삭제할 수 없습니다. 구매 기록을 취소한 뒤 삭제하세요.'
                      : '후보가 하나뿐입니다. 마지막 후보를 없애려면 고민 전체를 삭제하세요.'
                  }
                  onEdit={() => openEdit(c)}
                  onDelete={() => remove(c.id)}
                />
              );
            })}
          </ul>

          <div>
            <Button onClick={openNew} disabled={full}>
              + 새 후보 추가
            </Button>
            {full && (
              <p className="mt-2 text-xs text-slate-500">
                후보는 최대 {MAX}개까지 등록할 수 있습니다.
              </p>
            )}
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* 열려 있을 때만 마운트한다. key가 바뀌면 안의 상태가 초기화된다. */}
      {editing !== null && (
        <CandidateFormModal
          key={openCount}
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSubmit={upsert}
          newId={newId}
        />
      )}
    </div>
  );
}
