/**
 * @vitest-environment jsdom
 */

/**
 * 홈 화면의 전체 초기화.
 *
 * 이 앱에서 한 번에 제일 많이 잃는 동작이다. 고민 하나를 지우는 것과 달리
 * 되돌릴 방법이 아무것도 없다. 데이터가 이 브라우저에만 있어서
 * 다른 곳에 사본이 남지 않는다.
 *
 * 원래 window.confirm을 쓰고 있었다. 다른 삭제는 전부 ConfirmDialog인데
 * 제일 위험한 것만 브라우저 기본 창이었고, 무엇이 사라지는지도 말해주지 않았다.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeView } from '@/components/home/HomeView';
import type { Decision, StoreSchema } from '@/lib/types';
import { DecisionsProvider } from '@/store/DecisionsProvider';

import { makeCandidate, makeDecision, makeReview } from './factory';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const STORAGE_KEY = 'gollab:v1';

/* ────────────────────────────────────────────────────────────
   픽스처 — 고민 2개, 후보 3개, 평가 1개
   ──────────────────────────────────────────────────────────── */

function twoDecisions(): Decision[] {
  return [
    makeDecision({
      id: 'd1',
      title: '겨울 홈카페 원두',
      candidates: [
        makeCandidate({ id: 'c1', name: '올드독' }),
        makeCandidate({ id: 'c2', name: '블렌드' }),
      ],
      order: {
        purchasedAt: '2026-01-12',
        totalPaid: 18000,
        reason: '실패가 없어서',
        items: [
          {
            candidateId: 'c1',
            unitPrice: 18000,
            quantity: 1,
            review: makeReview(),
          },
        ],
      },
    }),
    makeDecision({
      id: 'd2',
      title: '재택용 키보드',
      candidates: [makeCandidate({ id: 'c3', name: 'RC930-87' })],
      order: null,
    }),
  ];
}

function renderHome(decisions: Decision[]) {
  const data: StoreSchema = { version: 1, decisions };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  render(
    <DecisionsProvider>
      <HomeView filters={{}} />
    </DecisionsProvider>,
  );

  return { user: userEvent.setup() };
}

function stored(): Decision[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error('저장된 것이 없습니다.');
  return (JSON.parse(raw) as StoreSchema).decisions;
}

const openResetDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '전체 초기화' }));
  return screen.getByRole('dialog');
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

/* ══════════════════════════════════════════════════════════
   블록 52 — 전체 초기화 ⭐
   ══════════════════════════════════════════════════════════ */

describe('블록 52 — 전체 초기화', () => {
  it('브라우저 기본 창이 아니라 확인 다이얼로그가 뜬다', async () => {
    // window.confirm이 남아 있으면 이 스파이가 불린다
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValue(false);

    const { user } = renderHome(twoDecisions());
    await user.click(screen.getByRole('button', { name: '전체 초기화' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('무엇이 몇 개 사라지는지 말해준다', async () => {
    const { user } = renderHome(twoDecisions());

    const dialog = await openResetDialog(user);

    expect(
      within(dialog).getByText('고민 2개, 후보 3개, 평가 1개가 사라집니다.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/다른 곳에 남아 있는 사본이 없습니다/),
    ).toBeInTheDocument();
  });

  it('평가가 없으면 평가 얘기를 하지 않는다', async () => {
    const noReview = twoDecisions().map((d) => ({ ...d, order: null }));
    const { user } = renderHome(noReview);

    const dialog = await openResetDialog(user);

    expect(
      within(dialog).getByText('고민 2개, 후보 3개가 사라집니다.'),
    ).toBeInTheDocument();
  });

  it('취소하면 아무것도 지워지지 않는다', async () => {
    const { user } = renderHome(twoDecisions());

    const dialog = await openResetDialog(user);
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(stored()).toHaveLength(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('확정하면 전부 지워지고 초기화 버튼도 사라진다', async () => {
    const { user } = renderHome(twoDecisions());

    const dialog = await openResetDialog(user);
    await user.click(
      within(dialog).getByRole('button', { name: '전체 초기화' }),
    );

    expect(stored()).toEqual([]);
    // 지울 것이 없으면 버튼도 없다
    expect(
      screen.queryByRole('button', { name: '전체 초기화' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('겨울 홈카페 원두')).not.toBeInTheDocument();
  });

  it('기록이 없으면 초기화 버튼이 처음부터 없다', () => {
    renderHome([]);

    expect(
      screen.queryByRole('button', { name: '전체 초기화' }),
    ).not.toBeInTheDocument();
  });
});
