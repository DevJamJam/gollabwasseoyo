/**
 * @vitest-environment jsdom
 */

/**
 * 상세 화면의 구매 영역 테스트.
 *
 * 여기서만 잡히는 것이 있다. 상태는 저장하지 않고 데이터에서 계산하는데
 * (`getStatus`), 그 계산이 맞아도 **화면이 다시 그려지지 않으면** 배지는
 * 옛날 값을 보여준다. 구매를 등록했는데 여전히 '고민 중'이라고 적혀 있는
 * 종류의 버그다. 순수 함수 테스트는 이걸 못 본다.
 *
 * 취소 확인 문구도 여기서 본다. 평가가 있을 때와 없을 때 문장이 갈리는데,
 * 그 분기가 화면에서 뒤집혀 있으면 "평가 2개가 사라진다"는 경고를 못 보고
 * 확인을 누르게 된다.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DecisionDetailView } from '@/components/decision/DecisionDetailView';
import { fieldId, itemFieldId } from '@/components/ui/Field';
import type { Decision, StoreSchema } from '@/lib/types';
import { DecisionsProvider } from '@/store/DecisionsProvider';

import { makeCandidate, makeDecision, makeReview } from './factory';

// 상세 화면은 삭제 후 router.replace('/')를 부른다.
// App Router 밖에서는 useRouter가 던지므로 최소한만 흉내 낸다.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const STORAGE_KEY = 'gollab:v1';

/* ────────────────────────────────────────────────────────────
   픽스처
   ──────────────────────────────────────────────────────────── */

function candidates() {
  return [
    makeCandidate({
      id: 'c1',
      name: '올드독',
      comparePrice: 18000,
      amount: { value: 200, unit: 'g' },
    }),
    makeCandidate({ id: 'c2', name: '블렌드', comparePrice: 16000 }),
  ];
}

function withoutOrder(): Decision {
  return makeDecision({ id: 'd1', candidates: candidates(), order: null });
}

/** 샀지만 아직 평가는 없다. */
function purchasedNoReview(): Decision {
  return makeDecision({
    id: 'd1',
    candidates: candidates(),
    order: {
      purchasedAt: '2026-01-12',
      totalPaid: 18000,
      seller: '네이버',
      reason: '실패가 없어서',
      items: [
        {
          candidateId: 'c1',
          unitPrice: 18000,
          quantity: 1,
          amount: { value: 200, unit: 'g' },
          review: null,
        },
      ],
    },
  });
}

/** 두 상품을 샀고 둘 다 평가했다. */
function purchasedTwoReviews(): Decision {
  return makeDecision({
    id: 'd1',
    candidates: candidates(),
    order: {
      purchasedAt: '2026-01-12',
      totalPaid: 47000,
      seller: '네이버',
      reason: '실패가 없어서',
      items: [
        {
          candidateId: 'c1',
          unitPrice: 18000,
          quantity: 1,
          amount: { value: 200, unit: 'g' },
          review: makeReview({ oneLine: '늘 먹던 맛' }),
        },
        {
          candidateId: 'c2',
          unitPrice: 16000,
          quantity: 2,
          review: makeReview({ oneLine: '산미가 있었다' }),
        },
      ],
    },
  });
}

/* ────────────────────────────────────────────────────────────
   렌더 도우미
   ──────────────────────────────────────────────────────────── */

function renderDetail(decision: Decision) {
  const data: StoreSchema = { version: 1, decisions: [decision] };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  render(
    <DecisionsProvider>
      <DecisionDetailView id={decision.id} />
    </DecisionsProvider>,
  );

  return { user: userEvent.setup() };
}

function storedDecision(): Decision {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error('저장된 것이 없습니다.');
  return (JSON.parse(raw) as StoreSchema).decisions[0];
}

/** 취소 확인 다이얼로그를 연다. */
async function openCancelDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '구매 기록 취소' }));

  return screen.getByRole('dialog');
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

/* ══════════════════════════════════════════════════════════
   블록 37 — 구매 영역의 세 가지 모습
   ══════════════════════════════════════════════════════════ */

describe('블록 37 — 구매 영역의 세 가지 모습', () => {
  it('주문이 없으면 빈 상태와 등록 버튼이 보인다', () => {
    renderDetail(withoutOrder());

    expect(screen.getByText('아직 구매하지 않았습니다.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '구매 등록하기' }),
    ).toBeInTheDocument();

    // 주문이 없으면 평가 영역도 없다
    expect(screen.queryByText(/상품 평가/)).not.toBeInTheDocument();
  });

  it('등록 버튼을 누르면 패널이 열린다', async () => {
    const { user } = renderDetail(withoutOrder());

    await user.click(screen.getByRole('button', { name: '구매 등록하기' }));

    expect(
      screen.getByRole('heading', { name: '구매 등록' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('아직 구매하지 않았습니다.')).not.toBeInTheDocument();
  });

  it('주문이 있으면 요약과 수정·취소 버튼이 보인다', () => {
    renderDetail(purchasedNoReview());

    // 후보 카드에도 같은 금액이 있으므로 요약 영역 안에서만 찾는다
    const summary = screen.getByRole('region', { name: '구매 기록' });

    expect(within(summary).getByText('18,000원')).toBeInTheDocument();
    expect(within(summary).getByText('2026.01.12 · 네이버')).toBeInTheDocument();
    expect(within(summary).getByText('실패가 없어서')).toBeInTheDocument();
    expect(
      within(summary).getByRole('button', { name: '구매정보 수정' }),
    ).toBeInTheDocument();
  });

  it('수정을 누르면 요약 대신 패널이 이긴다', async () => {
    const { user } = renderDetail(purchasedNoReview());

    await user.click(screen.getByRole('button', { name: '구매정보 수정' }));

    expect(
      screen.getByRole('heading', { name: '구매정보 수정' }),
    ).toBeInTheDocument();
    // 요약이 계속 남아 있으면 분기 순서가 뒤집힌 것이다
    expect(
      screen.queryByRole('heading', { name: '구매 기록' }),
    ).not.toBeInTheDocument();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 38 — 저장하면 배지가 따라 바뀐다 ⭐
   ══════════════════════════════════════════════════════════ */

describe('블록 38 — 저장하면 배지가 따라 바뀐다', () => {
  it('고민 중 → 구매 완료로 바뀌고 평가 진행률이 붙는다', async () => {
    const { user } = renderDetail(withoutOrder());

    expect(screen.getByText('고민 중')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '구매 등록하기' }));
    await user.click(document.getElementById(itemFieldId('c1', 'selected'))!);
    await user.type(
      document.getElementById(itemFieldId('c1', 'unitPrice'))!,
      '18000',
    );
    await user.type(document.getElementById(fieldId('totalPaid'))!, '18000');
    await user.type(document.getElementById(fieldId('reason'))!, '실패가 없어서');
    await user.click(screen.getByRole('button', { name: '구매 등록' }));

    // 패널이 닫히고 요약으로 바뀐다
    expect(
      screen.getByRole('heading', { name: '구매 기록' }),
    ).toBeInTheDocument();

    // 배지는 저장된 값이 아니라 데이터에서 계산된다
    expect(screen.getByText('구매 완료 0/1')).toBeInTheDocument();
    expect(screen.getByText('상품 평가 0/1')).toBeInTheDocument();
    expect(storedDecision().order?.totalPaid).toBe(18000);
  });
});

/* ══════════════════════════════════════════════════════════
   블록 39 — 구매 기록 취소 ⭐

   무엇이 함께 사라지는지를 문구가 말해줘야 한다.
   ══════════════════════════════════════════════════════════ */

describe('블록 39 — 구매 기록 취소', () => {
  it('평가가 있으면 몇 개가 함께 지워지는지 말한다', async () => {
    const { user } = renderDetail(purchasedTwoReviews());

    const dialog = await openCancelDialog(user);

    expect(
      within(dialog).getByText('이 구매에 쓴 상품 평가 2개도 함께 삭제됩니다.'),
    ).toBeInTheDocument();
  });

  it('평가가 없으면 평가 이야기를 하지 않는다', async () => {
    const { user } = renderDetail(purchasedNoReview());

    const dialog = await openCancelDialog(user);

    expect(within(dialog).queryByText(/상품 평가/)).not.toBeInTheDocument();
    expect(within(dialog).getByText(/구매일·결제금액/)).toBeInTheDocument();
  });

  it('다이얼로그의 취소를 누르면 아무것도 지워지지 않는다', async () => {
    const { user } = renderDetail(purchasedTwoReviews());

    const dialog = await openCancelDialog(user);
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(storedDecision().order).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: '구매 기록' }),
    ).toBeInTheDocument();
  });

  it('확정하면 주문과 평가가 함께 사라지고 후보는 남는다', async () => {
    const { user } = renderDetail(purchasedTwoReviews());

    const dialog = await openCancelDialog(user);
    await user.click(
      within(dialog).getByRole('button', { name: '구매 기록 취소' }),
    );

    const after = storedDecision();
    expect(after.order).toBeNull();
    // 후보와 고민은 그대로 남는다
    expect(after.candidates).toHaveLength(2);

    expect(screen.getByText('아직 구매하지 않았습니다.')).toBeInTheDocument();
    expect(screen.getByText('고민 중')).toBeInTheDocument();
    expect(screen.queryByText(/상품 평가/)).not.toBeInTheDocument();
  });
});
