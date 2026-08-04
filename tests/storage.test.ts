/**
 * @vitest-environment jsdom
 */

// 이 파일만 브라우저 환경(jsdom)을 쓴다.
// storage.ts가 window.localStorage를 만지기 때문이다.
// 순수 함수 테스트까지 전부 jsdom으로 올리면 설정 비용과 실행 시간만 늘어난다.

import { beforeEach, describe, expect, it } from 'vitest';

import { load, save } from '@/lib/storage';
import type { StoreSchema } from '@/lib/types';

import { makeDecision, makeStoredDecision } from './factory';

const STORAGE_KEY = 'gollab:v1';

/** 검증을 우회해 저장소에 원시 값을 직접 넣는다. */
function writeRaw(value: unknown): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

beforeEach(() => {
  // storage.ts가 'gollab:v1' 고정 키를 쓰므로 앞 테스트가 남긴 값이
  // 뒤 테스트를 통과시키거나 실패시킨다. 매번 비운다.
  window.localStorage.clear();
});

/* ══════════════════════════════════════════════════════════
   블록 4 — 파싱과 형태 검사
   ══════════════════════════════════════════════════════════ */

describe('load — 파싱과 최소 형태 검사', () => {
  it('save한 데이터를 load로 그대로 되읽는다 (왕복)', () => {
    const data: StoreSchema = {
      version: 1,
      decisions: [makeDecision()],
    };

    expect(save(data)).toEqual({ ok: true });

    const result = load();
    expect(result.ok).toBe(true);
    expect(result.data).toEqual(data);
  });

  it('첫 방문(키 없음)은 오류가 아니라 빈 스키마다', () => {
    const result = load();

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ version: 1, decisions: [] });
  });

  it('JSON 문법이 깨지면 corrupted다', () => {
    window.localStorage.setItem(STORAGE_KEY, '{{{');

    const result = load();
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('corrupted');
    expect(result.data.decisions).toEqual([]);
  });

  it('스키마 버전이 다르면 corrupted다 (가짜 마이그레이션을 두지 않는다)', () => {
    writeRaw({ version: 99, decisions: [] });

    const result = load();
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('corrupted');
  });

  it('필수 필드가 통째로 없는 고민은 corrupted다', () => {
    writeRaw({ version: 1, decisions: [{}] });

    expect(load().ok).toBe(false);
  });

  it('선택 문자열의 타입이 어긋나면 corrupted다 (brand = {})', () => {
    writeRaw({
      version: 1,
      decisions: [
        makeStoredDecision({
          candidates: [
            {
              id: 'c1',
              name: 'A',
              comparePrice: 1000,
              brand: {}, // 문자열이 아니다 → 화면에서 [object Object]
              pros: [],
              cons: [],
            },
          ],
        }),
      ],
    });

    expect(load().ok).toBe(false);
  });

  it('문자열 배열에 숫자가 섞이면 corrupted다 (pros = [1, 2])', () => {
    writeRaw({
      version: 1,
      decisions: [
        makeStoredDecision({
          candidates: [
            {
              id: 'c1',
              name: 'A',
              comparePrice: 1000,
              pros: [1, 2], // 리스트 렌더에서 .trim()·key가 깨진다
              cons: [],
            },
          ],
        }),
      ],
    });

    expect(load().ok).toBe(false);
  });

  it('별점이 범위를 벗어나면 corrupted다 (rating = 6)', () => {
    writeRaw({
      version: 1,
      decisions: [
        makeStoredDecision({
          order: {
            purchasedAt: '2026-01-10',
            totalPaid: 1000,
            reason: '테스트',
            items: [
              {
                candidateId: 'c1',
                unitPrice: 1000,
                quantity: 1,
                review: {
                  rating: 6, // 별 6개를 그리려다 배열 길이가 어긋난다
                  repurchase: 'yes',
                  oneLine: '좋음',
                  goods: [],
                  bads: [],
                  updatedAt: '2026-01-20T00:00:00.000Z',
                },
              },
            ],
          },
        }),
      ],
    });

    expect(load().ok).toBe(false);
  });

  /**
   * 의도적으로 통과시키는 경우.
   *
   * pros가 4개인 것은 규칙 위반이지만 화면을 깨뜨리지는 않는다.
   * 여기서 corrupted를 내면 사용자 기록 전체를 빈 상태로 되돌리게 되므로
   * 손실이 문제보다 크다. 폼 검증과 Provider 불변식이 잡는다.
   *
   * 이 경로가 '폼 검증의 개수 검사가 죽은 코드가 아닌 이유'이기도 하다.
   */
  it('기대·걱정이 4개여도 load는 통과시킨다 (의도된 범위 결정)', () => {
    writeRaw({
      version: 1,
      decisions: [
        makeStoredDecision({
          candidates: [
            {
              id: 'c1',
              name: 'A',
              comparePrice: 1000,
              pros: ['1', '2', '3', '4'],
              cons: [],
            },
          ],
        }),
      ],
    });

    expect(load().ok).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════
   블록 5 — 참조 관계 검증
   ══════════════════════════════════════════════════════════ */

describe('load — id 유일성과 참조 무결성', () => {
  it('Decision id가 중복이면 corrupted다', () => {
    writeRaw({
      version: 1,
      decisions: [
        makeStoredDecision({ id: 'd1' }),
        makeStoredDecision({ id: 'd1' }),
      ],
    });

    const result = load();
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('corrupted');
    expect(result.data.decisions).toEqual([]);
  });

  it('후보 id가 중복이면 corrupted다', () => {
    writeRaw({
      version: 1,
      decisions: [
        makeStoredDecision({
          candidates: [
            { id: 'c1', name: 'A', comparePrice: 1000, pros: [], cons: [] },
            { id: 'c1', name: 'B', comparePrice: 2000, pros: [], cons: [] },
          ],
        }),
      ],
    });

    expect(load().ok).toBe(false);
  });

  it('한 주문에 같은 후보가 두 번 들어가면 corrupted다 (규칙 P-2)', () => {
    writeRaw({
      version: 1,
      decisions: [
        makeStoredDecision({
          candidates: [
            { id: 'c1', name: 'A', comparePrice: 1000, pros: [], cons: [] },
          ],
          order: {
            purchasedAt: '2026-01-10',
            totalPaid: 2000,
            reason: '테스트',
            items: [
              { candidateId: 'c1', unitPrice: 1000, quantity: 1, review: null },
              { candidateId: 'c1', unitPrice: 1000, quantity: 1, review: null },
            ],
          },
        }),
      ],
    });

    expect(load().ok).toBe(false);
  });

  it('존재하지 않는 후보를 가리키는 구매 항목이 있으면 corrupted다', () => {
    writeRaw({
      version: 1,
      decisions: [
        makeStoredDecision({
          candidates: [
            { id: 'c1', name: 'A', comparePrice: 1000, pros: [], cons: [] },
          ],
          order: {
            purchasedAt: '2026-01-10',
            totalPaid: 1000,
            reason: '테스트',
            items: [
              {
                candidateId: 'ghost', // 후보 목록에 없다
                unitPrice: 1000,
                quantity: 1,
                review: null,
              },
            ],
          },
        }),
      ],
    });

    expect(load().ok).toBe(false);
  });
});
