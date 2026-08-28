import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 시스템 경계에서 즉시 실패시킨다 — 런타임 중간에 undefined 로 터지는 것보다 낫다
if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다')
if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다')

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
})
