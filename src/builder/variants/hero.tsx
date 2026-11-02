import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import { IMAGES } from '../data'
import { E, EIcon, EImage, Logos, W, cn, initials } from './kit'
import {
  Actions,
  Body,
  Eyebrow,
  HeroBgImage,
  HeroBigType,
  HeroEmail,
  HeroMesh,
  HeroProduct,
  HeroSplitLeft,
  HeroSplitRight,
  HeroStats,
  HeroTitle,
  HeroVideo,
  Highlights,
  Shell,
  StatCell,
  hue,
  tint,
  vars,
  type P,
} from './hero-parts'
import type { KindVariants } from './types'

/* ---------- Logolu ---------- */
function HeroLogos({ s }: P) {
  return (
    <Shell s={s} className="overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[70%] w-[min(1100px,120%)] -translate-x-1/2" style={{ background: `radial-gradient(ellipse 50% 60% at 50% 0%, ${tint('var(--accent)', 22)}, transparent)` }} />
      <W className="relative text-center">
        <Eyebrow s={s} />
        <HeroTitle s={s} size={s.style.titleSize * 0.86} className="mx-auto mt-7 max-w-[58rem]" />
        <Body s={s} className="mx-auto mt-6 max-w-[38rem]" />
        <Actions s={s} center className="mt-9" />
        <Highlights s={s} center className="mt-9" />
        <div className="mt-20 @4xl:mt-24">
          <div className="flex items-center gap-5">
            <span aria-hidden className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, var(--line))' }} />
            <E s={s} el="logosLabel" kind="text" as="p" hint="p" className="whitespace-nowrap text-[12px] font-semibold uppercase tracking-[.2em]" style={{ color: 'var(--muted)' }} />
            <span aria-hidden className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--line), transparent)' }} />
          </div>
          <Logos s={s} size={23} className="mt-9 justify-center gap-x-12 gap-y-6 @4xl:gap-x-16" />
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Kolaj ---------- */
const POLAROID = 'rounded-[calc(var(--r-card)+8px)] bg-white p-2 shadow-[0_30px_60px_-24px_rgba(0,0,0,.55)] transition-transform duration-500 hover:rotate-0 @3xl:p-2.5'

function HeroCollage({ s }: P) {
  return (
    <Shell s={s} className="overflow-x-clip">
      <W className="grid items-center gap-14 @4xl:grid-cols-[1fr_1fr] @4xl:gap-12">
        <div>
          <Eyebrow s={s} />
          <HeroTitle s={s} size={s.style.titleSize * 0.76} className="mt-7" />
          <Body s={s} className="mt-6 max-w-[34rem]" />
          <Actions s={s} className="mt-9" />
          <Highlights s={s} look="chips" className="mt-10" />
        </div>
        <div className="relative mx-auto aspect-[1/1] w-full max-w-[560px]">
          <div aria-hidden className="absolute inset-[12%] rounded-full blur-3xl" style={{ background: tint('var(--accent)', 30) }} />
          <div className={cn('absolute left-[2%] top-[8%] w-[54%] -rotate-[7deg]', POLAROID)}>
            <EImage s={s} className="aspect-[4/5] w-full" />
          </div>
          <div className={cn('absolute right-[1%] top-0 w-[48%] rotate-[6deg]', POLAROID)}>
            <EImage s={s} el="image2" className="aspect-[3/4] w-full" />
          </div>
          <div className={cn('absolute bottom-[2%] left-[24%] w-[56%] -rotate-[2deg]', POLAROID)}>
            <EImage s={s} el="image3" className="aspect-[5/4] w-full" />
          </div>
          <div aria-hidden className="absolute bottom-[20%] right-[4%] grid size-14 rotate-12 place-items-center rounded-full text-[22px] shadow-[0_14px_30px_-10px_rgba(0,0,0,.5)] @3xl:size-16" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
            ✦
          </div>
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Editoryal ---------- */
const SERIF = "'Instrument Serif', Georgia, serif"

function HeroEditorial({ s }: P) {
  return (
    <Shell s={s}>
      <W>
        <div className="flex items-center justify-between gap-4 border-y border-(--fg) py-3 text-[11.5px] font-semibold uppercase tracking-[.18em]">
          <E s={s} el="issue" kind="text" />
          <span aria-hidden className="hidden flex-1 items-center gap-3 px-6 @3xl:flex">
            <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
            <span style={{ fontFamily: SERIF }} className="text-[16px] normal-case tracking-normal">
              ❦
            </span>
            <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
          </span>
          <E s={s} el="eyebrow" kind="badge" style={{ color: 'var(--accent)' }} />
        </div>
        <HeroTitle s={s} size={s.style.titleSize * 1.3} min={48} className="mt-10 @4xl:mt-14" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 0.92 }} />
        <div className="mt-12 grid gap-10 border-t border-(--line) pt-10 @4xl:mt-16 @4xl:grid-cols-12 @4xl:gap-0">
          <div className="@4xl:col-span-4 @4xl:pr-10">
            <Body s={s} className="text-[16.5px] first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:font-['Instrument_Serif',serif] first-letter:text-[68px] first-letter:leading-[.78] first-letter:text-(--fg)" />
            <Actions s={s} size="md" className="mt-8" />
          </div>
          <figure className="@4xl:col-span-5 @4xl:border-x @4xl:border-(--line) @4xl:px-10">
            <EImage s={s} className="aspect-[4/3] w-full" />
          </figure>
          <ol data-grid={s.id} className="@4xl:col-span-3 @4xl:pl-10">
            {s.items.map((i, n) => (
              <li key={i.id} className="flex items-baseline gap-4 border-b border-(--line) py-3.5 first:pt-0">
                <span aria-hidden className="w-7 shrink-0 text-[22px] italic leading-none" style={{ fontFamily: SERIF, color: 'var(--accent)' }}>
                  {String(n + 1).padStart(2, '0')}
                </span>
                <span className="flex items-center gap-2 text-[14.5px] font-medium">
                  <EIcon s={s} el={`items.${i.id}.icon`} inline stroke={2.2} />
                  <E s={s} el={`items.${i.id}.title`} kind="badge" />
                </span>
              </li>
            ))}
          </ol>
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Neon ---------- */
function HeroNeon({ s }: P) {
  const center = s.style.align !== 'left'
  const grid = tint('var(--fg)', 7)
  const glow = s.style.titleColor
    ? { color: s.style.titleColor }
    : { backgroundImage: `linear-gradient(90deg, var(--accent), ${hue(80, 'var(--accent)')})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: `drop-shadow(0 0 28px ${tint('var(--accent)', 55)})` }
  return (
    <Shell s={s} className="isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, ${grid} 1px, transparent 1px), linear-gradient(to bottom, ${grid} 1px, transparent 1px)`, backgroundSize: '64px 64px', maskImage: 'radial-gradient(ellipse 75% 70% at 50% 10%, #000 25%, transparent 80%)' }} />
        <div className="absolute left-1/2 top-[-35%] aspect-square w-[min(1000px,120%)] -translate-x-1/2 rounded-full" style={{ background: `radial-gradient(closest-side, ${tint('var(--accent)', 40)}, transparent)`, filter: 'blur(40px)' }} />
        <div className="absolute right-[-10%] top-[30%] aspect-square w-[40%] rounded-full" style={{ background: `radial-gradient(closest-side, ${tint(hue(80, 'var(--accent)'), 28)}, transparent)`, filter: 'blur(50px)' }} />
        <div className="absolute inset-x-[10%] bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', boxShadow: `0 0 24px 2px ${tint('var(--accent)', 60)}` }} />
      </div>
      <W className={cn('relative', center && 'text-center')}>
        <E s={s} el="eyebrow" kind="badge" className="inline-flex items-center rounded-full px-3.5 py-1 font-mono text-[12px] uppercase tracking-[.14em]" style={{ color: 'var(--accent)', background: tint('var(--accent)', 10), boxShadow: `inset 0 0 0 1px ${tint('var(--accent)', 45)}, 0 0 24px -4px ${tint('var(--accent)', 55)}` }} />
        <HeroTitle s={s} size={s.style.titleSize * 0.98} min={44} className={cn('mt-8 max-w-[62rem]', center && 'mx-auto')} accentClass={cn('w-fit pb-[.06em]', center && 'mx-auto')} accentStyle={glow} />
        <Body s={s} className={cn('mt-7 max-w-[38rem]', center && 'mx-auto')} />
        <Actions s={s} center={center} className="mt-10" primaryStyle={{ boxShadow: `0 0 0 1px ${tint('var(--accent)', 60)}, 0 12px 40px -8px ${tint('var(--accent)', 70)}` }} />
        <ul data-grid={s.id} className={cn('mt-12 flex flex-wrap gap-2.5 font-mono text-[12px] uppercase tracking-[.08em]', center && 'justify-center')}>
          {s.items.map((i) => (
            <li key={i.id} className="inline-flex h-8 items-center gap-2 rounded-[min(var(--r-btn),8px)] px-3" style={{ color: 'var(--fg)', background: tint('var(--accent)', 7), boxShadow: `inset 0 0 0 1px ${tint('var(--accent)', 30)}` }}>
              <span style={{ color: 'var(--accent)' }}>
                <EIcon s={s} el={`items.${i.id}.icon`} inline stroke={2.4} />
              </span>
              <E s={s} el={`items.${i.id}.title`} kind="badge" />
            </li>
          ))}
        </ul>
      </W>
    </Shell>
  )
}

/* ---------- Uygulama indir ---------- */
const AppleMark = () => (
  <svg viewBox="0 0 24 24" className="size-7 shrink-0" fill="currentColor" aria-hidden>
    <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.9 1.15 9.15.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.4-3.67zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28z" />
  </svg>
)
const PlayMark = () => (
  <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden>
    <path d="M3.6 2.4 13.5 12l-9.9 9.6A1.3 1.3 0 0 1 3 20.5v-17c0-.5.2-.9.6-1.1z" fill="#00d7fe" />
    <path d="M16.8 8.7 13.5 12 3.6 2.4c.3-.2.8-.2 1.2 0z" fill="#00f076" />
    <path d="M16.8 15.3 4.8 21.6c-.4.2-.9.2-1.2 0l9.9-9.6z" fill="#ff3a44" />
    <path d="M20.3 10.7c.9.5.9 2.1 0 2.6l-3.5 2-3.3-3.3 3.3-3.3z" fill="#ffd500" />
  </svg>
)

function StoreBadge({ s, el, store, mark }: P & { el: string; store: string; mark: ReactNode }) {
  if (s.content[el] === undefined) return null
  return (
    <div className="inline-flex h-[58px] items-center gap-3 rounded-[min(var(--r-btn),14px)] bg-[#0b0b0d] pl-4 pr-6 text-white ring-1 ring-white/15 transition-transform duration-300 hover:-translate-y-0.5">
      {mark}
      <div className="flex flex-col items-start leading-none">
        <E s={s} el={el} kind="button" as="a" hint="a" className="text-[11px] font-medium text-white/75" />
        <E s={s} el={store} kind="text" className="mt-1 text-[19px] font-semibold tracking-[-0.01em]" />
      </div>
    </div>
  )
}

function Stars({ size = 16 }: { size?: number }) {
  return (
    <span aria-hidden className="inline-flex gap-0.5 text-[#f5a524]">
      {[0, 1, 2, 3, 4].map((n) => (
        <Star key={n} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  )
}

function HeroApp({ s }: P) {
  return (
    <Shell s={s} className="overflow-x-clip">
      <W className="grid items-center gap-16 @4xl:grid-cols-[1.1fr_.9fr]">
        <div>
          <Eyebrow s={s} />
          <HeroTitle s={s} size={s.style.titleSize * 0.8} className="mt-7" />
          <Body s={s} className="mt-6 max-w-[34rem]" />
          <div className="mt-9 flex flex-wrap gap-3">
            <StoreBadge s={s} el="primary" store="store1" mark={<AppleMark />} />
            <StoreBadge s={s} el="secondary" store="store2" mark={<PlayMark />} />
          </div>
          <div className="mt-7 flex items-center gap-3 text-[14px]" style={{ color: 'var(--muted)' }}>
            <Stars />
            <E s={s} el="ratingNote" kind="text" />
          </div>
          <Highlights s={s} className="mt-10 border-t border-(--line) pt-6" />
        </div>
        <div className="relative mx-auto w-full max-w-[420px]">
          <div aria-hidden className="absolute left-1/2 top-1/2 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ boxShadow: `inset 0 0 0 1px var(--line), 0 0 0 60px ${tint('var(--fg)', 3)}, 0 0 0 61px var(--line)` }} />
          <div aria-hidden className="absolute left-1/2 top-1/2 aspect-square w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: tint('var(--accent)', 45) }} />
          <div className="relative mx-auto w-[min(300px,74%)] rotate-[4deg] rounded-[46px] bg-[#0c0d10] p-2.5 shadow-[0_60px_100px_-30px_rgba(0,0,0,.7)] ring-1 ring-white/10">
            <div style={vars({ '--r-card': '37px' })}>
              <EImage s={s} className="aspect-[9/19] w-full" />
            </div>
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-5 h-[22px] w-[30%] -translate-x-1/2 rounded-full bg-[#0c0d10]" />
            <span aria-hidden className="absolute -left-[3px] top-28 h-14 w-[3px] rounded-l bg-[#0c0d10]" />
            <span aria-hidden className="absolute -right-[3px] top-24 h-20 w-[3px] rounded-r bg-[#0c0d10]" />
          </div>
          <div aria-hidden className="absolute -left-2 top-[18%] flex w-[150px] -rotate-3 items-center gap-2.5 rounded-[min(var(--r-card),16px)] p-3 shadow-[0_24px_50px_-16px_rgba(0,0,0,.5)] @3xl:-left-8" style={{ background: 'color-mix(in srgb, var(--fg) 6%, var(--bg))', boxShadow: 'inset 0 0 0 1px var(--line), 0 24px 50px -16px rgba(0,0,0,.5)' }}>
            <span className="size-8 shrink-0 rounded-full" style={{ background: 'var(--btn-bg)' }} />
            <span className="flex-1 space-y-1.5">
              <span className="block h-1.5 w-[70%] rounded-full" style={{ background: tint('var(--fg)', 35) }} />
              <span className="block h-1.5 w-full rounded-full" style={{ background: tint('var(--fg)', 15) }} />
            </span>
          </div>
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Yorumlu ---------- */
function HeroTestimonial({ s }: P) {
  return (
    <Shell s={s}>
      <W className="grid items-center gap-14 @4xl:grid-cols-2 @4xl:gap-16">
        <div>
          <Eyebrow s={s} />
          <HeroTitle s={s} size={s.style.titleSize * 0.76} className="mt-7" />
          <Body s={s} className="mt-6 max-w-[34rem]" />
          <Actions s={s} className="mt-9" />
          <Highlights s={s} className="mt-10" />
        </div>
        <div className="relative @4xl:pl-6">
          <EImage s={s} className="aspect-[4/5] w-full @4xl:ml-auto @4xl:w-[90%]" />
          <figure className="relative mx-4 -mt-24 rounded-[var(--r-card)] p-6 backdrop-blur-xl @md:mx-8 @4xl:absolute @4xl:-left-2 @4xl:bottom-10 @4xl:m-0 @4xl:w-[360px]" style={{ background: 'color-mix(in srgb, var(--bg) 90%, transparent)', boxShadow: 'inset 0 0 0 1px var(--line), 0 40px 70px -30px rgba(0,0,0,.55)' }}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]" style={{ color: 'var(--muted)' }}>
              <Stars size={15} />
              <E s={s} el="ratingNote" kind="text" />
            </div>
            <blockquote className="mt-4">
              <E s={s} el="quote" kind="text" as="p" hint="p" multiline className="block text-[16.5px] leading-[1.55]" style={{ color: 'var(--fg)' }} />
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
                {initials(s.content.author)}
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <E s={s} el="author" kind="text" className="text-[14.5px] font-semibold" />
                <E s={s} el="role" kind="text" className="text-[13px]" style={{ color: 'var(--muted)' }} />
              </span>
            </figcaption>
          </figure>
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Katmanlı 3B ---------- */
function HeroLayered({ s }: P) {
  const plate = (o: number) => ({ background: 'color-mix(in srgb, var(--fg) 6%, var(--bg))', boxShadow: `inset 0 0 0 1px var(--line), 0 40px 70px -30px rgba(0,0,0,${o})` })
  const bar = (w: string, o = 16) => <span className="block h-2 rounded-full" style={{ width: w, background: tint('var(--fg)', o) }} />
  return (
    <Shell s={s} className="overflow-x-clip">
      <W className="grid items-center gap-16 @4xl:grid-cols-[.9fr_1.1fr] @4xl:gap-10">
        <div>
          <Eyebrow s={s} look="label" />
          <HeroTitle s={s} size={s.style.titleSize * 0.76} className="mt-5" />
          <Body s={s} className="mt-6 max-w-[34rem]" />
          <Actions s={s} className="mt-9" />
          <Highlights s={s} look="chips" className="mt-10" />
        </div>
        <div className="relative mx-auto w-full max-w-[600px] px-4 py-10 @4xl:px-0" style={{ perspective: '1800px' }}>
          <div aria-hidden className="absolute inset-[10%] rounded-full blur-3xl" style={{ background: tint('var(--accent)', 35) }} />
          <div className="relative [transform:rotateX(8deg)_rotateY(-12deg)_rotateZ(2deg)] [transform-style:preserve-3d] @4xl:[transform:rotateX(14deg)_rotateY(-24deg)_rotateZ(4deg)]">
            <div aria-hidden className="absolute inset-0 rounded-[var(--r-card)]" style={{ transform: 'translate3d(64px,-56px,-160px)', background: tint('var(--accent)', 22), boxShadow: `inset 0 0 0 1px ${tint('var(--accent)', 45)}` }} />
            <div aria-hidden className="absolute inset-0 space-y-3 rounded-[var(--r-card)] p-6" style={{ transform: 'translate3d(32px,-28px,-80px)', ...plate(0.45) }}>
              {bar('38%', 30)}
              {bar('62%')}
              {bar('54%')}
            </div>
            <EImage s={s} className="aspect-[4/3] w-full shadow-[0_60px_90px_-30px_rgba(0,0,0,.65)]" />
            <div aria-hidden className="absolute -bottom-8 -left-4 w-[46%] rounded-[min(var(--r-card),16px)] p-4 @3xl:-left-10" style={{ transform: 'translateZ(70px)', ...plate(0.55) }}>
              <div className="flex items-center gap-2.5">
                <span className="size-7 rounded-full" style={{ background: 'var(--btn-bg)' }} />
                {bar('50%', 30)}
              </div>
              <div className="mt-4 flex h-14 items-end gap-1.5">
                {[40, 62, 48, 78, 58, 92, 70].map((h, n) => (
                  <span key={n} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: n === 5 ? 'var(--accent)' : tint('var(--fg)', 18) }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Sade metin ---------- */
function HeroMinimal({ s }: P) {
  const center = s.style.align === 'center'
  return (
    <Shell s={s}>
      <W>
        <div className={cn('max-w-[40rem]', center && 'mx-auto text-center')}>
          <div className={cn('flex items-center gap-3', center && 'justify-center')}>
            <span aria-hidden className="h-px w-8" style={{ background: 'var(--fg)', opacity: 0.35 }} />
            <Eyebrow s={s} look="muted" />
          </div>
          <HeroTitle s={s} size={s.style.titleSize * 0.52} min={34} className="mt-10" />
          <Body s={s} className={cn('mt-6 max-w-[34rem] text-[16px]', center && 'mx-auto')} />
          <div className={cn('mt-10 flex flex-wrap items-center gap-x-7 gap-y-4', center && 'justify-center')}>
            <Actions s={s} size="md" className="contents" second="ghost" />
          </div>
          <Highlights s={s} look="slash" center={center} className="mt-20" style={{ fontSize: 13.5 }} />
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Bento ---------- */
const CELL = { background: 'var(--card)', boxShadow: 'inset 0 0 0 1px var(--line)' }

function HeroBento({ s }: P) {
  return (
    <Shell s={s}>
      <W>
        <div className="grid gap-3 @3xl:grid-cols-6 @3xl:gap-4">
          <div className="flex flex-col justify-between gap-10 rounded-[var(--r-card)] p-7 @3xl:col-span-6 @3xl:p-10 @5xl:col-span-4 @5xl:row-span-2 @5xl:p-12" style={CELL}>
            <Eyebrow s={s} className="self-start" />
            <div>
              <HeroTitle s={s} size={s.style.titleSize * 0.72} min={38} />
              <Body s={s} className="mt-5 max-w-[34rem]" />
              <Actions s={s} className="mt-8" />
            </div>
          </div>
          <div className="relative min-h-[260px] @3xl:col-span-3 @5xl:col-span-2">
            <div className="absolute inset-0">
              <EImage s={s} className="size-full" />
            </div>
          </div>
          <StatCell s={s} n={1} filled className="@3xl:col-span-3 @5xl:col-span-2" />
          <StatCell s={s} n={2} className="@3xl:col-span-2" />
          <StatCell s={s} n={3} className="@3xl:col-span-2" />
          <div className="flex items-center rounded-[var(--r-card)] p-7 @3xl:col-span-2" style={CELL}>
            <Highlights s={s} look="list" className="w-full" />
          </div>
        </div>
      </W>
    </Shell>
  )
}

/* ---------- Registry ---------- */
const TERM = ['visual', 'floatCards', 'termTitle', 'terminal', 'card1Label', 'card1Value', 'card2Label', 'card2Value', 'card2Sub', 'html']
const NO_IMAGE = [...TERM, 'image']
const NO_DECOR = { decor: 'none' } as const

export const HERO: KindVariants = {
  kind: 'hero',
  fields: [
    { key: 'videoLabel', label: 'Video etiketi', el: 'text', def: 'Tanıtımı izleyin · 2 dk', group: 'Video' },
    { key: 'placeholder', label: 'E-posta alanı yazısı', el: 'text', def: 'E-posta adresiniz', group: 'Form' },
    { key: 'formNote', label: 'Form notu', el: 'text', def: 'Spam yok. Yalnızca sürüm notları, ayda bir.', group: 'Form' },
    { key: 'stat1', label: '1. rakam', el: 'heading', def: '18 MB', group: 'Rakamlar' },
    { key: 'stat1Label', label: '1. rakam · açıklama', el: 'text', def: 'tek binary, bağımlılık yok', group: 'Rakamlar' },
    { key: 'stat2', label: '2. rakam', el: 'heading', def: '4×', group: 'Rakamlar' },
    { key: 'stat2Label', label: '2. rakam · açıklama', el: 'text', def: 'daha hızlı sayfa yanıtı', group: 'Rakamlar' },
    { key: 'stat3', label: '3. rakam', el: 'heading', def: '%94', group: 'Rakamlar' },
    { key: 'stat3Label', label: '3. rakam · açıklama', el: 'text', def: 'önbellek isabet oranı', group: 'Rakamlar' },
    { key: 'logosLabel', label: 'Logo başlığı', el: 'text', def: 'Bize güvenenler', group: 'Logolar' },
    { key: 'logos', label: 'Logolar', el: 'text', def: 'Northwind, Acme, Globex, Umbrella, Stark, Wayne', group: 'Logolar', hint: 'Marka adlarını virgülle ayırın.' },
    { key: 'image2', label: '2. fotoğraf', el: 'image', def: IMAGES[1].url, group: 'Kolaj' },
    { key: 'image3', label: '3. fotoğraf', el: 'image', def: IMAGES[3].url, group: 'Kolaj' },
    { key: 'issue', label: 'Sayı / tarih satırı', el: 'text', def: 'Sayı 01 · Kasım 2026' },
    { key: 'quote', label: 'Yorum', el: 'text', def: "Üç sunucuyu tek binary'ye indirdik. Panel aynı kaldı, sunucu faturamız üçte birine düştü.", multiline: true, group: 'Yorum' },
    { key: 'author', label: 'Yorum sahibi', el: 'text', def: 'Elif Yıldız', group: 'Yorum' },
    { key: 'role', label: 'Ünvan', el: 'text', def: 'CTO · Northwind', group: 'Yorum' },
    { key: 'ratingNote', label: 'Puan notu', el: 'text', def: '4,9 / 5 · 1.200+ geliştirici', group: 'Yorum' },
    { key: 'store1', label: '1. mağaza adı', el: 'text', def: 'App Store', group: 'Mağazalar' },
    { key: 'store2', label: '2. mağaza adı', el: 'text', def: 'Google Play', group: 'Mağazalar' },
  ],
  variants: [
    { id: 'default', name: 'Klasik terminal', tags: ['SaaS', 'Modern'], blurb: 'Solda büyük başlık, sağda terminal, fotoğraf ya da HTML.' },
    { id: 'split-right', name: 'Sağda görsel', tags: ['Modern', 'SaaS'], blurb: 'Solda başlık ve butonlar, sağda çerçeveli dikey fotoğraf.', C: HeroSplitRight, extras: ['image'], hide: TERM, bg: NO_DECOR },
    { id: 'split-left', name: 'Solda görsel', tags: ['Modern', 'Ajans'], blurb: 'Solda kemer biçimli fotoğraf, sağda başlık ve ikonlu öne çıkanlar.', C: HeroSplitLeft, extras: ['image'], hide: TERM, bg: NO_DECOR },
    { id: 'big-type', name: 'Dev tipografi', tags: ['Minimal', 'Cesur'], blurb: 'Ekranı dolduran dev başlık, altında sade açıklama ve butonlar.', C: HeroBigType, hide: NO_IMAGE, style: { palette: 'light', align: 'center' }, bg: NO_DECOR },
    { id: 'bg-image', name: 'Arka plan görseli', tags: ['Cesur', 'Koyu'], blurb: 'Tam genişlik fotoğraf üzerinde koyu geçişli metin.', C: HeroBgImage, extras: ['image'], hide: TERM, style: { palette: 'dark' }, bg: NO_DECOR },
    { id: 'video', name: 'Video', tags: ['Koyu', 'Cesur'], blurb: 'Fotoğraf arka planında ortada oynat butonu ve video etiketi.', C: HeroVideo, extras: ['image', 'videoLabel'], hide: TERM, style: { palette: 'dark', align: 'center' }, bg: NO_DECOR },
    { id: 'mesh', name: 'Degrade ağ', tags: ['Gradient', 'Modern'], blurb: 'Marka renginden bulanık renk lekeleri üzerinde ortalı başlık.', C: HeroMesh, hide: NO_IMAGE, style: { palette: 'light', align: 'center' }, bg: NO_DECOR },
    { id: 'product', name: 'Ürün ekranı', tags: ['SaaS', 'Modern'], blurb: 'Ortalı metnin altında tarayıcı penceresinde büyük ürün ekranı.', C: HeroProduct, extras: ['image'], hide: TERM, style: { align: 'center' }, bg: NO_DECOR },
    { id: 'email', name: 'E-posta toplama', tags: ['SaaS', 'Minimal'], blurb: 'Başlığın altında e-posta alanı ve buton, yanında posta kartları.', C: HeroEmail, extras: ['placeholder', 'formNote'], hide: [...NO_IMAGE, 'secondary'], bg: NO_DECOR },
    { id: 'stats', name: 'İstatistikli', tags: ['Kurumsal', 'SaaS'], blurb: 'İki sütunlu başlık alanı ve altında üç büyük rakam.', C: HeroStats, extras: ['stat1', 'stat1Label', 'stat2', 'stat2Label', 'stat3', 'stat3Label'], hide: NO_IMAGE, bg: NO_DECOR },
    { id: 'logos', name: 'Logolu', tags: ['Kurumsal', 'SaaS'], blurb: 'Ortalı başlık, altında “Bize güvenenler” logo şeridi.', C: HeroLogos, extras: ['logosLabel', 'logos'], hide: NO_IMAGE, style: { align: 'center' }, bg: NO_DECOR },
    { id: 'collage', name: 'Kolaj', tags: ['Ajans', 'Portfolyo'], blurb: 'Üst üste binen, hafif döndürülmüş üç fotoğraf kartı.', C: HeroCollage, extras: ['image', 'image2', 'image3'], hide: TERM, bg: NO_DECOR },
    { id: 'editorial', name: 'Editoryal', tags: ['Editoryal', 'Minimal'], blurb: 'Dergi düzeni: sayı satırı, dev serif başlık, ince çizgili üç sütun.', C: HeroEditorial, extras: ['image', 'issue'], hide: TERM, style: { palette: 'sand' }, bg: NO_DECOR },
    { id: 'neon', name: 'Neon', tags: ['Koyu', 'Gradient'], blurb: 'Koyu ızgara zemin, parlayan degrade vurgu satırı.', C: HeroNeon, hide: NO_IMAGE, style: { palette: 'dark', align: 'center' }, bg: NO_DECOR },
    { id: 'app', name: 'Uygulama indir', tags: ['Modern', 'E-ticaret'], blurb: 'App Store / Google Play rozetleri ve telefon çerçevesinde ekran.', C: HeroApp, extras: ['image', 'store1', 'store2', 'ratingNote'], hide: TERM, bg: NO_DECOR },
    { id: 'testimonial', name: 'Yorumlu', tags: ['Kurumsal', 'Modern'], blurb: 'Fotoğrafın üzerine binen yıldızlı müşteri yorumu kartı.', C: HeroTestimonial, extras: ['image', 'quote', 'author', 'role', 'ratingNote'], hide: TERM, bg: NO_DECOR },
    { id: 'layered', name: 'Katmanlı 3B', tags: ['Modern', 'SaaS'], blurb: 'Perspektifle eğilmiş, gölgeli katmanlardan oluşan görsel yığını.', C: HeroLayered, extras: ['image'], hide: TERM, bg: NO_DECOR },
    { id: 'minimal', name: 'Sade metin', tags: ['Minimal'], blurb: 'Küçük başlık, bol boşluk, yalnızca metin ve bağlantılar.', C: HeroMinimal, hide: NO_IMAGE, style: { palette: 'light', align: 'left' }, box: { padding: { t: 168, r: 0, b: 168, l: 0 } }, bg: NO_DECOR },
    { id: 'bento', name: 'Bento', tags: ['Modern', 'SaaS'], blurb: 'Başlık, fotoğraf, rakam ve öne çıkan kutularından oluşan ızgara.', C: HeroBento, extras: ['image', 'stat1', 'stat1Label', 'stat2', 'stat2Label', 'stat3', 'stat3Label'], hide: TERM, style: { palette: 'soft' }, bg: NO_DECOR },
  ],
}
