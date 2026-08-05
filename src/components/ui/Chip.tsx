import { CHIP_TONE } from './tone';
import type { Tone } from './tone';

/**
 * 필터 칩과 선택 칩.
 *
 * <div onClick>이 아니라 <button>이다. 그래야 Tab으로 도달하고 Enter로 눌린다.
 * aria-pressed는 스크린리더에 '눌린 상태'를 알린다 — 색만으로는 전달되지 않는다.
 *
 * tone은 색 이름일 뿐 도메인을 모른다. 어떤 상태가 무슨 색인지는 부르는 쪽이 정한다.
 */

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  count?: number;
  tone?: Tone;
  onClick?: () => void;
}

export function Chip({
  children,
  selected = false,
  disabled = false,
  count,
  tone = 'neutral',
  onClick,
}: ChipProps) {
  const palette = CHIP_TONE[tone];

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
        'text-sm font-medium transition-colors',
        // 터치 타깃 최소 44px를 세로로 확보한다
        'min-h-11',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
        'disabled:cursor-not-allowed disabled:opacity-40',
        selected ? palette.on : palette.off,
      ].join(' ')}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span className={selected ? 'opacity-70' : 'opacity-50'}>{count}</span>
      )}
    </button>
  );
}
