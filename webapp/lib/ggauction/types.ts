/**
 * 지지옥션 매각기일 목록 PDF 에서 뽑아내는 값.
 *
 * `bid_date` 부터 `rights` 까지는 **PDF 표에 그대로 있는 값**이고,
 * `round_no` 아래 넷은 **우리가 계산해 만든 값**이다.
 * 화면에서 이 둘을 섞어 보여주지 않는다 — 와이어프레임의 원칙이자 우리 원칙이다.
 */
export interface CaseRow {
  // ── 목록에서 바로 읽는 값 ──────────────────────────────
  bidDate: string            // 2026-08-03
  court: string              // 동부4계
  caseNo: string             // 2025-9318 · 2024-64502[8]
  district: string | null    // 강서구
  /** 법정동 — '화곡동' · '금호동3가' */
  dong: string | null
  /** 대표 지번. 건축물대장·실거래로 가는 결합 키 */
  jibun: string | null
  /** 일괄매각이면 필지가 여럿 */
  jibunAll: string[]
  buildingName: string | null
  floor: string | null       // '3' · '지하1'
  ho: string | null
  roadAddr: string | null
  usageName: string | null   // 다세대
  status: CaseStatus
  appraisalWon: number
  minBidWon: number
  winningWon: number         // 유찰이면 0
  bidders: number
  bldgM2: number | null
  landM2: number | null
  rights: string[]

  // ── 여기서 계산해 만드는 값 ────────────────────────────
  roundNo: number | null           // 최저가÷감정가 → 20% 저감 역산
  minToAppraisalPct: number | null // 최저가 ÷ 감정가
  rateVsAppraisal: number | null   // 낙찰가 ÷ 감정가
  rateVsMinBid: number | null      // 낙찰가 ÷ 최저가 (입찰 프리미엄)
  pyeongPriceApprox: number | null // 감정가 ÷ 건물면적 × 3.3058 — 대지권 포함이라 근사치

  /** 자동 처리하지 않고 사람이 볼 행. 비어 있으면 정상 */
  flags: RowFlag[]
  /** 원문 블록 — 정제 리포트에서 그대로 보여준다 */
  raw: string
}

export type CaseStatus = '매각' | '유찰' | '변경' | '취하' | '알수없음'

/** 정제 리포트의 '사유'. 와이어프레임 §clean 의 기준을 그대로 쓴다. */
export type RowFlag =
  | 'minBidOverAppraisal'   // 최저가 > 감정가 — 재감정 의심 · 회차 계산 제외
  | 'offDecayLadder'        // 20% 계단 밖 — 가장 가까운 회차로 두되 예외 표시
  | 'areaMissing'           // 면적 없음 — 평당가만 제외
  | 'noWinningPrice'        // 낙찰가 없음(유찰 등) — 낙찰가율 제외, 유찰 집계엔 포함
  | 'parseIncomplete'       // 필수 값 누락 — 사람이 직접 확인
  | 'addressMissing'        // 법정동·지번을 못 읽음 — 공공데이터 결합 대상에서 빠진다

export interface FlagSpec {
  key: RowFlag
  label: string
  how: string        // 어떻게 생기나
  action: string     // 기본 처리
}

export interface ParseResult {
  fileName: string
  rows: CaseRow[]
  /** 레코드 경계는 잡혔지만 필수 값이 빠진 행 수 */
  total: number
  clean: number
  needsCheck: number
  /** 파일에서 읽어낸 범위 */
  from: string | null
  to: string | null
  courts: string[]
  /** 이 파일에 유찰이 들어 있나 — 없으면 낙찰률을 계산할 수 없다 */
  hasFailedRows: boolean
}
