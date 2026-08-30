'use client'

import type { CaseDetail } from '@/lib/case/types'
import { ASOF, eok, fmtCase, nf } from '@/lib/case/api'
import { Callout, Read, Row, Cell, Rounds } from '@/components/dash/ui'
import { RateBar, RoundHist, PriceCurve, Donut, DealHist, PpmTrend, countBelow } from './charts'

const band = (lo: number, hi: number) => {
  const f = (v: number) => (v >= 1e8 ? `${v / 1e8}억` : '0')
  return hi > 9e10 ? `${f(lo)} 이상` : lo === 0 ? `${f(hi)} 미만` : `${f(lo)}–${f(hi)}`
}

/** 차트 왼쪽 · 해설 오른쪽 — 조원의 .pair */
function Pair({ chart, label, lines }: { chart: React.ReactNode; label: string; lines: React.ReactNode[] }) {
  return (
    <div className="pair">
      <div className="pl"><div className="chart">{chart}</div></div>
      <div className="pr"><span className="hd">{label}</span>{lines.map((l, i) => <p key={i}>{l}</p>)}</div>
    </div>
  )
}

const NoData = ({ title, msg }: { title: string; msg: string }) => (
  <>
    <Callout title={title}>{msg}</Callout>
    <div className="empty">비교할 만한 과거 기록이 없어요.<br /><span>{msg}</span></div>
  </>
)

const FewWarn = ({ n }: { n: number }) => n < 30
  ? <Read tone="warn" title="표본 부족">비교 대상이 <b>{n}건</b>뿐이라 아래 수치는 크게 흔들릴 수 있어요. 참고용으로만 보세요.</Read>
  : null

export function Sec1({ d }: { d: CaseDetail }) {
  const i = d.item, R = d.rounds ?? []
  const ratio = (i.min_price / i.appraisal * 100).toFixed(1)
  const dd = i.due ? Math.round((new Date(i.due).getTime() - new Date(ASOF).getTime()) / 864e5) : null
  const ddTxt = dd === null ? '' : dd > 0 ? `D-${dd}` : dd === 0 ? 'D-DAY' : '종료'
  const shown = R.filter((r) => r.res || r.r <= i.round + 1).slice().reverse()
  const flags = (i.flags ?? '').split(' · ').filter(Boolean)
  return (
    <section className="sec" id="sec1">
      <div className="sh"><span className="step">01</span>
        <h2>{i.court} {fmtCase(i.case_no)} ({i.item_no})</h2>
        {flags.map((f) => <span key={f} className="badge">{f}</span>)}</div>
      <Row>
        <Cell keyed label="매각기일 최저가" value={nf(i.min_price)} unit="원" note={<>감정가 대비 {ratio}%</>} />
        <Cell label="용도" value={i.house_type ?? '—'} note="주거용" />
        <Cell keyed label="매각기일" value={i.due ?? '—'} note={<>{i.round}회차 <span className="dd">{ddTxt}</span></>} />
      </Row>
      <Row>
        <Cell label="감정가" value={nf(i.appraisal)} unit="원" note={<>감정일 {i.appraisal_date ?? '—'}</>}>
          <div className="sub-split"><div>토지<b>{nf(i.land_appr)} <span className="u2">원</span></b></div><div>건물<b>{nf(i.bldg_appr)} <span className="u2">원</span></b></div></div>
        </Cell>
        <Cell label="면적" value={i.area} unit="㎡" note={<>전용 {(i.area / 3.305785).toFixed(2)}평</>}>
          <div className="sub-split"><div>대지권<b>{i.land_auction} <span className="u2">㎡</span></b><span className="tiny">전용면적의 {Math.round(i.land_auction / i.area * 100)}%</span></div><div>필지<b>{i.land_total} <span className="u2">㎡</span></b></div></div>
        </Cell>
        <Cell label="채권" value={nf(i.debt)} unit="원" note={<>채권총액 · 감정가의 {(i.debt / i.appraisal * 100).toFixed(1)}%</>}>
          <div className="sub-split"><div>청구금액<b>{nf(i.claim)} <span className="u2">원</span></b><span className="tiny">감정가의 {(i.claim / i.appraisal * 100).toFixed(1)}%</span></div></div>
        </Cell>
      </Row>
      <span className="lbl">회차 정보</span>
      <Rounds items={shown.map((r) => ({
        round: `${r.r}회차 · ${r.d ?? ''}`,
        price: <>{nf(r.p)} <span className="u2">원</span></>,
        sub: `${r.res ?? '예정'} · 감정가 대비 ${(r.p / i.appraisal * 100).toFixed(1)}%`,
        tone: r.r === i.round ? 'now' as const : !r.res ? 'fut' as const : undefined,
      }))} />
    </section>
  )
}

export function Sec2({ d, myBid }: { d: CaseDetail; myBid: number | null }) {
  const i = d.item, dong = i.dong, gu = i.sigungu
  const rd = d.rdist?.dong ?? [], bd = d.bidd?.dong ?? []
  const rD = d.rate?.dong ?? { n_all: 0, n_sold: 0, pct: 0, n_item: 0 }
  const rG = d.rate?.gu ?? { pct: 0, n_all: 0, n_sold: 0, n_item: 0 }
  const rS = d.rate?.si ?? { pct: 0, n_all: 0, n_sold: 0, n_item: 0 }
  const pd = d.pq?.dong ?? { n: 0, p25: 1, p50: 1, p75: 1, p90: 1, solo: 0, avg_bid: 0 }
  const cond = `${i.house_type ?? ''} · ${i.ar_lo}–${i.ar_hi}㎡ · ${band(i.band_lo, i.band_hi)}`
  const head = <div className="sh"><span className="step">02</span><h2 className="sans">비교군과 경쟁</h2><span className="sub">{cond} · 매각 완료 건</span></div>
  if (!rD.n_all) return <section className="sec" id="sec2">{head}<NoData title="같은 조건으로 팔린 기록이 없습니다" msg={`${dong} · ${cond} 조건에 해당하는 경매 기록이 기준일까지 없어요.`} /></section>

  const ratio = rS.pct ? (rD.pct / rS.pct * 100).toFixed(0) : '—'
  const top = rd.slice().sort((a, b) => b.n - a.n)[0]
  const curN = (rd.find((r) => r.r === i.round) ?? { n: 0 }).n
  const hasPrem = pd.n > 0 && pd.p50
  const mid = Math.round(i.min_price * (pd.p50 || 1)), premPct = (((pd.p50 || 1) - 1) * 100).toFixed(1)
  const solo = (bd.find((b) => b.g === 1) ?? { n: 0 }).n
  const many = bd.filter((b) => b.g >= 3).reduce((a, b) => a + b.n, 0)
  const si = d.pq?.si, gq = d.pq?.gu
  return (
    <section className="sec" id="sec2">
      {head}
      <Callout title={`${dong}의 매각률은 서울 평균 대비 ${ratio}% 수준입니다`}>같은 조건 경매건수 {nf(rD.n_all)}건 중 {nf(rD.n_sold)}건 매각.</Callout>
      <Pair chart={<RateBar dong={dong} rD={rD} rS={rS} />} label="매각률" lines={[
        '경매에 부쳐진 건수 대비 팔린 비율이다.',
        <>{dong} <b>{rD.pct}%</b> · 서울 <b>{rS.pct}%</b>. 서울 대비 <b>{ratio}%</b> 수준이다.</>,
        <>물건 <b>{nf(rD.n_item)}개</b>가 경매건수 <b>{nf(rD.n_all)}건</b>을 만들었고 그중 <b>{nf(rD.n_sold)}건</b>이 팔렸다.</>,
        <>{gu}는 <b>{rG.pct}%</b>다.</>]} />

      {rd.length ? <>
        <Callout title={`비슷한 물건은 대부분 ${top.r >= 5 ? '5회차 이상' : top.r + '회차'}에 팔렸습니다 — ${(top.n / rD.n_sold * 100).toFixed(0)}%`}>이 물건은 {i.round}회차입니다.</Callout>
        <Pair chart={<RoundHist dong={dong} rd={rd} cur={i.round} nSold={rD.n_sold} />} label="낙찰 회차" lines={[
          <>{dong}에서 팔린 <b>{nf(rD.n_sold)}건</b>의 회차 분포다.</>,
          <>{rd.map((r, k) => <span key={r.r}>{k > 0 && ' · '}{r.r >= 5 ? '5회+' : r.r + '회'} <b>{r.n}건</b></span>)}</>,
          <>이 물건과 같은 <b>{i.round}회차</b> 낙찰은 <b>{curN}건</b>이다.</>,
          <>회차는 <b>기일 순번</b>이라 변경·연기된 기일도 센다. 값이 안 내려간 회차가 섞이므로 막대 아래 감정가 대비 %를 같이 보라.</>]} />
      </> : <NoData title="낙찰 회차 기록이 없습니다" msg="같은 조건에서 아직 팔린 건이 없어요." />}

      {hasPrem ? <>
        <FewWarn n={pd.n} />
        <Callout title={`비슷한 물건은 최저가보다 ${premPct}% 높은 ${eok(mid)}억이 가운데 값이었습니다`}>최저가 {eok(i.min_price)}억에 {nf(mid - i.min_price)}원을 더한 값. 표본 {pd.n}건.</Callout>
        <Pair chart={<PriceCurve minPrice={i.min_price} pbin={d.pbin ?? []} pd={pd} myBid={myBid} />} label="낙찰가 분포" lines={[
          <>세로축은 <b>건수</b>다. {i.round}회차 {pd.n}건만 담았다.</>,
          <>가운데 값은 <b>{eok(mid)}억</b>(최저가 <b>+{premPct}%</b>).</>,
          <>서울은 <b>+{(((si?.p50 ?? 1) - 1) * 100).toFixed(1)}%</b>, {gu}는 <b>+{(((gq?.p50 ?? 1) - 1) * 100).toFixed(1)}%</b>다.</>,
          myBid ? <>내 입찰가 <b>{eok(myBid)}억</b>은 최저가 <b>+{((myBid / i.min_price - 1) * 100).toFixed(1)}%</b>다.</> : null].filter(Boolean)} />
      </> : <NoData title={`${i.round}회차 낙찰 기록이 없습니다`} msg={`같은 조건 ${i.round}회차에서 팔린 건이 없어 낙찰가 분포를 그릴 수 없어요.`} />}

      {bd.length > 0 && <>
        <Callout title={`10건 중 ${pd.n ? Math.round(solo / pd.n * 10) : 0}건은 혼자 들어가서 낙찰됐습니다`}>평균 응찰자 {pd.avg_bid || 0}명. 서울 평균 {si?.avg_bid ?? 0}명.</Callout>
        <Pair chart={<Donut bd={bd} pd={pd} />} label="응찰자 수" lines={[
          <>{i.round}회차 <b>{pd.n}건</b> 기준이다.</>,
          <>단독 응찰이 <b>{solo}건({pd.solo || 0}%)</b>이다.</>,
          <>3명 이상은 <b>{many}건</b>이다.</>,
          <>서울 단독 비중은 <b>{si?.solo ?? 0}%</b>다.</>]} />
      </>}
    </section>
  )
}

export function Sec3({ d, myBid }: { d: CaseDetail; myBid: number | null }) {
  const i = d.item, dong = i.dong, gu = i.sigungu
  const rb = d.rbin ?? [], rm = d.rmon ?? []
  const dq = d.rq?.dong ?? { n: 0, med: 0 }, gq = d.rq?.gu ?? { n: 0, med: 0 }, sq = d.rq?.si ?? { n: 0, med: 1 }
  const pd = d.pq?.dong, mid = Math.round(i.min_price * (pd?.p50 || 1))
  const head = <div className="sh"><span className="step">03</span><h2 className="sans">이 동네 실거래</h2><span className="sub">경매가 아니라 일반 매매로 팔린 값</span></div>
  if (!rb.length || !dq.n) return <section className="sec" id="sec3">{head}<NoData title="같은 크기 집의 실거래가 없습니다" msg={`최근 1년 ${dong} ${i.ar_lo}–${i.ar_hi}㎡ 거래 기록이 없어요. 면적대를 넓히거나 기간을 늘려야 비교할 수 있어요.`} /></section>

  const tot = dq.n || 1
  const nLow = countBelow(rb, i.min_price), nMid = countBelow(rb, mid), nAppr = countBelow(rb, i.appraisal)
  const nMy = myBid ? countBelow(rb, myBid) : null
  const py2 = rm.map((m) => Math.round(m.ppm * 3.305785))
  const mn = py2.reduce((a, _, k) => (py2[k] < py2[a] ? k : a), 0), mx = py2.reduce((a, _, k) => (py2[k] > py2[a] ? k : a), 0)
  const cmin = Math.min(...rm.map((m) => m.n)), cmax = Math.max(...rm.map((m) => m.n))
  return (
    <section className="sec" id="sec3">
      {head}
      <FewWarn n={dq.n} />
      <Callout title={`최저가보다 싸게 팔린 집은 ${tot}채 중 ${nLow}채뿐입니다`}>최근 1년 {dong} {i.ar_lo}–{i.ar_hi}㎡ 거래 기준.</Callout>
      <span className="lbl">최근 1년 {dong}에서 팔린 {i.ar_lo}–{i.ar_hi}㎡ 집 {tot}채의 거래 가격</span>
      <div className="chart"><DealHist rb={rb} minPrice={i.min_price} appraisal={i.appraisal} med={dq.med} nLow={nLow} nAppr={nAppr} myBid={myBid} /></div>
      <Read title="동네에서 어느 위치인가">
        거래 <b>{tot}채</b>의 가운데 값은 <b>{eok(dq.med)}억</b>이었다. 최저가 <b>{eok(i.min_price)}억</b>보다 싼 거래는 <b>{nLow}채</b>다.<br />
        <b>{eok(mid)}억</b>에 낙찰되면 <b>{nMid}채보다 비싸고 {tot - nMid}채보다 싸다</b>.<br />
        감정가 <b>{eok(i.appraisal)}억</b>은 거래의 <b>{(nAppr / tot * 100).toFixed(0)}%</b>보다 비싸다.
        {nMy !== null && <><br />내 입찰가 <b>{eok(myBid as number)}억</b>이면 <b>{nMy}채보다 비싸고 {tot - nMy}채보다 싸다</b>.</>}
      </Read>
      <Read title="지역 비교">
        같은 크기 집의 가운데 값 — {dong} <b>{eok(dq.med)}억</b> · {gu} <b>{eok(gq.med)}억</b> · 서울 <b>{eok(sq.med)}억</b>. {dong}은 서울의 <b>{(dq.med / sq.med * 100).toFixed(0)}%</b> 수준이다.<br />
        낙찰가를 최저가보다 얼마나 올려 쓰는지는 지역차가 거의 없었다(02 참고). 집값 자체는 지역이 가른다.
      </Read>
      <Read tone="warn" title="읽을 때 주의">{tot}채에는 반지하와 노후 주택이 섞여 있다. 경매 데이터에 층·건축년도가 없어 걸러낼 수 없다. &ldquo;싸 보이는 정도&rdquo;가 부풀려져 있을 수 있다.</Read>
      {rm.length >= 2 && <>
        <Callout title={`평당가는 ${nf(Math.round(py2[mn] / 1e4))}만원에서 ${nf(Math.round(py2[mx] / 1e4))}만원 사이를 오갔습니다`}>월 거래 건수도 함께 표시했습니다.</Callout>
        <span className="lbl">{dong} 평당가 실거래 추이 · {i.ar_lo}–{i.ar_hi}㎡ · 최근 1년</span>
        <div className="chart"><PpmTrend rm={rm} /></div>
        <Read title="최근 1년 흐름">
          최저는 {+rm[mn].ym.slice(5)}월 <b>{nf(Math.round(py2[mn] / 1e4))}만원</b>, 최고는 {+rm[mx].ym.slice(5)}월 <b>{nf(Math.round(py2[mx] / 1e4))}만원</b>.<br />
          월 거래가 <b>{cmin}~{cmax}건</b>으로 얇아 월별 등락을 시세 흐름으로 읽으면 안 된다.
        </Read>
      </>}
      <p className="dnote">합성 데이터 · 용도(연립/다세대)는 원본에 없어 실거래 면적대별 비중으로 생성했다. 실측이 아니다. 해제거래·직거래는 실거래 표본에서 뺐다. — 조원 원문 각주</p>
    </section>
  )
}
