'use client';

import { useDecisions } from '@/store/useDecisions';
import type { StorageNoticeKind } from '@/lib/types';

/**
 * 저장소 상태 안내 배너.
 *
 * 세 가지 상황의 성격이 다르고, 그래서 수명도 다르다.
 *
 *   quota        이번 저장 시도가 실패했다. 공간을 비우고 다시 저장하면 해소된다.
 *                → 다음 저장이 성공하면 commit()이 알아서 지운다.
 *   corrupted    읽을 때 데이터가 깨져 있었다. 새로 시작하면 정상 동작한다.
 *                → 한 번 알리고 사용자가 닫는다.
 *   unavailable  이 환경에서는 저장이 아예 안 된다(시크릿 모드 등).
 *                → 계속 떠 있어야 한다. 닫을 수 없다.
 */

const MESSAGE: Record<StorageNoticeKind, string> = {
  quota: '저장 공간이 부족합니다. 오래된 기록을 삭제해 주세요.',
  corrupted: '저장된 데이터를 읽지 못했습니다. 새 기록부터 시작합니다.',
  unavailable: '이 브라우저에서는 기록이 저장되지 않습니다.',
};

const TONE: Record<StorageNoticeKind, string> = {
  quota: 'border-amber-200 bg-amber-50 text-amber-900',
  corrupted: 'border-amber-200 bg-amber-50 text-amber-900',
  unavailable: 'border-red-200 bg-red-50 text-red-900',
};

export function StorageNotice() {
  const { notice, dismissNotice } = useDecisions();

  if (!notice) return null;

  const dismissible = notice !== 'unavailable';

  return (
    <div
      // 화면이 이미 그려진 뒤에 나타나므로 스크린리더에 알려야 한다.
      // assertive가 아니라 polite다 — 읽던 것을 끊을 만큼 급한 소식은 아니다.
      role="status"
      aria-live="polite"
      className={`border-b px-4 py-2.5 text-sm ${TONE[notice]}`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <p>{MESSAGE[notice]}</p>

        {dismissible && (
          <button
            type="button"
            onClick={dismissNotice}
            className="shrink-0 rounded px-2 py-1 text-xs underline underline-offset-2 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            닫기
          </button>
        )}
      </div>
    </div>
  );
}
