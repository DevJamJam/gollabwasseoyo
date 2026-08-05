/**
 * 라벨 + 입력 + 오류 + 도움말을 한 덩어리로 묶는다.
 *
 * 폼 필드가 30개가 넘는데 매번 htmlFor와 aria-describedby를 손으로 맞추면
 * 반드시 어딘가 어긋난다. id 생성 규칙을 한 곳에 두고 전부 여기서 만든다.
 *
 * placeholder를 라벨 대용으로 쓰지 않는다. 입력을 시작하면 사라져서
 * 무슨 칸이었는지 알 수 없게 된다.
 */

/**
 * 입력칸 공통 스타일.
 *
 * 파일마다 복사해 붙이면 Day 4쯤에 테두리 색과 높이가 제각각이 된다.
 * 여기서 한 번만 정한다.
 *
 * ⚠️ **너비는 여기 넣지 않는다.**
 * w-full을 넣어뒀더니 `${inputClass} w-24` 처럼 덮어쓰려는 곳에서
 * width가 두 번 걸렸다. 어느 쪽이 이기는지는 클래스를 쓴 순서가 아니라
 * Tailwind가 만든 CSS 안의 순서로 정해져서, 의도와 반대로 동작할 수 있다.
 * 거기에 shrink-0까지 붙으면 줄어들지도 못해 가로 스크롤이 생긴다.
 *
 * 너비는 쓰는 자리에서 정한다.
 *   혼자 있을 때        w-full
 *   flex 줄 안에 있을 때 flex-1 min-w-0
 *
 * min-w-0이 필요한 이유: flex 자식은 기본이 min-width:auto라
 * 내용보다 작게 줄어들지 못한다. input은 size 기본값 20자만큼을
 * 최소 너비로 갖기 때문에 좁은 칸에서 그대로 넘친다.
 */
export const inputClass = [
  'h-11 rounded-md border border-slate-300 px-3 text-sm',
  'placeholder:text-slate-400',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
  'aria-invalid:border-red-500',
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
].join(' ');

/** 혼자 한 줄을 다 쓰는 입력칸. */
export const fullInputClass = `${inputClass} w-full`;

/** flex 줄 안에서 남는 공간을 채우는 입력칸. */
export const flexInputClass = `${inputClass} min-w-0 flex-1`;

/** label의 htmlFor · input의 id · 포커스 이동이 모두 이 함수를 쓴다. */
export function fieldId(key: PropertyKey): string {
  return 'f-' + String(key);
}

export function fieldErrorId(key: PropertyKey): string {
  return fieldId(key) + '-error';
}

export function fieldHelpId(key: PropertyKey): string {
  return fieldId(key) + '-help';
}

/** 구매 폼은 상품 행마다 같은 이름의 칸이 반복되므로 candidateId까지 넣어야 유일해진다. */
export function itemFieldId(candidateId: string, key: PropertyKey): string {
  return 'f-item-' + candidateId + '-' + String(key);
}

interface FieldProps {
  /** fieldId를 만들 키. 폼 값의 필드명을 그대로 쓴다. */
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  /** id와 aria 속성을 받아 실제 입력 요소를 그린다. */
  children: (props: {
    id: string;
    'aria-invalid': boolean | undefined;
    'aria-describedby': string | undefined;
  }) => React.ReactNode;
}

export function Field({
  name,
  label,
  required = false,
  error,
  help,
  children,
}: FieldProps) {
  const id = fieldId(name);
  const errorId = fieldErrorId(name);
  const helpId = fieldHelpId(name);

  // 오류와 도움말이 둘 다 있으면 둘 다 읽어준다
  const describedBy =
    [error ? errorId : null, help ? helpId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> (필수)</span>}
      </label>

      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}

      {help && (
        <p id={helpId} className="text-xs text-slate-500">
          {help}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
