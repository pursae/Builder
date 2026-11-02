import type { CSSProperties, ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Plus } from 'lucide-react'
import { IMAGES, SHADOWS, getGrid } from '../data'
import type { GridSettings, Section } from '../types'
import { E, ECard, EIcon, EImage, GRID_CLS, W, cardStyle, cn, gridStyle, secPad, useType } from './kit'
import type { KindVariants } from './types'

/* ---------- Shared pieces ---------- */
const isCenter = (s: Section) => s.style.align === 'center'
const num = (n: number) => String(n + 1).padStart(2, '0')
const mix = (v: string, p: number) => `color-mix(in srgb, var(${v}) ${p}%, transparent)`
const radius = (g: GridSettings) => (g.radius !== undefined ? `${g.radius}px` : 'var(--r-card)')

function Eyebrow({ s, look = 'text', className }: { s: Section; look?: 'text' | 'pill'; className?: string }) {
  if (look === 'pill')
    return (
      <E
        s={s}
        el="eyebrow"
        kind="badge"
        className={cn('inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-semibold tracking-[.02em]', className)}
        style={{ color: 'var(--accent)', background: mix('--accent', 12), boxShadow: `inset 0 0 0 1px ${mix('--accent', 26)}` }}
      />
    )
  return <E s={s} el="eyebrow" kind="badge" className={cn('inline-block text-[12.5px] font-semibold uppercase tracking-[.14em]', className)} style={{ color: 'var(--accent)' }} />
}

/** Eyebrow + h2 + body; `split` puts the body beside the title on wide pages (left-aligned sections only). */
function Head({ s, eyebrow, scale = 1, split, center = isCenter(s), className, children }: { s: Section; eyebrow?: 'text' | 'pill'; scale?: number; split?: boolean; center?: boolean; className?: string; children?: ReactNode }) {
  const { title, body } = useType(s)
  const t = <E s={s} el="title" kind="heading" as="h2" hint="h2" className="mt-4 block text-balance" style={title(s.style.titleSize * scale, 30)} />
  const b = s.content.body !== undefined && <E s={s} el="body" kind="text" as="p" hint="p" multiline className={cn('block text-[17px] leading-[1.65]', !split && 'mt-5')} style={body} />
  if (split && !center)
    return (
      <div className={cn('grid gap-6 @4xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] @4xl:items-end @4xl:gap-16', className)}>
        <div>
          <Eyebrow s={s} look={eyebrow} />
          {t}
        </div>
        <div className="@4xl:pb-2">
          {b}
          {children}
        </div>
      </div>
    )
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center', className)}>
      <Eyebrow s={s} look={eyebrow} />
      {t}
      {b}
      {children}
    </div>
  )
}

function ITitle({ s, id, size = 18, plain, className, style }: { s: Section; id: string; size?: number; plain?: boolean; className?: string; style?: CSSProperties }) {
  const { head } = useType(s)
  return (
    <E
      s={s}
      el={`items.${id}.title`}
      kind="heading"
      as="h3"
      hint="h3"
      className={cn('block text-balance', plain && 'font-semibold tracking-[-0.01em]', className)}
      style={{ ...(plain ? { fontSize: size, lineHeight: 1.3 } : head(size)), ...style }}
    />
  )
}

const IText = ({ s, id, className, style }: { s: Section; id: string; className?: string; style?: CSSProperties }) => (
  <E s={s} el={`items.${id}.text`} kind="text" as="p" hint="p" multiline className={cn('block text-[14.5px] leading-[1.6]', className)} style={{ color: 'var(--muted)', ...style }} />
)

const Icon = ({ s, id, className }: { s: Section; id: string; className?: string }) => <EIcon s={s} el={`items.${id}.icon`} className={className} />

function MoreLink({ s, className }: { s: Section; className?: string }) {
  if (s.content.primary === undefined) return null
  return (
    <div className={cn('group flex items-center gap-2 text-[15px] font-semibold', className)} style={{ color: 'var(--accent)' }}>
      <E s={s} el="primary" kind="link" as="a" hint="a" />
      <ArrowRight size={17} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
    </div>
  )
}

/** Clipped layer for card decorations (keeps the card itself unclipped so its editor label shows). */
const Deco = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} style={{ borderRadius: 'inherit' }}>
    {children}
  </div>
)

/* ---------- Bento ---------- */
const BENTO_SPAN = ['@3xl:col-span-2', '', '', '@3xl:col-span-2', '@5xl:col-span-2', '']
const BENTO_WIDE = ['@3xl:max-w-[52%]', '', '', '@3xl:max-w-[52%]', '@5xl:max-w-[52%]', '']

function BentoArt({ k }: { k: number }) {
  if (k === 0)
    return (
      <div className="absolute inset-y-0 right-0 hidden w-[44%] items-end gap-2 px-8 pt-16 @3xl:flex">
        {[34, 52, 41, 68, 57, 84, 100].map((h, j) => (
          <span key={j} className="flex-1 rounded-t-[min(var(--r-card),8px)]" style={{ height: `${h * 0.78}%`, background: `linear-gradient(180deg, ${mix('--accent', 26 + j * 10)}, ${mix('--accent', 3)})` }} />
        ))}
      </div>
    )
  if (k === 3)
    return (
      <div
        className="absolute inset-y-0 right-0 hidden w-1/2 @3xl:block"
        style={{
          backgroundImage: `radial-gradient(${mix('--fg', 24)} 1.2px, transparent 1.7px)`,
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(70% 70% at 60% 50%, #000 30%, transparent)',
          WebkitMaskImage: 'radial-gradient(70% 70% at 60% 50%, #000 30%, transparent)',
        }}
      >
        <span className="absolute left-[46%] top-[38%] size-3 rounded-full" style={{ background: 'var(--accent)', boxShadow: `0 0 0 7px ${mix('--accent', 18)}, 0 0 36px var(--accent)` }} />
        <span className="absolute left-[72%] top-[64%] size-2 rounded-full" style={{ background: 'var(--accent)', opacity: 0.6 }} />
        <span className="absolute left-[28%] top-[70%] size-1.5 rounded-full" style={{ background: 'var(--accent)', opacity: 0.45 }} />
      </div>
    )
  if (k === 4)
    return (
      <div className="absolute -right-20 top-1/2 hidden size-[360px] -translate-y-1/2 @5xl:block">
        {[1, 0.76, 0.52, 0.3].map((r, j) => (
          <span key={j} className="absolute rounded-full" style={{ inset: `${(1 - r) * 50}%`, border: `1px solid ${mix('--accent', 16 + j * 12)}` }} />
        ))}
        <span className="absolute inset-[45%] rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 48px var(--accent)' }} />
      </div>
    )
  return <span className="absolute -right-12 -top-12 size-44 rounded-full blur-2xl" style={{ background: mix('--accent', 16) }} />
}

function FeaturesBento({ s }: { s: Section }) {
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} split />
        <div data-grid={s.id} className="mt-14 grid grid-flow-row-dense grid-cols-1 @3xl:grid-cols-2 @5xl:grid-cols-3" style={{ columnGap: g.gapX, rowGap: g.gapY }}>
          {s.items.map((i, n) => {
            const k = n % 6
            return (
              <ECard key={i.id} s={s} id={i.id} className={cn('relative flex min-h-[260px] flex-col', BENTO_SPAN[k])} style={cardStyle(g)}>
                <Deco>
                  <BentoArt k={k} />
                </Deco>
                <Icon s={s} id={i.id} className="relative" />
                <div className={cn('relative mt-auto pt-12', BENTO_WIDE[k])}>
                  <ITitle s={s} id={i.id} size={BENTO_SPAN[k] ? 23 : 19} />
                  <IText s={s} id={i.id} className="mt-2" />
                </div>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

/* ---------- Icon list, two columns ---------- */
function FeaturesIconList({ s }: { s: Section }) {
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} split />
        <ul data-grid={s.id} className="mt-14 grid grid-cols-1 @3xl:grid-cols-2" style={{ columnGap: g.gapX, rowGap: g.gapY }}>
          {s.items.map((i) => (
            <ECard key={i.id} as="li" s={s} id={i.id} className="flex gap-5 py-7" style={{ borderTop: '1px solid var(--line)' }}>
              <Icon s={s} id={i.id} />
              <div className="min-w-0 pt-1">
                <ITitle s={s} id={i.id} size={17} plain />
                <IText s={s} id={i.id} className="mt-1.5" />
              </div>
            </ECard>
          ))}
        </ul>
      </W>
    </div>
  )
}

/* ---------- Alternating big numbers ---------- */
function FeaturesNumbers({ s }: { s: Section }) {
  const g = getGrid(s)
  const { fp } = useType(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} split />
        <ol data-grid={s.id} className="mt-14 grid" style={{ rowGap: g.gapY }}>
          {s.items.map((i, n) => (
            <ECard key={i.id} as="li" s={s} id={i.id} className="grid items-center gap-6 py-10 @4xl:grid-cols-2 @4xl:gap-16 @4xl:py-12" style={{ borderTop: '1px solid var(--line)' }}>
              <div
                aria-hidden
                className={cn('select-none leading-[.82] tabular-nums', n % 2 === 1 && '@4xl:order-last @4xl:text-right')}
                style={{
                  fontFamily: fp.display,
                  fontWeight: fp.weight,
                  fontSize: 'clamp(84px, 15cqi, 176px)',
                  letterSpacing: '-0.05em',
                  color: 'transparent',
                  backgroundImage: `linear-gradient(180deg, var(--accent) 10%, ${mix('--accent', 4)} 92%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                }}
              >
                {num(n)}
              </div>
              <div className={cn('max-w-lg', n % 2 === 0 && '@4xl:justify-self-end')}>
                <div className="flex items-center gap-4">
                  <Icon s={s} id={i.id} />
                  <ITitle s={s} id={i.id} size={27} />
                </div>
                <IText s={s} id={i.id} className="mt-4 text-[16.5px] leading-[1.65]" />
              </div>
            </ECard>
          ))}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Sticky heading + cards ---------- */
function FeaturesSticky({ s }: { s: Section }) {
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W className="grid gap-12 @4xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] @4xl:gap-16">
        <div className="@4xl:sticky @4xl:top-24 @4xl:self-start">
          <Head s={s} scale={0.82} center={false} />
          <MoreLink s={s} className="mt-8" />
        </div>
        <div data-grid={s.id} className="grid grid-cols-1 @2xl:grid-cols-2" style={{ columnGap: g.gapX, rowGap: g.gapY }}>
          {s.items.map((i, n) => (
            <ECard key={i.id} s={s} id={i.id} className={cn('flex flex-col', n % 2 === 1 && '@4xl:translate-y-8')} style={cardStyle(g)}>
              <div className="flex items-start justify-between gap-4">
                <Icon s={s} id={i.id} />
                <span aria-hidden className="font-mono text-[12px] tracking-wider" style={{ color: 'var(--muted)' }}>
                  {num(n)}
                </span>
              </div>
              <ITitle s={s} id={i.id} size={19} className="mt-10" />
              <IText s={s} id={i.id} className="mt-2" />
            </ECard>
          ))}
        </div>
      </W>
    </div>
  )
}

/* ---------- Dark glass cards ---------- */
function FeaturesGlass({ s }: { s: Section }) {
  const g = getGrid(s)
  const c = isCenter(s)
  const grid = `linear-gradient(${mix('--fg', 6)} 1px, transparent 1px), linear-gradient(90deg, ${mix('--fg', 6)} 1px, transparent 1px)`
  return (
    <div className="relative isolate overflow-hidden" style={secPad(s)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[560px] w-[960px] max-w-[150%] -translate-x-1/2 -translate-y-[38%] rounded-full blur-3xl" style={{ background: `radial-gradient(closest-side, ${mix('--accent', 40)}, transparent)` }} />
        <div className="absolute -bottom-48 -right-32 size-[520px] rounded-full blur-3xl" style={{ background: `radial-gradient(closest-side, ${mix('--btn-bg', 26)}, transparent)` }} />
        <div className="absolute inset-0" style={{ backgroundImage: grid, backgroundSize: '56px 56px', maskImage: 'radial-gradient(60% 55% at 50% 0%, #000, transparent)', WebkitMaskImage: 'radial-gradient(60% 55% at 50% 0%, #000, transparent)' }} />
      </div>
      <W>
        <Head s={s} eyebrow="pill" />
        <div data-grid={s.id} className={cn(GRID_CLS, 'mt-14')} style={gridStyle(g)}>
          {s.items.map((i) => (
            <ECard
              key={i.id}
              s={s}
              id={i.id}
              className={cn('relative flex flex-col', c && 'items-center text-center')}
              style={{
                padding: g.pad,
                background: g.bg ?? mix('--fg', 4),
                border: `1px solid ${g.borderColor ?? mix('--fg', 11)}`,
                borderRadius: radius(g),
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: `inset 0 1px 0 ${mix('--fg', 8)}, 0 24px 60px -32px rgba(0,0,0,.6)`,
              }}
            >
              <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${mix('--accent', 85)}, transparent)` }} />
              <Icon s={s} id={i.id} className="mb-7" />
              <ITitle s={s} id={i.id} size={18} plain />
              <IText s={s} id={i.id} className="mt-2" />
            </ECard>
          ))}
        </div>
      </W>
    </div>
  )
}

/* ---------- Gradient border cards ---------- */
function FeaturesGradientBorder({ s }: { s: Section }) {
  const g = getGrid(s)
  const c = isCenter(s)
  const r = radius(g)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} split />
        <div data-grid={s.id} className={cn(GRID_CLS, 'mt-14')} style={gridStyle(g)}>
          {s.items.map((i, n) => (
            <ECard
              key={i.id}
              s={s}
              id={i.id}
              className="group relative"
              style={{
                padding: 1,
                borderRadius: r,
                background: `linear-gradient(${140 + n * 37}deg, ${mix('--accent', 80)}, var(--line) 36%, var(--line) 64%, ${mix('--accent', 40)})`,
                boxShadow: g.shadow !== 'none' ? SHADOWS[g.shadow] : `0 18px 40px -28px ${mix('--accent', 55)}`,
              }}
            >
              <div
                className={cn('relative flex h-full flex-col overflow-hidden', c && 'items-center text-center')}
                style={{ padding: g.pad, borderRadius: `max(0px, calc(${r} - 1px))`, background: g.bg ? g.bg : 'linear-gradient(var(--card), var(--card)), var(--bg)' }}
              >
                <span aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100" style={{ background: mix('--accent', 16), opacity: 0.7 }} />
                <Icon s={s} id={i.id} className="relative mb-8" />
                <ITitle s={s} id={i.id} size={18} plain className="relative" />
                <IText s={s} id={i.id} className="relative mt-2" />
              </div>
            </ECard>
          ))}
        </div>
      </W>
    </div>
  )
}

/* ---------- Centered minimal 3-up ---------- */
function FeaturesMinimal({ s }: { s: Section }) {
  const g = getGrid(s)
  const c = isCenter(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <span aria-hidden className={cn('mt-12 block h-px w-16', c && 'mx-auto')} style={{ background: 'var(--accent)' }} />
        <div data-grid={s.id} className={cn(GRID_CLS, 'mt-12')} style={gridStyle(g)}>
          {s.items.map((i) => (
            <ECard key={i.id} s={s} id={i.id} className={cn('flex flex-col', c ? 'items-center text-center' : 'items-start')} style={{ padding: '6px 4px' }}>
              <Icon s={s} id={i.id} className="mb-7" />
              <ITitle s={s} id={i.id} size={21} />
              <IText s={s} id={i.id} className="mt-3 max-w-[36ch] text-[15.5px] leading-[1.65]" />
            </ECard>
          ))}
        </div>
      </W>
    </div>
  )
}

/* ---------- KPI / metrics ---------- */
function FeaturesMetrics({ s }: { s: Section }) {
  const g = getGrid(s)
  const { fp } = useType(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} split />
        <div data-grid={s.id} className={cn(GRID_CLS, 'mt-16')} style={gridStyle(g)}>
          {s.items.map((i) => (
            <ECard key={i.id} s={s} id={i.id} className="relative flex flex-col" style={{ padding: '2px 0 2px 24px', borderLeft: '1px solid var(--line)' }}>
              <span aria-hidden className="absolute -left-px top-0 h-14 w-[2px]" style={{ background: 'var(--accent)' }} />
              <Icon s={s} id={i.id} />
              <E
                s={s}
                el={`items.${i.id}.title`}
                kind="heading"
                as="h3"
                hint="h3"
                className="mt-7 block text-balance tabular-nums"
                style={{ fontFamily: fp.display, fontWeight: fp.weight, fontSize: 'clamp(30px, 4.1cqi, 46px)', letterSpacing: '-0.035em', lineHeight: 1.04 }}
              />
              <IText s={s} id={i.id} className="mt-3 max-w-[34ch] text-[15px]" />
            </ECard>
          ))}
        </div>
      </W>
    </div>
  )
}

/* ---------- Divided grid ---------- */
function Cross({ className }: { className: string }) {
  return (
    <span aria-hidden className={cn('pointer-events-none absolute z-10 grid size-4 place-items-center', className)} style={{ color: 'var(--muted)' }}>
      <Plus size={16} strokeWidth={1.2} />
    </span>
  )
}

function FeaturesDivided({ s }: { s: Section }) {
  const g = getGrid(s)
  const c = isCenter(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} split />
        <div className="relative mt-14">
          <Cross className="-left-2 -top-2" />
          <Cross className="-right-2 -top-2" />
          <Cross className="-bottom-2 -left-2" />
          <Cross className="-bottom-2 -right-2" />
          <div data-grid={s.id} className={cn(GRID_CLS, 'overflow-hidden')} style={{ ...gridStyle(g), background: g.borderColor ?? 'var(--line)', border: `1px solid ${g.borderColor ?? 'var(--line)'}`, borderRadius: g.radius ?? 0 }}>
            {s.items.map((i) => (
              <ECard key={i.id} s={s} id={i.id} className={cn('edb-in group relative flex flex-col', c && 'items-center text-center')} style={{ padding: g.pad + 8, background: g.bg ?? 'var(--bg)' }}>
                <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'var(--card)' }} />
                <ArrowUpRight aria-hidden size={18} className="absolute right-6 top-6 opacity-0 transition-all duration-300 group-hover:opacity-100" style={{ color: 'var(--accent)' }} />
                <Icon s={s} id={i.id} className="relative mb-12" />
                <ITitle s={s} id={i.id} size={17} plain className="relative" />
                <IText s={s} id={i.id} className="relative mt-2" />
              </ECard>
            ))}
          </div>
        </div>
      </W>
    </div>
  )
}

/* ---------- Checklist split ---------- */
function FeaturesChecklist({ s }: { s: Section }) {
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W className="grid gap-12 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] @4xl:gap-20">
        <div>
          <Head s={s} scale={0.84} center={false} />
          <MoreLink s={s} className="mt-8" />
        </div>
        <ul data-grid={s.id} className="grid content-start" style={{ rowGap: g.gapY }}>
          {s.items.map((i, n) => (
            <ECard
              key={i.id}
              as="li"
              s={s}
              id={i.id}
              className="flex gap-4 py-6"
              style={{ borderTop: '1px solid var(--line)', borderBottom: n === s.items.length - 1 ? '1px solid var(--line)' : undefined }}
            >
              <span aria-hidden className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                <Check size={15} strokeWidth={2.8} />
              </span>
              <div className="min-w-0">
                <ITitle s={s} id={i.id} size={17} plain />
                <IText s={s} id={i.id} className="mt-1.5" />
              </div>
            </ECard>
          ))}
        </ul>
      </W>
    </div>
  )
}

/* ---------- Image + feature list ---------- */
function FeaturesImageList({ s }: { s: Section }) {
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W className="grid items-center gap-12 @4xl:grid-cols-2 @4xl:gap-16">
        <div>
          <Head s={s} scale={0.8} center={false} />
          <ul data-grid={s.id} className="mt-10 grid grid-cols-1 @2xl:grid-cols-2" style={{ columnGap: g.gapX, rowGap: g.gapY }}>
            {s.items.map((i) => (
              <ECard key={i.id} as="li" s={s} id={i.id} className="flex gap-4">
                <Icon s={s} id={i.id} />
                <div className="min-w-0">
                  <ITitle s={s} id={i.id} size={16} plain />
                  <IText s={s} id={i.id} className="mt-1 text-[14px]" />
                </div>
              </ECard>
            ))}
          </ul>
        </div>
        <div className="relative isolate @4xl:order-first">
          <div aria-hidden className="absolute -inset-8 -z-10 blur-2xl" style={{ background: `radial-gradient(closest-side, ${mix('--accent', 28)}, transparent)` }} />
          <EImage s={s} className="aspect-[4/3] w-full @4xl:aspect-[4/5]" />
          <div
            aria-hidden
            className="absolute bottom-5 left-5 flex items-center gap-3 rounded-full px-4 py-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,.45)]"
            style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid var(--line)' }}
          >
            <span className="relative grid size-2.5 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: 'var(--accent)', animationIterationCount: 3 }} />
              <span className="size-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
            </span>
            <span className="h-1.5 w-16 rounded-full" style={{ background: mix('--fg', 22) }} />
            <span className="h-1.5 w-8 rounded-full" style={{ background: mix('--fg', 12) }} />
          </div>
        </div>
      </W>
    </div>
  )
}

/* ---------- Tabs / accordion look ---------- */
function MockWindow() {
  return (
    <div aria-hidden className="mt-auto pt-10">
      <div className="overflow-hidden rounded-[min(var(--r-card),14px)]" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
        <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
          {[0, 1, 2].map((k) => (
            <span key={k} className="size-2.5 rounded-full" style={{ background: mix('--fg', 14) }} />
          ))}
          <span className="ml-3 h-2 w-28 rounded-full" style={{ background: mix('--fg', 8) }} />
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-5 p-5">
          <div className="space-y-2.5">
            {[72, 92, 56, 80, 64].map((w, k) => (
              <span key={k} className="block h-2 rounded-full" style={{ width: `${w}%`, background: k === 1 ? 'var(--accent)' : mix('--fg', 10) }} />
            ))}
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {[30, 46, 38, 60, 52, 74, 66, 90, 82, 100].map((h, k) => (
              <span key={k} className="flex-1 rounded-t-[3px]" style={{ height: `${h}%`, background: `linear-gradient(180deg, ${mix('--accent', 30 + k * 6)}, ${mix('--accent', 6)})` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturesTabs({ s }: { s: Section }) {
  const g = getGrid(s)
  const [first, ...rest] = s.items
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} split />
        <div data-grid={s.id} className="mt-14 grid @4xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" style={{ columnGap: g.gapX, rowGap: g.gapY }}>
          {first && (
            <ECard s={s} id={first.id} className="relative flex min-h-[440px] flex-col" style={{ ...cardStyle(g), padding: g.pad + 8 }}>
              <span aria-hidden className="absolute bottom-10 left-0 top-10 w-[3px] rounded-r-full" style={{ background: 'var(--accent)' }} />
              <div className="flex items-center gap-4">
                <Icon s={s} id={first.id} />
                <span aria-hidden className="ml-auto rounded-full px-2.5 py-1 font-mono text-[11.5px]" style={{ color: 'var(--accent)', background: mix('--accent', 12) }}>
                  01 / {num(s.items.length - 1)}
                </span>
              </div>
              <ITitle s={s} id={first.id} size={30} className="mt-8" />
              <IText s={s} id={first.id} className="mt-3 max-w-xl text-[16.5px] leading-[1.65]" />
              <MockWindow />
            </ECard>
          )}
          <ul className="grid content-start" style={{ rowGap: Math.min(g.gapY, 12) || 10 }}>
            {rest.map((i) => (
              <ECard key={i.id} as="li" s={s} id={i.id} className="group flex items-start gap-4" style={{ padding: '18px 20px', border: '1px solid var(--line)', borderRadius: radius(g) }}>
                <Icon s={s} id={i.id} />
                <div className="min-w-0 flex-1">
                  <ITitle s={s} id={i.id} size={16} plain />
                  <IText s={s} id={i.id} className="mt-1 text-[14px]" />
                </div>
                <ChevronRight aria-hidden size={18} className="mt-1 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" style={{ color: 'var(--muted)' }} />
              </ECard>
            ))}
          </ul>
        </div>
      </W>
    </div>
  )
}

/* ---------- Editorial numbered rows ---------- */
function FeaturesEditorial({ s }: { s: Section }) {
  const g = getGrid(s)
  const { title, body } = useType(s)
  return (
    <div style={secPad(s)}>
      <W>
        <div className="grid gap-5 pt-6 @4xl:grid-cols-[200px_minmax(0,1fr)] @4xl:gap-12" style={{ borderTop: '2px solid var(--fg)' }}>
          <div className="@4xl:pt-3">
            <Eyebrow s={s} />
          </div>
          <div>
            <E s={s} el="title" kind="heading" as="h2" hint="h2" className="block max-w-4xl text-balance" style={title(s.style.titleSize * 1.05, 34)} />
            {s.content.body !== undefined && <E s={s} el="body" kind="text" as="p" hint="p" multiline className="mt-6 block max-w-2xl text-[18px] leading-[1.65]" style={body} />}
          </div>
        </div>
        <ol data-grid={s.id} className="mt-16 grid" style={{ rowGap: g.gapY }}>
          {s.items.map((i, n) => (
            <ECard
              key={i.id}
              as="li"
              s={s}
              id={i.id}
              className="grid gap-x-12 gap-y-3 py-9 @4xl:grid-cols-[200px_minmax(0,1fr)_minmax(0,1.15fr)_auto] @4xl:items-start"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              <span aria-hidden className="font-mono text-[13px] tracking-wider @4xl:pt-2" style={{ color: 'var(--accent)' }}>
                ({num(n)})
              </span>
              <ITitle s={s} id={i.id} size={26} />
              <IText s={s} id={i.id} className="text-[16px] leading-[1.7] @4xl:pt-1" />
              <div className="hidden @4xl:block">
                <Icon s={s} id={i.id} />
              </div>
            </ECard>
          ))}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Comparison cards (one highlighted) ---------- */
function FeaturesCompare({ s }: { s: Section }) {
  const g = getGrid(s)
  const hi = s.items.length >= 3 ? 1 : 0
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} eyebrow="pill" />
        <div data-grid={s.id} className={cn(GRID_CLS, 'mt-16 items-stretch')} style={gridStyle(g)}>
          {s.items.map((i, n) => {
            const on = n === hi
            return (
              <ECard
                key={i.id}
                s={s}
                id={i.id}
                className={cn('relative flex flex-col', on && '@5xl:-my-4')}
                style={
                  on
                    ? { padding: g.pad + 4, background: 'var(--fg)', color: 'var(--bg)', borderRadius: radius(g), boxShadow: `0 40px 80px -40px ${mix('--accent', 70)}, 0 0 0 1px ${mix('--accent', 40)}` }
                    : { ...cardStyle(g), border: g.border ? cardStyle(g).border : '1px solid var(--line)' }
                }
              >
                {on && <span aria-hidden className="pointer-events-none absolute inset-x-10 -top-px h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />}
                <div className="flex w-full items-start justify-between gap-3">
                  <Icon s={s} id={i.id} />
                  {on && s.content.highlight !== undefined && (
                    <E s={s} el="highlight" kind="badge" className="inline-block rounded-full px-3 py-1 text-[12px] font-semibold" style={{ color: 'var(--bg)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--bg) 30%, transparent)' }} />
                  )}
                </div>
                <ITitle s={s} id={i.id} size={22} className="mt-8" />
                <IText s={s} id={i.id} className="mt-2.5" style={on ? { color: 'color-mix(in srgb, var(--bg) 72%, transparent)' } : undefined} />
                <div aria-hidden className="mt-auto flex w-full items-center gap-3 pt-8">
                  <span className="h-px flex-1" style={{ background: on ? 'color-mix(in srgb, var(--bg) 18%, transparent)' : 'var(--line)' }} />
                  <span className="grid size-9 place-items-center rounded-full" style={on ? { background: 'var(--accent)', color: 'var(--bg)' } : { boxShadow: 'inset 0 0 0 1px var(--line)', color: 'var(--fg)' }}>
                    <ArrowRight size={16} />
                  </span>
                </div>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

export const FEATURES: KindVariants = {
  kind: 'features',
  fields: [
    { key: 'image', label: 'Görsel', el: 'image', def: IMAGES[4].url },
    { key: 'primary', label: 'Bağlantı', el: 'link', def: 'Tüm özellikleri inceleyin' },
    { key: 'highlight', label: 'Öne çıkan rozeti', el: 'badge', def: 'En çok tercih edilen' },
  ],
  variants: [
    { id: 'default', name: 'Kart ızgarası', tags: ['Modern', 'SaaS'], blurb: 'Başlık ve ikonlu kart ızgarası.' },
    { id: 'bento', name: 'Bento ızgara', tags: ['Modern', 'SaaS'], blurb: 'Farklı genişlikte kartlar ve dekoratif grafiklerle bento düzeni.', C: FeaturesBento },
    { id: 'icon-list', name: 'İkonlu liste', tags: ['Minimal', 'Kurumsal'], blurb: 'Kartsız, iki sütunlu ikon ve yazı satırları.', C: FeaturesIconList, grid: { gapX: 56, gapY: 0 } },
    { id: 'big-numbers', name: 'Büyük numaralar', tags: ['Editoryal', 'Cesur'], blurb: 'Dev numaralarla sağa sola dönüşümlü özellik satırları.', C: FeaturesNumbers, grid: { gapY: 0 } },
    { id: 'sticky', name: 'Sabit başlık', tags: ['Modern', 'SaaS'], blurb: 'Solda kaydırırken sabit kalan başlık, sağda kart ızgarası.', C: FeaturesSticky, extras: ['primary'] },
    { id: 'glass', name: 'Koyu cam kartlar', tags: ['Koyu', 'Glass'], blurb: 'Işıltılı koyu zemin üzerinde yarı saydam cam kartlar.', C: FeaturesGlass, style: { palette: 'dark', align: 'center' }, bg: { decor: 'none' } },
    { id: 'gradient-border', name: 'Gradyan kenarlı', tags: ['Gradient', 'Modern'], blurb: 'Marka renginde ince gradyan çerçeveli kartlar.', C: FeaturesGradientBorder },
    { id: 'minimal', name: 'Sade üçlü', tags: ['Minimal'], blurb: 'Ortalanmış, büyük ikonlu ve kartsız üçlü sütunlar.', C: FeaturesMinimal, style: { align: 'center' }, grid: { iconSize: 64, gapX: 40, gapY: 56 } },
    { id: 'metrics', name: 'Metrik panosu', tags: ['Kurumsal', 'SaaS'], blurb: 'Kart başlıkları KPI gibi iri rakam, yazılar etiket olarak.', C: FeaturesMetrics, grid: { gapX: 32, gapY: 56 } },
    { id: 'divided', name: 'Çizgili ızgara', tags: ['Minimal', 'SaaS'], blurb: 'İnce çizgilerle bölünmüş, köşe işaretli teknik ızgara.', C: FeaturesDivided, grid: { gapX: 1, gapY: 1 } },
    { id: 'checklist', name: 'Kontrol listesi', tags: ['Minimal', 'Kurumsal'], blurb: 'Solda başlık, sağda onay işaretli özellik listesi.', C: FeaturesChecklist, extras: ['primary'], grid: { gapY: 0 } },
    { id: 'image-list', name: 'Görsel ve liste', tags: ['Modern', 'Kurumsal'], blurb: 'Büyük bir görselin yanında ikonlu kısa özellik listesi.', C: FeaturesImageList, extras: ['image'], grid: { gapX: 28, gapY: 28, iconSize: 36 } },
    { id: 'tabs', name: 'Sekme görünümü', tags: ['Modern', 'SaaS'], blurb: 'İlk özellik büyük panelde açık, diğerleri sekme satırları halinde.', C: FeaturesTabs },
    { id: 'editorial', name: 'Editoryal satırlar', tags: ['Editoryal', 'Minimal'], blurb: 'Numaralı, çizgilerle ayrılmış dergi tipi satırlar.', C: FeaturesEditorial, grid: { gapY: 0 } },
    { id: 'compare', name: 'Karşılaştırma kartları', tags: ['Kurumsal', 'SaaS'], blurb: 'Fiyat tablosu havasında, biri öne çıkarılmış kartlar.', C: FeaturesCompare, extras: ['highlight'], style: { align: 'center' } },
  ],
}
