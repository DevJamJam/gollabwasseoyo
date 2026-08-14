/**
 * @vitest-environment jsdom
 */

/**
 * 평가 영역의 화면 동작.
 *
 * 여기서 제일 중요한 것은 **되돌아가는 전환**이다.
 * 평가를 지우면 '평가 완료 → 구매 완료'로 상태가 거꾸로 간다.
 * 상태를 저장했다면 정방향 네 곳에 더해 역방향까지 구현해야 했고,
 * 역방향을 빠뜨리는 게 제일 흔한 버그다. 계산으로 두었으니
 * `review = null` 한 줄이면 되는데, **화면이 다시 그려지는지**는 별개다.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DecisionDetailView } from '@/components/decision/DecisionDetailView';
import { fieldId } from '@/components/ui/Field';
import type { Decision, StoreSchema } from '@/lib/types';
import { DecisionsProvider } from '@/store/DecisionsProvider';

import { makeCandidate, makeDecision, makeReview } from './factory';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const STORAGE_KEY = 'gollab:v1';

/* ────────────────────────────────────────────────────────────
   픽스처 — 두 개를 샀고 하나만 평가했다
   ──────────────────────────────────────────────────────────── */

function halfReviewed(): Decision {
  return makeDecision({
    id: 'd1',
    candidates: [
      makeCandidate({ id: 'c1', name: '올드독', comparePrice: 18000 }),
      makeCandidate({ id: 'c2', name: '블렌드', comparePrice: 16000 }),
    ],
    order: {
      purchasedAt: '2026-01-12',
      totalPaid: 50000,
      seller: '네이버',
      reason: '실패가 없어서',
      items: [
        {
          candidateId: 'c1',
          unitPrice: 18000,
          quantity: 1,
          review: makeReview({
            rating: 4,
            repurchase: 'yes',
            oneLine: '늘 먹던 맛',
            goods: ['일정한 맛'],
            bads: ['금방 떨어짐'],
            nextChange: '500g으로',
          }),
        },
        {
          candidateId: 'c2',
          unitPrice: 16000,
          quantity: 2,
          review: null,
        },
      ],
    },
  });
}

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

const reviewSection = () =>
  screen.getByRole('region', { name: '상품 평가' });

/** 상품 줄 하나. 이름으로 찾는다. */
function row(name: string): HTMLElement {
  const item = within(reviewSection())
    .getByText(name)
    .closest('li');
  if (!item) throw new Error(`줄을 찾을 수 없습니다: ${name}`);
  return item;
}

/** 유효한 평가 하나를 채운다. */
async function fillReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /3점/ }));
  await user.click(screen.getByRole('radio', { name: '고민' }));
  await user.type(document.getElementById(fieldId('oneLine'))!, '산미가 있었다');
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

/* ══════════════════════════════════════════════════════════
   블록 43 — 평가 목록
   ══════════════════════════════════════════════════════════ */

describe('블록 43 — 평가 목록', () => {
  it('구매한 상품마다 한 줄씩 나온다', () => {
    renderDetail(halfReviewed());

    expect(within(reviewSection()).getByText('올드독')).toBeInTheDocument();
    expect(within(reviewSection()).getByText('블렌드')).toBeInTheDocument();
    expect(screen.getByText('1/2 작성')).toBeInTheDocument();
  });

  it('평가한 상품은 별점과 후기를 보여준다', () => {
    renderDetail(halfReviewed());

    const written = row('올드독');

    expect(within(written).getByText('별점 4점')).toBeInTheDocument();
    expect(within(written).getByText('늘 먹던 맛')).toBeInTheDocument();
    expect(within(written).getByText(/다시 살 의향 있음/)).toBeInTheDocument();
    expect(within(written).getByText('일정한 맛')).toBeInTheDocument();
    expect(within(written).getByText(/500g으로/)).toBeInTheDocument();
  });

  it('안 쓴 상품은 비어 있다고 말하고 삭제 버튼이 없다', () => {
    renderDetail(halfReviewed());

    const empty = row('블렌드');

    expect(
      within(empty).getByText('아직 평가하지 않았습니다.'),
    ).toBeInTheDocument();
    expect(
      within(empty).getByRole('button', { name: '평가 쓰기' }),
    ).toBeInTheDocument();
    // 지울 것이 없으면 삭제 버튼도 없다
    expect(
      within(empty).queryByRole('button', { name: '평가 삭제' }),
    ).not.toBeInTheDocument();
  });

  it('평가한 상품의 버튼은 수정과 삭제다', () => {
    renderDetail(halfReviewed());

    const written = row('올드독');

    expect(
      within(written).getByRole('button', { name: '평가 수정' }),
    ).toBeInTheDocument();
    expect(
      within(written).getByRole('button', { name: '평가 삭제' }),
    ).toBeInTheDocument();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 44 — 평가 쓰기 ⭐
   ══════════════════════════════════════════════════════════ */

describe('블록 44 — 평가 쓰기', () => {
  it('별점은 진짜 라디오다 — 키보드로 고를 수 있다', async () => {
    const { user } = renderDetail(halfReviewed());

    await user.click(
      within(row('블렌드')).getByRole('button', { name: '평가 쓰기' }),
    );

    // <div onClick>이었다면 role이 radio가 아니라 아무것도 아니다
    expect(screen.getAllByRole('radio', { name: /점/ })).toHaveLength(5);

    const three = screen.getByRole('radio', { name: /3점/ });
    three.focus();
    expect(three).toHaveFocus();
  });

  it('빈 채로 제출하면 별점부터 걸리고 그리로 포커스가 간다', async () => {
    const { user } = renderDetail(halfReviewed());

    await user.click(
      within(row('블렌드')).getByRole('button', { name: '평가 쓰기' }),
    );
    await user.click(screen.getByRole('button', { name: '평가 저장' }));

    expect(screen.getByText('별점을 선택해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('재구매 의사를 선택해 주세요.')).toBeInTheDocument();
    expect(document.getElementById(fieldId('rating'))).toHaveFocus();
  });

  it('별점을 고르면 다음 오류인 재구매로 내려간다', async () => {
    const { user } = renderDetail(halfReviewed());

    await user.click(
      within(row('블렌드')).getByRole('button', { name: '평가 쓰기' }),
    );
    await user.click(screen.getByRole('radio', { name: /3점/ }));
    await user.click(screen.getByRole('button', { name: '평가 저장' }));

    expect(document.getElementById(fieldId('repurchase'))).toHaveFocus();
  });

  it('고른 별점의 뜻을 글자로도 보여준다', async () => {
    const { user } = renderDetail(halfReviewed());

    await user.click(
      within(row('블렌드')).getByRole('button', { name: '평가 쓰기' }),
    );

    expect(screen.getByText('아직 고르지 않았습니다')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /5점/ }));
    expect(screen.getByText('아주 만족')).toBeInTheDocument();
  });

  it('저장하면 상태가 구매 완료에서 평가 완료로 간다', async () => {
    const { user } = renderDetail(halfReviewed());

    expect(screen.getByText('구매 완료 1/2')).toBeInTheDocument();

    await user.click(
      within(row('블렌드')).getByRole('button', { name: '평가 쓰기' }),
    );
    await fillReview(user);
    await user.click(screen.getByRole('button', { name: '평가 저장' }));

    // 배지는 저장된 값이 아니라 데이터에서 다시 계산된다
    expect(screen.getByText('평가 완료')).toBeInTheDocument();
    expect(screen.getByText('2/2 작성')).toBeInTheDocument();

    const saved = storedDecision().order?.items[1].review;
    expect(saved?.rating).toBe(3);
    expect(saved?.oneLine).toBe('산미가 있었다');
    // updatedAt은 폼에 없고 Provider가 찍는다
    expect(saved?.updatedAt).toBeTruthy();
  });

  it('수정을 열면 기존 값이 복원된다', async () => {
    const { user } = renderDetail(halfReviewed());

    await user.click(
      within(row('올드독')).getByRole('button', { name: '평가 수정' }),
    );

    expect(screen.getByRole('radio', { name: /4점/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: '있음' })).toBeChecked();
    expect(document.getElementById(fieldId('oneLine'))).toHaveValue('늘 먹던 맛');
    expect(screen.getByText('일정한 맛')).toBeInTheDocument();
  });

  it('취소하면 아무것도 안 바뀐다', async () => {
    const { user } = renderDetail(halfReviewed());

    await user.click(
      within(row('올드독')).getByRole('button', { name: '평가 수정' }),
    );
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(storedDecision().order?.items[0].review?.oneLine).toBe('늘 먹던 맛');
    expect(screen.getByText('1/2 작성')).toBeInTheDocument();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 45 — 평가 삭제는 되돌아가는 전환이다 ⭐
   ══════════════════════════════════════════════════════════ */

describe('블록 45 — 평가 삭제는 되돌아가는 전환이다', () => {
  /** 두 개 다 평가해서 '평가 완료'로 만든다. */
  function allReviewed(): Decision {
    const d = halfReviewed();
    const order = d.order!;

    return {
      ...d,
      order: {
        ...order,
        items: order.items.map((it) =>
          it.review ? it : { ...it, review: makeReview() },
        ),
      },
    };
  }

  it('확인 문구가 무엇이 남는지 말해준다', async () => {
    const { user } = renderDetail(allReviewed());

    await user.click(
      within(row('올드독')).getByRole('button', { name: '평가 삭제' }),
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('올드독')).toBeInTheDocument();
    expect(within(dialog).getByText(/구매 기록은 그대로 남고/)).toBeInTheDocument();
  });

  it('취소하면 지워지지 않는다', async () => {
    const { user } = renderDetail(allReviewed());

    await user.click(
      within(row('올드독')).getByRole('button', { name: '평가 삭제' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }),
    );

    expect(storedDecision().order?.items[0].review).not.toBeNull();
  });

  it('지우면 평가 완료에서 구매 완료로 되돌아간다', async () => {
    const { user } = renderDetail(allReviewed());

    expect(screen.getByText('평가 완료')).toBeInTheDocument();

    await user.click(
      within(row('올드독')).getByRole('button', { name: '평가 삭제' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: '평가 삭제',
      }),
    );

    // 역방향 전환. getStatus가 다시 계산하고 화면이 따라간다
    expect(screen.getByText('구매 완료 1/2')).toBeInTheDocument();
    expect(screen.getByText('1/2 작성')).toBeInTheDocument();
  });

  it('구매 기록과 다른 상품의 평가는 그대로 남는다', async () => {
    const { user } = renderDetail(allReviewed());

    await user.click(
      within(row('올드독')).getByRole('button', { name: '평가 삭제' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: '평가 삭제',
      }),
    );

    const after = storedDecision();

    expect(after.order).not.toBeNull();
    expect(after.order?.totalPaid).toBe(50000);
    expect(after.order?.items[0].review).toBeNull();
    // 다른 상품은 건드리지 않는다
    expect(after.order?.items[1].review).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: '구매 기록' }),
    ).toBeInTheDocument();
  });
});
