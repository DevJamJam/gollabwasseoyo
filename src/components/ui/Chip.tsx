/**
 * 필터 칩과 선택 칩.
 *
 * <div onClick>이 아니라 <button>이다. 그래야 Tab으로 도달하고 Enter로 눌린다.
 * aria-pressed는 스크린리더에 '눌린 상태'를 알린다 — 색만으로는 전달되지 않는다.
 */

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  count?: number;
  onClick?: () => void;
}

export function Chip({
  children,
  selected = false,
  disabled = false,
  count,
  onClick,
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
        'text-sm transition-colors',
        // 터치 타깃 최소 44px를 세로로 확보한다
        'min-h-11',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
        'disabled:cursor-not-allowed disabled:opacity-40',
        selected
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
      ].join(' ')}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={selected ? 'text-slate-300' : 'text-slate-400'}
        >
          {count}
        </span>
      )}
    </button>
  );
}
