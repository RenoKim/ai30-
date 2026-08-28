'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { CaseRow, ParseResult } from './types'

/**
 * 업로드한 목록을 화면 사이에서 공유한다.
 *
 * 서버로 보내지 않는다. 브라우저 안에만 있고, 탭을 닫으면 사라진다
 * (sessionStorage). 주소가 들어 있는 자료라 그 편이 안전하다.
 */

const STORAGE_KEY = 'ggauction.uploads.v1'

interface StoreValue {
  files: ParseResult[]
  rows: CaseRow[]
  /** 아직 한 건도 안 올렸나 — 화면마다 안내를 다르게 낸다 */
  isEmpty: boolean
  add: (result: ParseResult) => void
  removeFile: (fileName: string) => void
  clear: () => void
  /** sessionStorage 를 읽기 전에는 true — 깜빡임을 막는다 */
  loading: boolean
}

const Ctx = createContext<StoreValue | null>(null)

function readStored(): ParseResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ParseResult[]) : []
  } catch (err) {
    // 저장된 형식이 바뀌었을 수 있다. 조용히 넘어가되 흔적은 남긴다.
    console.warn('[store] 저장된 업로드를 읽지 못했습니다:', err)
    return []
  }
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<ParseResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setFiles(readStored())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (loading) return
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(files))
    } catch (err) {
      console.warn('[store] 업로드를 저장하지 못했습니다(용량 초과일 수 있습니다):', err)
    }
  }, [files, loading])

  // 같은 파일을 다시 올리면 덮어쓴다 — 두 번 더해지면 통계가 두 배가 된다
  const add = useCallback((result: ParseResult) => {
    setFiles((prev) => [...prev.filter((f) => f.fileName !== result.fileName), result])
  }, [])

  const removeFile = useCallback((fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.fileName !== fileName))
  }, [])

  const clear = useCallback(() => setFiles([]), [])

  const value = useMemo<StoreValue>(() => {
    // 같은 물건이 두 파일에 겹쳐 들어올 수 있다(같은 주를 다시 뽑거나 파일명만 바꿔 올리거나).
    // 사건번호 + 매각기일이 같으면 같은 물건이다. 두 번 세면 통계가 그대로 부풀어 오른다.
    const seen = new Set<string>()
    const rows = files.flatMap((f) => f.rows).filter((r) => {
      const key = `${r.caseNo}@${r.bidDate}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    return { files, rows, isEmpty: rows.length === 0, add, removeFile, clear, loading }
  }, [files, add, removeFile, clear, loading])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUploads(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useUploads 는 UploadProvider 안에서만 쓸 수 있습니다')
  return v
}
