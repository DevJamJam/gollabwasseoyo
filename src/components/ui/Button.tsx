/**
 * 버튼.
 *
 * 설계서의 필수 프리미티브 목록에는 없지만, 버튼 스타일을 파일마다
 * 복사해 붙이면 Day 3부터 색이 제각각이 된다. 여기서 한 번만 정한다.
 *
 * 색은 회색 계열 + 위험색 하나만 쓴다. 디자인 시스템을 만들지 않는다.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
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
