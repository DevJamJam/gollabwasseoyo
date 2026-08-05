import { TAG_TONE, toneForTag } from './tone';

/**
 * 표시용 태그 알약.
 *
 * 회색 글자로 `#원두 #고소한맛`처럼 늘어놓으면 다른 설명 문구와 섞여
 * '이게 태그다'라는 게 안 보인다. 알약 모양과 옅은 색으로 떼어놓는다.
 *
 * 색은 태그 이름에서 계산하므로 같은 태그는 목록 어디에서나 같은 색이다.
 * 상태 배지는 진한 배경(100), 태그는 옅은 배경(50)이라 서로 헷갈리지 않는다.
 */
export function Tag({ name }: { name: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${TAG_TONE[toneForTag(name)]}`}
    >
      #{name}
    </span>
  );
}
