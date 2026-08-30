'use client'

import { useEffect, useState } from 'react'
import type { SavedCase } from '@/lib/case/types'
import { deleteSaved, fmtCase, listSaved, nf } from '@/lib/case/api'
import { Sec, Read } from '@/components/dash/ui'

/** 저장한 사건 목록 — 이 브라우저(client_id)가 저장한 것만 보인다 */
export function SavedCases({ onLoad }: { onLoad: (row: SavedCase) => void }) {
  const [rows, setRows] = useState<SavedCase[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => listSaved().then(setRows).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  useEffect(() => { refresh() }, [])

  const remove = async (id: number) => {
    try { await deleteSaved(id); refresh() } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }

  return (
    <Sec n="S" title="저장한 사건 목록" sub={rows ? `${rows.length}건 · 이 브라우저` : '불러오는 중'}>
      {error && <p className="derr"><b>서버에 연결하지 못했어요</b> {error}</p>}
      {rows && rows.length === 0 && <p className="dnote">아직 저장한 사건이 없습니다. 사건을 조회한 뒤 오른쪽 &lsquo;사건 저장하기&rsquo;를 누르면 여기에 쌓입니다.</p>}
      {rows && rows.length > 0 && (
        <div className="scroll">
          <table className="dtable">
            <thead><tr><th>사건</th><th>위치</th><th>용도</th><th className="num">면적㎡</th><th className="num">최저가</th><th className="num">회차</th><th>매각기일</th><th className="num">내 입찰가</th><th>저장</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => onLoad(r)}>
                  <td className="dmono">{fmtCase(r.case_no)} ({r.item_no})</td>
                  <td>{r.loc}</td><td>{r.house_type ?? '—'}</td>
                  <td className="num">{r.area_m2}</td>
                  <td className="num">{nf(r.min_price)}</td>
                  <td className="num">{r.round_no}</td>
                  <td className="dmono">{r.due_date ?? '—'}</td>
                  <td className="num">{r.my_bid ? nf(r.my_bid) : '—'}</td>
                  <td className="dmono">{r.saved_at.slice(0, 16).replace('T', ' ')}</td>
                  <td><button type="button" className="dlink sm" onClick={(e) => { e.stopPropagation(); void remove(r.id) }}>지우기</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Read>행을 누르면 그 사건을 다시 불러옵니다. 저장은 브라우저 단위(익명 id)로 묶입니다 — 다른 사람 것은 보이지 않습니다.</Read>
    </Sec>
  )
}
