import type { Metadata } from 'next'
import { UploadProvider } from '@/lib/ggauction/store'
import { Shell } from '@/components/dash/Shell'

export const metadata: Metadata = {
  title: '경매어려워 · 서울 연립 · 다세대',
  description: '시장을 보고, 물건 하나를 고르고, 목록으로 검산하고, 공매에 같은 자를 대 봅니다.',
}

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <UploadProvider>
      <Shell>{children}</Shell>
    </UploadProvider>
  )
}
