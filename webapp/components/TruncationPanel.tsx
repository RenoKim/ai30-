import type { TruncationRuleRow, TruncationSummaryRow } from '@/lib/types'

/**
 * E0 — 이 통계는 무엇을 빼고 계산했나.
 *
 * 데이터셋 유의사항의 제외기준을 원문 그대로 놓고,
 * 게시값과 원자료 재계산값의 괴리가 절사 방향과 맞는지를 나란히 보인다.
 *
 * 핵심은 두 basis 의 대비다. 감정가 대비율에서만 괴리가 크고 낙찰률은 거의 0인데,
 * 이는 분산이 작은 지표에서 평균과 합계비율이 수렴하기 때문이다.
 */
export function TruncationPanel({
  rules, summary,
}: { rules: TruncationRuleRow[]; summary: TruncationSummaryRow[] }) {
  const usageRows = summary.filter((r) => r.source === 'usage')
  const byBasis = (k: string) => usageRows.find((r) => r.basis.includes(k))
  const app = byBasis('감정가')
  const min = byBasis('낙찰률')

  return (
    <div className="trunc">
      <div className="trunc-rules">
        <p className="trunc-src">공공데이터포털이 밝혀 둔 &lsquo;빼는 기준&rsquo; — 원문 그대로</p>
        <ul>
          {rules.map((r) => (
            <li key={r.rule_text}>
              <b>{r.rule_text}</b>
              <span>{r.why_it_matters}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="trunc-evidence">
        <p className="trunc-src">
          용도별 {app?.cells ?? '-'}개 항목에서, 원본 자료의 금액으로 우리가 계산한 값과 공개된 값을 비교
        </p>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>어떤 비율인가</th>
                <th className="num">우리 계산이 더 낮음</th>
                <th className="num">더 높음</th>
                <th className="num">같음</th>
                <th className="num">차이 (보통)</th>
              </tr>
            </thead>
            <tbody>
              {usageRows.map((r) => (
                <tr key={r.basis} className={r.basis.includes('감정가') ? 'alarm' : undefined}>
                  <td>{r.basis}</td>
                  <td className="num"><b>{r.recomputed_lower}</b></td>
                  <td className="num">{r.recomputed_higher}</td>
                  <td className="num">{r.matched}</td>
                  <td className="num">{r.median_gap_pp}<em>%p</em></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {app && min && (
          <p className="trunc-read">
            <b>이 표를 읽는 법.</b> 감정가로 나눈 비율은 {app.cells}개 항목 중
            <b> {app.recomputed_lower}개</b>에서 공개된 값보다 낮게 나왔고, 차이는 보통 <b>{app.median_gap_pp}%p</b>였습니다.
            싼 물건을 빼면 나타나는 방향과 정확히 같습니다.
            반면 최저가로 나눈 비율은 같은 차이가 <b>{min.median_gap_pp}%p</b>로 거의 없습니다.
            <b> 즉 문제가 생기는 곳은 감정가로 나눈 비율 한 군데입니다.</b>
          </p>
        )}
      </div>
    </div>
  )
}
