/**
 * 빈 상태.
 *
 * "결과 없음" 한 줄로 뭉뚱그리지 않는다. 기록이 아예 없는 것과,
 * 필터를 걸어서 0건인 것과, 검색어에 걸린 게 없는 것은 사용자가 해야 할
 * 다음 행동이 전부 다르다. 그래서 문구와 함께 그 행동을 버튼으로 준다.
 */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-6 py-14 text-center">
      <p className="text-base font-medium text-slate-900">{title}</p>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center gap-2">{action}</div>}
    </div>
  );
}
