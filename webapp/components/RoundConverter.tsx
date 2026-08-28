'use client'

import { useMemo, useState } from 'react'
import type { TrendRow } from '@/lib/types'
import {
  SCHEDULES, customSpec, buildSchedule, classifyRatio, describeVerdict,
  isBelowFloor, evidenceTone, floorRoundOf,
  DEFAULT_START_PCT, type ScheduleId, type Schedule,
} from '@/lib/rounds'
import { Term } from './Term'

/**
 * E5 — 감정가 이탈도 환산기
 *
 * 2026-08-26 전면 수정. 이전 구현은 2025년 39.2%를 '12.0회차'로 표시했다.
 * 국세징수법 제87조상 압류재산 1차 공매 사이클은 6회차(감정가의 50%)에서 끝나므로
 * 나올 수 없는 값이었다. 하한 아래는 회차를 말하지 않고 '재공매 구간'으로 표기한다.
 *
 * 선택기는 이제 "우리가 모른다"가 아니라 "제도가 다른 시장을 비교한다"는 용도다.
 */
export function RoundConverter({ trend }: { trend: TrendRow[] }) {
  const [picked, setPicked] = useState<ScheduleId>('camco')
  const [customStep, setCustomStep] = useState(10)

  // 여기는 연도별 집계라 물건별 1회차 시작 비율을 알 수 없다 — 100% 로 둔다.
  // 개별 물건의 시작 비율은 공고문을 들고 있는 스크리너에서 받는다.
  const schedule: Schedule = useMemo(
    () => buildSchedule(
      picked === 'custom' ? customSpec(customStep) : SCHEDULES[picked],
      DEFAULT_START_PCT,
    ),
    [picked, customStep],
  )

  const rows = useMemo(
    () =>
      trend.map((t) => ({
        year: t.year,
        ratio: t.min_to_appraisal_pct,
        verdict: classifyRatio(t.min_to_appraisal_pct, schedule),
      })),
    [trend, schedule],
  )

  const floorPct = schedule.floorPct
  const floorRound = floorRoundOf(schedule)
  const breachCount = rows.filter((r) => isBelowFloor(r.verdict)).length
  const maxRound = Math.max(
    ...rows.map((r) => (r.verdict.kind === 'round' ? r.verdict.round : 0)),
    floorRound,
  )
  const latest = rows[rows.length - 1]

  return (
    <div className="conv">
      <div className="conv-controls">
        <div className="ctrl-head">
          <h3>값을 얼마나 깎는가</h3>
          <p className="ctrl-why">
            안 팔려서 <Term>유찰</Term>되면 다음 회차에 값을 깎습니다. <b>얼마나 깎는지는 제도마다 다릅니다.</b>{' '}
            캠코 <Term>압류재산</Term>은 법이 정해 뒀습니다 — 감정가의 10%씩 깎되{' '}
            <b>50%까지만</b>이고, 그래도 안 팔리면 감정을 새로 받아 처음부터 다시 팝니다.
          </p>
        </div>

        <div className="opts" role="radiogroup" aria-label="저감 방식">
          {(['camco', 'court_seoul', 'court', 'trust'] as const).map((id) => {
            const s = SCHEDULES[id]
            return (
              <label key={id} className={`opt ${picked === id ? 'on' : ''}`}>
                <input
                  type="radio" name="sched" value={id}
                  checked={picked === id}
                  onChange={() => setPicked(id)}
                />
                <span className="opt-body">
                  <span className="opt-top">
                    <b>{s.label}</b>
                    <em className={evidenceTone(s.evidence)}>{s.evidence}</em>
                  </span>
                  <span className="opt-detail">{s.detail}</span>
                </span>
              </label>
            )
          })}

          <label className={`opt ${picked === 'custom' ? 'on' : ''}`}>
            <input
              type="radio" name="sched" value="custom"
              checked={picked === 'custom'}
              onChange={() => setPicked('custom')}
            />
            <span className="opt-body">
              <span className="opt-top"><b>직접 입력</b></span>
              <span className="opt-detail">
                유찰될 때마다 감정가의{' '}
                <input
                  type="number" min={1} max={50} value={customStep}
                  onChange={(e) => {
                    setCustomStep(Math.min(50, Math.max(1, Number(e.target.value) || 1)))
                    setPicked('custom')
                  }}
                  className="num-in" aria-label="회차당 차감 비율"
                />
                %씩 깎기
              </span>
            </span>
          </label>
        </div>

        <p className="note-evidence">{schedule.evidenceNote}</p>
      </div>

      <div className="conv-result">
        <div className="conv-lead">
          <span className="conv-year">{latest?.year}년</span>
          <strong className={latest && isBelowFloor(latest.verdict) ? 'below-floor' : undefined}>
            {latest ? describeVerdict(latest.verdict) : '-'}
          </strong>
          <span className="conv-sub">
            최저입찰가가 <Term>감정가</Term>의 {latest?.ratio?.toFixed(1)}%까지 내려온 상태입니다
          </span>
        </div>

        {floorPct !== undefined && breachCount > 0 && (
          <p className="floor-callout">
            13년 중 <b>{breachCount}개 연도</b>가 법이 정한 선(감정가의 {floorPct}% · {floorRound}회차)보다 아래입니다.
            (바로 위 숫자는 같은 해를 <b>용도별</b>로 센 것이라 값이 다릅니다.)
            이건 유찰이 더 된 게 아니라 <b>감정을 새로 받고 다시 시작한 물건이 섞였다</b>는 뜻입니다.
            기준 가격 자체가 바뀌었기 때문에 같은 자로 잴 수 없습니다.
          </p>
        )}

        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>연도</th>
                <th className="num">최저가가 감정가의</th>
                <th>몇 번 유찰된 셈인가</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const below = isBelowFloor(r.verdict)
                const w = r.verdict.kind === 'round' ? (r.verdict.round / maxRound) * 100 : 100
                return (
                  <tr key={r.year} className={below ? 'below-floor' : undefined}>
                    <td className="num">{r.year}</td>
                    <td className="num">{r.ratio?.toFixed(1)}%</td>
                    <td>
                      <span className="bar-row">
                        <span
                          className={`bar ${below ? 'bar-breach' : ''}`}
                          style={{ width: `${w}%` }}
                          aria-hidden
                        />
                        <span className="bar-v">
                          {r.verdict.kind === 'round'
                            ? `${r.verdict.round.toFixed(1)}회차쯤`
                            : r.verdict.kind === 'belowFloor'
                              ? r.verdict.label
                              : '환산 불가'}
                        </span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {floorPct !== undefined && (
          <p className="floor-legend">
            <span className="swatch swatch-breach" aria-hidden /> 법이 정한 선(감정가의 {floorPct}%)보다 아래 ·
            회차로 읽으면 안 되는 구간
          </p>
        )}
      </div>
    </div>
  )
}
