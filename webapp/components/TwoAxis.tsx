'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CategoryRow } from '@/lib/types'
import { placeLabels, type LabelInput } from '@/lib/labelPlacement'

/**
 * E2 · E3 — 이 과제의 핵심 시각화
 *
 * X: 감정가 대비 낙찰가율   Y: 유찰 깊이(최저÷감정)
 * 아파트와 대지는 X가 붙어 있고 Y가 멀리 떨어진다.
 * 낙찰가율 하나로 물건을 비교하면 안 된다는 것이 이 그림의 요지.
 *
 * 좁은 구간에 점이 뭉치면 라벨이 겹쳐 뭉개지므로, 라벨은 빈 자리를 찾아 옮기고
 * 자리가 없으면 감춘다. 감춘 이름은 점이나 표를 눌러 고정하면 나온다.
 */

/** 컨테이너 실측 — 라벨 겹침 판정은 % 가 아니라 px 로 해야 맞는다 */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, size }
}

export function TwoAxis({
  usage, region,
}: { usage: CategoryRow[]; region: CategoryRow[] }) {
  const [axis, setAxis] = useState<'usage' | 'region'>('usage')
  const [pinned, setPinned] = useState<string | null>(null)
  const { ref: plotRef, size } = useElementSize<HTMLDivElement>()
  const viewRef = useRef<HTMLDivElement>(null)

  const rows = axis === 'usage' ? usage : region
  const nameOf = (r: CategoryRow) => r.usage_name ?? r.region_name ?? ''

  const { pts, spreadX, spreadY } = useMemo(() => {
    const xs = rows.map((r) => r.rate_vs_appraisal)
    const ys = rows.map((r) => r.min_to_appraisal_pct)
    const pad = 6
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad
    const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad
    return {
      pts: rows.map((r) => ({
        name: nameOf(r),
        x: ((r.rate_vs_appraisal - x0) / (x1 - x0)) * 100,
        y: 100 - ((r.min_to_appraisal_pct - y0) / (y1 - y0)) * 100,
        rx: r.rate_vs_appraisal, ry: r.min_to_appraisal_pct,
        comp: r.competition,
      })),
      spreadX: Math.max(...xs) - Math.min(...xs),
      spreadY: Math.max(...ys) - Math.min(...ys),
    }
  }, [rows])

  const labels = useMemo(() => {
    const inputs: LabelInput[] = pts.map((p) => ({ id: p.name, xPct: p.x, yPct: p.y, text: p.name }))
    const placed = placeLabels(inputs, size.width, size.height)
    return new Map(placed.map((l) => [l.id, l]))
  }, [pts, size.width, size.height])

  const hiddenCount = useMemo(
    () => [...labels.values()].filter((l) => l.hidden).length, [labels])

  const toggle = (name: string) => setPinned((cur) => (cur === name ? null : name))
  const switchAxis = (next: 'usage' | 'region') => { setAxis(next); setPinned(null) }

  /**
   * 표는 길고 도표는 위에 있다. 아래쪽 행을 누르면 도표가 화면 밖이라
   * 무엇이 고정됐는지 볼 수 없었다.
   *
   * 넓은 화면은 CSS sticky 가 도표를 붙잡지만, sticky 는 컨테이너 바닥에서
   * 자연히 풀리므로 마지막 행 근처에서는 그것만으로 모자란다.
   * 그래서 탭까지 포함한 래퍼가 아니라 '도표 자체'가 75% 미만으로 보이면 끌어온다.
   */
  const REVEAL_THRESHOLD = 0.75

  const revealPlot = () => {
    const plot = plotRef.current
    const target = viewRef.current ?? plot
    if (!plot || !target) return
    const r = plot.getBoundingClientRect()
    const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
    if (r.height > 0 && shown / r.height >= REVEAL_THRESHOLD) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'nearest' })
  }

  const pickFromTable = (name: string) => { toggle(name); revealPlot() }

  return (
    <div className="ta">
      <div className="ta-view" ref={viewRef}>
      <div className="ta-head">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={axis === 'usage'}
            className={axis === 'usage' ? 'on' : ''} onClick={() => switchAxis('usage')}>
            용도 <span className="cnt">{usage.length}</span>
          </button>
          <button role="tab" aria-selected={axis === 'region'}
            className={axis === 'region' ? 'on' : ''} onClick={() => switchAxis('region')}>
            지역 <span className="cnt">{region.length}</span>
          </button>
        </div>
        <div className="ta-spread">
          <span>가로로 벌어진 폭 <b>{spreadX.toFixed(1)}%p</b></span>
          <span>세로로 벌어진 폭 <b>{spreadY.toFixed(1)}%p</b></span>
        </div>
      </div>

      <div className="plot">
        <span className="ax-y">
          <span>위로 갈수록 값이 덜 깎임</span>
        </span>
        <span className="ax-x">오른쪽으로 갈수록 감정가에 가깝게 팔림</span>
        <div className="plot-in" ref={plotRef}>
          {pts.map((p) => {
            const lab = labels.get(p.name)
            const on = pinned === p.name
            return (
              <button key={p.name} type="button"
                className={`pt${on ? ' sel' : ''}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                aria-pressed={on}
                onClick={() => toggle(p.name)}
                title={`${p.name} · 감정가의 ${p.rx.toFixed(1)}%에 팔림 · 최저가는 감정가의 ${p.ry.toFixed(1)}%`}>
                <span className="dot" />
                <span className={`lbl${lab?.hidden ? ' off' : ''}`}
                  style={{ left: `calc(50% + ${lab?.dx ?? 0}px)`, top: `calc(50% + ${lab?.dy ?? 0}px)` }}>
                  {p.name}
                </span>
                <span className="tip">
                  {p.name}<br />감정가의 {p.rx.toFixed(1)}%에 팔림<br />최저가는 감정가의 {p.ry.toFixed(1)}%<br />1건당 {p.comp}명 응찰
                </span>
              </button>
            )
          })}
        </div>
      </div>

      </div>

      <p className="note">
        <b>가로</b>는 감정가에 견줘 얼마에 팔렸는지, <b>세로</b>는 팔리기까지 값이 얼마나 깎였는지입니다.
        오른쪽 위로 갈수록 &lsquo;제값 받고 빨리 팔린 물건&rsquo;입니다.
        점이나 아래 표의 이름을 누르면 그 항목에 표시가 남습니다.
        {hiddenCount > 0 && ` 자리가 겹쳐 이름 ${hiddenCount}개는 도표에서 감췄고, 아래 표에 겹침으로 표시했습니다.`}
      </p>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>{axis === 'usage' ? '용도' : '지역'}</th>
              <th className="num">얼마에 팔렸나</th>
              <th className="num">얼마나 깎였나</th>
              <th className="num">1건당 응찰</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].sort((a, b) => b.rate_vs_appraisal - a.rate_vs_appraisal).map((r) => {
              const name = nameOf(r)
              return (
                <tr key={name} className={pinned === name ? 'row-sel' : ''}>
                  <td>
                    <button type="button" className="row-pick"
                      aria-pressed={pinned === name} onClick={() => pickFromTable(name)}>
                      {name}
                      {labels.get(name)?.hidden && (
                        <em className="row-hidden"
                          title="도표에서 다른 이름과 자리가 겹쳐 이름을 감춘 항목입니다. 누르면 표시됩니다.">
                          겹침
                        </em>
                      )}
                    </button>
                  </td>
                  <td className="num">{r.rate_vs_appraisal.toFixed(1)}%</td>
                  <td className="num">{r.min_to_appraisal_pct.toFixed(1)}%</td>
                  <td className="num">{r.competition}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
