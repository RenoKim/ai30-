import type { CaseDetail, CourtRow, ItemRow, SavedCase } from './types'

/**
 * 조원 Supabase 프로젝트(경매 DB)로 가는 얇은 클라이언트. supabase-js 없이 REST 를 직접 친다 — 조원 코드와 같은 방식.
 *
 * 키는 `sb_publishable_` 공개 키다. anon 키와 같은 등급으로 브라우저에 노출되도록 설계된 값이라 번들에 들어가도 된다.
 * 환경변수가 있으면 그것을 쓰고, 없으면 조원 배포본과 같은 값으로 간다.
 */
const SB_URL = process.env.NEXT_PUBLIC_CASE_SB_URL ?? 'https://kwrgskrhcauhzhsmtlba.supabase.co'
const SB_KEY = process.env.NEXT_PUBLIC_CASE_SB_KEY ?? 'sb_publishable_7bn_vHJ5s60iMGMKYyKwXA_rbA09X9R'
const REST = `${SB_URL}/rest/v1`

/** 조원 화면이 고정한 기준일. RPC 는 날짜를 받으므로 나중에 화면 옵션으로 열 수 있다 */
export const ASOF = '2025-12-31'

const CLIENT_KEY = 'auction_client_id'   // 조원 앱과 같은 키 — 같은 브라우저면 저장 목록이 이어진다

/** 브라우저 하나를 구분하는 익명 id. 저장 목록은 이 id 로만 읽고 지운다 */
export function clientId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    const v = window.localStorage.getItem(CLIENT_KEY)
    if (v && v.length >= 16) return v
    const fresh = crypto.randomUUID()
    window.localStorage.setItem(CLIENT_KEY, fresh)
    return fresh
  } catch {
    return 'c-' + Date.now().toString(36)
  }
}

function headers(extra?: Record<string, string>): HeadersInit {
  return {
    apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json',
    'x-client-id': clientId(), ...extra,
  }
}

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = (await res.text()).slice(0, 120)
    throw new Error(`${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  return ok<T>(await fetch(`${REST}/rpc/${fn}`, { method: 'POST', headers: headers(), body: JSON.stringify(args) }))
}

export const listCourts = () => rpc<CourtRow[]>('list_courts', {})
export const searchItems = (court: string, caseNo: string) =>
  rpc<ItemRow[]>('search_items', { p_court: court, p_case_no: caseNo })
export const getCaseDetail = (court: string, caseNo: string, item: string, asof = ASOF) =>
  rpc<CaseDetail>('get_case_detail', { p_court: court, p_case_no: caseNo, p_item: item, p_asof: asof })

/** 저장 목록 — 내 브라우저 것만. 조원 원본은 필터가 없어 모든 사용자 것이 보였다 */
export async function listSaved(): Promise<SavedCase[]> {
  const q = `select=*&client_id=eq.${encodeURIComponent(clientId())}&order=saved_at.desc`
  return ok<SavedCase[]>(await fetch(`${REST}/saved_cases?${q}`, { headers: headers() }))
}

export async function saveCase(row: Omit<SavedCase, 'id'>): Promise<SavedCase> {
  const res = await fetch(`${REST}/saved_cases`, {
    method: 'POST', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(row),
  })
  const rows = await ok<SavedCase[]>(res)
  return rows[0]
}

export async function deleteSaved(id: number): Promise<void> {
  const q = `id=eq.${id}&client_id=eq.${encodeURIComponent(clientId())}`
  const res = await fetch(`${REST}/saved_cases?${q}`, { method: 'DELETE', headers: headers() })
  if (!res.ok) throw new Error(`${res.status}`)
}

/** 2023타경115918 · 2023-115918 · 20230115918 → 20230115918. 못 읽으면 '' */
export function normCase(v: string): string {
  const t = (v || '').replace(/\s/g, '')
  const m = t.match(/^(\d{4})(?:타경|[-._/])(\d{1,7})$/)
  if (m) return m[1] + ('0000000' + m[2]).slice(-7)
  if (/^\d{11}$/.test(t)) return t
  if (/^\d{5,10}$/.test(t)) return t.slice(0, 4) + ('0000000' + t.slice(4)).slice(-7)
  return ''
}

/** 20230115918 → 2023-115918 */
export function fmtCase(cn: string): string {
  const t = String(cn || '')
  return /^\d{11}$/.test(t) ? `${t.slice(0, 4)}-${Number(t.slice(4))}` : t
}

export const nf = (n: number) => Number(n).toLocaleString('ko-KR')
export const eok = (n: number) => (n / 1e8).toFixed(3)
export const pct = (n: number, d = 1) => (n * 100).toFixed(d)
