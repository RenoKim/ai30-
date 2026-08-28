'use client'

import { useMemo, useState } from 'react'
import { useUploads } from '@/lib/ggauction/store'
import { MARKET, MARKET_PERIOD, HOUSING, SCOPE_LABEL, pick } from '@/lib/ggauction/marketData'
import { EmptyGuide } from './ItemList'
import { CountUp } from './CountUp'

const 억 = 100_000_000
const money = (n: number) => (n <= 0 ? '—' : n >= 억 ? `${(n / 억).toFixed(1)}억` : `${Math.round(n / 10_000).toLocaleString('ko-KR')}만`)

/** 주택 4종만 더한 값 — 아파트는 다른 시장이라 빼고 센다 */
function housingTotal(scope: 'seoul' | 'hwagok') {
  const rows = MARKET.filter((m) => m.scope === scope && (HOUSING as readonly string[]).includes(m.usage))
  const sum = (k: 'listed' | 'sold' | 'failed' | 'appraisalWon' | 'winningWon') =>
    rows.reduce((a, r) => a + r[k], 0)
  const listed = sum('listed')
  const weighted = rows.reduce((a, r) => a + r.bidders * r.sold, 0)
  return {
    listed, sold: sum('sold'), failed: sum('failed'),
    soldRate: listed ? (sum('sold') / listed) * 100 : 0,
    priceRate: sum('appraisalWon') ? (sum('winningWon') / sum('appraisalWon')) * 100 : 0,
    bidders: sum('sold') ? weighted / sum('sold') : 0,
  }
}

/**
 * 기준 대비 증감을 방향으로 색칠한다.
 *
 * 주의 — 이 색은 "높다/낮다"만 뜻한다. 좋다/나쁘다가 아니다.
 * 낙찰가율이 낮은 것은 사는 쪽엔 유리하고 파는 쪽엔 불리하므로
 * 이 도메인에서 초록=좋음으로 읽히게 두면 거짓말이 된다.
 */
function Delta({ value, unit = '%p' }: { value: number; unit?: string }) {
  const up = value > 0
  const flat = Math.abs(value) < 0.005
  return (
    <span className={`delta ${flat ? 'is-flat' : up ? 'is-up' : 'is-down'}`}>
      <i aria-hidden>{flat ? '—' : up ? '▲' : '▼'}</i>
      {flat ? '0' : `${up ? '+' : ''}${value.toFixed(2)}`}{unit}
    </span>
  )
}

/**
 * 개찰 대상이 낙찰과 유찰로 어떻게 갈렸는지 한 줄로 보여준다.
 *
 * 시계열 스파크라인을 쓰지 않은 이유 — 이 화면은 주택 4종 기준인데
 * 가진 월별 자료는 업무/상업시설(집합) 기준이다. 기준이 다른 추이를
 * 주택 지표 옆에 붙이면 같은 것으로 읽힌다.
 * 이 막대는 같은 카드가 이미 쓰고 있는 값(listed = sold + failed)만 쓴다.
 */
function SplitBar({ sold, failed }: { sold: number; failed: number }) {
  const total = sold + failed
  if (total <= 0) return null
  const pct = (sold / total) * 100
  return (
    <div className="splitbar" role="img"
      aria-label={`낙찰 ${sold.toLocaleString('ko-KR')}건, 유찰 ${failed.toLocaleString('ko-KR')}건`}>
      <div className="splitbar-track">
        <div className="splitbar-sold" style={{ width: `${pct}%` }} />
      </div>
      <div className="splitbar-key">
        <span><i className="is-sold" aria-hidden />낙찰 {pct.toFixed(1)}%</span>
        <span><i className="is-failed" aria-hidden />유찰 {(100 - pct).toFixed(1)}%</span>
      </div>
    </div>
  )
}

/** 표 안에서 수치와 크기를 함께 보여준다. max 는 같은 열의 최대값이다. */
function BarCell({ value, max, suffix = '%' }: { value: number | null; max: number; suffix?: string }) {
  if (value === null) return <td className="num">-</td>
  return (
    <td className="num barcell">
      <span className="barcell-v">{value}{suffix}</span>
      <span className="barcell-bar" style={{ width: `${max ? (value / max) * 100 : 0}%` }} aria-hidden />
    </td>
  )
}

export function Brief() {
  const { rows, isEmpty } = useUploads()
  const [right, setRight] = useState<string>('전체')

  const seoul = useMemo(() => housingTotal('seoul'), [])
  const hwagok = useMemo(() => housingTotal('hwagok'), [])

  // 표 안 막대의 기준값. 두 지역을 같은 자로 재야 길이를 비교할 수 있다.
  const { maxSoldRate, maxPriceRate } = useMemo(() => {
    const rows = MARKET.filter(
      (m) => (HOUSING as readonly string[]).includes(m.usage),
    )
    return {
      maxSoldRate: Math.max(...rows.map((r) => r.soldRate), 1),
      maxPriceRate: Math.max(...rows.map((r) => r.priceRate), 1),
    }
  }, [])

  const rightOptions = useMemo(
    () => ['전체', ...new Set(rows.flatMap((r) => r.rights))],
    [rows],
  )
  const listed = useMemo(
    () => rows
      .filter((r) => right === '전체' || r.rights.includes(right))
      .sort((a, b) => b.bidDate.localeCompare(a.bidDate)),
    [rows, right],
  )

  return (
    <>
      <p className="dcrumb">시장 보기 / 경매시장 브리핑</p>
      <h1>경매시장 브리핑</h1>
      <p className="dlede">
        <b>주택 4종</b>(연립/다세대 · 오피스텔(주거용) · 단독/다가구) 기준입니다.
        아파트는 <b>거의 감정가에 팔리고 응찰자가 3배</b>라 다른 시장이어서 뺐습니다 — 섞으면 평균이 끌려갑니다.
      </p>
      <p className="dwhy">
        <b>기간 주의</b> — 아래 집계는 <b>{MARKET_PERIOD} 1년치</b>입니다.
        와이어프레임의 &lsquo;지난 1주·1달&rsquo;로 좁히려면 <b>월별 매각통계</b>가 있어야 합니다.
        아직 못 받았습니다.
      </p>

      <div className="dcompare">
        {([['seoul', seoul], ['hwagok', hwagok]] as const).map(([scope, t]) => (
          <section key={scope} className={`dcard dcompare-card ${scope === 'hwagok' ? 'is-subject' : 'is-ref'}`}>
            <h3>
              {SCOPE_LABEL[scope]}
              <span className="scope-tag">{scope === 'hwagok' ? '분석 대상' : '비교 기준'}</span>
            </h3>
            <div className="stat-row">
              <div><span className="k">개찰 대상</span><span className="v"><CountUp value={t.listed} format={(n) => Math.round(n).toLocaleString('ko-KR')} /><em>건</em></span></div>
              <div><span className="k">낙찰</span><span className="v"><CountUp value={t.sold} format={(n) => Math.round(n).toLocaleString('ko-KR')} /></span></div>
              <div><span className="k">유찰</span><span className="v"><CountUp value={t.failed} format={(n) => Math.round(n).toLocaleString('ko-KR')} /></span></div>
            </div>
            <div className="stat-row">
              <div><span className="k">낙찰률</span><span className="v"><CountUp value={t.soldRate} format={(n) => n.toFixed(2)} /><em>%</em></span>
                {scope === 'hwagok'
                  ? <Delta value={t.soldRate - seoul.soldRate} />
                  : <span className="d">낙찰 ÷ 개찰</span>}</div>
              <div><span className="k">낙찰가율</span><span className="v"><CountUp value={t.priceRate} format={(n) => n.toFixed(2)} /><em>%</em></span>
                {scope === 'hwagok'
                  ? <Delta value={t.priceRate - seoul.priceRate} />
                  : <span className="d">낙찰가 ÷ 감정가</span>}</div>
              <div><span className="k">평균 응찰</span><span className="v"><CountUp value={t.bidders} format={(n) => n.toFixed(2)} /><em>명</em></span>
                {scope === 'hwagok' && <Delta value={t.bidders - seoul.bidders} unit="명" />}</div>
            </div>
            <SplitBar sold={t.sold} failed={t.failed} />
          </section>
        ))}
      </div>

      <p className="concl">
        화곡동은 낙찰률이 <Delta value={hwagok.soldRate - seoul.soldRate} /> 높은데
        낙찰가율은 <Delta value={hwagok.priceRate - seoul.priceRate} /> 낮고 응찰자도 적습니다.
        <b> 경쟁이 세서 잘 팔리는 게 아니라, 값이 충분히 내려가서 팔립니다.</b>
      </p>

      <section className="dcard">
        <h3>용도별 낙찰 현황</h3>
        <p className="dsub">{MARKET_PERIOD} · 서울 전체 vs 강서구 화곡동</p>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>용도</th>
                <th className="num">서울 진행</th><th className="num">낙찰률</th><th className="num">낙찰가율</th>
                <th className="num">화곡동 진행</th><th className="num">낙찰률</th><th className="num">낙찰가율</th>
              </tr>
            </thead>
            <tbody>
              {HOUSING.map((u) => {
                const s = pick('seoul', u); const h = pick('hwagok', u)
                if (!s) return null
                return (
                  <tr key={u}>
                    <td><b>{u}</b></td>
                    <td className="num">{s.listed.toLocaleString('ko-KR')}</td>
                    <BarCell value={s.soldRate} max={maxSoldRate} />
                    <BarCell value={s.priceRate} max={maxPriceRate} />
                    <td className="num">{h ? h.listed.toLocaleString('ko-KR') : '-'}</td>
                    <BarCell value={h ? h.soldRate : null} max={maxSoldRate} />
                    <BarCell value={h ? h.priceRate : null} max={maxPriceRate} />
                  </tr>
                )
              })}
              <tr>
                <td className="dsub">아파트 (참고 · 대상 아님)</td>
                <td className="num dsub">{pick('seoul', '아파트')?.listed}</td>
                <td className="num dsub">{pick('seoul', '아파트')?.soldRate}%</td>
                <td className="num dsub">{pick('seoul', '아파트')?.priceRate}%</td>
                <td className="num dsub">{pick('hwagok', '아파트')?.listed}</td>
                <td className="num dsub">{pick('hwagok', '아파트')?.soldRate}%</td>
                <td className="num dsub">{pick('hwagok', '아파트')?.priceRate}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="dnote">
          서울 아파트는 낙찰가율이 <b>97.57%</b>입니다 — 거의 감정가 그대로 팔립니다.
          주택 4종(72~75%)과 20%p 이상 벌어집니다.
        </p>
      </section>

      <section className="dcard">
        <h3>올린 목록의 낙찰 물건</h3>
        {isEmpty ? <EmptyGuide what="여기에 이번 회차 물건이 나옵니다." /> : (
          <>
            <div className="dfilters">
              <label>
                <span>특수권리</span>
                <select value={right} onChange={(e) => setRight(e.target.value)}>
                  {rightOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
              <span className="dfilters-n">{listed.length}건</span>
            </div>
            <div className="scroll">
              <table className="dtable">
                <thead>
                  <tr><th>매각기일</th><th>용도</th><th>지역</th><th>특수권리</th>
                    <th className="num">감정가</th><th className="num">최저가</th><th className="num">낙찰가</th>
                    <th className="num">응찰</th><th className="num calc">회차</th><th className="num calc">낙찰가율</th></tr>
                </thead>
                <tbody>
                  {listed.slice(0, 25).map((r) => (
                    <tr key={`${r.caseNo}-${r.bidDate}`}>
                      <td className="dmono">{r.bidDate.slice(5)}</td>
                      <td>{r.usageName}</td><td>{r.district}</td>
                      <td className="dtags">{r.rights.slice(0, 2).map((t) => <span key={t}>{t}</span>)}</td>
                      <td className="num">{money(r.appraisalWon)}</td>
                      <td className="num">{money(r.minBidWon)}</td>
                      <td className="num">{money(r.winningWon)}</td>
                      <td className="num">{r.bidders || '-'}</td>
                      <td className="num calc">{r.roundNo ?? '-'}</td>
                      <td className="num calc">{r.rateVsAppraisal !== null ? `${r.rateVsAppraisal}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {listed.length > 25 && <p className="dnote">앞 25건 · 전체 {listed.length}건</p>}
          </>
        )}
      </section>
    </>
  )
}
