/**
 * 조원 「경매어려워」 의 Supabase RPC 가 돌려주는 모양. 필드 이름은 서버 그대로 둔다(snake_case) —
 * 여기서 이름을 바꾸면 조원이 RPC 를 고칠 때 우리 화면이 조용히 깨진다.
 */

export interface CourtRow { court: string; n: number }

export interface ItemRow {
  item_no: number | string
  sigungu: string
  eupmyeondong: string
  area: number
  appraisal: number
}

export interface CaseItem {
  court: string; case_no: string; item_no: number | string
  sigungu: string; dong: string; house_type: string | null
  area: number; area_total: number; land_auction: number; land_total: number
  appraisal: number; land_appr: number; bldg_appr: number; appraisal_date: string | null
  min_price: number; round: number; due: string | null
  debt: number; claim: number; flags: string | null
  ar_lo: number; ar_hi: number; band_lo: number; band_hi: number
}

export interface RoundRow { r: number; d: string | null; p: number; res: string | null }
export interface Scoped<T> { dong?: T; gu?: T; si?: T }
export interface RateRow { pct: number; n_all: number; n_item: number; n_sold: number }
export interface DistRow { r: number; n: number }
export interface Bin { lo: number; n: number }
export interface Quant { n: number; med: number }
export interface Prem { n: number; p25: number; p50: number; p75: number; p90: number; solo: number; avg_bid: number }
export interface MonthRow { ym: string; n: number; ppm: number }
export interface BidderRow { g: number; n: number; prem: number }

export interface CaseDetail {
  found: boolean
  item: CaseItem
  rounds: RoundRow[]
  rdist: Scoped<DistRow[]>
  rate: Scoped<RateRow>
  rbin: Bin[]
  rq: Scoped<Quant>
  pbin: Bin[]
  pq: Scoped<Prem>
  rmon: MonthRow[]
  bidd: Scoped<BidderRow[]>
}

/** saved_cases 테이블 한 행 */
export interface SavedCase {
  id: number
  case_key: string; court: string; case_no: string; item_no: string
  asof_date: string; loc: string; house_type: string | null; area_m2: number
  appraisal: number; appraisal_date: string | null; min_price: number; min_ratio: number
  round_no: number; due_date: string | null; flags: string | null
  debt_total: number; claim_amount: number; my_bid: number | null
  saved_at: string; client_id: string
}
