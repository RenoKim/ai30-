/**
 * 지지옥션 목록 PDF 의 주소를 뜯는다.
 *
 * 왜 따로 두나 — 주소는 공공데이터(건축물대장 · 실거래 · 공시가격)로 가는 **유일한 결합 키**다.
 * 법정동 + 지번만 정확하면 건축물대장이 100% 붙는다(화곡동 5건 실측 5/5).
 * 나머지(건물명 · 층 · 호 · 도로명)는 있으면 좋은 값이라 없어도 행을 버리지 않는다.
 *
 * PDF 는 표가 아니라 **다단 레이아웃**이라 주소가 세 군데서 잘린다.
 *   ① 지번이 줄 끝에서 끊긴다      "…368-42,368-" + "64,368-65,368-66 엔에스타운"
 *   ② 도로명이 줄 끝에서 끊긴다     "601호 [등" + "촌로13자길 39-17]"
 *   ③ 용도 컬럼이 주소 사이에 낀다  "시그니엘 6층" + "다세대 601호 [월정로…]"
 * 그래서 **오른쪽 컬럼(금액·조회수·메뉴)을 잘라내고 왼쪽만 공백 없이 이어붙인 뒤** 읽는다.
 *
 * 100건 전수 실측 — 지번 100 · 층 99 · 호 98 · 도로명 98 · 건물명 97.
 * scripts/parse_ggauction_pdf.py 와 같은 규칙이다. 바꾸려면 양쪽을 같이 바꾸고 같은 PDF 로 대조할 것.
 */

export interface Address {
  gu: string
  /** 법정동. '금호동3가' 처럼 뒤에 '<숫자>가' 가 붙는 것이 있다 */
  dong: string
  /** 대표 지번(첫 필지). 건축물대장·실거래 조인 키 */
  jibun: string
  /** 일괄매각이면 필지가 여럿이다 */
  jibunAll: string[]
  buildingName: string | null
  /** '3' · '지하1' */
  floor: string | null
  ho: string | null
  roadAddr: string | null
}

const USE_TOKENS_FOR_STRIP = [
  '다세대(생활주택)', '아파트(생활주택)', '오피스텔(주거용)', '오피스텔(상가)',
  '주상복합(상가)', '도시형생활주택', '다가구주택', '근린생활시설',
  '단독주택', '근린주택', '근린상가', '다세대', '오피스텔', '아파트',
  '연립', '상가', '주택', '대지', '임야', '차량',
  '(생활주택)', '(주거용)', '(상가)',
].sort((a, b) => b.length - a.length)

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const USE_HEAD = new RegExp(`^\\s*(?:${USE_TOKENS_FOR_STRIP.map(esc).join('|')})(?=\\s|$)`)

const MONEY_COL = /\s{2,}[\d,]{9,}/
/** 오른쪽 메뉴 컬럼. '·' 가 줄바꿈으로 떨어져 나가는 행이 있어 낱말로도 지운다 */
const MENU = /\s+·\s*\S+/g
const MENU_WORDS = /세대조사|건축물대장|평면도|특수권리분석|현황조사|감정평가서|매각물건명세서/g
const BIDDERS = /\s*응찰\s*\d+/g

/** 권리 토큰 — 대괄호가 안 닫히는 행이 있어 괄호째 지우면 뒤의 호수까지 삼킨다. 낱말로 지운다 */
const RIGHT_NEEDLES = [
  '대항력임차인', '先임차권', '先전세권', '유치권', '법정지상권', '분묘기지권',
  '위반건축물', '재매각', '지분매각', '토지별도등기', '대지권미등기',
  '농지취득자격증명', '인수조건', '예고등기', '선순위가등기', '선순위가처분',
  '맹지', '일괄매각', '(말소)', '변경', '일괄', 'AI설계',
]

/** 블록에서 '물건기본내역' 왼쪽 컬럼만 이어붙인다 */
function leftColumn(block: string): string {
  return block.split('\n').map((raw) => {
    let ln = raw.split(MONEY_COL)[0]
    ln = ln.replace(MENU, '').replace(MENU_WORDS, '').replace(BIDDERS, '')
    ln = ln.replace(USE_HEAD, ' ')
    return ln.trim()
  }).filter(Boolean).join('')
}

const JIBUN = String.raw`\d+(?:-\d+)?`
const ADDR = new RegExp(
  String.raw`서울\s*(\S+?구)\s*([가-힣]+[동읍면리](?:\s*\d+가)?)\s*(${JIBUN}(?:\s*,\s*${JIBUN})*)\s*([\s\S]*)`,
)
/** 도로명 — 닫는 대괄호가 없을 수 있다. 권리 대괄호가 먼저 오거나 줄 끝에서 잘린다 */
const ROAD = /\[\s*([^[\]]*?(?:대?로|길)[^[\]]*?)\s*(?=\]|\[|$)/
const FLOOR = /(지하\s*\d*|\d+)\s*층/
const HO = /([가-힣]?\d{1,4}(?:-\d+)?)\s*호(?![수])/
const NOISE_NAME = /건축물대장|세대조사|평면도|특수권리/

export function parseAddress(block: string): Address | null {
  const s = leftColumn(block)
  const m = s.match(ADDR)
  if (!m) return null

  const gu = m[1]
  const dong = m[2].replace(/\s/g, '')
  const jibunAll = m[3].replace(/\s/g, '').split(',').filter(Boolean)

  // 면적 표기부터는 주소가 아니다
  let rest = m[4].split(/건물\s*[\d,]+\s*㎡/)[0]

  let roadAddr: string | null = null
  const rm = rest.match(ROAD)
  if (rm && rm.index !== undefined && /\d/.test(rm[1])) {
    roadAddr = rm[1].replace(/\s+/g, ' ').trim()
    // '가로공원로208' → '가로공원로 208'. 끝의 건물번호만 뗀다 — '월정로28가길' 은 건드리지 않는다
    roadAddr = roadAddr.replace(/(로|길)(\d+(?:-\d+)?)$/, '$1 $2')
    rest = `${rest.slice(0, rm.index)} ${rest.slice(rm.index + rm[0].length)}`
  }

  let core = rest.replace(/[[\]]/g, ' ')
  for (const n of RIGHT_NEEDLES) core = core.split(n).join(' ')

  const fm = core.match(FLOOR)
  let floor: string | null = null
  if (fm) {
    floor = fm[1].replace(/\s/g, '')
    if (floor === '지하') floor = '지하1'
  }
  const cut = fm && fm.index !== undefined ? fm.index : core.length
  // 호수는 층 뒤에서 찾는다 — '6층601호' 처럼 붙어 온다
  const hm = core.slice(fm ? cut + fm[0].length : 0).match(HO)

  let buildingName: string | null = core.slice(0, cut).replace(/\s+/g, ' ').replace(/^[\s,·]+|[\s,·]+$/g, '')
  buildingName = buildingName.replace(/\s*[A-Za-z가-힣]동$/, '').trim()   // '수명그린빌 B동' → '수명그린빌'
  // 일괄매각에서 남은 지번 나열이나 메뉴 글자는 건물명이 아니다
  if (!buildingName || /^[\d\s,.\-]+$/.test(buildingName) || NOISE_NAME.test(buildingName)) buildingName = null

  return { gu, dong, jibun: jibunAll[0], jibunAll, buildingName, floor, ho: hm ? hm[1] : null, roadAddr }
}
