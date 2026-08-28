'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { useUploads } from '@/lib/ggauction/store'
import { parseListing, DECAY } from '@/lib/ggauction/parse'
import type { ParseResult } from '@/lib/ggauction/types'

/** 화면에 보여주는 처리 단계. 어디까지 갔는지 알 수 있어야 한다 */
const STEPS = ['파일 읽기', '표 인식', '항목 매핑', '파생값 계산', '대시보드 반영'] as const

/** 회차 환산표 — 624건(2022년 524 + 2026년 100) 전수로 확인한 값 */
const LADDER = Array.from({ length: 6 }, (_, i) => ({
  round: i + 1,
  failed: i,
  pct: Math.round(100 * DECAY ** i * 10) / 10,
}))

const READ_FIELDS = ['매각기일', '용도', '주소', '특수권리', '건물면적', '토지면적',
  '감정가', '최저가', '낙찰가', '응찰자 수', '매각상태']

const DERIVED = [
  ['유찰 회차', '최저가 ÷ 감정가 → 저감률 20% 역산'],
  ['낙찰가율', '낙찰가 ÷ 감정가'],
  ['입찰 프리미엄', '낙찰가 ÷ 최저가'],
  ['평당가', '감정가 ÷ 건물면적 × 3.3058 — 대지권이 섞여 있어 근사치'],
] as const

export function Upload() {
  const { files, rows, add, removeFile, clear } = useUploads()
  const [step, setStep] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (list: FileList | null) => {
    if (!list || list.length === 0) return
    setBusy(true); setError(null)
    try {
      const { pdfToLayoutText } = await import('@/lib/ggauction/pdfText')
      for (const file of Array.from(list)) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          throw new Error(`${file.name} — PDF 파일만 올릴 수 있습니다`)
        }
        setStep(0)
        const buf = await file.arrayBuffer()
        setStep(1)
        const text = await pdfToLayoutText(buf)
        // 통계 report 처럼 그림으로 만든 PDF 는 글자가 아예 없다. 형식 문제와 구분해서 알려준다.
        if (text.replace(/\s/g, '').length < 200) {
          throw new Error(`${file.name} — 글자가 없는 PDF 입니다(그림으로 만든 문서). `
            + '지지옥션 매각기일 목록은 검색결과에서 [인쇄]로 저장한 PDF 라 글자가 들어 있습니다. '
            + '경매통계 종합 report 는 그림이라 여기서 못 읽습니다.')
        }
        setStep(2)
        const result: ParseResult = parseListing(text, file.name)
        if (result.total === 0) {
          throw new Error(`${file.name} — 글자는 읽었는데 물건을 하나도 못 찾았습니다. `
            + '매각기일 목록이 아닌 다른 문서일 수 있습니다. 아래 「어떤 파일을 올리나」를 확인해 주세요.')
        }
        setStep(3)
        add(result)
        setStep(4)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStep(-1)
    } finally {
      setBusy(false)
    }
  }, [add])

  return (
    <>
      <p className="dcrumb">데이터 / 목록 업로드</p>
      <h1>목록 업로드</h1>
      <p className="dlede">
        지지옥션 <b>매각기일 목록 PDF</b> 를 올리면 표를 읽어 대시보드에 반영합니다.
        <b> 파일은 이 브라우저 안에서만 처리되고 서버로 보내지 않습니다.</b>
      </p>

      <ol className="dsteps">
        {STEPS.map((s, i) => (
          <li key={s} className={i <= step ? 'on' : undefined}>
            <span className="dsteps-n">{i + 1}</span>{s}
          </li>
        ))}
      </ol>

      <div
        className={`ddrop${dragging ? ' is-over' : ''}${busy ? ' is-busy' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files) }}
      >
        <b>{busy ? '읽는 중…' : '여기에 PDF 를 끌어다 놓으세요'}</b>
        <span>여러 개를 한 번에 올릴 수 있습니다</span>
        <button type="button" className="dlink" onClick={() => inputRef.current?.click()} disabled={busy}>
          또는 파일 선택
        </button>
        <input
          ref={inputRef} type="file" accept="application/pdf" multiple hidden
          onChange={(e) => { void handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {error && (
        <p className="derr" role="alert">
          <b>읽지 못했습니다</b> {error}
        </p>
      )}

      <details className="dhelp">
        <summary>어떤 파일을 올리나 — 처음이면 여기부터</summary>
        <div className="dhelp-in">
          <p>
            <b>지지옥션 검색결과 목록을 인쇄해 저장한 PDF</b> 입니다.
            파일 이름은 보통 이렇게 생겼습니다.
          </p>
          <p className="dmono dhelp-eg">20260801-20260807 서울시강서구낙찰물건정보(간략).pdf</p>

          <h4>어디서 만드나</h4>
          <ol className="dhelp-steps">
            <li>지지옥션에서 <b>지역 · 용도 · 기간</b>으로 검색합니다</li>
            <li>결과 목록에서 <b>[인쇄]</b> 를 누릅니다 (<span className="dmono">print_search_list.asp</span>)</li>
            <li>인쇄 창에서 <b>PDF 로 저장</b> 합니다</li>
          </ol>

          <h4>맞는 파일인지 알아보는 법</h4>
          <p>표 머리글에 이 항목들이 있으면 맞습니다.</p>
          <p className="dmono dhelp-eg">사진 · 매각기일 · 물건기본내역 · 감정가 · 상태 (유찰회수) · 최저가 · 조회수</p>

          <h4>이건 여기 올리면 안 됩니다</h4>
          <ul className="dhelp-no">
            <li><b>경매통계 종합 report PDF</b> — 그림으로 만든 문서라 글자가 없습니다.
              이 자료는 이미 대시보드에 심어 두었습니다(추이 · 실거래 화면)</li>
            <li><b>지역별 경매매각통계 xlsx</b> — 엑셀이고, 역시 심어 두었습니다(브리핑 화면)</li>
          </ul>
          <p className="dnote">
            <b>여기 올리는 건 &lsquo;개별 물건 목록&rsquo; 하나뿐</b>입니다. 집계 자료는 미리 심어 둡니다.
          </p>
        </div>
      </details>

      <div className="dgrid2">
        <section className="dcard">
          <h3>읽어온 결과</h3>
          {files.length === 0 ? (
            <p className="dnote">아직 올린 파일이 없습니다.</p>
          ) : (
            <>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>파일</th><th>기간</th>
                      <th className="num">전체</th><th className="num">정상 인식</th><th className="num">확인 필요</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.fileName}>
                        <td className="dfile">{f.fileName}</td>
                        <td>{f.from} ~ {f.to}</td>
                        <td className="num">{f.total}</td>
                        <td className="num">{f.clean}</td>
                        <td className={`num${f.needsCheck ? ' warn' : ''}`}>{f.needsCheck}</td>
                        <td><button type="button" className="dlink sm" onClick={() => removeFile(f.fileName)}>빼기</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="dnote">
                확인 필요한 행은 <Link href="/dash/clean">정제 리포트</Link>에서 사유별로 봅니다.
                {files.some((f) => !f.hasFailedRows) && (
                  <> ⚠️ <b>유찰 건이 없는 파일이 있습니다.</b> 그 파일만으로는 낙찰률(매각÷개찰)을 계산할 수 없습니다.</>
                )}
              </p>
              {files.reduce((a, f) => a + f.total, 0) > rows.length && (
                <p className="dnote">
                  파일 사이에 겹치는 물건이 <b>{files.reduce((a, f) => a + f.total, 0) - rows.length}건</b> 있어
                  한 번만 셉니다 (사건번호 + 매각기일이 같으면 같은 물건).
                </p>
              )}
              <button type="button" className="dlink sm" onClick={clear}>전부 비우기</button>
            </>
          )}
        </section>

        <section className="dcard">
          <h3>목록에서 바로 읽는 항목</h3>
          <p className="dsub">PDF 표에 그대로 있는 값</p>
          <ul className="dchips">{READ_FIELDS.map((f) => <li key={f}>{f}</li>)}</ul>

          <h3 className="mt">여기서 계산해 만드는 값</h3>
          <p className="dsub">올린 직후 자동 계산 · 원자료와 섞지 않습니다</p>
          <div className="scroll">
            <table>
              <tbody>
                {DERIVED.map(([k, v]) => (
                  <tr key={k}><th>{k}</th><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="dcard">
        <h3>유찰 회차 환산표</h3>
        <p className="dsub">
          서울 관할 법원은 유찰될 때마다 <b>직전 최저가의 80%</b>로 내려갑니다.
          624건(2022년 524 · 2026년 100)에서 <b>예외 0건</b>으로 확인한 값입니다.
        </p>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>회차</th>{LADDER.map((l) => <th key={l.round} className="num">{l.round}</th>)}</tr>
            </thead>
            <tbody>
              <tr><th>유찰 횟수</th>{LADDER.map((l) => <td key={l.round} className="num">{l.failed}</td>)}</tr>
              <tr><th>최저가 ÷ 감정가</th>{LADDER.map((l) => <td key={l.round} className="num">{l.pct}%</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="dnote">
          계단 사이의 값은 <b>재감정 · 특별매각조건 · 저감률 예외</b>로 봅니다. 정제 리포트에서 따로 셉니다.
        </p>
      </section>
    </>
  )
}
