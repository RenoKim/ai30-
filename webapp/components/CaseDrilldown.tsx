'use client'

import { useCallback, useRef, useState } from 'react'
import type { CaseAxis, CaseAxisRow, CaseRightRow, CaseListResponse } from '@/lib/types'
import { CaseDrawer, type DrawerState } from './CaseDrawer'

/**
 * E6 드릴스루 — 막대를 누르면 그 뒤의 개별 물건 명단이 오른쪽에서 열린다.
 *
 * 온비드 집계(533행)로는 못 하던 것이다. 막대를 눌러도 나올 명단이 없었다.
 * 여기서는 막대와 명단이 같은 테이블에서 나오므로 숫자가 어긋날 수 없다.
 *
 * 축 3종을 한 화면에서 바꾼다. 권리 축은 온비드에는 컬럼조차 없던 축이다.
 */

const AXES: { id: CaseAxis; label: string; hint: string }[] = [
  { id: 'usage',    label: '용도별',   hint: '어떤 종류가 나왔나' },
  { id: 'district', label: '자치구별', hint: '어느 동네에 나왔나' },
  { id: 'right',    label: '권리별',   hint: '까다로운 조건이 붙었나' },
]

interface Bar {
  key: string          // 드릴스루에 넘길 값 (권리 축은 플래그 컬럼명)
  label: string        // 화면에 쓸 이름
  listed: number
  sold: number
  soldRate: number | null
  right: string        // 오른쪽에 붙는 보조 수치
  hint?: string
}

function toBars(axis: CaseAxis, usage: CaseAxisRow[], district: CaseAxisRow[], right: CaseRightRow[]): Bar[] {
  if (axis === 'right') {
    return right.map((r) => ({
      key: r.key,
      label: r.label,
      listed: r.listed,
      sold: r.sold,
      soldRate: r.sold_rate,
      hint: r.hint,
      right: r.sold_rate !== null && r.sold_rate_off !== null
        ? `팔린 비율 ${r.sold_rate}% (안 붙은 물건은 ${r.sold_rate_off}%)`
        : '—',
    }))
  }
  const rows = axis === 'usage' ? usage : district
  return rows.map((r) => ({
    key: r.key,
    label: r.key,
    listed: r.listed,
    sold: r.sold,
    soldRate: r.sold_rate,
    right: r.median_depth_pct !== null
      ? `팔린 비율 ${r.sold_rate}% · 값은 보통 감정가의 ${r.median_depth_pct}%까지 내려감`
      : `팔린 비율 ${r.sold_rate}%`,
  }))
}

export function CaseDrilldown({
  byUsage, byDistrict, byRight,
}: {
  byUsage: CaseAxisRow[]
  byDistrict: CaseAxisRow[]
  byRight: CaseRightRow[]
}) {
  const [axis, setAxis] = useState<CaseAxis>('usage')
  const [state, setState] = useState<DrawerState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)

  // 빠르게 여러 막대를 누르면 응답 순서가 뒤집힐 수 있다 — 마지막 클릭만 반영한다
  const reqId = useRef(0)

  const bars = toBars(axis, byUsage, byDistrict, byRight)
  const max = Math.max(...bars.map((b) => b.listed), 1)

  const close = useCallback(() => {
    setState(null); setError(null); setLoading(false); setActive(null)
  }, [])

  const open = useCallback(async (bar: Bar) => {
    const id = ++reqId.current
    setActive(bar.key); setLoading(true); setError(null); setState(null)
    try {
      const res = await fetch(`/api/cases?axis=${axis}&key=${encodeURIComponent(bar.key)}`)
      const json = (await res.json()) as CaseListResponse & { error?: string; detail?: string }
      if (id !== reqId.current) return
      if (!res.ok) throw new Error(json.detail ?? json.error ?? `HTTP ${res.status}`)
      setState({ title: json.title, subtitle: json.subtitle, rows: json.rows })
    } catch (err) {
      if (id !== reqId.current) return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [axis])

  return (
    <div className="dd">
      <div className="dd-tabs" role="tablist" aria-label="드릴스루 축">
        {AXES.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={axis === a.id}
            className={axis === a.id ? 'is-on' : undefined}
            onClick={() => { setAxis(a.id); close() }}
          >
            {a.label}<em>{a.hint}</em>
          </button>
        ))}
      </div>

      <p className="dd-guide">
        <b>막대를 눌러 보세요.</b> 그 막대에 들어간 물건 목록이 오른쪽에 열립니다.
        막대 전체 길이는 나온 물건 수이고, <b>진한 부분이 실제로 팔린 물건</b>입니다.
      </p>

      <ul className="dd-bars">
        {bars.map((b) => (
          <li key={b.key}>
            <button
              type="button"
              onClick={() => open(b)}
              className={active === b.key ? 'is-active' : undefined}
              aria-label={`${b.label} ${b.listed}건 목록 열기`}
            >
              <span className="dd-name">
                {b.label}
                {b.hint && <em>{b.hint}</em>}
              </span>
              <span className="dd-track">
                <span className="dd-fill" style={{ width: `${(b.listed / max) * 100}%` }}>
                  <span
                    className="dd-sold"
                    style={{ width: `${b.listed > 0 ? (b.sold / b.listed) * 100 : 0}%` }}
                  />
                </span>
              </span>
              <span className="dd-n">{b.listed}<em>건</em></span>
              <span className="dd-side">{b.right}</span>
            </button>
          </li>
        ))}
      </ul>

      <CaseDrawer state={state} loading={loading} error={error} onClose={close} />
    </div>
  )
}
