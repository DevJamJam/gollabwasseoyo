'use client';

import { useContext } from 'react';

import { DecisionsContext } from './DecisionsProvider';
import type { DecisionsContextValue } from './DecisionsProvider';

/**
 * 컴포넌트가 상태와 액션에 접근하는 유일한 통로.
 *
 * Provider 밖에서 부르면 context가 null이라 조용히 undefined를 다루게 된다.
 * 그러면 '왜 저장이 안 되지'로 한참 헤매게 되므로 즉시 던진다.
 */
export function useDecisions(): DecisionsContextValue {
  const context = useContext(DecisionsContext);

  if (context === null) {
    throw new Error(
      'useDecisions()는 <DecisionsProvider> 안에서만 쓸 수 있습니다.',
    );
  }

  return context;
}
