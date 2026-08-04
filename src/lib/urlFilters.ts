/**
 * URL 필터 순수 함수.
 *
 * 이 파일은 React도 next/navigation도 import하지 않는다.
 * URLSearchParams(웹 표준)만 쓴다. router.replace()를 부르는 것은 HomeView의 몫이다.
 *
 * 적용된 필터의 단일 진실 공급원은 URL이다. 컴포넌트가 로컬 state로
 * 이중 관리하지 않는다. 같은 정보를 두 경로로 읽으면 어느 쪽이 진짜인지 흐려진다.
 */

import { CATEGORIES } from './types';
import type { CategoryId, DecisionStatus, Filters } from './types';

/**
 * searchParams의 값은 문자열일 수도 배열일 수도 있다.
 * `?tag=a&tag=b`처럼 같은 키가 두 번 오면 배열이 된다. 첫 값만 쓴다.
 */
export function first(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isCategoryId(v: string | undefined): v is CategoryId {
  return v !== undefined && CATEGORIES.some((c) => c.id === v);
}

export function isDecisionStatus(v: string | undefined): v is DecisionStatus {
  return v === 'considering' || v === 'purchased' || v === 'reviewed';
}

/**
 * 주소창의 원시 문자열을 검증된 Filters로 바꾼다.
 *
 * 핵심은 rawCategory와 category를 이름으로 구분한 것이다.
 * 태그를 유지할지는 반드시 **검증을 통과한** category로 판단해야 한다.
 * 원시 문자열로 판단하면 /?category=wrong&tag=원두 에서 카테고리는 버려지는데
 * 태그만 살아남아, 어느 카테고리에도 속하지 않은 태그 필터가 걸린다.
 */
export function toFilters(
  raw: Record<string, string | string[] | undefined>,
): Filters {
  const rawCategory = first(raw.category);
  const rawStatus = first(raw.status);
  const rawTag = first(raw.tag)?.trim();
  const rawQuery = first(raw.q)?.trim();

  const category = isCategoryId(rawCategory) ? rawCategory : undefined;
  const status = isDecisionStatus(rawStatus) ? rawStatus : undefined;

  return {
    category,
    status,
    tag: category && rawTag ? rawTag : undefined,
    q: rawQuery || undefined,
  };
}

/**
 * 현재 필터에 변경분을 얹는다.
 *
 * 카테고리가 실제로 바뀌면 태그를 지운다. 태그는 카테고리 안에서만
 * 의미가 있어서, 식품 카테고리의 '원두' 태그를 디지털 카테고리로 들고 가면
 * 결과가 항상 0건이 된다.
 *
 * hasOwnProperty를 쓰는 이유: patch에 category 키가 아예 없는 경우와
 * `{ category: undefined }`로 해제하는 경우를 구분해야 한다.
 */
export function mergeFilters(
  current: Filters,
  patch: Partial<Filters>,
): Filters {
  const next: Filters = { ...current, ...patch };

  if (
    Object.prototype.hasOwnProperty.call(patch, 'category') &&
    patch.category !== current.category
  ) {
    next.tag = undefined;
  }

  return next;
}

/** 값이 없는 키는 URL에 넣지 않는다. `/?q=&status=` 같은 빈 파라미터를 만들지 않는다. */
export function filtersToHref(filters: Filters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.tag) params.set('tag', filters.tag);

  const query = params.toString();
  return query ? '/?' + query : '/';
}
