import type { CSSProperties, ReactNode } from 'react'
import { ArrowUpRight, ChevronDown, Clock, Globe, Mail, MapPin, Minus, Phone, Plus } from 'lucide-react'
import { getGrid } from '../data'
import { useB } from '../store'
import type { Item, Section } from '../types'
import { Brand, Btn, E, Slot, Social, SocialIcon, W, cn, list, useType } from './kit'

type P = { s: Section }

const NAV_LABEL = 'Alt bilgi bağlantıları'
const SERIF = "'Instrument Serif', var(--f-head), serif"
const LINE: CSSProperties = { borderColor: 'var(--line)' }
const tint = (pct: number, c = 'var(--accent)') => `color-mix(in srgb, ${c} ${pct}%, transparent)`

/** Splits links into `n` columns whose lengths differ by at most one. */
function balance<T>(arr: T[], n: number): T[][] {
  const base = Math.floor(arr.length / n)
  const extra = arr.length % n
  let at = 0
  return Array.from({ length: n }, (_, k) => {
    const len = base + (k < extra ? 1 : 0)
    const out = arr.slice(at, at + len)
    at += len
    return out
  })
}

/* ---------- Shared pieces ---------- */
function FLink({ s, i, className, style }: P & { i: Item; className?: string; style?: CSSProperties }) {
  return <E s={s} el={`items.${i.id}.title`} kind="link" as="a" hint="a" className={cn('transition-colors hover:text-(--fg)', className)} style={style} />
}

function Note({ s, className }: P & { className?: string }) {
  return <E s={s} el="note" kind="text" as="p" hint="p" className={cn('block text-[13.5px]', className)} style={{ color: 'var(--muted)' }} />
}

function Tagline({ s, className, style }: P & { className?: string; style?: CSSProperties }) {
  const { body } = useType(s)
  return <E s={s} el="tagline" kind="text" as="p" hint="p" multiline className={cn('block text-[14.5px] leading-[1.65]', className)} style={{ ...body, ...style }} />
}

/** Links in one wrapping row (gap handles = link gaps). */
function LinkRow({ s, items = s.items, className, ulClass, linkClass, label = NAV_LABEL }: P & { items?: Item[]; className?: string; ulClass?: string; linkClass?: string; label?: string }) {
  const g = getGrid(s)
  return (
    <nav aria-label={label} className={cn('text-[14px]', className)} style={{ color: 'var(--muted)' }}>
      <ul data-grid={s.id} className={cn('flex flex-wrap', ulClass)} style={{ columnGap: g.gapX, rowGap: g.gapY }}>
        {items.map((i) => (
          <li key={i.id}>
            <FLink s={s} i={i} className={linkClass} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Link columns with headings col1…colN (column gap = gapX, link gap = gapY). */
function LinkCols({
  s,
  items = s.items,
  n,
  className,
  style,
  head,
  headClass,
  headStyle,
  colClass,
  colStyle,
  linkClass,
  ulClass,
}: P & {
  items?: Item[]
  n: number
  className?: string
  style?: CSSProperties
  head?: (k: number, c: Item[]) => ReactNode
  headClass?: string
  headStyle?: CSSProperties
  colClass?: string
  colStyle?: CSSProperties
  linkClass?: string
  ulClass?: string
}) {
  const g = getGrid(s)
  return (
    <nav aria-label={NAV_LABEL} data-grid={s.id} className={cn('grid', className)} style={{ columnGap: Math.max(g.gapX, 20), rowGap: 40, ...style }}>
      {balance(items, n).map((c, k) =>
        c.length ? (
          <div key={k} className={cn('min-w-0', colClass)} style={colStyle}>
            <div className="flex items-baseline gap-2">
              {head?.(k, c)}
              <E s={s} el={`col${k + 1}`} kind="heading" as="h3" hint="h3" className={cn('block text-[13.5px] font-semibold', headClass)} style={headStyle} />
            </div>
            <ul className={cn('mt-4 flex flex-col text-[14.5px] leading-6', ulClass)} style={{ rowGap: g.gapY, color: 'var(--muted)' }}>
              {c.map((i) => (
                <li key={i.id}>
                  <FLink s={s} i={i} className={linkClass} />
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </nav>
  )
}

/** Fake e-mail field (placeholder slot) + subscribe button. */
function NewsForm({ s, className, field }: P & { className?: string; field?: CSSProperties }) {
  return (
    <div role="group" aria-label="Bülten aboneliği" className={cn('flex w-full flex-col gap-2.5 @md:flex-row', className)}>
      <Slot
        s={s}
        el="placeholder"
        className="flex h-12 min-w-0 flex-1 items-center gap-2.5 px-4 text-[14.5px]"
        style={{ background: tint(5, 'var(--fg)'), boxShadow: 'inset 0 0 0 1px var(--line)', borderRadius: 'var(--r-btn)', color: 'var(--muted)', ...field }}
      >
        <Mail size={16} aria-hidden className="shrink-0 opacity-70" />
        <span className="truncate">{s.content.placeholder}</span>
      </Slot>
      <Btn s={s} el="newsButton" size="lg" className="shrink-0" />
    </div>
  )
}

function StatusPill({ s }: P) {
  return (
    <span className="inline-flex h-9 items-center gap-2.5 px-3.5 text-[13px] font-medium" style={{ borderRadius: 999, boxShadow: 'inset 0 0 0 1px var(--line)', background: 'var(--bg)' }}>
      <span aria-hidden className="relative grid size-2.5 place-items-center">
        <span className="absolute inset-[-3px] rounded-full bg-[#22c55e]/25" />
        <span className="size-2 rounded-full bg-[#22c55e]" />
      </span>
      <E s={s} el="status" kind="text" />
    </span>
  )
}

function LocalePill({ s }: P) {
  return (
    <span className="inline-flex h-9 items-center gap-2 px-3.5 text-[13px] font-medium" style={{ borderRadius: 999, boxShadow: 'inset 0 0 0 1px var(--line)', background: 'var(--bg)' }}>
      <Globe size={14} aria-hidden className="opacity-70" />
      <E s={s} el="locale" kind="text" />
      <ChevronDown size={14} aria-hidden className="opacity-55" />
    </span>
  )
}

/* ---------- Çok sütunlu ---------- */
export function FooterColumns({ s }: P) {
  return (
    <footer className="pb-10 pt-16 @3xl:pt-20">
      <W>
        <div className="grid gap-12 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] @4xl:gap-16">
          <div className="max-w-sm">
            <Brand s={s} mark="square" size={18} />
            <Tagline s={s} className="mt-5" />
            <Social s={s} tile="outline" size={16} className="mt-7" />
          </div>
          <LinkCols s={s} n={3} className="grid-cols-2 @2xl:grid-cols-3" />
        </div>
        <div className="mt-16 border-t pt-7" style={LINE}>
          <Note s={s} />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Büyük çağrılı ---------- */
export function FooterBigCta({ s }: P) {
  const { title, body } = useType(s)
  return (
    <footer className="relative overflow-hidden pb-10 pt-20 @3xl:pt-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[460px]" style={{ background: `radial-gradient(55% 70% at 50% 0%, ${tint(24)}, transparent 72%)` }} />
      <W className="relative">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <E s={s} el="ctaTitle" kind="heading" as="h2" hint="h2" className="block text-balance" style={title(undefined, 34)} />
          <E s={s} el="ctaBody" kind="text" as="p" hint="p" multiline className="mt-5 block max-w-xl text-[17px] leading-[1.6]" style={body} />
          <Btn s={s} el="primary" size="xl" className="mt-9" />
        </div>
        <div className="mt-20 flex flex-col gap-7 border-t pt-8 @3xl:mt-24 @3xl:flex-row @3xl:items-center @3xl:justify-between" style={LINE}>
          <Brand s={s} mark="solid" size={17} />
          <LinkRow s={s} />
        </div>
        <Note s={s} className="mt-6 @3xl:mt-4" />
      </W>
    </footer>
  )
}

/* ---------- Bülten ---------- */
export function FooterNewsletter({ s }: P) {
  const { title, body } = useType(s)
  return (
    <footer className="pb-10 pt-14 @3xl:pt-16">
      <W>
        <div className="grid gap-8 p-7 @3xl:p-10 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)] @4xl:items-center @4xl:gap-14" style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
          <div>
            <span aria-hidden className="grid size-11 place-items-center rounded-full" style={{ background: tint(14), color: 'var(--accent)' }}>
              <Mail size={19} />
            </span>
            <E s={s} el="newsTitle" kind="heading" as="h2" hint="h2" className="mt-5 block text-balance" style={title(undefined, 24)} />
            <E s={s} el="newsText" kind="text" as="p" hint="p" multiline className="mt-2.5 block max-w-md text-[15px] leading-[1.6]" style={body} />
          </div>
          <NewsForm s={s} />
        </div>
        <div className="mt-12 flex flex-col gap-6 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <Brand s={s} size={17} />
          <LinkRow s={s} />
        </div>
        <div className="mt-8 border-t pt-6" style={LINE}>
          <Note s={s} />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Tek satır ---------- */
export function FooterOneLine({ s }: P) {
  return (
    <footer className="border-t py-6" style={LINE}>
      <W className="flex flex-col items-center gap-4 text-center @4xl:flex-row @4xl:gap-8 @4xl:text-left">
        <Brand s={s} mark="solid" size={15} />
        <span aria-hidden className="hidden h-5 w-px @4xl:block" style={{ background: 'var(--line)' }} />
        <LinkRow s={s} className="text-[13.5px] @4xl:flex-1" ulClass="justify-center @4xl:justify-start" />
        <Note s={s} className="text-[13px]" />
      </W>
    </footer>
  )
}

/* ---------- Ortalı sosyal ---------- */
export function FooterCenteredSocial({ s }: P) {
  return (
    <footer className="pb-10 pt-16 text-center @3xl:pt-20">
      <W className="flex flex-col items-center">
        <span className="grid size-14 place-items-center rounded-full" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)', boxShadow: `0 0 0 8px ${tint(10, 'var(--btn-bg)')}` }}>
          <E s={s} el="logo" kind="text" className="font-[Space_Grotesk] text-[24px] font-bold leading-none" />
        </span>
        <E s={s} el="brand" kind="heading" className="mt-6 block text-[22px] font-semibold tracking-[-0.01em]" />
        <Tagline s={s} className="mt-3 max-w-md" />
        <LinkRow s={s} className="mt-9 text-[14.5px] font-medium" ulClass="justify-center" />
        <Social s={s} tile="round" size={17} className="mt-9 justify-center" />
        <div className="mt-12 w-full border-t pt-6" style={LINE}>
          <Note s={s} />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Mega koyu ---------- */
export function FooterMega({ s }: P) {
  const { title, body } = useType(s)
  const legal = s.items.length > 6 ? s.items.slice(-2) : []
  const main = s.items.slice(0, s.items.length - legal.length)
  return (
    <footer className="relative overflow-hidden pb-8 pt-14 @3xl:pt-16">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-56 size-[620px] rounded-full blur-3xl" style={{ background: tint(16) }} />
      <W className="relative">
        <div className="grid gap-6 border-b pb-12 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] @4xl:items-center @4xl:gap-16" style={LINE}>
          <div>
            <E s={s} el="newsTitle" kind="heading" as="h2" hint="h2" className="block text-balance" style={title(30, 22)} />
            <E s={s} el="newsText" kind="text" as="p" hint="p" multiline className="mt-2 block max-w-lg text-[15px] leading-[1.6]" style={body} />
          </div>
          <NewsForm s={s} />
        </div>
        <div className="grid gap-12 py-14 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,2.8fr)] @5xl:gap-16">
          <div className="max-w-xs">
            <Brand s={s} mark="soft" size={19} />
            <Tagline s={s} className="mt-5" />
            <Social s={s} tile="square" size={16} className="mt-7" />
          </div>
          <LinkCols s={s} items={main} n={4} className="grid-cols-2 @3xl:grid-cols-4" headClass="uppercase tracking-[0.08em] text-[12px]!" headStyle={{ color: 'var(--fg)' }} />
        </div>
        <div className="flex flex-col gap-4 border-t pt-7 @3xl:flex-row @3xl:items-center @3xl:justify-between" style={LINE}>
          <Note s={s} />
          {legal.length > 0 && (
            <nav aria-label="Yasal bağlantılar">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]" style={{ color: 'var(--muted)' }}>
                {legal.map((i) => (
                  <li key={i.id}>
                    <FLink s={s} i={i} />
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </W>
    </footer>
  )
}

/* ---------- Uygulama rozetli ---------- */
const AppleGlyph = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8C7 7.5 5.6 8.4 4.8 9.8c-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.6-3.8zM14.1 6c.6-.8 1.1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1.1.1 2.1-.5 2.8-1.3z" />
  </svg>
)
const PlayGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
    <path d="M3.6 2.4 13.4 12l-9.8 9.6c-.4-.2-.6-.6-.6-1.1V3.5c0-.5.2-.9.6-1.1z" fill="#2fb7f5" />
    <path d="M16.9 8.6 13.4 12 3.6 2.4c.3-.2.8-.2 1.2 0z" fill="#35d07f" />
    <path d="M16.9 15.4 4.8 21.6c-.4.2-.9.2-1.2 0l9.8-9.6z" fill="#f2464b" />
    <path d="M20.5 10.6c1 .6 1 2.2 0 2.8l-3.6 2-3.5-3.4 3.5-3.4z" fill="#fcc419" />
  </svg>
)

function StoreBadge({ s, el, icon }: P & { el: string; icon: ReactNode }) {
  if (s.content[el] === undefined) return null
  return (
    <span className="inline-flex h-[54px] items-center gap-3 bg-[#0b0b0c] pl-4 pr-5 text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,.6)] ring-1 ring-white/15 transition-transform hover:-translate-y-0.5" style={{ borderRadius: 'min(var(--r-btn), 12px)' }}>
      {icon}
      <E s={s} el={el} kind="button" as="a" hint="a" multiline className="block whitespace-pre-line text-left text-[17px] font-semibold leading-[1.1] tracking-[-0.01em] first-line:text-[10.5px] first-line:font-medium first-line:tracking-[0.02em]" />
    </span>
  )
}

function PhoneArt() {
  const frame = 'color-mix(in srgb, var(--fg) 88%, var(--bg))'
  const bar = tint(14, 'var(--fg)')
  return (
    <div aria-hidden className="relative mx-auto hidden h-[310px] w-[250px] @4xl:block">
      <div className="absolute inset-0 rounded-t-[42px] border-[7px] border-b-0 px-4 pt-10" style={{ borderColor: frame, background: 'var(--card)' }}>
        <span className="absolute left-1/2 top-2.5 h-[18px] w-[74px] -translate-x-1/2 rounded-full" style={{ background: frame }} />
        <div className="flex items-center justify-between">
          <span className="size-7 rounded-[9px]" style={{ background: 'var(--btn-bg)' }} />
          <span className="h-2 w-14 rounded-full" style={{ background: bar }} />
        </div>
        <div className="mt-4 h-[92px] rounded-[18px] p-3" style={{ background: `linear-gradient(135deg, ${tint(75)}, ${tint(22)})` }}>
          <span className="block h-2 w-16 rounded-full bg-white/70" />
          <span className="mt-2 block h-2 w-24 rounded-full bg-white/40" />
        </div>
        {[0, 1, 2].map((k) => (
          <div key={k} className="mt-3 flex items-center gap-3">
            <span className="size-9 shrink-0 rounded-xl" style={{ background: k === 1 ? tint(22) : bar }} />
            <span className="flex-1">
              <span className="block h-2 w-[80%] rounded-full" style={{ background: bar }} />
              <span className="mt-1.5 block h-2 w-[55%] rounded-full" style={{ background: tint(8, 'var(--fg)') }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FooterApps({ s }: P) {
  return (
    <footer className="overflow-hidden pt-16">
      <W>
        <div className="grid items-end gap-6 @4xl:grid-cols-[minmax(0,1fr)_auto] @4xl:gap-16">
          <div className="pb-14">
            <Brand s={s} mark="square" size={19} />
            <Tagline s={s} className="mt-5 max-w-md text-[16px]" />
            <div className="mt-8 flex flex-wrap gap-3">
              <StoreBadge s={s} el="appStore" icon={<AppleGlyph />} />
              <StoreBadge s={s} el="playStore" icon={<PlayGlyph />} />
            </div>
          </div>
          <PhoneArt />
        </div>
      </W>
      <div className="border-t" style={LINE}>
        <W className="flex flex-col gap-5 py-7 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <LinkRow s={s} />
          <Note s={s} />
        </W>
      </div>
    </footer>
  )
}

/* ---------- İletişim + harita ---------- */
function MapArt({ className }: { className?: string }) {
  const road = tint(12, 'var(--fg)')
  const dash = `repeating-linear-gradient(90deg, ${tint(30, 'var(--bg)')} 0 10px, transparent 10px 20px)`
  return (
    <div aria-hidden className={cn('relative overflow-hidden', className)} style={{ borderRadius: 'var(--r-card)', boxShadow: 'inset 0 0 0 1px var(--line)', background: 'color-mix(in srgb, var(--fg) 3%, var(--bg))' }}>
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute left-[7%] top-[10%] h-[34%] w-[24%] rounded-[42%_58%_52%_48%]" style={{ background: tint(13) }} />
      <div className="absolute -bottom-[30%] -right-[12%] h-[70%] w-[52%] rounded-full" style={{ background: tint(9) }} />
      <div className="absolute inset-x-0 top-[58%] h-3 -translate-y-1/2" style={{ background: road }}>
        <div className="absolute inset-x-0 top-1/2 h-px" style={{ backgroundImage: dash }} />
      </div>
      <div className="absolute inset-y-0 left-[62%] w-2.5 -translate-x-1/2" style={{ background: road }} />
      <div className="absolute -left-[10%] top-[30%] h-2 w-[130%] origin-left rotate-[18deg]" style={{ background: road }} />
      <div className="absolute inset-y-0 left-[24%] w-1.5" style={{ background: tint(8, 'var(--fg)') }} />
      <div className="absolute left-[62%] top-[58%]">
        <span className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: tint(14) }} />
        <span className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: tint(22) }} />
        <span className="absolute bottom-0 left-1/2 grid size-11 -translate-x-1/2 place-items-center rounded-full shadow-[0_10px_24px_-8px_rgba(0,0,0,.45)]" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
          <MapPin size={20} strokeWidth={2.2} />
        </span>
      </div>
      <div className="absolute right-3 top-3 flex flex-col overflow-hidden shadow-sm" style={{ background: 'var(--bg)', borderRadius: 'min(var(--r-btn), 10px)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
        <span className="grid size-8 place-items-center border-b" style={LINE}>
          <Plus size={14} />
        </span>
        <span className="grid size-8 place-items-center">
          <Minus size={14} />
        </span>
      </div>
      <div className="absolute bottom-3 left-3 flex items-end gap-1">
        <span className="h-1.5 w-14 border-x-2 border-b-2" style={{ borderColor: 'var(--muted)' }} />
      </div>
    </div>
  )
}

function ContactRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3.5">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center" style={{ borderRadius: 'min(var(--r-btn), 12px)', background: tint(12), color: 'var(--accent)' }}>
        {icon}
      </span>
      <div className="min-w-0 pt-2 text-[14.5px] leading-[1.55]">{children}</div>
    </li>
  )
}

export function FooterContact({ s }: P) {
  return (
    <footer className="pb-10 pt-16 @3xl:pt-20">
      <W>
        <div className="grid gap-10 @4xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @4xl:gap-14">
          <div>
            <Brand s={s} mark="soft" size={19} />
            <Tagline s={s} className="mt-4 max-w-sm" />
            <address className="mt-9 not-italic">
              <ul className="grid gap-5 @xl:grid-cols-2 @4xl:grid-cols-1">
                <ContactRow icon={<MapPin size={17} />}>
                  <E s={s} el="address" kind="text" as="span" hint="span" multiline className="block whitespace-pre-line" />
                </ContactRow>
                <ContactRow icon={<Phone size={17} />}>
                  <E s={s} el="phone" kind="link" as="a" hint="a" className="font-medium transition-opacity hover:opacity-70" />
                </ContactRow>
                <ContactRow icon={<Mail size={17} />}>
                  <E s={s} el="email" kind="link" as="a" hint="a" className="break-all font-medium transition-opacity hover:opacity-70" />
                </ContactRow>
                <ContactRow icon={<Clock size={17} />}>
                  <E s={s} el="hours" kind="text" as="span" hint="span" className="block" style={{ color: 'var(--muted)' }} />
                </ContactRow>
              </ul>
            </address>
          </div>
          <MapArt className="min-h-[300px]" />
        </div>
        <div className="mt-14 flex flex-col gap-5 border-t pt-7 @3xl:flex-row @3xl:items-center @3xl:justify-between" style={LINE}>
          <Note s={s} />
          <LinkRow s={s} />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Dev logo ---------- */
export function FooterWordmark({ s }: P) {
  const { fp } = useType(s)
  return (
    <footer className="overflow-hidden pt-14 @3xl:pt-20">
      <W>
        <div className="grid gap-10 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] @4xl:gap-16">
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ boxShadow: 'inset 0 0 0 2px currentColor' }}>
              <E s={s} el="logo" kind="text" className="font-[Space_Grotesk] text-[16px] font-bold leading-none" />
            </span>
            <Tagline s={s} className="max-w-sm pt-1 text-[15px]" />
          </div>
          <LinkRow s={s} className="text-[15px] font-medium @4xl:justify-self-end" ulClass="grid! grid-cols-2 @2xl:grid-cols-3" linkClass="inline-flex" />
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t pt-6 @2xl:flex-row @2xl:items-center @2xl:justify-between" style={LINE}>
          <Note s={s} />
          <Social s={s} size={16} className="gap-4" />
        </div>
      </W>
      <div className="mt-4 overflow-hidden">
        <E
          s={s}
          el="brand"
          kind="heading"
          as="div"
          hint="div"
          className="block select-none whitespace-nowrap text-center leading-[0.8]"
          style={{
            fontFamily: fp.display,
            fontWeight: s.style.titleWeight ?? 700,
            fontSize: 'clamp(64px, 22cqi, 320px)',
            letterSpacing: '-0.06em',
            marginBottom: '-0.08em',
            color: 'transparent',
            caretColor: 'var(--fg)',
            backgroundImage: 'linear-gradient(180deg, var(--fg) 25%, color-mix(in srgb, var(--fg) 12%, transparent) 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}
        />
      </div>
    </footer>
  )
}

/* ---------- Marka renginde ---------- */
export function FooterBrand({ s }: P) {
  const { title } = useType(s)
  const g = getGrid(s)
  return (
    <footer className="relative overflow-hidden pb-10 pt-16 @3xl:pt-24">
      <div aria-hidden className="pointer-events-none absolute -right-48 -top-48 size-[640px]">
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className="absolute rounded-full border" style={{ inset: k * 70, borderColor: tint(16 - k * 3, 'var(--fg)') }} />
        ))}
      </div>
      <W className="relative">
        <div className="grid gap-12 @4xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] @4xl:gap-20">
          <div>
            <E s={s} el="ctaTitle" kind="heading" as="h2" hint="h2" className="block max-w-xl text-balance" style={title(undefined, 32)} />
            <Btn s={s} el="primary" size="lg" className="mt-9" />
          </div>
          <nav aria-label={NAV_LABEL} className="@4xl:pt-3">
            <ul data-grid={s.id} className="grid grid-cols-2" style={{ columnGap: g.gapX, rowGap: g.gapY + 6 }}>
              {s.items.map((i) => (
                <li key={i.id} className="group flex items-center gap-1.5 border-b pb-3 text-[16.5px] font-medium" style={LINE}>
                  <FLink s={s} i={i} className="min-w-0 hover:opacity-80" />
                  <ArrowUpRight size={16} aria-hidden className="ml-auto shrink-0 opacity-50 transition-[opacity,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-6 border-t pt-7 @3xl:mt-20 @3xl:flex-row @3xl:items-center @3xl:justify-between" style={LINE}>
          <Brand s={s} mark="solid" size={17} />
          <Note s={s} />
          <Social s={s} tile="round" size={16} />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Editoryal ---------- */
const ROMAN = ['I', 'II', 'III', 'IV']

export function FooterEditorial({ s }: P) {
  return (
    <footer className="pb-10 pt-16 @3xl:pt-20">
      <W>
        <div className="border-t-2 pt-1.5" style={{ borderColor: 'var(--fg)' }}>
          <div className="border-t pt-10" style={{ borderColor: 'var(--fg)' }}>
            <div className="grid gap-12 @4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)] @4xl:gap-16">
              <div>
                <E s={s} el="brand" kind="heading" as="div" hint="div" className="block leading-[0.95]" style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(48px, 7cqi, 80px)', letterSpacing: '-0.02em' }} />
                <Tagline s={s} className="mt-5 max-w-sm text-[18px] italic leading-[1.5]" style={{ fontFamily: SERIF }} />
              </div>
              <LinkCols
                s={s}
                n={3}
                className="grid-cols-2 @2xl:grid-cols-3"
                colClass="@2xl:border-l @2xl:pl-6"
                colStyle={LINE}
                head={(k) => (
                  <span aria-hidden className="text-[13px] italic" style={{ fontFamily: SERIF, color: 'var(--muted)' }}>
                    {ROMAN[k]}.
                  </span>
                )}
                headClass="text-[21px]! font-normal! italic"
                headStyle={{ fontFamily: SERIF }}
                linkClass="underline-offset-4 hover:underline"
              />
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t pt-5 @3xl:flex-row @3xl:items-center @3xl:justify-between" style={LINE}>
          <Note s={s} className="text-[13px] uppercase tracking-[0.12em]" />
          <Social s={s} size={16} className="gap-4" />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Kart ---------- */
export function FooterCard({ s }: P) {
  return (
    <footer className="px-3 pb-3 pt-10 @3xl:px-5 @3xl:pb-5 @3xl:pt-14">
      <div
        className="mx-auto max-w-[1240px] px-6 py-10 @3xl:px-12 @3xl:py-14"
        style={{ background: 'var(--card)', borderRadius: 'calc(var(--r-card) * 1.6)', boxShadow: 'inset 0 0 0 1px var(--line), 0 30px 60px -45px rgba(0,0,0,.35)' }}
      >
        <div className="flex flex-col gap-6 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <Brand s={s} mark="square" size={19} />
          <Btn s={s} el="primary" size="md" />
        </div>
        <div className="mt-10 grid gap-12 border-t pt-10 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] @4xl:gap-16" style={LINE}>
          <div>
            <Tagline s={s} className="max-w-xs" />
            <Social s={s} tile="square" size={16} className="mt-6" />
          </div>
          <LinkCols s={s} n={3} className="grid-cols-2 @2xl:grid-cols-3" headStyle={{ color: 'var(--muted)' }} headClass="uppercase tracking-[0.1em] text-[11.5px]!" ulClass="text-(--fg)!" linkClass="hover:opacity-70" />
        </div>
        <div className="mt-12 rounded-[min(var(--r-card),14px)] px-5 py-4" style={{ background: 'var(--bg)' }}>
          <Note s={s} />
        </div>
      </div>
    </footer>
  )
}

/* ---------- İki tonlu ---------- */
const EDGE = 'max(var(--p), calc((100cqi - 1160px) / 2 + var(--p)))'
const INVERT = {
  background: 'var(--t-fg)',
  color: 'var(--t-bg)',
  '--bg': 'var(--t-fg)',
  '--fg': 'var(--t-bg)',
  '--muted': 'color-mix(in srgb, var(--t-bg) 68%, var(--t-fg))',
  '--line': 'color-mix(in srgb, var(--t-bg) 16%, transparent)',
  '--card': 'color-mix(in srgb, var(--t-bg) 8%, var(--t-fg))',
  '--accent': 'var(--t-bg)',
  '--btn-bg': 'var(--t-bg)',
  '--btn-fg': 'var(--t-fg)',
  '--btn2': 'color-mix(in srgb, var(--t-bg) 40%, transparent)',
} as CSSProperties

export function FooterTwoTone({ s }: P) {
  return (
    <footer className="grid [--p:24px] @3xl:[--p:40px] @4xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" style={{ '--t-fg': 'var(--fg)', '--t-bg': 'var(--bg)' } as CSSProperties}>
      <div className="relative flex flex-col overflow-hidden py-14 pr-(--p) @4xl:py-16 @4xl:pr-14" style={{ ...INVERT, paddingLeft: EDGE }}>
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full" style={{ background: tint(10, 'var(--fg)') }} />
        <Brand s={s} mark="solid" size={19} className="relative" />
        <Tagline s={s} className="relative mt-6 max-w-sm text-[17px] leading-[1.55]" style={{ color: 'var(--fg)' }} />
        <div className="relative mt-auto flex flex-wrap items-center gap-4 pt-10">
          <Btn s={s} el="primary" size="md" />
          <Social s={s} size={17} className="gap-3.5" />
        </div>
      </div>
      <div className="flex flex-col py-14 pl-(--p) @4xl:py-16 @4xl:pl-16" style={{ paddingRight: EDGE }}>
        <LinkCols s={s} n={3} className="grid-cols-2 @2xl:grid-cols-3" />
        <div className="mt-auto pt-14">
          <div className="border-t pt-6" style={LINE}>
            <Note s={s} />
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ---------- Site haritası ---------- */
export function FooterSitemap({ s }: P) {
  return (
    <footer className="pb-10 pt-14 @3xl:pt-16">
      <W>
        <div className="flex flex-wrap items-center justify-between gap-6 pb-12">
          <Brand s={s} mark="ring" size={21} />
          <E
            s={s}
            el="topLink"
            kind="link"
            as="a"
            hint="a"
            className="inline-flex h-11 items-center px-5 text-[14px] font-semibold transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]"
            style={{ borderRadius: 999, boxShadow: 'inset 0 0 0 1px var(--line)' }}
          />
        </div>
        <LinkCols
          s={s}
          n={4}
          className="grid-cols-2 @3xl:grid-cols-4"
          colClass="border-t pt-5"
          colStyle={{ borderColor: 'var(--fg)' }}
          head={(k) => (
            <span aria-hidden className="font-mono text-[11.5px] tabular-nums" style={{ color: 'var(--muted)' }}>
              {String(k + 1).padStart(2, '0')}
            </span>
          )}
          headClass="text-[15px]"
          ulClass="mt-5"
        />
        <div className="mt-16 flex flex-col gap-3 border-t pt-6 @3xl:flex-row @3xl:items-center @3xl:justify-between" style={LINE}>
          <Note s={s} />
          <Social s={s} size={16} className="gap-4" />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Durum çubuklu ---------- */
export function FooterStatus({ s }: P) {
  const g = getGrid(s)
  return (
    <footer className="pb-6 pt-14 @3xl:pt-16">
      <W>
        <div className="grid gap-10 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] @4xl:gap-16">
          <div>
            <Brand s={s} mark="square" size={18} />
            <Tagline s={s} className="mt-4 max-w-sm" />
          </div>
          <nav aria-label={NAV_LABEL}>
            <ul data-grid={s.id} className="flex flex-wrap @4xl:justify-end" style={{ columnGap: Math.min(g.gapX, 10), rowGap: Math.max(g.gapY, 8) }}>
              {s.items.map((i) => (
                <li key={i.id}>
                  <FLink
                    s={s}
                    i={i}
                    className="inline-flex h-9 items-center px-4 text-[13.5px] font-medium hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]"
                    style={{ borderRadius: 999, boxShadow: 'inset 0 0 0 1px var(--line)', color: 'var(--fg)' }}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-4 px-3 py-3 @4xl:flex-row @4xl:items-center" style={{ background: 'var(--card)', borderRadius: 'min(calc(var(--r-card) + 8px), 999px)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill s={s} />
            <LocalePill s={s} />
          </div>
          <Note s={s} className="px-2 text-[13px] @4xl:ml-auto" />
          <Social s={s} size={16} className="gap-1 px-1 [&>a]:size-8" />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Sosyal öncelikli ---------- */
const NET_NAMES: Record<string, string> = { x: 'X', twitter: 'X', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', facebook: 'Facebook', github: 'GitHub', tiktok: 'TikTok', dribbble: 'Dribbble', behance: 'Behance', pinterest: 'Pinterest' }

function SocialCards({ s }: P) {
  const b = useB()
  return (
    <Slot s={s} el="social" as="ul" className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-5">
      {list(s.content.social).map((n, k) => {
        const [name, url] = n.split('|').map((x) => x.trim())
        const key = name.toLowerCase()
        return (
          <li key={`${n}-${k}`}>
            <a
              href={url || '#'}
              onClick={(e) => {
                e.preventDefault()
                if (b.preview && url && /^https?:/.test(url)) window.open(url, '_blank', 'noopener')
              }}
              className="group flex h-full flex-col justify-between gap-9 p-5 transition-transform duration-300 hover:-translate-y-1"
              style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', boxShadow: 'inset 0 0 0 1px var(--line)' }}
            >
              <span className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-full" style={{ background: tint(14), color: 'var(--accent)' }}>
                  <SocialIcon name={key} size={20} />
                </span>
                <ArrowUpRight size={18} aria-hidden className="opacity-40 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="text-[15px] font-semibold">{NET_NAMES[key] ?? name}</span>
            </a>
          </li>
        )
      })}
    </Slot>
  )
}

export function FooterCreator({ s }: P) {
  return (
    <footer className="pb-10 pt-16 @3xl:pt-20">
      <W>
        <div className="flex flex-col gap-6 @3xl:flex-row @3xl:items-center">
          <span className="grid size-[76px] shrink-0 place-items-center rounded-full p-[3px]" style={{ background: `conic-gradient(from 210deg, var(--accent), ${tint(25)}, var(--accent))` }}>
            <span className="grid size-full place-items-center rounded-full" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)', boxShadow: '0 0 0 3px var(--bg)' }}>
              <E s={s} el="logo" kind="text" className="font-[Space_Grotesk] text-[28px] font-bold leading-none" />
            </span>
          </span>
          <div className="min-w-0">
            <E s={s} el="brand" kind="heading" as="h2" hint="h2" className="block text-[28px] font-semibold tracking-[-0.02em]" />
            <Tagline s={s} className="mt-1.5 max-w-xl" />
          </div>
        </div>
        <div className="mt-10">
          <SocialCards s={s} />
        </div>
        <div className="mt-12 flex flex-col gap-5 border-t pt-7 @3xl:flex-row @3xl:items-center @3xl:justify-between" style={LINE}>
          <LinkRow s={s} />
          <Note s={s} />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Cam ---------- */
export function FooterGlass({ s }: P) {
  const { title, body } = useType(s)
  return (
    <footer className="relative overflow-hidden pb-10 pt-16 @3xl:pt-24">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 size-[520px] rounded-full blur-[90px]" style={{ background: tint(38) }} />
        <div className="absolute -right-24 bottom-[-120px] size-[460px] rounded-full blur-[90px]" style={{ background: tint(26, 'var(--btn-bg)') }} />
      </div>
      <W className="relative">
        <div
          className="grid gap-12 p-7 backdrop-blur-xl @3xl:p-12 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] @5xl:gap-16"
          style={{ background: tint(5, 'var(--fg)'), borderRadius: 'calc(var(--r-card) * 1.4)', boxShadow: `inset 0 0 0 1px ${tint(12, 'var(--fg)')}, inset 0 1px 0 ${tint(18, 'var(--fg)')}, 0 40px 80px -50px rgba(0,0,0,.6)` }}
        >
          <div>
            <Brand s={s} mark="soft" size={18} />
            <E s={s} el="newsTitle" kind="heading" as="h2" hint="h2" className="mt-8 block text-balance" style={title(30, 22)} />
            <E s={s} el="newsText" kind="text" as="p" hint="p" multiline className="mt-2.5 block max-w-md text-[15px] leading-[1.6]" style={body} />
            <NewsForm s={s} className="mt-7 max-w-md" field={{ background: tint(6, 'var(--fg)') }} />
          </div>
          <LinkCols s={s} n={3} className="grid-cols-2 @2xl:grid-cols-3 @5xl:pt-2" />
        </div>
        <div className="mt-8 flex flex-col gap-4 px-2 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <Note s={s} />
          <Social s={s} tile="round" size={16} />
        </div>
      </W>
    </footer>
  )
}

/* ---------- Büyük bağlantılar ---------- */
export function FooterBigLinks({ s }: P) {
  const { title, fp } = useType(s)
  return (
    <footer className="pb-10 pt-16 @3xl:pt-24">
      <W>
        <div className="grid gap-12 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] @4xl:gap-20">
          <div className="flex flex-col">
            <E s={s} el="ctaTitle" kind="heading" as="h2" hint="h2" className="block max-w-md text-balance" style={title(undefined, 30)} />
            <E s={s} el="email" kind="link" as="a" hint="a" className="mt-8 self-start break-all text-[19px] font-medium underline decoration-(--accent) decoration-2 underline-offset-[7px] transition-opacity hover:opacity-75" />
            <E s={s} el="phone" kind="link" as="a" hint="a" className="mt-3 self-start text-[15px] transition-opacity hover:opacity-75" style={{ color: 'var(--muted)' }} />
          </div>
          <nav aria-label={NAV_LABEL}>
            <ul data-grid={s.id} className="border-t" style={LINE}>
              {s.items.map((i, k) => (
                <li key={i.id} className="group flex items-center gap-5 border-b py-4 @3xl:py-5" style={LINE}>
                  <span aria-hidden className="w-7 shrink-0 font-mono text-[12px] tabular-nums" style={{ color: 'var(--muted)' }}>
                    {String(k + 1).padStart(2, '0')}
                  </span>
                  <FLink s={s} i={i} className="min-w-0 transition-transform duration-300 group-hover:translate-x-1.5" style={{ fontFamily: fp.display, fontWeight: s.style.titleWeight ?? fp.weight, fontSize: 'clamp(24px, 3.4cqi, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em' }} />
                  <ArrowUpRight size={22} aria-hidden className="ml-auto shrink-0 opacity-30 transition-[opacity,transform] duration-300 group-hover:rotate-45 group-hover:opacity-100" style={{ color: 'var(--accent)' }} />
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-5 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <Brand s={s} mark="solid" size={16} />
          <Note s={s} />
          <Social s={s} tile="outline" size={15} />
        </div>
      </W>
    </footer>
  )
}
