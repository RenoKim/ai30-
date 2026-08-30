'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUploads } from '@/lib/ggauction/store'
import { FLAG_SPECS } from '@/lib/ggauction/parse'
import type { RowFlag } from '@/lib/ggauction/types'

const won = (n: number) => n.toLocaleString('ko-KR')

export function CleanReport() {
  const { rows, isEmpty, loading } = useUploads()
  const [only, setOnly] = useState<RowFlag | null>(null)

  if (loading) return <p className="dnote">불러오는 중…</p>
  if (isEmpty) {
    return (
      <>
        <p className="dcrumb">목록 / 정제 리포트</p>
        <h1>정제 리포트</h1>
        <p className="dlede">
          아직 올린 목록이 없습니다. <Link href="/dash">목록 업로드</Link>에서 PDF 를 먼저 올려 주세요.
        </p>
      </>
    )
  }

  const flagged = rows.filter((r) => r.flags.length > 0)
  const counts = FLAG_SPECS.map((s) => ({
    ...s,
    n: rows.filter((r) => r.flags.includes(s.key)).length,
  }))
  const shown = only ? flagged.filter((r) => r.flags.includes(only)) : flagged

  return (
    <>
      <p className="dcrumb">목록 / 정제 리포트</p>
      <h1>정제 리포트</h1>
      <p className="dlede">
        자동으로 처리하지 않고 남겨 둔 행입니다. 통계에서 빼거나, 확인한 뒤 살릴 수 있습니다.
      </p>
      <p className="dwhy">
        <b>왜 남기는가</b> — 이 행들을 그대로 평균에 넣으면 낙찰가율과 유찰 회차가 함께 흔들립니다.
        건수와 사유를 먼저 보고 정하는 편이 안전합니다.
      </p>

      <div className="stat-row">
        <div>
          <span className="k">확인 필요</span>
          <span className={`v${flagged.length ? ' alarm' : ''}`}>{flagged.length}<em>건</em></span>
          <span className="d">전체 {rows.length}건의 {((flagged.length / rows.length) * 100).toFixed(1)}%</span>
        </div>
        {counts.filter((c) => c.n > 0).slice(0, 3).map((c) => (
          <div key={c.key}>
            <span className="k">{c.label}</span>
            <span className="v">{c.n}<em>건</em></span>
            <span className="d">{c.action}</span>
          </div>
        ))}
      </div>

      <section className="dcard">
        <h3>사유별 처리 기준</h3>
        <p className="dsub">지금은 아래 기본값대로 처리합니다</p>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>사유</th><th>어떻게 생기나</th><th>기본 처리</th><th className="num">건수</th><th /></tr>
            </thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.key} className={only === c.key ? 'on' : undefined}>
                  <td><b>{c.label}</b></td>
                  <td className="dsub">{c.how}</td>
                  <td className="dsub">{c.action}</td>
                  <td className={`num${c.n ? ' warn' : ''}`}>{c.n}</td>
                  <td>
                    {c.n > 0 && (
                      <button type="button" className="dlink sm"
                        onClick={() => setOnly(only === c.key ? null : c.key)}>
                        {only === c.key ? '전체 보기' : '이것만'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dcard">
        <h3>확인 필요 행 {only && <span className="dsub">· {FLAG_SPECS.find((s) => s.key === only)?.label}만</span>}</h3>
        <p className="dsub">읽은 값과 계산값을 나란히 보여줍니다. 회색이 계산값입니다</p>
        {shown.length === 0 ? (
          <p className="dnote">해당하는 행이 없습니다.</p>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>사건번호</th><th>용도</th><th>지역</th>
                  <th className="num">감정가</th><th className="num">최저가</th>
                  <th className="num calc">비율</th><th className="num calc">회차</th>
                  <th>사유</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 60).map((r) => (
                  <tr key={`${r.caseNo}-${r.bidDate}`}>
                    <td className="dmono">{r.caseNo}</td>
                    <td>{r.usageName ?? '-'}</td>
                    <td>{r.district ?? '-'}</td>
                    <td className="num">{won(r.appraisalWon)}</td>
                    <td className="num">{won(r.minBidWon)}</td>
                    <td className="num calc">{r.minToAppraisalPct !== null ? `${r.minToAppraisalPct}%` : '-'}</td>
                    <td className="num calc">{r.roundNo ?? '제외'}</td>
                    <td>
                      {r.flags.map((f) => (
                        <span key={f} className="dflag">{FLAG_SPECS.find((s) => s.key === f)?.label ?? f}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {shown.length > 60 && <p className="dnote">앞 60건만 보여줍니다 · 전체 {shown.length}건</p>}
      </section>
    </>
  )
}
