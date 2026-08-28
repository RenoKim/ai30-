export interface TrendRow {
  year: number
  appraisal_mn: number; min_bid_mn: number; winning_mn: number
  rate_vs_appraisal: number; rate_vs_minbid: number
  competition: number; min_to_appraisal_pct: number
}
export interface VolatilityRow {
  basis: string; min_rate: number; max_rate: number; spread_pp: number
}
export interface CategoryRow {
  usage_name?: string; region_name?: string
  rate_vs_appraisal: number; min_to_appraisal_pct: number
  competition: number; bidders: number
}
export interface AnomalyRow {
  source: string; year: number; name: string; level: string
  appraisal_mn: number; winning_mn: number
  sum_ratio: number; published_rate: number
  implied_winning_mn: number; gap_pp: number
  severity: 'confirmed' | 'suspect' | 'minor'
}
/** E0 — 절사 표본. v_truncation_summary */
export interface TruncationSummaryRow {
  source: string; basis: string; cells: number
  recomputed_lower: number; recomputed_higher: number; matched: number
  median_gap_pp: number
}
/** v_truncation_rules — 제외기준 원문 */
export interface TruncationRuleRow { rule_text: string; why_it_matters: string }

/** 발견 1 재검증. v_usage_volatility */
export interface VolatilityRatioRow {
  usage_name: string
  minbid_spread_pp: number; appraisal_spread_pp: number
  ratio_x: number | null; thesis_holds: boolean
  appraisal_mn_total: number
}

/** E2·E3 축 — 두 계산방식을 함께 내보낸다. v_usage_recent_dual / v_region_recent_dual */
export interface DualCategoryRow extends CategoryRow {
  x_mean: number; x_weighted: number
  y_mean: number; y_weighted: number
  appraisal_mn_total: number
}

/** 순위상관. v_axis_correlation */
export interface CorrelationRow {
  axis: string; n: number; pearson_r: number; spearman_rho: number
}

/** E5 — 법정 하한 돌파 현황. v_floor_breach_by_year */
export interface FloorBreachRow {
  year: number; below_floor: number; leaf_count: number
  lowest_pct: number; lowest_usage: string
}

/** 발견 2 정정 — 연도별 용도 분해. v_usage_yoy_latest */
export interface UsageYoyRow {
  usage_name: string; year: number
  min_to_appraisal_pct: number; appraisal_mn: number
  delta_pp: number | null; appraisal_growth_x: number | null
}

export interface ReconRow {
  check_name: string; passed: number; total: number; all_passed: boolean
}
export interface Report {
  headline: { claim: string; subclaim: string; retracted: string }
  meta: { latest_year: number; first_year: number; recent_from: number
          usage_rows: number; region_rows: number; source: string; generatedAt: string
          elapsedMs?: number }
  exhibit0_truncation: {
    title: string; reader: string; note: string
    rules: TruncationRuleRow[]; summary: TruncationSummaryRow[]
  }
  exhibit1_rateVolatility: {
    title: string; reader: string; rows: VolatilityRow[]; trend: TrendRow[]
    /** 조원 제안대로 용도를 고정해 재검증한 결과 */
    perUsage: VolatilityRatioRow[]
  }
  exhibit2_byUsage: {
    title: string; reader: string; note: string; axisNote: string
    rows: DualCategoryRow[]; correlation: CorrelationRow | null
  }
  exhibit3_byRegion: {
    title: string; reader: string; note: string; axisNote: string
    rows: DualCategoryRow[]; correlation: CorrelationRow | null
  }
  exhibit5_floor: {
    title: string; reader: string; note: string
    byYear: FloorBreachRow[]; latestYoy: UsageYoyRow[]
  }
  exhibit4_anomalies: { title: string; reader: string; note: string; rows: AnomalyRow[] }
  /** 조원 공유 자료. 뷰가 아직 없으면 null — 이 섹션만 빠지고 나머지는 살아 있다 */
  exhibit6_cases: CaseExhibit | null
  reconciliation: { allPassed: boolean; summary: ReconRow[]; failures: unknown[] }
  assumptions: string[]
  disclaimer: string
}

/* ══════════════════════════════════════════════════════════════
   E6 — 법원경매 개별 물건 (지지옥션 샘플 524건)
   온비드 집계와 같은 표에 올리지 않는다. 제도가 다르다.
   ══════════════════════════════════════════════════════════════ */

export interface CaseMeta {
  total: number; sold: number; failed: number; sold_rate: number
  from_date: string; to_date: string
  courts: number; districts: number; usages: number
}

/** 드릴스루 축. 이 세 값 외에는 서버가 받지 않는다. */
export type CaseAxis = 'usage' | 'district' | 'right'

/** v_case_by_usage · v_case_by_district 공통 */
export interface CaseAxisRow {
  key: string
  listed: number; sold: number; sold_rate: number
  median_depth_pct: number | null
  median_rate_appraisal: number | null
  median_rate_minbid: number | null
  avg_bidders: number | null
}

/** v_case_by_right — 플래그가 없는 쪽 기준선을 함께 낸다 */
export interface CaseRightRow extends CaseAxisRow {
  label: string; hint: string
  sold_rate_off: number | null
  median_depth_off_pct: number | null
}

/** v_case_detail — 드로어가 띄우는 개별 물건 */
export interface CaseDetailRow {
  id: number
  court: string; case_no: string; item_no: number | null
  usage_name: string; bid_date: string; result: string
  appraisal_won: number; min_bid_won: number; winning_won: number
  bidders: number
  district: string | null; dong: string | null
  zone_name: string | null; case_type: string | null
  min_to_appraisal_pct: number | null
  rate_vs_appraisal: number | null
  rate_vs_minbid: number | null
  rights: string[]
}

export interface CaseTruncationRow {
  rule_key: string; rule_text: string; hits: number; sold_total: number
}
export interface CaseAmountGapRow {
  district: string; dong: string; usage_name: string
  sold_detail: number; sold_stats: number
  appraisal_detail: number; appraisal_stats: number
  gap_won: number; kind: string
}
export interface CaseReconRow {
  check_name: string; scope: string
  expected: number; actual: number; passed: boolean
}
export interface CaseDecayFit {
  total: number; fit_20pct: number; fit_30pct: number
  lowest_pct: number; deepest_round: number
}
export interface CaseDecayStep {
  round_no: number; pct: number; cases: number; sold: number
}

export interface CaseExhibit {
  title: string; reader: string; note: string
  meta: CaseMeta
  byUsage: CaseAxisRow[]
  byDistrict: CaseAxisRow[]
  byRight: CaseRightRow[]
  truncation: CaseTruncationRow[]
  amountGap: CaseAmountGapRow[]
  reconciliation: CaseReconRow[]
  decayFit: CaseDecayFit | null
  decaySteps: CaseDecayStep[]
}

/** 드릴스루 응답 — /api/cases */
export interface CaseListResponse {
  axis: CaseAxis
  key: string
  title: string
  subtitle: string
  count: number
  rows: CaseDetailRow[]
}
