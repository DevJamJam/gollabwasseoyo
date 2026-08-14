/**
 * 색 체계.
 *
 * Chip과 Badge가 각자 색을 들고 있으면 늘어날수록 어긋난다.
 * 색은 여기서만 정하고 컴포넌트는 이름으로 가져다 쓴다.
 *
 * 두 가지 원칙을 지킨다.
 *   1. 색만으로 구분되는 정보를 만들지 않는다. 텍스트가 항상 함께 있다.
 *      (색각 이상 사용자에게 '구매 완료'와 '평가 완료'가 같아 보이면 안 된다)
 *   2. 진한 배경 위의 흰 글자는 명도 대비 4.5:1을 넘겨야 한다.
 *      그래서 선택된 칩의 배경에 600이 아니라 700을 쓴다.
 *
 * Tailwind는 소스에 적힌 클래스 문자열을 훑어서 CSS를 만든다.
 * 그래서 'bg-' + color 처럼 조립하면 안 되고, 아래처럼 통째로 적어둬야 한다.
 */

export type Tone =
  // 상태색 — 고민 중 / 구매 완료 / 평가 완료
  | 'amber'
  | 'blue'
  | 'green'
  // 중립 — 카테고리, 전체 등
  | 'neutral'
  // 태그색 — 태그 이름에서 자동으로 고른다
  | 'rose'
  | 'orange'
  | 'teal'
  | 'sky'
  | 'violet'
  | 'pink';

/** 칩. off는 미선택, on은 선택된 상태. */
export const CHIP_TONE: Record<Tone, { off: string; on: string }> = {
  neutral: {
    off: 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
    on: 'border-slate-900 bg-slate-900 text-white',
  },
  amber: {
    off: 'border-amber-300 bg-white text-amber-800 hover:border-amber-400 hover:bg-amber-50',
    on: 'border-amber-700 bg-amber-700 text-white',
  },
  blue: {
    off: 'border-blue-300 bg-white text-blue-800 hover:border-blue-400 hover:bg-blue-50',
    on: 'border-blue-700 bg-blue-700 text-white',
  },
  green: {
    off: 'border-emerald-300 bg-white text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50',
    on: 'border-emerald-700 bg-emerald-700 text-white',
  },
  rose: {
    off: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300',
    on: 'border-rose-700 bg-rose-700 text-white',
  },
  orange: {
    off: 'border-orange-200 bg-orange-50 text-orange-800 hover:border-orange-300',
    on: 'border-orange-700 bg-orange-700 text-white',
  },
  teal: {
    off: 'border-teal-200 bg-teal-50 text-teal-800 hover:border-teal-300',
    on: 'border-teal-700 bg-teal-700 text-white',
  },
  sky: {
    off: 'border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-300',
    on: 'border-sky-700 bg-sky-700 text-white',
  },
  violet: {
    off: 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300',
    on: 'border-violet-700 bg-violet-700 text-white',
  },
  pink: {
    off: 'border-pink-200 bg-pink-50 text-pink-700 hover:border-pink-300',
    on: 'border-pink-700 bg-pink-700 text-white',
  },
};

/** 배지. 칩보다 한 단계 진하게 해서 태그 알약과 구분한다. */
export const BADGE_TONE: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  amber: 'border-amber-200 bg-amber-100 text-amber-900',
  blue: 'border-blue-200 bg-blue-100 text-blue-900',
  green: 'border-emerald-200 bg-emerald-100 text-emerald-900',
  rose: 'border-rose-200 bg-rose-100 text-rose-900',
  orange: 'border-orange-200 bg-orange-100 text-orange-900',
  teal: 'border-teal-200 bg-teal-100 text-teal-900',
  sky: 'border-sky-200 bg-sky-100 text-sky-900',
  violet: 'border-violet-200 bg-violet-100 text-violet-900',
  pink: 'border-pink-200 bg-pink-100 text-pink-900',
};

/**
 * 표시용 태그 알약. 배지보다 한 단계 옅게(50) 해서 둘을 구분한다.
 * 누르는 요소가 아니므로 hover가 없다.
 */
export const TAG_TONE: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  orange: 'border-orange-200 bg-orange-50 text-orange-800',
  teal: 'border-teal-200 bg-teal-50 text-teal-800',
  sky: 'border-sky-200 bg-sky-50 text-sky-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  pink: 'border-pink-200 bg-pink-50 text-pink-700',
};

/** 태그에 쓸 색. 상태색(amber·blue·green)과 겹치지 않게 골랐다. */
const TAG_TONES: Tone[] = ['rose', 'orange', 'teal', 'sky', 'violet', 'pink'];

/**
 * 태그 이름에서 색을 정한다.
 *
 * 무작위가 아니라 이름으로 계산하므로 같은 태그는 언제나 같은 색이다.
 * 목록을 훑을 때 '원두'가 늘 같은 색이면 눈이 먼저 찾아낸다.
 * 색이 매번 바뀌면 오히려 방해가 된다.
 *
 * 31을 곱해 누적하는 건 문자열 해시에 흔히 쓰는 방식이다.
 * >>> 0 은 음수가 나오지 않게 32비트 부호 없는 정수로 만든다.
 */
export function toneForTag(tag: string): Tone {
  let hash = 0;

  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  }

  return TAG_TONES[hash % TAG_TONES.length];
}
