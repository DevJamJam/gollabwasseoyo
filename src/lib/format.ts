/**
 * 표시용 문자열.
 *
 * 이 파일만 숫자를 사람이 읽는 모양으로 바꾼다.
 * 도메인 값과 계산 함수는 원값을 유지한다.
 */

import type { UnitPrice } from './derive';
import type { Amount, CategoryId, DecisionStatus, Repurchase } from './types';

export const formatKRW = (n: number): string => n.toLocaleString('ko-KR') + '원';

/**
 * 구성량은 소수를 허용하므로(1.5kg) 곱셈에서 부동소수점 오차가 생긴다.
 * 0.3 * 3 은 0.8999999999999999 다. 이대로 String()으로 그리면
 * 사용자가 입력한 적 없는 숫자가 화면에 나온다.
 *
 * 표시 계층에서만 소수 둘째 자리까지 반올림하고, 불필요한 0은 남기지 않는다.
 * (Math.round(0.8999... * 100) / 100 → 0.9 → "0.9")
 * (1.5 → 1.5,  2 → 2,  200 → 200)
 */
function formatAmountValue(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export const formatAmount = (a?: Amount): string =>
  a ? formatAmountValue(a.value) + (a.unit === 'ea' ? '개' : a.unit) : '-';

export const formatUnitPrice = (u: UnitPrice | null): string =>
  u ? u.label + ' ' + formatKRW(u.value) : '-';

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  food: '식품·음료',
  beauty: '뷰티·생활',
  fashion: '패션·잡화',
  digital: '디지털·가전',
  hobby: '취미·운동',
  pet: '반려동물',
  etc: '기타',
};

export const STATUS_LABEL: Record<DecisionStatus, string> = {
  considering: '고민 중',
  purchased: '구매 완료',
  reviewed: '평가 완료',
};

export const REPURCHASE_LABEL: Record<Repurchase, string> = {
  yes: '있음',
  maybe: '고민',
  no: '없음',
};
