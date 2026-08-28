'use client'

import { useEffect, useState } from 'react'

/**
 * 숫자가 0 에서 최종값까지 올라간다.
 *
 * 두 가지를 지킨다.
 *  1) 서버가 그린 첫 화면은 이미 최종값이다 — 하이드레이션 불일치가 나지 않는다.
 *     애니메이션은 마운트 뒤 requestAnimationFrame 으로만 돈다.
 *  2) 사용자가 동작 줄이기를 켜 두었으면 아예 돌지 않는다.
 *     발표장에서 어지럼을 호소하는 사람이 있을 수 있다.
 */
const DURATION_MS = 900

export function CountUp({
  value,
  format,
}: {
  value: number
  format: (n: number) => string
}) {
  const [shown, setShown] = useState(value)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }

    let raf = 0
    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / DURATION_MS)
      const eased = 1 - Math.pow(1 - t, 3)   // 빠르게 시작해 부드럽게 멈춘다
      setShown(value * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setShown(value)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span className="countup">{format(shown)}</span>
}
