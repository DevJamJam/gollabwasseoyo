'use client';

import { useEffect, useRef } from 'react';

import { Button } from './Button';
import { Modal } from './Modal';

/**
 * 되돌릴 수 없는 동작을 확인받는다.
 *
 * 이 앱에는 휴지통이 없다. 삭제는 곧 영구 삭제다.
 * 그래서 무엇이 함께 사라지는지를 문구에 정확히 적는다.
 * "정말 삭제할까요?"만으로는 후보 4개와 평가 2개가 같이 없어진다는 걸 알 수 없다.
 *
 * ── 기본 포커스를 '취소'에 두는 이유 ──
 * 다이얼로그가 뜨자마자 Enter를 누르는 습관이 있는 사람이 많다.
 * 위험한 쪽에 포커스가 있으면 그 습관이 사고가 된다.
 *
 * ── 성공했을 때만 닫는다 ──
 * onConfirm이 false를 돌려주면 열어둔 채로 안내만 띄운다.
 * 저장에 실패했는데 다이얼로그가 닫히면 사용자는 지워진 줄 안다.
 */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  /** 실패 시 표시할 문구. 있으면 다이얼로그가 닫히지 않는다. */
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button ref={cancelRef} onClick={onCancel}>
            취소
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-slate-700">{description}</div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {error}
        </p>
      )}
    </Modal>
  );
}
