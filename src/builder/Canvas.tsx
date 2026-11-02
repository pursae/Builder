import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode, type PointerEvent as RPointerEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripHorizontal, LayoutTemplate, Pencil, Plus, Trash2, X } from 'lucide-react'
import { CORNERS, KINDS, createLayout, getBox, paletteVars } from './data'
import { LayoutPicker } from './LayoutPicker'
import { siteFontVars, useDocFonts } from './fonts'
import { DecorHandle, SectionBackground } from './Decor'
import { AiCursor } from './ai/AiCursor'
import { BoxBars, RENDERERS, containerFrameStyle, framePad, padY } from './sections'
import { SelectionOverlay } from './SelectionOverlay'
import { ElVisibility } from './ElVisibility'
import { insertBounds, useB } from './store'
import { motionAttrs, useSectionMotion } from './motion'
import type { Section } from './types'
import { Tip, cn, ease, spring } from './ui'

const WIDTH = { desktop: '100%', tablet: '820px', mobile: '400px' } as const

export function Canvas() {
  const b = useB()
  const scroller = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const { sections, site } = b.doc
  const framed = b.device !== 'desktop'

  // Scroll a section into view (offsetTop ignores in-flight layout transforms).
  useEffect(() => {
    if (!b.scrollReq || !scroller.current) return
    const root = scroller.current
    const el = root.querySelector<HTMLElement>(`[data-section="${b.scrollReq.id}"]`)
    if (!el) return
    const t = window.setTimeout(() => {
      let top = 0
      let node: HTMLElement | null = el
      while (node && node !== root) {
        top += node.offsetTop
        node = node.offsetParent as HTMLElement | null
      }
      const visible = top >= root.scrollTop && top + Math.min(el.offsetHeight, 300) <= root.scrollTop + root.clientHeight
      if (!visible) root.scrollTo({ top: Math.max(0, top - 40), behavior: 'smooth' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [b.scrollReq])

  useDocFonts(b.doc)
  const corner = CORNERS[site.corners]
  const pageVars = {
    '--brand': site.brand,
    '--r-card': `${corner.card}px`,
    '--r-btn': `${corner.btn}px`,
    ...siteFontVars(site),
  } as CSSProperties

  const visible = b.preview ? sections.filter((s) => !s.hidden && !s.style.hideOn.includes(b.device)) : sections

  const { max } = insertBounds(sections)
  const zone = (i: number) => (b.picker?.index === i ? <PickerZone key="picker" /> : <AddZone key="add-zone" index={i} />)
  const nodes: ReactNode[] = []
  visible.forEach((s, i) => {
    const idx = sections.indexOf(s)
    if (!b.preview && idx === max) nodes.push(zone(max))
    else if (!b.preview && b.picker?.index === idx) nodes.push(<PickerZone key="picker" />)
    nodes.push(<Frame key={s.id} s={s} index={idx} isLast={i === visible.length - 1} />)
  })
  if (!b.preview && max >= sections.length) nodes.push(zone(max))

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    if (b.dragging) b.add(b.dragging, b.drop ?? insertBounds(sections).max)
    b.setDragging(null)
    b.setDrop(null)
  }

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden bg-ink-950">
      <div
        ref={scroller}
        className={cn('scroll-thin absolute inset-0 overflow-y-auto transition-[padding] duration-500 ease-soft', framed ? 'dots-bg px-6 pt-12 pb-20' : 'p-0')}
        onClick={() => !b.preview && b.select(null)}
        onDragOver={(e) => b.dragging && e.preventDefault()}
        onDrop={onDrop}
      >
        <AnimatePresence>
          {framed && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-0 right-0 top-4 text-center text-[11.5px] font-medium text-ink-400"
            >
              {b.device === 'tablet' ? 'Tablet · 820 px' : 'Mobil · 400 px'}
            </motion.div>
          )}
        </AnimatePresence>
        <div
          ref={page}
          className={cn(
            'cv @container relative mx-auto bg-white transition-[width,border-radius,box-shadow] duration-500 ease-soft',
            framed ? 'overflow-hidden rounded-[18px] shadow-[0_0_0_1px_rgba(255,255,255,.08),0_30px_80px_-20px_rgba(0,0,0,.7)]' : 'min-h-full',
          )}
          style={{ ...pageVars, width: WIDTH[b.device] }}
          data-mode={b.mode}
          data-preview={String(b.preview)}
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {nodes}
          </AnimatePresence>
          <ElVisibility sections={sections} />
          {b.mode !== 'ai' && <SelectionOverlay page={page} />}
          <AiCursor page={page} />
        </div>
      </div>
    </div>
  )
}

function Frame({ s, index, isLast }: { s: Section; index: number; isLast: boolean }) {
  const b = useB()
  const R = RENDERERS[s.kind]
  const def = KINDS[s.kind]
  const selected = b.selection?.sectionId === s.id
  const sectionOnly = selected && !b.selection?.el
  const hint = b.hoverSection === s.id && !selected
  const hiddenHere = s.style.hideOn.includes(b.device)
  const Icon = def.icon
  const { min, max } = insertBounds(b.doc.sections)
  const content = useRef<HTMLDivElement>(null)
  useSectionMotion(content, s, b.preview)

  const onDragOver = (e: DragEvent) => {
    if (!b.dragging) return
    e.preventDefault()
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.max(min, Math.min(max, e.clientY < r.top + r.height / 2 ? index : index + 1))
    if (b.drop !== i) b.setDrop(i)
  }

  return (
    <motion.section
      layout="position"
      layoutDependency={b.history.sv}
      id={s.style.cssId || undefined}
      data-section={s.id}
      data-selected={selected || undefined}
      data-hint={hint || undefined}
      {...motionAttrs(s, b.preview)}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.22 } }}
      transition={{ duration: 0.45, ease, layout: spring }}
      className="sf"
      style={{ ...paletteVars(s.style.palette, b.doc.site.brand, s.style.bg), background: 'var(--bg)', color: 'var(--fg)', ...containerFrameStyle(s) }}
      onClick={(e) => {
        if (b.preview) return
        e.stopPropagation()
        b.select({ sectionId: s.id })
      }}
      onDragOver={onDragOver}
      onContextMenu={(e) => {
        if (b.preview) return
        e.preventDefault()
        e.stopPropagation()
        // Nested containers carry their own data-section; the innermost one is the target.
        const host = (e.target as HTMLElement).closest('[data-section]')?.getAttribute('data-section') ?? s.id
        const de = (e.target as HTMLElement).closest('[data-el]')?.getAttribute('data-el')
        const el = de && de.startsWith(`${host}:`) ? de.slice(host.length + 1) : undefined
        b.select({ sectionId: host, el })
        b.setMenu({ x: e.clientX, y: e.clientY, sectionId: host, el })
      }}
    >
      {s.style.css && <style>{s.style.css.replace(/\bselector\b/g, `[data-section="${s.id}"]`)}</style>}
      {!s.hidden && <SectionBackground s={s} />}
      {s.hidden ? (
        <div className="stripes flex h-12 items-center justify-between bg-[#1b1c20] px-5 text-[12.5px] text-ink-300">
          <span className="flex items-center gap-2">
            <EyeOff size={14} /> <b className="font-semibold text-ink-100">{s.name}</b> gizli · ziyaretçiler bu bölümü görmez
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              b.dispatch({ type: 'toggleHidden', id: s.id })
            }}
            className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 font-medium text-ink-100 hover:bg-white/15"
          >
            <Eye size={13} /> Göster
          </button>
        </div>
      ) : (
        <motion.div
          key={b.preview ? 'live' : 'edit'}
          ref={content}
          className={cn('relative z-[1] transition-opacity duration-300', hiddenHere && !b.preview && 'opacity-30')}
          style={framePad(s)}
        >
          <R s={s} />
        </motion.div>
      )}

      {!b.preview && hiddenHere && !s.hidden && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <span className="rounded-full bg-black/75 px-3 py-1.5 text-[12px] font-medium text-white">Bu cihazda gizli</span>
        </div>
      )}

      {!b.preview && sectionOnly && b.boxHint === 'margin' && <BoxBars v={getBox(s).margin} outside />}
      {!b.preview && !s.hidden && b.mode !== 'ai' && <SpacingOverlay s={s} selected={selected} />}
      {!b.preview && sectionOnly && !s.hidden && b.mode !== 'ai' && <DecorHandle s={s} />}

      {!b.preview && (
        <>
          {/* section label */}
          <div className="sf-ui absolute left-0 top-0 z-20" data-ovl-avoid>
            <span
              className={cn('flex items-center gap-1.5 text-[11px] font-semibold', b.mode === 'basic' ? 'm-2 rounded-full px-2.5 py-1' : 'rounded-br-md px-2 py-[3px]')}
              style={{ background: 'var(--ov)', color: 'var(--ov-ink)' }}
            >
              <Icon size={12} strokeWidth={2.2} />
              {b.mode === 'studio' ? `Kapsayıcı · ${s.name}` : s.name}
            </span>
          </div>

          {/* basic: add-between button */}
          {b.mode === 'basic' && !isLast && index + 1 >= min && index + 1 <= max && (
            <div className="sf-ui absolute -bottom-[15px] left-1/2 z-30 -translate-x-1/2" data-ovl-avoid>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  b.setInsertAt(index + 1)
                  b.setBasicView('add')
                }}
                className="flex h-[30px] items-center gap-1.5 rounded-full bg-accent pl-2.5 pr-3.5 text-[12px] font-semibold text-white shadow-lg shadow-black/30 transition-transform hover:scale-105"
              >
                <Plus size={14} strokeWidth={2.5} /> Bölüm ekle
              </button>
            </div>
          )}

          <AnimatePresence>
            {sectionOnly && b.mode !== 'ai' && (b.mode === 'basic' ? <BasicToolbar key="bt" s={s} /> : <StudioTab key="st" s={s} index={index} />)}
          </AnimatePresence>

          {b.dragging && (b.drop === index || (b.drop === index + 1 && isLast)) && (
            <motion.div
              layoutId="drop-line"
              className={cn('pointer-events-none absolute inset-x-0 z-40 h-1 bg-accent', b.drop === index ? '-top-0.5' : '-bottom-0.5')}
              transition={spring}
            >
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-3 py-1 text-[11.5px] font-semibold text-white shadow-lg">
                Buraya bırak
              </span>
            </motion.div>
          )}
        </>
      )}
    </motion.section>
  )
}

function ToolBtn({ icon: I, label, onClick, danger }: { icon: typeof Plus; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={cn('grid size-8 place-items-center rounded-full text-ink-200 transition-colors', danger ? 'hover:bg-red-500/20 hover:text-red-300' : 'hover:bg-white/10 hover:text-white')}
      >
        <I size={15} strokeWidth={1.9} />
      </button>
    </Tip>
  )
}

function BasicToolbar({ s }: { s: Section }) {
  const b = useB()
  const pinned = KINDS[s.kind].pinned
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={spring}
      className="absolute right-3 top-3 z-30 flex items-center gap-0.5 rounded-full border border-white/10 bg-[#1b1c20]/95 p-1 shadow-xl shadow-black/30 backdrop-blur"
      data-ovl-avoid
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => b.setBasicView('editor')}
        className="flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-[12px] font-semibold text-white"
      >
        <Pencil size={13} strokeWidth={2.2} /> Düzenle
      </button>
      {!pinned && (
        <>
          <ToolBtn icon={ArrowUp} label="Yukarı taşı" onClick={() => b.dispatch({ type: 'move', id: s.id, dir: -1 })} />
          <ToolBtn icon={ArrowDown} label="Aşağı taşı" onClick={() => b.dispatch({ type: 'move', id: s.id, dir: 1 })} />
          <ToolBtn icon={Copy} label="Çoğalt" onClick={() => b.dispatch({ type: 'duplicate', id: s.id })} />
        </>
      )}
      <ToolBtn icon={s.hidden ? Eye : EyeOff} label={s.hidden ? 'Göster' : 'Gizle'} onClick={() => b.dispatch({ type: 'toggleHidden', id: s.id })} />
      {!pinned && <ToolBtn icon={Trash2} label="Sil" danger onClick={() => b.remove(s.id)} />}
    </motion.div>
  )
}

function StudioTab({ s, index }: { s: Section; index: number }) {
  const b = useB()
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 items-center gap-px overflow-hidden rounded-b-[7px] text-[#0b1030]"
      style={{ background: 'color-mix(in srgb, var(--ov) 70%, #c7d5ff)' }}
      data-ovl-avoid
      onClick={(e) => e.stopPropagation()}
    >
      {[
        { i: Plus, l: 'Altına kapsayıcı ekle', f: () => b.setPicker({ index: index + 1, step: 'type' }) },
        { i: GripHorizontal, l: 'Kapsayıcıyı düzenle', f: () => b.select({ sectionId: s.id }) },
        { i: X, l: 'Sil', f: () => b.remove(s.id) },
      ].map(({ i: I, l, f }) => (
        <Tip key={l} label={l}>
          <button type="button" aria-label={l} onClick={f} className="grid h-6 w-8 place-items-center hover:bg-white/30">
            <I size={13} strokeWidth={2.2} />
          </button>
        </Tip>
      ))}
    </motion.div>
  )
}

/* ---------- Elementor-style add zones ---------- */
function AddZone({ index }: { index: number }) {
  const b = useB()
  const active = !!b.dragging && b.drop === index
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-white px-6 py-8"
      onClick={(e) => e.stopPropagation()}
      onDragOver={(e) => {
        if (!b.dragging) return
        e.preventDefault()
        e.stopPropagation()
        if (b.drop !== index) b.setDrop(index)
      }}
    >
      <div className={cn('mx-auto flex h-[132px] max-w-[1100px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors duration-200', active ? 'border-[#3d63f5] bg-[#3d63f5]/[0.06]' : 'border-[#d3d6dc] hover:border-[#b5bac3]')}>
        <div className="flex gap-2">
          <Tip label="Yeni kapsayıcı · Flexbox / Grid">
            <button
              type="button"
              aria-label="Yeni kapsayıcı"
              onClick={() => b.setPicker({ index, step: 'type' })}
              className="grid size-10 place-items-center rounded-full bg-[#3d63f5] text-white shadow-md shadow-[#3d63f5]/30 transition-transform hover:scale-110"
            >
              <Plus size={19} strokeWidth={2.4} />
            </button>
          </Tip>
          <Tip label="Hazır bölümler">
            <button
              type="button"
              aria-label="Hazır bölümler"
              onClick={() => {
                if (b.mode === 'basic') {
                  b.setInsertAt(index)
                  b.setBasicView('add')
                } else {
                  b.select(null)
                  b.setStudioTab('components')
                }
              }}
              className="grid size-10 place-items-center rounded-full bg-[#50555c] text-white transition-transform hover:scale-110"
            >
              <LayoutTemplate size={17} />
            </button>
          </Tip>
        </div>
        <span className="text-[13px] text-[#6b7079]">{active ? 'Buraya bırak' : "Yeni kapsayıcı eklemek için tıkla ya da widget'ı buraya sürükle"}</span>
      </div>
    </motion.div>
  )
}

function PickerZone() {
  const b = useB()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120)
    return () => window.clearTimeout(t)
  }, [b.picker?.index])
  if (!b.picker) return null
  const { index, step } = b.picker
  return (
    <motion.div
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.32, ease }}
      className="relative z-20 bg-white px-6 py-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative mx-auto max-w-[1100px] rounded-2xl border-2 border-dashed border-[#c9cdd4] bg-[#f3f4f6] px-6 py-8">
        <button type="button" aria-label="Kapat" title="Kapat · Esc" onClick={() => b.setPicker(null)} className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full text-[#6b7079] outline-none transition-colors hover:bg-black/[0.06] hover:text-[#2b2f36] focus-visible:ring-2 focus-visible:ring-accent">
          <X size={16} />
        </button>
        <LayoutPicker
          key={`${index}-${step}`}
          tone="light"
          initialStep={step}
          widthChoice
          onPick={(type, structure, width) => {
            const label = type === 'grid' ? 'Grid kapsayıcı' : 'Flexbox kapsayıcı'
            b.add({ kind: 'layout', label, section: createLayout(type, structure, { width }) }, index)
            b.setPicker(null)
          }}
        />
      </div>
    </motion.div>
  )
}

/* ---------- Hover spacing hints: padding / margin of an unselected section, draggable (SelectionOverlay takes over once selected) ---------- */
type Which = 'pt' | 'pb' | 'mt' | 'mb'

function SpacingOverlay({ s, selected }: { s: Section; selected: boolean }) {
  const b = useB()
  const bx = getBox(s)
  const studio = b.mode === 'studio'
  const [live, setLive] = useState<Which | null>(null)

  const startDrag = (e: RPointerEvent, which: Which) => {
    e.preventDefault()
    e.stopPropagation()
    if (!selected) b.select({ sectionId: s.id })
    const y0 = e.clientY
    const base = getBox(s)
    const start = which === 'pt' ? base.padding.t : which === 'pb' ? base.padding.b : which === 'mt' ? base.margin.t : base.margin.b
    const dir = which === 'mt' ? -1 : 1
    setLive(which)
    document.body.style.cursor = 'ns-resize'
    const move = (ev: PointerEvent) => {
      const step = ev.shiftKey ? 1 : 4
      const v = Math.max(0, Math.min(400, Math.round((start + (ev.clientY - y0) * dir) / step) * step))
      const patch =
        which === 'pt'
          ? { padding: { ...base.padding, t: v } }
          : which === 'pb'
            ? { padding: { ...base.padding, b: v } }
            : which === 'mt'
              ? { margin: { ...base.margin, t: v } }
              : { margin: { ...base.margin, b: v } }
      b.dispatch({ type: 'box', id: s.id, patch, key: `drag-${which}` })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.cursor = ''
      setLive(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const zones: { which: Which; value: number; label: string; margin: boolean; top: boolean }[] = [
    { which: 'pt', value: bx.padding.t, label: studio ? 'padding-top' : 'Üst boşluk', margin: false, top: true },
    { which: 'pb', value: bx.padding.b, label: studio ? 'padding-bottom' : 'Alt boşluk', margin: false, top: false },
    ...(studio
      ? [
          { which: 'mt' as Which, value: bx.margin.t, label: 'margin-top', margin: true, top: true },
          { which: 'mb' as Which, value: bx.margin.b, label: 'margin-bottom', margin: true, top: false },
        ]
      : []),
  ]

  if (selected && !live) return null
  return (
    <div className={cn('sp-ui pointer-events-none absolute inset-0 z-[18]', live && 'is-on')}>
      {zones.map((z) => {
        if (live ? z.which !== live : z.value === 0) return null
        const size = z.margin ? `${z.value}px` : padY(z.value)
        const pos: CSSProperties = z.margin
          ? z.top
            ? { top: `calc(-1 * ${size})`, height: size }
            : { bottom: `calc(-1 * ${size})`, height: size }
          : z.top
            ? { top: 0, height: size }
            : { bottom: 0, height: size }
        const rgb = z.margin ? '240 132 44' : '38 166 92'
        const crowded = z.value < 64 // keep clear of the toolbar / "+ Bölüm ekle" button
        const offset = z.margin ? 150 : 0
        return (
          <div
            key={z.which}
            className="absolute inset-x-0"
            style={{
              ...pos,
              background: `repeating-linear-gradient(-45deg, rgb(${rgb} / .14) 0 5px, rgb(${rgb} / .04) 5px 10px)`,
              [z.top === !z.margin ? 'borderBottom' : 'borderTop']: z.value ? `1px dashed rgb(${rgb} / .5)` : undefined,
            }}
          >
            <button
              type="button"
              onPointerDown={(e) => startDrag(e, z.which)}
              onClick={(e) => e.stopPropagation()}
              title="Sürükleyerek değiştir · Shift ile 1px adım"
              className={cn(
                'sp-h absolute top-1/2 flex h-4 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-[10px] font-semibold leading-none text-white shadow-[0_1px_3px_rgb(0_0_0/.28)] ring-1 ring-black/10 transition-transform hover:scale-105',
                live === z.which && 'scale-105 ring-2 ring-white/80',
              )}
              style={{ left: `calc(50% + ${offset + (crowded ? (z.top ? 170 : -170) : 0)}px)`, background: `rgb(${rgb} / .9)` }}
            >
              <span>↕</span>
              {z.label} · {z.value}
              {studio && 'px'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
