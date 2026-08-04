'use client';

/**
 * 모달 껍데기.
 *
 * 오늘 넣는 것 — role="dialog" · aria-modal · aria-labelledby ·
 * Esc로 닫기 · 배경 스크롤 잠금.
 *
 * 오늘 넣지 않는 것 — Tab 순환 트랩. 직접 구현하면 난도가 높고 버그가 잘 생긴다.
 * 위 다섯 가지만 있어도 스크린리더와 키보드 사용자가 모달을 인지하고
 * 조작하고 빠져나올 수 있다. 여유가 생기면 마지막에 보강한다.
 */

import { useEffect, useId } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const titleId = useId();

  // Esc로 닫기. open이 false면 리스너를 아예 걸지 않는다.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // 모달 뒤 배경이 스크롤되면 어디를 보고 있었는지 잃는다.
  // cleanup에서 원래 값으로 되돌려야 다른 곳에서 건드린 스타일을 지우지 않는다.
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* 배경. 클릭하면 닫히지만 스크린리더는 읽지 않는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden bg-white',
          'rounded-t-xl sm:max-w-2xl sm:rounded-xl',
        ].join(' ')}
      >
        <header className="border-b border-slate-200 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
