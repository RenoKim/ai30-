import type { ReactNode } from 'react'

/**
 * 조원 「경매어려워」 의 화면 문법 — 화면 7개가 전부 이 네 가지로 그려진다.
 *   Sec      번호 달린 절. 번호는 장식이 아니라 화면 안의 읽는 순서다
 *   Callout  보라 결론 한 문장 — 절마다 많아야 하나
 *   Read     해설 상자. 숫자를 어떻게 읽어야 하는지
 *   Cell     숫자 한 칸. 값은 mono, 단위는 sans
 */

export function Sec({ n, title, sub, children }: { n: string; title: ReactNode; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="sec">
      <div className="sh">
        <span className="step">{n}</span>
        <h2>{title}</h2>
        {sub && <span className="sub">{sub}</span>}
      </div>
      {children}
    </section>
  )
}

export function Callout({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="callout">
      <b>{title}</b>
      {children && <span>{children}</span>}
    </div>
  )
}

export function Read({ title, children, tone }: { title?: ReactNode; children: ReactNode; tone?: 'warn' }) {
  return (
    <div className={`read${tone ? ` is-${tone}` : ''}`}>
      {title && <h4>{title}</h4>}
      {children}
    </div>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="row">{children}</div>
}

export function Cell({ label, value, unit, note, keyed, after, children }: {
  label: ReactNode; value: ReactNode; unit?: ReactNode; note?: ReactNode
  /** 분석 대상 — 테두리를 두껍게 */
  keyed?: boolean
  /** 값 오른쪽에 붙는 것 (증감 등) */
  after?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={`col cell${keyed ? ' key' : ''}`}>
      <span className="lbl">{label}</span>
      <div className="v">{value}{unit && <span className="u"> {unit}</span>}{after}</div>
      {note && <div className="note">{note}</div>}
      {children}
    </div>
  )
}

/** 회차 사다리 — 조원의 회차 타임라인(.rounds .rg) 그대로 */
export function Rounds({ items }: { items: { round: ReactNode; price: ReactNode; sub?: ReactNode; tone?: 'now' | 'hot' | 'fut' }[] }) {
  return (
    <div className="rounds">
      {items.map((it, i) => (
        <div key={i} className={`rg${it.tone ? ` ${it.tone}` : ''}`}>
          <div className="r">{it.round}</div>
          <div className="p">{it.price}</div>
          {it.sub && <div className="s">{it.sub}</div>}
        </div>
      ))}
    </div>
  )
}
