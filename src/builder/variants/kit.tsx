import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Globe, Menu, X } from 'lucide-react'
import { CARD_NOUN, FONT_PAIRS, SHADOWS, cardCss, fieldLabel, getGrid, palette, repeatCols } from '../data'
import { E } from '../sections'
import { siteFonts } from '../fonts'
import { useB } from '../store'
import type { GridSettings, Section } from '../types'
import { cn, ease } from '../ui'

/*
 * Shared building blocks of the section designs (variants/*). Every visible text / image / icon is an
 * editable element (E, EImage, EIcon, ECard, Slot) so the selection, inspector and undo work as in the
 * built-in sections. Colors come from the palette variables (--bg, --fg, --muted, --accent, --btn-bg…),
 * fonts from --f-head / --f-body and radii from --r-card / --r-btn, so designs follow the site theme.
 */

export { E, EImage, HtmlEmbed, secPad, padY } from '../sections'
export { EIcon } from '../EIcon'
export { cn } from '../ui'

/* ---------- Layout ---------- */
export const W = ({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) => (
  <div className={cn('mx-auto w-full max-w-[1160px] px-6 @3xl:px-10', className)} style={style}>
    {children}
  </div>
)

/** Heading / body type of the site (font pair, weight, tracking) with the section's size overrides. */
export function useType(s: Section) {
  const { doc } = useB()
  const sf = siteFonts(doc.site)
  const fp = { ...FONT_PAIRS[doc.site.fontPair], display: 'var(--f-head)', weight: sf.headingWeight, italicAccent: sf.italicAccent }
  /** Fluid heading style: `max` px on wide pages, never below `min`. */
  const title = (max = s.style.titleSize, min = 30): CSSProperties => ({
    fontFamily: fp.display,
    fontWeight: s.style.titleWeight ?? fp.weight,
    letterSpacing: `${s.style.letterSpacing ?? fp.tracking}em`,
    lineHeight: fp.lh,
    fontSize: `clamp(${Math.min(min, max)}px, ${(max / 12).toFixed(2)}cqi, ${max}px)`,
    color: s.style.titleColor || undefined,
  })
  /** Small heading (cards, columns) in the display font. */
  const head = (size: number): CSSProperties => ({ fontFamily: fp.display, fontWeight: s.style.titleWeight ?? fp.weight, letterSpacing: `${Math.min(0, s.style.letterSpacing ?? fp.tracking) / 2}em`, fontSize: size, lineHeight: 1.15 })
  const body: CSSProperties = { color: 'var(--muted)', fontSize: s.style.bodySize ? `${s.style.bodySize}px` : undefined }
  return { fp, title, head, body }
}

/** Solid background of the section (for drawers / dropdowns over transparent headers). */
export function useSolidBg(s: Section) {
  const { doc } = useB()
  return s.style.bg && s.style.bg !== 'transparent' ? s.style.bg : palette(s.style.palette, doc.site.brand).bg
}

/* ---------- Buttons ---------- */
export const BTN = {
  sm: 'inline-flex h-9 items-center justify-center gap-2 px-4 text-[13.5px] font-semibold',
  md: 'inline-flex h-11 items-center justify-center gap-2 px-5 text-[14.5px] font-semibold',
  lg: 'inline-flex h-12 items-center justify-center gap-2 px-6 text-[15px] font-semibold',
  xl: 'inline-flex h-14 items-center justify-center gap-2 px-8 text-[16px] font-semibold',
} as const
const BTN_FX = 'transition-[background-color,color,border-color,border-radius,opacity,box-shadow] duration-300'

export const LOOK: Record<'primary' | 'secondary' | 'soft' | 'fg' | 'ghost', CSSProperties> = {
  primary: { background: 'var(--btn-bg)', color: 'var(--btn-fg)', borderRadius: 'var(--r-btn)' },
  secondary: { boxShadow: 'inset 0 0 0 1.5px var(--btn2)', color: 'var(--fg)', borderRadius: 'var(--r-btn)' },
  soft: { background: 'color-mix(in srgb, var(--fg) 8%, transparent)', color: 'var(--fg)', borderRadius: 'var(--r-btn)' },
  fg: { background: 'var(--fg)', color: 'var(--bg)', borderRadius: 'var(--r-btn)' },
  ghost: { color: 'var(--fg)', borderRadius: 'var(--r-btn)' },
}

/** A button / link field rendered as a button. Renders nothing when the section has no such field. */
export function Btn({ s, el = 'primary', look = 'primary', size = 'lg', className, style }: { s: Section; el?: string; look?: keyof typeof LOOK; size?: keyof typeof BTN; className?: string; style?: CSSProperties }) {
  if (s.content[el] === undefined) return null
  return <E s={s} el={el} kind="button" as="a" hint="a" className={cn(BTN[size], BTN_FX, className)} style={{ ...LOOK[look], ...style }} />
}

/* ---------- Brand ---------- */
export type MarkStyle = 'ring' | 'solid' | 'square' | 'soft' | 'none'

/** Logo letter in a mark + site name (nav / footer "logo" and "brand" fields). */
export function Brand({ s, mark = 'ring', size = 19, className, nameClass }: { s: Section; mark?: MarkStyle; size?: number; className?: string; nameClass?: string }) {
  const box = Math.round(size * 1.6)
  const markStyle: CSSProperties =
    mark === 'solid'
      ? { background: 'var(--btn-bg)', color: 'var(--btn-fg)', borderRadius: 999 }
      : mark === 'square'
        ? { background: 'var(--btn-bg)', color: 'var(--btn-fg)', borderRadius: 'min(var(--r-btn), 9px)' }
        : mark === 'soft'
          ? { background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)', borderRadius: 'min(var(--r-card), 10px)' }
          : { boxShadow: 'inset 0 0 0 2px currentColor', borderRadius: 999 }
  return (
    <div className={cn('flex shrink-0 items-center gap-2.5', className)}>
      {mark !== 'none' && s.content.logo !== undefined && (
        <span className="grid shrink-0 place-items-center" style={{ width: box, height: box, ...markStyle }}>
          <E s={s} el="logo" kind="text" className="font-[Space_Grotesk] font-bold leading-none" style={{ fontSize: Math.round(size * 0.74) }} />
        </span>
      )}
      <E s={s} el="brand" kind="heading" className={cn('font-semibold tracking-[-0.01em]', nameClass)} style={{ fontSize: size }} />
    </div>
  )
}

/* ---------- Navigation links (items) ---------- */
export function NavLinks({ s, className, style, linkClass, linkStyle, label = 'Ana menü' }: { s: Section; className?: string; style?: CSSProperties; linkClass?: string; linkStyle?: CSSProperties; label?: string }) {
  return (
    <nav aria-label={label} data-grid={s.id} className={cn('flex items-center', className)} style={{ columnGap: getGrid(s).gapX, ...style }}>
      {s.items.map((i) => (
        <E key={i.id} s={s} el={`items.${i.id}.title`} kind="link" as="a" hint="a" className={cn('transition-opacity hover:opacity-70', linkClass)} style={linkStyle} />
      ))}
    </nav>
  )
}

/** True while the element is narrower than `px` (container width, so device previews and thumbnails work). */
export function useNarrow(ref: RefObject<HTMLElement | null>, px = 896) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < px))
    ro.observe(node)
    return () => ro.disconnect()
  }, [ref, px])
  return narrow
}

/**
 * Responsive menu: on narrow pages the links move into a hamburger panel (rendered only there, so every
 * link exists once in the DOM and stays selectable). Put `ref` on the header root (it must be `relative`).
 *   const m = useMobileMenu(s)
 *   <header ref={m.ref} className="relative">… {!m.narrow && <NavLinks s={s} />} {m.toggle} …{m.panel(<Btn s={s} />)}</header>
 * `sheet` = an overlay card at the right edge instead of an in-flow dropdown.
 */
export function useMobileMenu(s: Section, opts: { breakpoint?: number; sheet?: boolean } = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const narrow = useNarrow(ref, opts.breakpoint)
  const [open, setOpen] = useState(false)
  const id = useId()
  const solid = useSolidBg(s)
  useEffect(() => {
    if (!narrow) setOpen(false)
  }, [narrow])
  const toggle = narrow ? (
    <button
      type="button"
      aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
      aria-expanded={open}
      aria-controls={id}
      onClick={(e) => {
        e.stopPropagation()
        setOpen((o) => !o)
      }}
      className="grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]"
    >
      {open ? <X size={21} /> : <Menu size={21} />}
    </button>
  ) : null
  const panel = (extra?: ReactNode) => (
    <AnimatePresence initial={false}>
      {narrow && open && (
        <motion.div
          id={id}
          key="m"
          initial={opts.sheet ? { opacity: 0, x: 24 } : { height: 0, opacity: 0 }}
          animate={opts.sheet ? { opacity: 1, x: 0 } : { height: 'auto', opacity: 1 }}
          exit={opts.sheet ? { opacity: 0, x: 24 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease }}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className={cn(opts.sheet ? 'absolute right-3 top-full z-50 mt-2 w-[min(320px,calc(100%-24px))] rounded-[min(var(--r-card),18px)] shadow-[0_30px_60px_-20px_rgba(0,0,0,.45)] ring-1 ring-[var(--line)]' : 'relative overflow-hidden')}
          style={{ background: solid, color: 'var(--fg)' }}
        >
          <div className={cn('px-6 pb-6 pt-2', opts.sheet && 'px-5 pt-3')}>
            <nav aria-label="Mobil menü" className="flex flex-col text-[16px] font-medium">
              {s.items.map((i) => (
                <E key={i.id} s={s} el={`items.${i.id}.title`} kind="link" as="a" hint="a" className="block border-b py-3" style={{ borderColor: 'var(--line)' }} />
              ))}
            </nav>
            {extra && <div className="mt-5 flex flex-wrap gap-3">{extra}</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
  return { ref, narrow, open, setOpen, toggle, panel }
}

/* ---------- Generic selectable slot ---------- */
/**
 * Selectable wrapper for composite content stored in one field (logo list, social list, stats line…):
 * clicking selects `el`, which the panels edit as a text field. Must not contain other editable elements.
 */
export function Slot({ s, el, as = 'div', className, style, children, label }: { s: Section; el: string; as?: 'div' | 'span' | 'ul'; className?: string; style?: CSSProperties; children: ReactNode; label?: string }) {
  const b = useB()
  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  const linked = b.activeField?.sectionId === s.id && b.activeField.el === el
  const Tag = as
  if (b.preview && !s.content[el]) return null
  return (
    <Tag
      className={cn('ed', className)}
      style={style}
      data-el={`${s.id}:${el}`}
      data-label={b.mode === 'studio' ? `${label ?? fieldLabel(s, el)} · liste` : `${label ?? fieldLabel(s, el)} · tıkla, düzenle`}
      data-selected={selected || undefined}
      data-linked={linked || undefined}
      onClick={(e: React.MouseEvent) => {
        if (b.preview) return
        e.preventDefault()
        e.stopPropagation()
        b.select({ sectionId: s.id, el }, { focus: true })
      }}
    >
      {children}
    </Tag>
  )
}

/** Comma / newline separated list of a field ("Acme, Globex, Umbrella"). */
export const list = (v?: string) =>
  (v ?? '')
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)

/* ---------- Cards (features / steps / faq items) ---------- */
/** Selectable card box of an item ("items.<id>.card"), styled per card by the Kartlar inspector. */
export function ECard({ s, id, className, style, children, as = 'div' }: { s: Section; id: string; className?: string; style?: CSSProperties; children: ReactNode; as?: 'div' | 'li' | 'article' }) {
  const b = useB()
  const el = `items.${id}.card`
  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  const Tag = as
  if (!CARD_NOUN[s.kind]) return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  )
  return (
    <Tag
      className={cn('ed edb', className)}
      style={{ ...style, ...cardCss(s.els?.[el]) }}
      data-el={`${s.id}:${el}`}
      data-label={b.mode === 'studio' ? `${CARD_NOUN[s.kind] ?? 'Kart'} · div` : `${fieldLabel(s, el)} · tıkla`}
      data-selected={selected || undefined}
      onClick={(e: React.MouseEvent) => {
        if (b.preview) return
        e.stopPropagation()
        b.select({ sectionId: s.id, el })
      }}
    >
      {children}
    </Tag>
  )
}

/** Responsive item grid driven by the section's grid settings (columns per device, gaps). */
export function gridStyle(g: GridSettings): CSSProperties {
  return { '--gm': repeatCols(g.colsM), '--gt': repeatCols(g.colsT), '--gd': repeatCols(g.cols), columnGap: g.gapX, rowGap: g.gapY } as CSSProperties
}
export const GRID_CLS = 'grid grid-cols-(--gm) @3xl:grid-cols-(--gt) @5xl:grid-cols-(--gd)'

export function cardStyle(g: GridSettings): CSSProperties {
  return {
    padding: g.pad,
    background: g.bg ?? 'var(--card)',
    border: g.border ? `${g.borderW}px solid ${g.borderColor ?? 'var(--line)'}` : 'none',
    borderRadius: g.radius ?? 'var(--r-card)',
    boxShadow: SHADOWS[g.shadow],
  }
}

/** Splits a list into `n` columns of near-equal length (footer link columns). */
export function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = Array.from({ length: n }, () => [])
  const per = Math.ceil(arr.length / n) || 1
  arr.forEach((x, i) => out[Math.min(n - 1, Math.floor(i / per))].push(x))
  return out
}

/* ---------- Social icons ---------- */
const SOCIAL: Record<string, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".6" fill="currentColor" />
    </>
  ),
  x: <path d="M4 4l6.6 8.8L4.3 20H6l5.4-6.1L16 20h4l-6.9-9.2L19 4h-1.7l-4.9 5.6L8 4H4z" fill="currentColor" stroke="none" />,
  twitter: <path d="M4 4l6.6 8.8L4.3 20H6l5.4-6.1L16 20h4l-6.9-9.2L19 4h-1.7l-4.9 5.6L8 4H4z" fill="currentColor" stroke="none" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10.5V17M8 7.2v.1M12 17v-6.5M12 13.5c0-1.7 1-3 2.5-3s2.5 1 2.5 3V17" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.2 9.4v5.2l4.4-2.6z" fill="currentColor" />
    </>
  ),
  facebook: <path d="M14.5 8.2H17V4.6h-2.7c-2.6 0-4 1.6-4 4.1v2.1H8v3.5h2.3V21h3.6v-6.7h2.6l.5-3.5h-3.1V9.2c0-.6.3-1 1-1z" />,
  github: <path d="M9 19c-4 1.3-4-2-6-2.5m12 5v-3.4c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.8 2.4 5.8 2.7 5.8 2.7a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.4 9.1c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />,
  tiktok: <path d="M14 3.5v11.2a3.7 3.7 0 1 1-3.7-3.7M14 3.5c.4 2.6 2.4 4.4 5 4.6" />,
  dribbble: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 3.7c3.6 4.6 5.7 10 6.6 16.5M3.1 10.6c5.3.3 10.1-.9 14.4-4.4M5.6 18.4c3-4.2 7.7-5.8 15.2-4.7" />
    </>
  ),
  behance: <path d="M3 7h5a2.5 2.5 0 0 1 0 5H3zm0 5h5.5a2.75 2.75 0 0 1 0 5.5H3zM14.5 8h5m-6 6.2h7.3a3.7 3.7 0 1 0-1 2.6" />,
  pinterest: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M11 9.5 8.5 21M10 15c4 1.5 7-1 7-4.5A5 5 0 0 0 7.5 9c0 1 .3 1.8.9 2.3" />
    </>
  ),
}
const SOCIAL_NAMES: Record<string, string> = { x: 'X', twitter: 'X', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', facebook: 'Facebook', github: 'GitHub', tiktok: 'TikTok', dribbble: 'Dribbble', behance: 'Behance', pinterest: 'Pinterest' }

export function SocialIcon({ name, size = 18 }: { name: string; size?: number }) {
  const g = SOCIAL[name.toLowerCase()]
  if (!g) return <Globe size={size} strokeWidth={1.7} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {g}
    </svg>
  )
}

/**
 * Social links from a field ("instagram, x, linkedin" or "instagram|https://…"), one selectable slot.
 * `tile`: round / square tiles; otherwise bare icons.
 */
export function Social({ s, el = 'social', tile, size = 18, className, style }: { s: Section; el?: string; tile?: 'round' | 'square' | 'outline'; size?: number; className?: string; style?: CSSProperties }) {
  const b = useB()
  const nets = list(s.content[el])
  return (
    <Slot s={s} el={el} className={cn('flex flex-wrap items-center gap-2', className)} style={style}>
      {nets.map((n, i) => {
        const [name, url] = n.split('|').map((x) => x.trim())
        const key = name.toLowerCase()
        return (
          <a
            key={`${n}-${i}`}
            href={url || '#'}
            aria-label={SOCIAL_NAMES[key] ?? name}
            onClick={(e) => {
              e.preventDefault()
              if (b.preview && url && /^https?:/.test(url)) window.open(url, '_blank', 'noopener')
            }}
            className={cn('grid place-items-center transition-opacity hover:opacity-70', tile && 'size-9')}
            style={
              tile === 'round'
                ? { borderRadius: 999, background: 'color-mix(in srgb, var(--fg) 8%, transparent)' }
                : tile === 'square'
                  ? { borderRadius: 'min(var(--r-btn), 10px)', background: 'color-mix(in srgb, var(--fg) 8%, transparent)' }
                  : tile === 'outline'
                    ? { borderRadius: 999, boxShadow: 'inset 0 0 0 1px var(--line)' }
                    : undefined
            }
          >
            <SocialIcon name={key} size={size} />
          </a>
        )
      })}
    </Slot>
  )
}

/* ---------- Logo strip (trust row) ---------- */
const WORDMARK: CSSProperties[] = [
  { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.04em' },
  { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, fontSize: '1.2em' },
  { fontFamily: 'Inter, sans-serif', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '.78em' },
  { fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, letterSpacing: '-0.02em' },
  { fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em' },
  { fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: '1.2em', letterSpacing: '0.02em' },
]

/** Brand names drawn as varied wordmarks (field "logos"); selectable as one slot. */
export function Logos({ s, el = 'logos', className, style, size = 20 }: { s: Section; el?: string; className?: string; style?: CSSProperties; size?: number }) {
  return (
    <Slot s={s} el={el} className={cn('flex flex-wrap items-center gap-x-10 gap-y-4', className)} style={{ color: 'var(--muted)', fontSize: size, ...style }}>
      {list(s.content[el]).map((n, i) => (
        <span key={`${n}-${i}`} className="whitespace-nowrap leading-none opacity-80" style={WORDMARK[i % WORDMARK.length]}>
          {n}
        </span>
      ))}
    </Slot>
  )
}

/** Avatar initials from a name. */
export const initials = (name?: string) =>
  (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase('tr')
