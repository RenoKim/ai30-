/**
 * 브라우저에서 PDF → 텍스트. pdf.js 만 쓰고 서버로 파일을 보내지 않는다.
 *
 * ⚠️ 왜 이렇게 복잡한가
 * 이 PDF 는 **한글 한 글자가 각각 하나의 조각**으로 들어 있다. 그냥 이어붙이면
 * 읽는 순서(콘텐츠 스트림 순서)를 따라가는데, 그건 표의 시각적 행 순서와 다르다.
 * 그래서 y 로 줄을 묶고 x 로 정렬해 `pdftotext -layout` 과 같은 모양을 만든다.
 *
 * 값은 실측으로 정했다. yTol 7 에서 파이썬(pdftotext) 경로와
 * **100행 × 12필드가 완전히 일치**한다. 함부로 바꾸지 말 것 —
 * 바꾸려면 scripts/parse_ggauction_pdf.py 결과와 다시 대조해야 한다.
 */

/** 같은 줄로 볼 y 오차. 표 한 칸 안에서 글자 높이가 최대 6 정도 흔들린다 */
const Y_TOLERANCE = 7
/** 이보다 벌어지면 다른 열로 보고 공백을 채운다 */
const COLUMN_GAP = 6
/** 공백 하나의 대략적인 너비 */
const COLUMN_WIDTH = 5.2

interface Piece { x: number; y: number; w: number; str: string }

/** pdf.js 는 브라우저에서만 불러온다 (서버 번들에 들어가면 안 된다) */
async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()
  return pdfjs
}

function assembleLine(pieces: Piece[]): string {
  const sorted = [...pieces].sort((a, b) => a.x - b.x)
  let line = ''
  let prevEnd: number | null = null
  for (const p of sorted) {
    if (prevEnd !== null && p.x - prevEnd > COLUMN_GAP) {
      line += ' '.repeat(Math.max(1, Math.round((p.x - prevEnd) / COLUMN_WIDTH)))
    }
    line += p.str
    prevEnd = p.x + p.w
  }
  return line.trimEnd()
}

function toLines(pieces: Piece[]): string[] {
  const sorted = [...pieces].sort((a, b) => b.y - a.y || a.x - b.x)
  const groups: { y: number; items: Piece[] }[] = []
  for (const p of sorted) {
    const last = groups[groups.length - 1]
    if (last && Math.abs(last.y - p.y) <= Y_TOLERANCE) last.items.push(p)
    else groups.push({ y: p.y, items: [p] })
  }
  return groups.map((g) => assembleLine(g.items))
}

/** PDF 바이트 → pdftotext -layout 과 같은 모양의 텍스트 */
export async function pdfToLayoutText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await loadPdfjs()
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const pages: string[] = []
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      const pieces = content.items.flatMap((item) => {
        if (!('str' in item) || typeof item.str !== 'string' || !item.str.length) return []
        return [{
          x: item.transform[4] as number,
          y: item.transform[5] as number,
          w: item.width ?? 0,
          str: item.str,
        }]
      })
      pages.push(toLines(pieces).join('\n'))
      page.cleanup()
    }
  } finally {
    await doc.destroy()
  }
  return pages.join('\n')
}
