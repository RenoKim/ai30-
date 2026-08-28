/**
 * 산점도 라벨 배치 — 겹치면 자리를 옮기고, 옮길 자리가 없으면 숨긴다.
 *
 * 점의 위치는 데이터라서 옮길 수 없다. 그래서 라벨만 점 기준 아래·위·오른쪽·왼쪽
 * 네 자리 중 비어 있는 곳으로 옮기고, 그래도 자리가 없으면 숨긴 뒤
 * 호버·클릭으로만 보이게 한다(수치는 아래 표에 전부 남아 있다).
 *
 * 입력을 바꾸지 않고 배치 결과만 새로 만들어 반환한다.
 */

export type LabelAnchor = 'bottom' | 'top' | 'right' | 'left'

export interface LabelInput {
  id: string
  /** 플롯 좌상단 기준 % 좌표 */
  xPct: number
  yPct: number
  text: string
}

export interface LabelPlacement {
  id: string
  anchor: LabelAnchor
  /** 점 중심 기준 px 오프셋 — 라벨 상자의 좌상단 */
  dx: number
  dy: number
  /** 놓을 자리가 없어 평소에는 감추는 라벨 */
  hidden: boolean
}

interface Rect { left: number; top: number; right: number; bottom: number }

const FONT_SIZE = 10.5
const LABEL_HEIGHT = 15
const LABEL_PAD_X = 3
const DOT_SIZE = 12
const GAP = 8
const COLLISION_MARGIN = 2
/** 플롯 안쪽 여백까지는 라벨이 조금 삐져나와도 읽는 데 지장이 없다 */
const OVERFLOW_ALLOWANCE = 14
const ANCHOR_ORDER: readonly LabelAnchor[] = ['bottom', 'top', 'right', 'left']
const HANGUL = /[가-힣ㄱ-ㆎ]/

/** 실측 대신 글자폭 추정 — 한글은 글자크기만큼, 그 외는 절반쯤 차지한다 */
export function estimateLabelWidth(text: string): number {
  let width = 0
  for (const ch of text) width += HANGUL.test(ch) ? FONT_SIZE : FONT_SIZE * 0.55
  return Math.ceil(width) + LABEL_PAD_X * 2
}

function candidateRect(anchor: LabelAnchor, cx: number, cy: number, w: number): Rect {
  const half = w / 2
  const halfH = LABEL_HEIGHT / 2
  const box = {
    bottom: { left: cx - half, top: cy + GAP },
    top: { left: cx - half, top: cy - GAP - LABEL_HEIGHT },
    right: { left: cx + GAP, top: cy - halfH },
    left: { left: cx - GAP - w, top: cy - halfH },
  }[anchor]
  return { left: box.left, top: box.top, right: box.left + w, bottom: box.top + LABEL_HEIGHT }
}

function dotRect(cx: number, cy: number): Rect {
  const r = DOT_SIZE / 2
  return { left: cx - r, top: cy - r, right: cx + r, bottom: cy + r }
}

function overlaps(a: Rect, b: Rect): boolean {
  const m = COLLISION_MARGIN
  return a.left < b.right + m && a.right > b.left - m
    && a.top < b.bottom + m && a.bottom > b.top - m
}

function withinBounds(r: Rect, width: number, height: number): boolean {
  return r.left >= -OVERFLOW_ALLOWANCE && r.right <= width + OVERFLOW_ALLOWANCE
    && r.top >= -OVERFLOW_ALLOWANCE && r.bottom <= height + OVERFLOW_ALLOWANCE
}

/** 측정 전이거나 자리를 못 찾았을 때 — 점 바로 아래 가운데 */
const fallback = (it: LabelInput): LabelPlacement =>
  ({ id: it.id, anchor: 'bottom', dx: -estimateLabelWidth(it.text) / 2, dy: GAP, hidden: false })

/**
 * @param width  플롯 안쪽 너비(px). 0 이면 아직 측정 전이므로 기본 배치를 돌려준다.
 * @param height 플롯 안쪽 높이(px)
 */
export function placeLabels(
  items: readonly LabelInput[], width: number, height: number,
): LabelPlacement[] {
  if (width <= 0 || height <= 0) return items.map(fallback)

  const toPx = (it: LabelInput) => ({
    cx: (it.xPct / 100) * width,
    cy: (it.yPct / 100) * height,
  })

  // 점은 라벨보다 먼저 자리를 차지한다 — 남의 라벨이 점을 덮지 않게
  const occupied: Rect[] = items.map((it) => {
    const { cx, cy } = toPx(it)
    return dotRect(cx, cy)
  })

  // 위에서 아래로 훑어야 같은 입력에 늘 같은 배치가 나온다
  const ordered = [...items].sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct)
  const placed = new Map<string, LabelPlacement>()

  for (const it of ordered) {
    const { cx, cy } = toPx(it)
    const w = estimateLabelWidth(it.text)

    const fit = ANCHOR_ORDER
      .map((anchor) => ({ anchor, rect: candidateRect(anchor, cx, cy, w) }))
      .find(({ rect }) =>
        withinBounds(rect, width, height) && !occupied.some((o) => overlaps(rect, o)))

    if (!fit) {
      placed.set(it.id, { ...fallback(it), hidden: true })
      continue
    }
    occupied.push(fit.rect)
    placed.set(it.id, {
      id: it.id, anchor: fit.anchor, hidden: false,
      dx: fit.rect.left - cx, dy: fit.rect.top - cy,
    })
  }

  return items.map((it) => placed.get(it.id) ?? fallback(it))
}
