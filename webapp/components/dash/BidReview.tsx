'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUploads } from '@/lib/ggauction/store'
import { DEALS } from '@/lib/ggauction/marketData'
import { DECAY } from '@/lib/ggauction/parse'
import { EmptyGuide } from './ItemList'
import type { CaseRow } from '@/lib/ggauction/types'
import { Sec, Callout, Read, Row, Cell } from './ui'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const PYEONG = 3.3058

/** 정렬된 배열에서 p 분위 (0~1) */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i), hi = Math.ceil(i)
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

export function BidReview() {
  const { rows, isEmpty } = useUploads()
  const params = useSearchParams()
  const fromQuery = params.get('case')
  const [caseNo, setCaseNo] = useState<string | null>(null)

  const picked: CaseRow | null = useMemo(() => {
    const want = caseNo ?? fromQuery
    return rows.find((r) => r.caseNo === want) ?? rows[0] ?? null
  }, [rows, caseNo, fromQuery])

  /** 같은 용도 · 같은 회차에서 실제로 얼마에 팔렸나 */
  const peers = useMemo(() => {
    if (!picked) return []
    return rows.filter((r) =>
      r.usageName === picked.usageName
      && r.roundNo === picked.roundNo
      && r.rateVsMinBid !== null)
  }, [rows, picked])

  const ratios = useMemo(
    () => peers.map((p) => p.rateVsMinBid as number).sort((a, b) => a - b),
    [peers],
  )

  if (isEmpty) {
    return (
      <>
        <div className="dhead">
          <p className="dcrumb">목록 / 입찰가 검토</p>
          <h1>입찰가 검토</h1>
          <EmptyGuide what="고른 물건과 비슷한 조건의 낙찰가 분포를 보여 드립니다." />
        </div>
      </>
    )
  }
  if (!picked) return <p className="dnote">물건을 찾지 못했습니다.</p>

  const q25 = quantile(ratios, 0.25)
  const q50 = quantile(ratios, 0.5)
  const q75 = quantile(ratios, 0.75)
  const nextMinBid = picked.minBidWon * DECAY
  const deal = DEALS.find((d) => picked.usageName && d.usage.includes(picked.usageName.replace(/\(.*\)/, '')))
  const myPyeong = picked.pyeongPriceApprox

  const bands = [
    ['하위 25%', q25, '낮음'],
    ['중위', q50, '보통'],
    ['상위 25%', q75, '높음'],
  ] as const

  return (
    <>
      <div className="dhead">
        <p className="dcrumb">목록 / 입찰가 검토</p>
        <h1>입찰가 검토</h1>
        <p className="dlede">
          고른 물건과 <b>비슷한 조건에서 실제로 얼마에 낙찰됐는지</b> 보고 입찰가를 정합니다.
        </p>
      </div>

      <Sec n="01" title="고른 물건" sub={`${picked.usageName} · ${picked.district}`}>
        <div className="dfilters">
          <label>
            <span>사건</span>
            <select value={picked.caseNo} onChange={(e) => setCaseNo(e.target.value)}>
              {rows.map((r) => (
                <option key={`${r.caseNo}-${r.bidDate}`} value={r.caseNo}>
                  {r.caseNo} · {r.usageName} · {r.district}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Row>
          <Cell keyed label="최저가" value={won(picked.minBidWon)} unit="원" note={<>감정가 대비 {picked.minToAppraisalPct}%</>} />
          <Cell label="감정가" value={won(picked.appraisalWon)} unit="원" note={picked.rights.length ? picked.rights.join(' · ') : '특수권리 없음'} />
          <Cell label="회차" value={picked.roundNo ?? '-'} unit="회차" note={<>{(picked.roundNo ?? 1) - 1}회 유찰 · 최저가 ÷ 감정가로 되짚은 값</>} />
          <Cell label="평당가 (감정가 기준)" value={myPyeong ? Math.round(myPyeong / 10_000).toLocaleString('ko-KR') : '—'} unit={myPyeong ? '만원' : undefined}
            note={myPyeong ? '건물+대지권 합이라 근사치' : '면적이 없어 계산 못 함'} />
        </Row>
      </Sec>

      <Sec n="02" title="비슷한 물건의 낙찰가 분포" sub={<>{picked.usageName} · {picked.roundNo}회차 · <b>{peers.length}건</b> · 낙찰가 ÷ 최저가</>}>
        {ratios.length < 3 ? (
          <Read tone="warn">
            같은 조건이 <b>{ratios.length}건</b>뿐입니다. 분포라고 부를 수 없습니다. 목록을 더 올리면 표본이 늘어납니다.
          </Read>
        ) : (
          <>
            <div className="chart">
              <div className="ddist">
                {ratios.map((r, i) => {
                  const lo = ratios[0], hi = ratios[ratios.length - 1]
                  const left = hi === lo ? 50 : ((r - lo) / (hi - lo)) * 100
                  return <span key={i} style={{ left: `${left}%` }} title={`${r}%`} />
                })}
                <b style={{ left: `${((q50 - ratios[0]) / (ratios[ratios.length - 1] - ratios[0] || 1)) * 100}%` }}>
                  중위 {q50.toFixed(1)}%
                </b>
              </div>
            </div>
            <Read>
              가장 낮게 {ratios[0]}% · 가장 높게 {ratios[ratios.length - 1]}%.
              <b> 하한이 100%인 것은 최저가 밑으로는 낙찰될 수 없기 때문</b>입니다.
            </Read>
          </>
        )}
      </Sec>

      <Sec n="03" title="입찰가 구간" sub={`최저가 ${won(picked.minBidWon)}원에 적용`}>
        <Callout title={<>한 번 더 유찰되면 최저가가 {won(picked.minBidWon - nextMinBid)}원 내려갑니다</>}>
          이번 회차에 쓸 금액과 비교해 보세요.
        </Callout>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>기준</th><th className="num">최저가 대비</th><th className="num">입찰가</th>
                <th className="num">감정가 대비</th><th>낙찰 가능성</th></tr>
            </thead>
            <tbody>
              {bands.map(([label, ratio, chance]) => (
                <tr key={label} className={label === '중위' ? 'now' : undefined}>
                  <td><b>{label}</b></td>
                  <td className="num">{ratio.toFixed(1)}%</td>
                  <td className="num"><b>{won((picked.minBidWon * ratio) / 100)}원</b></td>
                  <td className="num">{`${(((picked.minBidWon * ratio) / 100 / picked.appraisalWon) * 100).toFixed(1)}%`}</td>
                  <td>{chance}</td>
                </tr>
              ))}
              <tr className="calc">
                <td><b>다음 회차 최저가</b></td>
                <td className="num">{(DECAY * 100).toFixed(0)}%</td>
                <td className="num">{won(nextMinBid)}원</td>
                <td className="num">{((nextMinBid / picked.appraisalWon) * 100).toFixed(1)}%</td>
                <td>유찰 시</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Sec>

      <Sec n="04" title="같이 볼 값 · 실거래" sub="경매가 아니라 일반 매매">
        {deal && myPyeong ? (
          <>
            <Row>
              <Cell label="이 물건 평당가 (감정가)" value={Math.round(myPyeong / 10_000).toLocaleString('ko-KR')} unit="만원" />
              <Cell label="인근 실거래 중위 평당가" value={deal.medPyeong.toLocaleString('ko-KR')} unit="만원" note={<>{deal.usage} · {deal.count}건</>} />
              <Cell keyed label="감정가 ÷ 실거래" value={((myPyeong / 10_000 / deal.medPyeong) * 100).toFixed(0)} unit="%"
                note={myPyeong / 10_000 > deal.medPyeong ? '감정가가 실거래보다 높다' : '감정가가 실거래보다 낮다'} />
            </Row>
            <Read>
              <b>낙찰가율이 낮아 보여도 실거래 대비로는 다르게 읽힐 수 있습니다.</b> (감정가는 건물+대지권 합이라 평당가는 근사치입니다.)
            </Read>
          </>
        ) : (
          <Read tone="warn">
            이 용도의 실거래 자료가 없습니다. 지금 가진 실거래 통계는 업무/상업시설과 오피스텔(주거용)뿐이라
            <b> 연립/다세대가 빠져 있습니다</b> — 통계 재출력을 요청해 둔 상태입니다.
          </Read>
        )}
      </Sec>
    </>
  )
}
