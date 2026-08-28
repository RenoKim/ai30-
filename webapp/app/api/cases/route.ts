import { NextResponse } from 'next/server'
import { fetchCaseList, isCaseAxis } from '@/lib/cases'
import type { CaseListResponse } from '@/lib/types'

/**
 * /api/cases?axis=usage|district|right&key=... — 드릴스루 명단.
 *
 * 막대를 누르면 여기로 온다. 초기 페이지에 524행을 실어 보내지 않으려고
 * 눌렀을 때만 조회한다. 집계와 명단이 같은 테이블에서 나오므로 숫자가 어긋날 수 없다.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const axis = searchParams.get('axis')
  const key = searchParams.get('key')

  // 경계에서 검증한다 — 축은 세 값, 키는 fetchCaseList 가 화이트리스트로 거른다
  if (!isCaseAxis(axis)) {
    return NextResponse.json(
      { error: 'axis 는 usage · district · right 중 하나여야 합니다' },
      { status: 400 },
    )
  }
  if (!key || !key.trim()) {
    return NextResponse.json({ error: 'key 가 필요합니다' }, { status: 400 })
  }

  try {
    const { rows, title } = await fetchCaseList(axis, key)
    const sold = rows.filter((r) => r.result === '매각').length
    const payload: CaseListResponse = {
      axis,
      key,
      title,
      subtitle: `${rows.length}건 · 팔린 것 ${sold} · 안 팔린 것 ${rows.length - sold} · 팔린 것 먼저, 값이 많이 깎인 순`,
      count: rows.length,
      rows,
    }
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/cases]', message)
    const badKey = message.includes('알 수 없는 권리 키')
    return NextResponse.json(
      { error: badKey ? message : '명단을 불러오지 못했습니다', detail: badKey ? undefined : message },
      { status: badKey ? 400 : 500 },
    )
  }
}
