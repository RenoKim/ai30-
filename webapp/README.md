# 온비드 공매 낙찰가율 스크리너 — webapp

조원: 김재관 · 박유선

## 선행 조건

Supabase SQL Editor에서 순서대로 실행:

    sql/01_schema.sql        테이블 2 + 뷰 3 + 검산 뷰 2 + RLS
    sql/02_seed.sql          533행 적재
    sql/03_report_views.sql  리포트 뷰 7종
    sql/04_revision_20260826.sql  개정 뷰 14종 (조원 검토 반영) ← 미적용 시 페이지가 500
    sql/05_auction_cases.sql      법원경매 개별 524행 + 통계 250행 + 뷰 10종
                                  ← 미적용이어도 페이지는 뜬다. Exhibit 6 만 빠진다

`05` 는 생성 파일이다. 원본 xlsx 를 고쳤다면 직접 편집하지 말고 다시 만들 것:

    python3 sql/_build/build_auction_seed.py

## 실행

    npm install
    cp .env.example .env.local   # anon key 채우기
    npm run dev
    curl localhost:3000/api/report | jq

## /api/cases — 드릴스루

    GET /api/cases?axis=usage|district|right&key=<값>

Exhibit 6 의 막대를 누르면 호출된다. 초기 페이지에 524행을 싣지 않으려고
누른 시점에만 조회한다. 축은 세 값만, 권리 키는 `lib/cases.ts` 의 화이트리스트만 통과한다.

집계 막대와 명단이 같은 테이블(`auction_case`)에서 나오므로 둘이 어긋날 수 없다.

## /api/report 설계 원칙

**이 라우트에는 집계 코드가 없다.** 모든 수치는 Supabase 뷰가 매 요청 재계산한 값을
그대로 전달한다. 화면에서 map/reduce로 숫자를 만들면 DB와 화면이 갈라진다.

새 지표가 필요하면 코드가 아니라 **뷰를 추가**할 것.

## 응답 구조

| 키 | 내용 |
| --- | --- |
| `headline` | 이 보고서의 답 (결론 문장) |
| `meta` | 연도 범위 · 행수 · 출처 · 생성시각 |
| `exhibit1_rateVolatility` | 발견 1 — 두 낙찰가율의 변동폭 + 13년 추이 |
| `exhibit2_byUsage` | 발견 4 — 소분류 14종 (중분류·전체 제외) |
| `exhibit3_byRegion` | 발견 7 — 시도 17개 (권역·전체 제외) |
| `exhibit4_anomalies` | 발견 8 — 게시율 vs 합계비율 괴리 |
| `reconciliation` | 검산 6항목 + 실패 상세 |
| `assumptions` | 검산이 닿지 않는 곳 |

## ⚠️ 검산은 전부 통과하지 않는다

의도된 것이다. 실패 3건이 이 과제의 발견이다.

- 지역 권역 = 시도 합 → 64/65 (2023 대구/경북)
- 지역 시도 합 = 전체 → 12/13 (2023년)
- 낙찰가율 게시값 vs 합계비율 → 232/234 (통계량 정의 차이 + 2016 오염)

`allPassed: false`가 정상 상태다. 화면에서 숨기지 말 것.
