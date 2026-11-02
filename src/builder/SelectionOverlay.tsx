import { useLayoutEffect, useState, type PointerEvent as RPointerEvent, type ReactNode, type RefObject } from 'react'
import { CARD_NOUN, GRID_CAPS, fieldKind, findSection, getBox, getGrid, isCardEl } from './data'
import { around, box, grow, hits, layoutPills, padPx, rel, textW, type Box, type PillReq, type Pt } from './overlayLayout'
import { useB } from './store'
import type { Box4, Section } from './types'
import { cn } from './ui'

/* Selection overlay: spacing / gap pills and resize handles, laid out around the selection so they never cover it. */

const H = 16 // pill height
const DOT = 12 // collapsed (0 px) chip
const FONT = '600 10px Inter, sans-serif'
const TONE = { margin: '240 132 44', padding: '38 166 92', gap: '150 82 235' } as const
type Tone = keyof typeof TONE

const pillW = (arrow: string, text: string) => textW(`${arrow} ${text}`, FONT) + 14

function hatch(tone: Tone, strong = false) {
  const c = TONE[tone]
  return `repeating-linear-gradient(-45deg, rgb(${c} / ${strong ? 0.26 : 0.17}) 0 5px, rgb(${c} / ${strong ? 0.1 : 0.05}) 5px 10px)`
}

/** Pointer drag helper: calls `move` with the delta along the axis until release. */
function drag(e: RPointerEvent, axis: 'x' | 'y', move: (d: number, fine: boolean) => void, end: () => void) {
  e.preventDefault()
  e.stopPropagation()
  const p0 = axis === 'x' ? e.clientX : e.clientY
  document.body.style.cursor = axis === 'x' ? 'ew-resize' : 'ns-resize'
  const mv = (ev: PointerEvent) => move((axis === 'x' ? ev.clientX : ev.clientY) - p0, ev.shiftKey)
  const up = () => {
    window.removeEventListener('pointermove', mv)
    window.removeEventListener('pointerup', up)
    document.body.style.cursor = ''
    end()
  }
  window.addEventListener('pointermove', mv)
  window.addEventListener('pointerup', up)
}

function Chip({ at, w, tone, arrow, text, dot, live, flip, axis, onDown }: { at: Pt; w: number; tone: Tone; arrow: string; text: string; dot: boolean; live: boolean; flip: boolean; axis: 'x' | 'y'; onDown: (e: RPointerEvent) => void }) {
  const c = TONE[tone]
  return (
    <button
      type="button"
      onPointerDown={onDown}
      onClick={(e) => e.stopPropagation()}
      title="Sürükleyerek değiştir · Shift ile 1px adım"
      className={cn('group pointer-events-auto absolute grid place-items-center', axis === 'x' ? 'cursor-ew-resize' : 'cursor-ns-resize', live && 'z-[2]')}
      style={{ left: at.x, top: at.y, width: w, height: dot ? DOT : H }}
    >
      {dot ? (
        <>
          <span className="size-[9px] rounded-full shadow-[0_0_0_1.5px_rgb(255_255_255/.9),0_1px_3px_rgb(0_0_0/.3)] transition-transform group-hover:scale-125" style={{ background: `rgb(${c})` }} />
          <span
            className={cn('pointer-events-none absolute top-1/2 hidden h-4 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-[10px] font-semibold leading-none text-white shadow-md group-hover:flex', flip ? 'right-[calc(100%+3px)]' : 'left-[calc(100%+3px)]')}
            style={{ background: `rgb(${c} / .95)` }}
          >
            <span>{arrow}</span>
            {text}
          </span>
        </>
      ) : (
        <span
          className={cn(
            'flex h-4 w-full items-center justify-center gap-1 whitespace-nowrap rounded-full text-[10px] font-semibold leading-none text-white shadow-[0_1px_3px_rgb(0_0_0/.28)] ring-1 ring-black/10 backdrop-blur-sm transition-transform group-hover:scale-105',
            live && 'scale-105 ring-2 ring-white/80',
          )}
          style={{ background: `rgb(${c} / .9)` }}
        >
          <span>{arrow}</span>
          {text}
        </span>
      )}
    </button>
  )
}

interface Spec extends PillReq {
  tone: Tone
  arrow: string
  text: string
  dot: boolean
  axis: 'x' | 'y'
  onDown: (e: RPointerEvent) => void
}

/** Non-zero first, 0 px dots last; while dragging only the live chip. */
const ordered = (specs: Spec[], live: string | null) => (live ? specs.filter((p) => p.id === live) : [...specs.filter((p) => !p.dot), ...specs.filter((p) => p.dot)])

function ChipList({ list, pos, bounds, live }: { list: Spec[]; pos: Record<string, Pt | null>; bounds: Box; live: string | null }) {
  return (
    <>
      {list.map((p) => {
        const at = pos[p.id]
        return at ? <Chip key={p.id} at={at} w={p.w} tone={p.tone} arrow={p.arrow} text={p.text} dot={p.dot} live={live === p.id} flip={at.x > bounds.x + bounds.w / 2} axis={p.axis} onDown={p.onDown} /> : null
      })}
    </>
  )
}

/** Lays out the specs and renders the ones that found room. */
function Chips({ specs, hard, soft, bounds, live }: { specs: Spec[]; hard: Box[]; soft: Box[]; bounds: Box; live: string | null }) {
  const list = ordered(specs, live)
  return <ChipList list={list} pos={layoutPills(list, hard, soft, bounds)} bounds={bounds} live={live} />
}

/** Fixed canvas UI of a section (label, toolbars, decor handle) that chips must not cover. */
function avoidRects(sec: Element | null, fr: DOMRect) {
  if (!sec) return []
  return Array.from(sec.querySelectorAll('[data-ovl-avoid]'))
    .filter((e) => e.closest('[data-section]') === sec)
    .map((e) => rel(e.getBoundingClientRect(), fr))
    .filter((r) => r.w > 0)
}

/** Leaf content elements inside `scope` (chips try not to cover them). */
function contentRects(scope: Element | null, fr: DOMRect, skip?: Element, near?: Box) {
  if (!scope) return []
  const out: Box[] = []
  for (const e of Array.from(scope.querySelectorAll('[data-el]'))) {
    if (skip && (e === skip || e.contains(skip) || skip.contains(e)) || e.querySelector('[data-el]')) continue
    const r = rel(e.getBoundingClientRect(), fr)
    if (r.w > 0 && r.h > 0 && (!near || hits(r, near))) out.push(r)
    if (out.length > 160) break
  }
  return out
}

export function SelectionOverlay({ page }: { page: RefObject<HTMLDivElement | null> }) {
  const b = useB()
  const sel = b.selection
  const s = sel ? findSection(b.doc, sel.sectionId) : undefined
  if (!sel || !s || b.preview || s.hidden || b.mode === 'ai') return null
  let layer: ReactNode = null
  if (!sel.el) layer = <SectionLayer key={s.id} s={s} page={page} />
  else layer = <ElementLayer key={`${s.id}:${sel.el}`} s={s} el={sel.el} page={page} />
  // Above sections, below the floating structure panel (z-40).
  return <div className={cn('ovl pointer-events-none absolute inset-0 z-[35] transition-opacity duration-150', b.dragging && 'opacity-0')}>{layer}</div>
}

/* ---------- Selected element / card / cell: margin + padding on all four sides, width / height handles ---------- */
type Side = 't' | 'r' | 'b' | 'l'
type SpaceKey = `m${Side}` | `p${Side}`
const SIDES: Side[] = ['t', 'r', 'b', 'l']
const SIDE_NAME: Record<Side, string> = { t: 'top', r: 'right', b: 'bottom', l: 'left' }
const SIDE_BASIC: Record<Side, string> = { t: 'Üst', r: 'Sağ', b: 'Alt', l: 'Sol' }
const vertical = (sd: Side) => sd === 't' || sd === 'b'

interface ElM {
  r: Box
  m: Box4
  p: Box4
  label: string
  bounds: Box
  avoid: Box[]
  soft: Box[]
}

function ElementLayer({ s, el, page }: { s: Section; el: string; page: RefObject<HTMLDivElement | null> }) {
  const b = useB()
  const [m, setM] = useState<ElM | null>(null)
  const [live, setLive] = useState<SpaceKey | 'w' | 'h' | null>(null)
  // Flexbox / Grid cells: the frame is the cell box (its padding lives on the item); cells have no margin of their own.
  const cell = s.kind === 'layout' && el.startsWith('items.')
  const card = isCardEl(el) && !!CARD_NOUN[s.kind]

  useLayoutEffect(() => {
    const root = page.current
    const inner = root?.querySelector<HTMLElement>(`[data-el="${s.id}:${el}"]`)
    const node = cell ? inner?.closest<HTMLElement>('.cell') : inner
    if (!root || !node) {
      setM(null)
      return
    }
    const sec = node.closest('[data-section]')
    const measure = () => {
      const fr = root.getBoundingClientRect()
      const r = rel(node.getBoundingClientRect(), fr)
      if (r.w === 0 && r.h === 0) return setM(null)
      const cs = getComputedStyle(node)
      const four = (p: 'margin' | 'padding'): Box4 => ({ t: parseFloat(cs[`${p}Top`]) || 0, r: parseFloat(cs[`${p}Right`]) || 0, b: parseFloat(cs[`${p}Bottom`]) || 0, l: parseFloat(cs[`${p}Left`]) || 0 })
      setM({
        r,
        m: four('margin'),
        p: four('padding'),
        label: (cell ? node : inner)?.getAttribute('data-label') ?? '',
        bounds: box(0, 0, fr.width, fr.height),
        avoid: avoidRects(sec, fr),
        soft: contentRects(sec, fr, node, grow(r, 240)),
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    ro.observe(root)
    const t = window.setTimeout(measure, 520) // after layout / width transitions settle
    return () => {
      ro.disconnect()
      window.clearTimeout(t)
    }
  }, [s, el, b.device, b.mode, page, cell])

  if (!m) return null
  const studio = b.mode === 'studio'
  const kind = fieldKind(s, el)
  const softH = kind === 'heading' || kind === 'text' || kind === 'link'
  const E = m.r
  // Selection outline (outline-offset + width) and the CSS type badge above-left of it.
  const ring = studio ? 6 : 8
  const O = grow(E, ring)
  const bh = studio ? 18.5 : 20.5
  const badge = box(E.x - (studio ? 5 : 8), E.y - (studio ? 5 : 8) - bh, textW(m.label, '600 10.5px Inter, sans-serif') + (studio ? 14 : 18), bh)
  // Resize handles sit on the outline, outside the content.
  const hw = { x: Math.min(m.bounds.w - 5, E.x + E.w + ring), y: E.y + E.h / 2 }
  const hh = { x: E.x + E.w / 2, y: Math.min(m.bounds.h - 5, E.y + E.h + ring) }
  // Icons are sized from the inspector (glyph + tile); cards and cells size from their grid.
  const sizable = studio && kind !== 'icon' && !card && !cell
  const handles = sizable ? [box(hw.x - 6, hw.y - 14, 12, 28), box(hh.x - 14, hh.y - 6, 28, 12)] : []
  // Padding is offered where it shapes a box: cards, cells, buttons, badges, free-form boxes.
  const padOk = studio && (card || cell || kind === 'button' || kind === 'badge' || kind === 'box')
  const marginOk = !cell
  const P = m.p
  const content = box(E.x + P.l, E.y + P.t, Math.max(0, E.w - P.l - P.r), Math.max(0, E.h - P.t - P.b))

  const startSpace = (e: RPointerEvent, key: SpaceKey) => {
    const pad = key[0] === 'p'
    const side = key[1] as Side
    const start = Math.round(pad ? m.p[side] : m.m[side])
    const dir = side === 'r' ? -1 : 1
    const base: Box4 = { t: Math.round(m.p.t), r: Math.round(m.p.r), b: Math.round(m.p.b), l: Math.round(m.p.l) }
    const item = cell ? s.items.find((i) => i.id === el.split('.')[1]) : undefined
    setLive(key)
    drag(
      e,
      vertical(side) ? 'y' : 'x',
      (d, fine) => {
        const step = fine ? 1 : 2
        const v = Math.max(pad ? 0 : -200, Math.min(400, Math.round((start + d * dir) / step) * step))
        if (!pad) b.dispatch({ type: 'elStyle', id: s.id, el, patch: { [`m${side}`]: v }, key: `drag-${key}` })
        else if (item) b.dispatch({ type: 'cellBox', id: s.id, itemId: item.id, patch: { padding: { ...(item.box?.padding ?? base), [side]: v } }, key: `drag-${key}` })
        else b.dispatch({ type: 'elStyle', id: s.id, el, patch: { padding: { ...(s.els?.[el]?.padding ?? base), [side]: v } }, key: `drag-${key}` })
      },
      () => setLive(null),
    )
  }

  const startResize = (e: RPointerEvent, axis: 'w' | 'h') => {
    const es = s.els?.[el] ?? {}
    const node = page.current?.querySelector<HTMLElement>(`[data-el="${s.id}:${el}"]`)
    const parent = node?.parentElement
    const pcs = parent ? getComputedStyle(parent) : null
    const unit = axis === 'w' ? (es.widthUnit ?? 'px') : (es.heightUnit ?? 'px')
    const base = unit === '%' ? (parent ? parent.clientWidth - parseFloat(pcs!.paddingLeft) - parseFloat(pcs!.paddingRight) : 1) : unit === 'vw' ? window.innerWidth : unit === 'vh' ? window.innerHeight : 1
    const start = axis === 'w' ? E.w : E.h
    setLive(axis)
    drag(
      e,
      axis === 'w' ? 'x' : 'y',
      (d, fine) => {
        const px = Math.max(axis === 'w' ? 20 : 0, start + d)
        const step = fine ? 1 : 4
        const v = unit === 'px' ? Math.min(axis === 'w' ? 1600 : 1000, Math.round(px / step) * step) : Math.max(1, Math.min(100, Math.round((px / base) * 100)))
        b.dispatch({ type: 'elStyle', id: s.id, el, patch: axis === 'w' ? { width: v, widthUnit: unit as 'px' | '%' | 'vw' } : { height: v, heightUnit: unit as 'px' | 'vh' }, key: `drag-${axis}` })
      },
      () => setLive(null),
    )
  }

  const es = s.els?.[el]
  const sizeLabel = (axis: 'w' | 'h') =>
    axis === 'w' ? (es?.width !== undefined ? `${es.width}${es.widthUnit ?? 'px'}` : `${Math.round(E.w)}px`) : es?.height !== undefined ? `${es.height}${es.heightUnit ?? 'px'}` : `${Math.round(E.h)}px`
  const resizer = (axis: 'w' | 'h') => {
    const c = axis === 'w' ? hw : hh
    return (
      <button
        key={axis}
        type="button"
        onPointerDown={(e) => startResize(e, axis)}
        onClick={(e) => e.stopPropagation()}
        title={`Sürükleyerek ${axis === 'w' ? 'genişliği' : 'yüksekliği'} değiştir · Shift ile 1px adım`}
        className={cn('group pointer-events-auto absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center transition-opacity', axis === 'w' ? 'h-7 w-3 cursor-ew-resize' : 'h-3 w-7 cursor-ns-resize', live && live !== axis && 'opacity-0')}
        style={{ left: c.x, top: c.y }}
      >
        <span className={cn('rounded-full bg-[#3d63f5] shadow-[0_0_0_1.5px_#fff,0_1px_3px_rgb(0_0_0/.3)] transition-transform group-hover:scale-110', axis === 'w' ? 'h-5 w-[5px]' : 'h-[5px] w-5', live === axis && 'scale-110')} />
        {live === axis && (
          <span className={cn('pointer-events-none absolute whitespace-nowrap rounded-full bg-[#3d63f5] px-1.5 py-[3px] text-[10px] font-semibold leading-none text-white shadow-md', axis === 'w' ? 'left-4' : 'top-4')}>
            {axis === 'w' ? 'width' : softH ? 'min-height' : 'height'} · {sizeLabel(axis)}
          </span>
        )}
      </button>
    )
  }

  const chipText = (pad: boolean, sd: Side, v: number) =>
    studio ? `${pad ? 'padding' : 'margin'}-${SIDE_NAME[sd]} · ${v}px` : `${SIDE_BASIC[sd]}${sd === 't' || sd === 'b' ? 'taki' : 'daki'} boşluk · ${v}`

  // Padding chips: centred in their padding band when they fit there, otherwise just outside the outline on that side.
  const padSpecs: Spec[] = !padOk
    ? []
    : SIDES.map((sd) => {
        const key: SpaceKey = `p${sd}`
        const v = Math.round(P[sd])
        const text = chipText(true, sd, v)
        const arrow = vertical(sd) ? '↕' : '↔'
        const dot = v === 0 && live !== key
        const w = dot ? DOT : pillW(arrow, text)
        const h = dot ? DOT : H
        const tiers: Pt[][] = []
        if (vertical(sd) ? v >= h + 4 && E.w >= w + 8 : v >= w + 4 && content.h >= h) {
          const x = vertical(sd) ? E.x + (E.w - w) / 2 : sd === 'l' ? E.x + (v - w) / 2 : E.x + E.w - v + (v - w) / 2
          const y = vertical(sd) ? (sd === 't' ? E.y + (v - h) / 2 : E.y + E.h - v + (v - h) / 2) : E.y + (E.h - h) / 2
          tiers.push([{ x, y }])
        }
        tiers.push(around(O, w, h, 1, sd === 't' ? ['tc'] : sd === 'b' ? ['bc'] : sd === 'l' ? ['lc'] : ['rc']))
        tiers.push(around(O, w, h, 1, sd === 't' ? ['ts', 'te'] : sd === 'b' ? ['bs', 'be'] : sd === 'l' ? ['ls', 'le'] : ['rs', 're']))
        return { id: key, w, h, at: tiers, slide: vertical(sd) ? 'x' : 'y', reach: 64, tone: 'padding', arrow, text, dot, axis: vertical(sd) ? 'y' : 'x', onDown: (e) => startSpace(e, key) }
      })

  // Margin chips: inside the margin zone when it has room next to the outline, otherwise around the outline.
  const marginSpecs: Spec[] = !marginOk
    ? []
    : SIDES.filter((sd) => studio || vertical(sd)).map((sd) => {
        const key: SpaceKey = `m${sd}`
        const v = Math.round(m.m[sd])
        const text = chipText(false, sd, v)
        const arrow = vertical(sd) ? '↕' : '↔'
        const dot = v === 0 && live !== key
        const w = dot ? DOT : pillW(arrow, text)
        const h = dot ? DOT : H
        const z = Math.max(0, v)
        const tiers: Pt[][] = []
        if (vertical(sd)) {
          const top = sd === 't'
          if (z >= h + ring + 2) {
            const off = z >= h + 2 * (ring + 2) ? (z - h) / 2 : ring + 1
            const y = top ? E.y - off - h : E.y + E.h + off
            tiers.push([{ x: E.x + E.w - w, y }, { x: E.x, y }, { x: E.x + (E.w - w) / 2, y }])
          }
          tiers.push(around(O, w, h, 1, top ? ['te', 'ts', 'tc'] : ['be', 'bs', 'bc']))
          tiers.push(around(O, w, h, studio ? 10 : 4, top ? ['rs', 'ls'] : ['re', 'le']))
          tiers.push(around(O, w, h, 1, top ? ['be', 'bs'] : ['te', 'ts']))
        } else {
          const left = sd === 'l'
          if (z >= w + ring + 2) {
            const off = z >= w + 2 * (ring + 2) ? (z - w) / 2 : ring + 1
            tiers.push([{ x: left ? E.x - off - w : E.x + E.w + off, y: E.y + (E.h - h) / 2 }])
          }
          tiers.push(around(O, w, h, 1, left ? ['ls', 'le', 'lc'] : ['rs', 're', 'rc']))
          tiers.push(around(O, w, h, 1, left ? ['ts', 'bs'] : ['te', 'be']))
        }
        return { id: key, w, h, at: tiers, slide: 'xy', reach: 64, tone: 'margin', arrow, text, dot, axis: vertical(sd) ? 'y' : 'x', onDown: (e) => startSpace(e, key) }
      })

  // Padding chips may sit inside the box but never on its content; margin chips stay outside the outline.
  const outer = [badge, ...handles, ...m.avoid]
  const padList = ordered(padSpecs, live)
  const padPos = layoutPills(padList, [grow(content, 1), ...outer], m.soft, m.bounds)
  const placed = padList.flatMap((p) => (padPos[p.id] ? [box(padPos[p.id]!.x, padPos[p.id]!.y, p.w, p.h)] : []))
  const marginList = ordered(marginSpecs, live)
  // Chips keep a 3px gap from hard obstacles, so the outline is passed in 2px tighter: they may sit 1px off it.
  const marginPos = layoutPills(marginList, [grow(E, ring - 2), ...outer, ...placed], m.soft, m.bounds)

  const zones: ReactNode[] = []
  for (const sd of SIDES) {
    const mk: SpaceKey = `m${sd}`
    const pk: SpaceKey = `p${sd}`
    const mv = Math.round(m.m[sd])
    const pv = Math.round(P[sd])
    const zone = (key: SpaceKey, r: Box, tone: Tone) => zones.push(<div key={key} className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: hatch(tone, live === key) }} />)
    if (marginOk && mv > 0 && (studio || vertical(sd)) && (!live || live === mk))
      zone(mk, sd === 't' ? box(E.x, E.y - mv, E.w, mv) : sd === 'b' ? box(E.x, E.y + E.h, E.w, mv) : sd === 'l' ? box(E.x - mv, E.y, mv, E.h) : box(E.x + E.w, E.y, mv, E.h), 'margin')
    if (padOk && pv > 0 && (!live || live === pk))
      zone(pk, sd === 't' ? box(E.x, E.y, E.w, pv) : sd === 'b' ? box(E.x, E.y + E.h - pv, E.w, pv) : sd === 'l' ? box(E.x, E.y + P.t, pv, content.h) : box(E.x + E.w - pv, E.y + P.t, pv, content.h), 'padding')
  }

  const resizing = live === 'w' || live === 'h'
  return (
    <>
      {!resizing && zones}
      {sizable && resizer('w')}
      {sizable && resizer('h')}
      {!resizing && (
        <>
          <ChipList list={padList} pos={padPos} bounds={m.bounds} live={live} />
          <ChipList list={marginList} pos={marginPos} bounds={m.bounds} live={live} />
        </>
      )}
    </>
  )
}

/* ---------- Selected section / container: padding, margin and gap pills ---------- */
interface GapZone extends Box {
  axis: 'x' | 'y'
}

interface SecM {
  r: Box
  pageW: number
  bounds: Box
  avoid: Box[]
  soft: Box[]
  grid: Box | null
  gaps: GapZone[]
}

function measureGaps(grid: HTMLElement, fr: DOMRect): GapZone[] {
  const rects = Array.from(grid.children)
    .map((c) => c.getBoundingClientRect())
    .filter((r) => r.width > 0)
    .map((r) => ({ l: r.left - fr.left, t: r.top - fr.top, r: r.right - fr.left, b: r.bottom - fr.top }))
  const g = rel(grid.getBoundingClientRect(), fr)
  const rows: (typeof rects)[] = []
  for (const r of rects) {
    const row = rows.find((x) => Math.abs(x[0].t - r.t) < 3)
    if (row) row.push(r)
    else rows.push([r])
  }
  rows.sort((a, c) => a[0].t - c[0].t)
  const out: GapZone[] = []
  rows.forEach((row, ri) => {
    row.sort((a, c) => a.l - c.l)
    const top = Math.min(...row.map((r) => r.t))
    const bottom = Math.max(...row.map((r) => r.b))
    for (let i = 0; i < row.length - 1; i++) {
      const w = row[i + 1].l - row[i].r
      if (w >= 0) out.push({ axis: 'x', x: row[i].r, y: top, w: Math.max(w, 1), h: bottom - top })
    }
    const next = rows[ri + 1]
    if (next) {
      const nTop = Math.min(...next.map((r) => r.t))
      out.push({ axis: 'y', x: g.x, y: bottom, w: g.w, h: Math.max(nTop - bottom, 1) })
    }
  })
  return out
}

type BoxKey = 'pt' | 'pb' | 'pl' | 'pr' | 'mt' | 'mb' | 'ml' | 'mr'
type SecKey = BoxKey | 'gx' | 'gy'

function SectionLayer({ s, page }: { s: Section; page: RefObject<HTMLDivElement | null> }) {
  const b = useB()
  const [m, setM] = useState<SecM | null>(null)
  const [live, setLive] = useState<SecKey | null>(null)
  const caps = GRID_CAPS[s.kind]

  useLayoutEffect(() => {
    const root = page.current
    const sec = root?.querySelector<HTMLElement>(`[data-section="${s.id}"]`)
    if (!root || !sec) {
      setM(null)
      return
    }
    const grid = caps && (caps.gapX || caps.gapY) ? sec.querySelector<HTMLElement>(`[data-grid="${s.id}"]`) : null
    const measure = () => {
      const fr = root.getBoundingClientRect()
      const r = rel(sec.getBoundingClientRect(), fr)
      const g = grid ? rel(grid.getBoundingClientRect(), fr) : null
      const soft = contentRects(sec, fr)
      if (grid) for (const c of Array.from(grid.children)) soft.push(rel(c.getBoundingClientRect(), fr))
      setM({ r, pageW: root.clientWidth, bounds: box(0, 0, fr.width, fr.height), avoid: avoidRects(sec, fr), soft, grid: g && g.w > 0 ? g : null, gaps: grid && g && g.w > 0 ? measureGaps(grid, fr) : [] })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(sec)
    ro.observe(root)
    if (grid) Array.from(grid.children).forEach((c) => ro.observe(c))
    const t = window.setTimeout(measure, 520)
    return () => {
      ro.disconnect()
      window.clearTimeout(t)
    }
  }, [s, b.device, b.mode, page, caps])

  if (!m) return null
  const studio = b.mode === 'studio'
  const bx = getBox(s)
  const g = getGrid(s)
  const S = m.r

  const startBox = (e: RPointerEvent, which: BoxKey) => {
    const base = getBox(s)
    const pad = which[0] === 'p'
    const side = which[1] as Side
    const start = (pad ? base.padding : base.margin)[side]
    // Top margin grows upwards and right-hand spacing grows leftwards (towards the pointer); the rest follow it.
    const dir = which === 'mt' || which === 'pr' || which === 'ml' ? -1 : 1
    setLive(which)
    drag(
      e,
      vertical(side) ? 'y' : 'x',
      (d, fine) => {
        const step = fine ? 1 : 4
        const v = Math.max(0, Math.min(400, Math.round((start + d * dir) / step) * step))
        const patch = pad ? { padding: { ...base.padding, [side]: v } } : { margin: { ...base.margin, [side]: v } }
        b.dispatch({ type: 'box', id: s.id, patch, key: `drag-${which}` })
      },
      () => setLive(null),
    )
  }

  const startGap = (e: RPointerEvent, axis: 'x' | 'y') => {
    const start = axis === 'x' ? g.gapX : g.gapY
    setLive(axis === 'x' ? 'gx' : 'gy')
    drag(
      e,
      axis,
      (d, fine) => {
        const step = fine ? 1 : 2
        const v = Math.max(0, Math.min(200, Math.round((start + d) / step) * step))
        b.dispatch({ type: 'grid', id: s.id, patch: axis === 'x' ? { gapX: v } : { gapY: v }, key: `drag-${axis}` })
      },
      () => setLive(null),
    )
  }

  const zones: { key: SecKey; r: Box; tone: Tone }[] = []
  const specs: Spec[] = []
  const label = (studioName: string, basicName: string, v: number) => `${studio ? studioName : basicName} · ${v}${studio ? 'px' : ''}`

  // Padding (inside, right half) and margin (outside, left half) of the section box.
  const boxSpec = (key: 'pt' | 'pb' | 'mt' | 'mb') => {
    const top = key === 'pt' || key === 'mt'
    const margin = key === 'mt' || key === 'mb'
    const v = margin ? (top ? bx.margin.t : bx.margin.b) : top ? bx.padding.t : bx.padding.b
    const zh = margin ? v : padPx(v, m.pageW)
    const z = margin ? box(S.x, top ? S.y - zh : S.y + S.h, S.w, zh) : box(S.x, top ? S.y : S.y + S.h - zh, S.w, zh)
    if (zh > 0) zones.push({ key, r: z, tone: margin ? 'margin' : 'padding' })
    const text = label(`${margin ? 'margin' : 'padding'}-${top ? 'top' : 'bottom'}`, top ? 'Üst boşluk' : 'Alt boşluk', v)
    const dot = v === 0 && live !== key
    const w = dot ? DOT : pillW('↕', text)
    const h = dot ? DOT : H
    // Either side of the centred section toolbar; the far right is often under the floating structure panel.
    const xs = margin ? [S.x + S.w / 2 - 72 - w, S.x + S.w * 0.25 - w / 2] : [S.x + S.w / 2 + 72, S.x + S.w * 0.75 - w / 2]
    const at = (y: number) => xs.map((x) => ({ x, y }))
    const tiers: Pt[][] = []
    if (zh >= h + 8) tiers.push(at(z.y + (zh - h) / 2))
    tiers.push(at(top ? S.y + 5 : S.y + S.h - 5 - h))
    specs.push({ id: key, w, h, at: tiers, slide: 'x', reach: S.w, tone: margin ? 'margin' : 'padding', arrow: '↕', text, dot, axis: 'y', onDown: (e) => startBox(e, key) })
  }
  // Left / right spacing: chips just inside the section's side edges (padding below the middle, margin above it).
  const sideSpec = (key: 'pl' | 'pr' | 'ml' | 'mr') => {
    const margin = key[0] === 'm'
    const left = key[1] === 'l'
    const v = (margin ? bx.margin : bx.padding)[left ? 'l' : 'r']
    const text = label(`${margin ? 'margin' : 'padding'}-${left ? 'left' : 'right'}`, left ? 'Sol boşluk' : 'Sağ boşluk', v)
    const dot = v === 0 && live !== key
    const w = dot ? DOT : pillW('↔', text)
    const h = dot ? DOT : H
    const x = left ? S.x + 6 : S.x + S.w - 6 - w
    const cy = S.y + S.h / 2
    const y = margin ? cy - 6 - h : cy + 6
    specs.push({ id: key, w, h, at: [[{ x, y }]], slide: 'y', reach: S.h / 2 - h, tone: margin ? 'margin' : 'padding', arrow: '↔', text, dot, axis: 'x', onDown: (e) => startBox(e, key) })
  }
  boxSpec('pt')
  boxSpec('pb')
  if (studio) {
    boxSpec('mt')
    boxSpec('mb')
    sideSpec('pl')
    sideSpec('pr')
    sideSpec('ml')
    sideSpec('mr')
  }

  // Gaps of the section's item grid / list: hatch every gap, one pill per axis placed in the gap or just outside the grid.
  if (caps && m.grid) {
    const G = m.grid
    for (const axis of ['x', 'y'] as const) {
      if (!(axis === 'x' ? caps.gapX : caps.gapY)) continue
      const list = m.gaps.filter((z) => z.axis === axis)
      if (!list.length) continue
      const key = axis === 'x' ? 'gx' : 'gy'
      for (const z of list) zones.push({ key, r: z, tone: 'gap' })
      const v = axis === 'x' ? g.gapX : g.gapY
      const text = label(axis === 'x' ? 'column-gap' : 'row-gap', axis === 'x' ? 'Yan boşluk' : 'Alt boşluk', v)
      const arrow = axis === 'x' ? '↔' : '↕'
      const w = pillW(arrow, text)
      const z = list[0]
      const cx = z.x + z.w / 2 - w / 2
      const cy = z.y + z.h / 2 - H / 2
      // Inside the gap only when the pill fits there; otherwise just outside the grid, lined up with the gap.
      const tiers: Pt[][] = []
      if (axis === 'x') {
        if (z.w >= w + 4) tiers.push([{ x: cx, y: cy }])
        tiers.push([{ x: cx, y: G.y + G.h + 6 }], [{ x: cx, y: G.y - H - 6 }])
      } else {
        if (z.h >= H - 1) tiers.push([{ x: G.x + (G.w - w) / 2, y: cy }])
        tiers.push([{ x: G.x - w - 8, y: cy }, { x: G.x + G.w + 8, y: cy }], [{ x: G.x + (G.w - w) / 2, y: G.y + G.h + 6 }])
      }
      specs.push({ id: key, w, h: H, at: tiers, slide: 'x', reach: axis === 'x' ? 160 : G.w / 2, tone: 'gap', arrow, text, dot: false, axis, onDown: (e) => startGap(e, axis) })
    }
  }

  const order: SecKey[] = ['gx', 'gy', 'pt', 'pb', 'mt', 'mb', 'pl', 'pr', 'ml', 'mr']
  specs.sort((a, c) => order.indexOf(a.id as SecKey) - order.indexOf(c.id as SecKey))

  return (
    <>
      {zones
        .filter((z) => !live || z.key === live)
        .map((z, i) => (
          <div key={`${z.key}-${i}`} className="absolute" style={{ left: z.r.x, top: z.r.y, width: z.r.w, height: z.r.h, background: hatch(z.tone, live === z.key) }} />
        ))}
      <Chips specs={specs} hard={m.avoid} soft={m.soft} bounds={m.bounds} live={live} />
    </>
  )
}
