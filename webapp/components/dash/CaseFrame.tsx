'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

type CaseWindow = Window & { goMenu?: (m: 'main' | 'list') => void }

/**
 * 조원 「경매어려워」 를 같은 출처 iframe 으로 띄운다. 파일(public/case/index.html)은 손대지 않는다.
 * 같은 출처라 안쪽 문서에 손이 닿으므로, 앱바만 가리고(우리 것이 위에 있다) 서랍의 '저장한 사건 목록' 을
 * 안쪽 goMenu 로 연결한다. 그 밖의 동작은 전부 조원 코드다.
 */
export function CaseFrame() {
  const ref = useRef<HTMLIFrameElement>(null)
  const view = useSearchParams().get('view') === 'saved' ? 'list' : 'main'

  const inner = (): CaseWindow | null => (ref.current?.contentWindow as CaseWindow | null) ?? null

  const onLoad = () => {
    const w = inner()
    const doc = w?.document
    if (!doc) return
    const style = doc.createElement('style')
    style.textContent = '.appbar{display:none!important}body{padding-top:0!important}.rnb{top:12px!important}'
    doc.head.appendChild(style)
    w?.goMenu?.(view)
  }

  // 이미 떠 있는 상태에서 서랍으로 view 만 바뀌면 안쪽 메뉴만 옮긴다
  useEffect(() => { inner()?.goMenu?.(view) }, [view])

  return (
    <iframe ref={ref} className="dframe" src="/case/index.html" title="경매어려워 — 사건 조회" onLoad={onLoad} />
  )
}
