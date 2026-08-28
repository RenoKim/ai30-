'use client'

import { useState } from 'react'

/**
 * 두 지표를 한 그림에 겹쳐 그린다. 축이 다르므로 좌·우로 나눈다.
 *
 * 겹쳐 그리는 이유가 이 화면의 전부다 — 한쪽만 보면 값이 내려간 이유를 알 수 없다.
 * 색은 검증된 계열색 두 개(--s1 · --s2)만 쓴다.
 */
export interface Series {
  key: string
  label: string
  unit: string
  color: string
  values: (number | null)[]
}

const W = 720
const H = 240
const PAD = { top: 16, right: 52, bottom: 26, left: 46 }

function scale(values: (number | null)[]) {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length === 0) return { min: 0, max: 1 }
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const pad = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1
  // 값이 전부 0 이상이면 축도 0 아래로 내리지 않는다 — 퍼센트 축에 음수가 뜨면 이상하다
  const lo = min >= 0 ? Math.max(0, min - pad) : min - pad
  return { min: lo, max: max + pad }
}

export function DualLine({ labels, left, right }: { labels: string[]; left: Series; right: Series }) {
  // 어느 시점을 짚고 있는가. null 이면 안 짚은 상태다.
  const [active, setActive] = useState<number | null>(null)
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (labels.length <= 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW)

  const path = (s: Series) => {
    const { min, max } = scale(s.values)
    const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min || 1)) * innerH
    let d = ''
    let started = false
    s.values.forEach((v, i) => {
      if (v === null) { started = false; return }
      d += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `
      started = true
    })
    return { d: d.trim(), min, max, y }
  }
  const L = path(left)
  const R = path(right)

  return (
    <figure className="dchart" onMouseLeave={() => setActive(null)}>
      <figcaption className="dchart-key">
        {[left, right].map((s) => (
          <span key={s.key}><i style={{ background: s.color }} aria-hidden />{s.label} <em>({s.unit})</em></span>
        ))}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`${left.label}과 ${right.label}을 같은 기간에 겹쳐 그린 선그래프`}>
        {[0, 0.5, 1].map((t) => {
          const yy = PAD.top + innerH * t
          return <line key={t} x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} className="dchart-grid" />
        })}
        {[[L, left, 'left'], [R, right, 'right']].map(([p, s, side]) => {
          const pp = p as ReturnType<typeof path>
          const ss = s as Series
          return [1, 0].map((t) => {
            const v = pp.min + (pp.max - pp.min) * t
            return (
              <text key={`${side}-${t}`} className="dchart-ax"
                x={side === 'left' ? PAD.left - 6 : W - PAD.right + 6}
                y={PAD.top + innerH * (1 - t) + 4}
                textAnchor={side === 'left' ? 'end' : 'start'}
                fill={ss.color}>{v.toFixed(0)}</text>
            )
          })
        })}
        <path d={L.d} className="dchart-line" style={{ stroke: left.color }} />
        <path d={R.d} className="dchart-line" style={{ stroke: right.color }} />
        {left.values.map((v, i) => v === null ? null : (
          <circle key={`l${i}`} cx={x(i)} cy={L.y(v)} r="2.5" style={{ fill: left.color }} />
        ))}
        {right.values.map((v, i) => v === null ? null : (
          <circle key={`r${i}`} cx={x(i)} cy={R.y(v)} r="2.5" style={{ fill: right.color }} />
        ))}
        {labels.map((lb, i) => (
          (i % Math.ceil(labels.length / 6) === 0 || i === labels.length - 1) && (
            <text key={lb} className="dchart-ax" x={x(i)} y={H - 8} textAnchor="middle">{lb}</text>
          )
        ))}

        {/* 짚은 시점 표시 — 세로 가이드선과 강조점 */}
        {active !== null && (
          <g className="dchart-focus">
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} className="dchart-guide" />
            {([[L, left], [R, right]] as const).map(([pp, ss], k) => {
              const v = ss.values[active]
              return v === null ? null : (
                <circle key={k} cx={x(active)} cy={pp.y(v)} r="4.5"
                  className="dchart-dot-on" style={{ stroke: ss.color }} />
              )
            })}
          </g>
        )}

        {/* 마우스를 받는 투명 띠. 각 시점이 자기 구간을 갖는다 */}
        {labels.map((lb, i) => (
          <rect key={`hit-${lb}`} className="dchart-hit"
            x={x(i) - innerW / (labels.length - 1 || 1) / 2}
            y={PAD.top} width={innerW / (labels.length - 1 || 1)} height={innerH}
            onMouseEnter={() => setActive(i)} />
        ))}
      </svg>

      {active !== null && (
        <div className="dchart-tip" style={{ left: `${(x(active) / W) * 100}%` }} role="status">
          <strong>{labels[active]}</strong>
          {([left, right] as const).map((s2) => {
            const v = s2.values[active]
            return (
              <span key={s2.key}>
                <i style={{ background: s2.color }} aria-hidden />
                {s2.label}
                <b>{v === null ? '자료 없음' : `${v.toFixed(1)}${s2.unit}`}</b>
              </span>
            )
          })}
        </div>
      )}
    </figure>
  )
}
