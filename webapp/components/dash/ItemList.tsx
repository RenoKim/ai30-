'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useUploads } from '@/lib/ggauction/store'
import type { CaseRow } from '@/lib/ggauction/types'
import { Sec, Read } from './ui'

const won = (n: number) => n.toLocaleString('ko-KR')
const 억 = 100_000_000
const money = (n: number) => (n <= 0 ? '—' : n >= 억 ? `${(n / 억).toFixed(1)}억` : `${Math.round(n / 10_000).toLocaleString('ko-KR')}만`)

const ALL = '전체'

/** 목록 앞에 두는 안내 — 업로드가 없으면 화면을 비우지 않고 길을 알려준다 */
export function EmptyGuide({ what }: { what: string }) {
  return (
    <p className="dlede">
      아직 올린 목록이 없습니다. <Link href="/dash">목록 업로드</Link>에서 지지옥션
      매각기일 목록 PDF 를 먼저 올리면 {what}
    </p>
  )
}

export function ItemList() {
  const { rows, isEmpty, loading } = useUploads()
  const [district, setDistrict] = useState(ALL)
  const [usage, setUsage] = useState(ALL)
  const [round, setRound] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [picked, setPicked] = useState<CaseRow | null>(null)

  const options = useMemo(() => ({
    districts: [ALL, ...new Set(rows.map((r) => r.district).filter(Boolean) as string[])].sort(),
    usages: [ALL, ...new Set(rows.map((r) => r.usageName).filter(Boolean) as string[])].sort(),
    rounds: [ALL, ...[...new Set(rows.map((r) => r.roundNo).filter((v): v is number => v !== null))].sort((a, b) => a - b).map(String)],
    statuses: [ALL, ...new Set(rows.map((r) => r.status))],
  }), [rows])

  const shown = useMemo(() => rows.filter((r) =>
    (district === ALL || r.district === district)
    && (usage === ALL || r.usageName === usage)
    && (round === ALL || String(r.roundNo) === round)
    && (status === ALL || r.status === status),
  ).sort((a, b) => b.bidDate.localeCompare(a.bidDate)), [rows, district, usage, round, status])

  if (loading) return <p className="dnote">불러오는 중…</p>

  return (
    <>
      <div className="dhead">
        <p className="dcrumb">목록 / 물건 목록</p>
        <h1>물건 목록</h1>
        {isEmpty
          ? <EmptyGuide what="여기에 물건이 하나씩 나옵니다." />
          : <p className="dlede">읽어온 값과 계산한 값을 함께 봅니다. <b>회색 칸이 우리가 계산해 만든 값</b>입니다.</p>}
      </div>
      {!isEmpty && (
        <>
          <Sec n="01" title="물건" sub={`${shown.length}건 / 전체 ${rows.length}건`}>
            <div className="dfilters">
              {([['지역', district, setDistrict, options.districts],
                 ['용도', usage, setUsage, options.usages],
                 ['회차', round, setRound, options.rounds],
                 ['상태', status, setStatus, options.statuses]] as const).map(([label, val, set, opts]) => (
                <label key={label}>
                  <span>{label}</span>
                  <select value={val} onChange={(e) => set(e.target.value)}>
                    {opts.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="scroll">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>매각기일</th><th>용도</th><th>지역</th><th>특수권리</th>
                    <th className="num">건물㎡</th>
                    <th className="num">감정가</th><th className="num">최저가</th><th className="num">낙찰가</th>
                    <th className="num">응찰</th><th>상태</th>
                    <th className="num calc">회차</th><th className="num calc">낙찰가율</th>
                    <th className="num calc">프리미엄</th><th className="num calc">평당가</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, 120).map((r) => (
                    <tr key={`${r.caseNo}-${r.bidDate}`} className={picked?.caseNo === r.caseNo ? 'now' : undefined}
                        onClick={() => setPicked(r)}>
                      <td className="dmono">{r.bidDate.slice(5)}</td>
                      <td>{r.usageName ?? '-'}</td>
                      <td>{r.district ?? '-'}</td>
                      <td className="dtags">{r.rights.slice(0, 2).map((t) => <span key={t}>{t}</span>)}
                        {r.rights.length > 2 && <span>+{r.rights.length - 2}</span>}</td>
                      <td className="num">{r.bldgM2 ?? '-'}</td>
                      <td className="num">{money(r.appraisalWon)}</td>
                      <td className="num">{money(r.minBidWon)}</td>
                      <td className="num">{money(r.winningWon)}</td>
                      <td className="num">{r.bidders || '-'}</td>
                      <td><span className={`badge ${r.status === '매각' ? 'is-sold' : ''}`}>{r.status}</span></td>
                      <td className="num calc">{r.roundNo ?? '제외'}</td>
                      <td className="num calc">{r.rateVsAppraisal !== null ? `${r.rateVsAppraisal}%` : '-'}</td>
                      <td className="num calc">{r.rateVsMinBid !== null ? `${r.rateVsMinBid}%` : '-'}</td>
                      <td className="num calc">{r.pyeongPriceApprox ? Math.round(r.pyeongPriceApprox / 10_000).toLocaleString('ko-KR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shown.length > 120 && <p className="dnote">앞 120건만 보여줍니다 · 조건에 맞는 건 {shown.length}건</p>}
            {!picked && <p className="dnote">행을 누르면 아래에 그 물건이 펼쳐집니다.</p>}
          </Sec>

          {picked && (
            <Sec n="02" title={<>{picked.caseNo}</>} sub={`${picked.usageName} · ${picked.district}`}>
              <div className="scroll">
                <table>
                  <tbody>
                    <tr><th>매각기일 · 법원</th><td>{picked.bidDate} · {picked.court}</td></tr>
                    <tr><th>감정가 → 최저가 → 낙찰가</th>
                      <td className="num" style={{ textAlign: 'left' }}>{won(picked.appraisalWon)} → {won(picked.minBidWon)} → {picked.winningWon ? won(picked.winningWon) : '—'}</td></tr>
                    <tr><th>면적</th><td>건물 {picked.bldgM2 ?? '-'}㎡ · 토지 {picked.landM2 ?? '-'}㎡</td></tr>
                    <tr><th>특수권리</th><td>{picked.rights.length ? picked.rights.join(' · ') : '없음'}</td></tr>
                    <tr className="calc"><th>계산값</th>
                      <td>{picked.roundNo ?? '-'}회차 · 감정가의 {picked.minToAppraisalPct}%까지 내려옴
                        {picked.rateVsAppraisal !== null && <> · 감정가 대비 {picked.rateVsAppraisal}% 에 낙찰</>}</td></tr>
                  </tbody>
                </table>
              </div>
              <Read>
                <Link href={`/dash/bid?case=${encodeURIComponent(picked.caseNo)}`}>이 물건으로 입찰가 검토하기 →</Link>
                {' · '}
                <Link href={`/dash/case`}>사건번호로 다시 보기 →</Link>
              </Read>
            </Sec>
          )}
        </>
      )}
    </>
  )
}
