'use client';

import Link from 'next/link';

import { DecisionForm } from '@/components/decision/DecisionForm';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cloneCandidateForEdit } from '@/lib/clone';
import { getLockedCandidateIds } from '@/lib/derive';
import { toDecisionForm } from '@/lib/parse';
import { useDecisions } from '@/store/useDecisions';

/**
 * 고민 수정.
 *
 * 상세 화면과 똑같은 3분기 구조를 쓴다.
 * ready 확인 → getById → 로딩/없음/정상. 두 번 반복하면서 익히는 패턴이다.
 *
 * decision.candidates를 그대로 폼 초기값으로 주면, 폼 안에서 후보를
 * 고치는 순간 Provider가 들고 있는 원본까지 같이 바뀐다.
 * 얕은 복사(`{...c}`)로는 부족하다 — pros·cons·amount가 여전히 같은 객체다.
 *
 * 그러면 '취소'와 '저장 실패'가 의미를 잃는다.
 * 되돌릴 원본이 이미 바뀌어 있기 때문이다.
 */
export function EditDecisionView({ id }: { id: string }) {
  const { ready, getById } = useDecisions();

  // ① 아직 저장소를 읽지 않았다
  if (!ready) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // ② 읽었는데 없다
  const decision = getById(id);
  if (!decision) {
    return (
      <EmptyState
        title="수정할 기록을 찾을 수 없습니다"
        description="삭제되었거나 잘못된 주소입니다."
        action={
          <Link href="/">
            <Button variant="primary">홈으로</Button>
          </Link>
        }
      />
    );
  }

  // ③ 있다 — 도메인 값을 폼 값으로 바꿔 넣는다
  return (
    <DecisionForm
      mode="edit"
      decisionId={decision.id}
      initialForm={toDecisionForm(decision)}
      initialCandidates={decision.candidates.map(cloneCandidateForEdit)}
      lockedCandidateIds={getLockedCandidateIds(decision)}
    />
  );
}
