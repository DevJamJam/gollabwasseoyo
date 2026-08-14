/**
 * 버튼.
 *
 * 버튼 스타일을 파일마다 복사해 붙이면 화면이 늘어날수록 색과 높이가
 * 제각각이 된다. 여기서 한 번만 정한다.
 *
 * 색은 회색 계열 + 위험색 하나만 쓴다. 디자인 시스템을 만들지 않는다.
 */

type Variant =
  | 'primary'
  | 'secondary'
  /** 위험한 동작인데 아직 확정 전 — 삭제 버튼처럼 다이얼로그를 여는 것 */
  | 'dangerOutline'
  /** 되돌릴 수 없는 실행 — 확인 다이얼로그의 확인 버튼 */
  | 'danger'
  /** 보조 동작 — 펼치기·닫기처럼 눌러도 잃을 게 없는 것 */
  | 'ghost';

/**
 * 위험한 동작은 두 단계로 나눈다.
 *
 *   dangerOutline  빨간 테두리 + 흰 배경.  "여기부터 위험하다"
 *   danger         빨간 배경 + 흰 글자.    "지금 누르면 실행된다"
 *
 * 삭제 버튼을 처음부터 새빨갛게 칠하면 화면에서 그것만 튀고,
 * 정작 확인 다이얼로그에서 강조할 것이 없어진다.
 *
 * ghost는 테두리도 배경도 없다. 누를 수 있다는 게 안 보이므로
 * 정말 부수적인 것에만 쓴다. 수정·삭제처럼 결과가 남는 동작에는 쓰지 않는다.
 */
const VARIANT: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50',
  dangerOutline:
    'border border-red-300 bg-white text-red-700 hover:border-red-400 hover:bg-red-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
};

/**
 * ComponentPropsWithRef를 쓰면 ref까지 props에 포함된다.
 *
 * React 18까지는 함수 컴포넌트가 ref를 받으려면 forwardRef로 감싸야 했다.
 * React 19부터는 ref가 그냥 일반 prop이라 아래처럼 펼쳐 넘기면 된다.
 */
type ButtonProps = React.ComponentPropsWithRef<'button'> & {
  variant?: Variant;
  size?: 'sm' | 'md';
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      // 기본값을 'button'으로 둔다. 폼 안에서 type을 빼먹으면
      // 브라우저가 submit으로 처리해 원치 않는 제출이 일어난다.
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-sm',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
        'disabled:cursor-not-allowed disabled:opacity-40',
        VARIANT[variant],
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
