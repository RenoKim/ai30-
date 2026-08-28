'use client'

import { useMemo } from 'react'
import { useUploads } from '@/lib/ggauction/store'
import { MARKET_PERIOD, MONTHLY, MONTHLY_USAGE, DEALS, HOUSING, pick } from '@/lib/ggauction/marketData'
import { DualLine } from './DualLine'

export function Trend() {
  const { rows, isEmpty } = useUploads()

  /** 올린 목록에서 회차별로 몇 건이 낙찰됐나 — 유찰 깊이 이야기의 실물 */
  const byRound = useMemo(() => {
    const map = new Map<number, { n: number; rate: number[] }>()
    for (const r of rows) {
      if (r.roundNo === null) continue
      const cur = map.get(r.roundNo) ?? { n: 0, rate: [] }
      cur.n += 1
      if (r.rateVsAppraisal !== null) cur.rate.push(r.rateVsAppraisal)
      map.set(r.roundNo, cur)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
      .map(([round, v]) => ({
        round, n: v.n,
        rate: v.rate.length ? v.rate.reduce((a, b) => a + b, 0) / v.rate.length : null,
      }))
  }, [rows])

  const labels = MONTHLY.map((m) => `${m.month.slice(2, 4)}.${m.month.slice(4)}`)

  return (
    <>
      <p className="dcrumb">시장 보기 / 시장지표 추이</p>
      <h1>시장지표 추이</h1>
      <p className="dlede">
        낙찰가율이 내려갈 때 <b>실제로 유찰이 깊어진 것인지</b>를 같은 화면에서 봅니다.
        두 선이 함께 움직이면 유찰이 깊어진 결과이고, 따로 움직이면 다른 요인을 봐야 합니다.
      </p>

      <section className="dcard">
        <h3>월별 추이 · 낙찰가율과 낙찰률</h3>
        <p className="dwarn">
          ⚠️ <b>이 그래프만 용도가 다릅니다.</b> 지금 가진 월별 자료는 <b>{MONTHLY_USAGE}</b> 기준입니다
          (기준 물건이 일반상업이라 그렇게 뽑혔습니다). <b>주택 4종 월별 자료를 받으면 갈아끼웁니다.</b>{' '}
          아래 용도별 비교부터는 전부 주택 4종입니다.
        </p>
        <DualLine
          labels={labels}
          left={{ key: 'price', label: '낙찰가율', unit: '%', color: 'var(--s1)', values: MONTHLY.map((m) => m.priceRate) }}
          right={{ key: 'sold', label: '낙찰률', unit: '%', color: 'var(--s2)', values: MONTHLY.map((m) => m.soldRate) }}
        />
        <p className="dnote">
          12개월 동안 낙찰가율은 <b>37.1~87.3%</b>, 낙찰률은 <b>4.6~38.2%</b> 사이에서 움직였습니다.
          한쪽만 보면 시장이 좋아졌는지 나빠졌는지 알 수 없습니다.
        </p>
      </section>

      <section className="dcard">
        <h3>용도별 비교 · 서울 전체 vs 강서구 화곡동</h3>
        <p className="dsub">{MARKET_PERIOD} · 주택 4종</p>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>용도</th><th className="num">낙찰률</th><th className="num">낙찰가율</th><th className="num">평균 응찰</th>
                <th className="num">낙찰률</th><th className="num">낙찰가율</th><th className="num">평균 응찰</th></tr>
            </thead>
            <tbody>
              <tr className="dsub"><td /><td className="num" colSpan={3}>서울 전체</td><td className="num" colSpan={3}>화곡동</td></tr>
              {HOUSING.map((u) => {
                const s = pick('seoul', u); const h = pick('hwagok', u)
                if (!s || !h) return null
                return (
                  <tr key={u}>
                    <td><b>{u}</b></td>
                    <td className="num">{s.soldRate}%</td><td className="num">{s.priceRate}%</td><td className="num">{s.bidders}</td>
                    <td className="num">{h.soldRate}%</td>
                    <td className={`num${h.priceRate < s.priceRate ? ' warn' : ''}`}>{h.priceRate}%</td>
                    <td className="num">{h.bidders}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="concl">
          연립/다세대는 화곡동이 <b>더 잘 팔리는데(26.49% vs 24.22%) 더 싸게 팔립니다(70.00% vs 75.20%)</b>.
          응찰자는 오히려 적습니다. <b>값이 충분히 내려가야 팔리는 구조</b>입니다.
        </p>
      </section>

      <section className="dcard">
        <h3>올린 목록의 회차별 낙찰</h3>
        {isEmpty ? (
          <p className="dnote">목록을 올리면 회차별로 몇 건이 어떤 값에 팔렸는지 나옵니다.</p>
        ) : (
          <>
            <p className="dsub">위 이야기가 개별 물건에서 실제로 어떻게 보이는지</p>
            <div className="scroll">
              <table>
                <thead>
                  <tr><th>회차</th><th className="num">감정가의</th><th className="num">낙찰 건수</th>
                    <th className="num">평균 낙찰가율</th><th>분포</th></tr>
                </thead>
                <tbody>
                  {byRound.map((b) => (
                    <tr key={b.round}>
                      <td><b>{b.round}회차</b></td>
                      <td className="num">{(100 * 0.8 ** (b.round - 1)).toFixed(1)}%</td>
                      <td className="num">{b.n}</td>
                      <td className="num">{b.rate !== null ? `${b.rate.toFixed(1)}%` : '-'}</td>
                      <td><span className="bar-row">
                        <span className="bar" style={{ width: `${(b.n / Math.max(...byRound.map((r) => r.n))) * 100}%` }} aria-hidden />
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="dnote">
              올린 목록에는 <b>매각된 물건만</b> 들어 있습니다. 따라서 이 표는
              &lsquo;그 회차에 나온 물건 수&rsquo;가 아니라 <b>&lsquo;그 회차에서 팔린 물건 수&rsquo;</b>입니다.
            </p>
          </>
        )}
      </section>

      <section className="dcard">
        <h3>실거래 평당가 · 같이 볼 값</h3>
        <p className="dsub">{MARKET_PERIOD} · 강서구 · 경매가 아니라 일반 매매입니다</p>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>용도</th><th className="num">평균 평당가</th><th className="num">중위 평당가</th>
                <th className="num">거래량</th><th className="num">전년 대비</th></tr>
            </thead>
            <tbody>
              {DEALS.map((d) => (
                <tr key={d.usage} className={d.usage.includes('오피스텔') ? undefined : 'dsub'}>
                  <td>{d.usage}{d.usage.includes('오피스텔') ? '' : ' (대상 아님)'}</td>
                  <td className="num">{d.avgPyeong.toLocaleString('ko-KR')}만원</td>
                  <td className="num">{d.medPyeong.toLocaleString('ko-KR')}만원</td>
                  <td className="num">{d.count.toLocaleString('ko-KR')}건</td>
                  <td className={`num${d.yoy < 0 ? ' warn' : ''}`}>{d.yoy > 0 ? '+' : ''}{d.yoy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dnote">
          실거래 자료도 <b>연립/다세대가 빠져 있습니다</b> — 통계 재출력을 요청해 둔 상태입니다.
          지금은 오피스텔(주거용)만 대상과 겹칩니다.
        </p>
      </section>
    </>
  )
}
