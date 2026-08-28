/**
 * 공매(온비드) 쪽 실측값 — 경매와 대보기 위한 것.
 *
 * 차세대 온비드 API `getCltrBidRsltList2` 로 직접 받았다.
 *   조건: 부동산 · 압류재산 · 개찰일 2026-07-01~08-27 · 소재지 서울
 *   결과: 665건 (유찰 593 · 낙찰 72) · 호출 7회
 *   원본: data/온비드_서울_압류_2026-07_08.csv · 수집기 scripts/onbid_api.py
 *
 * ⚠️ 경매와 **다른 제도**다. 합치지 않는다. 같은 자로 재기만 한다.
 */
export const ONBID = {
  period: '2026-07-01 ~ 2026-08-27',
  scope: '서울 · 압류재산 · 부동산',
  total: 665,
  failed: 593,
  sold: 72,
  /** 감정가 대비 최저가가 10%p 계단 위에 놓인 건 / 비율이 있는 건 */
  ladderFit: 504,
  ladderTotal: 544,
  /** 법이 정한 1차 사이클 하한 */
  floorPct: 50,
  belowFloor: 156,
  lowestPct: 1,
  rateVsAppraisal: { median: 64.2, min: 0.8, max: 149.0 },
  rateVsMinBid: { median: 107.8, min: 100.0, max: 297.9 },
} as const

/** 경매 쪽 같은 지표 (업로드 목록 100건 · 2026-08-03~04) */
export const COURT_SNAPSHOT = {
  period: '2026-08-03 ~ 08-04',
  hwagokLikeMedian: 104.7,   // 강서구 주택
  otherSeoulMedian: 116.6,   // 서울 그 밖 주택
  decayStep: 20,
  hasFloor: false,
  deepestPct: 4.4,
  deepestRound: 15,
} as const
