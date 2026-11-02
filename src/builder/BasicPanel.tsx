import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import {
  AlignCenter,
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Pilcrow,
  RectangleHorizontal,
  SquareDashed,
  Lightbulb,
  Bookmark,
  CircleCheck,
  Circle,
  Sparkles,
  Lock,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { LayoutPicker, StructureChooser } from './LayoutPicker'
import { LinkField } from './LinkField'
import { RichField, richKind } from './RichText'
import { isRich } from './rich'
import { DecorPicker } from './ContainerInspector'
import { BRANDS, CORNERS, FEATURE_ICONS, GRID_CAPS, IMAGES, KINDS, POSITIONED_DECOR, createLayout, fieldKind, findSection, getBg, getBox, getGrid, PALETTES, TEMPLATES, getValue, palette, sectionSummary, sized } from './data'
import { useB, type BasicView } from './store'
import { entranceLabel, getMotion, motionPatch, replayMotion } from './motion'
import { FontPresetGrid } from './TypographyControls'
import { DesignPicker, LibraryButton } from './variants/VariantControls'
import type { CellType, CornerId, Payload, Section, SectionKind } from './types'
import { Segmented, Toggle, cn, ease, spring } from './ui'

const DEPTH: Record<BasicView, number> = { list: 0, design: 0, editor: 1, add: 1 }

export function BasicPanel() {
  const b = useB()
  const prev = useRef(b.basicView)
  const dir = DEPTH[b.basicView] >= DEPTH[prev.current] ? 1 : -1
  useEffect(() => {
    prev.current = b.basicView
  }, [b.basicView])

  const section = findSection(b.doc, b.selection?.sectionId)
  const view = b.basicView === 'editor' && !section ? 'list' : b.basicView
  const tab = view === 'design' ? 'design' : 'sections'

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-5 pb-4 pt-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink-100">Sayfanı düzenle</h2>
        <p className="mt-1 text-[13px] leading-snug text-ink-400">Bir bölüme tıkla, yazıları değiştir. Hepsi bu kadar.</p>
        <Segmented
          id="basic-tab"
          size="lg"
          className="mt-4"
          value={tab}
          onChange={(v) => b.setBasicView(v === 'design' ? 'design' : section ? 'editor' : 'list')}
          options={[
            { value: 'sections', label: 'Bölümler' },
            { value: 'design', label: 'Tasarım' },
          ]}
        />
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={view === 'editor' ? `editor-${section?.id}` : view}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 36, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -36, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease }}
            className="scroll-thin absolute inset-0 overflow-y-auto"
          >
            {view === 'list' && <SectionList />}
            {view === 'editor' && section && <SectionEditor s={section} />}
            {view === 'add' && <AddSection />}
            {view === 'design' && <DesignTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------- List ---------- */
function Thumb({ s, size = 38 }: { s: Section; size?: number }) {
  const { doc } = useB()
  const p = palette(s.style.palette, doc.site.brand)
  const Icon = KINDS[s.kind].icon
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[10px] ring-1 ring-inset ring-white/10 transition-colors duration-300"
      style={{ width: size, height: size, background: s.style.bg || p.bg, color: p.fg }}
    >
      <Icon size={size * 0.45} strokeWidth={1.8} />
    </span>
  )
}

function Row({ s, dragHandle }: { s: Section; dragHandle?: ReactNode }) {
  const b = useB()
  const pinned = KINDS[s.kind].pinned
  return (
    <div
      onMouseEnter={() => b.setHoverSection(s.id)}
      onMouseLeave={() => b.setHoverSection(null)}
      onClick={() => b.select({ sectionId: s.id }, { scroll: true })}
      className={cn(
        'group relative flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
        b.selection?.sectionId === s.id ? 'bg-accent/12 ring-1 ring-accent/50' : 'hover:bg-white/[0.04]',
      )}
    >
      <span className="w-3.5 shrink-0 text-ink-500">{pinned ? <Lock size={12} className="opacity-60" /> : dragHandle}</span>
      <span className={cn('transition-opacity', s.hidden && 'opacity-40')}>
        <Thumb s={s} />
      </span>
      <span className={cn('min-w-0 flex-1 transition-opacity', s.hidden && 'opacity-50')}>
        <span className="block truncate text-[14px] font-medium text-ink-100">{s.name}</span>
        <span className="block truncate text-[12px] text-ink-400">{s.hidden ? 'Gizli' : sectionSummary(s)}</span>
      </span>
      <button
        type="button"
        aria-label={s.hidden ? 'Göster' : 'Gizle'}
        onClick={(e) => {
          e.stopPropagation()
          b.dispatch({ type: 'toggleHidden', id: s.id })
        }}
        className={cn('grid size-8 place-items-center rounded-lg text-ink-400 transition hover:bg-white/10 hover:text-ink-100', s.hidden ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
      >
        {s.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <ChevronRight size={16} className="shrink-0 text-ink-500" />
    </div>
  )
}

function DraggableRow({ s }: { s: Section }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={s.id} dragListener={false} dragControls={controls} className="relative" whileDrag={{ scale: 1.02, zIndex: 10 }}>
      <Row
        s={s}
        dragHandle={
          <span
            onPointerDown={(e) => {
              e.preventDefault()
              controls.start(e)
            }}
            onClick={(e) => e.stopPropagation()}
            className="grid h-8 cursor-grab touch-none place-items-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical size={14} />
          </span>
        }
      />
    </Reorder.Item>
  )
}

function SectionList() {
  const b = useB()
  const all = b.doc.sections
  const head = all.filter((s) => s.kind === 'nav')
  const tail = all.filter((s) => s.kind === 'footer')
  const middle = all.filter((s) => s.kind !== 'nav' && s.kind !== 'footer')
  return (
    <div className="px-3 pb-6">
      {!b.milestones.dismissed && <Checklist />}
      <div className="space-y-0.5">
        {head.map((s) => (
          <Row key={s.id} s={s} />
        ))}
        <Reorder.Group axis="y" values={middle.map((s) => s.id)} onReorder={(ids) => b.dispatch({ type: 'reorder', ids })} className="space-y-0.5">
          {middle.map((s) => (
            <DraggableRow key={s.id} s={s} />
          ))}
        </Reorder.Group>
        {tail.map((s) => (
          <Row key={s.id} s={s} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          b.setInsertAt(null)
          b.setBasicView('add')
        }}
        className="mx-2 mt-3 flex h-12 w-[calc(100%-1rem)] items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-[14px] font-medium text-ink-200 transition hover:border-accent/60 hover:bg-accent/[0.06] hover:text-white"
      >
        <Plus size={17} /> Yeni bölüm ekle
      </button>
      <div className="mx-2 mt-5 flex gap-3 rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.05]">
        <Lightbulb size={17} className="mt-px shrink-0 text-amber-300/90" />
        <p className="text-[12.5px] leading-relaxed text-ink-300">
          Sayfadaki herhangi bir yazıya <b className="font-semibold text-ink-100">çift tıkla</b>, doğrudan üzerine yaz. Sırayı değiştirmek için satırları tutup sürükle.
        </p>
      </div>
    </div>
  )
}

/* ---------- Editor ---------- */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/[0.06] px-5 py-5">
      <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-500">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function TextField({ s, el, label, multiline, compact, mono }: { s: Section; el: string; label?: string; multiline?: boolean; compact?: boolean; mono?: boolean }) {
  const b = useB()
  const value = getValue(s, el)
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const t = ref.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${t.scrollHeight}px`
  }, [value])
  const kind = fieldKind(s, el)
  if (!mono && richKind(kind) && (multiline || isRich(value)))
    return (
      <div className="block">
        {label && <span className="mb-1.5 block text-[12.5px] font-medium text-ink-300">{label}</span>}
        <RichField
          value={value}
          variant="basic"
          dataField={el}
          rows={compact ? 1 : 2}
          multiline={!!multiline}
          lists={!!multiline && kind === 'text'}
          placeholder="Buraya yaz…"
          onChange={(v) => b.dispatch({ type: 'field', id: s.id, el, value: v })}
          onFocus={() => b.setActiveField({ sectionId: s.id, el })}
          onBlur={() => b.setActiveField(null)}
        />
      </div>
    )
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[12.5px] font-medium text-ink-300">{label}</span>}
      <textarea
        ref={ref}
        data-field={el}
        rows={1}
        value={value}
        placeholder="Buraya yaz…"
        onChange={(e) => b.dispatch({ type: 'field', id: s.id, el, value: multiline ? e.target.value : e.target.value.replace(/\n/g, ' ') })}
        onFocus={() => b.setActiveField({ sectionId: s.id, el })}
        onBlur={() => b.setActiveField(null)}
        onKeyDown={(e) => !multiline && e.key === 'Enter' && e.preventDefault()}
        className={cn(
          'block w-full resize-none overflow-hidden rounded-[10px] border border-white/[0.08] bg-ink-800 px-3 text-ink-100 outline-none transition placeholder:text-ink-500 hover:border-white/15 focus:border-accent focus:ring-4 focus:ring-accent/20',
          compact ? 'py-2 text-[13.5px]' : 'py-2.5 text-[14px] leading-snug',
          mono && 'whitespace-pre bg-[#111214] font-mono !text-[12px] !leading-[1.7] overflow-x-auto',
        )}
        spellCheck={!mono}
        wrap={mono ? 'off' : undefined}
      />
    </label>
  )
}

function ImageField({ s, el, label }: { s: Section; el: string; label: string }) {
  const b = useB()
  const [open, setOpen] = useState(false)
  const url = getValue(s, el)
  const set = (v: string) => b.dispatch({ type: 'field', id: s.id, el, value: v })
  return (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-300">{label}</span>
      <button
        type="button"
        data-field={el}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => b.setActiveField({ sectionId: s.id, el })}
        onBlur={() => b.setActiveField(null)}
        className="group relative block aspect-[16/10] w-full overflow-hidden rounded-xl ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <img src={sized(url, 600)} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/70 to-transparent pb-3 pt-8 text-[13px] font-semibold text-white">
          {open ? 'Kapat' : 'Fotoğrafı değiştir'}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} className="overflow-hidden">
            <div className="grid grid-cols-4 gap-1.5 pt-2.5">
              {IMAGES.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  title={img.alt}
                  onClick={() => set(img.url)}
                  className={cn('relative aspect-square overflow-hidden rounded-lg ring-2 transition', url === img.url ? 'ring-accent' : 'ring-transparent hover:ring-white/30')}
                >
                  <img src={sized(img.url, 200)} alt={img.alt} className="size-full object-cover" />
                  {url === img.url && (
                    <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-accent text-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <label className="mt-2 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-white/15 text-[13px] font-medium text-ink-200 transition hover:border-accent/60 hover:text-white">
              <Upload size={15} /> Bilgisayardan yükle
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) set(URL.createObjectURL(f))
                }}
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Choice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-[12.5px] font-medium text-ink-300">{label}</span>
      {children}
    </div>
  )
}

const SPACING = [
  { value: '64', label: 'Az' },
  { value: '112', label: 'Normal' },
  { value: '160', label: 'Çok' },
] as const

function SectionEditor({ s }: { s: Section }) {
  const b = useB()
  const def = KINDS[s.kind]
  const root = useRef<HTMLDivElement>(null)
  const idx = b.doc.sections.findIndex((x) => x.id === s.id)

  useEffect(() => {
    const req = b.focusReq
    if (!req || req.sectionId !== s.id || !req.el) return
    const t = window.setTimeout(() => {
      // Don't steal focus from inline (double-click) editing on the canvas.
      if ((document.activeElement as HTMLElement | null)?.isContentEditable) return
      const node = root.current?.querySelector<HTMLElement>(`[data-field="${req.el}"]`)
      if (!node) return
      node.scrollIntoView({ block: 'center', behavior: 'smooth' })
      node.focus({ preventScroll: true })
      node.classList.remove('flash')
      void node.offsetWidth
      node.classList.add('flash')
    }, 180)
    return () => window.clearTimeout(t)
  }, [b.focusReq, s.id])

  const padT = getBox(s).padding.t
  const nearest = SPACING.reduce((a, c) => (Math.abs(Number(c.value) - padT) < Math.abs(Number(a.value) - padT) ? c : a)).value

  return (
    <div ref={root} className="pb-8">
      <div className="flex items-center gap-3 px-4 pb-4">
        <button
          type="button"
          aria-label="Bölümlere dön"
          onClick={() => {
            b.select(null)
            b.setBasicView('list')
          }}
          className="grid size-9 place-items-center rounded-lg text-ink-300 transition hover:bg-white/[0.07] hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <Thumb s={s} size={34} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-ink-100">{s.name}</div>
          <div className="text-[12px] text-ink-500">
            {idx >= 0 ? `Bölüm ${idx + 1} / ${b.doc.sections.length}` : 'İç kapsayıcı'}
          </div>
        </div>
      </div>

      <DesignPicker s={s} />

      {(() => {
        const visible = def.fields.filter((f) => f.el !== 'image' && (!f.showIf || f.showIf(s)))
        const groups = [...new Set(visible.map((f) => f.group ?? 'Yazılar'))]
        return groups.map((g) => (
          <Group key={g} title={g}>
            {visible
              .filter((f) => (f.group ?? 'Yazılar') === g)
              .map((f) => (
                <div key={f.key}>
                  <TextField s={s} el={f.key} label={f.label} multiline={f.multiline} mono={f.el === 'code'} />
                  {(f.el === 'button' || f.el === 'link') && <LinkField s={s} el={f.key} />}
                  {f.hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">{f.hint}</p>}
                </div>
              ))}
          </Group>
        ))
      })()}

      {def.items && (
        <Group title={def.items.label}>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {s.items.map((it, n) => (
                <motion.div
                  key={it.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 rounded-xl bg-white/[0.025] p-2 ring-1 ring-white/[0.05]">
                    <span className="mt-2.5 w-5 shrink-0 text-center text-[11px] font-semibold text-ink-500">{n + 1}</span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {s.kind === 'features' && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(FEATURE_ICONS).map(([k, I]) => (
                            <button
                              key={k}
                              type="button"
                              aria-label={k}
                              onClick={() => b.dispatch({ type: 'itemPatch', id: s.id, itemId: it.id, patch: { icon: k } })}
                              className={cn('grid size-7 place-items-center rounded-md transition', (it.icon ?? '') === k ? 'bg-accent text-white' : 'text-ink-400 hover:bg-white/[0.07] hover:text-white')}
                            >
                              <I size={14} />
                            </button>
                          ))}
                        </div>
                      )}
                      <TextField s={s} el={`items.${it.id}.title`} compact />
                      {def.items?.titleEl === 'link' && <LinkField s={s} el={`items.${it.id}.title`} />}
                      {def.items?.textLabel && <TextField s={s} el={`items.${it.id}.text`} multiline compact />}
                    </div>
                    <button
                      type="button"
                      aria-label="Kaldır"
                      onClick={() => b.dispatch({ type: 'removeItem', id: s.id, itemId: it.id })}
                      className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-500 transition hover:bg-red-500/15 hover:text-red-300"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {s.items.length < def.items.max && (
            <button
              type="button"
              onClick={() => b.dispatch({ type: 'addItem', id: s.id })}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-white/15 text-[13px] font-medium text-ink-200 transition hover:border-accent/60 hover:text-white"
            >
              <Plus size={15} /> {def.items.add}
            </button>
          )}
        </Group>
      )}

      {(def.fields.some((f) => f.el === 'image' && (!f.showIf || f.showIf(s))) || def.options) && (
        <Group title="Görsel">
          {def.options?.map((o) => (
            <Choice key={o.key} label={o.label}>
              <Segmented
                id={`opt-${o.key}`}
                value={s.content[o.key] ?? o.choices[0].value}
                onChange={(v) => b.dispatch({ type: 'content', id: s.id, key: o.key, value: v, label: `${o.label} değişti` })}
                options={o.choices.map((c) => ({ value: c.value, label: c.label }))}
              />
            </Choice>
          ))}
          {def.fields
            .filter((f) => f.el === 'image' && (!f.showIf || f.showIf(s)))
            .map((f) => (
              <ImageField key={f.key} s={s} el={f.key} label={f.label} />
            ))}
        </Group>
      )}

      {s.kind === 'layout' && <LayoutGroups s={s} />}

      <Group title="Görünüm">
        <Choice label="Arka plan rengi">
          <div className="flex justify-between">
            {PALETTES.map((p) => {
              const v = palette(p.id, b.doc.site.brand)
              const on = s.style.palette === p.id && !s.style.bg
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => b.dispatch({ type: 'style', id: s.id, patch: { palette: p.id, bg: undefined }, label: 'Arka plan değişti' })}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'relative grid size-11 place-items-center rounded-full text-[13px] font-semibold ring-1 ring-inset ring-white/15 transition-transform duration-200 group-hover:scale-105',
                      on && 'ring-2 ring-offset-[3px] ring-offset-ink-900 !ring-accent',
                    )}
                    style={{ background: v.bg, color: v.fg }}
                  >
                    Aa
                  </span>
                  <span className={cn('text-[11.5px]', on ? 'font-semibold text-ink-100' : 'text-ink-400')}>{p.name}</span>
                </button>
              )
            })}
          </div>
        </Choice>
        {def.align && (
          <Choice label="Hizalama">
            <Segmented
              id={`align-${s.id}`}
              value={s.style.align}
              onChange={(v) => b.dispatch({ type: 'style', id: s.id, patch: { align: v }, label: 'Hizalama değişti' })}
              options={[
                { value: 'left', label: 'Sola', icon: AlignLeft },
                { value: 'center', label: 'Ortaya', icon: AlignCenter },
              ]}
            />
          </Choice>
        )}
        {def.spacing && (
          <Choice label="Üst ve alt boşluk">
            <Segmented
              id={`space-${s.id}`}
              value={nearest}
              onChange={(v) => b.dispatch({ type: 'box', id: s.id, patch: { padding: { ...getBox(s).padding, t: Number(v), b: Number(v) } } })}
              options={SPACING.map((x) => ({ value: x.value, label: x.label }))}
            />
            <p className="mt-2 text-[12px] leading-relaxed text-ink-500">İpucu: sayfadaki yeşil “Üst/Alt boşluk” etiketlerini sürükleyerek de ayarlayabilirsin.</p>
          </Choice>
        )}
      </Group>

      <Group title="Arka plan süsü">
        <DecorPicker value={getBg(s).decor} size="lg" onChange={(d) => b.dispatch({ type: 'bg', id: s.id, patch: { decor: d }, label: 'Arka plan süsü değişti' })} />
        {getBg(s).decor !== 'none' && (
          <Choice label="Belirginlik">
            <Segmented
              id={`dop-${s.id}`}
              value={String(getBg(s).decorOpacity <= 10 ? 8 : getBg(s).decorOpacity >= 26 ? 34 : 16)}
              onChange={(v) => b.dispatch({ type: 'bg', id: s.id, patch: { decorOpacity: Number(v) } })}
              options={[
                { value: '8', label: 'Silik' },
                { value: '16', label: 'Normal' },
                { value: '34', label: 'Belirgin' },
              ]}
            />
            {POSITIONED_DECOR.includes(getBg(s).decor) && <p className="mt-2 text-[12px] leading-relaxed text-ink-500">Sayfadaki mavi “Dekor” etiketini sürükleyerek yerini değiştirebilirsin.</p>}
          </Choice>
        )}
        <Choice label="Arka plan fotoğrafı">
          <Segmented
            id={`bgt-${s.id}`}
            value={getBg(s).type === 'image' ? 'image' : 'none'}
            onChange={(v) => b.dispatch({ type: 'bg', id: s.id, patch: v === 'image' ? { type: 'image', image: getBg(s).image ?? IMAGES[6].url } : { type: 'color' } })}
            options={[
              { value: 'none', label: 'Yok' },
              { value: 'image', label: 'Fotoğraf kullan' },
            ]}
          />
          {getBg(s).type === 'image' && (
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {IMAGES.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  title={img.alt}
                  onClick={() => b.dispatch({ type: 'bg', id: s.id, patch: { image: img.url } })}
                  className={cn('aspect-square overflow-hidden rounded-lg ring-2 transition', getBg(s).image === img.url ? 'ring-accent' : 'ring-transparent hover:ring-white/30')}
                >
                  <img src={sized(img.url, 200)} alt={img.alt} className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Choice>
      </Group>

      {GRID_CAPS[s.kind]?.cols && (
        <Group title="Kart düzeni">
          <Choice label="Yan yana kaç kart?">
            <Segmented
              id={`cols-${s.id}`}
              value={String(Math.min(4, Math.max(1, getGrid(s).cols)))}
              onChange={(v) => b.dispatch({ type: 'grid', id: s.id, patch: { cols: Number(v), colsT: Math.min(Number(v), 2) } })}
              options={['1', '2', '3', '4'].map((v) => ({ value: v, label: v }))}
            />
          </Choice>
          <Choice label="Kartlar arası boşluk">
            <Segmented
              id={`cgap-${s.id}`}
              value={String(getGrid(s).gapX <= 4 ? 1 : getGrid(s).gapX >= 28 ? 32 : 16)}
              onChange={(v) => b.dispatch({ type: 'grid', id: s.id, patch: { gapX: Number(v), gapY: Number(v) } })}
              options={[
                { value: '1', label: 'Bitişik' },
                { value: '16', label: 'Normal' },
                { value: '32', label: 'Geniş' },
              ]}
            />
          </Choice>
          <p className="text-[12px] leading-relaxed text-ink-500">Telefonda kartlar otomatik alt alta dizilir. Ayrıntılı ızgara ayarları Studio'da.</p>
        </Group>
      )}

      <Group title="Hareket">
        <Choice label="Sayfa kaydırılınca belirme">
          <Segmented
            id={`anim-${s.id}`}
            value={getMotion(s).entrance}
            onChange={(v) => {
              b.dispatch({ type: 'style', id: s.id, patch: motionPatch(s, { entrance: v }), label: 'Hareket değişti' })
              if (v !== 'none') window.setTimeout(() => replayMotion(s.id), 60)
            }}
            options={[
              { value: 'none', label: 'Yok' },
              { value: 'fade', label: 'Belir' },
              { value: 'fade-up', label: 'Kay' },
              { value: 'zoom-in', label: 'Büyü' },
            ]}
          />
          {!['none', 'fade', 'fade-up', 'zoom-in'].includes(getMotion(s).entrance) && <p className="mt-2 text-[12px] text-ink-400">Studio'da seçilen: {entranceLabel(getMotion(s).entrance)}</p>}
        </Choice>
        {getMotion(s).entrance !== 'none' && (
          <>
            {!!GRID_CAPS[s.kind]?.cols && (
              <label className="flex items-center justify-between gap-3 text-[12.5px] font-medium text-ink-300">
                Kartları sırayla göster
                <Toggle label="Kartları sırayla göster" on={getMotion(s).stagger} onChange={(v) => b.dispatch({ type: 'style', id: s.id, patch: motionPatch(s, { stagger: v }), label: 'Hareket değişti' })} />
              </label>
            )}
            <button type="button" onClick={() => replayMotion(s.id)} className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-[12.5px] font-medium text-ink-200 ring-1 ring-white/[0.06] transition hover:bg-white/[0.08] hover:text-white">
              <Play size={12} className="fill-current" /> Önizle
            </button>
          </>
        )}
        <p className="text-[12px] text-ink-500">Düzenlerken içerik gizlenmez; etki önizlemede (P) ve yayında oynar.</p>
      </Group>

      <Group title="Bölüm">
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { i: ArrowUp, l: 'Yukarı', f: () => b.dispatch({ type: 'move', id: s.id, dir: -1 }), off: def.pinned },
            { i: ArrowDown, l: 'Aşağı', f: () => b.dispatch({ type: 'move', id: s.id, dir: 1 }), off: def.pinned },
            { i: Copy, l: 'Çoğalt', f: () => b.dispatch({ type: 'duplicate', id: s.id }), off: def.pinned },
            { i: s.hidden ? Eye : EyeOff, l: s.hidden ? 'Göster' : 'Gizle', f: () => b.dispatch({ type: 'toggleHidden', id: s.id }) },
            { i: Trash2, l: 'Sil', f: () => b.remove(s.id), off: def.pinned, danger: true },
          ].map(({ i: I, l, f, off, danger }) => (
            <button
              key={l}
              type="button"
              disabled={off}
              onClick={f}
              className={cn(
                'flex h-[58px] flex-col items-center justify-center gap-1.5 rounded-xl bg-white/[0.035] text-[11.5px] font-medium text-ink-300 ring-1 ring-white/[0.05] transition disabled:opacity-30',
                danger ? 'hover:bg-red-500/15 hover:text-red-300' : 'hover:bg-white/[0.07] hover:text-white',
              )}
            >
              <I size={16} strokeWidth={1.8} />
              {l}
            </button>
          ))}
        </div>
        {def.pinned && <p className="text-[12px] text-ink-500">Bu bölüm sayfada sabit durur; taşınamaz ve silinemez.</p>}
      </Group>
    </div>
  )
}

/* ---------- Add section ---------- */
function Bar({ w, c, h = 3 }: { w: string; c: string; h?: number }) {
  return <span className="block rounded-full" style={{ width: w, height: h, background: c }} />
}

function TemplateThumb({ kind }: { kind: SectionKind }) {
  const { doc } = useB()
  const brand = doc.site.brand
  const light = { bg: '#f4f5f7', fg: '#1b1d22', mute: '#c9ccd3' }
  const box = 'flex size-full flex-col justify-center gap-1.5 p-3'
  switch (kind) {
    case 'hero':
    case 'cta':
      return (
        <div className={cn(box, kind === 'cta' && 'items-center')} style={{ background: brand }}>
          <Bar w="62%" h={6} c="#fff" />
          <Bar w="44%" h={6} c="rgba(255,255,255,.75)" />
          <span className="mt-1 flex gap-1">
            <span className="h-2.5 w-7 rounded-sm bg-white" />
            <span className="h-2.5 w-7 rounded-sm ring-1 ring-white/80" />
          </span>
        </div>
      )
    case 'features':
      return (
        <div className={box} style={{ background: light.bg }}>
          <Bar w="50%" h={5} c={light.fg} />
          <span className="mt-1 grid grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex h-8 flex-col gap-1 rounded-sm bg-white p-1">
                <span className="size-1.5 rounded-sm" style={{ background: brand }} />
                <Bar w="80%" c={light.mute} h={2} />
              </span>
            ))}
          </span>
        </div>
      )
    case 'media':
      return (
        <div className="flex size-full items-center gap-2 p-3" style={{ background: light.bg }}>
          <img src={sized(IMAGES[0].url, 160)} alt="" className="h-full w-1/2 rounded-sm object-cover" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Bar w="90%" h={4} c={light.fg} />
            <Bar w="70%" c={light.mute} />
            <Bar w="40%" c={brand} />
          </span>
        </div>
      )
    case 'steps':
      return (
        <div className={box} style={{ background: '#16171a' }}>
          <Bar w="44%" h={5} c="#f2f3f5" />
          <span className="mt-1 grid grid-cols-3 gap-1.5">
            {['01', '02', '03'].map((n) => (
              <span key={n} className="flex flex-col gap-1">
                <span className="font-serif text-[11px] leading-none" style={{ color: '#9db0ff' }}>
                  {n}
                </span>
                <Bar w="85%" c="rgba(255,255,255,.25)" h={2} />
              </span>
            ))}
          </span>
        </div>
      )
    case 'quote':
      return (
        <div className={cn(box, 'items-center')} style={{ background: '#f3ece1' }}>
          <span className="font-serif text-[20px] leading-none" style={{ color: brand }}>
            “
          </span>
          <Bar w="80%" h={4} c="#2a2219" />
          <Bar w="60%" h={4} c="#2a2219" />
          <span className="mt-0.5 size-3 rounded-full bg-[#2a2219]" />
        </div>
      )
    case 'faq':
      return (
        <div className={box} style={{ background: '#fff' }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex items-center justify-between border-b border-[#e6e7ea] pb-1">
              <Bar w="60%" h={3} c={light.fg} />
              <span className="size-1.5 rounded-full" style={{ background: brand }} />
            </span>
          ))}
        </div>
      )
    case 'banner':
      return (
        <div className="flex size-full flex-col justify-center p-3" style={{ background: '#fff' }}>
          <span className="flex h-4 items-center justify-center gap-1 rounded-sm" style={{ background: light.bg }}>
            <Bar w="40%" c={light.mute} h={2} />
            <Bar w="20%" c={brand} h={2} />
          </span>
        </div>
      )
    case 'form':
      return (
        <div className="grid size-full grid-cols-2 gap-2 p-3" style={{ background: light.bg }}>
          <span className="flex flex-col justify-center gap-1.5">
            <Bar w="80%" h={5} c={light.fg} />
            <Bar w="60%" c={light.mute} />
          </span>
          <span className="flex flex-col justify-center gap-1">
            <span className="h-2.5 rounded-sm bg-white" />
            <span className="h-2.5 rounded-sm bg-white" />
            <span className="h-2.5 w-1/2 rounded-sm" style={{ background: brand }} />
          </span>
        </div>
      )
    default:
      return (
        <div className="flex size-full flex-col gap-1.5 p-3" style={{ background: '#fff' }}>
          <img src={sized(IMAGES[1].url, 200)} alt="" className="h-[70%] w-full rounded-sm object-cover" />
          <Bar w="50%" c={light.mute} h={2} />
        </div>
      )
  }
}

function AddSection() {
  const b = useB()
  const sections = b.doc.sections
  const sel = sections.findIndex((s) => s.id === b.selection?.sectionId)
  const at = b.insertAt ?? (sel >= 0 ? sel + 1 : null)
  const after = at != null ? sections[at - 1] : null
  const add = (p: Payload) => b.add(p, at ?? undefined)
  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pb-1">
        <button
          type="button"
          aria-label="Geri"
          onClick={() => b.setBasicView(b.selection ? 'editor' : 'list')}
          className="grid size-9 place-items-center rounded-lg text-ink-300 transition hover:bg-white/[0.07] hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-[15px] font-semibold text-ink-100">Yeni bölüm ekle</div>
          <div className="text-[12px] text-ink-500">Beğendiğine tıkla ya da sayfaya sürükle.</div>
        </div>
      </div>
      {after && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-[12.5px] text-accent-soft">
          <ArrowDown size={14} /> <span className="truncate"><b className="font-semibold">{after.name}</b> bölümünün altına eklenecek</span>
        </div>
      )}
      <div className="mx-5 mt-4">
        <LibraryButton index={at ?? undefined} />
      </div>
      <div className="mx-5 mt-4 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
        <LayoutPicker
          tone="dark"
          compact
          widthChoice
          onPick={(type, structure, width) => add({ kind: 'layout', label: type === 'grid' ? 'Grid kapsayıcı' : 'Flexbox kapsayıcı', section: createLayout(type, structure, { width }) })}
        />
      </div>
      {b.saved.length > 0 && (
        <>
          <div className="px-5 pt-6 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-500">Kaydettiklerin</div>
          <div className="space-y-1 px-4 pt-2">
            {b.saved.map((c) => (
              <div key={c.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]">
                <button type="button" onClick={() => add({ kind: c.section.kind, label: c.name, section: c.section })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent-soft">
                    <Bookmark size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-ink-100">{c.name}</span>
                    <span className="block text-[11.5px] text-ink-500">{KINDS[c.section.kind].name}</span>
                  </span>
                </button>
                <button type="button" aria-label="Kaldır" onClick={() => b.removeSaved(c.id)} className="grid size-7 place-items-center rounded-lg text-ink-500 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="px-5 pt-6 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-500">ya da hazır bir bölüm seç</div>
      <div className="grid grid-cols-2 gap-3 px-5 pt-3">
        {TEMPLATES.map((t, i) => (
          <motion.button
            key={t.kind}
            type="button"
            draggable
            onDragStartCapture={(e: React.DragEvent) => {
              e.dataTransfer.setData('text/plain', t.label)
              e.dataTransfer.effectAllowed = 'copy'
              b.setDragging(t)
            }}
            onDragEndCapture={() => {
              b.setDragging(null)
              b.setDrop(null)
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * i, duration: 0.3, ease }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => add(t)}
            className="group text-left"
          >
            <span className="block aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-white/10 transition group-hover:ring-2 group-hover:ring-accent">
              <TemplateThumb kind={t.kind} />
            </span>
            <span className="mt-2 block text-[13px] font-medium text-ink-100">{t.label}</span>
            <span className="block text-[11.5px] leading-snug text-ink-500">{KINDS[t.kind].blurb}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Design ---------- */
function DesignTab() {
  const b = useB()
  const site = b.doc.site
  return (
    <div className="pb-8">
      <Group title="Ana renk">
        <p className="-mt-1 text-[12.5px] leading-snug text-ink-400">Butonlar, vurgular ve marka renkli bölümler bu renge boyanır.</p>
        <div className="grid grid-cols-6 gap-2">
          {BRANDS.map((c) => {
            const on = site.brand === c.value
            return (
              <button key={c.value} type="button" onClick={() => b.dispatch({ type: 'site', patch: { brand: c.value } })} className="group flex flex-col items-center gap-1.5">
                <span
                  className={cn('grid size-9 place-items-center rounded-full text-white ring-1 ring-inset ring-white/15 transition-transform group-hover:scale-110', on && 'ring-2 ring-offset-[3px] ring-offset-ink-900 !ring-accent')}
                  style={{ background: c.value }}
                >
                  {on && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>
                      <Check size={15} strokeWidth={3} />
                    </motion.span>
                  )}
                </span>
                <span className={cn('text-[11px]', on ? 'text-ink-100' : 'text-ink-500')}>{c.name}</span>
              </button>
            )
          })}
        </div>
      </Group>
      <Group title="Yazı stili">
        <p className="-mt-1 text-[12.5px] leading-snug text-ink-400">Başlık ve gövde fontu birlikte değişir. Tek tek font seçmek için Studio › Globaller › Tipografi.</p>
        <FontPresetGrid large />
      </Group>
      <Group title="Köşeler">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CORNERS) as CornerId[]).map((k) => {
            const c = CORNERS[k]
            const on = site.corners === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => b.dispatch({ type: 'site', patch: { corners: k } })}
                className={cn('flex h-[76px] flex-col items-center justify-center gap-2.5 rounded-xl ring-1 transition', on ? 'bg-accent/12 ring-2 ring-accent' : 'bg-white/[0.03] ring-white/[0.07] hover:bg-white/[0.06]')}
              >
                <span className="h-5 w-12 bg-accent transition-[border-radius]" style={{ borderRadius: Math.min(c.btn, 10) }} />
                <span className={cn('text-[12px]', on ? 'font-semibold text-ink-100' : 'text-ink-400')}>{c.name}</span>
              </button>
            )
          })}
        </div>
      </Group>
      <p className="px-5 text-[12px] leading-relaxed text-ink-500">Bu ayarlar tüm sayfaya aynı anda uygulanır. Beğenmezsen üst menüdeki geri al düğmesini kullan.</p>
    </div>
  )
}

/* ---------- Layout (Flexbox / Grid) ---------- */
const CELL_OPTS: { t: CellType; label: string; icon: typeof Heading }[] = [
  { t: '', label: 'Boş', icon: SquareDashed },
  { t: 'heading', label: 'Başlık', icon: Heading },
  { t: 'text', label: 'Metin', icon: Pilcrow },
  { t: 'button', label: 'Buton', icon: RectangleHorizontal },
  { t: 'image', label: 'Görsel', icon: ImageIcon },
]

function LayoutGroups({ s }: { s: Section }) {
  const b = useB()
  return (
    <>
      <Group title="Yapı">
        <StructureChooser s={s} />
      </Group>
      <Group title="Boyut ve boşluk">
        <Choice label="Genişlik">
          <Segmented
            id={`cw-${s.id}`}
            value={getBox(s).contentWidth}
            onChange={(v) => b.dispatch({ type: 'box', id: s.id, patch: v === 'full' ? { contentWidth: v, width: 100, widthUnit: '%' } : { contentWidth: v, width: 1160, widthUnit: 'px' } })}
            options={[
              { value: 'boxed', label: 'Ortada kutu' },
              { value: 'full', label: 'Tam genişlik' },
            ]}
          />
        </Choice>
        <Choice label="Hücreler arası boşluk">
          <Segmented
            id={`gap-${s.id}`}
            value={String(getBox(s).gapX <= 16 ? 12 : getBox(s).gapX >= 48 ? 56 : 32)}
            onChange={(v) => b.dispatch({ type: 'box', id: s.id, patch: { gapX: Number(v), gapY: Number(v) } })}
            options={[
              { value: '12', label: 'Az' },
              { value: '32', label: 'Normal' },
              { value: '56', label: 'Çok' },
            ]}
          />
        </Choice>
        <Choice label="Üst ve alt boşluk">
          <Segmented
            id={`pad-${s.id}`}
            value={String(getBox(s).padding.t <= 48 ? 40 : getBox(s).padding.t >= 100 ? 120 : 72)}
            onChange={(v) => b.dispatch({ type: 'box', id: s.id, patch: { padding: { ...getBox(s).padding, t: Number(v), b: Number(v) } } })}
            options={[
              { value: '40', label: 'Az' },
              { value: '72', label: 'Normal' },
              { value: '120', label: 'Çok' },
            ]}
          />
        </Choice>
        <p className="text-[12px] leading-relaxed text-ink-500">Margin, padding ve piksel ayarlarının hepsi Studio modunda.</p>
      </Group>
      <Group title="Hücreler">
        {s.items.map((it, n) => {
          const el = `items.${it.id}.text`
          return (
            <div key={it.id} className="rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.05]">
              <div className="mb-2.5 text-[12.5px] font-medium text-ink-300">Hücre {n + 1}</div>
              <div className="grid grid-cols-5 gap-1">
                {CELL_OPTS.map(({ t, label, icon: I }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => b.dispatch({ type: 'cell', id: s.id, itemId: it.id, cell: t })}
                    className={cn(
                      'flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10.5px] font-medium transition',
                      it.title === t ? 'bg-accent/15 text-white ring-1 ring-accent' : 'text-ink-400 hover:bg-white/[0.06] hover:text-ink-100',
                    )}
                  >
                    <I size={15} strokeWidth={1.8} />
                    {label}
                  </button>
                ))}
              </div>
              {(it.title === 'heading' || it.title === 'text' || it.title === 'button') && (
                <div className="mt-2.5">
                  <TextField s={s} el={el} multiline={it.title === 'text'} compact />
                </div>
              )}
              {it.title === 'image' && (
                <div className="mt-2.5">
                  <ImageField s={s} el={el} label="Fotoğraf" />
                </div>
              )}
            </div>
          )
        })}
      </Group>
    </>
  )
}

/* ---------- First steps checklist (for beginners) ---------- */
function Checklist() {
  const b = useB()
  const m = b.milestones
  const hero = b.doc.sections.find((s) => s.kind === 'hero')
  const steps = [
    { done: m.title, label: 'Başlığını değiştir', run: () => hero && b.select({ sectionId: hero.id, el: 'title' }, { focus: true, scroll: true }) },
    { done: m.color, label: 'Sitenin rengini seç', run: () => b.setBasicView('design') },
    { done: m.section, label: 'Yeni bir bölüm ekle', run: () => b.setBasicView('add') },
    { done: m.publish, label: 'Önizle ve yayınla', run: () => b.setPreview(true) },
  ]
  const n = steps.filter((x) => x.done).length
  return (
    <motion.div layout className="mx-1 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-accent/[0.14] to-accent/[0.04] p-3.5 ring-1 ring-accent/25">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-accent-soft" />
        <span className="flex-1 text-[13.5px] font-semibold text-ink-100">{n === steps.length ? 'Harika, siten hazır!' : 'İlk adımlar'}</span>
        <span className="text-[11.5px] font-medium text-ink-400">
          {n}/{steps.length}
        </span>
        <button type="button" aria-label="Gizle" onClick={() => b.setMilestone('dismissed')} className="grid size-6 place-items-center rounded-md text-ink-400 hover:bg-white/10 hover:text-white">
          <X size={13} />
        </button>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${(n / steps.length) * 100}%` }} transition={spring} />
      </div>
      <div className="mt-2 space-y-0.5">
        {steps.map((st) => (
          <button
            key={st.label}
            type="button"
            onClick={st.run}
            className="flex h-8 w-full items-center gap-2.5 rounded-lg px-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.06]"
          >
            {st.done ? <CircleCheck size={16} className="text-emerald-400" /> : <Circle size={16} className="text-ink-500" />}
            <span className={cn('flex-1', st.done ? 'text-ink-400 line-through decoration-ink-500/60' : 'text-ink-100')}>{st.label}</span>
            {!st.done && <ChevronRight size={14} className="text-ink-500" />}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
