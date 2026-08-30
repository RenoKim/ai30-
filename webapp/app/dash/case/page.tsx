import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '사건 조회 · 경매 시장 대시보드',
  description: '사건번호 하나로 물건 확인 · 비교군 · 실거래를 봅니다.',
}

/**
 * 조원이 만든 「경매어려워」 를 그대로 띄운다.
 *
 * 코드를 섞지 않는다 — public/case/index.html 은 조원 파일의 복사본이고 수정하지 않는다.
 * 원본 사이트는 X-Frame-Options: SAMEORIGIN 이라 주소로는 못 띄우고,
 * 같은 출처에서 서빙해야 iframe 이 열린다. 그래서 복사본을 둔다.
 * 데이터는 조원 Supabase 에서 직접 온다(우리 DB 와 별개).
 */
export default function CasePage() {
  return (
    <>
      <p className="dcrumb">물건 / 사건 조회</p>
      <h1>사건 조회</h1>
      <p className="dsub">
        사건번호 하나를 넣으면 물건 확인 → 비교군과 경쟁 → 이 동네 실거래 순으로 봅니다.
        조원(김재관·박유선) 작업물을 그대로 실었습니다 · 기준일 2025-12-31 고정 · 법원 DB 6,975물건 · 실거래 105,045건.
      </p>
      <iframe
        className="dframe"
        src="/case/index.html"
        title="경매어려워 — 사건 조회"
        loading="lazy"
      />
    </>
  )
}
