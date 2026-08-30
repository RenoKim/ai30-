'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUploads } from '@/lib/ggauction/store'
import { FLAG_SPECS } from '@/lib/ggauction/parse'
import type { RowFlag } from '@/lib/ggauction/types'
import { Sec, Read, Row, Cell } from './ui'

const won = (n: number) => n.toLocaleString('ko-KR')

export function CleanReport() {
  const { rows, isEmpty, loading } = useUploads()
  const [only, setOnly] = useState<RowFlag | null>(null)

  if (loading) return <p className="dnote">불러오는 중…</p>
  if (isEmpty) {
    return (
      <>
        <div className="dhead">
        <p className="dcrumb">목록 / 정제 리포트</p>
        <h1>정제 리포트</h1>
        <p className="dlede">
          아직 올린 목록이 없습니다. <Link href="/dash">목록 업로드</Link>에서 PDF 를 먼저 올려 주세요.
        </p>
        </div>
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
      <div className="dhead">
        <p className="dcrumb">목록 / 정제 리포트</p>
        <h1>정제 리포트</h1>
        <p className="dlede">
          자동으로 처리하지 않고 남겨 둔 행입니다. 통계에서 빼거나, 확인한 뒤 살릴 수 있습니다.
        </p>
      </div>

      <Sec n="01" title="확인 필요" sub={`전체 ${rows.length}건`}>
        <Row>
          <Cell keyed label="확인 필요" value={flagged.length} unit="건"
            note={<>전체 {rows.length}건의 {((flagged.length / rows.length) * 100).toFixed(1)}%</>} />
          {counts.filter((c) => c.n > 0).slice(0, 3).map((c) => (
            <Cell key={c.key} label={c.label} value={c.n} unit="건" note={c.action} />
          ))}
        </Row>
        <Read title="왜 남기는가">
          이 행들을 그대로 평균에 넣으면 낙찰가율과 유찰 회차가 함께 흔들립니다. 건수와 사유를 먼저 보고 정하는 편이 안전합니다.
        </Read>
      </Sec>

      <Sec n="02" title="사유별 처리 기준" sub="지금은 아래 기본값대로 처리합니다">
        <div className="scroll">
          <table>
            <thead>
              <tr><th>사유</th><th>어떻게 생기나</th><th>기본 처리</th><th className="num">건수</th><th /></tr>
            </thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.key} className={only === c.key ? 'now' : undefined}>
                  <td><b>{c.label}</b></td>
                  <td className="dim">{c.how}</td>
                  <td className="dim">{c.action}</td>
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
      </Sec>

      <Sec n="03" title={<>확인 필요 행{only && <> · {FLAG_SPECS.find((s) => s.key === only)?.label}만</>}</>} sub="회색 칸이 계산값">
        {shown.length === 0 ? (
          <p className="dnote">해당하는 행이 없습니다.</p>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>사건번호</th><th>용도</th><th>소재지</th>
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
                    <td>{r.dong ? `${r.district} ${r.dong} ${r.jibun}` : (r.district ?? '-')}</td>
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
      </Sec>
    </>
  )
}
