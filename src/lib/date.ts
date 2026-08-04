/**
 * 날짜 검사 — 여기 한 곳에만 정의한다.
 *
 * 폼 검증(validation.ts)과 Provider 불변식(invariants.ts)이 같은 함수를 import한다.
 * 두 곳에 복사하면 한쪽만 고치는 사고가 난다.
 */

/**
 * 'YYYY-MM-DD' 형식이면서 실제로 존재하는 날짜인가.
 *
 * 형식만 보면 '2026-02-30'이 통과한다. new Date()는 그런 값을 3월 2일로
 * 조용히 굴려버리므로(rollover), 만들어진 날짜의 연·월·일이 입력과 같은지
 * 다시 확인해야 한다.
 *
 * Date.UTC를 쓰는 이유: new Date(2026, 1, 30)은 실행 환경의 시간대를 타서
 * 하루가 밀릴 수 있다. UTC로 고정하면 어디서 돌려도 같은 결과가 나온다.
 */
export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * 미래 날짜인가. **안내 문구 표시용이며 검증에 쓰지 않는다** (설계서 10.3).
 * 예약 구매를 막을 이유가 없으므로 오류가 아니라 정보로 보여준다.
 *
 * today를 인자로 받는 이유: 함수 안에서 new Date()를 부르면 순수 함수가 아니게 되어
 * 테스트가 '오늘이 며칠인가'에 의존한다. 호출부가 넘긴다.
 */
export function isFutureDate(value: string, today: string): boolean {
  return isValidDateOnly(value) && value > today;
}

/** 오늘 날짜를 'YYYY-MM-DD'로. 호출부에서 isFutureDate에 넘기는 용도. */
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}
