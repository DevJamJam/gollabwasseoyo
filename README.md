# 골라봤어요

**구매 전 후보 비교부터 실제 선택과 사용 후 평가까지 남기는 개인 구매 기록 웹앱입니다.**

용량이 다른 커피 원두를 비교하고, 어떤 원두를 왜 골랐는지 기록할 수 있습니다. 다음 구매 때는 이전에 보류한 후보와 당시 적어둔 기대·걱정도 다시 꺼내볼 수 있습니다.

[서비스 바로가기](https://gollabwasseoyo.vercel.app/)

처음 접속했다면 홈의 **샘플 데이터 불러오기**로 예시 기록을 확인할 수 있습니다. 직접 체험하려면 **고민 등록 → 후보 비교 → 구매 기록 → 상품별 평가** 순서로 진행해 보세요.

## 주요 기능

| 영역 | 제공 기능 |
| --- | --- |
| 고민 등록·후보 비교 | 후보를 최대 4개 등록하고 가격, 옵션, 기대·걱정을 나란히 비교합니다. 예를 들어 용량이 다른 원두의 가격을 100g당 가격으로 환산해 비교할 수 있습니다. |
| 구매 기록 | 구매한 후보, 수량, 최종 결제금액, 선택 이유를 기록합니다. 상품 금액 합계와 결제금액이 다르면 차액을 표시합니다. |
| 상품별 평가 | 구매한 상품마다 별점, 재구매 의사, 한 줄 후기를 남기고 수정하거나 삭제할 수 있습니다. |
| 이전 후보 다시 쓰기 | 과거에 보류했던 후보와 당시 비교 메모를 새 고민에 불러올 수 있습니다. |
| 목록 탐색 | 카테고리, 태그, 진행 상태, 검색어로 기록을 찾습니다. 적용한 조건은 URL에 반영되어 새로고침 후에도 유지됩니다. |

## 구현에서 고려한 점

- **후보마다 내용 길이가 달라도 같은 항목끼리 비교** — CSS `subgrid`로 카드가 부모의 행 높이를 공유합니다. 한 후보의 메모가 길어져도 다음 비교 항목의 위치가 맞습니다.
- **구매와 평가 기록에서 진행 상태 계산** — 목록과 상세 화면이 같은 [상태 계산 함수](src/lib/derive.ts)를 사용합니다. 평가를 삭제하면 기존 구매 기록을 바탕으로 상태가 ‘구매 완료’로 돌아갑니다.
- **저장이 성공한 뒤 화면 갱신** — [공통 저장 경로](src/store/DecisionsProvider.tsx)에서 브라우저 저장 결과를 확인합니다. 저장에 실패하면 기존 화면 상태를 유지하고 실패 이유를 안내합니다.

## 기술 스택

![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-0F172A?style=flat&logo=tailwindcss&logoColor=38BDF8)
![Vitest 4](https://img.shields.io/badge/Vitest-4-252529?style=flat&logo=vitest&logoColor=6E9F18)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

| 구분 | 사용 기술 |
| --- | --- |
| 프레임워크·언어 | Next.js App Router, React, TypeScript |
| 스타일 | Tailwind CSS, CSS Grid·Subgrid |
| 상태·저장 | React Context, 브라우저 localStorage |
| 검증 | Vitest, React Testing Library, jsdom |
| 배포 | Vercel |

기록은 현재 브라우저의 localStorage에 저장됩니다. 다른 브라우저나 기기에서는 별도의 기록을 사용합니다.

## 폴더 구조

```text
src/
├── app/          # 페이지, 레이아웃, 전역 스타일
├── components/   # 화면 컴포넌트와 공통 UI
├── lib/          # 도메인 규칙, URL 필터, 저장소
└── store/        # 기록 상태와 저장 액션
```

## 로컬 실행 및 검증

개발과 테스트에는 Node.js **22.13 이상인 22.x 또는 24.x**를 사용합니다.

```bash
npm ci
npm run dev
```

브라우저에서 [localhost:3000](http://localhost:3000)을 엽니다.

```bash
npm run lint
npm test
npx next typegen
npm run typecheck
npm run build
```

단위 테스트는 상태 계산, 단위 환산, 저장 데이터와 폼 검증을 다룹니다. 컴포넌트 테스트는 저장 후 상태 배지 변경과 제출 실패 시 첫 오류 입력란으로의 포커스 이동을 확인합니다.

[개발 과정과 상세 설계 기록](https://github.com/DevJamJam/gollabwasseoyo/blob/e3a66249ccbdc13f7fc045262898dcfcaaa30f52/README.md)
