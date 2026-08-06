/**
 * 샘플 데이터.
 *
 * 데이터가 0건일 때 홈에서 '샘플 데이터 불러오기'로 주입한다.
 * 다른 브라우저·기기에서 접속하면 빈 화면이 보이는데, 그게 고장이 아니라
 * localStorage가 오리진 단위로 격리되기 때문이라는 걸 보여주기 위한 장치다.
 *
 * ── 숫자가 서로 맞아야 한다 ──
 * 예시라고 대충 채우면 안 된다. 이 앱은 '내가 뭘 보고 뭘 골랐나'를
 * 기록하는 앱인데 예시의 앞뒤가 안 맞으면 화면이 무엇을 보여주려는 건지도
 * 흐려진다. 아래 값들은 실제로 계산이 성립한다.
 *
 *   올드독      200g 18,000원  →  100g당 9,000원
 *   블렌드      500g 16,000원  →  100g당 3,200원
 *   디카페인    1kg  24,000원  →  100g당 2,400원
 *
 *   구매: 올드독 18,000 × 1  +  블렌드 16,000 × 2  =  50,000원
 *   최종 결제 47,000원  →  차액 −3,000원 (쿠폰)
 *
 *   비교 가격과 실제 단가가 같다. 할인받았다면 왜 그런지가 기록에 있어야
 *   하는데 이 앱은 그 필드를 두지 않기로 했으므로, 같은 값으로 둔다.
 *
 *   예산 40,000원인데 47,000원을 썼다. 앱은 예산 초과를 막지 않는다.
 *   실제로 흔히 일어나는 일이고, 그걸 기록으로 남기는 게 이 앱의 목적이다.
 *
 * 컴포넌트가 임의의 Decision[]을 주입하지 못하도록 Provider가 이 상수를 소유하고,
 * seedSample()이 cloneDecision으로 복사해 commit()에 넘긴다.
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
        option: '홀빈',
        familiarity: 'used',
        amount: { value: 200, unit: 'g' },
        seller: '공식몰',
        link: 'https://example.com/olddog',
        shippingNote: '3만원 이상 무료배송',
        pros: ['늘 먹던 맛', '배송 빠름'],
        cons: ['100g당 9,000원은 비쌈'],
      },
      {
        id: 'sample-coffee-b',
        name: '블렌드 넘버3',
        comparePrice: 16000,
        brand: '커피리브레',
        option: '분쇄',
        familiarity: 'new',
        amount: { value: 500, unit: 'g' },
        seller: '네이버 스마트스토어',
        pros: ['같은 값에 양이 두 배 반'],
        cons: ['산미가 있을 수도', '분쇄된 것만 팔아 향이 빨리 날아감'],
        memo: '리뷰에서 산미 얘기가 갈린다',
      },
      {
        id: 'sample-coffee-c',
        name: '디카페인 하우스',
        comparePrice: 24000,
        brand: '테라로사',
        familiarity: 'new',
        amount: { value: 1, unit: 'kg' },
        shippingNote: '무료배송',
        pros: ['100g당 2,400원으로 제일 쌈'],
        cons: ['디카페인이라 아침에 안 맞음'],
        memo: '싸긴 한데 목적이 아침 2잔이라 어긋난다',
      },
    ],
    order: {
      purchasedAt: '2026-01-12',
      // 18,000 × 1 + 16,000 × 2 = 50,000. 쿠폰 3,000원을 빼고 47,000원을 냈다.
      totalPaid: 47000,
      seller: '네이버 스마트스토어',
      reason: '올드독은 실패가 없어서 유지, 블렌드는 100g당 값이 싸서 시도',
      items: [
        {
          candidateId: 'sample-coffee-a',
          unitPrice: 18000,
          quantity: 1,
          amount: { value: 200, unit: 'g' },
          review: {
            rating: 4,
            repurchase: 'yes',
            oneLine: '늘 먹던 맛. 아침에 실패가 없다',
            goods: ['일정한 맛', '배송 빠름'],
            bads: ['200g이 2주 만에 떨어짐'],
            nextChange: '같은 원두를 500g으로 파는지 찾아보기',
            updatedAt: '2026-01-26T09:00:00.000Z',
          },
        },
        {
          candidateId: 'sample-coffee-b',
          unitPrice: 16000,
          quantity: 2,
          amount: { value: 500, unit: 'g' },
          review: {
            rating: 3,
            repurchase: 'maybe',
            oneLine: '걱정하던 산미가 실제로 있었다',
            goods: ['양은 확실히 넉넉함'],
            bads: ['산미', '분쇄된 상태라 2주 뒤엔 향이 많이 빠짐'],
            nextChange: '분쇄 말고 홀빈으로, 500g은 한 봉지만',
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
    purpose: '하루 8시간 타이핑, 밤에도 쓰니 소음 적은 것',
    budget: 250000,
    candidates: [
      {
        id: 'sample-keyboard-a',
        name: 'RC930-87',
        comparePrice: 219000,
        brand: '레오폴드',
        option: '45g 정전용량',
        familiarity: 'new',
        amount: { value: 1, unit: 'ea' },
        seller: '스위치몰',
        link: 'https://example.com/rc930',
        shippingNote: '무료배송',
        pros: ['정숙함', '빌드 품질'],
        cons: ['예산에 거의 꽉 참'],
      },
      {
        id: 'sample-keyboard-b',
        name: 'HHKB Pro Hybrid',
        comparePrice: 385000,
        brand: 'PFU',
        familiarity: 'new',
        amount: { value: 1, unit: 'ea' },
        shippingNote: '해외배송 2주',
        pros: ['타건감'],
        cons: ['예산을 13만원 넘김', '배열 적응 필요'],
        memo: '배열이 특이해서 적응 기간이 필요하다',
      },
    ],
    order: null,
    createdAt: '2026-02-02T09:00:00.000Z',
    updatedAt: '2026-02-02T09:00:00.000Z',
  },
];
