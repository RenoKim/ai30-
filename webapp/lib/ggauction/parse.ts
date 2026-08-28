import type { CaseRow, CaseStatus, FlagSpec, ParseResult, RowFlag } from './types'

/**
 * 지지옥션 매각기일 목록 PDF 파서.
 *
 * scripts/parse_ggauction_pdf.py 를 그대로 옮긴 것이다.
 * 그쪽은 93건에서 필수 필드 누락 0으로 검증됐다. 정규식을 바꾸지 말 것 —
 * 바꾸려면 파이썬 쪽과 같이 바꾸고 같은 PDF 로 다시 대조해야 한다.
 *
 * 표가 아니라 여러 줄에 흩어져 있어, **매각기일을 레코드 경계로** 잡고
 * 블록 안에서 값을 집는다.
 */

/** 서울 법원경매 저감률 — 유찰될 때마다 직전 값의 80% (617건 전수 확인) */
export const DECAY = 0.8
/** 계단에서 이만큼(%p) 벗어나면 예외로 표시한다 */
export const LADDER_TOL_PP = 0.6
const PYEONG = 3.3058

/** 긴 이름부터 봐야 '다세대(생활주택)'이 '다세대'로 잡히지 않는다 */
const USE_TOKENS = [
  '다세대(생활주택)', '아파트(생활주택)', '오피스텔(주거용)', '오피스텔(상가)',
  '주상복합(상가)', '도시형생활주택', '다가구주택', '근린생활시설',
  '단독주택', '근린주택', '근린상가', '다세대', '오피스텔', '아파트',
  '연립', '상가', '주택', '대지', '임야', '차량',
]

/**
 * 특수권리 — [찾을 문자열, 화면에 쓸 이름].
 *
 * 찾을 문자열은 **반드시 붙어 있는 조각**이어야 한다. 두 단어짜리 권리는
 * 사이에 주소 대괄호가 끼어드는 행이 있어서("[인수조건 … [양재대로102길 17] … 변경]")
 * 공백을 지워도 이어지지 않는다. 그래서 앞 단어만으로 찾는다.
 */
const RIGHT_TOKENS: [needle: string, label: string][] = [
  ['대항력임차인', '대항력임차인'], ['先임차권', '先임차권'], ['先전세권', '先전세권'],
  ['유치권', '유치권'], ['법정지상권', '법정지상권'], ['분묘기지권', '분묘기지권'],
  ['위반건축물', '위반건축물'], ['재매각', '재매각'], ['지분매각', '지분매각'],
  ['토지별도등기', '토지별도등기'], ['대지권미등기', '대지권미등기'],
  ['농지취득자격증명', '농지취득자격증명'], ['인수조건', '인수조건 변경'],
  ['예고등기', '예고등기'], ['선순위가등기', '선순위가등기'],
  ['선순위가처분', '선순위가처분'], ['맹지', '맹지'], ['일괄매각', '일괄매각'],
]

const NOISE = /오후 \d|오전 \d|출력일|지지옥션|^\s*사진\s|물건기본내역|상태 \(유찰회수\)/
/**
 * ⚠️ 레코드 경계는 매각기일이 아니라 **법원계 + 사건번호** 다.
 *
 * 같은 날짜가 이어지면 PDF 가 매각기일을 생략하는 형식이 있다. 매각기일로 자르면
 * 그런 행이 앞 레코드에 통째로 흡수된다 — 실제로 100건을 93건으로 세고 7건을
 * 흘렸다. 날짜가 앞에 붙어 있으면 같이 삼켜 블록이 날짜부터 시작하게 한다.
 */
const REC_HEAD = /(?:\d{4}\.\d{2}\.\d{2}\s+)?\S+계\s+\d{4}-\d+/g

/** 정제 리포트에 그대로 뿌리는 사유 정의 */
export const FLAG_SPECS: FlagSpec[] = [
  { key: 'minBidOverAppraisal', label: '최저가 > 감정가',
    how: '재감정 후 새 가격으로 다시 진행된 물건', action: '회차 계산에서 제외 · 낙찰가율은 그대로 씀' },
  { key: 'offDecayLadder', label: '회차 역산 불일치',
    how: '20% 저감 계단에 맞지 않음', action: '가장 가까운 회차로 두고 예외 표시' },
  { key: 'areaMissing', label: '면적 없음',
    how: '토지만 · 건물만 · 지분 물건', action: '평당가만 제외' },
  { key: 'noWinningPrice', label: '낙찰가 없음',
    how: '유찰 · 변경 · 취하', action: '낙찰가율에서 제외 · 유찰 집계에는 포함' },
  { key: 'parseIncomplete', label: '표 인식 실패',
    how: '줄바꿈 · 병합 셀', action: '원문을 함께 보여주고 직접 확인' },
]

const stripNoise = (text: string) =>
  text.split('\n').filter((line) => !NOISE.test(line)).join('\n')

function splitRecords(text: string): string[] {
  const marks: number[] = []
  for (const m of text.matchAll(REC_HEAD)) marks.push(m.index)
  if (marks.length === 0) return []
  return marks.map((start, i) => text.slice(start, marks[i + 1] ?? text.length))
}

const pick = (re: RegExp, block: string, group = 1): string | null =>
  block.match(re)?.[group] ?? null

const toInt = (v: string | null): number | null =>
  v === null ? null : Number(v.replace(/,/g, ''))

function findUse(block: string): string | null {
  const flat = block.replace(/\s+/g, '')
  return USE_TOKENS.find((u) => flat.includes(u.replace(/\s+/g, ''))) ?? null
}

/**
 * 블록 전체에서 권리 토큰을 찾는다.
 *
 * 대괄호 안만 보면 안 된다 — 대괄호가 줄을 걸쳐 있고 주소 대괄호가 중간에
 * 끼어드는 행이 있어서, 첫 ']' 에서 끊기면 뒤에 오는 권리를 놓친다.
 * 권리 토큰은 주소·물건명에 나올 수 없을 만큼 특이해서 전체 검색이 안전하다.
 */
function findRights(block: string): string[] {
  const flat = block.replace(/\s+/g, '')
  return RIGHT_TOKENS.filter(([needle]) => flat.includes(needle)).map(([, label]) => label)
}

/** 최저가÷감정가를 20% 계단 위 회차로 되돌린다 */
export function roundOf(minBid: number, appraisal: number) {
  if (!appraisal || minBid <= 0) return { round: null, pct: null, onLadder: false }
  const pct = (minBid / appraisal) * 100
  const round = Math.round(Math.log(pct / 100) / Math.log(DECAY)) + 1
  const theoretical = 100 * DECAY ** (round - 1)
  return {
    round,
    pct: Math.round(pct * 100) / 100,
    onLadder: Math.abs(pct - theoretical) <= LADDER_TOL_PP,
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

function parseBlock(block: string): CaseRow {
  const money = [...block.matchAll(/([\d,]{7,})\s*\((\d+)%\)/g)]  // [0] 최저가, [1] 낙찰가
  const appraisal = toInt(pick(/([\d,]{7,})\s+(?:매각|유찰|변경|취하)/, block)) ?? 0
  const minBid = money[0] ? Number(money[0][1].replace(/,/g, '')) : 0
  const winning = money[1] ? Number(money[1][1].replace(/,/g, '')) : 0
  const bldg = toInt(pick(/건물\s+([\d,]+)㎡/, block))
  const land = toInt(pick(/토지\s+([\d,]+)㎡/, block))
  const statusRaw = pick(/[\d,]{7,}\s+(매각|유찰|변경|취하)/, block)
  const status = (statusRaw ?? '알수없음') as CaseStatus

  const ladder = roundOf(minBid, appraisal)
  const sold = status === '매각' && winning > 0

  const flags: RowFlag[] = []
  if (appraisal > 0 && minBid > appraisal) flags.push('minBidOverAppraisal')
  if (ladder.pct !== null && !ladder.onLadder) flags.push('offDecayLadder')
  if (!bldg) flags.push('areaMissing')
  if (!sold) flags.push('noWinningPrice')

  const bidDate = (pick(/(\d{4}\.\d{2}\.\d{2})/, block) ?? '').replace(/\./g, '-')
  // 날짜가 생략된 행이 있어 날짜를 전제로 하면 안 된다 — 사건번호 앞의 계로 잡는다
  const court = pick(/(\S+계)\s+\d{4}-\d+/, block)
  const caseNo = pick(/(\d{4}-\d+(?:\[\d+\])?)/, block)
  const usageName = findUse(block)
  if (!bidDate || !court || !caseNo || !usageName || !appraisal || !minBid) {
    flags.push('parseIncomplete')
  }

  return {
    bidDate,
    court: court ?? '',
    caseNo: caseNo ?? '',
    district: pick(/서울\s+(\S+구)\s/, block),
    usageName,
    status,
    appraisalWon: appraisal,
    minBidWon: minBid,
    winningWon: winning,
    bidders: toInt(pick(/응찰\s*(\d+)/, block)) ?? 0,
    bldgM2: bldg,
    landM2: land,
    rights: findRights(block),

    roundNo: flags.includes('minBidOverAppraisal') ? null : ladder.round,
    minToAppraisalPct: ladder.pct,
    rateVsAppraisal: sold && appraisal ? round2((winning / appraisal) * 100) : null,
    rateVsMinBid: sold && minBid ? round2((winning / minBid) * 100) : null,
    pyeongPriceApprox: appraisal && bldg ? Math.round(appraisal / (bldg / PYEONG)) : null,

    flags,
    raw: block.trim(),
  }
}

/** PDF 에서 뽑은 텍스트 한 덩어리 → 레코드 목록 + 요약 */
export function parseListing(text: string, fileName: string): ParseResult {
  const rows = splitRecords(stripNoise(text)).map(parseBlock)
  const dates = rows.map((r) => r.bidDate).filter(Boolean).sort()
  const courts = [...new Set(rows.map((r) => r.court).filter(Boolean))]
  return {
    fileName,
    rows,
    total: rows.length,
    clean: rows.filter((r) => !r.flags.includes('parseIncomplete')).length,
    needsCheck: rows.filter((r) => r.flags.length > 0).length,
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
    courts,
    hasFailedRows: rows.some((r) => r.status === '유찰'),
  }
}
