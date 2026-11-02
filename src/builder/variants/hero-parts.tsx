import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, Lock, Mail, Play } from 'lucide-react'
import { getGrid } from '../data'
import type { Section } from '../types'
import { Btn, E, EIcon, EImage, Slot, W, cn, secPad, useType, type LOOK, type BTN } from './kit'

/* ---------- Shared hero pieces ---------- */
export type P = { s: Section }

export const vars = (v: Record<string, string>) => v as CSSProperties

/** Content stays readable over photos: the overlay follows the palette background. */
export const veil = (pct: number) => `color-mix(in srgb, var(--bg) ${pct}%, transparent)`
export const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`
/** Brand hue shifted around the color wheel (mesh / neon glows). */
export const hue = (deg: number, c = 'var(--brand)') => `oklch(from ${c} l c calc(h + ${deg}))`

export function Eyebrow({ s, look = 'pill', className, style }: P & { look?: 'pill' | 'label' | 'glass' | 'muted'; className?: string; style?: CSSProperties }) {
  if (look === 'label') return <E s={s} el="eyebrow" kind="badge" className={cn('inline-block text-[12.5px] font-semibold uppercase tracking-[.16em]', className)} style={{ color: 'var(--accent)', ...style }} />
  if (look === 'muted') return <E s={s} el="eyebrow" kind="badge" className={cn('inline-block text-[13px] font-medium', className)} style={{ color: 'var(--muted)', ...style }} />
  return (
    <E
      s={s}
      el="eyebrow"
      kind="badge"
      className={cn('dot-badge inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium', look === 'glass' && 'backdrop-blur-md', className)}
      style={{ background: look === 'glass' ? veil(55) : tint('var(--fg)', 9), boxShadow: 'inset 0 0 0 1px var(--line)', ...style }}
    />
  )
}

/** Title + accent line in one <h1>. */
export function HeroTitle({ s, size = s.style.titleSize, min = 40, className, style, accentClass, accentStyle, inline }: P & { size?: number; min?: number; className?: string; style?: CSSProperties; accentClass?: string; accentStyle?: CSSProperties; inline?: boolean }) {
  const { fp, title } = useType(s)
  return (
    <h1 className={cn('text-balance', className)} style={{ ...title(size, min), ...style }}>
      <E s={s} el="title" kind="heading" hint="h1" className={inline ? undefined : 'block'} />
      {inline && ' '}
      <E s={s} el="accent" kind="heading" hint="h1" className={cn(!inline && 'block', fp.italicAccent && 'italic', accentClass)} style={{ color: s.style.titleColor || 'var(--hl)', ...accentStyle }} />
    </h1>
  )
}

export function Body({ s, className, style }: P & { className?: string; style?: CSSProperties }) {
  const { body } = useType(s)
  return <E s={s} el="body" kind="text" as="p" hint="p" multiline className={cn('block text-[17px] leading-[1.65]', className)} style={{ ...body, ...style }} />
}

export function Actions({ s, center, className, size = 'lg', second = 'secondary', primaryStyle }: P & { center?: boolean; className?: string; size?: keyof typeof BTN; second?: keyof typeof LOOK; primaryStyle?: CSSProperties }) {
  return (
    <div className={cn('flex flex-wrap gap-3', center && 'justify-center', className)}>
      <Btn s={s} size={size} style={primaryStyle} />
      <Btn s={s} el="secondary" look={second} size={size} />
    </div>
  )
}

/** Highlight badges (items): icon + label. */
export function Highlights({ s, look = 'row', center, className, style }: P & { look?: 'row' | 'chips' | 'list' | 'slash'; center?: boolean; className?: string; style?: CSSProperties }) {
  const g = getGrid(s)
  if (!s.items.length) return null
  if (look === 'list')
    return (
      <ul data-grid={s.id} className={cn('grid', className)} style={{ columnGap: g.gapX, rowGap: Math.max(g.gapY, 10), ...style }}>
        {s.items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 text-[15px] font-medium">
            <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ background: tint('var(--accent)', 14), color: 'var(--accent)' }}>
              <EIcon s={s} el={`items.${i.id}.icon`} inline stroke={2.4} />
            </span>
            <E s={s} el={`items.${i.id}.title`} kind="badge" />
          </li>
        ))}
      </ul>
    )
  return (
    <ul
      data-grid={s.id}
      className={cn('flex flex-wrap items-center', look === 'row' && 'text-[12px] font-semibold uppercase tracking-[.08em]', look === 'chips' && 'text-[13px] font-medium', look === 'slash' && 'text-[14px]', center && 'justify-center', className)}
      style={{ color: look === 'chips' ? 'var(--fg)' : 'var(--muted)', columnGap: look === 'chips' ? Math.min(g.gapX, 10) : g.gapX, rowGap: look === 'chips' ? 10 : g.gapY, ...style }}
    >
      {s.items.map((i, n) => (
        <li
          key={i.id}
          className={cn('inline-flex items-center gap-1.5', look === 'chips' && 'h-9 rounded-full px-3.5 backdrop-blur-sm')}
          style={look === 'chips' ? { background: tint('var(--fg)', 7), boxShadow: 'inset 0 0 0 1px var(--line)' } : undefined}
        >
          {look === 'slash' && n > 0 && (
            <span aria-hidden className="mr-2 opacity-40">
              /
            </span>
          )}
          {look !== 'slash' && <EIcon s={s} el={`items.${i.id}.icon`} inline stroke={2.4} />}
          <E s={s} el={`items.${i.id}.title`} kind="badge" />
        </li>
      ))}
    </ul>
  )
}

const STATS = [
  ['stat1', 'stat1Label'],
  ['stat2', 'stat2Label'],
  ['stat3', 'stat3Label'],
] as const

/** Three key figures (extras stat1…stat3Label). */
export function Stats({ s, className, size = 64 }: P & { className?: string; size?: number }) {
  const { title } = useType(s)
  return (
    <dl className={cn('grid border-t border-(--line) @3xl:grid-cols-3', className)}>
      {STATS.map(([v, l]) => (
        <div key={v} className="flex flex-col-reverse gap-2 border-b border-(--line) py-7 @3xl:border-b-0 @3xl:border-l @3xl:px-8 @3xl:first:border-l-0 @3xl:first:pl-0">
          <E s={s} el={l} kind="text" as="dt" hint="dt" className="block text-[14.5px]" style={{ color: 'var(--muted)' }} />
          <E s={s} el={v} kind="heading" as="dd" hint="dd" className="block" style={{ ...title(size, 40), lineHeight: 1 }} />
        </div>
      ))}
    </dl>
  )
}

/** One figure in a card (bento). */
export function StatCell({ s, n, filled, className }: P & { n: 1 | 2 | 3; filled?: boolean; className?: string }) {
  const { title } = useType(s)
  const [v, l] = STATS[n - 1]
  return (
    <div className={cn('flex min-h-[170px] flex-col justify-between gap-6 rounded-[var(--r-card)] p-7', className)} style={filled ? { background: 'var(--btn-bg)', color: 'var(--btn-fg)' } : { background: 'var(--card)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
      <span aria-hidden className="text-[12px] font-semibold tabular-nums tracking-[.14em] opacity-60">
        {String(n).padStart(2, '0')}
      </span>
      <div>
        <E s={s} el={v} kind="heading" as="p" hint="p" className="block" style={{ ...title(56, 40), lineHeight: 1, ...(filled ? { color: 'inherit' } : {}) }} />
        <E s={s} el={l} kind="text" as="p" hint="p" className="mt-2 block text-[14px]" style={{ color: filled ? 'inherit' : 'var(--muted)', opacity: filled ? 0.8 : 1 }} />
      </div>
    </div>
  )
}

/** Root of a hero design: vertical spacing from the box model. */
export function Shell({ s, className, children }: P & { className?: string; children: ReactNode }) {
  return (
    <div className={cn('relative', className)} style={secPad(s)}>
      {children}
    </div>
  )
}

const dots = (c: string, gap = 14) => ({ backgroundImage: `radial-gradient(${c} 1.2px, transparent 1.6px)`, backgroundSize: `${gap}px ${gap}px` })

/* ---------- Sağda görsel ---------- */
export function HeroSplitRight({ s }: P) {
  return (
    <Shell s={s}>
      <W className="grid items-center gap-14 @4xl:grid-cols-[1.05fr_.95fr] @4xl:gap-16">
        <div>
          <Eyebrow s={s} />
          <HeroTitle s={s} size={s.style.titleSize * 0.78} className="mt-7" />
          <Body s={s} className="mt-6 max-w-[34rem]" />
          <Actions s={s} className="mt-9" />
          <Highlights s={s} className="mt-10 border-t border-(--line) pt-6" />
        </div>
        <div className="relative mx-auto w-full max-w-[520px] @4xl:max-w-none">
          <div aria-hidden className="absolute -bottom-7 -left-7 size-36 opacity-70" style={dots(tint('var(--fg)', 35))} />
          <div aria-hidden className="absolute inset-0 translate-x-4 translate-y-4 rounded-[calc(var(--r-card)+4px)] @3xl:translate-x-6 @3xl:translate-y-6" style={{ boxShadow: 'inset 0 0 0 1.5px var(--line)' }} />
          <div aria-hidden className="absolute -right-8 -top-8 size-40 rounded-full blur-3xl" style={{ background: tint('var(--accent)', 40) }} />
          <EImage s={s} className="relative aspect-[4/5] w-full shadow-[0_50px_100px_-40px_rgba(0,0,0,.55)] @4xl:aspect-[5/6]" />
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Solda görsel ---------- */
export function HeroSplitLeft({ s }: P) {
  const arch = 'min(999px, calc(var(--r-card) * 20))'
  return (
    <Shell s={s}>
      <W className="grid items-center gap-12 @4xl:grid-cols-[.9fr_1.1fr] @4xl:gap-20">
        <div className="relative order-last mx-auto w-full max-w-[440px] @4xl:order-first @4xl:max-w-none" style={vars({ '--arch': `${arch} ${arch} var(--r-card) var(--r-card)` })}>
          <div aria-hidden className="absolute -inset-3 @3xl:-inset-4" style={{ borderRadius: 'var(--arch)', boxShadow: 'inset 0 0 0 1px var(--line)' }} />
          <div style={vars({ '--r-card': 'var(--arch)' })}>
            <EImage s={s} className="aspect-[4/5] w-full" />
          </div>
          <div aria-hidden className="absolute -right-4 bottom-12 grid size-20 place-items-center rounded-full shadow-[0_20px_40px_-12px_rgba(0,0,0,.45)] @3xl:-right-8 @3xl:size-24" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
            <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1" />
            </svg>
          </div>
        </div>
        <div>
          <Eyebrow s={s} look="label" />
          <HeroTitle s={s} size={s.style.titleSize * 0.74} className="mt-5" />
          <Body s={s} className="mt-6 max-w-[34rem]" />
          <Highlights s={s} look="list" className="mt-9 max-w-[34rem] @md:grid-cols-2" />
          <Actions s={s} className="mt-10" />
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Dev tipografi ---------- */
export function HeroBigType({ s }: P) {
  const center = s.style.align !== 'left'
  return (
    <Shell s={s}>
      <W className={cn(center && 'text-center')}>
        <div className={cn('flex items-center gap-4 text-[12.5px] font-semibold uppercase tracking-[.22em]', center && 'justify-center')} style={{ color: 'var(--muted)' }}>
          <span aria-hidden className="h-px w-10 bg-current opacity-40" />
          <E s={s} el="eyebrow" kind="badge" />
          {center && <span aria-hidden className="h-px w-10 bg-current opacity-40" />}
        </div>
        <HeroTitle s={s} size={s.style.titleSize * 1.45} min={50} className="mt-8 @4xl:mt-10" style={{ lineHeight: 0.94 }} />
        <div className={cn('mt-10 @4xl:mt-14', center ? 'mx-auto max-w-[40rem]' : 'grid gap-8 border-t border-(--line) pt-8 @4xl:grid-cols-[1fr_auto] @4xl:items-end')}>
          <Body s={s} className={cn('text-[18px]', center ? 'mx-auto' : 'max-w-[36rem]')} />
          <Actions s={s} center={center} className={cn(center && 'mt-9')} />
        </div>
        <Highlights s={s} look="slash" center={center} className="mt-14" />
      </W>
    </Shell>
  )
}

/* ---------- Arka plan görseli ---------- */
export function HeroBgImage({ s }: P) {
  return (
    <Shell s={s} className="isolate flex min-h-[min(780px,90cqi)] items-end overflow-hidden">
      <div className="absolute inset-0 -z-10" style={vars({ '--r-card': '0px' })}>
        <EImage s={s} className="size-full">
          <div aria-hidden className="absolute inset-0 hidden @3xl:block" style={{ background: `linear-gradient(90deg, ${veil(92)} 0%, ${veil(72)} 42%, ${veil(12)} 100%)` }} />
          <div aria-hidden className="absolute inset-0 @3xl:hidden" style={{ background: veil(74) }} />
          <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(0deg, ${veil(90)} 0%, transparent 50%)` }} />
        </EImage>
      </div>
      <W className="relative">
        <div className="max-w-[46rem]">
          <Eyebrow s={s} look="glass" />
          <HeroTitle s={s} size={s.style.titleSize * 0.86} className="mt-7" />
          <Body s={s} className="mt-6 max-w-[36rem]" />
          <Actions s={s} className="mt-9" />
        </div>
        <Highlights s={s} className="mt-14 border-t border-(--line) pt-6 @4xl:mt-20" />
      </W>
    </Shell>
  )
}

/* ---------- Video ---------- */
export function HeroVideo({ s }: P) {
  return (
    <Shell s={s} className="isolate flex min-h-[min(820px,96cqi)] items-center overflow-hidden">
      <div className="absolute inset-0 -z-10" style={vars({ '--r-card': '0px' })}>
        <EImage s={s} className="size-full">
          <div aria-hidden className="absolute inset-0" style={{ background: veil(60) }} />
          <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, ${veil(85)} 100%)` }} />
        </EImage>
      </div>
      <W className="relative flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-4">
          <button type="button" aria-label="Tanıtım videosunu oynat" className="group relative grid size-20 place-items-center rounded-full @3xl:size-24" style={{ background: tint('var(--fg)', 16), boxShadow: 'inset 0 0 0 1px var(--line)' }}>
            <motion.span aria-hidden className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${tint('var(--fg)', 45)}` }} animate={{ scale: [1, 1.45], opacity: [0.6, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }} />
            <span className="grid size-14 place-items-center rounded-full transition-transform duration-300 group-hover:scale-105 @3xl:size-[68px]" style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
              <Play size={24} fill="currentColor" className="translate-x-[2px]" aria-hidden />
            </span>
          </button>
          <E s={s} el="videoLabel" kind="text" className="text-[13.5px] font-medium tracking-[.02em]" style={{ color: 'var(--muted)' }} />
        </div>
        <HeroTitle s={s} size={s.style.titleSize * 0.88} className="mt-10 max-w-[58rem]" />
        <Body s={s} className="mx-auto mt-6 max-w-[40rem]" />
        <Actions s={s} center className="mt-9" />
        <Highlights s={s} center className="mt-12" />
      </W>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ background: tint('var(--fg)', 14) }}>
        <div className="h-full w-[34%]" style={{ background: 'var(--accent)' }} />
      </div>
    </Shell>
  )
}

/* ---------- Degrade ağ ---------- */
const BLOBS: { pos: string; c: string; w: string }[] = [
  { pos: '-left-[12%] -top-[30%]', c: tint('var(--brand)', 55), w: 'w-[58%]' },
  { pos: '-right-[14%] -top-[18%]', c: tint(hue(70), 50), w: 'w-[52%]' },
  { pos: 'left-[22%] -bottom-[45%]', c: tint(hue(-60), 45), w: 'w-[62%]' },
  { pos: 'left-[38%] top-[18%]', c: tint('var(--accent)', 26), w: 'w-[30%]' },
]

export function HeroMesh({ s }: P) {
  const center = s.style.align !== 'left'
  return (
    <Shell s={s} className="isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {BLOBS.map((b) => (
          <div key={b.pos} className={cn('absolute aspect-square rounded-full', b.pos, b.w)} style={{ background: `radial-gradient(closest-side, ${b.c}, transparent)`, filter: 'blur(clamp(30px, 6cqi, 80px))' }} />
        ))}
        <div className="absolute inset-0 opacity-50" style={{ ...dots(tint('var(--fg)', 14), 22), maskImage: 'radial-gradient(ellipse 60% 55% at 50% 40%, #000, transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: 'linear-gradient(transparent, var(--bg))' }} />
      </div>
      <W className={cn('relative', center && 'text-center')}>
        <Eyebrow s={s} look="glass" />
        <HeroTitle s={s} size={s.style.titleSize * 0.95} className={cn('mt-8 max-w-[60rem]', center && 'mx-auto')} />
        <Body s={s} className={cn('mt-7 max-w-[38rem] text-[18px]', center && 'mx-auto')} />
        <Actions s={s} center={center} className="mt-10" />
        <Highlights s={s} look="chips" center={center} className="mt-12" />
      </W>
    </Shell>
  )
}

/* ---------- Ürün ekranı ---------- */
export function HeroProduct({ s }: P) {
  return (
    <Shell s={s} className="overflow-x-clip">
      <W>
        <div className="mx-auto max-w-[52rem] text-center">
          <Eyebrow s={s} />
          <HeroTitle s={s} size={s.style.titleSize * 0.8} className="mt-7" />
          <Body s={s} className="mx-auto mt-6 max-w-[38rem]" />
          <Actions s={s} center className="mt-9" />
          <Highlights s={s} center className="mt-9" />
        </div>
        <div className="relative mt-16 @4xl:mt-20">
          <div aria-hidden className="absolute inset-x-[6%] -top-12 bottom-1/3 rounded-full blur-3xl" style={{ background: tint('var(--accent)', 34) }} />
          <div className="relative rounded-[calc(var(--r-card)+6px)] p-1.5 shadow-[0_70px_120px_-50px_rgba(0,0,0,.6)] @3xl:p-2" style={{ background: 'color-mix(in srgb, var(--fg) 8%, var(--bg))', boxShadow: 'inset 0 0 0 1px var(--line), 0 70px 120px -50px rgba(0,0,0,.6)' }}>
            <div aria-hidden className="flex h-9 items-center gap-2 px-2.5 @3xl:h-10">
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
              ))}
              <div className="mx-auto flex h-6 w-[min(380px,55%)] items-center justify-center gap-2 rounded-[min(var(--r-btn),7px)]" style={{ background: tint('var(--fg)', 8), color: 'var(--muted)' }}>
                <Lock size={11} strokeWidth={2.4} />
                <span className="h-1.5 w-1/3 rounded-full" style={{ background: tint('var(--fg)', 20) }} />
              </div>
              <span className="w-[42px]" />
            </div>
            <EImage s={s} className="aspect-[16/10] w-full @3xl:aspect-[16/9]" />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-[-2%] -bottom-px h-[28%]" style={{ background: 'linear-gradient(transparent, var(--bg))' }} />
        </div>
      </W>
    </Shell>
  )
}

/* ---------- E-posta toplama ---------- */
export function HeroEmail({ s }: P) {
  return (
    <Shell s={s}>
      <W className="grid items-center gap-14 @4xl:grid-cols-[1.2fr_.8fr] @4xl:gap-16">
        <div>
          <Eyebrow s={s} />
          <HeroTitle s={s} size={s.style.titleSize * 0.8} className="mt-7" />
          <Body s={s} className="mt-6 max-w-[36rem]" />
          <div className="mt-9 flex max-w-[540px] flex-col gap-1.5 rounded-[calc(var(--r-btn)+6px)] p-1.5 @md:flex-row @md:items-center" style={{ background: tint('var(--fg)', 7), boxShadow: 'inset 0 0 0 1px var(--line)' }}>
            <Slot s={s} el="placeholder" className="flex h-12 min-w-0 flex-1 items-center gap-2.5 px-3.5 text-[15px]" style={{ color: 'var(--muted)' }}>
              <Mail size={17} aria-hidden className="shrink-0" />
              <span className="truncate">{s.content.placeholder}</span>
            </Slot>
            <Btn s={s} className="shrink-0" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-[13.5px]" style={{ color: 'var(--muted)' }}>
            <Check size={15} strokeWidth={2.6} aria-hidden style={{ color: 'var(--accent)' }} />
            <E s={s} el="formNote" kind="text" />
          </div>
          <Highlights s={s} className="mt-10" />
        </div>
        <Inbox />
      </W>
    </Shell>
  )
}

/** Decorative stack of mail cards. */
function Inbox() {
  const card = { background: 'color-mix(in srgb, var(--fg) 5%, var(--bg))', boxShadow: '0 30px 60px -28px rgba(0,0,0,.45), inset 0 0 0 1px var(--line)' }
  const bar = (w: string, o = 18) => <span className="block h-2 rounded-full" style={{ width: w, background: tint('var(--fg)', o) }} />
  return (
    <div aria-hidden className="relative mx-auto hidden h-[380px] w-full max-w-[440px] @4xl:block">
      {[
        { t: 'top-0 left-[14%] -rotate-6', o: 0.55 },
        { t: 'top-[22%] left-[2%] rotate-3', o: 0.8 },
        { t: 'top-[46%] left-[10%] -rotate-1', o: 1 },
      ].map((c, n) => (
        <div key={n} className={cn('absolute w-[84%] rounded-[var(--r-card)] p-5', c.t)} style={{ ...card, opacity: c.o }}>
          <div className="flex items-center gap-3">
            <span className="size-9 shrink-0 rounded-full" style={{ background: n === 2 ? 'var(--btn-bg)' : tint('var(--fg)', 14) }} />
            <div className="flex-1 space-y-2">
              {bar('46%', 30)}
              {bar('72%')}
            </div>
            {n === 2 && <span className="size-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: `0 0 0 4px ${tint('var(--accent)', 25)}` }} />}
          </div>
          <div className="mt-5 space-y-2">
            {bar('100%', 10)}
            {bar('86%', 10)}
          </div>
        </div>
      ))}
      <div className="absolute -right-2 top-[8%] grid size-16 rotate-6 place-items-center rounded-[min(var(--r-card),18px)] shadow-[0_20px_40px_-12px_rgba(0,0,0,.45)]" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
        <Mail size={26} />
      </div>
    </div>
  )
}

/* ---------- İstatistikli ---------- */
export function HeroStats({ s }: P) {
  return (
    <Shell s={s}>
      <W>
        <div className="grid gap-10 @4xl:grid-cols-[1.3fr_.7fr] @4xl:items-end @4xl:gap-16">
          <div>
            <Eyebrow s={s} look="label" />
            <HeroTitle s={s} size={s.style.titleSize * 0.86} className="mt-6" />
          </div>
          <div className="@4xl:pb-3">
            <Body s={s} />
            <Actions s={s} size="md" className="mt-8" />
          </div>
        </div>
        <Stats s={s} className="mt-16 @4xl:mt-24" />
        <Highlights s={s} className="mt-8" />
      </W>
    </Shell>
  )
}
