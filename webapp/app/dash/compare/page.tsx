import { ONBID, COURT_SNAPSHOT as C } from '@/lib/ggauction/onbidData'
import { Sec, Callout, Read, Row, Cell } from '@/components/dash/ui'

export default function ComparePage() {
  return (
    <>
      <div className="dhead">
        <p className="dcrumb">시장 / 공매와 대보기</p>
        <h1>다른 제도에서도 같은 자가 통하는가</h1>
        <p className="dlede">
          지금까지 본 것은 전부 <b>법원 경매</b>입니다. 규칙이 전혀 다른 <b>온비드 공매</b>에
          같은 자를 대 보면, 우리가 쓰는 기준이 이 제도에만 통하는 것인지 아닌지 알 수 있습니다.
        </p>
      </div>

      <Sec n="01" title="규칙은 정말 다릅니다" sub="법원 경매 vs 온비드 공매">
        <div className="scroll">
          <table>
            <thead><tr><th /><th>법원 경매 (서울)</th><th>온비드 공매 (압류재산)</th></tr></thead>
            <tbody>
              <tr><th>유찰 시 저감</th><td>직전 최저가의 <b>80%</b> (20%씩)</td><td>처음 값의 <b>10%씩</b> 차감</td></tr>
              <tr><th>멈추는 선</th><td><b>없음</b></td><td><b>감정가의 {ONBID.floorPct}%</b> (국세징수법 제87조)</td></tr>
              <tr><th>가장 깊게 본 값</th><td>감정가의 {C.deepestPct}% ({C.deepestRound}회차)</td>
                <td>감정가의 {ONBID.lowestPct}%</td></tr>
              <tr><th>확인한 표본</th><td>624건 (2022·2026)</td>
                <td>{ONBID.total}건 ({ONBID.period})</td></tr>
            </tbody>
          </table>
        </div>
        <Read>
          공매에서 {ONBID.floorPct}% 아래가 <b>{ONBID.belowFloor}건</b> 나왔습니다. 하한을 어긴 게 아니라
          <b> 재감정을 받고 새 사이클이 돈 것</b>입니다 — 10% 미만 값이 9·8·7·6·5·4·3·2·1%인데,
          이건 10%p 계단을 <b>두 번 곱한 값</b>입니다(50%×20%=10%, 10%×10%=1%).
        </Read>
      </Sec>

      <Sec n="02" title="그런데 이건 두 제도에서 똑같습니다" sub="낙찰가 ÷ 최저가">
        <Callout title="저감률도 하한도 다른데 최저가 대비 낙찰가율은 104~117%로 모입니다">
          하한은 정확히 100.0% — 부르는 값 밑으로는 아무도 못 삽니다. 우리가 쓰는 &lsquo;회차와 최저가&rsquo;라는 자는 제도를 가리지 않습니다.
        </Callout>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>낙찰가 ÷ 최저가</th><th className="num">중앙값</th><th className="num">하한</th><th>표본</th></tr>
            </thead>
            <tbody>
              <tr><td>경매 · 강서구 주택</td><td className="num"><b>{C.hwagokLikeMedian}%</b></td>
                <td className="num">100.0%</td><td className="dim">{C.period}</td></tr>
              <tr><td>경매 · 서울 그 밖 주택</td><td className="num"><b>{C.otherSeoulMedian}%</b></td>
                <td className="num">100.0%</td><td className="dim">{C.period}</td></tr>
              <tr className="now"><td>공매 · 서울 압류재산</td><td className="num"><b>{ONBID.rateVsMinBid.median}%</b></td>
                <td className="num">{ONBID.rateVsMinBid.min.toFixed(1)}%</td>
                <td className="dim">{ONBID.sold}건 낙찰 / {ONBID.total}건</td></tr>
            </tbody>
          </table>
        </div>
        <Read>
          낙찰가는 감정가가 아니라 <b>&lsquo;그 회차에 부르는 값&rsquo;</b>을 따라갑니다. 사건 조회 DB의 화곡동·강서구·서울(+10.5~10.8%)에서도 같습니다.
        </Read>
      </Sec>

      <Sec n="03" title="반대로, 감정가로 재면 흔들립니다" sub={`같은 ${ONBID.sold}건`}>
        <Row>
          <Cell label="공매 · 감정가 대비 낙찰가율" value={ONBID.rateVsAppraisal.median} unit="%"
            note={<>{ONBID.rateVsAppraisal.min}~{ONBID.rateVsAppraisal.max}% 사이 · 흔들린다</>} />
          <Cell keyed label="공매 · 최저가 대비 낙찰가율" value={ONBID.rateVsMinBid.median} unit="%"
            note={<>{ONBID.rateVsMinBid.min}~{ONBID.rateVsMinBid.max}% 사이 · 하한 100</>} />
        </Row>
        <Read>
          무엇으로 나누느냐만 바꿔도 이렇게 달라집니다.
          <b> 감정가 대비율은 &ldquo;얼마에 팔렸나&rdquo;가 아니라 &ldquo;감정가에서 얼마나 멀어졌나&rdquo;를 잽니다.</b>
        </Read>
        <p className="dnote">
          자료 출처 — 공공데이터포털 차세대 온비드 API(`getCltrBidRsltList2`).
          {ONBID.scope} · {ONBID.period} · 호출 7회로 {ONBID.total}건 전량 수집. 수집기는 하루 1,000건 한도를 넘기면 실행을 막습니다.
        </p>
      </Sec>
    </>
  )
}
