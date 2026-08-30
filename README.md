# ai30- — 조별과제 제출 저장소

AI 데이터매니지먼트 과정 조별과제 · 조원 김재관 · 박유선 · 김우진

## 산출물

| | 주소 | 무엇 |
| --- | --- | --- |
| 경매 시장 대시보드 | https://onbid-screener.vercel.app | 지지옥션 매각기일 목록 PDF → 시장 브리핑 · 추이 · 물건 · 입찰가 검토 · **공매와 대보기** |
| 사건 조회 | https://onbid-screener.vercel.app/dash/case | 사건번호 한 건 → 물건 확인 · 비교군과 경쟁 · 동네 실거래 (조원 「경매어려워」 편입) |
| 공매 분석 보고서 | https://onbid-screener.vercel.app/report | 온비드 13년 공개통계 |

> 대시보드(법원 경매)와 보고서(온비드 공매)는 **다른 제도**를 다룹니다. 숫자를 합치지 않습니다.

## 코드

```
webapp/                 Next.js 15 · React 19 · TypeScript
  app/                  / → /dash/case · /dash/* 시장·목록 화면 · /report 공매 보고서
  lib/dash/shell.ts     서랍(LNB)과 진행 레일이 읽는 정보구조 한 표
  lib/ggauction/        PDF 파서(pdf.js) · 심어둔 시장 집계 · 업로드 상태
  lib/report.ts         보고서 — Supabase 뷰 조립
  public/case/          조원 「경매어려워」 원본 HTML (수정 없음 · 같은 출처 iframe)
```

### 실행

```bash
cd webapp
npm install
npm run dev        # http://localhost:3000/dash — 대시보드는 키 없이 돕니다
```

보고서(`/`)만 Supabase 키가 필요합니다. `webapp/.env.example` 을 `.env.local` 로 복사해 채우세요.
키는 저장소에 넣지 않습니다.

## 발표 요지

1. **화곡동 빌라는 서울보다 잘 팔리는데 더 싸게 팔린다** — 값이 충분히 내려가야 팔리는 구조
2. **그 구조를 재는 자(회차·최저가)는 제도를 가리지 않는다** — 저감률·하한이 다른 공매에서도 최저가 대비 낙찰가율이 104~117% 로 모이고 하한은 정확히 100.0%
3. **우리 숫자를 의심하는 장치를 만들었고, 실제로 잡았다** — 파서 두 경로 대조로 100건을 93건으로 세던 결함을 찾아 정정

## 원본 저장소

- 개발: `kidgodmoney/onbid-screener` (Private · Vercel 연결)
- 이 저장소는 제출용 스냅샷입니다. `kidgodmoney/ai30-` 가 원본이고 `RenoKim/ai30-` 는 같은 내용의 미러입니다.
