'use client'

import type { Bin, BidderRow, DistRow, MonthRow, Prem, RateRow } from '@/lib/case/types'
import { eok, nf } from '@/lib/case/api'

/**
 * 조원 「경매어려워」 의 차트 5개를 SVG 로 옮긴 것. 좌표계와 눈금은 조원 코드를 그대로 따랐다 —
 * 발표에서 두 화면을 나란히 놓아도 같은 그림이어야 한다. 색만 우리 토큰(먹 · 보라)으로.
 */

const INK = '#1c1c1c', INK2 = '#565656', INK3 = '#8c8c8c', INK4 = '#b4b4b4', LINE = '#c9c9c9', LINE2 = '#e2e2e2'
const PEER = '#565656', PEERW = '#e2e2e2', SELF = '#723ceb'
const MONO = 'ui-monospace, Menlo, monospace'

type TxProps = { x: number; y: number; s?: number; f?: string; a?: 'start' | 'middle' | 'end'; m?: boolean; b?: boolean; children: React.ReactNode }
const Tx = ({ x, y, s = 10, f = INK3, a, m, b, children }: TxProps) => (
  <text x={x} y={y} fontSize={s} fill={f} textAnchor={a} fontFamily={m ? MONO : undefined} fontWeight={b ? 'bold' : undefined}>{children}</text>
)

/** 호버 툴팁 — .hg:hover .hp 로 켠다 */
const Tip = ({ x, y, w, t }: { x: number; y: number; w: number; t: string }) => (
  <g className="hp"><rect x={x} y={y} width={w} height={19} rx={4} fill="#1a1917" />
    <Tx x={x + w / 2} y={y + 13} s={10} f="#f2f2f2" a="middle" m>{t}</Tx></g>
)

const Svg = ({ vb, children }: { vb: string; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${vb}`} className="hv" role="img">{children}</svg>
)

/** ① 매각률 — 동네 vs 서울 평균 */
export function RateBar({ dong, rD, rS }: { dong: string; rD: RateRow; rS: RateRow }) {
  const sold = rD.n_sold, fail = rD.n_all - rD.n_sold, w = Math.max(rD.pct / 100 * 420, 2), sx = 20 + rS.pct / 100 * 420
  return (
    <Svg vb="460 128">
      <Tx x={20} y={22} s={11} f={INK2}>{dong} 경매건수 <tspan fontFamily={MONO} fontWeight="bold" fill={INK}>{nf(rD.n_all)}</tspan>건</Tx>
      <g className="hg"><rect x={20} y={32} width={w} height={34} rx={3} fill={PEER} />
        <Tx x={20 + w / 2} y={54} s={13} f="#fff" a="middle" m b>{rD.pct}%</Tx><Tip x={20} y={96} w={200} t={`매각 ${nf(sold)}건`} /></g>
      <g className="hg"><rect x={20 + w} y={32} width={420 - w} height={34} rx={3} fill={PEERW} />
        <Tx x={20 + w + (420 - w) / 2} y={54} s={12} f={INK2} a="middle" m>{(100 - rD.pct).toFixed(1)}%</Tx><Tip x={240} y={96} w={200} t={`유찰 ${nf(fail)}건`} /></g>
      <Tx x={20} y={82} s={10.5} f={INK}>매각 {nf(sold)}</Tx><Tx x={440} y={82} s={10.5} a="end">유찰 {nf(fail)}</Tx>
      <line x1={sx} y1={28} x2={sx} y2={90} stroke={INK2} strokeDasharray="3 2" />
      <Tx x={sx + 4} y={26} s={9.5} f={INK2} m>서울 평균 {rS.pct}%</Tx>
      <Tx x={20} y={122} s={9} f={INK4} m>경매건수 = 입찰이 실시된 건수. 유찰되면 다시 부쳐져 누적된다</Tx>
    </Svg>
  )
}

/** ② 낙찰 회차 히스토그램 — 이 물건의 회차를 보라로. 막대 아래에 감정가 대비 %를 같이 적는다(우리 회차 정의와 다르다는 표시) */
export function RoundHist({ dong, rd, cur, nSold }: { dong: string; rd: DistRow[]; cur: number; nSold: number }) {
  const mx = Math.max(...rd.map((r) => r.n), 1)
  const curIdx = rd.findIndex((r) => r.r === cur)
  return (
    <Svg vb="460 158">
      <line x1={40} y1={100} x2={440} y2={100} stroke={INK3} /><line x1={40} y1={18} x2={40} y2={100} stroke={LINE} />
      <Tx x={34} y={22} s={9} a="end" m>{mx}</Tx><Tx x={34} y={103} s={9} a="end" m>0</Tx>
      {rd.map((r, k) => {
        const x = 58 + 80 * k, h = r.n / mx * 75, y = 100 - h, on = r.r === cur
        return (
          <g key={r.r}>
            <g className="hg"><rect x={x - 8} y={18} width={76} height={82} fill="transparent" />
              <rect x={x} y={y} width={60} height={Math.max(h, 1.2)} fill={on ? SELF : PEERW} />
              <Tx x={x + 30} y={y - 6} s={on ? 11.5 : 10} f={on ? INK : INK2} a="middle" m b={on}>{r.n}</Tx>
              <Tip x={Math.min(Math.max(x - 45, 30), 290)} y={0} w={150} t={`${r.r >= 5 ? '5회차 이상' : r.r + '회차'} ${r.n}건 · ${(r.n / nSold * 100).toFixed(1)}%`} /></g>
            <Tx x={x + 30} y={118} s={10.5} f={on ? INK : INK3} a="middle" b={on}>{r.r >= 5 ? '5회+' : r.r + '회'}</Tx>
            <Tx x={x + 30} y={130} s={8.5} f={INK4} a="middle" m>{r.r >= 5 ? '≤41%' : (100 * 0.8 ** (r.r - 1)).toFixed(0) + '%'}</Tx>
          </g>
        )
      })}
      {curIdx >= 0 && <Tx x={58 + 80 * curIdx + 30} y={146} s={10} f={SELF} a="middle" m>↑ 이 물건</Tx>}
      <Tx x={40} y={155} s={9} f={INK4} m>{dong} 매각 {nf(nSold)}건의 낙찰 회차 · 회차는 기일 순번, 아래 %는 감정가 대비 최저가</Tx>
    </Svg>
  )
}

/** ③ 낙찰가 곡선 — 최저가 대비 +0~30% 구간의 분포(가우시안 평활). 내 입찰가가 있으면 세로선 */
export function PriceCurve({ minPrice, pbin, pd, myBid }: { minPrice: number; pbin: Bin[]; pd: Prem; myBid?: number | null }) {
  const bins = pbin.map((b) => ({ lo: +b.lo, n: b.n }))
  if (!bins.length || !pd.n) return <Svg vb="460 100"><Tx x={230} y={55} s={12} a="middle">표본이 없습니다</Tx></Svg>
  const X0 = 1.0, X1 = 1.3, N = 120, sig = pd.n < 150 ? 0.022 : 0.016
  const ctr = bins.map((b) => b.lo + 0.01)
  const val: number[] = []
  for (let k = 0; k <= N; k++) {
    const x = X0 + (X1 - X0) * k / N
    let num = 0, den = 0
    bins.forEach((b, j) => { const w = Math.exp(-((x - ctr[j]) ** 2) / (2 * sig * sig)); num += b.n * w; den += w })
    val.push(den ? num / den : 0)
  }
  const ymax = Math.max(...val) * 1.12 || 1
  const px = (x: number) => 55 + (x - X0) / (X1 - X0) * 375
  const py = (v: number) => 108 - v / ymax * 82
  const path = 'M' + val.map((v, k) => `${px(X0 + (X1 - X0) * k / N).toFixed(1)},${py(v).toFixed(1)}`).join(' L')
  const med = pd.p50 || 1, mx = Math.min(Math.max(px(med), 55), 430)
  const mv = val[Math.round((Math.min(Math.max(med, X0), X1) - X0) / (X1 - X0) * N)] || 0
  const tot = pd.n || 1
  const segs: [number, number][] = [[1.0, 1.1], [1.1, 1.2], [1.2, 1.3]]
  const my = myBid && myBid > 0 ? Math.min(Math.max(px(myBid / minPrice), 55), 430) : null
  return (
    <Svg vb="460 178">
      <line x1={55} y1={108} x2={430} y2={108} stroke={INK3} /><line x1={55} y1={20} x2={55} y2={108} stroke={LINE} />
      <line x1={55} y1={py(ymax / 2)} x2={430} y2={py(ymax / 2)} stroke={LINE2} />
      {[0, Math.round(ymax / 2), Math.round(ymax)].map((v) => <Tx key={v} x={50} y={py(v) + 3} s={9} a="end" m>{v}{v === Math.round(ymax) ? '건' : ''}</Tx>)}
      <path d={`${path} L430,108 L55,108 Z`} fill={PEER} fillOpacity={0.12} />
      <path d={path} fill="none" stroke={PEER} strokeWidth={2.4} />
      {segs.map(([lo, hi]) => {
        const c = bins.filter((b) => b.lo >= lo - 1e-9 && b.lo < hi - 1e-9).reduce((a, b) => a + b.n, 0)
        return <g key={lo} className="hg"><rect x={px(lo)} y={20} width={125} height={88} fill="transparent" />
          <Tip x={Math.min(Math.max(px(lo) - 20, 55), 250)} y={150} w={180} t={`+${((lo - 1) * 100).toFixed(0)}~+${((hi - 1) * 100).toFixed(0)}% · ${c}건 (${(c / tot * 100).toFixed(0)}%)`} /></g>
      })}
      <line x1={mx} y1={26} x2={mx} y2={116} stroke={INK} strokeWidth={1.6} />
      <circle cx={mx} cy={py(mv)} r={4.5} fill={INK} />
      <Tx x={mx + 5} y={23} s={10.5} f={INK} m b>절반이 여기까지</Tx>
      <line x1={55} y1={112} x2={55} y2={122} stroke={SELF} strokeWidth={2} />
      <Tx x={55} y={136} s={10.5} f={SELF} a="middle" m b>{eok(minPrice)}억</Tx><Tx x={55} y={150} s={9.5} a="middle" m>최저가</Tx>
      {[1.05, 1.15, 1.2, 1.25, 1.3].map((v) => <g key={v}>
        <Tx x={px(v)} y={124} s={9.5} a="middle" m>{(minPrice * v / 1e8).toFixed(3)}</Tx>
        <Tx x={px(v)} y={139} s={9} f={INK4} a="middle" m>+{Math.round((v - 1) * 100)}%</Tx></g>)}
      {my !== null && <g>
        <line x1={my} y1={18} x2={my} y2={116} stroke={SELF} strokeWidth={2.6} />
        <rect x={Math.min(Math.max(my - 75, 55), 280)} y={158} width={150} height={18} rx={4} fill={SELF} />
        <Tx x={Math.min(Math.max(my - 75, 55), 280) + 75} y={171} s={10.5} f="#fff" a="middle" m>내 입찰가 +{(((myBid as number) / minPrice - 1) * 100).toFixed(1)}%</Tx></g>}
    </Svg>
  )
}

/** ④ 응찰자 도넛 */
export function Donut({ bd, pd }: { bd: BidderRow[]; pd: Prem }) {
  const names: Record<number, string> = { 1: '1명', 2: '2명', 3: '3명', 4: '4–6명', 7: '7명 이상' }
  const cols: Record<number, string> = { 1: '#f4f4f4', 2: '#d5d5d5', 3: '#a8a8a8', 4: '#7a7a7a', 7: SELF }
  const tot = bd.reduce((a, b) => a + b.n, 0) || 1, C = 2 * Math.PI * 34
  let off = 0
  return (
    <Svg vb={`460 ${34 + 26 * bd.length + 26}`}>
      <g transform="translate(105,72)">
        {bd.map((b) => { const ln = C * b.n / tot; const el = <circle key={b.g} r={34} fill="none" stroke={cols[b.g]} strokeWidth={20}
          strokeDasharray={`${ln.toFixed(2)} ${(C - ln).toFixed(2)}`} strokeDashoffset={(-off).toFixed(2)} transform="rotate(-90)"><title>{names[b.g]} {b.n}건</title></circle>; off += ln; return el })}
        <Tx x={0} y={-2} s={17} f={INK} a="middle" m b>{pd.avg_bid || 0}</Tx><Tx x={0} y={13} s={9.5} a="middle">평균 응찰자</Tx>
      </g>
      {bd.map((b, k) => { const y = 26 + 26 * k, one = b.g === 1; return <g key={b.g}>
        <rect x={190} y={y} width={11} height={11} fill={cols[b.g]} stroke={INK3} strokeWidth={0.5} />
        <Tx x={208} y={y + 9} s={10.5} f={one ? INK : INK2} b={one}>{names[b.g]}</Tx>
        <Tx x={330} y={y + 9} s={10.5} f={one ? INK : INK2} a="end" m b={one}>{b.n}건 {(b.n / tot * 100).toFixed(1)}%</Tx>
        <Tx x={440} y={y + 9} s={10.5} f={INK2} a="end" m>+{((b.prem - 1) * 100).toFixed(1)}%</Tx></g> })}
      <Tx x={440} y={15} s={9.5} f={INK4} a="end" m>건수 · 비중 · 평균 프리미엄</Tx>
    </Svg>
  )
}

/**
 * 실거래 구간 폭 — 서버가 주는 lo 간격에서 읽는다. 조원 코드는 2,000만원을 박아 뒀는데
 * RPC 가 1,000만원 구간으로 바뀐 날(8/30) 채 수가 어긋났다. 데이터가 말하는 폭을 쓴다.
 */
export function binWidth(rb: Bin[]): number {
  const los = rb.map((b) => +b.lo).sort((a, b) => a - b)
  let w = Infinity
  for (let k = 1; k < los.length; k++) w = Math.min(w, los[k] - los[k - 1])
  return Number.isFinite(w) && w > 0 ? w : 2e7
}

/** 실거래 히스토그램 위에서 v 보다 싼 채 수(구간 안은 비례) */
export function countBelow(rb: Bin[], v: number): number {
  const bw = binWidth(rb)
  let c = 0
  rb.forEach((b) => { const lo = +b.lo; if (v >= lo + bw) c += b.n; else if (v > lo) c += b.n * (v - lo) / bw })
  return Math.round(c)
}

/** ⑤ 동네 실거래 가격 분포 — 최저가 · 가운데 값 · 감정가 세로선, 내 입찰가 */
export function DealHist({ rb, minPrice, appraisal, med, nLow, nAppr, myBid }: { rb: Bin[]; minPrice: number; appraisal: number; med: number; nLow: number; nAppr: number; myBid?: number | null }) {
  const mx = Math.max(...rb.map((b) => b.n), 1)
  const step = binWidth(rb)
  const lo0 = +rb[0].lo, hi0 = +rb[rb.length - 1].lo + step
  const W = 754, px = (v: number) => 46 + (v - lo0) / (hi0 - lo0) * W
  const bw = W * step / (hi0 - lo0)
  const ticks: number[] = []
  for (let v = Math.ceil(lo0 / 5e7) * 5e7; v <= hi0; v += 5e7) ticks.push(v)
  const my = myBid && myBid > 0 ? Math.min(Math.max(px(myBid), 46), 800) : null
  return (
    <Svg vb="820 246">
      <line x1={46} y1={175} x2={800} y2={175} stroke={INK3} /><line x1={46} y1={42} x2={46} y2={175} stroke={LINE} />
      <Tx x={40} y={46} s={9.5} a="end" m>{mx}채</Tx><Tx x={40} y={178} s={9.5} a="end" m>0</Tx>
      <line x1={46} y1={175 - 66.5} x2={800} y2={175 - 66.5} stroke={LINE2} />
      <rect x={46} y={42} width={Math.max(px(minPrice) - 46, 0)} height={133} fill={SELF} fillOpacity={0.06} />
      {rb.map((b) => { const x = px(+b.lo), h = b.n / mx * 133, y = 175 - h; return <g key={b.lo} className="hg">
        <rect x={x} y={42} width={bw} height={133} fill="transparent" />
        <rect x={x + 2} y={y} width={bw - 4} height={Math.max(h, 1)} rx={2} fill={PEERW} stroke={LINE} strokeWidth={0.5} />
        <Tip x={Math.min(Math.max(x - 40, 46), 640)} y={12} w={116} t={`${eok(+b.lo)}~${eok(+b.lo + step)}억 · ${b.n}채`} /></g> })}
      <line x1={px(minPrice)} y1={34} x2={px(minPrice)} y2={182} stroke={SELF} strokeWidth={2.2} />
      <Tx x={px(minPrice) - 6} y={31} s={11} f={SELF} a="end" m b>최저가 {eok(minPrice)}억</Tx>
      <line x1={px(med)} y1={52} x2={px(med)} y2={180} stroke={INK} strokeDasharray="2 3" />
      <Tx x={px(med) + 4} y={49} s={10.5} f={INK} m>동네 가운데 값 {eok(med)}억</Tx>
      <line x1={px(appraisal)} y1={72} x2={px(appraisal)} y2={180} stroke={INK3} strokeDasharray="4 2" />
      <Tx x={px(appraisal) + 4} y={69} s={10.5} f={INK2} m>감정가 {eok(appraisal)}억</Tx>
      {ticks.map((v) => <g key={v}><line x1={px(v)} y1={175} x2={px(v)} y2={180} stroke={INK3} /><Tx x={px(v)} y={191} s={9.5} a="middle" m>{(v / 1e8).toFixed(1)}</Tx></g>)}
      <Tx x={800} y={191} s={9.5} f={INK4} a="end" m>억원</Tx>
      {my !== null && <g><line x1={my} y1={34} x2={my} y2={190} stroke={SELF} strokeWidth={2.6} />
        <rect x={Math.min(Math.max(my - 66, 46), 668)} y={194} width={132} height={18} rx={4} fill={SELF} />
        <Tx x={Math.min(Math.max(my - 66, 46), 668) + 66} y={207} s={10.5} f="#fff" a="middle" m>내 입찰가 {eok(myBid as number)}억</Tx></g>}
      <Tx x={46} y={222} s={11.5} f={INK}>← 최저가보다 싸게 팔린 집 <tspan fontFamily={MONO} fontWeight="bold">{nLow}채</tspan></Tx>
      <Tx x={800} y={222} s={11.5} f={INK2} a="end">감정가보다 싸게 팔린 집 <tspan fontFamily={MONO}>{nAppr}채</tspan> →</Tx>
      <Tx x={46} y={238} s={9.5} f={INK4}>막대 하나 = 그 가격대에 팔린 집 수</Tx>
    </Svg>
  )
}

/** ⑥ 평당가 12개월 추이 — 선은 평당가, 막대는 거래 건수 */
export function PpmTrend({ rm }: { rm: MonthRow[] }) {
  const py2 = rm.map((m) => Math.round(m.ppm * 3.305785))
  const pmin = Math.min(...py2), pmax = Math.max(...py2)
  const lo = Math.floor(pmin / 1e6) * 1e6 - 1e6
  let hi = Math.ceil(pmax / 1e6) * 1e6 + 1e6
  if (hi <= lo) hi = lo + 1e6
  const cmax = Math.max(...rm.map((m) => m.n), 1)
  const st = 730 / rm.length, cxs = rm.map((_, k) => 60 + st / 2 + st * k)
  const ly = (v: number) => 120 - (v - lo) / (hi - lo) * 90
  const by = (n: number) => 168 - n / cmax * 40
  const line = 'M' + rm.map((_, k) => `${cxs[k].toFixed(1)},${ly(py2[k]).toFixed(1)}`).join(' L')
  return (
    <Svg vb="820 210">
      <line x1={60} y1={30} x2={790} y2={30} stroke={LINE2} /><line x1={60} y1={75} x2={790} y2={75} stroke={LINE2} />
      <Tx x={54} y={33} s={9} a="end" m>{nf(Math.round(hi / 1e4))}</Tx><Tx x={54} y={78} s={9} a="end" m>{nf(Math.round((hi + lo) / 2 / 1e4))}</Tx>
      <Tx x={54} y={123} s={9} a="end" m>{nf(Math.round(lo / 1e4))}</Tx><Tx x={60} y={18} s={10} f={INK} m>평당가 (만원)</Tx>
      <line x1={60} y1={168} x2={790} y2={168} stroke={INK3} />
      <Tx x={796} y={131} s={9} m>{cmax}건</Tx><Tx x={796} y={171} s={9} m>0</Tx>
      {rm.map((m, k) => { const c = cxs[k]; return <g key={m.ym} className="hg">
        <rect x={c - st / 2} y={24} width={st} height={144} fill="transparent" />
        <rect x={c - st * 0.28} y={by(m.n)} width={st * 0.56} height={168 - by(m.n)} rx={2} fill={PEERW} />
        <circle cx={c} cy={ly(py2[k])} r={3.4} fill={PEER} />
        <Tip x={Math.min(Math.max(c - 72, 60), 646)} y={4} w={144} t={`${+m.ym.slice(5)}월 · ${nf(Math.round(py2[k] / 1e4))}만원 · ${m.n}건`} /></g> })}
      <path d={line} fill="none" stroke={PEER} strokeWidth={2} />
      {rm.map((m, k) => k % 2 === 0 ? <Tx key={m.ym} x={cxs[k]} y={184} s={10} a="middle" m>{+m.ym.slice(5)}월</Tx> : null)}
      <Tx x={60} y={206} s={9.5} f={INK4} m>막대 위에 마우스를 올리면 그 달의 평당가와 거래 건수가 나옵니다</Tx>
    </Svg>
  )
}
