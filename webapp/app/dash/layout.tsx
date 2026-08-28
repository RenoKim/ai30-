import type { Metadata } from 'next'
import Link from 'next/link'
import { UploadProvider } from '@/lib/ggauction/store'
import { Nav } from '@/components/dash/Nav'

export const metadata: Metadata = {
  title: '경매 시장 대시보드',
  description: '지지옥션 매각기일 목록을 올려 시장을 보고 입찰가를 정합니다.',
}

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <UploadProvider>
      <div className="dash">
        <header className="dtop">
          <Link href="/dash" className="dtop-brand">경매 시장 대시보드</Link>
          <span className="dtop-tag">서울 · 주택 4종</span>
          <Link href="/" className="dtop-alt">공매 분석 보고서 →</Link>
        </header>
        <div className="dbody">
          <aside className="dside"><Nav /></aside>
          <main className="dmain">{children}</main>
        </div>
      </div>
    </UploadProvider>
  )
}
