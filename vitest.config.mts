import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // tsconfig.json의 paths({ "@/*": ["./src/*"] })를 Vitest에서도 해석한다.
    // 이게 없으면 테스트의 '@/lib/derive' import가 전부 실패한다.
    //
    // 설계서(§22.1)는 vite-tsconfig-paths 플러그인을 쓰라고 했지만,
    // 현재 Vite는 이 기능을 네이티브로 지원하므로 플러그인을 두지 않는다.
    // (플러그인은 unmaintained로 표시된 tsconfck에 의존한다)
    tsconfigPaths: true,
  },
  test: {
    // 기본 환경은 node — 브라우저 API가 필요 없는 순수 함수 테스트가 대부분이다.
    // 브라우저가 필요한 파일(storage.test.ts · *-ui.test.tsx)만 상단 주석으로
    // @vitest-environment jsdom 을 지정한다.
    environment: 'node',

    // jest-dom 매처 등록. 파일마다 import하지 않기 위해 여기 둔다.
    setupFiles: ['./tests/setup.ts'],
  },
});
