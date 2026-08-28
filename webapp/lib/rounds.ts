/**
 * 유찰 회차 환산 — 최저입찰가÷감정가 비율을 "몇 번 유찰됐나"로 번역한다.
 *
 * 스케줄은 두 가지가 정해야 완성된다.
 *   ① 저감률 — 유찰될 때마다 얼마나 깎는가
 *   ② 시작 비율 — 1회차 최저가가 감정가의 몇 %인가
 *
 * ②를 100%로 고정하면 안 된다. 실제 공고문(무궁화신탁 2024-0900-072590)의
 * 1회차는 감정가의 108.9%였고, 이걸 100%로 두면 5회차짜리 물건이 4.1회차로 계산된다.
 * 시작 비율은 물건마다 다르므로 사용자가 공고문을 보고 넣게 한다.
 *
 * ⚠️ 2026-08-26 정정 — 국세징수법 제87조 확인
 *    캠코 압류재산 재공매는 매 회차 최초 공매예정가격의 10%씩 체감하되 **50%가 하한**이고,
 *    50%에서도 매각되지 않으면 새로 공매예정가격을 정하여 재공매한다.
 *    즉 1차 공매 사이클은 6회차(50%)에서 끝나며, 그 아래 비율은 회차로 환산할 수 없다.
 *    (이전 구현은 2025년 39.2%를 '12.0회차'로 표시했다 — 나올 수 없는 값이었다)
 *
 *    50% 미만은 재감정을 거쳐 새 공매예정가격에서 다시 내려간 물건이 섞였다는 뜻이므로,
 *    분모(원 감정가)와 분자(새 기준 최저가)의 기준이 다르다. 회차 대신 '재공매 구간'으로 표기한다.
 */

export type ScheduleId = 'camco' | 'trust' | 'court' | 'court_seoul' | 'custom'
export type Decay = 'linear' | 'geometric'
export type Evidence = '법령확인' | '관측됨' | '미확인'

/**
 * 국세징수법 제87조가 정한 압류재산 1차 공매 사이클의 하한.
 * 이 아래는 유찰 회차가 아니라 재공매(재감정) 구간이다.
 */
export const STATUTORY_FLOOR_PCT = 50
export const STATUTORY_FLOOR_ROUND = 6

/** 저감률까지만 정의한 제도 — 시작 비율은 아직 안 정해졌다 */
export interface ScheduleSpec {
  id: ScheduleId
  label: string
  detail: string
  /** 근거 수준 — 화면에 배지로 노출한다 */
  evidence: Evidence
  evidenceNote: string
  decay: Decay
  /**
   * 이 제도가 법으로 정한 저감 하한(감정가 대비 %). 없으면 하한 없음.
   * 하한 아래 비율은 회차로 환산하지 않는다.
   */
  floorPct?: number
  /** 하한 아래 구간을 화면에서 뭐라 부를지 */
  belowFloorLabel?: string
  /** linear: 매 회차 감정가의 step%p 차감 · geometric: 매 회차 직전가의 (100-step)% */
  step: number
  /** 공고문에서 실제로 관측된 1회차 시작 비율(%) — 있으면 화면에서 힌트로 쓴다 */
  observedStartPct?: number
}

/** 시작 비율까지 확정된 스케줄 */
export interface Schedule extends ScheduleSpec {
  startPct: number
  /** 회차 n(1부터)에서 최저가가 감정가의 몇 %인가 */
  ratioAt: (round: number) => number
}

export const DEFAULT_START_PCT = 100
export const MIN_START_PCT = 50
export const MAX_START_PCT = 200

export const SCHEDULES: Record<Exclude<ScheduleId, 'custom'>, ScheduleSpec> = {
  camco: {
    id: 'camco',
    label: '캠코 공매 (압류재산)',
    detail: '유찰될 때마다 감정가의 10%씩 · 50%에서 멈춤',
    evidence: '법령확인',
    evidenceNote:
      '국세징수법 제87조에 적혀 있는 규칙입니다. 안 팔릴 때마다 처음 값의 10%씩 깎되 감정가의 50%까지만 깎고, ' +
      '그래도 안 팔리면 값을 새로 정해 다시 팝니다. 그래서 한 바퀴는 6회차(감정가의 50%)에서 끝납니다. ' +
      '그보다 낮은 값이 보이면 유찰이 더 된 것이 아니라 이미 다시 감정받은 물건입니다. ' +
      '다만 압류재산이 아닌 다른 종류(국유·수탁·유입)의 규칙은 아직 확인하지 못했습니다.',
    decay: 'linear',
    step: 10,
    floorPct: STATUTORY_FLOOR_PCT,
    belowFloorLabel: '다시 감정받고 새로 시작한 구간',
  },
  trust: {
    id: 'trust',
    label: '신탁회사 공매',
    detail: '유찰될 때마다 직전 값의 90.5%로 (약 9.5%씩)',
    evidence: '관측됨',
    evidenceNote:
      '실제 공고문 한 건(2024-0900-072590 · 무궁화신탁 · 송파)의 10회차 기록을 직접 확인했습니다. ' +
      '첫 회차가 감정가의 108.9%에서 시작해 매번 직전 값의 90.5%로 내려갔고, ' +
      '이 두 값을 넣으면 10회차 전부가 오차 0.01%p 안에서 그대로 재현됩니다. 다만 사례가 1건뿐입니다.',
    decay: 'geometric',
    step: 9.5,
    observedStartPct: 108.9,
  },
  /**
   * ⭐ 2026-08-26 추가 — 조원 공유 자료(지지옥션 샘플 524건)로 확정한 값.
   *
   * 서울 6개 법원 524건의 최저입찰가÷감정가가 100 × 0.8^n 위에 **전수(524/524)** 놓인다.
   * 30% 사다리에는 213건만 맞는다. 서울은 20%다.
   * 그리고 캠코와 달리 **하한이 없다** — 감정가의 4.40%(15회차)까지 내려간 물건이 있다.
   * 근거 뷰: v_case_decay_fit · v_case_decay_steps
   */
  court_seoul: {
    id: 'court_seoul',
    label: '법원 경매 · 서울',
    detail: '유찰될 때마다 20%씩 · 멈추는 선 없음',
    evidence: '관측됨',
    evidenceNote:
      '조원이 공유한 지지옥션 샘플(서울 6개 법원 · 2022년 1월 · 524건)로 확인했습니다. ' +
      '감정가의 100% → 80% → 64% → 51.2%… 이렇게 20%씩 깎이는 계단 위에 524건이 하나도 빠짐없이 놓였습니다 ' +
      '(30%씩 깎는 계단에는 213건만 맞습니다). 캠코와 달리 멈추는 선이 없어서 ' +
      '감정가의 4.40%(15회차)까지 내려간 물건도 있습니다. ' +
      '다만 서울의 한 달치 샘플이라 다른 지역이나 다른 시기에도 같다고 말하지는 않습니다.',
    decay: 'geometric',
    step: 20,
    observedStartPct: 100,
  },
  court: {
    id: 'court',
    label: '법원 경매 · 그 밖의 지역',
    detail: '유찰될 때마다 30%씩',
    evidence: '관측됨',
    evidenceNote:
      '천안1계 2024타경116521 한 건에서, 첫 회차가 감정가의 100%였고 한 번 유찰된 뒤 정확히 70%가 된 것을 확인했습니다. ' +
      '사례가 1건뿐입니다. 서울 524건은 20%씩이었으니 깎는 비율은 법원마다 다릅니다 — ' +
      '내 물건이 어느 법원 소관인지 확인하고 고르세요.',
    decay: 'geometric',
    step: 30,
    observedStartPct: 100,
  },
}

/** 사용자 직접 입력용 — 선형 step%p */
export function customSpec(stepPct: number): ScheduleSpec {
  return {
    id: 'custom',
    label: '직접 입력',
    detail: `유찰될 때마다 감정가의 ${stepPct}%씩 깎기`,
    evidence: '미확인',
    evidenceNote: '직접 넣은 값입니다. 어떤 근거로도 확인되지 않았으니 참고용으로만 보세요.',
    decay: 'linear',
    step: stepPct,
  }
}

/** 제도 + 시작 비율 → 완성된 스케줄. 입력을 바꾸지 않고 새 객체를 만든다. */
export function buildSchedule(spec: ScheduleSpec, startPct: number): Schedule {
  const start = clampStartPct(startPct)
  const ratioAt =
    spec.decay === 'linear'
      ? (round: number) => start - spec.step * (round - 1)
      : (round: number) => start * Math.pow(1 - spec.step / 100, round - 1)
  return { ...spec, startPct: start, ratioAt }
}

export function clampStartPct(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_START_PCT
  return Math.min(MAX_START_PCT, Math.max(MIN_START_PCT, value))
}

const MAX_ROUND = 40

/**
 * 비율 → 회차. 스케줄이 단조감소라는 전제로 선형보간한다.
 * 1회차 값보다 높으면 1회차, MAX_ROUND 를 넘으면 null(환산 불가).
 */
export function ratioToRound(
  ratioPct: number,
  ratioAt: (round: number) => number,
): number | null {
  if (!Number.isFinite(ratioPct) || ratioPct <= 0) return null
  if (ratioPct >= ratioAt(1)) return 1

  for (let r = 1; r < MAX_ROUND; r++) {
    const hi = ratioAt(r)
    const lo = ratioAt(r + 1)
    if (lo <= 0) return null
    if (hi >= ratioPct && ratioPct >= lo) {
      return r + (hi - ratioPct) / (hi - lo)
    }
  }
  return null // 이 스케줄로는 그렇게까지 안 내려간다
}

/** 회차 수를 사람이 읽는 문장으로 */
export function describeRound(round: number | null): string {
  if (round === null) return '이 방식으로는 도달하지 않는 수준'
  if (round < 1.5) return '유찰 없이 첫 회차 수준'
  return `약 ${round.toFixed(1)}회차까지 유찰된 수준`
}

/**
 * 비율 판정 결과.
 *
 * 법정 하한(floorPct)이 있는 제도에서는 그 아래 비율을 회차로 환산하지 않는다.
 * 국세징수법 제87조상 압류재산 1차 공매 사이클은 6회차(50%)에서 끝나므로,
 * 39.2% 같은 값은 "12회차 유찰"이 아니라 "재감정을 거친 물건이 섞였다"는 신호다.
 */
export type RatioVerdict =
  | { kind: 'round'; round: number }
  | { kind: 'belowFloor'; floorPct: number; floorRound: number; gapPp: number; label: string }
  | { kind: 'unreachable' }

/** 하한이 있으면 하한 판정을 먼저 한다. 하한이 없는 제도는 기존 환산 그대로. */
export function classifyRatio(ratioPct: number, schedule: Schedule): RatioVerdict {
  if (!Number.isFinite(ratioPct) || ratioPct <= 0) return { kind: 'unreachable' }

  const floor = schedule.floorPct
  if (floor !== undefined && ratioPct < floor) {
    return {
      kind: 'belowFloor',
      floorPct: floor,
      floorRound: floorRoundOf(schedule),
      gapPp: Math.round((floor - ratioPct) * 10) / 10,
      label: schedule.belowFloorLabel ?? '하한 아래 구간',
    }
  }

  const round = ratioToRound(ratioPct, schedule.ratioAt)
  return round === null ? { kind: 'unreachable' } : { kind: 'round', round }
}

/** 하한 비율이 몇 회차인지 — 선형 제도면 계산, 아니면 법정 상수를 쓴다. */
export function floorRoundOf(schedule: Schedule): number {
  const floor = schedule.floorPct
  if (floor === undefined) return STATUTORY_FLOOR_ROUND
  const r = ratioToRound(floor, schedule.ratioAt)
  return r === null ? STATUTORY_FLOOR_ROUND : Math.round(r)
}

/** 판정을 사람이 읽는 문장으로. 하한 아래는 회차를 말하지 않는다. */
export function describeVerdict(v: RatioVerdict): string {
  switch (v.kind) {
    case 'unreachable':
      return '이 방식으로는 나올 수 없는 값입니다'
    case 'belowFloor':
      return `법이 정한 선(감정가의 ${v.floorPct}% · ${v.floorRound}회차)보다 ${v.gapPp}%p 더 내려갔습니다`
    case 'round':
      return v.round < 1.5
        ? '아직 한 번도 유찰되지 않은 수준입니다'
        : `${v.round.toFixed(1)}번쯤 유찰된 수준입니다`
  }
}

/** 하한 아래인지 한 줄로 — 배지·색상 분기용 */
export function isBelowFloor(
  v: RatioVerdict,
): v is Extract<RatioVerdict, { kind: 'belowFloor' }> {
  return v.kind === 'belowFloor'
}

/** 근거 배지의 CSS 클래스 — 법령확인 > 관측됨 > 미확인 */
export function evidenceTone(evidence: Evidence): string {
  switch (evidence) {
    case '법령확인': return 'b-law'
    case '관측됨':   return 'b-ok'
    case '미확인':   return 'b-un'
  }
}
