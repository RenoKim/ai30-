import { NextResponse } from 'next/server'
import { buildReport } from '@/lib/report'

/**
 * /api/report — 외부 공개용 JSON 엔드포인트.
 * 조립 로직은 lib/report.ts 가 갖는다 (페이지와 공유).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()
  try {
    const report = await buildReport()
    return NextResponse.json({
      ...report,
      meta: { ...report.meta, elapsedMs: Date.now() - startedAt },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/report]', message)
    return NextResponse.json(
      {
        error: '리포트를 생성하지 못했습니다',
        detail: message,
        hint: message.includes('v_')
          ? 'sql/01_schema.sql → 02_seed.sql → 03_report_views.sql 순서로 실행됐는지 확인하세요'
          : undefined,
      },
      { status: 500 },
    )
  }
}
