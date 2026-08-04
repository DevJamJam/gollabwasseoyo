import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // 설계서 §3 학습 목표 · §31.1 — any를 쓰지 않고 unknown + 타입 가드로 좁힌다.
    // eslint-config-next는 이 규칙을 warn으로 둔다. 경고는 쌓이면 무시되므로
    // error로 올려 CI와 커밋 전에 실제로 막히게 한다.
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
