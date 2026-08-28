'use client'

import { useEffect, useRef } from 'react'
import type { CaseDetailRow } from '@/lib/types'

/**
 * 드릴스루 명단 — 오른쪽에서 열리는 패널.
 *
 * 기준 산출물(TRACE)의 슬라이드오버를 그대로 가져왔다. 옮겨온 것은 네 가지다.
 *   ① 제목이 필터 조건 그 자체다 ("새 분류 = 계약완료" → "용도 = 다세대")
 *   ② 부제 한 줄에 건수 · 기준 · 정렬 · 다음 행동을 전부 넣는다
 *   ③ 행은 식별자 + 배지 + 오른쪽 정렬 메타의 3단
 *   ④ 본문을 가리지 않고 옆에 선다 — 눌렀던 막대가 계속 보인다
 *
 * TRACE 에 없던 것 두 가지를 더한다. 발표장에서 키보드로 조작할 수 있어야 한다.
 *   · ESC 로 닫힌다 · 열리면 닫기 버튼에 초점이 간다 · 뒤 배경은 스크롤을 멈춘다
 */

const 억 = 100_000_000
const 만 = 10_000

/** 금액은 자릿수를 세게 하지 않는다. 억/만으로 접는다. */
function money(won: number): string {
  if (won <= 0) return '—'
  if (won >= 억) return `${(won / 억).toFixed(won >= 10 * 억 ? 0 : 1)}억`
  if (won >= 만) return `${Math.round(won / 만).toLocaleString('ko-KR')}만`
  return won.toLocaleString('ko-KR')
}

export interface DrawerState {
  title: string
  subtitle: string
  rows: CaseDetailRow[]
}

export function CaseDrawer({
  state, loading, error, onClose,
}: {
  state: DrawerState | null
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  // 닫기 버튼이 아니라 패널 자체에 초점을 준다 —
  // 스크린리더는 dialog 를 읽고, 마우스 사용자에게는 초점 테두리가 보이지 않는다
  const panelRef = useRef<HTMLElement>(null)
  const open = loading || error !== null || state !== null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="dw-scrim" onClick={onClose} aria-hidden />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="dw"
        role="dialog"
        aria-modal="true"
        aria-label={state?.title ?? '물건 목록'}
      >
        <div className="dw-top">
          <button type="button" className="dw-x" onClick={onClose}>
            닫기 <span aria-hidden>✕</span>
          </button>
        </div>

        {loading && <p className="dw-msg">목록을 불러오는 중…</p>}

        {error && (
          <div className="dw-msg dw-err">
            <b>목록을 불러오지 못했습니다</b>
            <span>{error}</span>
          </div>
        )}

        {state && !loading && !error && (
          <>
            <h3 className="dw-title">{state.title}</h3>
            <p className="dw-sub">{state.subtitle}</p>

            <ul className="dw-list">
              {state.rows.map((r) => {
                const sold = r.result === '매각'
                return (
                  <li key={r.id}>
                    <div className="dw-r1">
                      <span className="dw-id">
                        {r.case_no}
                        {r.item_no !== null && <em>-{r.item_no}</em>}
                      </span>
                      <span className={`dw-res ${sold ? 'is-sold' : 'is-failed'}`}>{r.result}</span>
                      <span className="dw-meta">
                        {sold
                          ? <>감정가의 <b>{r.rate_vs_appraisal}%</b>에 팔림 · {r.bidders}명 응찰</>
                          : <>감정가의 <b>{r.min_to_appraisal_pct}%</b>까지 내려온 상태</>}
                      </span>
                    </div>
                    <div className="dw-r2">
                      <span className="dw-where">
                        {r.usage_name} · {r.district ?? '—'} {r.dong ?? ''}
                      </span>
                      <span className="dw-money">
                        감정 {money(r.appraisal_won)} → 최저 {money(r.min_bid_won)}
                        {sold && <> → 낙찰 <b>{money(r.winning_won)}</b></>}
                      </span>
                    </div>
                    {r.rights.length > 0 && (
                      <div className="dw-tags">
                        {r.rights.map((t) => <span key={t} className="dw-tag">{t}</span>)}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {state.rows.length === 0 && <p className="dw-msg">해당하는 물건이 없습니다.</p>}

            <p className="dw-foot">
              지지옥션 샘플 · 서울 · 2022년 1월.
              학습용으로 살펴본 것이며, 실제 입찰가를 정하는 근거로 쓸 수 없습니다.
            </p>
          </>
        )}
      </aside>
    </>
  )
}
