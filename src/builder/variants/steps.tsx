import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import { SHADOWS, getGrid } from '../data'
import type { GridSettings, Section } from '../types'
import { Btn, E, ECard, GRID_CLS, W, cn, gridStyle, secPad, useType } from './kit'
import type { KindVariants } from './types'

/* ---------- Shared pieces ---------- */
const isCenter = (s: Section) => s.style.align === 'center'
const num = (n: number) => String(n + 1).padStart(2, '0')
const mix = (v: string, p: number) => `color-mix(in srgb, var(${v}) ${p}%, transparent)`
const radius = (g: GridSettings) => (g.radius !== undefined ? `${g.radius}px` : 'var(--r-card)')

/** Step box (always outlined: the steps grid has no border by default). */
const boxStyle = (g: GridSettings): CSSProperties => ({
  padding: g.pad,
  background: g.bg ?? 'var(--card)',
  border: g.border ? `${g.borderW}px solid ${g.borderColor ?? 'var(--line)'}` : '1px solid var(--line)',
  borderRadius: radius(g),
  boxShadow: SHADOWS[g.shadow],
})

/** One column per step on wide pages (`--n`), two at most on tablets when there are four (`--t`). */
const stepCols = (s: Section) => {
  const n = Math.max(1, s.items.length)
  return { '--n': `repeat(${n}, minmax(0, 1fr))`, '--t': `repeat(${n === 4 ? 2 : n}, minmax(0, 1fr))` } as CSSProperties
}

function Eyebrow({ s, look = 'text' }: { s: Section; look?: 'text' | 'pill' }) {
  if (look === 'pill')
    return (
      <E
        s={s}
        el="eyebrow"
        kind="badge"
        className="inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-semibold tracking-[.02em]"
        style={{ color: 'var(--fg)', background: mix('--fg', 8), boxShadow: `inset 0 0 0 1px ${mix('--fg', 16)}`, backdropFilter: 'blur(8px)' }}
      />
    )
  return <E s={s} el="eyebrow" kind="badge" className="inline-block text-[12.5px] font-semibold uppercase tracking-[.14em]" style={{ color: 'var(--accent)' }} />
}

/** Eyebrow + h2 (+ the extra `body` for designs listing it). */
function Head({ s, eyebrow, scale = 1, center = isCenter(s), withBody, className }: { s: Section; eyebrow?: 'text' | 'pill'; scale?: number; center?: boolean; withBody?: boolean; className?: string }) {
  const { title, body } = useType(s)
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center', className)}>
      <Eyebrow s={s} look={eyebrow} />
      <E s={s} el="title" kind="heading" as="h2" hint="h2" className="mt-4 block text-balance" style={title(s.style.titleSize * scale, 30)} />
      {withBody && s.content.body !== undefined && <E s={s} el="body" kind="text" as="p" hint="p" multiline className="mt-5 block text-[17px] leading-[1.65]" style={body} />}
    </div>
  )
}

function ITitle({ s, id, size = 19, plain, className, style }: { s: Section; id: string; size?: number; plain?: boolean; className?: string; style?: CSSProperties }) {
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

function useNumFont(s: Section): CSSProperties {
  const { fp } = useType(s)
  return { fontFamily: fp.display, fontWeight: fp.weight }
}

/* ---------- Vertical timeline ---------- */
function StepsTimelineV({ s }: { s: Section }) {
  const g = getGrid(s)
  const nf = useNumFont(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <ol data-grid={s.id} className={cn('relative mt-14 grid max-w-3xl', isCenter(s) && 'mx-auto')} style={{ rowGap: g.gapY }}>
          <span aria-hidden className="absolute bottom-8 left-[23px] top-8 w-px" style={{ background: 'linear-gradient(180deg, var(--accent), var(--line) 70%)' }} />
          {s.items.map((i, n) => (
            <li key={i.id} className="relative grid grid-cols-[48px_minmax(0,1fr)] gap-5 @3xl:gap-8">
              <span
                aria-hidden
                className="relative mt-3 grid size-12 place-items-center rounded-full text-[15px] tabular-nums"
                style={{ ...nf, ...(n === 0 ? { background: 'var(--accent)', color: 'var(--bg)' } : { background: 'var(--bg)', color: 'var(--accent)' }), boxShadow: `inset 0 0 0 1.5px ${mix('--accent', 60)}, 0 0 0 6px var(--bg)` }}
              >
                {num(n)}
              </span>
              <ECard s={s} id={i.id} className="relative" style={boxStyle(g)}>
                <ITitle s={s} id={i.id} size={21} />
                <IText s={s} id={i.id} className="mt-2.5 text-[15px] leading-[1.65]" />
              </ECard>
            </li>
          ))}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Horizontal timeline ---------- */
function StepsTimelineH({ s }: { s: Section }) {
  const g = getGrid(s)
  const last = s.items.length - 1
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <ol data-grid={s.id} className="mt-16 grid grid-cols-1 @3xl:grid-cols-(--t) @5xl:grid-cols-(--n)" style={{ ...stepCols(s), columnGap: g.gapX, rowGap: g.gapY }}>
          {s.items.map((i, n) => (
            <ECard key={i.id} as="li" s={s} id={i.id} className="relative">
              <div aria-hidden className="mb-8 flex items-center gap-3">
                <span className="size-3.5 shrink-0 rounded-full" style={{ background: 'var(--accent)', boxShadow: `0 0 0 5px ${mix('--accent', 18)}, 0 0 22px ${mix('--accent', 55)}` }} />
                <span className="font-mono text-[12.5px] tracking-wider" style={{ color: 'var(--accent)' }}>
                  {num(n)}
                </span>
                <span className="h-px flex-1" style={{ background: n === last ? 'linear-gradient(90deg, var(--line), transparent)' : `linear-gradient(90deg, ${mix('--accent', 55)}, var(--line))` }} />
              </div>
              <ITitle s={s} id={i.id} size={23} />
              <IText s={s} id={i.id} className="mt-3 max-w-[38ch] text-[15px] leading-[1.65]" />
            </ECard>
          ))}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Big number cards ---------- */
function StepsBigNumber({ s }: { s: Section }) {
  const g = getGrid(s)
  const nf = useNumFont(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <div data-grid={s.id} className={cn(GRID_CLS, 'mt-14')} style={gridStyle(g)}>
          {s.items.map((i, n) => (
            <ECard key={i.id} s={s} id={i.id} className="relative flex min-h-[320px] flex-col" style={boxStyle(g)}>
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
                <span className="absolute -left-10 -top-10 size-40 rounded-full blur-2xl" style={{ background: mix('--accent', 14) }} />
                <span
                  className="absolute -bottom-[0.18em] -right-[0.04em] select-none leading-none tabular-nums"
                  style={{ ...nf, fontSize: 'clamp(160px, 20cqi, 230px)', letterSpacing: '-0.06em', color: 'transparent', WebkitTextStroke: `1.5px ${mix('--fg', 16)}` }}
                >
                  {n + 1}
                </span>
              </div>
              <span aria-hidden className="relative w-fit rounded-full px-3 py-1 font-mono text-[12px] font-semibold" style={{ color: 'var(--accent)', background: mix('--accent', 12) }}>
                {num(n)}
              </span>
              <div className="relative mt-10 max-w-[30ch]">
                <ITitle s={s} id={i.id} size={24} />
                <IText s={s} id={i.id} className="mt-2.5 text-[15px] leading-[1.65]" />
              </div>
            </ECard>
          ))}
        </div>
      </W>
    </div>
  )
}

/* ---------- Zig-zag ---------- */
function StepsZigzag({ s }: { s: Section }) {
  const g = getGrid(s)
  const nf = useNumFont(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <ol data-grid={s.id} className="relative mt-16 grid" style={{ rowGap: g.gapY }}>
          <span aria-hidden className="absolute bottom-0 left-5 top-0 w-px @4xl:left-1/2" style={{ background: 'linear-gradient(180deg, transparent, var(--line) 8%, var(--line) 92%, transparent)' }} />
          {s.items.map((i, n) => {
            const right = n % 2 === 1
            return (
              <li key={i.id} className="relative grid pl-14 @4xl:grid-cols-2 @4xl:gap-x-20 @4xl:pl-0">
                <span
                  aria-hidden
                  className="absolute left-5 top-6 z-10 grid size-10 -translate-x-1/2 place-items-center rounded-full text-[14px] tabular-nums @4xl:left-1/2"
                  style={{ ...nf, background: 'var(--accent)', color: 'var(--bg)', boxShadow: `0 0 0 6px var(--bg), 0 0 0 7px ${mix('--accent', 30)}` }}
                >
                  {n + 1}
                </span>
                <span aria-hidden className={cn('absolute top-[43px] hidden h-px w-5 @4xl:block', right ? 'left-[calc(50%+20px)]' : 'right-[calc(50%+20px)]')} style={{ background: mix('--accent', 50) }} />
                <ECard s={s} id={i.id} className={cn('relative', right && '@4xl:col-start-2')} style={boxStyle(g)}>
                  <ITitle s={s} id={i.id} size={22} />
                  <IText s={s} id={i.id} className="mt-2.5 text-[15px] leading-[1.65]" />
                </ECard>
              </li>
            )
          })}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Arrow chevrons ---------- */
const CHEV_M_FIRST = '[clip-path:polygon(0_0,100%_0,100%_calc(100%_-_18px),50%_100%,0_calc(100%_-_18px))]'
const CHEV_M = '[clip-path:polygon(0_0,50%_18px,100%_0,100%_calc(100%_-_18px),50%_100%,0_calc(100%_-_18px))]'
const CHEV_D_FIRST = '@4xl:[clip-path:polygon(0_0,calc(100%_-_28px)_0,100%_50%,calc(100%_-_28px)_100%,0_100%)]'
const CHEV_D = '@4xl:[clip-path:polygon(0_0,calc(100%_-_28px)_0,100%_50%,calc(100%_-_28px)_100%,0_100%,28px_50%)]'

function StepsChevrons({ s }: { s: Section }) {
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <ol data-grid={s.id} className="mt-14 flex flex-col @4xl:flex-row" style={{ columnGap: g.gapX, rowGap: g.gapY }}>
          {s.items.map((i, n) => (
            <ECard key={i.id} as="li" s={s} id={i.id} className={cn('relative min-w-0 @4xl:flex-1', n > 0 && '-mt-3 @4xl:-ml-[22px] @4xl:mt-0')}>
              <span aria-hidden className={cn('absolute inset-0', n ? CHEV_M : CHEV_M_FIRST, n ? CHEV_D : CHEV_D_FIRST)} style={{ background: g.bg ?? `color-mix(in srgb, var(--accent) ${10 + n * 9}%, var(--card))` }} />
              <div className={cn('relative px-7 pb-12 @4xl:py-10 @4xl:pr-14', n ? 'pt-12 @4xl:pl-16' : 'pt-8 @4xl:pl-9')}>
                <span aria-hidden className="font-mono text-[12.5px] font-semibold tracking-wider" style={{ color: 'var(--accent)' }}>
                  {num(n)}
                </span>
                <ITitle s={s} id={i.id} size={21} className="mt-3" />
                <IText s={s} id={i.id} className="mt-2" />
              </div>
            </ECard>
          ))}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Centered progress circles ---------- */
function StepsProgress({ s }: { s: Section }) {
  const g = getGrid(s)
  const nf = useNumFont(s)
  const len = s.items.length
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <ol data-grid={s.id} className="mt-16 grid grid-cols-1 @3xl:grid-cols-(--n)" style={{ ...stepCols(s), columnGap: g.gapX, rowGap: g.gapY }}>
          {s.items.map((i, n) => (
            <ECard key={i.id} as="li" s={s} id={i.id} className="relative flex flex-col items-center text-center">
              {n < len - 1 && (
                <span
                  aria-hidden
                  className="absolute top-9 hidden h-px @3xl:block"
                  style={{ left: 'calc(50% + 48px)', right: `calc(-50% - ${g.gapX}px + 48px)`, background: `repeating-linear-gradient(90deg, ${mix('--accent', 55)} 0 6px, transparent 6px 12px)` }}
                />
              )}
              <div aria-hidden className="grid size-[72px] place-items-center rounded-full" style={{ background: `conic-gradient(var(--accent) ${((n + 1) / len) * 100}%, var(--line) 0)` }}>
                <span className="grid size-[64px] place-items-center rounded-full text-[21px] tabular-nums" style={{ ...nf, background: 'var(--bg)', color: 'var(--fg)' }}>
                  {n + 1}
                </span>
              </div>
              <ITitle s={s} id={i.id} size={21} className="mt-7" />
              <IText s={s} id={i.id} className="mt-2 max-w-[32ch] text-[15px] leading-[1.65]" />
            </ECard>
          ))}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Split: heading left, steps right ---------- */
function StepsSplit({ s }: { s: Section }) {
  const g = getGrid(s)
  const nf = useNumFont(s)
  return (
    <div style={secPad(s)}>
      <W className="grid gap-12 @4xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] @4xl:gap-20">
        <div className="@4xl:sticky @4xl:top-24 @4xl:self-start">
          <Head s={s} scale={0.86} center={false} withBody />
          <Btn s={s} el="primary" className="mt-9" />
        </div>
        <ol data-grid={s.id} className="relative grid content-start" style={{ rowGap: g.gapY }}>
          <span aria-hidden className="absolute bottom-10 top-10" style={{ left: g.pad + 21, borderLeft: `1.5px dashed ${mix('--accent', 45)}` }} />
          {s.items.map((i, n) => (
            <ECard key={i.id} as="li" s={s} id={i.id} className="relative flex gap-5" style={boxStyle(g)}>
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[min(var(--r-btn),12px)] text-[15px] tabular-nums" style={{ ...nf, background: 'var(--accent)', color: 'var(--bg)' }}>
                {num(n)}
              </span>
              <div className="min-w-0 pt-1.5">
                <ITitle s={s} id={i.id} size={20} />
                <IText s={s} id={i.id} className="mt-2 text-[15px] leading-[1.65]" />
              </div>
            </ECard>
          ))}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Minimal numbered list ---------- */
function StepsMinimal({ s }: { s: Section }) {
  const g = getGrid(s)
  const nf = useNumFont(s)
  const last = s.items.length - 1
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <ol data-grid={s.id} className="mt-14 grid" style={{ rowGap: g.gapY }}>
          {s.items.map((i, n) => (
            <ECard
              key={i.id}
              as="li"
              s={s}
              id={i.id}
              className="group grid gap-3 py-8 @3xl:grid-cols-[96px_minmax(0,1fr)_minmax(0,1.3fr)] @3xl:items-baseline @3xl:gap-10"
              style={{ borderTop: '1px solid var(--line)', borderBottom: n === last ? '1px solid var(--line)' : undefined }}
            >
              <span aria-hidden className="text-[17px] tabular-nums" style={{ ...nf, color: 'var(--muted)' }}>
                {num(n)}
                <span style={{ color: 'var(--accent)' }}>.</span>
              </span>
              <ITitle s={s} id={i.id} size={26} />
              <IText s={s} id={i.id} className="text-[16px] leading-[1.7]" />
            </ECard>
          ))}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Glass cards on a gradient ---------- */
function StepsGlass({ s }: { s: Section }) {
  const g = getGrid(s)
  const nf = useNumFont(s)
  const len = s.items.length
  return (
    <div className="relative isolate overflow-hidden" style={secPad(s)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(55% 65% at 12% 8%, ${mix('--accent', 48)}, transparent 70%), radial-gradient(50% 60% at 92% 92%, ${mix('--btn-bg', 42)}, transparent 70%), radial-gradient(35% 40% at 62% 38%, ${mix('--accent', 20)}, transparent 70%)`,
        }}
      />
      <W>
        <Head s={s} eyebrow="pill" />
        <ol data-grid={s.id} className="mt-14 grid grid-cols-1 @3xl:grid-cols-(--t) @5xl:grid-cols-(--n)" style={{ ...stepCols(s), columnGap: g.gapX, rowGap: g.gapY }}>
          {s.items.map((i, n) => (
            <ECard
              key={i.id}
              as="li"
              s={s}
              id={i.id}
              className="relative flex flex-col"
              style={{
                padding: g.pad,
                background: g.bg ?? mix('--fg', 6),
                border: `1px solid ${g.borderColor ?? mix('--fg', 14)}`,
                borderRadius: radius(g),
                backdropFilter: 'blur(18px) saturate(140%)',
                WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                boxShadow: `inset 0 1px 0 ${mix('--fg', 12)}, 0 30px 60px -36px rgba(0,0,0,.55)`,
              }}
            >
              <div aria-hidden className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full text-[15px] tabular-nums" style={{ ...nf, background: mix('--fg', 10), boxShadow: `inset 0 0 0 1px ${mix('--fg', 18)}` }}>
                  {n + 1}
                </span>
                <span className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: mix('--fg', 10) }}>
                  <span className="block h-full rounded-full" style={{ width: `${((n + 1) / len) * 100}%`, background: 'var(--accent)' }} />
                </span>
              </div>
              <ITitle s={s} id={i.id} size={21} className="mt-10" />
              <IText s={s} id={i.id} className="mt-2.5 text-[15px] leading-[1.65]" style={{ color: 'color-mix(in srgb, var(--fg) 72%, transparent)' }} />
            </ECard>
          ))}
        </ol>
      </W>
    </div>
  )
}

/* ---------- Checklist with done states ---------- */
function StepsChecklist({ s }: { s: Section }) {
  const g = getGrid(s)
  const len = s.items.length
  const done = Math.max(0, len - 1)
  const r = radius(g)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <div className={cn('mt-14 max-w-2xl', isCenter(s) && 'mx-auto')} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: r, boxShadow: '0 30px 70px -40px rgba(0,0,0,.35)' }}>
          <div aria-hidden className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((k) => (
                <span key={k} className="size-2.5 rounded-full" style={{ background: mix('--fg', 14) }} />
              ))}
            </div>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: mix('--fg', 8) }}>
              <span className="block h-full rounded-full" style={{ width: `${len ? (done / len) * 100 : 0}%`, background: 'var(--accent)' }} />
            </span>
            <span className="font-mono text-[12px] tabular-nums" style={{ color: 'var(--muted)' }}>
              {done}/{len}
            </span>
          </div>
          <ol data-grid={s.id} className="grid p-2" style={{ rowGap: g.gapY }}>
            {s.items.map((i, n) => {
              const ok = n < done
              return (
                <ECard key={i.id} as="li" s={s} id={i.id} className="flex gap-4 px-4 py-5 text-left" style={{ borderRadius: `max(4px, calc(${r} - 8px))`, background: ok ? undefined : mix('--accent', 8) }}>
                  {ok ? (
                    <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                      <Check size={14} strokeWidth={3} />
                    </span>
                  ) : (
                    <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full" style={{ boxShadow: 'inset 0 0 0 2px var(--accent)' }}>
                      <span className="size-2 rounded-full" style={{ background: 'var(--accent)' }} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <ITitle s={s} id={i.id} size={17} plain style={ok ? { color: 'var(--muted)' } : undefined} />
                    <IText s={s} id={i.id} className="mt-1" />
                  </div>
                  <span aria-hidden className="mt-1 font-mono text-[11.5px] tabular-nums" style={{ color: 'var(--muted)' }}>
                    {num(n)}
                  </span>
                </ECard>
              )
            })}
          </ol>
        </div>
      </W>
    </div>
  )
}

/* ---------- Roadmap with quarter labels ---------- */
function StepsRoadmap({ s }: { s: Section }) {
  const g = getGrid(s)
  const last = s.items.length - 1
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} />
        <ol data-grid={s.id} className="mt-16 grid grid-cols-1 @3xl:grid-cols-(--t) @5xl:grid-cols-(--n)" style={{ ...stepCols(s), '--gx': `-${g.gapX}px`, columnGap: g.gapX, rowGap: g.gapY } as CSSProperties}>
          {s.items.map((i, n) => {
            const now = n === 0
            return (
              <li key={i.id} className="relative flex flex-col">
                <span
                  aria-hidden
                  className="w-fit rounded-full px-3 py-1 font-mono text-[12px] font-semibold"
                  style={now ? { background: 'var(--accent)', color: 'var(--bg)' } : { boxShadow: 'inset 0 0 0 1px var(--line)', color: 'var(--muted)' }}
                >
                  Q{n + 1}
                </span>
                <div aria-hidden className={cn('relative my-6 h-1', n < last && '@5xl:mr-(--gx)')}>
                  <span className="absolute inset-0 rounded-full" style={{ background: now ? `linear-gradient(90deg, var(--accent), ${mix('--accent', 25)})` : mix('--fg', 10) }} />
                  <span
                    className="absolute left-0 top-1/2 size-3.5 -translate-y-1/2 rounded-full"
                    style={now ? { background: 'var(--accent)', boxShadow: `0 0 0 5px ${mix('--accent', 22)}` } : { background: 'var(--bg)', boxShadow: 'inset 0 0 0 2px var(--line)' }}
                  />
                </div>
                <ECard s={s} id={i.id} className="relative flex-1" style={{ ...boxStyle(g), ...(now ? { borderColor: mix('--accent', 45) } : {}) }}>
                  <ITitle s={s} id={i.id} size={19} />
                  <IText s={s} id={i.id} className="mt-2" />
                </ECard>
              </li>
            )
          })}
        </ol>
      </W>
    </div>
  )
}

export const STEPS: KindVariants = {
  kind: 'steps',
  fields: [
    { key: 'body', label: 'Açıklama', el: 'text', multiline: true, def: 'Kurulumdan yayına kadar her adımda yanınızdayız. Ortalama bir WordPress taşıması bir öğleden sonra sürer.' },
    { key: 'primary', label: 'Buton', el: 'button', def: 'Kurulum rehberi' },
  ],
  variants: [
    { id: 'default', name: 'Bölmeli adımlar', tags: ['Modern'], blurb: 'Numaralı, çizgilerle ayrılmış adımlar.' },
    { id: 'timeline', name: 'Dikey zaman çizelgesi', tags: ['Modern', 'SaaS'], blurb: 'Noktalarla bağlanan dikey çizgi üzerinde adım kartları.', C: StepsTimelineV, grid: { gapY: 20 } },
    { id: 'timeline-h', name: 'Yatay zaman çizelgesi', tags: ['Minimal', 'Modern'], blurb: 'Parlayan noktalar ve bağlantı çizgisiyle yan yana adımlar.', C: StepsTimelineH, grid: { gapX: 40, gapY: 48 } },
    { id: 'big-number', name: 'Dev numaralı kartlar', tags: ['Cesur', 'Modern'], blurb: 'Köşesinde dev çerçeve numara taşıyan adım kartları.', C: StepsBigNumber, grid: { gapX: 16, gapY: 16 } },
    { id: 'zigzag', name: 'Zikzak', tags: ['Modern', 'Editoryal'], blurb: 'Ortadaki çizginin iki yanında sırayla dizilen adımlar.', C: StepsZigzag, style: { align: 'center' }, grid: { gapY: 28 } },
    { id: 'chevrons', name: 'Ok şeritleri', tags: ['Cesur', 'Kurumsal'], blurb: 'Birbirine geçen ok biçimli şeritlerle ilerleyen süreç.', C: StepsChevrons, grid: { gapX: 6, gapY: 6 } },
    { id: 'progress', name: 'İlerleme halkaları', tags: ['Minimal', 'SaaS'], blurb: 'Kesikli çizgilerle bağlanan, dolan ilerleme halkaları.', C: StepsProgress, style: { align: 'center' }, grid: { gapX: 32, gapY: 48 } },
    { id: 'split', name: 'Bölünmüş başlık', tags: ['Kurumsal', 'SaaS'], blurb: 'Solda açıklamalı sabit başlık ve buton, sağda adım listesi.', C: StepsSplit, extras: ['body', 'primary'], grid: { gapY: 14 } },
    { id: 'minimal-list', name: 'Sade numaralı liste', tags: ['Minimal', 'Editoryal'], blurb: 'İnce çizgilerle ayrılmış, numaralı yalın satırlar.', C: StepsMinimal, grid: { gapY: 0 } },
    { id: 'glass', name: 'Gradyan üstünde cam', tags: ['Glass', 'Gradient', 'Koyu'], blurb: 'Renkli ışık geçişleri üzerinde buzlu cam adım kartları.', C: StepsGlass, style: { palette: 'dark', align: 'center' }, bg: { decor: 'none' }, grid: { gapX: 16, gapY: 16 } },
    { id: 'checklist', name: 'Görev listesi', tags: ['SaaS', 'Minimal'], blurb: 'Tamamlanan ve sıradaki adımları gösteren uygulama paneli.', C: StepsChecklist, style: { align: 'center' }, grid: { gapY: 4 } },
    { id: 'roadmap', name: 'Yol haritası', tags: ['Kurumsal', 'SaaS'], blurb: 'Çeyrek etiketleri ve ilerleme hattıyla yol haritası kartları.', C: StepsRoadmap, grid: { gapX: 20, gapY: 32 } },
  ],
}
