'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { DecisionCard } from '@/components/home/DecisionCard';
import { STATUS_TONE } from '@/components/statusTone';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { HomeSkeleton } from '@/components/ui/Skeleton';
import { toneForTag } from '@/components/ui/tone';
import {
  countByStatus,
  filterDecisions,
  getTagsByCategory,
  sortByUpdated,
} from '@/lib/derive';
import { CATEGORY_LABEL, STATUS_LABEL } from '@/lib/format';
import { CATEGORIES } from '@/lib/types';
import type { CategoryId, DecisionStatus, Filters } from '@/lib/types';
import { filtersToHref, mergeFilters } from '@/lib/urlFilters';
import { useDecisions } from '@/store/useDecisions';

const STATUSES: DecisionStatus[] = ['considering', 'purchased', 'reviewed'];

export function HomeView({ filters }: { filters: Filters }) {
  const router = useRouter();
  const { ready, decisions, seedSample, resetAll } = useDecisions();

  /**
   * 검색 입력창의 문자열. 아직 적용되지 않은 값이다.
   * 적용된 필터는 URL(props.filters)에만 있다.
   * 이 구분이 명확하면 동기화에 조건이 필요 없어진다.
   */
  const [queryText, setQueryText] = useState(filters.q ?? '');

  /**
   * URL이 바뀌면 입력창을 맞춘다. 뒤로가기·앞으로가기·외부 링크 진입에 필요하다.
   *
   * useEffect가 아니라 렌더 중에 맞추는 이유:
   * effect로 하면 잘못된 값이 한 프레임 그려진 뒤에 고쳐진다.
   * React 공식 문서가 'prop이 바뀔 때 state를 조정하는' 경우로 권하는 방식이고,
   * 이전 값을 state로 들고 있다가 달라졌을 때만 바꾼다.
   */
  const [lastAppliedQuery, setLastAppliedQuery] = useState(filters.q);
  if (filters.q !== lastAppliedQuery) {
    setLastAppliedQuery(filters.q);
    setQueryText(filters.q ?? '');
  }

  /** 전체 초기화 확인. 이 앱에서 한 번에 제일 많이 잃는 동작이다. */
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetError, setResetError] = useState<string>();

  /**
   * Server 응답이 오기 전까지의 최신 사용자 의도.
   *
   * 칩을 빠르게 두 번 누르면, 두 번째 클릭 시점에 props.filters는 아직
   * 첫 번째 클릭 결과를 반영하지 않았다. 그대로 병합하면 첫 선택이 사라진다.
   * 이 ref는 타이머도 포커스도 관리하지 않는다. 그 한 가지 일만 한다.
   */
  const pendingFiltersRef = useRef(filters);

  useEffect(() => {
    // 새 URL이 확정되면 다시 URL을 기준으로 맞춘다
    pendingFiltersRef.current = filters;
  }, [filters]);

  function applyFilters(patch: Partial<Filters>): void {
    const next = mergeFilters(pendingFiltersRef.current, patch);
    pendingFiltersRef.current = next;
    router.replace(filtersToHref(next), { scroll: false });
  }

  /**
   * 검색은 제출할 때만 URL을 바꾼다.
   *
   * 타이핑마다 URL을 바꾸는 자동 검색은 넣지 않았다.
   * 타이머가 어느 시점의 필터를 보고 있느냐는 문제를 세 번 다르게 막다가,
   * 결국 그 질문이 생기지 않는 구조로 바꿨다.
   *
   * <form>을 쓰면 Enter와 버튼 클릭이 한 경로로 모인다.
   * onKeyDown에서 event.key === 'Enter'를 검사할 필요가 없다.
   */
  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault(); // 빠뜨리면 페이지가 통째로 새로고침된다
    applyFilters({ q: queryText.trim() || undefined });
  }

  function clearSearch(): void {
    setQueryText('');
    applyFilters({ q: undefined });
  }

  // 같은 값을 다시 누르면 해제된다
  function toggleStatus(status: DecisionStatus): void {
    const current = pendingFiltersRef.current.status;
    applyFilters({ status: current === status ? undefined : status });
  }

  function toggleCategory(category: CategoryId): void {
    const current = pendingFiltersRef.current.category;
    applyFilters({ category: current === category ? undefined : category });
  }

  function toggleTag(tag: string): void {
    const current = pendingFiltersRef.current.tag;
    applyFilters({ tag: current === tag ? undefined : tag });
  }

  // 저장소를 읽기 전에는 스켈레톤. 서버와 클라이언트 첫 렌더가 같아야 한다.
  if (!ready) return <HomeSkeleton />;

  const counts = countByStatus(decisions);
  const visible = sortByUpdated(filterDecisions(decisions, filters));
  const tags = filters.category
    ? getTagsByCategory(decisions, filters.category)
    : [];

  const hasAnyRecord = decisions.length > 0;

  // 무엇이 함께 사라지는지 확인 문구에 적기 위해 센다.
  // 고민을 지울 때와 같은 기준이다 — 개수를 말해주지 않으면
  // '기록 전부'가 얼마나 되는지 사용자가 알 방법이 없다.
  const totalCandidates = decisions.reduce((n, d) => n + d.candidates.length, 0);
  const totalReviews = decisions.reduce(
    (n, d) =>
      n + (d.order?.items.filter((it) => it.review !== null).length ?? 0),
    0,
  );

  function handleReset(): void {
    setResetError(undefined);

    const result = resetAll();

    if (!result.ok) {
      // 실패하면 닫지 않는다. 닫으면 지워진 줄 안다.
      setResetError(
        result.reason === 'quota'
          ? '저장 공간 문제로 삭제하지 못했습니다.'
          : '이 브라우저에서는 기록을 변경할 수 없습니다.',
      );
      return;
    }

    setConfirmingReset(false);
  }

  const hasFilter = Boolean(
    filters.status || filters.category || filters.tag || filters.q,
  );

  return (
    <div className="flex flex-col gap-8">
      {/* ── 인트로 ─────────────────────────────────────── */}
      <section>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          고민한 후보, 실제 구매, 써본 결과를 한 곳에
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          비교하다 만 후보도 지우지 않고 남겨둡니다. 다음 구매가 쉬워집니다.
        </p>
      </section>

      {hasAnyRecord && (
        <>
          {/* ── 필터 ─────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!filters.status}
                onClick={() => applyFilters({ status: undefined })}
                count={decisions.length}
              >
                전체
              </Chip>
              {STATUSES.map((s) => (
                <Chip
                  key={s}
                  tone={STATUS_TONE[s]}
                  selected={filters.status === s}
                  onClick={() => toggleStatus(s)}
                  count={counts[s]}
                >
                  {STATUS_LABEL[s]}
                </Chip>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!filters.category}
                onClick={() => applyFilters({ category: undefined })}
              >
                전체 카테고리
              </Chip>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  selected={filters.category === c.id}
                  onClick={() => toggleCategory(c.id)}
                  count={
                    decisions.filter((d) => d.category === c.id).length ||
                    undefined
                  }
                >
                  {c.label}
                </Chip>
              ))}
            </div>

            {/* 태그는 카테고리를 골랐을 때만 보인다 */}
            {filters.category && tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">
                  {CATEGORY_LABEL[filters.category]} 태그
                </span>
                {tags.map((t) => (
                  <Chip
                    key={t}
                    tone={toneForTag(t)}
                    selected={filters.tag === t}
                    onClick={() => toggleTag(t)}
                  >
                    #{t}
                  </Chip>
                ))}
              </div>
            )}
          </section>

          {/* ── 검색 ─────────────────────────────────── */}
          <form
            role="search"
            onSubmit={submitSearch}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="flex min-w-56 flex-1 flex-col gap-1.5">
              <label
                htmlFor="decision-search"
                className="text-sm font-medium text-slate-800"
              >
                고민 검색
              </label>
              <input
                id="decision-search"
                type="search"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="제목, 상품명, 브랜드, 태그"
                className="h-11 rounded-md border border-slate-300 px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              />
            </div>

            <Button type="submit" variant="secondary">
              검색
            </Button>

            {/* 적용된 검색어가 없으면 초기화할 것도 없다 */}
            {filters.q && (
              <Button variant="ghost" onClick={clearSearch}>
                검색 초기화
              </Button>
            )}
          </form>
        </>
      )}

      {/* ── 목록 ───────────────────────────────────── */}
      <section>
        {visible.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((d) => (
              <DecisionCard key={d.id} decision={d} />
            ))}
          </div>
        )}

        {/* 빈 상태는 세 가지로 나눈다. 사용자가 할 다음 행동이 각각 다르다 */}
        {visible.length === 0 && !hasAnyRecord && (
          <EmptyState
            title="첫 고민을 기록해 보세요"
            description="지금 비교 중인 상품을 남겨두면 다음 구매가 쉬워집니다."
            action={
              <>
                <Link href="/decisions/new">
                  <Button variant="primary">새 고민 만들기</Button>
                </Link>
                <Button onClick={() => seedSample()}>샘플 데이터 불러오기</Button>
              </>
            }
          />
        )}

        {visible.length === 0 && hasAnyRecord && filters.q && (
          <EmptyState
            title={`'${filters.q}'에 대한 결과가 없습니다`}
            action={<Button onClick={clearSearch}>검색어 지우기</Button>}
          />
        )}

        {visible.length === 0 && hasAnyRecord && !filters.q && hasFilter && (
          <EmptyState
            title="조건에 맞는 기록이 없습니다"
            action={
              <Button onClick={() => router.replace('/', { scroll: false })}>
                필터 초기화
              </Button>
            }
          />
        )}
      </section>

      {/* ── 저장소 관리 ────────────────────────────── */}
      {hasAnyRecord && (
        <section className="flex items-center justify-between border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-400">
            기록은 이 브라우저에만 저장됩니다
          </p>
          <Button
            size="sm"
            variant="dangerOutline"
            onClick={() => setConfirmingReset(true)}
          >
            전체 초기화
          </Button>
        </section>
      )}

      <ConfirmDialog
        open={confirmingReset}
        title="저장된 기록을 모두 지울까요?"
        confirmLabel="전체 초기화"
        error={resetError}
        description={
          <>
            <strong className="text-red-700">
              고민 {decisions.length}개, 후보 {totalCandidates}개
              {totalReviews > 0 && `, 평가 ${totalReviews}개`}가 사라집니다.
            </strong>
            <br />
            이 브라우저에만 저장된 기록이라 다른 곳에 남아 있는 사본이 없습니다.
          </>
        }
        onConfirm={handleReset}
        onCancel={() => {
          setConfirmingReset(false);
          setResetError(undefined);
        }}
      />
    </div>
  );
}
