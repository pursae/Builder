import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlignCenter,
  AlignLeft,
  ArrowLeft,
  ChevronDown,
  CornerLeftUp,
  GripVertical,
  Bookmark,
  Info,
  LayoutGrid,
  Monitor,
  Paintbrush,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react'
import { BRANDS, CARD_NOUN, CELL_TYPES, CORNERS, EL_NAMES, isCardEl, getBox, FONT_PAIRS, IMAGES, KINDS, PALETTES, TEMPLATES, WIDGET_GROUPS, fieldKind, fieldLabel, findSection, getValue, sectionPath, sized } from './data'
import { CellAdvancedTab, CellLayoutTab, CellStyleTab, ContainerAdvancedTab, ContainerLayoutTab, ContainerStyleTab, ElAdvancedTab, ElStyleTab } from './ContainerInspector'
import { SectionMotionPanel } from './MotionPanel'
import { WeightSelect } from './FontPicker'
import { siteFonts } from './fonts'
import { SiteTypography } from './TypographyControls'
import { StructureChooser } from './LayoutPicker'
import { IconContentTab } from './IconInspector'
import { LinkField } from './LinkField'
import { RichField, richKind } from './RichText'
import { isRich } from './rich'
import { parentSelection, restoreEl, toggleHideSelection } from './selectionActions'
import { CardContentTab } from './CardInspector'
import { DesignRow, LibraryButton } from './variants/VariantControls'
import { useB } from './store'
import type { CellType, CornerId, Device, Payload, Section, Selection } from './types'
import { Toggle, cn, ease, spring } from './ui'

export function StudioPanel() {
  const b = useB()
  const section = findSection(b.doc, b.selection?.sectionId)
  const key = section ? `insp-${section.id}-${b.selection?.el ?? ''}` : 'browser'
  return (
    <div className="relative h-full overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={section ? 'insp' : 'browser'}
          initial={{ x: section ? 40 : -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: section ? -40 : 40, opacity: 0 }}
          transition={{ duration: 0.26, ease }}
          className="absolute inset-0 flex flex-col"
        >
          {section ? <Inspector key={key} s={section} el={b.selection?.el} /> : <Browser />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ---------- Elements browser ---------- */
function Browser() {
  const b = useB()
  const tabs = [
    { id: 'widgets', label: "Widget'lar" },
    { id: 'components', label: 'Bileşenler' },
    { id: 'globals', label: 'Globaller' },
  ] as const
  return (
    <>
      <div className="flex h-11 shrink-0 items-center justify-center border-b border-white/[0.07] text-[13px] font-semibold text-ink-100">Öğeler</div>
      <div className="flex shrink-0 border-b border-white/[0.07]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => b.setStudioTab(t.id)}
            className={cn('relative h-10 flex-1 text-[12px] font-medium transition-colors', b.studioTab === t.id ? 'text-accent-soft' : 'text-ink-400 hover:text-ink-200')}
          >
            {t.label}
            {b.studioTab === t.id && <motion.span layoutId="studio-tab" transition={spring} className="absolute inset-x-5 bottom-0 h-[2px] rounded-full bg-accent-soft" />}
          </button>
        ))}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {b.insertAt != null && (
          <div className="mx-3 mt-3 flex items-center justify-between rounded-md bg-accent/12 px-2.5 py-2 text-[11.5px] text-accent-soft">
            <span>
              <b>{b.doc.sections[b.insertAt - 1]?.name}</b> altına eklenecek
            </span>
            <button type="button" aria-label="İptal" onClick={() => b.setInsertAt(null)} className="opacity-70 hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        )}
        {b.studioTab === 'widgets' && <Widgets />}
        {b.studioTab === 'components' && <Components />}
        {b.studioTab === 'globals' && <Globals />}
      </div>
    </>
  )
}

function useDragAdd() {
  const b = useB()
  return (p: Payload) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', p.label)
      e.dataTransfer.effectAllowed = 'copy'
      b.setDragging(p)
    },
    onDragEnd: () => {
      b.setDragging(null)
      b.setDrop(null)
    },
    onClick: () => b.add(p),
  })
}

function Widgets() {
  const [q, setQ] = useState('')
  const [closed, setClosed] = useState<string[]>([])
  const drag = useDragAdd()
  const query = q.trim().toLocaleLowerCase('tr')
  return (
    <div className="pb-6">
      <div className="p-3">
        <label className="flex h-8 items-center gap-2 rounded-md border border-white/[0.08] bg-ink-850 px-2.5 text-ink-400 focus-within:border-accent/70">
          <Search size={13} />
          <input id="widget-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Widget ara…" className="w-full bg-transparent text-[12px] text-ink-100 outline-none placeholder:text-ink-500" />
        </label>
      </div>
      {WIDGET_GROUPS.map((g) => {
        const items = g.items.filter((w) => w.label.toLocaleLowerCase('tr').includes(query))
        if (!items.length) return null
        const isClosed = closed.includes(g.title) && !query
        return (
          <div key={g.title}>
            <button
              type="button"
              onClick={() => setClosed((c) => (c.includes(g.title) ? c.filter((x) => x !== g.title) : [...c, g.title]))}
              className="flex h-8 w-full items-center gap-1.5 border-t border-white/[0.07] px-3 text-[10.5px] font-semibold uppercase tracking-[.08em] text-ink-400 hover:text-ink-200"
            >
              <ChevronDown size={12} className={cn('transition-transform', isClosed && '-rotate-90')} />
              {g.title}
              <span className="ml-auto grid size-4 place-items-center rounded-full bg-accent/15 text-accent-soft">
                <Info size={10} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {!isClosed && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25, ease }} className="overflow-hidden">
                  <div className="grid grid-cols-2 border-t border-white/[0.07]">
                    {items.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        {...drag(w.payload)}
                        className="group relative flex h-[68px] cursor-grab flex-col items-center justify-center gap-2 border-b border-r border-white/[0.07] text-[11.5px] text-ink-300 transition-colors hover:bg-white/[0.04] hover:text-ink-100 active:cursor-grabbing [&:nth-child(2n)]:border-r-0"
                      >
                        <w.icon size={18} strokeWidth={1.4} />
                        {w.label}
                        {w.isNew ? (
                          <span className="absolute right-1.5 top-1.5 rounded-[3px] bg-accent-soft/90 px-1 py-px text-[9px] font-semibold text-[#0b1030]">Yeni</span>
                        ) : (
                          <GripVertical size={11} className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-50" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
      <p className="px-4 pt-4 text-[11px] leading-relaxed text-ink-500">Bir widget'ı sayfaya sürükleyin ya da tıklayarak seçili kapsayıcının altına ekleyin.</p>
    </div>
  )
}

function Components() {
  const b = useB()
  const drag = useDragAdd()
  return (
    <div className="space-y-px p-2">
      <div className="pb-2">
        <LibraryButton compact />
      </div>
      {b.saved.length > 0 && (
        <>
          <div className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[.08em] text-ink-500">Kaydettiklerim</div>
          {b.saved.map((c) => (
            <div key={c.id} className="group flex items-center rounded-md hover:bg-white/[0.05]">
              <button type="button" {...drag({ kind: c.section.kind, label: c.name, section: c.section })} className="flex min-w-0 flex-1 cursor-grab items-center gap-3 px-2 py-2 text-left">
                <span className="grid size-8 place-items-center rounded-md bg-accent/15 text-accent-soft">
                  <Bookmark size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium text-ink-100">{c.name}</span>
                  <span className="block text-[11px] text-ink-500">{KINDS[c.section.kind].name}</span>
                </span>
              </button>
              <button type="button" aria-label="Kaldır" onClick={() => b.removeSaved(c.id)} className="mr-1 grid size-7 place-items-center rounded text-ink-500 opacity-0 hover:text-red-300 group-hover:opacity-100">
                <X size={12} />
              </button>
            </div>
          ))}
          <div className="px-2 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[.08em] text-ink-500">Hazır bileşenler</div>
        </>
      )}
      {TEMPLATES.map((t) => {
        const K = KINDS[t.kind]
        return (
          <button key={t.kind} type="button" {...drag(t)} className="flex w-full cursor-grab items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.05]">
            <span className="grid size-8 place-items-center rounded-md bg-white/[0.05] text-ink-300">
              <K.icon size={15} strokeWidth={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-medium text-ink-100">{t.label}</span>
              <span className="block truncate text-[11px] text-ink-500">{K.blurb}</span>
            </span>
            <Plus size={14} className="text-ink-500" />
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Controls ---------- */
export function Panel({ title, children, open: initial = true }: { title: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial)
  return (
    <div className="border-b border-white/[0.07]">
      <button type="button" onClick={() => setOpen(!open)} className="flex h-10 w-full items-center justify-between px-4 text-[12px] font-semibold text-ink-200">
        {title}
        <ChevronDown size={13} className={cn('text-ink-500 transition-transform', !open && '-rotate-90')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease }} className="overflow-hidden">
            <div className="space-y-3 px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Ctl({ label, children, stack }: { label: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={cn(stack ? 'space-y-1.5' : 'flex items-center justify-between gap-3')}>
      <span className="text-[11.5px] text-ink-400">{label}</span>
      {children}
    </div>
  )
}

export const inputCls = 'h-7 rounded-[5px] border border-white/[0.08] bg-ink-850 px-2 text-[12px] text-ink-100 outline-none transition focus:border-accent/70'

export function Slider({ value, min, max, step = 1, unit = 'px', onChange }: { value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  const p = ((value - min) / (max - min)) * 100
  return (
    <div className="flex w-[168px] items-center gap-2">
      <input type="range" className="rng min-w-0 flex-1" min={min} max={max} step={step} value={value} style={{ ['--p' as string]: `${p}%` }} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="flex h-7 w-[58px] shrink-0 items-center rounded-[5px] border border-white/[0.08] bg-ink-850 pr-1.5">
        <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} className="w-full min-w-0 bg-transparent pl-1.5 text-[11.5px] text-ink-100 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
        <span className="text-[10px] text-ink-500">{unit}</span>
      </div>
    </div>
  )
}

export function Select<T extends string | number>({ value, options, onChange, w = 150 }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; w?: number }) {
  return (
    <div className="relative" style={{ width: w }}>
      <select
        value={String(value)}
        onChange={(e) => {
          const o = options.find((x) => String(x.value) === e.target.value)
          if (o) onChange(o.value)
        }}
        className={cn(inputCls, 'w-full appearance-none pr-6')}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-500" />
    </div>
  )
}

export function ColorInput({ value, onChange, onReset }: { value: string; onChange: (v: string) => void; onReset?: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {onReset && (
        <button type="button" aria-label="Sıfırla" onClick={onReset} className="grid size-6 place-items-center rounded text-ink-500 hover:text-ink-200">
          <RotateCcw size={12} />
        </button>
      )}
      <label className="relative size-7 cursor-pointer overflow-hidden rounded-[5px] ring-1 ring-inset ring-white/15" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <input value={value.toUpperCase()} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange(e.target.value)} className={cn(inputCls, 'w-[84px] font-mono text-[11px]')} />
    </div>
  )
}

export function IconSeg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; icon: typeof AlignLeft; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-[5px] border border-white/[0.08] bg-ink-850 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.label}
          onClick={() => onChange(o.value)}
          className={cn('grid h-6 w-8 place-items-center rounded-[3px] transition-colors', value === o.value ? 'bg-ink-600 text-white' : 'text-ink-400 hover:text-ink-200')}
        >
          <o.icon size={13} />
        </button>
      ))}
    </div>
  )
}

/* ---------- Inspector ---------- */
type Tab = 'content' | 'style' | 'advanced'
let lastTab: Tab = 'content' // keep the open tab while hopping between elements

function Inspector({ s, el }: { s: Section; el?: string }) {
  const b = useB()
  const [tab, setTabState] = useState<Tab>(lastTab)
  const setTab = (t: Tab) => {
    lastTab = t
    setTabState(t)
  }
  const kind = el ? fieldKind(s, el) : null
  const isLayout = s.kind === 'layout'
  const isCell = isLayout && !!el
  const isCard = !!el && isCardEl(el) && !!CARD_NOUN[s.kind]
  const title = isCell ? 'Hücre düzenle' : isLayout ? `${s.content.type === 'grid' ? 'Grid' : 'Flexbox'} düzenle` : isCard ? `${CARD_NOUN[s.kind]} düzenle` : kind ? `${EL_NAMES[kind]} düzenle` : 'Kapsayıcı düzenle'
  // Breadcrumb through nested containers: Bölüm › Hücre 2 › İç grid › Hücre 1 …
  const path = sectionPath(b.doc.sections, s.id)
  const crumbs: { label: string; sel?: Selection }[] = []
  for (const p of path) {
    crumbs.push({ label: p.s.name, sel: p.s.id === s.id && !el ? undefined : { sectionId: p.s.id } })
    if (p.item) crumbs.push({ label: fieldLabel(p.s, `items.${p.item.id}.text`), sel: { sectionId: p.s.id, el: `items.${p.item.id}.text` } })
  }
  const upEl = el ? parentSelection(b.doc, { sectionId: s.id, el }) : null
  if (upEl?.el) crumbs.push({ label: fieldLabel(s, upEl.el), sel: upEl })
  if (el) crumbs.push({ label: fieldLabel(s, el) })
  const parentStep = path.length > 1 ? path[path.length - 2] : undefined
  const up = upEl ? { label: upEl.el ? 'Üst öğeyi seç' : 'Kapsayıcıyı seç', sel: upEl } : parentStep ? { label: 'Üst kapsayıcıyı seç', sel: { sectionId: parentStep.s.id } } : null
  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.07] px-2">
        <button type="button" aria-label="Öğelere dön" onClick={() => b.select(null)} className="grid size-7 place-items-center rounded text-ink-400 hover:bg-white/[0.06] hover:text-white">
          <ArrowLeft size={15} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[13px] font-semibold text-ink-100">{title}</div>
        </div>
        {up ? (
          <button type="button" aria-label={up.label} title={up.label} onClick={() => b.select(up.sel, { scroll: true })} className="grid size-7 place-items-center rounded text-ink-400 hover:bg-white/[0.06] hover:text-white">
            <CornerLeftUp size={15} />
          </button>
        ) : (
          <span className="w-7" />
        )}
      </div>
      <nav aria-label="Konum" className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-0.5 border-b border-white/[0.07] px-3 py-2 text-[11px] text-ink-500">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-ink-600">›</span>}
            {c.sel ? (
              <button type="button" onClick={() => b.select(c.sel!)} className="max-w-[120px] truncate hover:text-ink-200">
                {c.label}
              </button>
            ) : (
              <span className="max-w-[140px] truncate text-ink-200">{c.label}</span>
            )}
          </Fragment>
        ))}
      </nav>
      {el && (s.els?.[el]?.removed || s.els?.[el]?.hide) && (
        <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.07] bg-amber-400/[0.08] px-3 py-2 text-[11.5px] text-amber-200/90">
          <span className="flex-1">{s.els[el].removed ? 'Bu öğe silindi · sayfada görünmüyor' : 'Gizli · canlı sayfada görünmez'}</span>
          <button
            type="button"
            onClick={() => (s.els![el].removed ? restoreEl(b, s.id, el) : toggleHideSelection(b, { sectionId: s.id, el }))}
            className="rounded-md bg-white/10 px-2 py-1 font-medium text-ink-100 hover:bg-white/15"
          >
            {s.els[el].removed ? 'Geri getir' : 'Göster'}
          </button>
        </div>
      )}
      <div className="flex shrink-0 border-b border-white/[0.07]">
        {(
          [
            { id: 'content', label: isLayout ? 'Düzen' : 'İçerik', icon: isLayout ? LayoutGrid : Pencil },
            { id: 'style', label: 'Stil', icon: Paintbrush },
            { id: 'advanced', label: 'Gelişmiş', icon: Settings2 },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn('relative flex h-12 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', tab === t.id ? 'text-accent-soft' : 'text-ink-400 hover:text-ink-200')}
          >
            <t.icon size={14} />
            {t.label}
            {tab === t.id && <motion.span layoutId="insp-tab" transition={spring} className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-accent-soft" />}
          </button>
        ))}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            {tab === 'content' && (isCell ? <CellLayoutTab s={s} el={el!} /> : isLayout ? <ContainerLayoutTab s={s} /> : <ContentTab s={s} el={el} />)}
            {tab === 'style' && (isCell ? <CellStyleTab s={s} el={el!} /> : el ? <ElStyleTab s={s} el={el} /> : <ContainerStyleTab s={s} />)}
            {tab === 'advanced' && (isCell ? <CellAdvancedTab s={s} el={el!} /> : el ? <ElAdvancedTab s={s} el={el} /> : <ContainerAdvancedTab s={s} />)}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}

function StudioText({ s, el, label, rows = 2 }: { s: Section; el: string; label: string; rows?: number }) {
  const b = useB()
  const kind = fieldKind(s, el)
  const code = kind === 'code'
  const value = getValue(s, el)
  if (richKind(kind) && (rows > 1 || isRich(value)))
    return (
      <Ctl label={label} stack>
        <RichField value={value} onChange={(v) => b.dispatch({ type: 'field', id: s.id, el, value: v })} rows={Math.min(rows, 4)} multiline={rows > 1} lists={kind === 'text' && rows >= 3} />
      </Ctl>
    )
  return (
    <Ctl label={label} stack>
      <textarea
        
        value={getValue(s, el)}
        onChange={(e) => b.dispatch({ type: 'field', id: s.id, el, value: e.target.value })}
        rows={code ? 12 : rows}
        spellCheck={!code}
        wrap={code ? 'off' : undefined}
        className={cn('w-full resize-y rounded-[5px] border border-white/[0.08] bg-ink-850 px-2 py-1.5 text-[12px] leading-snug text-ink-100 outline-none focus:border-accent/70', code && 'bg-[#0f1012] font-mono text-[11px] leading-[1.7]')}
      />
    </Ctl>
  )
}

function ImagePick({ s, el }: { s: Section; el: string }) {
  const b = useB()
  const url = getValue(s, el)
  return (
    <div className="grid grid-cols-4 gap-1">
      {IMAGES.map((img) => (
        <button key={img.url} type="button" title={img.alt} onClick={() => b.dispatch({ type: 'field', id: s.id, el, value: img.url })} className={cn('aspect-square overflow-hidden rounded ring-2', url === img.url ? 'ring-accent' : 'ring-transparent hover:ring-white/30')}>
          <img src={sized(img.url, 160)} alt={img.alt} className="size-full object-cover" />
        </button>
      ))}
    </div>
  )
}

function ContentTab({ s, el }: { s: Section; el?: string }) {
  const b = useB()
  const def = KINDS[s.kind]
  if (el) {
    const k = fieldKind(s, el)
    if (k === 'icon') return <IconContentTab s={s} el={el} />
    if (isCardEl(el) && CARD_NOUN[s.kind]) return <CardContentTab s={s} el={el} />
    return (
      <Panel title="İçerik">
        {k === 'image' ? <ImagePick s={s} el={el} /> : <StudioText s={s} el={el} label="Metin" rows={4} />}
        {(k === 'button' || k === 'link') && (
          <Ctl label="Bağlantı" stack>
            <LinkField s={s} el={el} dense />
          </Ctl>
        )}
        {k === 'heading' && (
          <Ctl label="HTML etiketi">
            <Select value="h2" w={90} onChange={() => undefined} options={['h1', 'h2', 'h3', 'h4', 'p', 'span'].map((v) => ({ value: v, label: v.toUpperCase() }))} />
          </Ctl>
        )}
      </Panel>
    )
  }
  return (
    <>
      <Panel title="Kapsayıcı">
        <Ctl label="Ad">
          <input value={s.name} onChange={(e) => b.dispatch({ type: 'rename', id: s.id, name: e.target.value })} className={cn(inputCls, 'w-[150px]')} />
        </Ctl>
        <DesignRow s={s} />
        {def.options?.map((o) => (
          <Ctl key={o.key} label={o.label}>
            <Select value={s.content[o.key] ?? o.choices[0].value} onChange={(v) => b.dispatch({ type: 'content', id: s.id, key: o.key, value: v, label: `${o.label} değişti` })} options={o.choices} />
          </Ctl>
        ))}
      </Panel>
      {s.kind === 'layout' && (
        <>
          <Panel title="Yapı">
            <StructureChooser s={s} dense />
          </Panel>
          <Panel title={`Hücreler (${s.items.length})`}>
            {s.items.map((it, n) => (
              <div key={it.id} className="space-y-2 rounded-[5px] border border-white/[0.07] p-2">
                <Ctl label={`Hücre ${n + 1}`}>
                  <Select value={it.title as CellType} w={120} onChange={(v) => b.dispatch({ type: 'cell', id: s.id, itemId: it.id, cell: v })} options={CELL_TYPES} />
                </Ctl>
                {it.title === 'image' ? (
                  <ImagePick s={s} el={`items.${it.id}.text`} />
                ) : (
                  it.title && <StudioText s={s} el={`items.${it.id}.text`} label="Metin" rows={it.title === 'text' ? 3 : 1} />
                )}
              </div>
            ))}
          </Panel>
        </>
      )}
      {def.fields.length > 0 && (
      <Panel title="Metinler">
        {def.fields.filter((f) => f.el !== 'image' && (!f.showIf || f.showIf(s))).map((f) => (
          <StudioText key={f.key} s={s} el={f.key} label={f.label} rows={f.multiline ? 3 : 1} />
        ))}
        {def.fields.filter((f) => f.el === 'image' && (!f.showIf || f.showIf(s))).map((f) => (
          <Ctl key={f.key} label={f.label} stack>
            <ImagePick s={s} el={f.key} />
          </Ctl>
        ))}
      </Panel>
      )}
      {def.items && (
        <Panel title={`${def.items.label} (${s.items.length})`}>
          {s.items.map((it, n) => (
            <div key={it.id} className="flex items-center gap-2 rounded-[5px] border border-white/[0.07] bg-ink-850 pl-2">
              <span className="text-[10.5px] text-ink-500">{n + 1}</span>
              <input
                value={it.title}
                onChange={(e) => b.dispatch({ type: 'field', id: s.id, el: `items.${it.id}.title`, value: e.target.value })}
                className="h-7 min-w-0 flex-1 bg-transparent text-[12px] text-ink-100 outline-none"
              />
              <button type="button" aria-label="Kaldır" onClick={() => b.dispatch({ type: 'removeItem', id: s.id, itemId: it.id })} className="grid size-7 place-items-center text-ink-500 hover:text-red-300">
                <X size={12} />
              </button>
            </div>
          ))}
          {s.items.length < def.items.max && (
            <button type="button" onClick={() => b.dispatch({ type: 'addItem', id: s.id })} className="flex h-7 w-full items-center justify-center gap-1.5 rounded-[5px] border border-dashed border-white/15 text-[11.5px] text-ink-300 hover:text-white">
              <Plus size={12} /> {def.items.add}
            </button>
          )}
        </Panel>
      )}
    </>
  )
}

export function StyleTab({ s, el }: { s: Section; el?: string }) {
  const b = useB()
  const site = b.doc.site
  const fp = FONT_PAIRS[site.fontPair]
  const set = (patch: Partial<Section['style']>, key: string) => b.dispatch({ type: 'style', id: s.id, patch, key, label: 'Stil değişti' })
  const k = el ? fieldKind(s, el) : null
  const titleish = !el || k === 'heading'
  return (
    <>
      {titleish && (
        <Panel title="Tipografi · Başlık">
          <Ctl label="Boyut">
            <Slider value={s.style.titleSize} min={16} max={140} onChange={(v) => set({ titleSize: v }, 'size')} />
          </Ctl>
          <Ctl label="Kalınlık">
            <WeightSelect family={siteFonts(site).heading} value={s.style.titleWeight} w={150} defaultLabel={`Global (${siteFonts(site).headingWeight})`} onChange={(v) => set({ titleWeight: v }, 'weight')} />
          </Ctl>
          <Ctl label="Harf aralığı">
            <Slider value={Math.round((s.style.letterSpacing ?? fp.tracking) * 1000) / 10} min={-8} max={6} step={0.5} unit="%" onChange={(v) => set({ letterSpacing: v / 100 }, 'ls')} />
          </Ctl>
          <Ctl label="Renk">
            <ColorInput value={s.style.titleColor ?? '#ffffff'} onChange={(v) => set({ titleColor: v }, 'tc')} onReset={s.style.titleColor ? () => set({ titleColor: undefined }, 'tc') : undefined} />
          </Ctl>
        </Panel>
      )}
      {(!el || k === 'text') && (
        <Panel title="Tipografi · Metin">
          <Ctl label="Boyut">
            <Slider value={s.style.bodySize ?? 17} min={12} max={26} onChange={(v) => set({ bodySize: v }, 'body')} />
          </Ctl>
        </Panel>
      )}
      {(k === 'button' || k === 'image' || k === 'link' || k === 'badge') && (
        <Panel title="Global stil">
          <p className="text-[11.5px] leading-relaxed text-ink-400">Buton, bağlantı ve görsel stilleri tasarım sistemi tarafından yönetilir.</p>
          <button type="button" onClick={() => { b.select(null); b.setStudioTab('globals') }} className="h-7 w-full rounded-[5px] bg-white/[0.06] text-[11.5px] font-medium text-ink-200 hover:bg-white/10">
            Globalleri aç
          </button>
        </Panel>
      )}
      <Panel title="Arka plan" open={!el}>
        <Ctl label="Palet">
          <Select value={s.style.palette} onChange={(v) => set({ palette: v, bg: undefined }, 'pal')} options={PALETTES.map((p) => ({ value: p.id, label: p.name }))} />
        </Ctl>
        <Ctl label="Özel renk">
          <ColorInput value={s.style.bg ?? '#ffffff'} onChange={(v) => set({ bg: v }, 'bg')} onReset={s.style.bg ? () => set({ bg: undefined }, 'bg') : undefined} />
        </Ctl>
      </Panel>
      {(KINDS[s.kind].spacing || KINDS[s.kind].align) && (
      <Panel title="Düzen" open={!el}>
        {KINDS[s.kind].spacing && (
          <>
            <Ctl label="Üst boşluk">
              <Slider value={getBox(s).padding.t} min={0} max={320} onChange={(v) => b.dispatch({ type: 'box', id: s.id, patch: { padding: { ...getBox(s).padding, t: v } }, key: 'pt' })} />
            </Ctl>
            <Ctl label="Alt boşluk">
              <Slider value={getBox(s).padding.b} min={0} max={320} onChange={(v) => b.dispatch({ type: 'box', id: s.id, patch: { padding: { ...getBox(s).padding, b: v } }, key: 'pb' })} />
            </Ctl>
          </>
        )}
        {KINDS[s.kind].align && (
          <Ctl label="Hizalama">
            <IconSeg
              value={s.style.align}
              onChange={(v) => set({ align: v }, 'align')}
              options={[
                { value: 'left', icon: AlignLeft, label: 'Sola' },
                { value: 'center', icon: AlignCenter, label: 'Ortala' },
              ]}
            />
          </Ctl>
        )}
      </Panel>
      )}
    </>
  )
}

export function AdvancedTab({ s }: { s: Section }) {
  const b = useB()
  const devices: { d: Device; label: string; icon: typeof Monitor }[] = [
    { d: 'desktop', label: 'Masaüstünde gizle', icon: Monitor },
    { d: 'tablet', label: 'Tablette gizle', icon: Tablet },
    { d: 'mobile', label: 'Mobilde gizle', icon: Smartphone },
  ]
  return (
    <>
      <Panel title="Responsive görünürlük">
        {devices.map(({ d, label, icon: I }) => (
          <div key={d} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11.5px] text-ink-300">
              <I size={13} className="text-ink-500" /> {label}
            </span>
            <Toggle
              label={label}
              on={s.style.hideOn.includes(d)}
              onChange={(on) =>
                b.dispatch({ type: 'style', id: s.id, patch: { hideOn: on ? [...s.style.hideOn, d] : s.style.hideOn.filter((x) => x !== d) }, label: 'Görünürlük değişti' })
              }
            />
          </div>
        ))}
        <p className="text-[11px] leading-relaxed text-ink-500">Önizlemek için üstteki cihaz düğmelerini kullanın.</p>
      </Panel>
      <SectionMotionPanel s={s} />
      <Panel title="Özel CSS" open={!!s.style.css}>
        <textarea
          rows={7}
          spellCheck={false}
          wrap="off"
          value={s.style.css ?? ''}
          placeholder={'selector {\n  background: linear-gradient(#111, #223);\n}\nselector h2 { letter-spacing: -0.04em; }'}
          onChange={(e) => b.dispatch({ type: 'style', id: s.id, patch: { css: e.target.value }, key: 'css', label: 'Özel CSS değişti' })}
          className="w-full resize-y rounded-[5px] border border-white/[0.08] bg-[#0f1012] px-2 py-1.5 font-mono text-[11px] leading-[1.7] text-ink-100 outline-none placeholder:text-ink-600 focus:border-accent/70"
        />
        <p className="text-[11px] leading-relaxed text-ink-500">
          <code className="rounded bg-white/[0.07] px-1 text-ink-300">selector</code> bu bölümü hedefler; değişiklikler anında uygulanır.
        </p>
      </Panel>
      <Panel title="Öznitelikler">
        <Ctl label="CSS ID">
          <input value={s.style.cssId ?? ''} placeholder="ornek-bolum" onChange={(e) => b.dispatch({ type: 'style', id: s.id, patch: { cssId: e.target.value.replace(/\s/g, '-') }, key: 'id', label: 'CSS ID değişti' })} className={cn(inputCls, 'w-[150px] font-mono text-[11px]')} />
        </Ctl>
        <Ctl label="Bölüm türü">
          <span className="font-mono text-[11px] text-ink-400">{s.kind}</span>
        </Ctl>
      </Panel>
    </>
  )
}

function Globals() {
  const b = useB()
  const site = b.doc.site
  const set = (patch: Partial<typeof site>, key?: string) => b.dispatch({ type: 'site', patch, key })
  return (
    <>
      <Panel title="Renkler">
        <Ctl label="Marka">
          <ColorInput value={site.brand} onChange={(v) => set({ brand: v }, 'brand')} />
        </Ctl>
        <div className="flex gap-1.5">
          {BRANDS.map((c) => (
            <button key={c.value} type="button" title={c.name} onClick={() => set({ brand: c.value })} className={cn('size-6 rounded-full ring-2 ring-offset-2 ring-offset-ink-900 transition', site.brand === c.value ? 'ring-accent' : 'ring-transparent')} style={{ background: c.value }} />
          ))}
        </div>
        {[
          ['Metin', '#121418'],
          ['Soluk metin', '#5B616C'],
          ['Yüzey', '#FFFFFF'],
          ['Koyu yüzey', '#131417'],
        ].map(([n, c]) => (
          <Ctl key={n} label={n}>
            <span className="flex items-center gap-2 font-mono text-[11px] text-ink-400">
              <span className="size-4 rounded ring-1 ring-inset ring-white/15" style={{ background: c }} />
              {c}
            </span>
          </Ctl>
        ))}
      </Panel>
      <Panel title="Tipografi">
        <SiteTypography />
      </Panel>
      <Panel title="Biçim">
        <Ctl label="Köşe yarıçapı">
          <Select value={site.corners} onChange={(v: CornerId) => set({ corners: v })} options={(Object.keys(CORNERS) as CornerId[]).map((k) => ({ value: k, label: `${CORNERS[k].name} · ${CORNERS[k].card}px` }))} />
        </Ctl>
      </Panel>
    </>
  )
}

/* ---------- Structure (navigator): see Navigator.tsx ---------- */
export { StructurePanel } from './Navigator'
