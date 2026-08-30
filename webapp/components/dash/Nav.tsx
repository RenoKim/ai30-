'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUploads } from '@/lib/ggauction/store'

/** 와이어프레임의 좌측 내비. 화면 순서가 곧 작업 순서다 */
const GROUPS = [
  {
    title: '데이터',
    items: [
      { href: '/dash', label: '목록 업로드', hint: 'PDF 를 올린다' },
      { href: '/dash/clean', label: '정제 리포트', hint: '자동 처리하지 않은 행' },
    ],
  },
  {
    title: '시장 보기',
    items: [
      { href: '/dash/brief', label: '경매시장 브리핑', hint: '이번 주 무슨 일이' },
      { href: '/dash/trend', label: '시장지표 추이', hint: '낙찰가율과 유찰 회차' },
      { href: '/dash/compare', label: '공매와 대보기', hint: '같은 자가 통하나' },
    ],
  },
  {
    title: '물건',
    items: [
      { href: '/dash/list', label: '물건 목록', hint: '읽은 값과 계산값' },
      { href: '/dash/bid', label: '입찰가 검토', hint: '얼마를 쓸 것인가' },
      { href: '/dash/case', label: '사건 조회', hint: '사건번호로 한 건' },
    ],
  },
] as const

export function Nav() {
  const path = usePathname()
  const { rows, files } = useUploads()
  const needsCheck = rows.filter((r) => r.flags.length > 0).length

  return (
    <nav className="dnav" aria-label="화면 이동">
      {GROUPS.map((g) => (
        <div key={g.title} className="dnav-g">
          <h4>{g.title}</h4>
          <ul>
            {g.items.map((it) => {
              const on = path === it.href
              return (
                <li key={it.href}>
                  <Link href={it.href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
                    <span className="dnav-l">{it.label}</span>
                    <span className="dnav-h">{it.hint}</span>
                    {it.href === '/dash/clean' && needsCheck > 0 && (
                      <span className="dnav-n" title={`확인 필요 ${needsCheck}건`}>{needsCheck}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <p className="dnav-foot">
        {files.length > 0
          ? <>{files.length}개 파일 · {rows.length}건 읽음</>
          : <>아직 올린 파일이 없습니다</>}
      </p>
    </nav>
  )
}
