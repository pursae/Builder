/* Placement of canvas overlay chips (spacing pills, gap pills) around the selection without covering it. */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Pt {
  x: number
  y: number
}

export interface PillReq {
  id: string
  w: number
  h: number
  /** Top-left candidates in tiers, best first; a tier (with sliding) is exhausted before the next one is tried. */
  at: Pt[][]
  /** Blocked candidates may slide along this axis to find room. */
  slide?: 'x' | 'y' | 'xy'
  /** Max slide distance in px. */
  reach?: number
}

export const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h })
export const grow = (r: Box, d: number): Box => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d })
export const hits = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
export const rel = (r: DOMRect, o: DOMRect): Box => ({ x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height })

let ctx: CanvasRenderingContext2D | null = null
const widths = new Map<string, number>()
/** Rendered width of a single-line label. */
export function textW(text: string, font = '600 10px Inter, sans-serif') {
  const k = `${font}|${text}`
  const hit = widths.get(k)
  if (hit !== undefined) return hit
  ctx ??= document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * 6
  ctx.font = font
  const w = Math.ceil(ctx.measureText(text).width)
  if (document.fonts.status === 'loaded') widths.set(k, w)
  return w
}

/** Pixel value of sections.padY() at a given page width (clamp with cqi). */
export const padPx = (p: number, pageW: number) => (p ? Math.min(p, Math.max(Math.round(p * 0.5), (p / 12) * (pageW / 100))) : 0)

/** Side + alignment around a box: t/r/b/l, then s(tart) / c(enter) / e(nd). */
export type Spot = 'ts' | 'tc' | 'te' | 'bs' | 'bc' | 'be' | 'ls' | 'lc' | 'le' | 'rs' | 'rc' | 're'

/** Candidate top-left points for a w×h chip placed `d` px outside `r`. */
export function around(r: Box, w: number, h: number, d: number, spots: Spot[]): Pt[] {
  return spots.map((s) => {
    const side = s[0]
    const al = s[1]
    if (side === 't' || side === 'b') {
      const y = side === 't' ? r.y - d - h : r.y + r.h + d
      const x = al === 's' ? r.x : al === 'e' ? r.x + r.w - w : r.x + (r.w - w) / 2
      return { x, y }
    }
    const x = side === 'l' ? r.x - d - w : r.x + r.w + d
    const y = al === 's' ? r.y : al === 'e' ? r.y + r.h - h : r.y + (r.h - h) / 2
    return { x, y }
  })
}

const STEP = 8

/**
 * Greedy layout: each request (in priority order) takes the first candidate that stays inside `bounds` and clears
 * the hard obstacles and already placed chips; a first pass also avoids soft obstacles (neighbouring content).
 * Blocked candidates may slide along their axis. Requests with no room come back as null (hidden).
 */
export function layoutPills(reqs: PillReq[], hard: Box[], soft: Box[], bounds: Box, gap = 3): Record<string, Pt | null> {
  const placed: Box[] = []
  const out: Record<string, Pt | null> = {}
  const free = (r: Box, strict: boolean) => {
    if (r.y < bounds.y || r.y + r.h > bounds.y + bounds.h || r.x < bounds.x || r.x + r.w > bounds.x + bounds.w) return false
    const g = grow(r, gap)
    if (hard.some((o) => hits(g, o)) || placed.some((o) => hits(g, o))) return false
    const core = grow(r, -1) // sub-pixel contact with neighbouring content is fine
    return !strict || !soft.some((o) => hits(core, o))
  }
  const clampX = (x: number, w: number) => Math.max(bounds.x, Math.min(bounds.x + bounds.w - w, x))
  for (const q of reqs) {
    const at = (x: number, y: number, strict: boolean): Pt | null => {
      const p = { x: Math.round(clampX(x, q.w)), y: Math.round(y) }
      return free({ ...p, w: q.w, h: q.h }, strict) ? p : null
    }
    const axes = q.slide === 'xy' ? (['x', 'y'] as const) : q.slide ? [q.slide] : []
    const steps = Math.ceil((q.reach ?? 120) / STEP)
    const find = (strict: boolean): Pt | null => {
      for (const tier of q.at) {
        for (const c of tier) {
          const p = at(c.x, c.y, strict)
          if (p) return p
        }
        for (let k = 1; k <= steps && axes.length; k++)
          for (const c of tier)
            for (const a of axes)
              for (const sgn of [1, -1]) {
                const p = at(c.x + (a === 'x' ? sgn * k * STEP : 0), c.y + (a === 'y' ? sgn * k * STEP : 0), strict)
                if (p) return p
              }
      }
      return null
    }
    const got = find(true) ?? find(false)
    out[q.id] = got
    if (got) placed.push({ ...got, w: q.w, h: q.h })
  }
  return out
}
