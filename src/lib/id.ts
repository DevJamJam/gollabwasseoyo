/**
 * id 생성.
 *
 * crypto.randomUUID()는 '보안 컨텍스트'(HTTPS 또는 localhost)에서만 존재한다.
 * Vercel(HTTPS)과 localhost에서는 항상 있지만, Day 7에 실제 스마트폰으로
 * http://192.168.x.x:3000 에 접속해 확인할 때는 undefined다.
 * 폴백이 없으면 그 자리에서 고민 저장이 터지고, 원인을 모르면 마감일에 시간을 잃는다.
 *
 * id는 이 앱 안에서만 유일하면 되므로 폴백은 단순해도 된다.
 * (시각 36진수 + 난수 8자리 → 같은 밀리초에 8자리 난수까지 겹칠 확률은 무시할 수 있다)
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
