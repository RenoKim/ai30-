import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CaseFrame } from '@/components/dash/CaseFrame'

export const metadata: Metadata = {
  title: '사건 조회 · 경매어려워',
  description: '사건번호 하나로 물건 확인 · 비교군 · 실거래를 봅니다.',
}

/** 조원 화면. 셸(앱바·서랍)은 우리 것, 지면과 진행 레일은 조원 것이 그대로 나온다. */
export default function CasePage() {
  return (
    <Suspense fallback={<p className="dnote">불러오는 중…</p>}>
      <CaseFrame />
    </Suspense>
  )
}
