import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { ChevronDown, Columns3, Eye, EyeOff, GripVertical, LayoutGrid, RotateCcw, X } from 'lucide-react'
import { KINDS, isCardEl } from './data'
import { navId, navRows, openKeysFor, type NavRow } from './navTree'
import { restoreEl, toggleHideSelection } from './selectionActions'
import { useB } from './store'
import type { Section } from './types'
import { Tip, cn, ease, spring } from './ui'

interface NavCtx {
  open: string[]
  toggle: (key: string) => void
  /** Row under the pointer on the canvas (navId). */
  hover: string | null
  enter: (sectionId: string, el?: string) => void
  leave: () => void
}

const ROW = 'mx-1 flex cursor-pointer items-center rounded-[5px] pr-1.5 transition-colors'
const SELECTED = 'bg-accent/20 text-white'
const HOVERED = 'bg-white/[0.07] text-ink-100 ring-1 ring-inset ring-accent/40'

/** Scrolls the canvas so the element is in view (selection only scrolls to the section top). */
function revealOnCanvas(sectionId: string, el: string) {
  window.setTimeout(() => {
    const node = document.querySelector<HTMLElement>(`.cv [data-el="${sectionId}:${el}"]`)
    const scroller = node?.closest('.cv')?.parentElement
    if (!node || !scroller) return
    const r = node.getBoundingClientRect()
    const c = scroller.getBoundingClientRect()
    if (r.height && r.top >= c.top + 24 && r.bottom <= c.bottom - 24) return
    scroller.scrollBy({ top: r.top - c.top - Math.max(60, (c.height - Math.min(r.height, c.height)) / 3), behavior: 'smooth' })
  }, 40)
}

function containsEl(rows: NavRow[], el: string | undefined): boolean {
  return !!el && rows.some((r) => r.type !== 'sub' && (r.el === el || (!!r.children && containsEl(r.children, el))))
}

function clearNavHover() {
  document.querySelectorAll('[data-nav-hover]').forEach((n) => n.removeAttribute('data-nav-hover'))
}

/* ---------- Structure (navigator) ---------- */
export function StructurePanel({ constraints }: { constraints: React.RefObject<HTMLDivElement | null> }) {
  const b = useB()
  const [open, setOpen] = useState<string[]>([])
  const [hover, setHover] = useState<string | null>(null)
  const controls = useDragControls()
  const list = useRef<HTMLDivElement>(null)
  const sel = b.selection
  const selKey = sel ? navId(sel.sectionId, sel.el) : ''

  // Canvas selection → unfold ancestors (containers, cards, boxes), then scroll the row into view.
  useEffect(() => {
    if (!sel) return
    const keys = openKeysFor(b.doc, sel)
    setOpen((o) => (keys.every((k) => o.includes(k)) ? o : [...new Set([...o, ...keys])]))
    const t = window.setTimeout(() => {
      const root = list.current
      const row = root ? Array.from(root.querySelectorAll<HTMLElement>('[data-nav]')).find((n) => n.dataset.nav === selKey) : undefined
      if (!root || !row) return
      const r = row.getBoundingClientRect()
      const c = root.getBoundingClientRect()
      if (r.top < c.top + 4) root.scrollTo({ top: root.scrollTop - (c.top - r.top) - 24, behavior: 'smooth' })
      else if (r.bottom > c.bottom - 4) root.scrollTo({ top: root.scrollTop + (r.bottom - c.bottom) + 24, behavior: 'smooth' })
    }, 260)
    return () => window.clearTimeout(t)
  }, [selKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Canvas hover → soft highlight of the matching row.
  useEffect(() => {
    let last = ''
    const on = (e: PointerEvent) => {
      const t = e.target as Element | null
      let id = ''
      if (t?.closest?.('.cv')) {
        const de = t.closest('[data-el]')?.getAttribute('data-el')
        const ds = t.closest('[data-section]')?.getAttribute('data-section')
        if (de) id = navId(de.slice(0, de.indexOf(':')), de.slice(de.indexOf(':') + 1))
        else if (ds) id = navId(ds)
      }
      if (id === last) return
      last = id
      setHover(id || null)
    }
    document.addEventListener('pointerover', on)
    return () => {
      document.removeEventListener('pointerover', on)
      clearNavHover()
    }
  }, [])

  const ctx: NavCtx = {
    open,
    toggle: (key) => setOpen((o) => (o.includes(key) ? o.filter((x) => x !== key) : [...o, key])),
    hover,
    // Row hover → highlight on the canvas.
    enter: (sectionId, el) => {
      clearNavHover()
      if (!el) return b.setHoverSection(sectionId)
      b.setHoverSection(null)
      document.querySelector(`.cv [data-el="${sectionId}:${el}"]`)?.setAttribute('data-nav-hover', '')
    },
    leave: () => {
      clearNavHover()
      b.setHoverSection(null)
    },
  }

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      dragConstraints={constraints}
      dragElastic={0}
      initial={{ opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      transition={spring}
      className="absolute right-4 top-4 z-40 flex max-h-[min(460px,calc(100%-2rem))] w-[248px] flex-col overflow-hidden rounded-[10px] border border-white/10 bg-ink-850/95 shadow-2xl shadow-black/50 backdrop-blur"
    >
      <div onPointerDown={(e) => controls.start(e)} className="flex h-10 shrink-0 cursor-grab touch-none items-center justify-between border-b border-white/[0.07] px-3 active:cursor-grabbing">
        <GripVertical size={13} className="text-ink-500" />
        <span className="text-[12.5px] font-semibold text-ink-100">Yapı</span>
        <button type="button" aria-label="Kapat" onPointerDown={(e) => e.stopPropagation()} onClick={() => b.setStructureOpen(false)} className="text-ink-500 hover:text-ink-100">
          <X size={14} />
        </button>
      </div>
      <div ref={list} className="scroll-thin min-h-0 flex-1 overflow-y-auto py-1" onMouseLeave={ctx.leave}>
        {b.doc.sections.map((s) => (
          <NavNode key={s.id} s={s} level={0} ctx={ctx} />
        ))}
      </div>
    </motion.div>
  )
}

function Chevron({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={open ? 'Daralt' : 'Genişlet'}
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="grid size-6 shrink-0 place-items-center text-ink-500 hover:text-ink-200"
    >
      <ChevronDown size={12} className={cn('transition-transform', !open && '-rotate-90')} />
    </button>
  )
}

function VisBtn({ state, onClick }: { state?: 'hidden' | 'removed'; onClick: () => void }) {
  const label = state === 'removed' ? 'Geri getir' : state === 'hidden' ? 'Göster' : 'Gizle'
  const I = state === 'removed' ? RotateCcw : state === 'hidden' ? EyeOff : Eye
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={cn('ml-auto grid size-6 shrink-0 place-items-center rounded text-ink-500 hover:bg-white/10 hover:text-white', !state && 'opacity-0 group-hover/row:opacity-100')}
      >
        <I size={12.5} />
      </button>
    </Tip>
  )
}

function Fold({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2, ease }} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** One container in the navigator; nested Flexbox / Grid containers appear in place of their cell. */
function NavNode({ s, level, cell, ctx }: { s: Section; level: number; cell?: string; ctx: NavCtx }) {
  const b = useB()
  const isOpen = ctx.open.includes(s.id)
  const def = KINDS[s.kind]
  const pad = 4 + level * 18
  const id = navId(s.id)
  const selected = b.selection?.sectionId === s.id && !b.selection.el
  const rows = isOpen ? navRows(s) : []
  const Icon = level > 0 ? (s.content.type === 'grid' ? LayoutGrid : Columns3) : def.icon
  return (
    <div>
      <div
        data-nav={id}
        onMouseEnter={() => ctx.enter(s.id)}
        onClick={() => b.select({ sectionId: s.id }, { scroll: true })}
        style={{ paddingLeft: pad }}
        className={cn('group/row h-8 gap-1.5 text-[12px]', ROW, selected ? SELECTED : ctx.hover === id ? HOVERED : 'text-ink-300 hover:bg-white/[0.05]', s.hidden && 'opacity-45')}
      >
        <Chevron open={isOpen} onClick={() => ctx.toggle(s.id)} />
        <Icon size={13} className="shrink-0 text-ink-500" />
        <span className="truncate">{level > 0 ? s.name : 'Kapsayıcı'}</span>
        <span className="min-w-0 flex-1 truncate text-ink-500">· {level > 0 ? cell : s.name}</span>
        <VisBtn state={s.hidden ? 'hidden' : undefined} onClick={() => b.dispatch({ type: 'toggleHidden', id: s.id })} />
      </div>
      <Fold open={isOpen}>
        {rows.map((r) => (
          <RowView key={r.key} s={s} row={r} base={pad} depth={1} level={level} ctx={ctx} />
        ))}
      </Fold>
    </div>
  )
}

/** Element row (heading, button, cell, free-form node…), list-item group or nested container. */
function RowView({ s, row, base, depth, level, ctx }: { s: Section; row: NavRow; base: number; depth: number; level: number; ctx: NavCtx }) {
  const b = useB()
  if (row.type === 'sub') return <NavNode s={row.sub} level={level + 1} cell={row.cell} ctx={ctx} />
  const kids = row.children
  const foldable = !!kids
  const isOpen = foldable && ctx.open.includes(row.key)
  const id = navId(s.id, row.el)
  const state = row.type === 'el' ? row.state : undefined
  const sel = b.selection?.sectionId === s.id ? b.selection.el : undefined
  const selected = row.type === 'el' && sel === row.el
  // A collapsed card / box still shows that something inside it is selected or hovered.
  const inside = !isOpen && !selected && !!kids && containsEl(kids, sel)
  const hovered = (row.type === 'el' && ctx.hover === id) || (!isOpen && !!kids && !!ctx.hover?.startsWith(`${s.id}|`) && containsEl(kids, ctx.hover.slice(s.id.length + 1)))
  const pick = () => {
    if (state === 'removed') {
      b.select({ sectionId: s.id })
      b.notify('Bu öğe silindi · ↺ ile geri getirebilirsin')
      return
    }
    b.select({ sectionId: s.id, el: row.el })
    revealOnCanvas(s.id, row.el)
  }
  return (
    <div>
      <div
        data-nav={row.type === 'el' ? id : undefined}
        onMouseEnter={() => ctx.enter(s.id, state === 'removed' ? undefined : row.el)}
        onClick={pick}
        style={{ paddingLeft: base + depth * 18 + (foldable ? 0 : 24) }}
        className={cn(
          'group/row h-7 gap-2 text-[11.5px]',
          ROW,
          selected ? SELECTED : hovered ? HOVERED : inside ? 'bg-accent/[0.08] text-ink-200' : 'text-ink-400 hover:bg-white/[0.05]',
          (state || (row.type === 'el' && row.dim)) && 'opacity-50',
        )}
      >
        {foldable && <Chevron open={isOpen} onClick={() => ctx.toggle(row.key)} />}
        <span className={cn('shrink-0', kids && row.type !== 'el' || isCardEl(row.el) ? 'font-medium text-ink-300' : 'text-ink-500')}>{row.tag}</span>
        <span className={cn('min-w-0 flex-1 truncate', state === 'removed' && 'line-through')}>{row.label}</span>
        {state === 'removed' && <span className="shrink-0 text-[10px] text-ink-500">silindi</span>}
        {row.type === 'el' && !row.dim && (
          <VisBtn
            state={state}
            onClick={() => (state === 'removed' ? restoreEl(b, s.id, row.el) : toggleHideSelection(b, { sectionId: s.id, el: row.el }))}
          />
        )}
      </div>
      {kids && (
        <Fold open={isOpen}>
          {kids.map((k) => (
            <RowView key={k.key} s={s} row={k} base={base} depth={depth + 1} level={level} ctx={ctx} />
          ))}
        </Fold>
      )}
    </div>
  )
}
