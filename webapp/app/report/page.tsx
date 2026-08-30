import type { Report } from '@/lib/types'
import { buildReport } from '@/lib/report'
import { Term } from '@/components/Term'
import { RoundConverter } from '@/components/RoundConverter'
import { TwoAxis } from '@/components/TwoAxis'
import { Screener } from '@/components/Screener'
import { TrendLines } from '@/components/TrendLines'
import { TruncationPanel } from '@/components/TruncationPanel'
import { UsageVolatility } from '@/components/UsageVolatility'
import { CaseDrilldown } from '@/components/CaseDrilldown'

export const dynamic = 'force-dynamic'

// 자기 API 를 HTTP 로 다시 부르지 않는다 — 배포 호스트를 알 필요가 없고 왕복도 없다
async function getReport(): Promise<Report | { error: string; detail?: string }> {
  try {
    return await buildReport()
  } catch (err) {
    return { error: '리포트를 생성하지 못했습니다', detail: err instanceof Error ? err.message : String(err) }
  }
}

/** 주장 첫 문장만 표제로 세운다 — 히어로는 두 줄을 넘기지 않는다 */
function splitClaim(claim: string): [string, string] {
  const at = claim.indexOf('. ')
  return at > 0 ? [claim.slice(0, at + 1), claim.slice(at + 2)] : [claim, '']
}

export default async function Page() {
  const data = await getReport()

  if ('error' in data) {
    return (
      <main className="wrap">
        <div className="err">
          <h1>리포트를 불러오지 못했습니다</h1>
          <p>{data.detail ?? data.error}</p>
          <p className="hint">
            <code>sql/01_schema.sql</code> → <code>02_seed.sql</code> → <code>03_report_views.sql</code>{' '}
            순서로 실행됐는지, <code>.env.local</code>에 Supabase 키가 들어 있는지 확인하세요.
          </p>
        </div>
      </main>
    )
  }

  const { headline, meta, exhibit0_truncation: e0, exhibit1_rateVolatility: e1,
          exhibit2_byUsage: e2, exhibit3_byRegion: e3, exhibit4_anomalies: e4,
          exhibit5_floor: e5, exhibit6_cases: e6, reconciliation, assumptions } = data

  const byBasis = (k: string) => e1.rows.find((r) => r.basis.includes(k))
  const vsMin = byBasis('최저입찰가')
  const vsApp = byBasis('감정가')
  const confirmed = e4.rows.filter((r) => r.severity === 'confirmed')
  const truncUsage = e0.summary.find((r) => r.source === 'usage' && r.basis.includes('감정가'))
  const floorLatest = e5.byYear[e5.byYear.length - 1]
  const floorPrevMax = Math.max(...e5.byYear.slice(0, -1).map((r) => r.below_floor), 0)
  const passed = reconciliation.summary.filter((r) => r.all_passed).length
  const [claimHead, claimTail] = splitClaim(headline.claim)

  // 발견 3건의 수치는 리포트에서 파생시킨다 — 화면에 상수를 박지 않는다
  const basisRatio = vsMin?.spread_pp && vsApp?.spread_pp
    ? vsApp.spread_pp / vsMin.spread_pp : null
  const usageOf = (name: string) => e2.rows.find((r) => r.usage_name === name)
  const apt = usageOf('아파트')
  const land = usageOf('대지')
  const depthGap = apt && land
    ? Math.abs(apt.min_to_appraisal_pct - land.min_to_appraisal_pct) : null
  const rateGap = apt && land
    ? Math.abs(apt.rate_vs_appraisal - land.rate_vs_appraisal) : null

  const findings = [
    truncUsage && {
      stat: String(truncUsage.recomputed_lower), unit: '건', role: '핵심 주장',
      claim: '공개된 낙찰가율은 싼 물건을 빼고 낸 평균이다',
      why: `이 통계는 낙찰가율 25% 이하 물건을 아예 뺍니다. 실제로 ${truncUsage.cells}개 항목 중 ${truncUsage.recomputed_lower}개에서, 원본 자료의 금액으로 우리가 직접 계산한 값이 공개된 값보다 낮았습니다. 평균 ${Math.abs(truncUsage.median_gap_pp).toFixed(2)}%p씩 낮습니다.`,
    },
    basisRatio && {
      stat: basisRatio.toFixed(1), unit: '배', role: '바탕',
      claim: '낙찰가는 감정가가 아니라 그 회차 최저가를 따라간다',
      why: `무엇으로 나누느냐만 바꿔도 13년 동안의 오르내림 폭이 ${vsMin?.spread_pp}%p에서 ${vsApp?.spread_pp}%p로 벌어집니다. 경매를 해 본 사람에겐 당연한 이야기라, 우리 주장이 아니라 출발점으로 씁니다.`,
    },
    depthGap && rateGap && {
      stat: depthGap.toFixed(1), unit: '%p', role: '근거',
      claim: '낙찰가율이 같아도 속사정은 전혀 다르다',
      why: `아파트와 대지는 낙찰가율이 ${rateGap.toFixed(1)}%p밖에 차이 나지 않는데, 값이 얼마나 깎였는지는 ${depthGap.toFixed(1)}%p나 벌어집니다. 같은 숫자를 보고 같은 물건이라 생각하면 안 됩니다.`,
    },
    {
      stat: String(confirmed.length), unit: '건', role: '점검',
      claim: '합계가 맞아도 원본 자료는 틀릴 수 있다',
      why: `나오기 어려운 값이 위 단계 합계에 그대로 더해집니다. 그래서 "부분을 더하면 전체가 되나" 검산 ${passed}/${reconciliation.summary.length}은 통과하는데도 이상한 값이 그대로 남습니다.`,
    },
  ].filter(Boolean) as { stat: string; unit: string; role: string; claim: string; why: string }[]

  return (
    <main className="wrap">

      {/* ── 결론 ─────────────────────────────────── */}
      <header className="hero">
        <div className="hero-say">
          <p className="eyebrow">
            온비드 <Term>공매</Term> 통계 {meta.first_year}-{meta.latest_year}
            <span>{meta.usage_rows + meta.region_rows}행</span>
          </p>
          <h1>{claimHead}</h1>
          <p className="sub">{claimTail}</p>
          <p className="jump"><a href="#screener">내 물건 숫자로 확인하기</a></p>
        </div>
        <div className="hero-fig">
          <TrendLines trend={e1.trend} />
          <p className="fig-cap">
            같은 낙찰 결과를 <b>무엇으로 나누느냐</b>만 바꿔 그린 것입니다.
            위 선은 13년 내내 거의 평평하고, 아래 선만 크게 출렁입니다.
          </p>
        </div>
      </header>

      {/* ── 답 먼저 ──────────────────────────────── */}
      <section>
        <h2>이 보고서의 답</h2>
        <p className="lede">
          공매 통계 {meta.usage_rows + meta.region_rows}줄을 뜯어보고 확인한 것 {findings.length}가지입니다.
          각각의 근거는 아래 Exhibit에서 하나씩 보여 드립니다.
        </p>
        <ol className="findings">
          {findings.map((f, i) => (
            <li key={f.claim}>
              <span className="f-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="f-stat">{f.stat}<em>{f.unit}</em></span>
              <span className="f-say">
                <b>{f.claim}</b>
                <span>{f.why}</span>
              </span>
              <span className="f-role">{f.role}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 스크리너 — 이 사이트의 본체 ──────────────── */}
      <section id="screener">
        <p className="ex">직접 해보기<span className="reader">입찰을 살펴보는 누구나</span></p>
        <h2>내 물건은 지금 어디쯤인가</h2>
        <p className="lede">
          공고문에 적힌 숫자 두 개만 넣으면, 이 물건이 <b>몇 번 유찰된 셈인지</b>와
          <b> 비슷한 물건들에 비해 많이 떨어진 편인지</b>를 알려 드립니다.
        </p>
        <ol className="howto">
          <li><b>공고문에서 두 숫자를 옮겨 적습니다</b><span>감정가 · 이번 회차 최저입찰가</span></li>
          <li><b>물건의 용도와 지역을 고릅니다</b><span>비교할 기준선이 정해집니다</span></li>
          <li><b>오른쪽 결과와 근거를 봅니다</b><span>어떤 숫자로 그렇게 판단했는지 전부 같이 보여 드립니다</span></li>
        </ol>
        <Screener usage={e2.rows} region={e3.rows} />
      </section>

      {/* ── E0 논지 ──────────────────────────────── */}
      <section>
        <p className="ex">Exhibit 0<span className="reader">{e0.reader}</span></p>
        <h2>{e0.title}</h2>
        <p className="lede">
          낙찰가율을 시장 온도계처럼 갖다 쓰기 전에 확인할 것이 하나 있습니다.
          <b> 이 통계는 일부 물건을 처음부터 빼고 계산합니다.</b>{' '}
          아주 싸게 팔린 것과 유난히 비싸게 팔린 것을 뺐으니, 남은 것만 평균 내면 값이 올라갑니다.
        </p>
        <TruncationPanel rules={e0.rules} summary={e0.summary} />
        <p className="note">{e0.note}</p>
      </section>

      {/* ── E1 전제 ──────────────────────────────── */}
      <section>
        <h2><span className="fig">Exhibit 1</span>{e1.title}</h2>
        <p className="lede">
          시장이 크게 흔들린 해에도
          <b> 낙찰가는 늘 그 회차 <Term>최저입찰가</Term>의 {vsMin?.min_rate}~{vsMin?.max_rate}%</b>였습니다.
          사람들은 감정가가 아니라 <b>그 회차에 부르는 값</b>을 보고 입찰가를 씁니다.
          경매를 해 본 사람에겐 당연한 이야기라, 우리 주장이 아니라 <b>출발점</b>으로 놓습니다.
        </p>
        <div className="cmp">
          {e1.rows.map((r) => {
            const alarm = r.basis.includes('감정가')
            return (
              <div key={r.basis} className={alarm ? 'cmp-c alarm' : 'cmp-c'}>
                <span className="cmp-k">{r.basis} 낙찰가율</span>
                <span className="cmp-v">{r.spread_pp}<em>%p</em></span>
                <span className="cmp-d">13년 동안 {r.min_rate}% ~ {r.max_rate}% 사이</span>
                <span className="cmp-bar"><span style={{ width: `${(r.spread_pp / 26) * 100}%` }} /></span>
              </div>
            )
          })}
        </div>
        <p className="note">
          위 두 숫자는 <b>13년 동안 가장 높았던 값과 가장 낮았던 값의 차이</b>입니다.
          작을수록 그 기간 내내 안 흔들렸다는 뜻입니다.
          (%p는 퍼센트끼리 뺀 차이입니다 — 30%에서 50%가 되면 20%p 오른 것입니다.)
        </p>
        <UsageVolatility rows={e1.perUsage} />
        <p className="concl">
          그러니 <Term>감정가 대비율</Term>은 “얼마에 팔렸나”를 재는 자가 아닙니다.
          <b>“<Term>감정가</Term>에서 얼마나 멀어졌나”</b>를 재는 자입니다.
          다만 왜 멀어졌는지 — 감정가를 높게 매겨서인지, 그해 나온 물건이 달라서인지는
          이 데이터로 가릴 수 없습니다.
        </p>
      </section>

      {/* ── E5 회차 환산 · 법정 하한 ─────────────────── */}
      <section>
        <p className="ex">Exhibit 5<span className="reader">{e5.reader}</span></p>
        <h2>{e5.title}</h2>
        <p className="lede">
          “<Term>감정가</Term>의 39%”라고만 하면 감이 안 옵니다.
          <b>“몇 번 유찰된 셈인가”</b>로 바꿔 보면 뜻이 분명해집니다.
          다만 <b>끝까지 바꿀 수는 없습니다.</b> 법이 감정가의
          <b> 50%(6회차)</b>까지만 깎도록 정해 뒀기 때문입니다.
          그보다 낮은 값은 유찰이 더 된 게 아니라, 이미 <Term>재감정</Term>을 받고 다시 시작한 물건입니다.
        </p>
        {floorLatest && (
          <div className="stat-row">
            <div>
              <span className="k">{floorLatest.year}년 · 50% 아래로 내려간 용도</span>
              <span className="v alarm">{floorLatest.below_floor}<em> / {floorLatest.leaf_count}</em></span>
            </div>
            <div>
              <span className="k">앞선 12년 중 가장 많았던 해</span>
              <span className="v">{floorPrevMax}<em> / {floorLatest.leaf_count}</em></span>
            </div>
            <div>
              <span className="k">가장 많이 내려간 용도</span>
              <span className="v">{floorLatest.lowest_pct}<em>%</em></span>
            </div>
          </div>
        )}
        <RoundConverter trend={e1.trend} />
        <p className="note">{e5.note}</p>
      </section>

      {/* ── E2·E3 근거 ───────────────────────────── */}
      <section>
        <h2><span className="fig">Exhibit 2·3</span>낙찰가율이 같아도 속사정은 전혀 다르다</h2>
        <p className="lede">
          아래 도표는 물건 종류마다 점을 하나씩 찍은 것입니다.
          가로는 <b>얼마에 팔렸나</b>, 세로는 <b>값이 얼마나 깎였나</b>입니다.
          가로 위치가 비슷해도 세로가 멀면 전혀 다른 물건입니다 — <b>아파트와 대지</b>가 그렇습니다.
          다만 눈에 띄는 두 개만 골라 말하지 않으려고, <b>{e2.rows.length}종 전부</b>를 놓고
          두 기준의 등수가 얼마나 맞는지 세어 봤습니다.
        </p>
        <div className="stat-row">
          {[e2.correlation, e3.correlation].filter(Boolean).map((c) => (
            <div key={c!.axis}>
              <span className="k">{c!.axis} · 두 기준 등수가 맞는 정도</span>
              <span className={`v ${Math.abs(c!.spearman_rho) < 0.2 ? 'alarm' : ''}`}>
                {c!.spearman_rho > 0 ? '+' : ''}{c!.spearman_rho.toFixed(2)}
              </span>
              <span className="d">
                {Math.abs(c!.spearman_rho) < 0.2
                  ? '두 등수가 거의 상관없습니다 — 한쪽만 보고 판단하면 안 됩니다'
                  : '어느 정도 같이 움직입니다 — 그래서 세게 주장하지 않습니다'}
              </span>
            </div>
          ))}
        </div>
        <TwoAxis usage={e2.rows} region={e3.rows} />
        <p className="note">{e2.note}</p>
        <p className="note">{e2.axisNote}</p>
      </section>

      {/* ── E6 드릴스루 — 조원 공유 자료 ──────────────── */}
      {e6 && (
        <section id="cases">
          <p className="ex">Exhibit 6<span className="reader">{e6.reader}</span></p>
          <h2>{e6.title}</h2>
          <p className="lede">
            여기까지 본 숫자는 전부 <b>이미 평균 낸 값</b>이었습니다.
            “2024년 아파트 전체”가 한 줄이라, 그 안에 어떤 물건이 있었는지는 볼 수 없었습니다.
            조원이 공유한 <b>법원경매 물건 {e6.meta.total}건</b>을 넣고 나서야 그 안을 열어 볼 수 있게 됐습니다.
            <b> 아래 막대를 눌러 보세요. 그 막대에 들어간 물건 목록이 열립니다.</b>
          </p>
          <p className="note">
            ⚠️ 이건 온비드 공매가 아니라 <b>법원 경매</b>입니다. 서울 · {e6.meta.from_date}~{e6.meta.to_date} 한 달치이고,
            자료를 준 회사가 &lsquo;샘플&rsquo;이라고 밝힌, 전체 중 일부만 뽑아낸 것이라 전체를 대표하지 못합니다.
            그래서 위 Exhibit의 숫자와 <b>더하거나 나란히 놓지 않습니다.</b> 같은 방식으로 재 보기만 합니다.
          </p>

          <div className="stat-row">
            <div>
              <span className="k">물건 수</span>
              <span className="v">{e6.meta.total}<em>건</em></span>
            </div>
            <div>
              <span className="k">팔린 것</span>
              <span className="v">{e6.meta.sold}<em>건 · {e6.meta.sold_rate}%</em></span>
            </div>
            <div>
              <span className="k">자치구 · 용도</span>
              <span className="v">{e6.meta.districts}<em> · {e6.meta.usages}</em></span>
            </div>
          </div>

          <CaseDrilldown byUsage={e6.byUsage} byDistrict={e6.byDistrict} byRight={e6.byRight} />

          {/* 저감 사다리 — 스크리너 회차 환산을 실측으로 검증한다 */}
          {e6.decayFit && (
            <>
              <h3>유찰될 때 값을 얼마나 깎는가 — {e6.decayFit.total}건 전부 확인</h3>
              <p className="lede">
                한 번 유찰될 때마다 값이 <b>20%씩</b> 깎입니다.
                감정가의 100% → 80% → 64% → 51.2%… 이렇게 내려갑니다.
                {e6.decayFit.total}건이 <b>하나도 빠짐없이</b> 이 계단 위에 놓였습니다.
                그리고 캠코 공매와 달리 <b>더 못 깎는 선이 없습니다</b> —
                감정가의 {e6.decayFit.lowest_pct}%({e6.decayFit.deepest_round}회차)까지 내려간 물건이 있습니다.
              </p>
              <div className="stat-row">
                <div>
                  <span className="k">20%씩 깎는 계단에 맞는 물건</span>
                  <span className="v">{e6.decayFit.fit_20pct}<em> / {e6.decayFit.total}</em></span>
                </div>
                <div>
                  <span className="k">30%씩 깎는 계단에 맞는 물건</span>
                  <span className="v">{e6.decayFit.fit_30pct}<em> / {e6.decayFit.total}</em></span>
                </div>
              </div>
              <ol className="ladder">
                {e6.decaySteps.map((d) => (
                  <li key={d.round_no} className={d.pct < 50 ? 'deep' : undefined}>
                    <span className="r">{d.round_no}회차</span>
                    <span className="p">{d.pct}%</span>
                    <span className="c">{d.cases}건 · 매각 {d.sold}</span>
                  </li>
                ))}
              </ol>
              <p className="note">
                캠코 <Term>압류재산</Term>은 10%씩 깎고 50%에서 멈춥니다(6회차로 끝).
                서울 법원 경매는 20%씩 깎고 멈추지 않습니다. <b>규칙이 아예 다릅니다.</b>{' '}
                그러니 한쪽 계산표를 다른 쪽에 쓰면 안 됩니다 — 이 표가 하려는 말이 그것입니다.
                맨 위 계산기의 &lsquo;법원경매&rsquo; 항목은 천안 사례 1건만 보고 30%로 잡았던 값이라,
                서울 {e6.decayFit.total}건으로 확인한 <b>20%</b>를 따로 만들어 두었습니다.
              </p>
            </>
          )}

          {/* 절사기준을 절사되지 않은 원자료에 대본다 */}
          {e6.truncation.length > 0 && (
            <>
              <h3>온비드가 빼는 물건이 실제로 얼마나 되나</h3>
              <p className="lede">
                이 데이터는 아무것도 빼지 않은 원본입니다.
                여기에 온비드가 쓰는 &lsquo;빼는 기준&rsquo;을 그대로 대 보면, 몇 건이 사라지는지 셀 수 있습니다.
              </p>
              <div className="scroll">
                <table>
                  <thead><tr>
                    <th>빼는 기준</th><th className="num">걸리는 물건</th><th className="num">전체</th><th className="num">비율</th>
                  </tr></thead>
                  <tbody>
                    {e6.truncation.map((t) => (
                      <tr key={t.rule_key}>
                        <td>{t.rule_text}</td>
                        <td className="num">{t.hits}건</td>
                        <td className="num">{t.sold_total}건</td>
                        <td className="num">
                          {t.sold_total > 0 ? ((t.hits / t.sold_total) * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note">
                낙찰가율 25% 이하로 팔린 물건이 <b>실제로 있습니다.</b>
                Exhibit 0에서 &lsquo;그런 물건이 빠져서 평균이 올라간다&rsquo;고 했는데,
                방향뿐 아니라 <b>대략 얼마나 되는지</b>까지 확인된 셈입니다.
                다만 제도가 다르니 이 비율을 온비드에 그대로 옮겨 쓰면 안 됩니다.
              </p>
            </>
          )}

          {/* 발견 8이 다른 데이터셋에서 재현된다 */}
          {e6.amountGap.length > 0 && (
            <>
              <h3>같은 종류의 오류가 다른 데이터에서 또 나왔다</h3>
              <p className="lede">
                자료를 준 회사는 물건 목록과 그것을 요약한 표를 같이 줬습니다.
                둘을 맞춰 봤더니 <b>건수는 {e6.meta.total}건 · {e6.meta.sold}건으로 딱 맞는데</b>,
                <b>금액만 {e6.amountGap.length}곳에서 어긋납니다.</b>{' '}
                팔린 것으로 세어 놓고 금액 칸은 비워 둔 자리입니다.
                Exhibit 4에서 온비드를 두고 한 이야기와 <b>똑같은 유형</b>입니다.
              </p>
              <div className="scroll">
                <table>
                  <thead><tr>
                    <th>어디</th><th className="num">팔린 건수</th>
                    <th className="num">물건 목록</th><th className="num">요약 표</th>
                    <th>판정</th>
                  </tr></thead>
                  <tbody>
                    {e6.amountGap.map((g) => (
                      <tr key={`${g.district}-${g.dong}-${g.usage_name}`}>
                        <td>{g.district} {g.dong} · {g.usage_name}</td>
                        <td className="num">{g.sold_detail} / {g.sold_stats}</td>
                        <td className="num">{(g.appraisal_detail / 100_000_000).toFixed(2)}억</td>
                        <td className="num">{(g.appraisal_stats / 100_000_000).toFixed(2)}억</td>
                        <td><span className="sev s-confirmed">{g.kind}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note">
                출처도 제도도 만든 회사도 다른 데이터인데 같은 종류가 또 잡혔습니다.
                우리가 만든 검사 방식이 <b>특정 데이터에서만 통하는 게 아니라는</b> 뜻으로 읽습니다.
              </p>
            </>
          )}

          {/* 검산 — 실패도 그대로 */}
          {e6.reconciliation.length > 0 && (
            <>
              <h3>이 데이터에도 같은 검사를 {e6.reconciliation.length}가지 돌렸습니다</h3>
              <div className="scroll">
                <table>
                  <thead><tr>
                    <th>무엇을 확인했나</th><th className="num">기대한 값</th><th className="num">실제 값</th><th>결과</th>
                  </tr></thead>
                  <tbody>
                    {e6.reconciliation.map((r) => (
                      <tr key={r.check_name}>
                        <td>{r.check_name}</td>
                        <td className="num">{r.expected.toLocaleString('ko-KR')}</td>
                        <td className="num">{r.actual.toLocaleString('ko-KR')}</td>
                        <td><span className={r.passed ? 'sev s-pass' : 'sev s-fail'}>
                          {r.passed ? '통과' : '실패 — 이게 발견입니다'}
                        </span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note">
                실패한 2건은 지우지 않고 그대로 뒀습니다.
                하나는 위에서 본 금액 누락이고, 다른 하나는 서울 물건인데
                담당 법원이 성남지원으로 적힌 차량 1건입니다.
              </p>
            </>
          )}

          <p className="note">{e6.note}</p>
        </section>
      )}

      {/* ── E4 신뢰장치 ──────────────────────────── */}
      <section>
        <h2><span className="fig">Exhibit 4</span>합계가 맞는다고 데이터가 맞는 건 아니다</h2>
        <p className="lede">
          2016년 아파트 칸에 낙찰가가 <Term>감정가</Term>의 258%로 들어가 있습니다.
          이 값이 위 단계 합계에 그대로 더해지기 때문에,
          <b>“부분을 더하면 전체가 되나”만 확인하면 아무 문제가 없어 보입니다.</b>{' '}
          비율을 따로 계산해 봐야 드러납니다.
        </p>
        <p className="lede">
          다만 <b>원인까지 단정하지는 않습니다.</b> 이 통계는 낙찰가율이 200%를 넘는 물건을 빼는데,
          그 규칙이 공개된 비율에만 적용되고 금액에는 적용되지 않았을 수도 있습니다.
          그렇다면 <b>틀린 게 아니라 세는 대상이 다른 것</b>입니다. 우리 데이터로는 둘을 가릴 수 없습니다.
        </p>
        <div className="stat-row">
          <div><span className="k">두 값이 어긋난 항목</span><span className="v alarm">{confirmed.length}<em>건</em></span></div>
          <div><span className="k">그런데도 통과한 검산</span><span className="v">{passed}<em> / {reconciliation.summary.length}</em></span></div>
        </div>
        <div className="prop">
          {['아파트 392,519', '주거용건물 484,829', '전체 1,132,261'].map((s, i) => (
            <div key={s} className="prop-n">
              <span className={i === 0 ? 'src' : ''}>{s}</span>
              {i < 2 && <span className="arw" aria-hidden>↓ 포함</span>}
            </div>
          ))}
        </div>
        <div className="scroll">
          <table>
            <thead><tr>
              <th>어디</th><th className="num">금액으로 계산</th><th className="num">공개된 값</th>
              <th className="num">차이</th><th>판정</th>
            </tr></thead>
            <tbody>
              {e4.rows.slice(0, 8).map((r) => (
                <tr key={`${r.source}-${r.year}-${r.name}`}>
                  <td>{r.year} {r.name}</td>
                  <td className="num">{r.sum_ratio}%</td>
                  <td className="num">{r.published_rate}%</td>
                  <td className="num">{r.gap_pp}%p</td>
                  <td><span className={`sev s-${r.severity}`}>
                    {r.severity === 'confirmed' ? '어긋남 확인' : r.severity === 'suspect' ? '판단 보류' : '경미'}
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">{e4.note}</p>
      </section>

      {/* ── 검산 ─────────────────────────────────── */}
      <section>
        <h2>이 숫자를 믿어도 되는 이유, 그리고 믿으면 안 되는 지점</h2>
        <p className="lede">
          숫자가 맞는지 스스로 검사하는 항목을 {reconciliation.summary.length}개 만들어 매번 돌립니다.
          <b> 전부 통과하도록 맞춰 두지 않았습니다.</b>{' '}
          실패하는 항목이 있고, 그 실패가 바로 위 Exhibit 4의 근거입니다.
        </p>
        <div className="scroll">
          <table>
            <thead><tr><th>무엇을 확인했나</th><th className="num">통과</th><th>결과</th></tr></thead>
            <tbody>
              {reconciliation.summary.map((r) => (
                <tr key={r.check_name}>
                  <td>{r.check_name}</td>
                  <td className="num">{r.passed} / {r.total}</td>
                  <td><span className={r.all_passed ? 'sev s-pass' : 'sev s-fail'}>
                    {r.all_passed ? '통과' : '실패 — 이게 발견입니다'}
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 가정 ─────────────────────────────────── */}
      <section>
        <h2>아래는 우리가 세운 가정이지 사실이 아닙니다</h2>
        <p className="lede">
          이 보고서의 숫자를 읽을 때 같이 알아야 할 한계입니다.
          숨기면 그럴듯해 보이지만, 그러면 잘못 쓰이게 됩니다.
        </p>
        <ol className="asm">{assumptions.map((a) => <li key={a}>{a}</li>)}</ol>
      </section>

      <footer>
        <p>{data.disclaimer}</p>
        <p className="src">{meta.source} · 매 요청 시 원본에서 재집계</p>
      </footer>
    </main>
  )
}
