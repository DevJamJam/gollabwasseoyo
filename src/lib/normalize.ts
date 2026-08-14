/**
 * 정규화 — 폼 문자열을 저장할 모양으로 다듬는다.
 *
 * 이 파일의 함수들은 폼 검증을 통과한 직후에만 부른다.
 * 검증을 대신하지 않는다. 잘못된 입력을 정상값으로 고쳐주지도 않는다.
 *
 * 왜 그런가:
 *   Number('')     은 0 이다
 *   Number('abc')  는 NaN 이다
 *   Math.trunc(1.9) 는 1 이다  ← 사용자가 입력하지 않은 값
 *
 * 파서가 이런 걸 '알아서 고쳐주면' 사용자는 자기 입력이 바뀐 걸 모른다.
 * 검증에서 막고, 파서는 통과한 값만 변환한다.
 */

import type { Amount, Unit } from './types';

/** 빈 선택 문자열은 아예 저장하지 않는다. `brand: ''` 같은 값을 남기지 않기 위해. */
export function optionalText(v: string): string | undefined {
  const t = v.trim();
  return t === '' ? undefined : t;
}

/** 필수 문자열. 검증을 통과한 뒤에만 부른다. */
export function requiredText(v: string): string {
  return v.trim();
}

/**
 * 빈 문자열은 undefined. 유한한 정수만 그대로 돌려준다.
 *
 * 1.9를 1로 깎지 않는다. 잘못된 값이면 undefined를 주고,
 * 그런 값이 여기까지 온 것 자체가 검증이 빠졌다는 뜻이다.
 */
export function optionalInt(v: string): number | undefined {
  const trimmed = v.trim();
  if (trimmed === '') return undefined;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined;
  }

  return value;
}

/** 필수 정수. 검증을 통과한 뒤에만 부르며 임의로 깎거나 반올림하지 않는다. */
export function requiredInt(v: string): number {
  return Number(v.trim());
}

/**
 * 구성량. 값과 단위가 둘 다 있어야 성립한다 (규칙 C-3).
 * 금액과 달리 소수를 허용한다 — 1.5kg 같은 값이 정상이다.
 */
export function optionalAmount(
  value: string,
  unit: Unit | '',
): Amount | undefined {
  const t = value.trim();
  if (t === '' || unit === '') return undefined;

  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return undefined;

  return { value: n, unit };
}

/**
 * 일반 텍스트 목록. 공백을 다듬고 빈 항목만 걷어낸다.
 *
 * 순서와 중복은 건드리지 않는다. 중복 금지 규칙이 있는 건 태그뿐이다.
 * 개수 초과도 여기서 자르지 않는다 — slice로 조용히 버리면
 * 사용자가 쓴 네 번째 항목이 말없이 사라진다. 검증이 막을 일이다.
 */
export function normalizeTextList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item !== '');
}

/** 태그만 중복을 없앤다 (규칙 T-4). Set은 먼저 나온 순서를 유지한다. */
export function normalizeTags(tags: string[]): string[] {
  return [...new Set(normalizeTextList(tags))];
}
