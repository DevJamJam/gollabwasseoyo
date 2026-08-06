'use client';

import { useState } from 'react';

import { CandidateCard } from '@/components/decision/CandidateCard';
import { isPurchased } from '@/lib/derive';
import type { Decision } from '@/lib/types';

/**
 * 후보를 나란히 놓는 비교 영역.
 *
 * ── 열 수를 auto-fit으로 두는 이유 ──
 * 후보는 1~4개로 달라진다. 열 수를 4로 고정하면 후보가 2개일 때
 * 오른쪽에 빈 칸 두 개가 남는다. grid-cols-4처럼 개수를 박지 않고
 * "240px보다 크게, 들어가는 만큼" 이라고만 적으면 화면 폭과 후보 수에
 * 따라 알아서 나뉜다.
 *
 *   repeat(auto-fit, minmax(240px, 1fr))
 *   → 각 칸은 최소 240px, 남는 공간은 똑같이 나눠 갖는다
 *   → 폭이 모자라면 줄을 바꾼다
 *
 * 모바일에서 가로 스크롤로 비교하지 않는다. 후보가 4개까지라
 * 세로로 쌓는 편이 읽기 쉽다.
 */
export function CandidateCompare({ decision }: { decision: Decision }) {
  // 카드마다 따로 펼치면 줄이 어긋나 비교가 깨진다. 상태를 여기서 하나만 든다.
  const [expanded, setExpanded] = useState(false);

  const single = decision.candidates.length === 1;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-800">
          후보 비교
          <span className="ml-1.5 text-slate-400">
            {decision.candidates.length}개
          </span>
        </h2>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="rounded px-1.5 py-1 text-xs text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          {expanded ? '상세정보 접기' : '상세정보 펼치기'}
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        {decision.candidates.map((c, i) => (
          <CandidateCard
            key={c.id}
            index={i}
            candidate={c}
            purchased={isPurchased(decision, c.id)}
            expanded={expanded}
          />
        ))}
      </div>

      {single && (
        <p className="rounded-md bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
          비교 후보를 추가하면 다음 구매 판단에 더 도움이 됩니다.
        </p>
      )}
    </section>
  );
}
