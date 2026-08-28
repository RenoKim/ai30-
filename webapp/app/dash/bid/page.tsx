import { Suspense } from 'react'
import { BidReview } from '@/components/dash/BidReview'

export default function BidPage() {
  return (
    <Suspense fallback={<p className="dnote">불러오는 중…</p>}>
      <BidReview />
    </Suspense>
  )
}
