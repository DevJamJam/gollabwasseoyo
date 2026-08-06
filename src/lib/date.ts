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

/* ────────────────────────────────────────────────────────────
   저장된 날짜가 두 종류다

     purchasedAt        '2026-01-12'                  사용자가 고른 날짜
     createdAt          '2026-01-10T09:00:00.000Z'    ISO 세계표준시
     review.updatedAt   '2026-01-26T09:00:00.000Z'    같음

   ISO를 그냥 앞 10자만 자르면 세계표준시 기준 날짜가 나온다.
   한국에서 새벽 1시에 쓴 평가는 UTC로 전날 16시라 하루 전으로 표시된다.
   사용자가 보는 것은 자기 시계이므로 로컬 날짜로 바꿔야 한다.
   ──────────────────────────────────────────────────────────── */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * 어떤 형태로 저장됐든 'YYYY-MM-DD'(로컬 기준)로 통일한다.
 *
 * 길이로 구분한다 — 'YYYY-MM-DD'는 정확히 10자이고, ISO는 그보다 길다.
 * 짧으면 이미 날짜만 있는 값이라 시간대 변환이 필요 없다.
 */
export function toDateOnly(value: string): string {
  if (value.length <= 10) return value;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * 두 날짜 사이의 일수. 시각은 무시하고 날짜만 센다.
 *
 * Date.UTC로 자정 기준을 만들어 빼는 이유:
 * 그냥 new Date(a) - new Date(b) 로 하면 서머타임이 걸친 구간에서
 * 하루가 23시간이나 25시간이 되어 결과가 하루 어긋난다.
 * 날짜만 뽑아 UTC 자정으로 맞추면 그 문제가 사라진다.
 *
 * 잘못된 값이면 null. 화면은 그때 아무것도 그리지 않는다.
 */
export function daysBetween(from: string, to: string): number | null {
  const a = toUtcMidnight(from);
  const b = toUtcMidnight(to);

  if (a === null || b === null) return null;

  return Math.round((b - a) / 86_400_000);
}

function toUtcMidnight(value: string): number | null {
  const dateOnly = toDateOnly(value);
  if (!isValidDateOnly(dateOnly)) return null;

  const [year, month, day] = dateOnly.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}
