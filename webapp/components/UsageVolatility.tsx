import type { VolatilityRatioRow } from '@/lib/types'

/**
 * E1 하단 — 용도를 하나로 고정해도 논지가 성립하는가.
 *
 * 조원 제안("지역과 용도 범위를 줄여 결과를 내보는건 어떠신가요")을 그대로 실행한 결과다.
 * 전체 집계 하나로 주장하는 대신 14종 각각에서 재검증한다.
 */
export function UsageVolatility({ rows }: { rows: VolatilityRatioRow[] }) {
  const holds = rows.filter((r) => r.thesis_holds).length
  const sorted = [...rows].sort((a, b) => (b.ratio_x ?? 0) - (a.ratio_x ?? 0))
  const max = Math.max(...sorted.map((r) => r.ratio_x ?? 0), 1)

  return (
    <div className="vol">
      <p className="vol-head">
        전체를 뭉뚱그린 숫자 하나로 주장하면 미덥지 않습니다.
        그래서 용도를 하나씩 고정해 13년치를 다시 봤습니다 —
        <b> {rows.length}종 중 {holds}종</b>에서 같은 결과가 나왔습니다.
      </p>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>용도</th>
              <th className="num">최저가로 나눴을 때</th>
              <th className="num">감정가로 나눴을 때</th>
              <th>몇 배 더 흔들리나</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.usage_name} className={r.thesis_holds ? undefined : 'alarm'}>
                <td>{r.usage_name}</td>
                <td className="num">{r.minbid_spread_pp}<em>%p</em></td>
                <td className="num">{r.appraisal_spread_pp}<em>%p</em></td>
                <td>
                  <span className="bar-row">
                    <span className="bar" style={{ width: `${((r.ratio_x ?? 0) / max) * 100}%` }} aria-hidden />
                    <span className="bar-v">{r.ratio_x?.toFixed(1) ?? '-'}배</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        표의 두 숫자는 13년 동안 값이 <b>위아래로 얼마나 흔들렸는지</b>입니다. 작을수록 안정적입니다.
        어긋나는 용도 하나는 물건 수가 가장 적은 종류인데, 지우지 않고 그대로 뒀습니다.
      </p>
    </div>
  )
}
