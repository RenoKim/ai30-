import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CaseLookup } from '@/components/case/CaseLookup'

export const metadata: Metadata = {
  title: '사건 조회 · 경매어려워',
  description: '사건번호 하나로 물건 확인 · 비교군 · 실거래를 봅니다.',
}

/** 조원 「경매어려워」 — React 로 옮겨 우리 셸 안에서 돈다. 데이터는 조원 Supabase 그대로 */
export default function CasePage() {
  return (
    <Suspense fallback={<p className="dnote">불러오는 중…</p>}>
      <CaseLookup />
    </Suspense>
  )
}
