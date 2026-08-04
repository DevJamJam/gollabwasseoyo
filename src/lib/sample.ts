/**
 * 샘플 데이터.
 *
 * 데이터가 0건일 때 홈에서 '샘플 데이터 불러오기'로 주입한다.
 * 다른 브라우저·기기에서 접속하면 빈 화면이 보이는데, 그게 고장이 아니라
 * localStorage가 오리진 단위로 격리되기 때문이라는 걸 보여주기 위한 장치다.
 *
 * 컴포넌트가 임의의 Decision[]을 주입하지 못하도록 Provider가 이 상수를 소유하고,
 * seedSample()이 cloneDecision으로 복사해 commit()에 넘긴다.
 * 이 배열 자체가 상태에 들어가면 원본이 오염된다.
 */

import type { Decision } from './types';

export const SAMPLE_DECISIONS: Decision[] = [
  // ── 1건: 평가 완료 (구매 2건 중 2건 평가) ──────────────────────
  {
    id: 'sample-coffee',
    title: '겨울 홈카페 원두',
    category: 'food',
    tags: ['원두', '고소한맛', '대용량'],
    purpose: '매일 아침 2잔, 산미 적은 것',
    budget: 40000,
    candidates: [
      {
        id: 'sample-coffee-a',
        name: '올드독',
        comparePrice: 18000,
        brand: '프릳츠',
        familiarity: 'used',
        amount: { value: 200, unit: 'g' },
        seller: '공식몰',
        pros: ['고소함', '배송 빠름'],
        cons: ['가격'],
      },
      {
        id: 'sample-coffee-b',
        name: '블렌드 넘버3',
        comparePrice: 24000,
        brand: '커피리브레',
        familiarity: 'new',
        amount: { value: 500, unit: 'g' },
        pros: ['대용량'],
        cons: ['산미 있을 수도'],
        memo: '리뷰에서 산미 얘기가 갈린다',
      },
      {
        id: 'sample-coffee-c',
        name: '디카페인 하우스',
        comparePrice: 21000,
        brand: '테라로사',
        familiarity: 'new',
        amount: { value: 1, unit: 'kg' },
        shippingNote: '3만원 이상 무료배송',
        pros: ['가성비'],
        cons: [],
      },
    ],
    order: {
      purchasedAt: '2026-01-12',
      totalPaid: 47000,
      seller: '네이버 스마트스토어',
      reason: 'A는 무난해서 유지, B는 새로 시도해보려고',
      items: [
        {
          candidateId: 'sample-coffee-a',
          unitPrice: 18000,
          quantity: 1,
          amount: { value: 200, unit: 'g' },
          review: {
            rating: 4,
            repurchase: 'yes',
            oneLine: '늘 먹던 맛. 실패가 없다',
            goods: ['일정한 맛', '배송 빠름'],
            bads: ['조금 비쌈'],
            nextChange: '1kg 대용량이 나오면 그걸로',
            updatedAt: '2026-01-26T09:00:00.000Z',
          },
        },
        {
          candidateId: 'sample-coffee-b',
          unitPrice: 14500,
          quantity: 2,
          amount: { value: 500, unit: 'g' },
          review: {
            rating: 3,
            repurchase: 'maybe',
            oneLine: '생각보다 산미가 있었다',
            goods: ['양이 많다'],
            bads: ['산미', '분쇄도가 굵음'],
            updatedAt: '2026-01-28T09:00:00.000Z',
          },
        },
      ],
    },
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-28T09:00:00.000Z',
  },

  // ── 1건: 고민 중 (주문 없음) ────────────────────────────────
  {
    id: 'sample-keyboard',
    title: '재택용 키보드',
    category: 'digital',
    tags: ['키보드', '무접점'],
    purpose: '하루 8시간 타이핑, 소음 적은 것',
    candidates: [
      {
        id: 'sample-keyboard-a',
        name: 'RC930-87',
        comparePrice: 219000,
        brand: '레오폴드',
        option: '45g 정전용량',
        familiarity: 'new',
        link: 'https://example.com/rc930',
        pros: ['정숙함', '빌드 품질'],
        cons: ['가격', '무거움'],
      },
      {
        id: 'sample-keyboard-b',
        name: 'HHKB Pro Hybrid',
        comparePrice: 385000,
        brand: 'PFU',
        familiarity: 'new',
        shippingNote: '해외배송 2주',
        pros: ['타건감'],
        cons: ['배열 적응', '가격'],
        memo: '배열이 특이해서 적응 기간 필요',
      },
    ],
    order: null,
    createdAt: '2026-02-02T09:00:00.000Z',
    updatedAt: '2026-02-02T09:00:00.000Z',
  },
];
