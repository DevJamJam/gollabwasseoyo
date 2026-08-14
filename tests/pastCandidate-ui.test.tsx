/**
 * @vitest-environment jsdom
 */

/**
 * 과거 후보 불러오기의 화면 동작.
 *
 * 순수 함수는 "무엇을 복사할지"까지만 안다.
 * 목록에서 자기 후보가 빠지는지, 남은 자리를 넘겨 담지 못하는지,
 * 불러온 것이 실제로 폼에 들어가는지는 렌더해서 봐야 한다.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DecisionForm } from '@/components/decision/DecisionForm';
import { toDecisionForm } from '@/lib/parse';
import type { Candidate, Decision, StoreSchema } from '@/lib/types';
import { DecisionsProvider } from '@/store/DecisionsProvider';

import { makeCandidate, makeDecision, makeReview } from './factory';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const STORAGE_KEY = 'gollab:v1';

/* ────────────────────────────────────────────────────────────
   픽스처
   ──────────────────────────────────────────────────────────── */

/** 지금 수정 중인 고민. 후보 하나가 이미 들어 있다. */
function current(candidates: Candidate[] = [makeCandidate({ id: 'now1', name: '지금 후보' })]): Decision {
  return makeDecision({ id: 'now', title: '재택용 키보드', candidates });
}

/** 과거 고민. 산 것 하나(평가 있음), 안 산 것 하나. */
function past(): Decision {
  return makeDecision({
    id: 'past',
    title: '겨울 홈카페 원두',
    candidates: [
      makeCandidate({
        id: 'p1',
        name: '올드독',
        comparePrice: 18000,
        brand: '프릳츠',
        familiarity: 'new',
      }),
      makeCandidate({ id: 'p2', name: '디카페인', comparePrice: 24000 }),
    ],
    order: {
      purchasedAt: '2026-01-12',
      totalPaid: 18000,
      reason: '실패가 없어서',
      items: [
        {
          candidateId: 'p1',
          unitPrice: 18000,
          quantity: 1,
          review: makeReview({ rating: 4, oneLine: '늘 먹던 맛' }),
        },
      ],
    },
  });
}

function renderEditForm(decisions: Decision[], editing: Decision) {
  const data: StoreSchema = { version: 1, decisions };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  render(
    <DecisionsProvider>
      <DecisionForm
        mode="edit"
        decisionId={editing.id}
        initialForm={toDecisionForm(editing)}
        initialCandidates={editing.candidates}
        lockedCandidateIds={[]}
      />
    </DecisionsProvider>,
  );

  return { user: userEvent.setup() };
}

const openImport = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '과거 후보 불러오기' }));
  return screen.getByRole('dialog');
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

/* ══════════════════════════════════════════════════════════
   블록 48 — 불러오기 목록
   ══════════════════════════════════════════════════════════ */

describe('블록 48 — 불러오기 목록', () => {
  it('다른 고민의 후보만 보인다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);

    expect(within(dialog).getByText('올드독')).toBeInTheDocument();
    expect(within(dialog).getByText('디카페인')).toBeInTheDocument();
    // 자기 후보를 자기한테 불러올 이유가 없다
    expect(within(dialog).queryByText('지금 후보')).not.toBeInTheDocument();
  });

  it('그때 어떻게 됐는지를 같이 보여준다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);

    // 이름만 나열하면 다시 고를 이유를 알 수 없다
    expect(within(dialog).getByText('구매함')).toBeInTheDocument();
    expect(within(dialog).getByText('별점 4')).toBeInTheDocument();
    expect(within(dialog).getByText(/늘 먹던 맛/)).toBeInTheDocument();

    // 어느 고민에서 왔는지는 줄마다 붙는다
    expect(within(dialog).getAllByText(/겨울 홈카페 원두/)).toHaveLength(2);
  });

  it('불러올 것이 없으면 그렇다고 말한다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing], editing);

    const dialog = await openImport(user);

    expect(
      within(dialog).getByText('불러올 과거 후보가 없습니다.'),
    ).toBeInTheDocument();
  });

  it('검색으로 좁힌다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);
    await user.type(within(dialog).getByLabelText('검색'), '프릳츠');

    expect(within(dialog).getByText('올드독')).toBeInTheDocument();
    expect(within(dialog).queryByText('디카페인')).not.toBeInTheDocument();
  });

  it('검색 결과가 없으면 그렇다고 말한다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);
    await user.type(within(dialog).getByLabelText('검색'), '없는상품');

    expect(within(dialog).getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 49 — 골라서 담기 ⭐
   ══════════════════════════════════════════════════════════ */

describe('블록 49 — 골라서 담기', () => {
  it('고르기 전에는 불러오기 버튼을 누를 수 없다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);

    expect(
      within(dialog).getByRole('button', { name: '불러오기' }),
    ).toBeDisabled();
  });

  it('고른 개수가 버튼에 나온다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);
    await user.click(within(dialog).getAllByRole('checkbox')[0]);

    expect(
      within(dialog).getByRole('button', { name: '1개 불러오기' }),
    ).toBeEnabled();
  });

  it('불러오면 후보 목록에 들어간다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);
    await user.click(within(dialog).getAllByRole('checkbox')[0]);
    await user.click(within(dialog).getByRole('button', { name: '1개 불러오기' }));

    // 모달이 닫히고 후보가 늘어난다
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('올드독')).toBeInTheDocument();
    expect(screen.getByText('2/4')).toBeInTheDocument();
  });

  it('한 번에 여러 개를 담는다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);
    for (const box of within(dialog).getAllByRole('checkbox')) {
      await user.click(box);
    }
    await user.click(within(dialog).getByRole('button', { name: '2개 불러오기' }));

    expect(screen.getByText('올드독')).toBeInTheDocument();
    expect(screen.getByText('디카페인')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
  });

  it('취소하면 담기지 않는다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);
    await user.click(within(dialog).getAllByRole('checkbox')[0]);
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(screen.queryByText('올드독')).not.toBeInTheDocument();
    expect(screen.getByText('1/4')).toBeInTheDocument();
  });

  it('다시 열면 앞서 고른 것이 남아 있지 않다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const first = await openImport(user);
    await user.click(within(first).getAllByRole('checkbox')[0]);
    await user.click(within(first).getByRole('button', { name: '취소' }));

    const second = await openImport(user);
    expect(
      within(second).getByRole('button', { name: '불러오기' }),
    ).toBeDisabled();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 50 — 후보는 최대 4개다 (규칙 D-3) ⭐
   ══════════════════════════════════════════════════════════ */

describe('블록 50 — 후보는 최대 4개다', () => {
  /** 이미 3개가 들어 있어 한 자리만 남았다. */
  function almostFull(): Decision {
    return current([
      makeCandidate({ id: 'n1', name: '지금 1' }),
      makeCandidate({ id: 'n2', name: '지금 2' }),
      makeCandidate({ id: 'n3', name: '지금 3' }),
    ]);
  }

  it('남은 자리를 알려준다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);

    expect(
      within(dialog).getByText('3개 더 담을 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('자리가 없으면 더 고를 수 없다', async () => {
    const editing = almostFull();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);
    const boxes = within(dialog).getAllByRole('checkbox');

    await user.click(boxes[0]);

    // 한 자리뿐이므로 두 번째는 잠긴다.
    // 담아두고 나중에 거절하면 무엇이 빠졌는지 알 수 없다.
    expect(boxes[1]).toBeDisabled();
    expect(
      within(dialog).getByText('더 담을 수 없습니다. 후보는 최대 4개까지입니다.'),
    ).toBeInTheDocument();
  });

  it('고른 것은 다시 풀 수 있다 — 바꿔 담을 수 있어야 한다', async () => {
    const editing = almostFull();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);
    const boxes = within(dialog).getAllByRole('checkbox');

    await user.click(boxes[0]);
    expect(boxes[0]).toBeEnabled(); // 자리가 찼어도 스스로는 풀 수 있다

    await user.click(boxes[0]);
    expect(boxes[1]).toBeEnabled(); // 자리가 나면 다른 것을 고를 수 있다
  });

  it('네 개가 다 차면 불러오기 버튼이 잠긴다', async () => {
    const editing = current([
      makeCandidate({ id: 'n1', name: '지금 1' }),
      makeCandidate({ id: 'n2', name: '지금 2' }),
      makeCandidate({ id: 'n3', name: '지금 3' }),
      makeCandidate({ id: 'n4', name: '지금 4' }),
    ]);
    renderEditForm([editing, past()], editing);

    expect(
      screen.getByRole('button', { name: '과거 후보 불러오기' }),
    ).toBeDisabled();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 51 — 불러온 뒤에도 원본은 그대로다
   ══════════════════════════════════════════════════════════ */

describe('블록 51 — 불러온 뒤에도 원본은 그대로다', () => {
  it('저장해도 과거 고민의 후보는 안 바뀐다', async () => {
    const editing = current();
    const { user } = renderEditForm([editing, past()], editing);

    const dialog = await openImport(user);
    await user.click(within(dialog).getAllByRole('checkbox')[0]);
    await user.click(within(dialog).getByRole('button', { name: '1개 불러오기' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored = (JSON.parse(raw!) as StoreSchema).decisions;

    const now = stored.find((d) => d.id === 'now');
    const before = stored.find((d) => d.id === 'past');

    // 불러온 쪽은 늘었다
    expect(now?.candidates).toHaveLength(2);

    // 원본은 그대로다 — id도 다르다
    expect(before?.candidates).toHaveLength(2);
    expect(before?.candidates[0].id).toBe('p1');
    expect(now?.candidates[1].id).not.toBe('p1');

    // 평가가 있었으므로 사용 경험이 used로 바뀐다 (규칙 L-2)
    expect(now?.candidates[1].familiarity).toBe('used');
    // 원본의 값은 건드리지 않는다
    expect(before?.candidates[0].familiarity).toBe('new');
  });
});
