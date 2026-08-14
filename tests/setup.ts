/**
 * 모든 테스트 파일 앞에 한 번씩 실행된다.
 *
 * jest-dom 매처(toBeDisabled · toHaveFocus · toHaveValue)를 붙인다.
 * 없으면 `expect(el.disabled).toBe(true)` 처럼 써야 하는데,
 * 실패했을 때 "true를 기대했는데 false" 라고만 나와서 어느 요소인지 알 수 없다.
 * 매처를 쓰면 실패 메시지가 그 요소의 HTML을 같이 보여준다.
 *
 * 순수 함수 테스트(environment: node)에도 같이 실행되지만
 * 매처를 등록만 할 뿐이라 부담이 없다.
 */

import '@testing-library/jest-dom/vitest';
