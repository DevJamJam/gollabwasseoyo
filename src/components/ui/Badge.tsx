/**
 * 상태·카테고리 배지.
 *
 * 색만으로 구분되는 정보를 만들지 않는다. 색각 이상이 있는 사용자에게
 * '구매 완료'와 '평가 완료'가 같은 회색으로 보이면 안 되므로,
 * 텍스트 라벨을 언제나 함께 그린다.
 *
 * 이 파일은 도메인 타입을 import하지 않는다. 그래야 진짜로 재사용된다.
 */

type BadgeTone = 'neutral' | 'info' | 'success' | 'danger';

const TONE: Record<BadgeTone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
};

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
