/**
 * @vitest-environment jsdom
 */

/**
 * 구매 패널의 '화면 동작' 테스트.
 *
 * ── purchase.test.ts와 무엇이 다른가 ──
 * 그쪽은 순수 함수를 본다. validatePurchaseForm이 올바른 오류를 만드는지,
 * firstPurchaseErrorField가 올바른 대상을 고르는지.
 *
 * 여기는 **그 결과가 실제로 화면에 이어졌는지**를 본다.
 * 함수가 '단가 칸으로 가라'고 정확히 답해도 focus()를 안 부르거나
 * id가 어긋나 있으면 커서는 안 움직인다. 그 틈은 순수 함수 테스트로
 * 절대 못 잡는다. 4일차에 눈으로 잡았던 종류의 버그가 이것이다.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PurchasePanel } from '@/components/decision/PurchasePanel';
import { fieldId, itemFieldId, itemFieldName } from '@/components/ui/Field';
import type { Decision, StoreSchema } from '@/lib/types';
import { DecisionsProvider } from '@/store/DecisionsProvider';

import { makeCandidate, makeDecision, makeReview } from './factory';

const STORAGE_KEY = 'gollab:v1';

/* ────────────────────────────────────────────────────────────
   픽스처
   ──────────────────────────────────────────────────────────── */

/** 후보 둘. 첫째는 구성량이 있고 둘째는 없다. */
function twoCandidates() {
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

function decisionWithoutOrder(): Decision {
  return makeDecision({ id: 'd1', candidates: twoCandidates(), order: null });
}

/** c1만 샀고 거기에 평가가 달려 있는 고민. */
function decisionWithReview(): Decision {
  return makeDecision({
    id: 'd1',
    candidates: twoCandidates(),
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
          review: makeReview(),
        },
      ],
    },
  });
}

/* ────────────────────────────────────────────────────────────
   렌더 도우미
   ──────────────────────────────────────────────────────────── */

/**
 * Provider는 마운트 후 localStorage에서 읽는다.
 * 그래서 render 전에 넣어둬야 setOrder가 이 고민을 찾을 수 있다.
 */
function seed(decision: Decision): void {
  const data: StoreSchema = { version: 1, decisions: [decision] };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function renderPanel(decision: Decision) {
  seed(decision);

  const onSaved = vi.fn();
  const onCancel = vi.fn();

  render(
    <DecisionsProvider>
      <PurchasePanel
        decision={decision}
        onSaved={onSaved}
        onCancel={onCancel}
      />
    </DecisionsProvider>,
  );

  return { onSaved, onCancel, user: userEvent.setup() };
}

/** id로 찾는다. 라벨에는 ' (필수)'가 붙고 행마다 같은 라벨이 반복되기 때문이다. */
function byId<T extends HTMLElement = HTMLInputElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`요소를 찾을 수 없습니다: #${id}`);
  return el as T;
}

const checkbox = (cid: string) => byId(itemFieldId(cid, 'selected'));
const unitPrice = (cid: string) => byId(itemFieldId(cid, 'unitPrice'));
const quantity = (cid: string) => byId(itemFieldId(cid, 'quantity'));
const amountValue = (cid: string) => byId(fieldId(itemFieldName(cid, 'amountValue')));
const amountUnit = (cid: string) =>
  byId<HTMLSelectElement>(fieldId(itemFieldName(cid, 'amountValue') + '-unit'));

const submit = () => screen.getByRole('button', { name: /구매 등록|수정 저장/ });

/** 저장 결과를 저장소에서 직접 읽는다. 화면이 아니라 데이터가 맞는지 볼 때 쓴다. */
function storedOrder(): Decision['order'] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error('저장된 것이 없습니다.');
  return (JSON.parse(raw) as StoreSchema).decisions[0].order;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

/* ══════════════════════════════════════════════════════════
   블록 31 — 패널의 첫 모습
   ══════════════════════════════════════════════════════════ */

describe('블록 31 — 패널의 첫 모습', () => {
  it('주문이 없으면 제목과 버튼이 등록 문구다', () => {
    renderPanel(decisionWithoutOrder());

    expect(
      screen.getByRole('heading', { name: '구매 등록' }),
    ).toBeInTheDocument();
    expect(submit()).toHaveTextContent('구매 등록');
  });

  it('체크하기 전에는 입력칸이 그려지지 않는다', () => {
    renderPanel(decisionWithoutOrder());

    expect(checkbox('c1')).not.toBeChecked();
    expect(document.getElementById(itemFieldId('c1', 'unitPrice'))).toBeNull();
  });

  it('단가는 비교 가격으로 미리 채우지 않는다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    await user.click(checkbox('c1'));

    // 18000(비교 가격)이 들어오면 '실제로 낸 값'이라는 의미가 무너진다
    expect(unitPrice('c1')).toHaveValue('');
    expect(quantity('c1')).toHaveValue('1');
    expect(amountValue('c1')).toHaveValue('200');
    expect(amountUnit('c1')).toHaveValue('g');
  });

  it('선택한 상품 개수를 보여준다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    expect(screen.getByText('0개 상품 선택됨')).toBeInTheDocument();

    await user.click(checkbox('c1'));
    expect(screen.getByText('1개 상품 선택됨')).toBeInTheDocument();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 32 — 오류가 나면 커서가 어디로 가는가 ⭐

   순수 함수는 '어디로 가야 하는지'만 답한다.
   실제로 그리로 가는지는 여기서만 확인된다.
   ══════════════════════════════════════════════════════════ */

describe('블록 32 — 오류가 나면 커서가 어디로 가는가', () => {
  it('상품을 고르지 않으면 오류가 뜨고 첫 체크박스로 간다', async () => {
    const { user, onSaved } = renderPanel(decisionWithoutOrder());

    await user.click(submit());

    expect(
      screen.getByText('구매한 상품을 1개 이상 선택해 주세요.'),
    ).toBeInTheDocument();
    expect(checkbox('c1')).toHaveFocus();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('단가가 비어 있으면 단가 칸으로 간다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    await user.click(checkbox('c1'));
    await user.click(submit());

    expect(unitPrice('c1')).toHaveFocus();
    expect(
      screen.getByText('단가는 0원 이상의 정수로 입력해 주세요.'),
    ).toBeInTheDocument();
  });

  it('단가를 채우면 다음 오류인 개수 칸으로 간다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    await user.click(checkbox('c1'));
    await user.type(unitPrice('c1'), '18000');
    await user.clear(quantity('c1'));
    await user.type(quantity('c1'), '0');
    await user.click(submit());

    expect(quantity('c1')).toHaveFocus();
  });

  it('상품 행의 오류가 주문 공통 오류보다 먼저다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    // 이유(아래쪽)와 단가(위쪽)가 동시에 비어 있다
    await user.click(checkbox('c1'));
    await user.click(submit());

    // 아래쪽 '선택한 이유'로 튀면 화면 순서를 어긴 것이다
    expect(unitPrice('c1')).toHaveFocus();
    expect(byId(fieldId('reason'))).not.toHaveFocus();
  });

  it('구성량만 넣고 단위를 비우면 단위 오류가 붙는다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    await user.click(checkbox('c2')); // 구성량이 없는 후보
    await user.type(unitPrice('c2'), '16000');
    await user.type(amountValue('c2'), '500');
    await user.click(submit());

    expect(screen.getByText('단위를 선택해 주세요.')).toBeInTheDocument();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 33 — 체크를 껐다 켜도 입력이 남는가
   ══════════════════════════════════════════════════════════ */

describe('블록 33 — 체크를 껐다 켜도 입력이 남는가', () => {
  it('행을 접었다 펴도 값이 살아 있다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    await user.click(checkbox('c1'));
    await user.type(unitPrice('c1'), '18000');

    await user.click(checkbox('c1')); // 접기
    expect(document.getElementById(itemFieldId('c1', 'unitPrice'))).toBeNull();

    await user.click(checkbox('c1')); // 다시 펴기
    expect(unitPrice('c1')).toHaveValue('18000');
  });

  it('체크 해제된 행의 잘못된 값은 저장을 막지 않는다', async () => {
    const { user, onSaved } = renderPanel(decisionWithoutOrder());

    // c2에 엉터리 값을 넣고 체크를 끈다
    await user.click(checkbox('c2'));
    await user.type(unitPrice('c2'), '못써');
    await user.click(checkbox('c2'));

    await fillValidRow(user, 'c1');
    await user.click(submit());

    expect(onSaved).toHaveBeenCalledOnce();
    expect(storedOrder()?.items).toHaveLength(1);
  });
});

/* ══════════════════════════════════════════════════════════
   블록 34 — 차액은 오류가 아니다 (규칙 P-6) ⭐
   ══════════════════════════════════════════════════════════ */

describe('블록 34 — 차액은 오류가 아니다', () => {
  async function setUpDiff(user: ReturnType<typeof userEvent.setup>) {
    await user.click(checkbox('c1'));
    await user.type(unitPrice('c1'), '18000');
    await user.type(byId(fieldId('reason')), '실패가 없어서');
  }

  it('적게 냈으면 쿠폰·할인으로 안내한다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    await setUpDiff(user);
    await user.type(byId(fieldId('totalPaid')), '15000');

    expect(
      screen.getByText('단가 합계 18,000원보다 3,000원 적습니다. (쿠폰·할인)'),
    ).toBeInTheDocument();
  });

  it('같으면 같다고만 말한다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    await setUpDiff(user);
    await user.type(byId(fieldId('totalPaid')), '18000');

    expect(
      screen.getByText('단가 합계 18,000원과 같습니다.'),
    ).toBeInTheDocument();
  });

  it('많이 냈으면 배송비로 안내한다', async () => {
    const { user } = renderPanel(decisionWithoutOrder());

    await setUpDiff(user);
    await user.type(byId(fieldId('totalPaid')), '21000');

    expect(
      screen.getByText('단가 합계 18,000원보다 3,000원 많습니다. (배송비 등)'),
    ).toBeInTheDocument();
  });

  it('차액이 있어도 저장을 막지 않는다', async () => {
    const { user, onSaved } = renderPanel(decisionWithoutOrder());

    await setUpDiff(user);
    await user.type(byId(fieldId('totalPaid')), '15000');
    await user.click(submit());

    expect(onSaved).toHaveBeenCalledOnce();
    expect(storedOrder()?.totalPaid).toBe(15000);
  });
});

/* ══════════════════════════════════════════════════════════
   블록 35 — 미래 날짜는 안내만 한다
   ══════════════════════════════════════════════════════════ */

describe('블록 35 — 미래 날짜는 안내만 한다', () => {
  it('안내가 뜨지만 저장은 된다', async () => {
    const { user, onSaved } = renderPanel(decisionWithoutOrder());

    await fillValidRow(user, 'c1');
    fireEvent.change(byId(fieldId('purchasedAt')), {
      target: { value: '2099-12-31' },
    });

    expect(
      screen.getByText(
        '미래 날짜입니다. 예약 구매나 입력 착오가 아닌지 확인해 주세요.',
      ),
    ).toBeInTheDocument();

    await user.click(submit());
    expect(onSaved).toHaveBeenCalledOnce();
  });
});

/* ══════════════════════════════════════════════════════════
   블록 36 — 평가가 있으면 '무엇을 샀는가'만 잠근다 (규칙 E-3) ⭐
   ══════════════════════════════════════════════════════════ */

describe('블록 36 — 평가가 있으면 무엇을 샀는가만 잠근다', () => {
  it('체크박스만 잠기고 금액 칸은 열려 있다', () => {
    renderPanel(decisionWithReview());

    expect(checkbox('c1')).toBeDisabled();
    expect(checkbox('c2')).toBeDisabled();

    // 잠긴 것은 '어떤 후보를 샀는가'뿐이다
    expect(unitPrice('c1')).toBeEnabled();
    expect(quantity('c1')).toBeEnabled();
    expect(byId(fieldId('totalPaid'))).toBeEnabled();
    expect(byId(fieldId('purchasedAt'))).toBeEnabled();
    expect(byId(fieldId('reason'))).toBeEnabled();
  });

  it('왜 잠겼는지 화면이 설명한다', () => {
    renderPanel(decisionWithReview());

    expect(screen.getByText(/평가가 작성되어 있어/)).toBeInTheDocument();
  });

  it('제목과 버튼이 수정 문구로 바뀐다', () => {
    renderPanel(decisionWithReview());

    expect(
      screen.getByRole('heading', { name: '구매정보 수정' }),
    ).toBeInTheDocument();
    expect(submit()).toHaveTextContent('수정 저장');
  });

  it('금액을 고쳐 저장해도 평가가 살아 있다', async () => {
    const { user, onSaved } = renderPanel(decisionWithReview());

    await user.clear(byId(fieldId('totalPaid')));
    await user.type(byId(fieldId('totalPaid')), '46000');
    await user.click(submit());

    expect(onSaved).toHaveBeenCalledOnce();

    const order = storedOrder();
    expect(order?.totalPaid).toBe(46000);
    // 금액 오타를 고치려고 평가를 다시 쓰게 만들 이유가 없다
    expect(order?.items[0].review).not.toBeNull();
    expect(order?.items[0].review?.oneLine).toBe('무난했다');
  });

  it('기존 주문 값이 폼에 복원된다', () => {
    renderPanel(decisionWithReview());

    expect(checkbox('c1')).toBeChecked();
    expect(checkbox('c2')).not.toBeChecked();
    expect(unitPrice('c1')).toHaveValue('18000');
    expect(byId(fieldId('totalPaid'))).toHaveValue('47000');
    expect(byId(fieldId('seller'))).toHaveValue('네이버');
  });
});

/* ────────────────────────────────────────────────────────────
   공용 도우미
   ──────────────────────────────────────────────────────────── */

/** 저장이 통과하는 최소 입력. 검증이 아니라 그 다음을 보고 싶을 때 쓴다. */
async function fillValidRow(
  user: ReturnType<typeof userEvent.setup>,
  cid: string,
): Promise<void> {
  await user.click(checkbox(cid));
  await user.type(unitPrice(cid), '18000');
  await user.type(byId(fieldId('totalPaid')), '18000');
  await user.type(byId(fieldId('reason')), '실패가 없어서');
}
