'use client'

import { useMemo, useRef, useState } from 'react'
import type { TrendRow } from '@/lib/types'

/**
 * 히어로 도표 — 이 사이트의 주장 한 장.
 *
 * 같은 낙찰가를 두 기준으로 재면 한쪽은 평탄하고 한쪽은 무너진다.
 * 변한 것이 낙찰가가 아니라 감정가라는 말을 글로 하기 전에 눈으로 보여준다.
 *
 * 색은 계열 식별용 2색(검증 통과: CVD deutan ΔE 13.7 / normal 27.1)이며
 * 판정 배지에 쓰는 상태색(ok·warn·crit)과 겹치지 않는다.
 */

const W = 680
const H = 250
const PAD = { top: 18, right: 96, bottom: 26, left: 40 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

interface Series {
  key: 'minbid' | 'appraisal'
  label: string
  color: string
  value: (r: TrendRow) => number
}

const SERIES: readonly Series[] = [
  { key: 'minbid', label: '최저입찰가로 나눴을 때', color: 'var(--s1)', value: (r) => r.rate_vs_minbid },
  { key: 'appraisal', label: '감정가로 나눴을 때', color: 'var(--s2)', value: (r) => r.rate_vs_appraisal },
]

export function TrendLines({ trend }: { trend: TrendRow[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const geo = useMemo(() => {
    const rows = [...trend].sort((a, b) => a.year - b.year)
    const values = rows.flatMap((r) => [r.rate_vs_minbid, r.rate_vs_appraisal])
    const lo = Math.floor((Math.min(...values) - 6) / 5) * 5
    const hi = Math.ceil((Math.max(...values) + 6) / 5) * 5

    const x = (i: number) => PAD.left + (rows.length < 2 ? 0 : (i / (rows.length - 1)) * PLOT_W)
    const y = (v: number) => PAD.top + PLOT_H - ((v - lo) / (hi - lo)) * PLOT_H

    return {
      rows, lo, hi, x, y,
      paths: SERIES.map((s) => ({
        ...s,
        d: rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.value(r)).toFixed(1)}`).join(' '),
        last: { x: x(rows.length - 1), y: y(s.value(rows[rows.length - 1])) },
      })),
    }
  }, [trend])

  const { rows, x, y, paths } = geo
  const active = hover === null ? null : rows[hover]

  /** 포인터 x → 가장 가까운 연도. scroll 리스너 없이 SVG 좌표만 쓴다. */
  const track = (clientX: number) => {
    const box = wrapRef.current?.getBoundingClientRect()
    if (!box || rows.length < 2) return
    const ratio = ((clientX - box.left) / box.width) * W
    const i = Math.round(((ratio - PAD.left) / PLOT_W) * (rows.length - 1))
    setHover(Math.min(rows.length - 1, Math.max(0, i)))
  }

  return (
    <figure className="trend">
      <figcaption className="trend-legend">
        {SERIES.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
        ))}
      </figcaption>

      <div className="trend-plot" ref={wrapRef}
        onPointerMove={(e) => track(e.clientX)}
        onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label="2013년부터 2025년까지 최저입찰가 기준 낙찰가율은 평탄하고 감정가 기준 낙찰가율은 하락한다">
          {/* 100% 기준선 — 낙찰가가 최저입찰가와 같아지는 지점 */}
          <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={y(100)} y2={y(100)}
            className="trend-base" vectorEffect="non-scaling-stroke" />
          <text x={PAD.left - 7} y={y(100) + 3.5} className="trend-tick">100%</text>

          {active && (
            <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={PAD.top + PLOT_H}
              className="trend-cross" vectorEffect="non-scaling-stroke" />
          )}

          {paths.map((p) => (
            <g key={p.key}>
              <path d={p.d} fill="none" stroke={p.color} strokeWidth={2}
                strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <text x={p.last.x + 10} y={p.last.y + 4} className="trend-endlabel">
                {p.value(rows[rows.length - 1]).toFixed(0)}%
              </text>
              {active && (
                <circle cx={x(hover!)} cy={y(p.value(active))} r={4.5}
                  fill={p.color} className="trend-knob" />
              )}
            </g>
          ))}

          <text x={PAD.left} y={H - 8} className="trend-tick trend-tick-x">{rows[0]?.year}</text>
          <text x={PAD.left + PLOT_W} y={H - 8} className="trend-tick trend-tick-x" textAnchor="end">
            {rows[rows.length - 1]?.year}
          </text>
        </svg>

        {active && (
          <div className="trend-tip" style={{ left: `${(x(hover!) / W) * 100}%` }}>
            <b>{active.year}</b>
            {SERIES.map((s) => (
              <span key={s.key}>
                <i style={{ background: s.color }} aria-hidden />
                {s.value(active).toFixed(1)}%
              </span>
            ))}
          </div>
        )}
      </div>
    </figure>
  )
}
