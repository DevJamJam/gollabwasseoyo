import { describe, expect, it } from 'vitest';

import { filtersToHref, first, mergeFilters, toFilters } from '@/lib/urlFilters';
import type { Filters } from '@/lib/types';

/* ══════════════════════════════════════════════════════════
   블록 6 — 원시 searchParams 정규화
   ══════════════════════════════════════════════════════════ */

describe('toFilters / first — 원시 파라미터 정규화', () => {
  it('같은 키가 여러 번 오면 첫 값만 쓴다', () => {
    expect(first(['a', 'b'])).toBe('a');
    expect(first('a')).toBe('a');
    expect(first(undefined)).toBeUndefined();
  });

  it('공백만 있는 검색어는 없는 것으로 본다', () => {
    expect(toFilters({ q: '   ' }).q).toBeUndefined();
    expect(toFilters({ q: '  원두  ' }).q).toBe('원두');
  });

  it('유효하지 않은 상태값은 조용히 버린다', () => {
    expect(toFilters({ status: 'zzz' }).status).toBeUndefined();
    expect(toFilters({ status: 'reviewed' }).status).toBe('reviewed');
  });

  it('파라미터가 없으면 전부 undefined다', () => {
    expect(toFilters({})).toEqual({
      category: undefined,
      status: undefined,
      tag: undefined,
      q: undefined,
    });
  });
});

/* ══════════════════════════════════════════════════════════
   블록 7 — 카테고리 유효성에 따른 태그 처리

   태그는 카테고리 안에서만 의미가 있다.
   카테고리가 버려졌는데 태그만 살아남으면, 어느 카테고리에도 속하지 않은
   태그 필터가 걸린 이상한 상태가 된다.
   ══════════════════════════════════════════════════════════ */

describe('toFilters — 태그는 검증된 카테고리 아래에서만 유효하다', () => {
  it('카테고리가 유효하지 않으면 태그도 함께 버린다', () => {
    expect(toFilters({ category: 'wrong', tag: '원두' })).toEqual({
      category: undefined,
      status: undefined,
      tag: undefined,
      q: undefined,
    });
  });

  it('카테고리가 유효하면 태그를 유지한다', () => {
    expect(toFilters({ category: 'food', tag: '원두' })).toEqual({
      category: 'food',
      status: undefined,
      tag: '원두',
      q: undefined,
    });
  });

  it('카테고리 없이 태그만 오면 태그를 버린다', () => {
    expect(toFilters({ tag: '원두' })).toEqual({
      category: undefined,
      status: undefined,
      tag: undefined,
      q: undefined,
    });
  });
});

/* ══════════════════════════════════════════════════════════
   블록 8 — 검색어를 바꿔도 다른 필터가 살아남는다
   ══════════════════════════════════════════════════════════ */

describe('mergeFilters — 검색어 변경', () => {
  it('q만 바꾸면 카테고리와 태그는 그대로다', () => {
    const current: Filters = { category: 'food', tag: '원두' };

    expect(mergeFilters(current, { q: '고소한맛' })).toEqual({
      category: 'food',
      tag: '원두',
      q: '고소한맛',
    });
  });
});

/* ══════════════════════════════════════════════════════════
   블록 9 — 카테고리를 바꾸면 태그만 사라진다
   ══════════════════════════════════════════════════════════ */

describe('mergeFilters — 카테고리 변경', () => {
  it('카테고리가 바뀌면 태그를 지우고 상태는 유지한다', () => {
    const current: Filters = {
      category: 'food',
      tag: '원두',
      status: 'considering',
    };

    expect(mergeFilters(current, { category: 'digital' })).toEqual({
      category: 'digital',
      tag: undefined,
      status: 'considering',
    });
  });

  it('같은 카테고리를 다시 넣으면 태그를 지우지 않는다', () => {
    const current: Filters = { category: 'food', tag: '원두' };

    expect(mergeFilters(current, { category: 'food' }).tag).toBe('원두');
  });

  it('카테고리를 해제하면 태그도 함께 사라진다', () => {
    const current: Filters = { category: 'food', tag: '원두' };

    expect(mergeFilters(current, { category: undefined })).toEqual({
      category: undefined,
      tag: undefined,
    });
  });
});

/* ══════════════════════════════════════════════════════════
   블록 10 — 상태 변경과 URL 직렬화
   ══════════════════════════════════════════════════════════ */

describe('mergeFilters / filtersToHref — 상태 변경과 직렬화', () => {
  it('상태를 바꿔도 다른 필터가 유지된다', () => {
    const current: Filters = { category: 'food', tag: '원두' };

    expect(mergeFilters(current, { status: 'reviewed' })).toEqual({
      category: 'food',
      tag: '원두',
      status: 'reviewed',
    });
  });

  /**
   * 한글이나 공백이 든 검색어는 URLSearchParams가 퍼센트 인코딩한다.
   * 인코딩된 문자열을 그대로 하드코딩하면 정상 구현도 실패하므로,
   * URL로 다시 파싱해서 '의미'를 확인한다.
   */
  it('빈 검색어는 URL에서 아예 사라진다', () => {
    const cleared = mergeFilters(
      { category: 'food', tag: '원두', q: '고소한맛' },
      { q: undefined },
    );

    const url = new URL(filtersToHref(cleared), 'https://example.test');

    expect(url.searchParams.get('category')).toBe('food');
    expect(url.searchParams.get('tag')).toBe('원두');
    expect(url.searchParams.has('q')).toBe(false);
  });

  it('필터가 하나도 없으면 쿼리 없는 / 다', () => {
    expect(filtersToHref({})).toBe('/');
  });

  it('한글 검색어도 왕복한다', () => {
    const href = filtersToHref({ q: '고소한 맛', category: 'food' });
    const url = new URL(href, 'https://example.test');

    expect(url.searchParams.get('q')).toBe('고소한 맛');
    expect(url.searchParams.get('category')).toBe('food');
  });
});
