import type { Tone } from '@/components/ui/tone';
import type { DecisionStatus } from '@/lib/types';

/**
 * 상태 → 색.
 *
 * ui/ 안에 두지 않은 이유는 ui/의 컴포넌트가 도메인 타입을 모르기로 해서다.
 * Chip과 Badge는 'amber'라는 색 이름만 알고, 어떤 상태가 amber인지는
 * 한 단계 위인 여기서 정한다.
 *
 * 색을 고른 근거는 진행 단계다.
 *   고민 중   amber   아직 결정 전 — 멈춰 있는 느낌
 *   구매 완료 blue    샀지만 아직 써보지 않음
 *   평가 완료 green   끝
 */
export const STATUS_TONE: Record<DecisionStatus, Tone> = {
  considering: 'amber',
  purchased: 'blue',
  reviewed: 'green',
};
