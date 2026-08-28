/**
 * 미리 심어 둔 시장 데이터.
 *
 * 사용자가 PDF 를 올리기 전에도 화면이 서 있어야 한다. 조원 안의
 * "DB 에서 뽑은 걸 먼저 심고, 사용자가 목록을 올리면 그 위에 얹는다" 가 이것이다.
 *
 * ⚠️ 전부 **집계**다. 개별 물건은 업로드로만 들어온다.
 * ⚠️ 손으로 옮긴 값이 아니라 원본 파일에서 생성했다.
 *    바꾸려면 data/ 의 원본을 고치고 다시 생성할 것.
 */

export interface MarketRow {
  /** seoul = 서울 전체 · hwagok = 서울 강서구 화곡동 */
  scope: 'seoul' | 'hwagok'
  usage: string
  soldRate: number      // 매각율(%) = 매각 ÷ 진행
  priceRate: number     // 매각가율(%) = 매각가 ÷ 감정가
  bidders: number
  listed: number; sold: number; failed: number; changed: number; withdrawn: number
  appraisalWon: number; winningWon: number
}

export interface MonthlyRow {
  month: string         // 202508
  appraisalWon: number; winningWon: number
  priceRate: number; listed: number; sold: number; bidders: number; soldRate: number
}

export interface DealRow {
  usage: string
  totalWon: number
  avgPyeong: number; medPyeong: number; maxPyeong: number  // 만원/3.3㎡
  count: number
  yoy: number           // 전년동기대비 평당가 상승률(%)
}

/** 지지옥션 지역별 경매매각통계 · 2025.08~2026.07 · 용도 12종 */
export const MARKET_PERIOD = '2025.08 ~ 2026.07'
export const MARKET: MarketRow[] = [
 {
  "scope": "seoul",
  "usage": "아파트",
  "soldRate": 46.58,
  "priceRate": 97.57,
  "bidders": 6.58,
  "listed": 2121,
  "sold": 988,
  "failed": 1133,
  "changed": 248,
  "withdrawn": 238,
  "appraisalWon": 940284903433,
  "winningWon": 917465427091
 },
 {
  "scope": "seoul",
  "usage": "단독/다가구",
  "soldRate": 26.89,
  "priceRate": 72.96,
  "bidders": 3.14,
  "listed": 1521,
  "sold": 409,
  "failed": 1112,
  "changed": 243,
  "withdrawn": 105,
  "appraisalWon": 827760301580,
  "winningWon": 603939194522
 },
 {
  "scope": "seoul",
  "usage": "연립/다세대",
  "soldRate": 24.22,
  "priceRate": 75.2,
  "bidders": 2.4,
  "listed": 21216,
  "sold": 5139,
  "failed": 16077,
  "changed": 1203,
  "withdrawn": 311,
  "appraisalWon": 1563116184316,
  "winningWon": 1175487941625
 },
 {
  "scope": "seoul",
  "usage": "오피스텔(주거용)",
  "soldRate": 22.41,
  "priceRate": 73.58,
  "bidders": 2.02,
  "listed": 7812,
  "sold": 1751,
  "failed": 6061,
  "changed": 436,
  "withdrawn": 49,
  "appraisalWon": 477157092480,
  "winningWon": 351107904571
 },
 {
  "scope": "seoul",
  "usage": "업무/상업시설(일반)",
  "soldRate": 24.14,
  "priceRate": 76.65,
  "bidders": 2.42,
  "listed": 377,
  "sold": 91,
  "failed": 286,
  "changed": 72,
  "withdrawn": 33,
  "appraisalWon": 654504243712,
  "winningWon": 501660825242
 },
 {
  "scope": "seoul",
  "usage": "업무/상업시설(집합)",
  "soldRate": 18.11,
  "priceRate": 62.39,
  "bidders": 2.17,
  "listed": 3695,
  "sold": 669,
  "failed": 3026,
  "changed": 327,
  "withdrawn": 118,
  "appraisalWon": 371262100210,
  "winningWon": 231615310231
 },
 {
  "scope": "seoul",
  "usage": "공업시설",
  "soldRate": 17.42,
  "priceRate": 86.61,
  "bidders": 2.06,
  "listed": 1068,
  "sold": 186,
  "failed": 882,
  "changed": 136,
  "withdrawn": 5,
  "appraisalWon": 338404067610,
  "winningWon": 293097905363
 },
 {
  "scope": "seoul",
  "usage": "대지",
  "soldRate": 22.72,
  "priceRate": 65.85,
  "bidders": 2.03,
  "listed": 427,
  "sold": 97,
  "failed": 330,
  "changed": 70,
  "withdrawn": 32,
  "appraisalWon": 187010826763,
  "winningWon": 123139334214
 },
 {
  "scope": "seoul",
  "usage": "임야",
  "soldRate": 14.47,
  "priceRate": 37.04,
  "bidders": 1.96,
  "listed": 159,
  "sold": 23,
  "failed": 136,
  "changed": 5,
  "withdrawn": 10,
  "appraisalWon": 20560354845,
  "winningWon": 7616318910
 },
 {
  "scope": "seoul",
  "usage": "잡종지",
  "soldRate": 25.0,
  "priceRate": 41.12,
  "bidders": 1.67,
  "listed": 12,
  "sold": 3,
  "failed": 9,
  "changed": 0,
  "withdrawn": 0,
  "appraisalWon": 4628280000,
  "winningWon": 1903188000
 },
 {
  "scope": "seoul",
  "usage": "전/답/과수",
  "soldRate": 33.93,
  "priceRate": 65.86,
  "bidders": 1.32,
  "listed": 56,
  "sold": 19,
  "failed": 37,
  "changed": 11,
  "withdrawn": 7,
  "appraisalWon": 8697943000,
  "winningWon": 5728459300
 },
 {
  "scope": "seoul",
  "usage": "기타토지",
  "soldRate": 18.35,
  "priceRate": 57.47,
  "bidders": 1.9,
  "listed": 109,
  "sold": 20,
  "failed": 89,
  "changed": 9,
  "withdrawn": 6,
  "appraisalWon": 7235652920,
  "winningWon": 4158251620
 },
 {
  "scope": "seoul",
  "usage": "전체",
  "soldRate": 24.36,
  "priceRate": 78.08,
  "bidders": 2.77,
  "listed": 38573,
  "sold": 9395,
  "failed": 29178,
  "changed": 2760,
  "withdrawn": 914,
  "appraisalWon": 5400621950869,
  "winningWon": 4216920060689
 },
 {
  "scope": "hwagok",
  "usage": "아파트",
  "soldRate": 23.39,
  "priceRate": 77.79,
  "bidders": 2.75,
  "listed": 171,
  "sold": 40,
  "failed": 131,
  "changed": 7,
  "withdrawn": 3,
  "appraisalWon": 28043597500,
  "winningWon": 21815994816
 },
 {
  "scope": "hwagok",
  "usage": "단독/다가구",
  "soldRate": 38.3,
  "priceRate": 73.93,
  "bidders": 2.39,
  "listed": 47,
  "sold": 18,
  "failed": 29,
  "changed": 5,
  "withdrawn": 0,
  "appraisalWon": 37464083560,
  "winningWon": 27696617333
 },
 {
  "scope": "hwagok",
  "usage": "연립/다세대",
  "soldRate": 26.49,
  "priceRate": 70.0,
  "bidders": 2.11,
  "listed": 4473,
  "sold": 1185,
  "failed": 3288,
  "changed": 146,
  "withdrawn": 38,
  "appraisalWon": 313006695060,
  "winningWon": 219114549650
 },
 {
  "scope": "hwagok",
  "usage": "오피스텔(주거용)",
  "soldRate": 27.65,
  "priceRate": 72.78,
  "bidders": 1.67,
  "listed": 1707,
  "sold": 472,
  "failed": 1235,
  "changed": 73,
  "withdrawn": 9,
  "appraisalWon": 127489000000,
  "winningWon": 92782271235
 },
 {
  "scope": "hwagok",
  "usage": "업무/상업시설(일반)",
  "soldRate": 20.0,
  "priceRate": 58.63,
  "bidders": 3.0,
  "listed": 20,
  "sold": 4,
  "failed": 16,
  "changed": 1,
  "withdrawn": 3,
  "appraisalWon": 18192663180,
  "winningWon": 10667000000
 },
 {
  "scope": "hwagok",
  "usage": "업무/상업시설(집합)",
  "soldRate": 21.88,
  "priceRate": 74.5,
  "bidders": 1.43,
  "listed": 96,
  "sold": 21,
  "failed": 75,
  "changed": 9,
  "withdrawn": 2,
  "appraisalWon": 5575000000,
  "winningWon": 4153210362
 },
 {
  "scope": "hwagok",
  "usage": "공업시설",
  "soldRate": 0.0,
  "priceRate": 0.0,
  "bidders": 0.0,
  "listed": 0,
  "sold": 0,
  "failed": 0,
  "changed": 0,
  "withdrawn": 0,
  "appraisalWon": 0,
  "winningWon": 0
 },
 {
  "scope": "hwagok",
  "usage": "대지",
  "soldRate": 11.76,
  "priceRate": 48.33,
  "bidders": 2.5,
  "listed": 34,
  "sold": 4,
  "failed": 30,
  "changed": 9,
  "withdrawn": 2,
  "appraisalWon": 4755980000,
  "winningWon": 2298709000
 },
 {
  "scope": "hwagok",
  "usage": "임야",
  "soldRate": 0.0,
  "priceRate": 0.0,
  "bidders": 0.0,
  "listed": 0,
  "sold": 0,
  "failed": 0,
  "changed": 0,
  "withdrawn": 0,
  "appraisalWon": 0,
  "winningWon": 0
 },
 {
  "scope": "hwagok",
  "usage": "잡종지",
  "soldRate": 0.0,
  "priceRate": 0.0,
  "bidders": 0.0,
  "listed": 0,
  "sold": 0,
  "failed": 0,
  "changed": 0,
  "withdrawn": 0,
  "appraisalWon": 0,
  "winningWon": 0
 },
 {
  "scope": "hwagok",
  "usage": "전/답/과수",
  "soldRate": 0.0,
  "priceRate": 0.0,
  "bidders": 0.0,
  "listed": 0,
  "sold": 0,
  "failed": 0,
  "changed": 0,
  "withdrawn": 0,
  "appraisalWon": 0,
  "winningWon": 0
 },
 {
  "scope": "hwagok",
  "usage": "기타토지",
  "soldRate": 0.0,
  "priceRate": 0.0,
  "bidders": 0.0,
  "listed": 0,
  "sold": 0,
  "failed": 0,
  "changed": 0,
  "withdrawn": 0,
  "appraisalWon": 0,
  "winningWon": 0
 },
 {
  "scope": "hwagok",
  "usage": "전체",
  "soldRate": 26.63,
  "priceRate": 70.82,
  "bidders": 2.0,
  "listed": 6548,
  "sold": 1744,
  "failed": 4804,
  "changed": 250,
  "withdrawn": 57,
  "appraisalWon": 534527019300,
  "winningWon": 378528352396
 }
]

/**
 * 지지옥션 경매통계 종합 report 4쪽 · 강서구 · 2025.08~2026.07 월별.
 *
 * ⚠️ **용도가 업무/상업시설(집합) 기준이다.** 기준 물건(화곡동 24-42)이
 *    일반상업이라 그렇게 잡혔다. 우리 대상인 주택 4종이 아니다.
 *    주택 4종 월별 자료를 받으면 이걸 갈아끼운다. 화면에도 그렇게 써 둔다.
 */
export const MONTHLY_USAGE = '업무/상업시설(집합)'
export const MONTHLY: MonthlyRow[] = [
 {
  "month": "202508",
  "appraisalWon": 2720000000,
  "winningWon": 1521325110,
  "priceRate": 55.93,
  "listed": 48,
  "sold": 7,
  "bidders": 1.57,
  "soldRate": 14.58
 },
 {
  "month": "202509",
  "appraisalWon": 1963000000,
  "winningWon": 1307619001,
  "priceRate": 66.61,
  "listed": 35,
  "sold": 6,
  "bidders": 1.5,
  "soldRate": 17.14
 },
 {
  "month": "202510",
  "appraisalWon": 5007000000,
  "winningWon": 3477920704,
  "priceRate": 69.46,
  "listed": 74,
  "sold": 13,
  "bidders": 2.15,
  "soldRate": 17.57
 },
 {
  "month": "202511",
  "appraisalWon": 2212000000,
  "winningWon": 1156777000,
  "priceRate": 52.3,
  "listed": 66,
  "sold": 3,
  "bidders": 1.67,
  "soldRate": 4.55
 },
 {
  "month": "202512",
  "appraisalWon": 1314000000,
  "winningWon": 723572000,
  "priceRate": 55.07,
  "listed": 30,
  "sold": 4,
  "bidders": 3.0,
  "soldRate": 13.33
 },
 {
  "month": "202601",
  "appraisalWon": 6021000000,
  "winningWon": 4135465253,
  "priceRate": 68.68,
  "listed": 56,
  "sold": 18,
  "bidders": 1.5,
  "soldRate": 32.14
 },
 {
  "month": "202602",
  "appraisalWon": 1656000000,
  "winningWon": 758027990,
  "priceRate": 45.77,
  "listed": 29,
  "sold": 3,
  "bidders": 2.0,
  "soldRate": 10.34
 },
 {
  "month": "202603",
  "appraisalWon": 3065000000,
  "winningWon": 1549886787,
  "priceRate": 50.57,
  "listed": 54,
  "sold": 6,
  "bidders": 2.17,
  "soldRate": 11.11
 },
 {
  "month": "202604",
  "appraisalWon": 5095840000,
  "winningWon": 2107185045,
  "priceRate": 41.35,
  "listed": 42,
  "sold": 10,
  "bidders": 2.7,
  "soldRate": 23.81
 },
 {
  "month": "202605",
  "appraisalWon": 4625000000,
  "winningWon": 1715886248,
  "priceRate": 37.1,
  "listed": 34,
  "sold": 13,
  "bidders": 1.31,
  "soldRate": 38.24
 },
 {
  "month": "202606",
  "appraisalWon": 792000000,
  "winningWon": 691655000,
  "priceRate": 87.33,
  "listed": 39,
  "sold": 4,
  "bidders": 1.25,
  "soldRate": 10.26
 },
 {
  "month": "202607",
  "appraisalWon": 9081000000,
  "winningWon": 3544660400,
  "priceRate": 39.03,
  "listed": 45,
  "sold": 13,
  "bidders": 1.77,
  "soldRate": 28.89
 }
]

/** 같은 report 5쪽 · 실거래 · 강서구 · 같은 기간. 용도 제약은 위와 같다 */
export const DEALS: DealRow[] = [
 {
  "usage": "업무/상업시설(집합)",
  "totalWon": 225960270000,
  "avgPyeong": 2176,
  "medPyeong": 1893,
  "maxPyeong": 9846,
  "count": 387,
  "yoy": -13.03
 },
 {
  "usage": "오피스텔(주거용)",
  "totalWon": 212904990000,
  "avgPyeong": 2272,
  "medPyeong": 2182,
  "maxPyeong": 7135,
  "count": 988,
  "yoy": -1.17
 },
 {
  "usage": "업무/상업시설(일반)",
  "totalWon": 656824020000,
  "avgPyeong": 4677,
  "medPyeong": 4409,
  "maxPyeong": 9250,
  "count": 76,
  "yoy": 47.91
 }
]

/** 화면에서 쓰는 주택 4종 (아파트 제외 — 다른 시장이라 섞으면 평균이 끌려간다) */
export const HOUSING = ['연립/다세대', '오피스텔(주거용)', '단독/다가구'] as const

export const SCOPE_LABEL = { seoul: '서울 전체', hwagok: '강서구 화곡동' } as const

export const pick = (scope: MarketRow['scope'], usage: string) =>
  MARKET.find((m) => m.scope === scope && m.usage === usage) ?? null
