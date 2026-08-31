'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CaseDetail, CourtRow, ItemRow, SavedCase } from '@/lib/case/types'
import { ASOF, clientId, eok, fmtCase, getCaseDetail, listCourts, nf, normCase, saveCase, searchItems } from '@/lib/case/api'
import { Sec1, Sec2, Sec3 } from './CaseDetail'
import { SavedCases } from './SavedCases'

const DEFAULT_COURT = '서울남부지방법원'

/**
 * 표본 사건 — 시연·검증용. 조원 최종본이 안내판으로 띄운 5건을 그대로 쓰되,
 * 우리는 **누르면 바로 조회**되게 한다.
 */
const SAMPLES = [
  { caseNo: '2025-11261', item: '1', loc: '강서구 화곡동', spec: '26.86㎡ · 2.79억', tag: null },
  { caseNo: '2025-10585', item: '1', loc: '금천구 독산동', spec: '29.84㎡ · 2.84억', tag: null },
  { caseNo: '2025-11132', item: '1', loc: '양천구 신월동', spec: '29.95㎡ · 2.64억', tag: null },
  { caseNo: '2025-8585',  item: '1', loc: '강서구 화곡동', spec: '29.88㎡ · 2.92억', tag: '불허' },
  { caseNo: '2024-131962', item: '1', loc: '강서구 화곡동', spec: '29.91㎡ · 2.65억', tag: '7회차' },
] as const
const STEPS = [
  ['물건 지정', '사건번호 · 물건번호'], ['물건 확인', '최저가 · 기일 · 면적'],
  ['비교군과 경쟁', '매각률 · 낙찰가 · 응찰자'], ['이 동네 실거래', '거래 분포 · 평당가'],
] as const

type Hint = { text: React.ReactNode; tone?: 'err' | 'busy' }

/**
 * 조원 「경매어려워」 의 사건 조회 화면 — React 로 옮긴 것.
 * 데이터는 조원 Supabase RPC 3개에서 그대로 오고, 화면 흐름(0 지정 → 1 확인 → 2 비교 → 3 실거래)과
 * 오른쪽 진행 레일도 그대로다. 바뀐 것은 저장 목록이 내 브라우저 것만 보인다는 점 하나.
 */
export function CaseLookup() {
  const router = useRouter()
  const view = useSearchParams().get('view')
  const [courts, setCourts] = useState<CourtRow[]>([])
  const [court, setCourt] = useState(DEFAULT_COURT)
  const [caseInput, setCaseInput] = useState('')
  const [items, setItems] = useState<ItemRow[]>([])
  const [item, setItem] = useState('')
  const [hint, setHint] = useState<Hint>({ text: '사건번호를 입력하면 물건 목록을 불러옵니다.' })
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [myBid, setMyBid] = useState<number | null>(null)
  const [bidText, setBidText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const findSeq = useRef(0)

  useEffect(() => {
    listCourts().then((d) => { setCourts(d); if (!d.some((c) => c.court === DEFAULT_COURT) && d[0]) setCourt(d[0].court) })
      .catch((e: unknown) => setHint({ text: `서버에 연결하지 못했어요. (${e instanceof Error ? e.message : String(e)})`, tone: 'err' }))
  }, [])

  // 사건번호를 치면 400ms 뒤에 물건 목록을 찾는다 — 조원과 같은 디바운스
  useEffect(() => {
    const n = normCase(caseInput)
    if (!n) {
      setItems([]); setItem('')
      setHint(caseInput.trim().length > 3
        ? { text: <>사건번호 형식이 아니에요. <b>2023타경115918</b> 또는 <b>2023-115918</b>처럼 입력해주세요.</>, tone: 'err' }
        : { text: '사건번호를 입력하면 물건 목록을 불러옵니다.' })
      return
    }
    setHint({ text: `물건 목록을 찾는 중… (${n})`, tone: 'busy' })
    const my = ++findSeq.current
    const t = setTimeout(() => {
      searchItems(court, caseInput.trim()).then((d) => {
        if (my !== findSeq.current) return
        setItems(d)
        if (!d.length) { setItem(''); setHint({ text: '해당 사건을 찾을 수 없어요. 사건번호와 법원을 확인해주세요.', tone: 'err' }); return }
        setItem((cur) => (d.some((x) => String(x.item_no) === cur) ? cur : String(d[0].item_no)))
      }).catch((e: unknown) => { if (my === findSeq.current) setHint({ text: `조회 실패 (${e instanceof Error ? e.message : String(e)})`, tone: 'err' }) })
    }, 400)
    return () => clearTimeout(t)
  }, [caseInput, court])

  // 물건을 고르면 그 물건의 한 줄 요약
  useEffect(() => {
    const r = items.find((x) => String(x.item_no) === item)
    if (!r) return
    setHint({ text: <>{items.length > 1 ? `물건 ${items.length}개 · ` : ''}<b>{r.sigungu} {r.eupmyeondong}</b> · 전용 {r.area}㎡ · 감정가 {eok(r.appraisal)}억</> })
  }, [items, item])

  const start = useCallback(async (c = court, cn = caseInput, it = item, keepBid = false) => {
    if (!cn.trim()) { setHint({ text: '사건번호를 입력해주세요.', tone: 'err' }); return }
    if (!normCase(cn)) { setHint({ text: '사건번호 형식을 확인해주세요. 2023타경115918 또는 2023-115918', tone: 'err' }); return }
    if (!it) { setHint({ text: '물건번호를 선택해주세요. 사건번호를 먼저 조회해야 목록이 나옵니다.', tone: 'err' }); return }
    setBusy(true)
    setHint({ text: `대시보드를 만드는 중… (${fmtCase(normCase(cn))} · 물건 ${it})`, tone: 'busy' })
    try {
      const d = await getCaseDetail(c, cn.trim(), it)
      if (!d?.found) { setHint({ text: '해당 물건을 찾을 수 없어요.', tone: 'err' }); return }
      setDetail(d); setStep(1)
      if (!keepBid) { setMyBid(null); setBidText('') }   // 저장 목록에서 불러올 땐 내 입찰가를 살린다
      setHint({ text: '사건번호를 입력하면 물건 목록을 불러옵니다.' })
      setToast('사건 조회가 완료되었어요.')
      router.replace('/dash/case')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setHint({ text: /57014|timeout|statement/.test(msg) ? '조회가 오래 걸려 중단됐어요. 다시 시도해주세요.' : `조회 실패 (${msg})`, tone: 'err' })
    } finally { setBusy(false) }
  }, [court, caseInput, item, router])

  const go = (n: number) => {
    if (!detail) return
    setStep(n)
    document.getElementById(`sec${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const reset = () => {
    if (detail && !window.confirm('조회한 사건 정보가 초기화됩니다. 계속하시겠어요?')) return
    setDetail(null); setStep(0); setMyBid(null); setBidText(''); setCaseInput(''); setItems([]); setItem('')
  }

  const save = async () => {
    if (!detail) { setToast('저장할 사건이 없어요. 먼저 사건번호를 조회해주세요.'); return }
    const i = detail.item
    try {
      await saveCase({
        case_key: `${i.case_no}-${i.item_no}`, court: i.court, case_no: i.case_no, item_no: String(i.item_no),
        asof_date: ASOF, loc: `${i.sigungu} ${i.dong}`, house_type: i.house_type, area_m2: i.area,
        appraisal: i.appraisal, appraisal_date: i.appraisal_date, min_price: i.min_price,
        min_ratio: +(i.min_price / i.appraisal * 100).toFixed(1), round_no: i.round, due_date: i.due,
        flags: i.flags, debt_total: i.debt, claim_amount: i.claim, my_bid: myBid,
        saved_at: new Date().toISOString(), client_id: clientId(),
      })
      setToast('저장했어요. 서랍의 ‘저장한 사건 목록’에서 다시 불러올 수 있어요.')
    } catch (e) { setToast(`저장하지 못했어요 (${e instanceof Error ? e.message : String(e)})`) }
  }

  const loadSaved = (r: SavedCase) => {
    setCourt(r.court); setCaseInput(fmtCase(r.case_no)); setItem(r.item_no)
    if (r.my_bid) { setMyBid(r.my_bid); setBidText(nf(r.my_bid)) }
    void start(r.court, fmtCase(r.case_no), r.item_no, Boolean(r.my_bid))
  }

  const applyBid = () => {
    const n = Number(bidText.replace(/[^\d]/g, ''))
    if (!detail || !n) { setMyBid(null); return }
    if (n < detail.item.min_price) { setToast(`최저가 ${nf(detail.item.min_price)}원 밑으로는 낙찰될 수 없어요.`); return }
    setMyBid(n); setBidText(nf(n))
  }

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t) }, [toast])

  const courtLabel = useMemo(() => courts.map((c) => ({ v: c.court, l: `${c.court} (${nf(c.n)})` })), [courts])

  return (
    <div className="dshell case">
      <div className="dmain">
        {view === 'saved' ? <SavedCases onLoad={loadSaved} /> : !detail ? (
          <div className="land">
            <p className="dcrumb">서울 연립 · 다세대 경매</p>
            <h1>이 물건, 얼마를 써야 할까</h1>
            <p className="dlede">권리분석이 끝난 물건 하나를 놓고, 같은 조건에서 실제로 얼마에 낙찰됐고 몇 명이 들어왔는지 과거 기록으로 확인한다. 적정가를 대신 정해주지는 않는다.</p>
            <form className="cform" onSubmit={(e) => { e.preventDefault(); void start() }}>
              <label className="fld"><span className="lbl">법원</span>
                <select value={court} onChange={(e) => setCourt(e.target.value)} disabled={!courts.length}>
                  {courtLabel.length ? courtLabel.map((c) => <option key={c.v} value={c.v}>{c.l}</option>) : <option>{DEFAULT_COURT}</option>}
                </select></label>
              <div className="two">
                <label className="fld"><span className="lbl">사건번호</span>
                  <input value={caseInput} onChange={(e) => setCaseInput(e.target.value)} placeholder="2023타경115918  또는  2023-115918" autoComplete="off" /></label>
                <label className="fld"><span className="lbl">물건번호</span>
                  <select value={item} onChange={(e) => setItem(e.target.value)} disabled={!items.length}>
                    {items.length ? items.map((x) => <option key={String(x.item_no)} value={String(x.item_no)}>{String(x.item_no)}</option>) : <option value="">–</option>}
                  </select></label>
              </div>
              <p className={`hint${hint.tone ? ` is-${hint.tone}` : ''}`}>{hint.text}</p>
              <button type="submit" className="btn" disabled={busy}>{busy ? '만드는 중…' : 'START'}</button>
              <p className="cut">기준일 <b>{ASOF}</b> · 이 날짜 이후 정보는 표시하지 않는다</p>
            </form>
            <div className="samples">
              <div className="samples-hd"><span className="lbl">표본 사건</span><small>서울남부지방법원</small></div>
              <ul>
                {SAMPLES.map((x) => (
                  <li key={x.caseNo}>
                    <button type="button" onClick={() => { setCaseInput(x.caseNo); setItem(x.item); void start(DEFAULT_COURT, x.caseNo, x.item) }}>
                      <b>{x.caseNo}</b><em>물건 {x.item}</em>
                      {x.tag && <span className="tag">{x.tag}</span>}
                      <s>{x.loc} · {x.spec}</s>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="dnote">눌러서 바로 열거나, 위 입력창에 사건번호를 직접 넣으세요.</p>
            </div>
            <p className="foot">경매 6,986물건 / 32,726기일 · 서울 5개 지방법원<br />실거래 105,045건 · 국토교통부 연립다세대 매매 (2023-01 ~)<br />번지가 없어 개별 물건 단위 시세 조회는 불가하며, 같은 동 · 같은 면적대 거래 기록으로만 비교한다.</p>
          </div>
        ) : (
          <>
            <div className="dashHd"><b>{detail.item.sigungu} {detail.item.dong}</b><span>전용 {detail.item.area}㎡ · {detail.item.house_type ?? ''}</span>
              <span className="cut">기준일 {ASOF}</span></div>
            <Sec1 d={detail} />
            <Sec2 d={detail} myBid={myBid} />
            <Sec3 d={detail} myBid={myBid} />
          </>
        )}
      </div>

      <aside className="drail">
        {toast && <div className="toast"><span className="lbl">안내</span><button type="button" className="x" onClick={() => setToast(null)} aria-label="닫기">✕</button>{toast}</div>}
        <div className="rnb">
          <div className="rnb-hd">진행 단계</div>
          {STEPS.map(([t, s], n) => (
            <button key={t} type="button" className={`stp${n === step ? ' on' : n < step ? ' done' : ''}`} onClick={() => (n === 0 ? reset() : go(n))} disabled={!detail && n > 0}>
              <i>{n < step ? '✓' : n}</i><div>{t}<small>{s}</small></div>
            </button>
          ))}
          <div className="rnb-nav">
            <button type="button" className={`bt${step <= 1 ? ' off' : ''}`} onClick={() => go(step - 1)}>← 이전</button>
            <button type="button" className={`bt k${!detail || step >= 3 ? ' off' : ''}`} onClick={() => go(Math.max(step, 0) + 1)}>다음 →</button>
          </div>
          {detail && (
            <div className="mybid">
              <span className="lbl">내 입찰가</span>
              <div className="two"><input inputMode="numeric" value={bidText} onChange={(e) => setBidText(e.target.value)} onBlur={applyBid} onKeyDown={(e) => { if (e.key === 'Enter') applyBid() }} placeholder={nf(detail.item.min_price)} /><span className="u">원</span></div>
              {myBid && <small>최저가 +{((myBid / detail.item.min_price - 1) * 100).toFixed(1)}% · 감정가 대비 {(myBid / detail.item.appraisal * 100).toFixed(1)}%</small>}
            </div>
          )}
          <div className="rnb-acts">
            <button type="button" className="bt" onClick={reset}>↺ 처음으로</button>
            <button type="button" className="bt k" onClick={() => void save()}>★ 사건 저장하기</button>
          </div>
          <div className="rnb-foot">{detail ? `${fmtCase(detail.item.case_no)} (${detail.item.item_no})` : '사건번호 미입력'}</div>
        </div>
      </aside>
    </div>
  )
}
