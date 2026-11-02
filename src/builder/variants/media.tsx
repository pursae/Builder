import type { CSSProperties } from 'react'
import { ArrowRight, Check, Lock, Play } from 'lucide-react'
import { IMAGES } from '../data'
import { useB } from '../store'
import type { Section } from '../types'
import { Btn, E, EImage, Slot, W, cn, secPad, useType } from './kit'
import type { KindVariants } from './types'

/* ---------- Shared bits ---------- */
const SOLID = 'linear-gradient(var(--card), var(--card)), var(--bg)'
const LIFT = '0 40px 80px -36px rgba(0,0,0,.38)'
const isLeft = (s: Section) => s.content.imageSide === 'left'
const lines = (v?: string) =>
  (v ?? '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
/** Inline padding that lines a half-width column up with the 1160px container edge. */
const EDGE = { '--edge': 'max(1.5rem, calc((100cqi - 1160px) / 2 + 2.5rem))' } as CSSProperties

function Eyebrow({ s, className, style }: { s: Section; className?: string; style?: CSSProperties }) {
  return <E s={s} el="eyebrow" kind="badge" className={cn('inline-block text-[12.5px] font-semibold uppercase tracking-[.14em]', className)} style={{ color: 'var(--accent)', ...style }} />
}

function Title({ s, size = 1, min = 30, className, style }: { s: Section; size?: number; min?: number; className?: string; style?: CSSProperties }) {
  const { title } = useType(s)
  return <E s={s} el="title" kind="heading" as="h2" hint="h2" className={cn('block text-balance', className)} style={{ ...title(s.style.titleSize * size, min), ...style }} />
}

function Body({ s, className, style }: { s: Section; className?: string; style?: CSSProperties }) {
  const { body } = useType(s)
  return <E s={s} el="body" kind="text" as="p" hint="p" multiline className={cn('block text-[17px] leading-[1.65]', className)} style={{ ...body, ...style }} />
}

function ArrowLink({ s, className, style }: { s: Section; className?: string; style?: CSSProperties }) {
  const { preview } = useB()
  if (s.content.primary === undefined || (preview && !s.content.primary)) return null
  return (
    <div className={cn('group inline-flex items-center gap-2 text-[15px] font-semibold', className)} style={{ color: 'var(--accent)', ...style }}>
      <E s={s} el="primary" kind="link" as="a" hint="a" />
      <ArrowRight size={17} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
    </div>
  )
}

/* ---------- Designs ---------- */
function MediaOverlap({ s }: { s: Section }) {
  const left = isLeft(s)
  return (
    <div style={secPad(s)}>
      <W className="grid items-center @4xl:grid-cols-12">
        <EImage s={s} className={cn('aspect-[4/3] w-full @4xl:row-start-1 @4xl:aspect-[16/11]', left ? '@4xl:col-start-1 @4xl:col-end-9' : '@4xl:col-start-5 @4xl:col-end-13')} />
        <div
          className={cn('relative z-10 mx-3 -mt-16 p-7 @md:mx-6 @md:p-10 @4xl:row-start-1 @4xl:mx-0 @4xl:mt-0 @5xl:p-12', left ? '@4xl:col-start-7 @4xl:col-end-13' : '@4xl:col-start-1 @4xl:col-end-7')}
          style={{ background: SOLID, borderRadius: 'var(--r-card)', border: '1px solid var(--line)', boxShadow: LIFT }}
        >
          <Eyebrow s={s} />
          <Title s={s} size={0.8} min={26} className="mt-4" />
          <Body s={s} className="mt-5 text-[16px]" />
          <Btn s={s} className="mt-8" />
        </div>
      </W>
    </div>
  )
}

function MediaBleed({ s }: { s: Section }) {
  const left = isLeft(s)
  return (
    <div className="grid @4xl:grid-cols-2" style={EDGE}>
      <div className={cn('relative min-h-[300px] @md:min-h-[420px] @4xl:min-h-[580px]', left ? '@4xl:order-first' : '@4xl:order-last')}>
        <div className="absolute inset-0">
          <EImage s={s} className="size-full [--r-card:0px]" />
        </div>
      </div>
      <div className={cn('flex items-center px-6 @3xl:px-10', left ? '@4xl:pl-16 @4xl:pr-(--edge)' : '@4xl:pl-(--edge) @4xl:pr-16')} style={secPad(s)}>
        <div className="w-full max-w-[540px]">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8" style={{ background: 'var(--accent)' }} />
            <Eyebrow s={s} />
          </div>
          <Title s={s} className="mt-6" />
          <Body s={s} className="mt-6" />
          <div className="mt-10 flex items-center gap-6 border-t pt-8" style={{ borderColor: 'var(--line)' }}>
            <ArrowLink s={s} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MediaStat({ s }: { s: Section }) {
  const left = isLeft(s)
  const { head } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="grid items-center gap-20 @4xl:grid-cols-2 @4xl:gap-24">
        <div className={cn('relative', left ? '@4xl:order-first' : '@4xl:order-last')}>
          <div aria-hidden className={cn('absolute -top-6 size-44', left ? '-left-6' : '-right-6')} style={{ backgroundImage: 'radial-gradient(var(--line) 1.6px, transparent 1.6px)', backgroundSize: '14px 14px' }} />
          <EImage s={s} className="aspect-[4/4.3] w-full" />
          <div
            className={cn('absolute -bottom-10 w-[min(250px,72%)] p-5 @md:p-6', left ? 'right-4 @4xl:-right-10' : 'left-4 @4xl:-left-10')}
            style={{ background: SOLID, borderRadius: 'var(--r-card)', border: '1px solid var(--line)', boxShadow: LIFT }}
          >
            <E s={s} el="stat" kind="heading" className="block" style={{ ...head(44), color: 'var(--accent)' }} />
            <E s={s} el="statLabel" kind="text" className="mt-2 block text-[13.5px] leading-snug" style={{ color: 'var(--muted)' }} />
            <svg aria-hidden viewBox="0 0 120 30" className="mt-4 h-7 w-full" fill="none" preserveAspectRatio="none">
              <path d="M2 27 L20 21 L36 23 L54 14 L72 16 L92 8 L118 3" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        </div>
        <div>
          <Eyebrow s={s} />
          <Title s={s} className="mt-4" />
          <Body s={s} className="mt-5" />
          <ArrowLink s={s} className="mt-8" />
        </div>
      </W>
    </div>
  )
}

function MediaBrowser({ s }: { s: Section }) {
  const left = isLeft(s)
  return (
    <div className="overflow-hidden" style={secPad(s)}>
      <W className={cn('grid items-center gap-14 @4xl:gap-16', left ? '@4xl:grid-cols-[1.15fr_.85fr]' : '@4xl:grid-cols-[.85fr_1.15fr]')}>
        <div>
          <Eyebrow s={s} />
          <Title s={s} size={0.9} className="mt-4" />
          <Body s={s} className="mt-5" />
          <Btn s={s} className="mt-9" />
        </div>
        <div className={cn('relative', left ? '@4xl:order-first @4xl:-ml-[24%]' : '@4xl:-mr-[24%]')}>
          <div aria-hidden className="absolute -inset-10 opacity-70 blur-3xl" style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 30%, transparent), transparent)' }} />
          <div className="relative overflow-hidden" style={{ background: SOLID, borderRadius: 'min(var(--r-card), 16px)', border: '1px solid var(--line)', boxShadow: '0 50px 100px -40px rgba(0,0,0,.45)' }}>
            <div aria-hidden className="flex items-center gap-4 border-b px-4 py-3" style={{ borderColor: 'var(--line)' }}>
              <div className="flex gap-1.5">
                <span className="size-3 rounded-full bg-[#ff5f57]" />
                <span className="size-3 rounded-full bg-[#febc2e]" />
                <span className="size-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="mx-auto flex h-7 w-full max-w-[340px] items-center gap-2 rounded-md px-3" style={{ background: 'color-mix(in srgb, var(--fg) 6%, transparent)', color: 'var(--muted)' }}>
                <Lock size={11} />
                <span className="h-1.5 w-28 rounded-full" style={{ background: 'color-mix(in srgb, var(--fg) 14%, transparent)' }} />
              </div>
              <span className="hidden w-12 @md:block" />
            </div>
            <EImage s={s} className="aspect-[16/10] w-full [--r-card:0px]" />
          </div>
        </div>
      </W>
    </div>
  )
}

function MediaArch({ s }: { s: Section }) {
  const left = isLeft(s)
  return (
    <div style={secPad(s)}>
      <W className="grid items-center gap-14 @4xl:grid-cols-2 @4xl:gap-24">
        <div className={cn('relative mx-auto w-full max-w-[460px]', left ? '@4xl:order-first' : '@4xl:order-last')}>
          <div aria-hidden className={cn('absolute top-[18%] aspect-square w-[64%] rounded-full', left ? '-left-[10%]' : '-right-[10%]')} style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)' }} />
          <EImage s={s} className="aspect-[4/5] w-full [--r-card:999px_999px_28px_28px]" />
          <svg aria-hidden viewBox="0 0 40 40" className={cn('absolute -bottom-6 size-16 @md:size-20', left ? '-right-4' : '-left-4')} style={{ color: 'var(--accent)' }}>
            <path d="M20 0c1.4 10.2 9.8 18.6 20 20-10.2 1.4-18.6 9.8-20 20-1.4-10.2-9.8-18.6-20-20C10.2 18.6 18.6 10.2 20 0z" fill="currentColor" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <Eyebrow s={s} />
            <span aria-hidden className="h-px max-w-24 flex-1" style={{ background: 'var(--line)' }} />
          </div>
          <Title s={s} size={1.05} className="mt-6" />
          <Body s={s} className="mt-6 max-w-[520px]" />
          <Btn s={s} look="fg" className="mt-10" />
        </div>
      </W>
    </div>
  )
}

function MediaStacked({ s }: { s: Section }) {
  return (
    <div style={secPad(s)}>
      <W>
        <div className="relative">
          <EImage s={s} className="aspect-[4/3] w-full @3xl:aspect-[21/9]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" style={{ borderRadius: 'var(--r-card)' }} />
        </div>
        <div aria-hidden className="mx-auto h-14 w-px @3xl:h-20" style={{ background: 'linear-gradient(var(--line), var(--accent))' }} />
        <div className="mx-auto max-w-[780px] text-center">
          <Eyebrow s={s} />
          <Title s={s} className="mt-5" />
          <Body s={s} className="mx-auto mt-6 max-w-[620px]" />
          <div className="mt-9 flex justify-center">
            <ArrowLink s={s} />
          </div>
        </div>
      </W>
    </div>
  )
}

function MediaDarkSplit({ s }: { s: Section }) {
  const left = isLeft(s)
  return (
    <div style={secPad(s)}>
      <W>
        <div className="relative grid overflow-hidden @4xl:grid-cols-2" style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--line)' }}>
          <div className={cn('relative min-h-[280px] @md:min-h-[360px] @4xl:min-h-[540px]', !left && '@4xl:order-last')}>
            <div className="absolute inset-0">
              <EImage s={s} className="size-full [--r-card:0px]" />
            </div>
          </div>
          <div className="relative flex flex-col justify-center overflow-hidden p-8 @md:p-12 @5xl:p-16">
            <div aria-hidden className="absolute -top-1/3 left-1/4 aspect-square w-[90%] rounded-full opacity-60 blur-3xl" style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 40%, transparent), transparent)' }} />
            <div aria-hidden className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at 70% 0%, #000, transparent 65%)' }} />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb, var(--fg) 4%, transparent)' }}>
                <span aria-hidden className="size-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                <Eyebrow s={s} className="text-[11.5px] tracking-[.12em]" />
              </span>
              <Title s={s} size={0.9} className="mt-6" />
              <Body s={s} className="mt-5" />
              <Btn s={s} className="mt-9" />
            </div>
          </div>
        </div>
      </W>
    </div>
  )
}

function MediaCollage({ s }: { s: Section }) {
  const left = isLeft(s)
  return (
    <div style={secPad(s)}>
      <W className="grid items-center gap-14 @4xl:grid-cols-2 @4xl:gap-20">
        <div className={cn('relative pb-[22%]', left ? '@4xl:order-first' : '@4xl:order-last')}>
          <div aria-hidden className={cn('absolute top-[8%] aspect-square w-[34%]', left ? 'right-0' : 'left-0')} style={{ borderRadius: 'var(--r-card)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }} />
          <EImage s={s} className={cn('aspect-[4/3.3] w-[80%]', left ? 'mr-auto' : 'ml-auto')} />
          <div className={cn('absolute bottom-0 w-[52%] p-2', left ? 'right-0' : 'left-0')} style={{ background: 'var(--bg)', borderRadius: 'calc(var(--r-card) + 8px)', boxShadow: LIFT }}>
            <EImage s={s} el="image2" className="aspect-[4/4.4] w-full" />
          </div>
        </div>
        <div>
          <Eyebrow s={s} />
          <Title s={s} className="mt-4" />
          <Body s={s} className="mt-5" />
          <ArrowLink s={s} className="mt-8" />
        </div>
      </W>
    </div>
  )
}

function MediaQuote({ s }: { s: Section }) {
  const left = isLeft(s)
  const { fp } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="grid items-stretch gap-12 @4xl:grid-cols-12 @4xl:gap-16">
        <div className={cn('@4xl:col-span-7', !left && '@4xl:order-last')}>
          <EImage s={s} className="aspect-[4/3] w-full @4xl:aspect-auto @4xl:h-full @4xl:min-h-[560px]" />
        </div>
        <figure className="flex flex-col justify-center @4xl:col-span-5">
          <span aria-hidden className="block h-[0.62em] text-[120px] leading-none @3xl:text-[150px]" style={{ fontFamily: fp.display, color: 'var(--accent)' }}>
            “
          </span>
          <Title s={s} size={0.78} min={26} className="mt-2" />
          <figcaption className="mt-8 flex items-center gap-3">
            <span aria-hidden className="h-px w-10" style={{ background: 'var(--fg)' }} />
            <Eyebrow s={s} className="tracking-[.12em]" style={{ color: 'var(--fg)' }} />
          </figcaption>
          <div className="mt-10 border-t pt-8" style={{ borderColor: 'var(--line)' }}>
            <Body s={s} className="text-[16px]" />
            <ArrowLink s={s} className="mt-6" />
          </div>
        </figure>
      </W>
    </div>
  )
}

function MediaChecklist({ s }: { s: Section }) {
  const left = isLeft(s)
  return (
    <div style={secPad(s)}>
      <W className="grid items-center gap-14 @4xl:grid-cols-2 @4xl:gap-20">
        <div className={cn('relative p-5 @md:p-9', left ? '@4xl:order-first' : '@4xl:order-last')} style={{ borderRadius: 'calc(var(--r-card) + 12px)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)' }}>
          <EImage s={s} className="aspect-[4/4.2] w-full shadow-[0_30px_60px_-30px_rgba(0,0,0,.4)]" />
        </div>
        <div>
          <Eyebrow s={s} />
          <Title s={s} size={0.92} className="mt-4" />
          <Body s={s} className="mt-5" />
          <Slot s={s} el="points" as="ul" className="mt-8 grid gap-3.5">
            {lines(s.content.points).map((p, i) => (
              <li key={`${p}-${i}`} className="flex items-start gap-3 text-[15.5px] font-medium leading-snug">
                <span aria-hidden className="mt-px grid size-[22px] shrink-0 place-items-center rounded-full" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
                  <Check size={13} strokeWidth={3} />
                </span>
                <span>{p}</span>
              </li>
            ))}
          </Slot>
          <Btn s={s} className="mt-10" />
        </div>
      </W>
    </div>
  )
}

function MediaVideo({ s }: { s: Section }) {
  return (
    <div style={secPad(s)}>
      <W>
        <div className="grid gap-6 @4xl:grid-cols-2 @4xl:items-end @4xl:gap-16">
          <div>
            <Eyebrow s={s} />
            <Title s={s} size={0.92} className="mt-4" />
          </div>
          <div>
            <Body s={s} />
            <ArrowLink s={s} className="mt-6" />
          </div>
        </div>
        <EImage s={s} className="mt-12 aspect-[4/3] w-full @3xl:aspect-[16/8]">
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/5" />
          <div className="absolute inset-0 grid place-items-center">
            <button type="button" aria-label="Videoyu oynat" className="group relative grid size-20 place-items-center rounded-full bg-white/95 text-[#121418] shadow-2xl transition-transform duration-300 hover:scale-105 @3xl:size-24">
              <span aria-hidden className="absolute -inset-3 rounded-full bg-white/25 backdrop-blur-sm" />
              <Play size={28} className="relative translate-x-0.5" fill="currentColor" aria-hidden />
            </button>
          </div>
          <div aria-hidden className="absolute inset-x-5 bottom-5 flex items-center gap-3 @3xl:inset-x-8 @3xl:bottom-7">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <span className="block h-full w-[34%] rounded-full bg-white" />
            </span>
          </div>
        </EImage>
      </W>
    </div>
  )
}

function MediaEditorial({ s }: { s: Section }) {
  const left = isLeft(s)
  return (
    <div style={secPad(s)}>
      <W>
        <div className="flex items-center gap-4 border-b pb-5" style={{ borderColor: 'var(--fg)' }}>
          <Eyebrow s={s} style={{ color: 'var(--fg)' }} />
          <span aria-hidden className="h-px flex-1" style={{ background: 'var(--line)' }} />
          <span aria-hidden className="text-[12px] font-semibold tabular-nums tracking-[.14em]" style={{ color: 'var(--muted)' }}>
            01
          </span>
        </div>
        <Title s={s} size={1.25} min={34} className="mt-10 max-w-[20ch]" />
        <div className="mt-12 grid gap-10 @4xl:mt-16 @4xl:grid-cols-12 @4xl:gap-12">
          <figure className={cn('@4xl:col-span-7', !left && '@4xl:order-last')}>
            <EImage s={s} className="aspect-[4/3] w-full" />
            <figcaption className="mt-4 flex items-start gap-3 text-[13px] leading-snug" style={{ color: 'var(--muted)' }}>
              <span aria-hidden className="mt-[0.6em] h-px w-6 shrink-0" style={{ background: 'var(--fg)' }} />
              <E s={s} el="caption" kind="text" />
            </figcaption>
          </figure>
          <div className={cn('flex flex-col justify-between gap-10 border-t pt-8 @4xl:col-span-5 @4xl:border-t-0 @4xl:pt-0', left ? '@4xl:border-l @4xl:pl-10' : '@4xl:border-r @4xl:pr-10')} style={{ borderColor: 'var(--line)' }}>
            <Body s={s} className="first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-[64px] first-letter:leading-[.8] first-letter:text-(color:--fg) first-letter:[font-family:var(--f-head)]" />
            <ArrowLink s={s} />
          </div>
        </div>
      </W>
    </div>
  )
}

export const MEDIA: KindVariants = {
  kind: 'media',
  fields: [
    { key: 'stat', label: 'Rakam', el: 'heading', def: '3×' },
    { key: 'statLabel', label: 'Rakam açıklaması', el: 'text', def: 'daha hızlı sayfa yanıtı, aynı sunucuda' },
    { key: 'image2', label: 'İkinci fotoğraf', el: 'image', def: IMAGES[1].url },
    { key: 'points', label: 'Maddeler', el: 'text', multiline: true, def: 'Sürükle, bırak ve canlı önizle\nHer adımı geri al ya da yinele\nHazır bölüm tasarımlarıyla başla\nMobil görünümü anında kontrol et', hint: 'Her satır bir madde.' },
    { key: 'caption', label: 'Görsel altyazısı', el: 'text', def: 'Golementor Studio · canlı düzenleme ekranı' },
  ],
  variants: [
    { id: 'default', name: 'Görsel yanında yazı', tags: ['Modern'], blurb: 'Fotoğraf bir yanda, hikâye diğer yanda.' },
    { id: 'overlap-card', name: 'Görsel üstünde kart', tags: ['Modern', 'Kurumsal'], blurb: 'Geniş fotoğrafın kenarına binen gölgeli yazı kartı.', C: MediaOverlap },
    { id: 'full-bleed', name: 'Kenardan kenara', tags: ['Editoryal', 'Cesur'], blurb: 'Fotoğraf sayfanın yarısını kenarına kadar doldurur.', C: MediaBleed },
    { id: 'stat-card', name: 'Rakam kartlı', tags: ['SaaS', 'Modern'], blurb: 'Fotoğrafın köşesinde yüzen bir rakam kartı.', C: MediaStat, extras: ['stat', 'statLabel'] },
    { id: 'browser', name: 'Tarayıcı çerçevesi', tags: ['SaaS', 'Modern'], blurb: 'Görsel, kenara taşan bir tarayıcı penceresinde.', C: MediaBrowser },
    { id: 'arch', name: 'Kemer çerçeve', tags: ['Editoryal', 'Minimal'], blurb: 'Kemer biçimli fotoğraf, yumuşak bir daire ve yıldız süsü.', C: MediaArch, style: { palette: 'sand' } },
    { id: 'stacked', name: 'Üstte görsel', tags: ['Minimal'], blurb: 'Geniş fotoğraf üstte, ortalı yazı altında.', C: MediaStacked, hide: ['imageSide'] },
    { id: 'dark-split', name: 'Koyu panel', tags: ['Koyu', 'SaaS'], blurb: 'Yarısı fotoğraf, yarısı ışıltılı yazı olan koyu kart.', C: MediaDarkSplit, style: { palette: 'dark' } },
    { id: 'collage', name: 'İkili kolaj', tags: ['Ajans', 'Portfolyo'], blurb: 'Üst üste binen iki fotoğrafla canlı bir kolaj.', C: MediaCollage, extras: ['image2'] },
    { id: 'quote', name: 'Alıntı ve büyük görsel', tags: ['Editoryal'], blurb: 'Büyük fotoğrafın yanında alıntı gibi dizilmiş başlık.', C: MediaQuote },
    { id: 'checklist', name: 'Kontrol listesi', tags: ['SaaS', 'Kurumsal'], blurb: 'Yazının altında tik işaretli madde listesi.', C: MediaChecklist, extras: ['points'] },
    { id: 'video', name: 'Video önizleme', tags: ['Modern', 'Cesur'], blurb: 'Oynat düğmeli geniş video kapağı.', C: MediaVideo, hide: ['imageSide'] },
    { id: 'editorial', name: 'Dergi sayfası', tags: ['Editoryal', 'Minimal'], blurb: 'Büyük başlık, altyazılı fotoğraf ve süslü ilk harf.', C: MediaEditorial, extras: ['caption'] },
  ],
}
