import { supabase } from './supabase'
import type {
  CaseAxis, CaseAxisRow, CaseRightRow, CaseDetailRow, CaseExhibit, CaseMeta,
  CaseTruncationRow, CaseAmountGapRow, CaseReconRow, CaseDecayFit, CaseDecayStep,
} from './types'

/**
 * E6 — 법원경매 개별 물건 (지지옥션 샘플 524건).
 *
 * report.ts 를 키우지 않고 따로 둔다. 이 데이터는 온비드와 출처·제도가 달라
 * 조립 경로를 섞으면 나중에 누가 봐도 헷갈린다.
 *
 * 원칙은 같다 — 집계는 전부 뷰가 한다. 여기에 손집계를 두지 않는다.
 */

/** 축 → 필터할 컬럼. 화이트리스트 밖의 값은 서버가 받지 않는다. */
const RIGHT_FLAGS: Record<string, string> = {
  has_opposable_tenant: '대항력 임차인',
  is_illegal_building: '위반건축물',
  is_resale: '재매각',
  has_senior_lease: '선순위 임차권',
  is_share: '지분 매각',
  is_npl: 'NPL 물건',
  no_site_right: '대지권 미등기',
  is_building_only: '건물만 경매',
  has_senior_jeonse: '선순위 전세권',
  is_landlocked: '맹지',
  has_lien: '유치권',
  has_statutory_superficies: '법정지상권',
}

const AXIS_LABEL: Record<CaseAxis, string> = {
  usage: '용도',
  district: '자치구',
  right: '권리',
}

export function isCaseAxis(v: unknown): v is CaseAxis {
  return v === 'usage' || v === 'district' || v === 'right'
}

/** 05_auction_cases.sql 이 아직 안 돌아간 상태인가 */
function isMissingRelation(message: string): boolean {
  return /does not exist|Could not find the table|schema cache/i.test(message)
}

async function view<T>(name: string): Promise<T[]> {
  const { data, error } = await supabase.from(name).select('*')
  if (error) throw new Error(`${name}: ${error.message}`)
  return (data ?? []) as unknown as T[]
}

/**
 * 뷰가 없으면 null 을 돌려준다 — 이 섹션만 빠지고 보고서 전체는 살아 있다.
 * 삼키지는 않는다. 서버 로그에 무엇이 없는지 남긴다.
 */
export async function fetchCaseExhibit(): Promise<CaseExhibit | null> {
  try {
    const [meta, byUsage, byDistrict, byRight, truncation, amountGap, recon, decayFit, decaySteps] =
      await Promise.all([
        view<CaseMeta>('v_case_meta'),
        view<CaseAxisRow>('v_case_by_usage'),
        view<CaseAxisRow>('v_case_by_district'),
        view<CaseRightRow>('v_case_by_right'),
        view<CaseTruncationRow>('v_case_truncation'),
        view<CaseAmountGapRow>('v_case_amount_gap'),
        view<CaseReconRow>('v_case_reconciliation'),
        view<CaseDecayFit>('v_case_decay_fit'),
        view<CaseDecayStep>('v_case_decay_steps'),
      ])

    const m = meta[0]
    if (!m) throw new Error('v_case_meta: 행이 없습니다')

    return {
      title: '평균을 열어 보면 물건 하나하나가 나온다',
      reader: '입찰을 준비하는 사람 · 데이터를 확인하려는 사람',
      note:
        '다시 한 번 — 이건 온비드 공매가 아니라 법원 경매이고, 서울의 2022년 1월 한 달치입니다. ' +
        '자료를 준 회사가 샘플이라고 밝힌, 전체 중 일부만 뽑아낸 것이라 전체를 대표하지 못합니다. ' +
        '그래서 위 숫자들과 더하거나 나란히 놓지 않고, 같은 방식으로 재 보기만 했습니다.',
      meta: m,
      byUsage, byDistrict, byRight,
      truncation, amountGap, reconciliation: recon,
      decayFit: decayFit[0] ?? null,
      decaySteps,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isMissingRelation(message)) {
      console.warn('[cases] 05_auction_cases.sql 미적용 — E6 섹션을 건너뜁니다:', message)
      return null
    }
    console.error('[cases]', message)
    throw err
  }
}

/**
 * 드릴스루 — 막대 하나를 눌렀을 때 그 뒤의 개별 물건 명단.
 *
 * 축과 키는 외부 입력이다. 축은 세 값만, 권리 키는 화이트리스트만 통과시킨다.
 * 정렬은 '매각 먼저, 그 안에서 깊게 유찰된 것부터' — 볼 값이 위로 온다.
 */
export async function fetchCaseList(
  axis: CaseAxis,
  key: string,
): Promise<{ rows: CaseDetailRow[]; title: string }> {
  const trimmed = key.trim()
  if (!trimmed) throw new Error('키가 비어 있습니다')

  let query = supabase.from('v_case_detail').select('*')

  if (axis === 'usage') {
    query = query.eq('usage_name', trimmed)
  } else if (axis === 'district') {
    query = query.eq('district', trimmed)
  } else {
    const column = Object.keys(RIGHT_FLAGS).find((c) => c === trimmed)
    if (!column) throw new Error(`알 수 없는 권리 키: ${trimmed}`)
    query = query.eq(column, true)
  }

  const { data, error } = await query
    .order('result', { ascending: true })          // 매각 → 유찰
    .order('min_to_appraisal_pct', { ascending: true })

  if (error) throw new Error(`v_case_detail: ${error.message}`)

  const label = axis === 'right' ? RIGHT_FLAGS[trimmed] ?? trimmed : trimmed
  return {
    rows: (data ?? []) as unknown as CaseDetailRow[],
    title: `${AXIS_LABEL[axis]} = ${label}`,
  }
}
