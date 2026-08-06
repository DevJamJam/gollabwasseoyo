'use client';

import { useState } from 'react';

import { CandidateCard } from '@/components/decision/CandidateCard';
import { getPurchasedItem } from '@/lib/derive';
import type { Decision } from '@/lib/types';

/**
 * 후보를 나란히 놓는 비교 영역.
 *
 * ── 줄을 맞추려면 격자를 하나만 써야 한다 ──
 * 카드가 각자 자기 격자를 가지면, 항목 이름이 같아도 내용 줄 수가 다를 때
 * 아래쪽이 밀려서 어긋난다. 기대되는 점이 1개인 카드와 2개인 카드가 그렇다.
 *
 * 그래서 여기서 줄을 정의하고 각 카드가 그 줄을 물려받게 한다(subgrid).
 * 한 줄의 높이는 그 줄에서 가장 큰 칸에 맞춰진다.
 *
 * ── 나란히 놓일 때만 격자를 공유한다 ──
 * subgrid는 카드가 전부 '한 줄에' 있을 때만 성립한다. 화면이 좁아 카드가
 * 다음 줄로 넘어가면 격자가 깨진다. 그래서 lg 아래에서는 세로로 쌓고,
 * 그때는 애초에 나란히 비교하지 않으므로 줄을 맞출 필요가 없다.
 *
 * 모바일에서 가로 스크롤로 비교하지 않는다. 후보가 4개까지라
 * 세로로 쌓는 편이 읽기 쉽다.
 */

/**
 * 후보 수만큼 열을 만든다.
 *
 * Tailwind는 소스에 적힌 클래스 문자열을 훑어 CSS를 만들기 때문에
 * `lg:grid-cols-${n}` 처럼 조립하면 그 클래스가 생성되지 않는다.
 * 통째로 적어둔다.
 */
const LG_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

/**
 * 격자에 미리 잡아두는 줄 수.
 *
 * 실제로 그리는 줄은 접힘·구매 여부에 따라 11~19개다. 넉넉히 잡아두면
 * 남는 줄은 높이 0으로 접힌다. 카드마다 그리는 줄 수는 언제나 같으므로
 * (접힘 상태와 주문 유무를 모든 카드가 공유한다) 어긋날 일이 없다.
 */
const GRID_ROWS = 'lg:[grid-template-rows:repeat(19,auto)]';

export function CandidateCompare({ decision }: { decision: Decision }) {
  // 카드마다 따로 펼치면 줄 수가 달라져 비교가 깨진다. 상태를 여기서 하나만 든다.
  const [expanded, setExpanded] = useState(false);

  const count = decision.candidates.length;
  const single = count === 1;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-800">
          후보 비교
          <span className="ml-1.5 text-slate-400">{count}개</span>
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

      <div
        className={[
          'grid grid-cols-1 gap-3',
          // 나란히 놓일 때는 카드 사이만 띄우고 세로 간격은 0으로 둔다.
          // subgrid는 부모의 세로 간격을 물려받아서, 값이 있으면
          // 카드 안의 줄 사이까지 벌어진다.
          'lg:gap-x-3 lg:gap-y-0',
          LG_COLS[count] ?? LG_COLS[4],
          GRID_ROWS,
        ].join(' ')}
      >
        {decision.candidates.map((c, i) => (
          <CandidateCard
            key={c.id}
            index={i}
            candidate={c}
            purchase={getPurchasedItem(decision, c.id)}
            purchasedAt={decision.order?.purchasedAt}
            // 주문이 없으면 모든 카드가 `-`뿐이라 줄만 늘어난다.
            // 전부 함께 숨기므로 정렬은 그대로다.
            showPurchaseRows={decision.order !== null}
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
