import { BADGE_TONE } from './tone';
import type { Tone } from './tone';

/**
 * 상태·카테고리 배지.
 *
 * 색만으로 구분되는 정보를 만들지 않는다. 색각 이상이 있는 사용자에게
 * '구매 완료'와 '평가 완료'가 같아 보이면 안 되므로 텍스트를 언제나 함께 그린다.
 *
 * 도메인 타입을 import하지 않는다. 어떤 상태가 무슨 색인지는
 * 한 단계 위의 statusTone.ts가 정한다.
 */

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${BADGE_TONE[tone]}`}
    >
      {children}
    </span>
  );
}
