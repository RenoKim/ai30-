'use client'

import { useMemo, useState } from 'react'
import type { CategoryRow } from '@/lib/types'
import {
  SCHEDULES, customSpec, buildSchedule, classifyRatio, isBelowFloor, evidenceTone, clampStartPct,
  DEFAULT_START_PCT, MIN_START_PCT, MAX_START_PCT,
  type ScheduleId, type Schedule,
} from '@/lib/rounds'
import { Term } from './Term'

/**
 * 스크리너 — 이 사이트의 본체.
 *
 * 사용자가 자기 물건 숫자를 넣으면, 우리가 찾아낸 발견 1·4를 그 물건에 적용해
 * "이 물건은 몇 번 유찰된 셈이고, 같은 용도/지역 평균 대비 어디쯤인가"를 판정한다.
 *
 * 판정 근거는 전부 화면에 노출한다. 블랙박스로 만들지 않는다.
 */

const won = (n: number) => n.toLocaleString('ko-KR')

function parseWon(s: string): number | null {
  const n = Number(s.replace(/[^0-9]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

type Verdict = 'shallow' | 'typical' | 'deep'

/**
 * 기준선은 용도 축과 지역 축을 단순 평균한 값이다.
 * 두 축이 크게 어긋나면 그 평균은 아무것도 대표하지 않는다.
 * 이 검산은 통과를 보여주는 장식이 아니라 실제로 실패한다.
 */
const AXIS_AGREE_PP = 10

/** 평균보다 깊게 유찰됐을 때 공고문에서 실제로 확인할 것들 */
const DEEP_CHECKS = [
  ['세입자 보증금을 떠안는 물건인가',
   '낙찰자가 보증금을 대신 물어줘야 하는 세입자가 있으면, 그만큼 싸야 손해가 아닙니다'],
  ['물건 전체가 아니라 지분만 파는 건 아닌가',
   '지분만 사면 마음대로 쓰거나 팔기 어렵습니다. 그래서 값이 따로 놉니다'],
  ['다른 사람의 권리가 붙어 있지 않은가',
   '유치권·법정지상권 같은 것이 신고돼 있으면 사람을 내보내거나 쓰는 데 제약이 생깁니다'],
] as const

export function Screener({
  usage, region,
}: { usage: CategoryRow[]; region: CategoryRow[] }) {
  const [appraisal, setAppraisal] = useState('1,499,000,000')
  const [minBid, setMinBid] = useState('1,095,100,000')
  const [usageName, setUsageName] = useState(usage[0]?.usage_name ?? '')
  const [regionName, setRegionName] = useState(region[0]?.region_name ?? '')
  const [sched, setSched] = useState<ScheduleId>('camco')
  const [customStep, setCustomStep] = useState(10)
  const [startPct, setStartPct] = useState(String(DEFAULT_START_PCT))

  const schedule: Schedule = useMemo(
    () => buildSchedule(
      sched === 'custom' ? customSpec(customStep) : SCHEDULES[sched],
      Number(startPct),
    ),
    [sched, customStep, startPct],
  )

  const result = useMemo(() => {
    const a = parseWon(appraisal)
    const m = parseWon(minBid)
    if (!a || !m) return null

    const depth = (m / a) * 100
    // 법정 하한(국세징수법 제87조 · 50%) 아래는 회차로 환산하지 않는다.
    const verdictRound = classifyRatio(depth, schedule)
    const u = usage.find((r) => r.usage_name === usageName)
    const g = region.find((r) => r.region_name === regionName)

    // 기준선: 같은 용도·지역의 최근 3년 평균 유찰 깊이
    const marks = [u?.min_to_appraisal_pct, g?.min_to_appraisal_pct].filter(
      (v): v is number => typeof v === 'number',
    )
    const bench = marks.length ? marks.reduce((s, v) => s + v, 0) / marks.length : null

    let verdict: Verdict = 'typical'
    if (bench !== null) {
      if (depth > bench + 5) verdict = 'shallow'
      else if (depth < bench - 5) verdict = 'deep'
    }

    const axisGap = marks.length === 2 ? Math.abs(marks[0] - marks[1]) : null
    const axesAgree = axisGap === null ? null : axisGap <= AXIS_AGREE_PP

    return { a, m, depth, verdictRound, u, g, bench, verdict, axisGap, axesAgree }
  }, [appraisal, minBid, usageName, regionName, usage, region, schedule])

  /** 1회차 시작가를 원으로 환산 — % 만 보면 감이 안 온다 */
  const startWon = useMemo(() => {
    const a = parseWon(appraisal)
    return a ? Math.round((a * schedule.startPct) / 100) : null
  }, [appraisal, schedule.startPct])

  const VERDICT = {
    shallow: {
      label: '아직 덜 떨어졌습니다',
      tone: 'warn',
      why: '비슷한 물건들보다 값이 덜 깎인 상태입니다. 더 기다리면 최저가가 내려갈 수 있습니다.',
    },
    typical: {
      label: '보통 수준입니다',
      tone: 'ok',
      why: '비슷한 물건들의 최근 3년 평균과 비슷하게 깎였습니다.',
    },
    deep: {
      label: '평균보다 많이 떨어졌습니다',
      tone: 'crit',
      why: '비슷한 물건들보다 더 많이 깎였습니다. 싸서 좋은 게 아니라 안 팔린 이유가 따로 있을 수 있습니다. 공고문에서 아래를 확인하세요.',
    },
  } as const

  return (
    <div className="scr">
      {/* ── 입력 ─────────────────────────────── */}
      <div className="scr-in">
        <h3>내 물건 넣어보기</h3>
        <p className="scr-hint">
          공고문에 적힌 <Term>감정가</Term>와 이번 회차 <Term>최저입찰가</Term>,
          이 두 숫자만 있으면 됩니다.
        </p>

        <label className="fld">
          <span>감정가</span>
          <input
            inputMode="numeric" value={appraisal}
            onChange={(e) => setAppraisal(e.target.value)}
            onBlur={() => { const v = parseWon(appraisal); if (v) setAppraisal(won(v)) }}
          />
          <em>원</em>
        </label>

        <label className="fld">
          <span>최저입찰가</span>
          <input
            inputMode="numeric" value={minBid}
            onChange={(e) => setMinBid(e.target.value)}
            onBlur={() => { const v = parseWon(minBid); if (v) setMinBid(won(v)) }}
          />
          <em>원</em>
        </label>

        <label className="fld">
          <span>용도</span>
          <select value={usageName} onChange={(e) => setUsageName(e.target.value)}>
            {usage.map((r) => <option key={r.usage_name}>{r.usage_name}</option>)}
          </select>
        </label>

        <label className="fld">
          <span>지역</span>
          <select value={regionName} onChange={(e) => setRegionName(e.target.value)}>
            {region.map((r) => <option key={r.region_name}>{r.region_name}</option>)}
          </select>
        </label>

        <details className="adv">
          <summary>
            값 깎는 방식 바꾸기{' '}
            <em className={evidenceTone(schedule.evidence)}>{schedule.evidence}</em>
          </summary>
          <p className="adv-why">
            안 팔려서 <Term>유찰</Term>되면 다음 회차에 값을 깎습니다.
            <b> 얼마나 깎는지는 제도마다 다릅니다.</b>{' '}
            우리 데이터(<Term>캠코 공매</Term>)는 법이 정해 뒀습니다 —
            감정가의 10%씩 깎되 <b>50%까지만</b>입니다.
            물건이 어디서 나온 것인지에 맞춰 골라 주세요.
          </p>
          {(['camco', 'court_seoul', 'court', 'trust'] as const).map((id) => (
            <label key={id} className={`opt sm ${sched === id ? 'on' : ''}`}>
              <input type="radio" name="scr-sched" checked={sched === id}
                onChange={() => setSched(id)} />
              <span className="opt-body">
                <span className="opt-top">
                  <b>{SCHEDULES[id].label}</b>
                  <em className={evidenceTone(SCHEDULES[id].evidence)}>
                    {SCHEDULES[id].evidence}
                  </em>
                </span>
                <span className="opt-detail">{SCHEDULES[id].detail}</span>
              </span>
            </label>
          ))}
          <label className={`opt sm ${sched === 'custom' ? 'on' : ''}`}>
            <input type="radio" name="scr-sched" checked={sched === 'custom'}
              onChange={() => setSched('custom')} />
            <span className="opt-body">
              <span className="opt-top"><b>직접 입력</b></span>
              <span className="opt-detail">
                회차당{' '}
                <input type="number" min={1} max={50} value={customStep} className="num-in"
                  aria-label="회차당 차감 비율"
                  onChange={(e) => {
                    setCustomStep(Math.min(50, Math.max(1, Number(e.target.value) || 1)))
                    setSched('custom')
                  }} />
                %씩
              </span>
            </span>
          </label>

          {/* 시작 비율 — 100% 로 고정하면 회차가 실제보다 적게 나온다 */}
          <div className="start-box">
            <p className="adv-why">
              <b>맨 처음 회차의 최저가가 감정가의 몇 %였는지</b>도 물건마다 다릅니다.
              보통 100%지만 그보다 높게 시작하는 물건도 있습니다.
              100%로 두면 실제보다 회차가 적게 나옵니다.
              공고문의 진행 내역에서 1회차 최저가를 찾아 넣어 주세요.
            </p>
            <span className="fld-inline">
              <span>맨 처음 최저가 = 감정가의</span>
              <input type="number" min={MIN_START_PCT} max={MAX_START_PCT} step={0.1}
                className="num-in" value={startPct}
                aria-label="1회차 최저가의 감정가 대비 비율"
                onChange={(e) => setStartPct(e.target.value)}
                onBlur={() => setStartPct(String(clampStartPct(Number(startPct))))} />
              <em>%</em>
            </span>
            {startWon !== null && (
              <p className="adv-hint">≈ {won(startWon)}원</p>
            )}
            {schedule.observedStartPct !== undefined
              && schedule.observedStartPct !== schedule.startPct && (
              <button type="button" className="hint-btn"
                onClick={() => setStartPct(String(schedule.observedStartPct))}>
                실제 사례에서는 {schedule.observedStartPct}%였습니다 — 이 값으로 넣어보기
              </button>
            )}
          </div>

          <p className="note-evidence">{schedule.evidenceNote}</p>
        </details>
      </div>

      {/* ── 판정 ─────────────────────────────── */}
      <div className="scr-out">
        {!result ? (
          <div className="scr-empty">왼쪽에 감정가와 최저입찰가를 숫자로 넣어 주세요.</div>
        ) : (
          <>
            <div className={`verdict v-${VERDICT[result.verdict].tone}`}>
              <span className="v-k">결과</span>
              <strong>{VERDICT[result.verdict].label}</strong>
              <span className="v-why">{VERDICT[result.verdict].why}</span>
              {result.verdict === 'deep' && (
                <ul className="v-checks">
                  {DEEP_CHECKS.map(([title, why]) => (
                    <li key={title}><b>{title}</b><span>{why}</span></li>
                  ))}
                </ul>
              )}
            </div>

            <div className="scr-nums">
              <div>
                <span className="k">지금 감정가의 몇 %인가</span>
                <span className="v">{result.depth.toFixed(1)}<em>%</em></span>
                <span className="d">최저입찰가 ÷ 감정가 · 낮을수록 많이 깎인 것</span>
              </div>
              <div className={isBelowFloor(result.verdictRound) ? 'below-floor' : undefined}>
                <span className="k">
                  {isBelowFloor(result.verdictRound)
                    ? result.verdictRound.label
                    : <>몇 번 유찰된 셈인가</>}
                </span>
                <span className="v">
                  {result.verdictRound.kind === 'round'
                    ? <>{result.verdictRound.round.toFixed(1)}<em>회</em></>
                    : isBelowFloor(result.verdictRound)
                      ? <>&lt;{result.verdictRound.floorPct}<em>%</em></>
                      : <>-</>}
                </span>
                <span className="d">
                  {isBelowFloor(result.verdictRound)
                    ? `법이 ${result.verdictRound.floorRound}회차(감정가의 ${result.verdictRound.floorPct}%)까지만 깎게 합니다 — 그 아래는 다시 감정받은 물건입니다`
                    : `${schedule.label} 기준 · 맨 처음 최저가를 감정가의 ${schedule.startPct}%로 놓고 계산`}
                </span>
              </div>
              <div>
                <span className="k">비슷한 물건들은 보통</span>
                <span className="v">
                  {result.bench !== null ? result.bench.toFixed(1) : '-'}<em>%</em>
                </span>
                <span className="d">최근 3년 · 같은 용도와 같은 지역의 평균</span>
              </div>
            </div>

            {/* 근거 — 블랙박스로 두지 않는다 */}
            <div className="scr-basis">
              <h4>어떤 숫자로 그렇게 판단했나</h4>
              <table>
                <tbody>
                  <tr>
                    <th>{usageName}</th>
                    <td className="num">보통 감정가의 {result.u?.min_to_appraisal_pct?.toFixed(1) ?? '-'}%까지 내려감</td>
                    <td className="num">감정가의 {result.u?.rate_vs_appraisal?.toFixed(1) ?? '-'}%에 팔림</td>
                    <td className="num">1건당 {result.u?.competition ?? '-'}명 응찰</td>
                  </tr>
                  <tr>
                    <th>{regionName}</th>
                    <td className="num">보통 감정가의 {result.g?.min_to_appraisal_pct?.toFixed(1) ?? '-'}%까지 내려감</td>
                    <td className="num">감정가의 {result.g?.rate_vs_appraisal?.toFixed(1) ?? '-'}%에 팔림</td>
                    <td className="num">1건당 {result.g?.competition ?? '-'}명 응찰</td>
                  </tr>
                </tbody>
              </table>
              {result.bench !== null && result.axisGap !== null && (
                <div className={`recon ${result.axesAgree ? 'r-ok' : 'r-warn'}`}>
                  <span className="recon-badge">
                    {result.axesAgree ? '용도와 지역이 같은 이야기' : '용도와 지역이 다른 이야기'}
                  </span>
                  <span className="recon-eq">
                    비교 기준 {result.bench.toFixed(1)}% = ({usageName} {result.u?.min_to_appraisal_pct?.toFixed(1)}
                    {' + '}{regionName} {result.g?.min_to_appraisal_pct?.toFixed(1)}) ÷ 2
                    <b> · 둘 사이 차이 {result.axisGap.toFixed(1)}%p</b>
                  </span>
                  <span className="recon-why">
                    {result.axesAgree
                      ? `두 숫자가 ${AXIS_AGREE_PP}%p 안에서 같은 방향을 가리킵니다. 참고용으로 쓸 만합니다.`
                      : `용도로 보면 이렇고 지역으로 보면 저렇습니다. 둘을 평균한 ${result.bench.toFixed(1)}%는 어느 쪽도 대표하지 못하니, 위 결과를 그대로 믿지 마세요.`}
                  </span>
                </div>
              )}
              <p className="scr-caveat">
                용도별 통계와 지역별 통계는 <b>따로 만들어진 것</b>이라, “서울에 있는 근린생활시설”이라는 값은
                애초에 존재하지 않습니다. 위 기준은 두 숫자를 그냥 평균한 <b>참고선</b>일 뿐입니다.
                학습용이며 실제 입찰가를 정하는 근거로 쓸 수 없습니다.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
