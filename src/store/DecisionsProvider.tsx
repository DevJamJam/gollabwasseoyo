'use client';

/**
 * 전역 상태 + 저장소.
 *
 * 이 파일과 테스트만 storage.ts를 import한다.
 * 컴포넌트는 'localStorage'라는 단어를 모른다.
 * 이 규칙이 깨지면 나중에 서버로 옮길 때 비용이 다시 커진다.
 */

import { createContext, useEffect, useState } from 'react';

import { cloneCandidate, cloneDecision } from '@/lib/clone';
import { newId } from '@/lib/id';
import {
  checkDecisionInvariants,
  checkOrderInvariants,
  checkReviewInvariants,
  rejectInvalid,
} from '@/lib/invariants';
import { SAMPLE_DECISIONS } from '@/lib/sample';
import { load, save } from '@/lib/storage';
import type {
  ActionResult,
  CommitResult,
  Decision,
  DecisionCreateInput,
  DecisionEditInput,
  Order,
  OrderInput,
  Review,
  ReviewInput,
  StorageNoticeKind,
} from '@/lib/types';

export interface DecisionsContextValue {
  /** hydration 완료 여부. false면 화면은 스켈레톤을 그린다. */
  ready: boolean;
  notice: StorageNoticeKind | null;
  dismissNotice: () => void;

  decisions: Decision[];
  getById: (id: string) => Decision | undefined;

  createDecision: (input: DecisionCreateInput) => ActionResult<{ id: string }>;
  updateDecision: (id: string, input: DecisionEditInput) => ActionResult;
  removeDecision: (id: string) => ActionResult;

  setOrder: (id: string, input: OrderInput) => ActionResult;
  cancelOrder: (id: string) => ActionResult;
  setReview: (
    id: string,
    candidateId: string,
    input: ReviewInput,
  ) => ActionResult;
  removeReview: (id: string, candidateId: string) => ActionResult;

  seedSample: () => ActionResult;
  resetAll: () => ActionResult;
}

export const DecisionsContext = createContext<DecisionsContextValue | null>(
  null,
);

function nowIso(): string {
  return new Date().toISOString();
}

/** commit 실패를 액션 결과로 옮긴다. 성공/실패 분기를 아홉 번 반복하지 않기 위해. */
function fromCommit(result: CommitResult): ActionResult {
  return result.ok
    ? { ok: true, data: undefined }
    : { ok: false, reason: result.reason };
}

export function DecisionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<StorageNoticeKind | null>(null);

  /**
   * 마운트 후에만 읽는다.
   *
   * 렌더 중에 localStorage를 읽으면 서버가 그린 HTML(빈 목록)과
   * 클라이언트의 첫 렌더(데이터 있는 목록)가 달라져 hydration 오류가 난다.
   * useEffect는 브라우저에서만, 그것도 첫 렌더가 끝난 뒤에 실행된다.
   *
   * ── react-hooks/set-state-in-effect를 끈 이유 ──
   * 이 규칙은 "effect 안에서 setState를 부르면 렌더가 연쇄된다"고 경고한다.
   * 일반적으로는 맞다. 그런데 여기서 일어나는 추가 렌더는 정확히 한 번이고,
   * 그 한 번이 이 설계가 의도한 동작이다 — 첫 프레임은 스켈레톤,
   * 두 번째 프레임에 데이터. ready 플래그의 존재 이유가 그것이다.
   *
   * 규칙을 만족시키려면 useSyncExternalStore로 바꿔야 하는데,
   * 스냅샷 참조를 직접 캐싱해야 하고(매번 새 객체를 돌려주면 무한 렌더)
   * commit()을 유일한 쓰기 경로로 두는 지금 구조를 통째로 갈아엎게 된다.
   * 얻는 것에 비해 비용이 크고, 무엇보다 "왜 첫 프레임이 비어 있는가"가
   * 코드에서 사라진다.
   */
  useEffect(() => {
    const res = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecisions(res.data.decisions);
    if (!res.ok) setNotice(res.reason);
    setReady(true);
  }, []);

  /** unavailable은 지속되는 오류라 사용자가 닫을 수 없다. */
  function dismissNotice(): void {
    setNotice((current) => (current === 'unavailable' ? current : null));
  }

  /**
   * 모든 쓰기가 지나가는 단 하나의 경로.
   *
   * 저장에 성공하기 전에는 React 상태를 건드리지 않는다.
   * 순서를 뒤집으면(상태 먼저, 저장 나중) 저장이 실패해도 화면은 성공한 것처럼
   * 넘어가고, 새로고침하는 순간 데이터가 사라진다. 사용자는 뭘 잃었는지도 모른다.
   *
   * updatedAt도 next를 만들 때 넣으므로, 저장이 실패하면 next가 통째로
   * 버려져서 화면의 updatedAt은 이전 값 그대로 남는다. 따로 처리할 게 없다.
   */
  function commit(next: Decision[]): CommitResult {
    const result = save({ version: 1, decisions: next });

    if (!result.ok) {
      setNotice(result.reason);
      return result; // 화면 상태는 그대로
    }

    setDecisions(next);

    // quota는 '이번 저장 시도'의 실패다. 저장에 성공했으면 더 이상 참이 아니다.
    // corrupted와 unavailable은 저장 성공으로 해소되는 상태가 아니라 건드리지 않는다.
    setNotice((current) => (current === 'quota' ? null : current));

    return { ok: true };
  }

  function getById(id: string): Decision | undefined {
    return decisions.find((d) => d.id === id);
  }

  /* ── 고민 ──────────────────────────────────────────────── */

  function createDecision(
    input: DecisionCreateInput,
  ): ActionResult<{ id: string }> {
    const violation = checkDecisionInvariants(input);
    if (violation) return rejectInvalid(violation, 'createDecision');

    const ts = nowIso();
    const created: Decision = {
      id: newId(),
      title: input.title,
      category: input.category,
      tags: [...input.tags],
      purpose: input.purpose,
      budget: input.budget,
      candidates: input.candidates.map(cloneCandidate),
      order: null,
      createdAt: ts,
      updatedAt: ts,
    };

    const r = commit([created, ...decisions]);
    if (!r.ok) return { ok: false, reason: r.reason };
    return { ok: true, data: { id: created.id } };
  }

  function updateDecision(
    id: string,
    input: DecisionEditInput,
  ): ActionResult {
    const target = decisions.find((d) => d.id === id);
    if (!target) return { ok: false, reason: 'not_found' };

    const violation = checkDecisionInvariants(input);
    if (violation) return rejectInvalid(violation, 'updateDecision');

    // 구매한 후보가 후보 목록에서 사라지면 주문이 유령을 가리키게 된다
    if (target.order) {
      const ids = new Set(input.candidates.map((c) => c.id));
      const missing = target.order.items.some((it) => !ids.has(it.candidateId));
      if (missing) {
        return rejectInvalid('purchased_candidate_missing', 'updateDecision');
      }
    }

    const next = decisions.map((d) =>
      d.id !== id
        ? d
        : {
            ...d, // id · createdAt · order는 그대로 유지된다
            title: input.title,
            category: input.category,
            tags: [...input.tags],
            purpose: input.purpose,
            budget: input.budget,
            candidates: input.candidates.map(cloneCandidate),
            updatedAt: nowIso(),
          },
    );

    return fromCommit(commit(next));
  }

  function removeDecision(id: string): ActionResult {
    if (!decisions.some((d) => d.id === id)) {
      return { ok: false, reason: 'not_found' };
    }
    return fromCommit(commit(decisions.filter((d) => d.id !== id)));
  }

  /* ── 구매 ──────────────────────────────────────────────── */

  function setOrder(id: string, input: OrderInput): ActionResult {
    const target = decisions.find((d) => d.id === id);
    if (!target) return { ok: false, reason: 'not_found' };

    const violation = checkOrderInvariants(target, input);
    if (violation) return rejectInvalid(violation, 'setOrder');

    // 기존 평가는 같은 candidateId에 대해서만 이어붙인다
    const previousReviews = new Map(
      (target.order?.items ?? []).map((it) => [it.candidateId, it.review]),
    );

    const hasAnyReview = [...previousReviews.values()].some((r) => r !== null);

    // 평가가 하나라도 있으면 '어떤 후보를 샀는가'는 고정한다.
    // 후보가 바뀌면 그 평가가 대상을 잃기 때문이다.
    // 단가·수량·구성량·주문 정보의 정정은 막지 않는다 —
    // 금액 오타를 고치려고 평가를 다시 쓰게 만들 이유가 없다.
    if (hasAnyReview) {
      const before = new Set(previousReviews.keys());
      const after = new Set(input.items.map((item) => item.candidateId));

      const sameSet =
        before.size === after.size && [...before].every((cid) => after.has(cid));

      if (!sameSet) {
        return rejectInvalid('order_candidate_set_locked', 'setOrder');
      }
    }

    const order: Order = {
      purchasedAt: input.purchasedAt,
      totalPaid: input.totalPaid,
      seller: input.seller,
      reason: input.reason,
      items: input.items.map((it) => ({
        ...it,
        amount: it.amount ? { ...it.amount } : undefined,
        review: previousReviews.get(it.candidateId) ?? null,
      })),
    };

    const next = decisions.map((d) =>
      d.id === id ? { ...d, order, updatedAt: nowIso() } : d,
    );

    return fromCommit(commit(next));
  }

  function cancelOrder(id: string): ActionResult {
    const target = decisions.find((d) => d.id === id);

    // 고민이 없거나 취소할 주문이 없으면 데이터도 updatedAt도 건드리지 않는다.
    // 성공으로 처리하면 목록 정렬 순서만 이유 없이 바뀐다.
    if (!target?.order) return { ok: false, reason: 'not_found' };

    // order = null 한 줄로 구매 상품·주문 정보·모든 평가가 함께 사라진다
    const next = decisions.map((d) =>
      d.id === id ? { ...d, order: null, updatedAt: nowIso() } : d,
    );

    return fromCommit(commit(next));
  }

  /* ── 평가 ──────────────────────────────────────────────── */

  function setReview(
    id: string,
    candidateId: string,
    input: ReviewInput,
  ): ActionResult {
    const target = decisions.find((d) => d.id === id);
    if (!target?.order) return { ok: false, reason: 'not_found' };

    const exists = target.order.items.some(
      (it) => it.candidateId === candidateId,
    );
    if (!exists) return { ok: false, reason: 'not_found' };

    const violation = checkReviewInvariants(input);
    if (violation) return rejectInvalid(violation, 'setReview');

    const review: Review = {
      ...input,
      goods: [...input.goods],
      bads: [...input.bads],
      updatedAt: nowIso(),
    };

    const next = decisions.map((d) => {
      if (d.id !== id || !d.order) return d;
      return {
        ...d,
        order: {
          ...d.order,
          items: d.order.items.map((it) =>
            it.candidateId === candidateId ? { ...it, review } : it,
          ),
        },
        updatedAt: nowIso(),
      };
    });

    return fromCommit(commit(next));
  }

  /**
   * 상품별 평가 삭제.
   *
   * 바뀌는 것은 한 항목의 review와 updatedAt뿐이다.
   * 상태값을 손대지 않고, order를 지우지 않고, 다른 상품도 건드리지 않는다.
   * 상태와 진행률은 저장하지 않으므로 getStatus / getReviewProgress가 다시 계산한다.
   *
   * 평가 완료 → 구매 완료라는 '되돌아가는' 전환이 이 한 줄로 성립한다.
   */
  function removeReview(id: string, candidateId: string): ActionResult {
    const target = decisions.find((d) => d.id === id);
    if (!target?.order) return { ok: false, reason: 'not_found' };

    const item = target.order.items.find(
      (it) => it.candidateId === candidateId,
    );

    // 평가가 없는 상품에는 지울 것이 없다
    if (!item || item.review === null) {
      return { ok: false, reason: 'not_found' };
    }

    const next = decisions.map((d) => {
      if (d.id !== id || d.order === null) return d;
      return {
        ...d,
        order: {
          ...d.order,
          items: d.order.items.map((it) =>
            it.candidateId === candidateId ? { ...it, review: null } : it,
          ),
        },
        updatedAt: nowIso(),
      };
    });

    return fromCommit(commit(next));
  }

  /* ── 샘플과 초기화 ──────────────────────────────────────── */

  function seedSample(): ActionResult {
    // 이미 기록이 있으면 덮어쓰지 않는다
    if (decisions.length > 0) {
      return rejectInvalid('sample_not_empty', 'seedSample');
    }

    // 컴포넌트가 임의의 Decision[]을 주입하지 못하도록 Provider가 샘플을 소유한다.
    // 복사하지 않으면 사용자가 샘플을 수정할 때 모듈 상수가 오염된다.
    return fromCommit(commit(SAMPLE_DECISIONS.map(cloneDecision)));
  }

  function resetAll(): ActionResult {
    return fromCommit(commit([]));
  }

  const value: DecisionsContextValue = {
    ready,
    notice,
    dismissNotice,
    decisions,
    getById,
    createDecision,
    updateDecision,
    removeDecision,
    setOrder,
    cancelOrder,
    setReview,
    removeReview,
    seedSample,
    resetAll,
  };

  return (
    <DecisionsContext.Provider value={value}>
      {children}
    </DecisionsContext.Provider>
  );
}
