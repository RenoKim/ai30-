import { supabase } from './supabase'
import { fetchCaseExhibit } from './cases'
import type {
  Report, TrendRow, VolatilityRow, AnomalyRow, ReconRow,
  TruncationSummaryRow, TruncationRuleRow, VolatilityRatioRow,
  DualCategoryRow, CorrelationRow, FloorBreachRow, UsageYoyRow,
} from './types'

/**
 * 리포트 조립 — 단일 진실원천.
 *
 * page.tsx(서버 컴포넌트)와 /api/report 가 이 함수를 공유한다.
 * 페이지가 자기 API를 HTTP로 다시 부르지 않으므로 배포 호스트를 알 필요가 없다.
 *
 * 원칙: 여기에 집계 코드를 두지 않는다. 모든 수치는 Supabase 뷰가 매 요청 재계산한 값이다.
 * 새 지표가 필요하면 이 파일이 아니라 뷰를 추가한다.
 */

interface MetaRow {
  latest_year: number
  first_year: number
  recent_from: number
  usage_rows: number
  region_rows: number
}

/** 뷰 응답은 런타임 스키마를 따른다. unknown 을 거쳐 호출부에서 좁힌다. */
async function fetchView<T>(view: string): Promise<T[]> {
  const { data, error } = await supabase.from(view).select('*')
  if (error) throw new Error(`${view}: ${error.message}`)
  return (data ?? []) as unknown as T[]
}

export async function buildReport(): Promise<Report> {
  const [
    meta, trend, volatility, usage, region, anomalies, recon, failures,
    truncRules, truncSummary, perUsageVol, correlation, floorByYear, latestYoy,
    cases,
  ] = await Promise.all([
    fetchView<MetaRow>('v_meta'),
    fetchView<TrendRow>('v_total_trend'),
    fetchView<VolatilityRow>('v_rate_volatility'),
    fetchView<DualCategoryRow>('v_usage_recent_dual'),
    fetchView<DualCategoryRow>('v_region_recent_dual'),
    fetchView<AnomalyRow>('v_anomalies_ranked'),
    fetchView<ReconRow>('v_reconciliation_summary'),
    fetchView<unknown>('v_reconciliation_failures'),
    fetchView<TruncationRuleRow>('v_truncation_rules'),
    fetchView<TruncationSummaryRow>('v_truncation_summary'),
    fetchView<VolatilityRatioRow>('v_usage_volatility'),
    fetchView<CorrelationRow>('v_axis_correlation'),
    fetchView<FloorBreachRow>('v_floor_breach_by_year'),
    fetchView<UsageYoyRow>('v_usage_yoy_latest'),
    // 05_auction_cases.sql 이 아직 안 돌아갔으면 null 이 온다 — 보고서는 그대로 뜬다
    fetchCaseExhibit(),
  ])

  const m = meta[0]
  if (!m) throw new Error('v_meta: 행이 없습니다 — 시드가 적재되지 않았을 수 있습니다')

  const rho = (axis: string) => correlation.find((c) => c.axis === axis) ?? null

  return {
    headline: {
      claim:
        '"낙찰가율 59.6%"는 시장이 얼어붙었다는 뜻이 아니다. ' +
        '낙찰가는 13년 내내 그 회차 최저가의 107~111%였다. ' +
        '게다가 이 통계는 아주 싸게 팔린 물건을 처음부터 빼고 평균을 냈다.',
      subclaim:
        '그러니 이 숫자가 오르내리는 것을 시장이 움직인 것으로 읽으면 안 된다. ' +
        '감정가가 달라졌거나, 그해 나온 물건의 종류가 달라졌을 뿐일 수 있다.',
      retracted:
        '2026-08-26 철회 — "변한 것은 감정가뿐이다"라고 썼던 문장을 거둡니다. ' +
        '근거가 부족했습니다. 2025년 하락은 모든 용도에서 일어난 일이 아니라 ' +
        '땅에서만 두드러졌고(아파트 -1.1%p, 대지 -23.0%p), 같은 기간 나온 물건의 ' +
        '감정가 총액도 대지 2.77배·숙박 3.06배로 뛰었습니다. ' +
        '값이 떨어진 것인지 비싼 물건이 몰려 나온 것인지, 이 데이터로는 가릴 수 없습니다.',
    },
    meta: {
      ...m,
      source: 'data.go.kr 15054750(용도별) · 15054749(지역별) · 한국자산관리공사',
      generatedAt: new Date().toISOString(),
    },
    exhibit0_truncation: {
      title: '싸게 팔린 물건은 이 통계에 들어 있지 않다',
      reader: '이 숫자를 인용하는 사람',
      note:
        '싼값에 팔린 물건이 빠졌으니 남은 것만 평균 내면 값이 실제보다 높게 나옵니다. ' +
        '실제로도 그렇습니다. 원본 자료의 금액으로 우리가 직접 계산해 보면 감정가 대비율은 ' +
        '공개된 값보다 낮게 나오는 쪽으로 몰립니다. 반면 낙찰률은 그 차이가 거의 0입니다. ' +
        '즉 문제가 생기는 곳은 감정가 대비율 한 군데입니다.',
      rules: truncRules,
      summary: truncSummary,
    },
    exhibit1_rateVolatility: {
      title: '낙찰가는 감정가가 아니라 그 회차 최저가를 따라간다',
      reader: '입찰을 준비하는 사람',
      rows: volatility,
      trend,
      perUsage: perUsageVol,
    },
    exhibit2_byUsage: {
      title: '낙찰가율이 같아도 속사정은 전혀 다르다 — 용도 14종 전부',
      reader: '어떤 물건을 볼지 고르는 사람',
      note:
        "'주거용건물'처럼 여러 용도를 묶은 항목과 '전체'는 뺐습니다. " +
        '이미 아래 항목을 더한 값이라 같이 세면 두 번 세는 셈이기 때문입니다. ' +
        '두 기준으로 매긴 등수가 거의 무관하게 나왔으므로, 아파트와 대지는 ' +
        '유별난 예외가 아니라 흔한 경우로 봐야 합니다.',
      axisNote:
        '세로축 기본값은 금액을 반영해 계산한 값입니다. 해마다 낸 비율을 그냥 평균 낸 값과 ' +
        '최대 7.8%p까지 차이가 납니다(대지 2023~25년: 단순평균 43.1%, 금액반영 35.3%). ' +
        '어느 쪽을 보고 있는지 화면에 표시해 둡니다.',
      rows: usage,
      correlation: rho('용도 14종'),
    },
    exhibit3_byRegion: {
      title: '지역은 용도만큼 갈리지 않는다',
      reader: '어느 지역을 볼지 고르는 사람',
      note:
        '시·도 17곳만 놓고 봤습니다. "인천/경기"처럼 여러 시도를 묶은 5개 항목과 ' +
        '"전체"는 두 번 세게 되므로 뺐습니다. 지역은 두 숫자가 어느 정도 같이 움직이기 때문에, ' +
        '용도만큼 세게 말하지 않습니다.',
      axisNote: '위 Exhibit 2와 같습니다 — 세로축 기본은 금액반영, 단순평균도 함께 표시합니다.',
      rows: region,
      correlation: rho('시도 17곳'),
    },
    exhibit5_floor: {
      title: '감정가의 절반 밑으로 내려간 것은 유찰이 아니다',
      reader: '처음 보는 사람 포함 전원',
      note:
        '국세징수법 제87조가 정한 규칙입니다. 캠코 압류재산은 안 팔릴 때마다 처음 값의 10%씩 깎되, ' +
        '감정가의 50%까지만 깎을 수 있습니다. 그래도 안 팔리면 감정을 새로 받아 다시 내놓습니다. ' +
        '그래서 한 바퀴는 6회차(50%)에서 끝납니다. 50%보다 낮은 값이 보인다면 ' +
        '그건 유찰이 더 된 것이 아니라 이미 새 감정가로 다시 시작한 물건입니다. ' +
        '다만 압류재산이 아닌 다른 유형(국유·수탁·유입)의 규칙은 아직 확인하지 못했습니다.',
      byYear: floorByYear,
      latestYoy,
    },
    exhibit6_cases: cases,
    exhibit4_anomalies: {
      title: '합계가 맞는다고 데이터가 맞는 건 아니다',
      reader: '이 숫자를 믿어도 되나 걱정되는 사람',
      note:
        '낙찰가가 감정가보다 높다는 것 자체는 이상하지 않습니다. 경쟁이 붙으면 그럴 수 있습니다. ' +
        '이상한 것은, 공개된 낙찰가율과 금액으로 직접 계산한 값이 서로 안 맞는다는 점입니다. ' +
        "그래서 '오염 확정'은 '데이터가 틀렸다고 확정'이 아니라 '두 값이 어긋나는 것을 확인'으로 읽어 주세요. " +
        '낙찰가율 200% 넘는 물건을 빼는 규칙이 공개 수치에만 적용되고 금액에는 적용되지 않았을 수도 있는데, ' +
        '그렇다면 오류가 아니라 세는 대상이 다른 것입니다. 우리 데이터로는 둘을 가릴 수 없습니다.',
      rows: anomalies,
    },
    reconciliation: {
      allPassed: recon.every((r) => r.all_passed === true),
      summary: recon,
      failures,
    },
    assumptions: [
      '유찰이 몇 번 됐는지는 원본 자료에 없습니다. 그래서 최저입찰가를 감정가로 나눈 값을 대신 씁니다. ' +
        '비슷하게 움직이지만 유찰 횟수 그 자체는 아닙니다.',
      '감정가의 50%보다 낮은 값은 유찰 횟수로 바꿔 읽을 수 없습니다. 법이 50%까지만 깎도록 정해 뒀기 때문에, ' +
        '그보다 낮다면 이미 감정을 새로 받고 다시 시작한 물건입니다. 기준 가격 자체가 달라서 같은 자로 잴 수 없습니다.',
      '이미 평균 낸 숫자라 물건이 어떻게 흩어져 있는지는 볼 수 없습니다. ' +
        '평균 55%가 "전부 5회차"인지 "절반은 첫 회차, 절반은 새로 시작한 물건"인지 구분이 안 됩니다. ' +
        '아래 Exhibit 6에서 개별 물건 524건으로 그 한계를 일부만 열어 봤습니다 — 온비드 쪽은 여전히 평균뿐입니다.',
      '통계를 만들 때 일부 물건이 빠져 있습니다. 낙찰가율이 25% 이하이거나 200%를 넘는 물건, ' +
        '그리고 이용기관이 맡긴 자산과 동산이 빠졌습니다. 빠지기 전 전체 모습을 우리는 볼 수 없습니다.',
      '압류재산·국유재산 등 재산 종류가 섞여 있고 나뉘어 있지도 않습니다. ' +
        '값 깎는 규칙은 종류마다 다른데, 압류재산이 아닌 것이 얼마나 섞였는지 확인하지 못했습니다.',
      '2025년은 다른 해와 같은 방식으로 읽지 않는 편이 좋습니다. 감정가 총액이 1.45배로 뛰었고, ' +
        '감정가의 50%보다 낮은 항목이 3개에서 12개로 늘었습니다. 확정된 숫자인 것과 ' +
        '다른 해와 나란히 놓고 해석해도 되는 것은 다른 이야기입니다.',
      '공개된 낙찰가율과 우리가 따로 계산한 숫자는 계산 방법이 다릅니다. 공개값은 물건마다 비율을 낸 뒤 그 비율들을 평균 낸 것이고, ' +
        '우리 것은 금액을 다 더한 뒤 한 번 나눈 것입니다. 서로 다른 계산이라 한 문장에서 섞어 쓰지 않습니다.',
      '용도별 통계와 지역별 통계는 따로 만들어진 것이라 겹쳐 볼 수 없습니다. ' +
        '"서울에 있는 아파트"가 어땠는지는 이 데이터로 알 수 없습니다.',
      '캠코가 파는 공매만 들어 있습니다. 신탁회사가 파는 공매나 법원 경매는 없습니다. ' +
        '캠코 압류재산의 값 깎는 방식은 국세징수법 제87조로 확인했습니다(10%씩, 50%까지).',
      '"최근"이 언제인지는 데이터의 마지막 연도가 정합니다. 오늘 날짜와는 상관없습니다.',
    ],
    disclaimer:
      '공공데이터포털에 공개된 통계로 만들었습니다. ' +
      '학습용 분석이며, 실제 입찰가를 정하는 근거로 쓸 수 없습니다.',
  }
}
