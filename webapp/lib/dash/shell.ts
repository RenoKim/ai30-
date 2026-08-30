/**
 * 셸의 정보구조 — 서랍(LNB)과 오른쪽 진행 레일이 같은 표 하나를 읽는다.
 *
 * 그룹 순서가 곧 작업 순서다: 시장을 보고 → 물건을 고르고 → 자료로 검산하고 → 제도를 넘어 확인한다.
 * 레일은 그룹 안의 항목 순서를 "다음 단계"로 쓴다. 사건 그룹은 조원 화면(iframe)이 제 레일을 갖고 있어 우리 레일을 띄우지 않는다.
 */

export type Owner = 'us' | 'team'

export interface ShellItem {
  href: string
  label: string
  hint: string
}

export interface ShellGroup {
  key: 'market' | 'case' | 'list' | 'report'
  title: string
  owner: Owner
  items: readonly ShellItem[]
  /** 레일 제목 — 없으면 이 그룹에선 레일을 그리지 않는다 */
  rail?: string
  /** 레일 맨 아래 — 이 흐름이 끝나면 어디로 가나 */
  after?: { href: string; label: string; why: string }
}

export const GROUPS: readonly ShellGroup[] = [
  {
    key: 'market', title: '시장', owner: 'us', rail: '시장 보기',
    items: [
      { href: '/dash/brief',   label: '경매시장 브리핑', hint: '서울 vs 화곡동' },
      { href: '/dash/trend',   label: '시장지표 추이',   hint: '낙찰가율 × 낙찰률' },
      { href: '/dash/compare', label: '공매와 대보기',   hint: '같은 자가 통하나' },
    ],
    after: { href: '/dash/case', label: '사건 조회로 →', why: '이 시장에서 물건 하나를 고른다' },
  },
  {
    key: 'case', title: '사건', owner: 'team',
    items: [
      { href: '/dash/case',            label: '사건 조회하기',   hint: '사건번호 한 건' },
      { href: '/dash/case?view=saved', label: '저장한 사건 목록', hint: '다시 불러오기' },
    ],
  },
  {
    key: 'list', title: '목록', owner: 'us', rail: '목록 다루기',
    items: [
      { href: '/dash',       label: '목록 업로드', hint: '지지옥션 PDF' },
      { href: '/dash/clean', label: '정제 리포트', hint: '자동 처리 안 한 행' },
      { href: '/dash/list',  label: '물건 목록',   hint: '읽은 값 · 계산값' },
      { href: '/dash/bid',   label: '입찰가 검토', hint: '비슷한 물건 분포' },
    ],
    after: { href: '/dash/case', label: '사건 조회로 →', why: '고른 물건을 사건번호로 다시 본다' },
  },
  {
    key: 'report', title: '보고서', owner: 'us',
    items: [
      { href: '/report', label: '공매 분석 보고서', hint: '온비드 13년' },
    ],
  },
] as const

export interface Located {
  group: ShellGroup
  index: number
  item: ShellItem
}

const path = (href: string) => href.split('?')[0]

/** 현재 경로가 어느 그룹의 몇 번째 항목인가. 못 찾으면 null */
export function locate(pathname: string): Located | null {
  for (const group of GROUPS) {
    const index = group.items.findIndex((it) => path(it.href) === pathname)
    if (index >= 0) return { group, index, item: group.items[index] }
  }
  return null
}
