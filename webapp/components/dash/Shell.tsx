'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUploads } from '@/lib/ggauction/store'
import { GROUPS, locate } from '@/lib/dash/shell'

const ASOF = '2025-12-31'

/**
 * 경매어려워의 셸을 그대로 쓴다 — 검은 앱바 · 햄버거 서랍 · 830px 지면 · 오른쪽 250px 레일.
 * 내용(children)은 화면마다 그대로고, 여기서는 "지금 어디고 다음은 어디"만 그린다.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const here = locate(pathname)
  const isWide = here?.group.key === 'case'

  // 경로가 바뀌면 서랍은 닫힌다
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="dash">
      <header className="appbar">
        <button type="button" className="burger" aria-label="메뉴" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? '✕' : '≡'}
        </button>
        <Link href="/dash/brief" className="appbar-brand">경매어려워</Link>
        {here
          ? <span className="appbar-crumb">{here.group.title} / {here.item.label}</span>
          : <span className="appbar-sub">서울 연립 · 다세대</span>}
        <span className="appbar-r">서울 · 주택 4종 · 기준일 {ASOF}</span>
      </header>

      <div className={`scrim${open ? ' on' : ''}`} onClick={() => setOpen(false)} aria-hidden />
      <Drawer open={open} pathname={pathname} />

      <div className="dshell">
        <main className={`dmain dpage${isWide ? ' wide' : ''}`}>{children}</main>
        {here?.group.rail && <Rail here={here} />}
      </div>
    </div>
  )
}

function Drawer({ open, pathname }: { open: boolean; pathname: string }) {
  const { rows, files } = useUploads()
  const needsCheck = rows.filter((r) => r.flags.length > 0).length

  /** 서랍 오른쪽 작은 글자 — 지금 상태. 어디에 일이 남았는지 서랍만 봐도 보이게 */
  const status = (href: string): string | null => {
    if (href === '/dash') return files.length ? `${files.length}개 · ${rows.length}건` : '파일 없음'
    if (href === '/dash/clean') return needsCheck > 0 ? `확인 ${needsCheck}` : null
    if (href === '/dash/brief') return '1년치'
    if (href === '/dash/compare') return '665건'
    return null
  }

  return (
    <nav className={`lnb${open ? ' on' : ''}`} aria-label="화면 이동" aria-hidden={!open}>
      {GROUPS.map((g) => (
        <div key={g.key} className="lnb-g">
          <h5>{g.title}</h5>
          {g.items.map((it) => {
            const on = it.href.split('?')[0] === pathname && !it.href.includes('?')
            const s = status(it.href)
            return (
              <Link key={it.href} href={it.href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined} tabIndex={open ? 0 : -1}>
                <span>{it.label}</span>
                <small>{s ?? it.hint}</small>
              </Link>
            )
          })}
        </div>
      ))}
      <p className="lnb-foot">경매 ≠ 공매 · 숫자를 합치지 않습니다</p>
    </nav>
  )
}

function Rail({ here }: { here: NonNullable<ReturnType<typeof locate>> }) {
  const { group, index } = here
  const prev = group.items[index - 1]
  const next = group.items[index + 1]
  return (
    <aside className="drail">
      <div className="rnb">
        <div className="rnb-hd">{group.rail}</div>
        {group.items.map((it, i) => (
          <Link key={it.href} href={it.href} className={`stp${i === index ? ' on' : i < index ? ' done' : ''}`} aria-current={i === index ? 'step' : undefined}>
            <i>{i < index ? '✓' : i + 1}</i>
            <div>{it.label}<small>{it.hint}</small></div>
          </Link>
        ))}
        <div className="rnb-nav">
          {prev ? <Link href={prev.href} className="bt">← 이전</Link> : <span className="bt off">← 이전</span>}
          {next ? <Link href={next.href} className="bt k">다음 →</Link> : <span className="bt off">다음 →</span>}
        </div>
        {group.after && (
          <Link href={group.after.href} className="rnb-foot">
            <b>{group.after.label}</b><br />{group.after.why}
          </Link>
        )}
      </div>
    </aside>
  )
}
