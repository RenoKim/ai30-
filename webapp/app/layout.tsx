import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '낙찰가율, 무엇을 빼고 만든 숫자인가',
  description: '온비드 공매 통계 13년치를 뜯어보고, 내 물건이 지금 어디쯤인지 직접 확인해 봅니다.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
