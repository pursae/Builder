import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, TriangleAlert } from 'lucide-react'
import { FONT_CATS, GOOGLE_FONTS, SAMPLE, SITE_BODY, SITE_HEADING, SYSTEM_FONTS, WEIGHT_NAMES, fontStack, getFont, previewFont, pushRecent, recentFonts, weightsOf, type FontCat, type FontDef } from './fonts'
import { Select, inputCls } from './StudioPanel'
import { cn } from './ui'

interface Opt {
  key: string
  value: string | undefined
  label: string
  /** Family the row is rendered in. */
  family?: string
  def?: FontDef
  group: string
}

const CAT_SHORT: Record<FontCat, string> = { sans: 'Sans', serif: 'Serif', display: 'Display', hand: 'El yazısı', mono: 'Mono' }
const fold = (s: string) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i')

/**
 * Searchable font library dropdown. `value` is a family name, '@heading' / '@body' (site fonts) or
 * undefined (the default described by `defaultLabel` / `defaultFont`).
 */
export function FontPicker({
  value,
  onChange,
  defaultLabel,
  defaultFont,
  site,
}: {
  value?: string
  onChange: (v: string | undefined) => void
  defaultLabel: string
  defaultFont?: string
  /** Offer the site heading / body fonts as options (element level). */
  site?: { heading: string; body: string }
}) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const shown = value === SITE_HEADING ? site?.heading : value === SITE_BODY ? site?.body : value ?? defaultFont
  const label = value === SITE_HEADING ? `Site başlık · ${site?.heading}` : value === SITE_BODY ? `Site gövde · ${site?.body}` : value ?? defaultLabel
  const def = getFont(value)
  useEffect(() => {
    if (shown) previewFont(shown)
  }, [shown])
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(inputCls, 'flex w-full items-center gap-1.5 text-left', open && 'border-accent/70')}
      >
        <span className="min-w-0 flex-1 truncate text-[12.5px]" style={{ fontFamily: fontStack(shown) }}>
          {label}
        </span>
        {def && !def.tr && <TriangleAlert size={12} className="shrink-0 text-amber-400" aria-label="Türkçe karakter desteği yok" />}
        <ChevronDown size={12} className="shrink-0 text-ink-500" />
      </button>
      {open && (
        <FontMenu
          anchor={btn}
          value={value}
          defaultLabel={defaultLabel}
          defaultFont={defaultFont}
          site={site}
          onClose={(focus) => {
            setOpen(false)
            if (focus) btn.current?.focus()
          }}
          onPick={(v) => {
            if (v && getFont(v)) pushRecent(v)
            onChange(v)
            setOpen(false)
            btn.current?.focus()
          }}
        />
      )}
    </>
  )
}

function FontMenu({
  anchor,
  value,
  defaultLabel,
  defaultFont,
  site,
  onClose,
  onPick,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>
  value?: string
  defaultLabel: string
  defaultFont?: string
  site?: { heading: string; body: string }
  onClose: (focus: boolean) => void
  onPick: (v: string | undefined) => void
}) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<FontCat | null>(null)
  const [trOnly, setTrOnly] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const recent = useMemo(recentFonts, [])

  const opts = useMemo(() => {
    const out: Opt[] = []
    const f = fold(q.trim())
    const keep = (d: FontDef) => (!f || fold(d.family).includes(f)) && (!cat || d.cat === cat) && (!trOnly || d.tr)
    if (!f && !cat) {
      out.push({ key: 'default', value: undefined, label: defaultLabel, family: defaultFont, group: 'Varsayılan' })
      if (site) {
        out.push({ key: SITE_HEADING, value: SITE_HEADING, label: `Site başlık fontu · ${site.heading}`, family: site.heading, group: 'Varsayılan' })
        out.push({ key: SITE_BODY, value: SITE_BODY, label: `Site gövde fontu · ${site.body}`, family: site.body, group: 'Varsayılan' })
      }
      for (const r of recent) {
        const d = getFont(r)
        if (d && keep(d)) out.push({ key: `r:${r}`, value: d.family, label: d.family, family: d.family, def: d, group: 'Son kullanılanlar' })
      }
    }
    for (const d of GOOGLE_FONTS.filter(keep)) out.push({ key: d.family, value: d.family, label: d.family, family: d.family, def: d, group: 'Google Fonts' })
    for (const d of SYSTEM_FONTS.filter(keep)) out.push({ key: d.family, value: d.family, label: d.family, family: d.family, def: d, group: 'Sistem fontları' })
    return out
  }, [q, cat, trOnly, recent, defaultLabel, defaultFont, site])

  // Start on the current value.
  useEffect(() => {
    const i = opts.findIndex((o) => o.value === value)
    setActive(q || cat ? 0 : Math.max(0, i))
  }, [opts])

  useLayoutEffect(() => {
    const r = anchor.current?.getBoundingClientRect()
    if (!r) return
    const W = 288
    const H = 470
    const up = r.bottom + H > window.innerHeight - 8 && r.top > window.innerHeight - r.bottom
    setPos({ left: Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8)), top: up ? r.top - 6 : r.bottom + 6, up })
  }, [anchor])

  // Close on outside press, outside scroll and resize.
  useEffect(() => {
    const inside = (t: EventTarget | null) => t instanceof Node && (root.current?.contains(t) || anchor.current?.contains(t))
    const down = (e: PointerEvent) => !inside(e.target) && onClose(false)
    const scroll = (e: Event) => !inside(e.target) && onClose(false)
    const resize = () => onClose(false)
    document.addEventListener('pointerdown', down, true)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', resize)
    }
  }, [anchor, onClose])

  // Rows load a tiny glyph subset of their font once they scroll into view.
  useEffect(() => {
    const el = list.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const fam = (e.target as HTMLElement).dataset.font
          if (fam) previewFont(fam)
          io.unobserve(e.target)
        }
      },
      { root: el, rootMargin: '120px 0px' },
    )
    el.querySelectorAll('[data-font]').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [opts, pos])

  useEffect(() => {
    list.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKey = (e: RKeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const d = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => Math.max(0, Math.min(opts.length - 1, a + d)))
    } else if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, Math.min(opts.length - 1, a + (e.key === 'PageDown' ? 8 : -8))))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = opts[active]
      if (o) onPick(o.value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose(true)
    }
  }

  const cur = opts[active]
  const preview = cur?.family ?? defaultFont
  const warn = cur?.def && !cur.def.tr

  if (!pos) return null
  let lastGroup = ''
  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-label="Font kütüphanesi"
      onKeyDown={onKey}
      className="tip-in fixed z-[300] flex w-[288px] flex-col overflow-hidden rounded-[9px] border border-white/[0.09] bg-ink-850 shadow-[0_24px_60px_-12px_rgba(0,0,0,.75)]"
      style={{ left: pos.left, top: pos.top, transform: pos.up ? 'translateY(-100%)' : undefined }}
    >
      <div className="space-y-2 border-b border-white/[0.07] p-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`${GOOGLE_FONTS.length + SYSTEM_FONTS.length} font içinde ara…`}
            aria-label="Font ara"
            aria-controls="font-list"
            aria-activedescendant={cur ? `font-opt-${active}` : undefined}
            className={cn(inputCls, 'w-full pl-7')}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Chip on={!cat} onClick={() => setCat(null)}>
            Tümü
          </Chip>
          {FONT_CATS.map((c) => (
            <Chip key={c.id} on={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
              {c.label}
            </Chip>
          ))}
          <Chip on={trOnly} onClick={() => setTrOnly(!trOnly)} title="Yalnız ş ğ ı İ ç ö ü içeren fontlar">
            Türkçe ✓
          </Chip>
        </div>
      </div>
      <div ref={list} id="font-list" role="listbox" className="scroll-thin max-h-[300px] overflow-y-auto py-1">
        {opts.length === 0 && <p className="px-3 py-6 text-center text-[11.5px] text-ink-500">“{q}” için font bulunamadı.</p>}
        {opts.map((o, i) => {
          const head = o.group !== lastGroup
          lastGroup = o.group
          const selected = o.value === value
          return (
            <div key={o.key}>
              {head && <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[.1em] text-ink-500">{o.group}</div>}
              <div
                id={`font-opt-${i}`}
                role="option"
                aria-selected={selected}
                data-idx={i}
                data-font={o.def && !o.def.stack ? o.def.family : undefined}
                onMouseMove={() => active !== i && setActive(i)}
                onClick={() => onPick(o.value)}
                className={cn('mx-1 flex h-8 cursor-pointer items-center gap-2 rounded-[5px] px-2', i === active ? 'bg-white/[0.08]' : '')}
              >
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink-100" style={{ fontFamily: fontStack(o.family) }}>
                  {o.label}
                </span>
                {o.def && !o.def.tr && <TriangleAlert size={11} className="shrink-0 text-amber-400" aria-label="Türkçe karakter desteği yok" />}
                {o.def && <span className="shrink-0 text-[10px] text-ink-500">{CAT_SHORT[o.def.cat]}</span>}
                {selected && <Check size={13} className="shrink-0 text-accent-soft" />}
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-white/[0.07] px-3 py-2.5">
        <div className="truncate text-[22px] leading-[1.25] text-ink-100" style={{ fontFamily: fontStack(preview) }}>
          {SAMPLE}
        </div>
        <div className={cn('mt-1 text-[10.5px] leading-snug', warn ? 'text-amber-300/90' : 'text-ink-500')}>
          {warn
            ? 'Bu font Türkçe harfleri (ş ğ ı İ) içermiyor; eksik harfler yedek fonttan görünür.'
            : cur?.def
              ? `${cur.def.family} · ${cur.def.weights.length} kalınlık${cur.def.italics.length ? ' · italik' : ''}${cur.def.stack ? ' · sistem fontu' : ''}`
              : '↑↓ ile gez, Enter ile seç'}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Chip({ on, onClick, title, children }: { on: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn('h-[22px] rounded-full px-2 text-[10.5px] font-medium transition-colors', on ? 'bg-accent text-white' : 'bg-white/[0.06] text-ink-300 hover:bg-white/10')}
    >
      {children}
    </button>
  )
}

/** Weight dropdown limited to what the family ships (0 = default). */
export function WeightSelect({ family, value, onChange, defaultLabel = 'Varsayılan', w = 130 }: { family?: string; value?: number; onChange: (v: number | undefined) => void; defaultLabel?: string; w?: number }) {
  const list = weightsOf(family)
  const all = value && !list.includes(value) ? [...list, value].sort((a, b) => a - b) : list
  return (
    <Select
      value={value ?? 0}
      w={w}
      onChange={(v) => onChange(v || undefined)}
      options={[{ value: 0, label: defaultLabel }, ...all.map((v) => ({ value: v, label: `${v} · ${WEIGHT_NAMES[v] ?? ''}${list.includes(v) ? '' : ' (yok)'}` }))]}
    />
  )
}
