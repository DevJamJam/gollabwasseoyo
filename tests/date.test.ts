import { describe, expect, it } from 'vitest';

import {
  daysBetween,
  isFutureDate,
  isValidDateOnly,
  toDateOnly,
} from '@/lib/date';
import { formatDate } from '@/lib/format';

/* ══════════════════════════════════════════════════════════
   블록 23 — 존재하지 않는 날짜 걸러내기
   ══════════════════════════════════════════════════════════ */

describe('isValidDateOnly', () => {
  it('형식이 맞고 실재하는 날짜만 통과시킨다', () => {
    expect(isValidDateOnly('2026-01-10')).toBe(true);
    expect(isValidDateOnly('2024-02-29')).toBe(true); // 윤년
  });

  /**
   * new Date(2026, 1, 30)은 에러 없이 3월 2일이 된다. 이걸 rollover라고 한다.
   * 그래서 만든 뒤에 연·월·일을 되물어 확인해야 한다.
   */
  it('없는 날짜를 거부한다', () => {
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('2025-02-29')).toBe(false); // 평년
    expect(isValidDateOnly('2026-13-01')).toBe(false);
    expect(isValidDateOnly('2026-00-10')).toBe(false);
  });

  it('형식이 어긋나면 거부한다', () => {
    expect(isValidDateOnly('2026-1-10')).toBe(false);
    expect(isValidDateOnly('2026/01/10')).toBe(false);
    expect(isValidDateOnly('')).toBe(false);
    expect(isValidDateOnly(20260110)).toBe(false);
    expect(isValidDateOnly(null)).toBe(false);
  });

  it('미래 날짜는 유효하다 — 예약 구매를 막을 이유가 없다', () => {
    expect(isValidDateOnly('2099-12-31')).toBe(true);
    expect(isFutureDate('2099-12-31', '2026-01-10')).toBe(true);
    expect(isFutureDate('2026-01-09', '2026-01-10')).toBe(false);
    expect(isFutureDate('2026-01-10', '2026-01-10')).toBe(false); // 같은 날은 미래가 아니다
  });
});

/* ══════════════════════════════════════════════════════════
   블록 24 — 두 종류의 날짜를 하나로 통일하기

   purchasedAt      '2026-01-12'                 사용자가 고른 날짜
   createdAt        '2026-01-10T09:00:00.000Z'   ISO 세계표준시

   ISO를 그냥 앞 10자만 자르면 세계표준시 날짜가 나온다.
   한국에서 새벽 1시에 쓴 평가는 UTC로 전날 16시라 하루 전으로 표시된다.
   ══════════════════════════════════════════════════════════ */

describe('toDateOnly', () => {
  it('이미 날짜만 있는 값은 그대로 둔다', () => {
    expect(toDateOnly('2026-01-12')).toBe('2026-01-12');
  });

  it('ISO 문자열은 로컬 날짜로 바꾼다', () => {
    const iso = '2026-01-26T09:00:00.000Z';
    const local = new Date(iso);

    const expected = [
      local.getFullYear(),
      String(local.getMonth() + 1).padStart(2, '0'),
      String(local.getDate()).padStart(2, '0'),
    ].join('-');

    expect(toDateOnly(iso)).toBe(expected);
  });

  it('어떤 형태로 들어와도 YYYY-MM-DD 모양을 낸다', () => {
    for (const v of [
      '2026-01-12',
      '2026-01-26T09:00:00.000Z',
      '2026-06-30T23:30:00.000Z',
    ]) {
      expect(toDateOnly(v)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('망가진 값은 빈 문자열이다', () => {
    expect(toDateOnly('말도 안 되는 값입니다')).toBe('');
  });
});

describe('formatDate', () => {
  it('점으로 구분해 보여준다', () => {
    expect(formatDate('2026-01-12')).toBe('2026.01.12');
  });

  it('시각은 보여주지 않는다', () => {
    expect(formatDate('2026-01-26T09:00:00.000Z')).toMatch(
      /^\d{4}\.\d{2}\.\d{2}$/,
    );
  });
});

/* ══════════════════════════════════════════════════════════
   블록 25 — 며칠 지났나 (구매 후 N일)
   ══════════════════════════════════════════════════════════ */

describe('daysBetween', () => {
  it('같은 날은 0일이다', () => {
    expect(daysBetween('2026-01-12', '2026-01-12')).toBe(0);
  });

  it('날짜 차이를 일수로 센다', () => {
    expect(daysBetween('2026-01-12', '2026-01-26')).toBe(14);
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
  });

  it('달과 해를 넘어가도 맞다', () => {
    expect(daysBetween('2025-12-25', '2026-01-01')).toBe(7);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2); // 윤년
    expect(daysBetween('2025-02-28', '2025-03-01')).toBe(1); // 평년
  });

  it('거꾸로면 음수다', () => {
    expect(daysBetween('2026-01-26', '2026-01-12')).toBe(-14);
  });

  /**
   * 서머타임이 걸친 구간은 하루가 23시간이나 25시간이다.
   * 그냥 밀리초를 빼서 86400000으로 나누면 결과가 어긋난다.
   * 날짜만 뽑아 UTC 자정으로 맞추면 그 문제가 사라진다.
   */
  it('서머타임 전환 구간에서도 하루는 하루다', () => {
    // 미국 서머타임 시작 (2026-03-08), 종료 (2026-11-01)
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });

  it('ISO 시각과 날짜 문자열을 섞어도 된다', () => {
    const result = daysBetween('2026-01-12', '2026-01-26T09:00:00.000Z');

    expect(result).not.toBeNull();
    // 시간대에 따라 13 또는 14. 어느 쪽이든 하루 이상 어긋나지 않는다.
    expect(Math.abs((result ?? 0) - 14)).toBeLessThanOrEqual(1);
  });

  it('잘못된 값이면 null이다 — 화면은 그때 아무것도 그리지 않는다', () => {
    expect(daysBetween('2026-02-30', '2026-03-01')).toBeNull();
    expect(daysBetween('', '2026-01-12')).toBeNull();
    expect(daysBetween('2026-01-12', '말도 안 되는 값')).toBeNull();
  });
});
