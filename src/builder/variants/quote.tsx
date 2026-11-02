import type { CSSProperties } from 'react'
import { BadgeCheck, Heart, MessageCircle, Play, Repeat2, Star } from 'lucide-react'
import { IMAGES } from '../data'
import type { Section } from '../types'
import { E, EIcon, EImage, SocialIcon, W, cn, initials, secPad, useType } from './kit'
import type { KindVariants } from './types'

const plain = (v?: string) => (v ?? '').replace(/<[^>]+>/g, '')

function Avatar({ s, size = 44, invert, ring, className }: { s: Section; size?: number; invert?: boolean; ring?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold tracking-[.02em]', className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        background: invert ? 'var(--btn-fg)' : 'var(--btn-bg)',
        color: invert ? 'var(--btn-bg)' : 'var(--btn-fg)',
        boxShadow: ring ? '0 0 0 4px var(--bg), 0 0 0 5px color-mix(in srgb, var(--accent) 45%, var(--line))' : undefined,
      }}
    >
      {initials(plain(s.content.author))}
    </span>
  )
}

/** Author + role (optionally with the initials avatar) as the figure caption. */
function Who({ s, center, avatar = true, size = 44, invert, className }: { s: Section; center?: boolean; avatar?: boolean; size?: number; invert?: boolean; className?: string }) {
  return (
    <figcaption className={cn('flex items-center gap-3.5', center && 'justify-center', className)}>
      {avatar && <Avatar s={s} size={size} invert={invert} />}
      <span className="text-left">
        <E s={s} el="author" kind="text" className="block text-[15.5px] font-semibold" />
        <E s={s} el="role" kind="text" className="block text-[13.5px]" style={{ color: 'var(--muted)' }} />
      </span>
    </figcaption>
  )
}

function Quote({ s, style, className }: { s: Section; style: CSSProperties; className?: string }) {
  return <E s={s} el="quote" kind="heading" as="blockquote" hint="blockquote" multiline className={cn('block', className)} style={style} />
}

const Stars = ({ size = 18, className }: { size?: number; className?: string }) => (
  <div aria-hidden className={cn('flex gap-1', className)} style={{ color: 'var(--accent)' }}>
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
    ))}
  </div>
)

/* ---------- Designs ---------- */
function QuoteCentered({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[1080px]">
        <figure className="flex flex-col items-center text-center">
          <span className="grid size-20 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent)' }}>
            <EIcon s={s} el="icon" stroke={2} />
          </span>
          <Quote s={s} className="mt-10 text-balance" style={{ ...title(s.style.titleSize * 1.35, 28), lineHeight: 1.12 }} />
          <figcaption className="mt-12 flex flex-col items-center">
            <Avatar s={s} size={56} ring />
            <E s={s} el="author" kind="text" className="mt-5 block text-[16px] font-semibold" />
            <E s={s} el="role" kind="text" className="mt-1 block text-[14px]" style={{ color: 'var(--muted)' }} />
          </figcaption>
        </figure>
      </W>
    </div>
  )
}

function QuoteSplit({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="grid items-center gap-12 @3xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] @3xl:gap-16 @5xl:gap-24">
        <div className="relative mx-auto w-full max-w-[440px] @3xl:max-w-none">
          <div aria-hidden className="absolute -inset-3 -rotate-3 rounded-[var(--r-card)]" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)' }} />
          <EImage s={s} el="image" className="relative aspect-[4/5] w-full" />
        </div>
        <figure>
          <EIcon s={s} el="icon" stroke={2} />
          <Quote s={s} className="mt-7 text-pretty" style={title(s.style.titleSize, 26)} />
          <Who s={s} avatar={false} className="mt-10 border-t pt-7" />
        </figure>
      </W>
    </div>
  )
}

function QuoteStars({ s }: { s: Section }) {
  const { title } = useType(s)
  const center = s.style.align === 'center'
  return (
    <div style={secPad(s)}>
      <W className="max-w-[860px]">
        <figure className={cn('relative mt-7 rounded-[var(--r-card)] border px-7 pb-9 pt-14 @3xl:px-14 @3xl:pb-12 @3xl:pt-16', center && 'text-center')} style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '0 30px 70px -40px rgba(0,0,0,.35)' }}>
          <span className={cn('absolute -top-8 grid size-16 place-items-center rounded-full border', center ? 'left-1/2 -translate-x-1/2' : 'left-7 @3xl:left-14')} style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}>
            <EIcon s={s} el="icon" stroke={2} />
          </span>
          <Stars className={cn(center && 'justify-center')} />
          <Quote s={s} className="mt-6 text-balance" style={title(s.style.titleSize * 0.8, 22)} />
          <Who s={s} center={center} className="mt-9 border-t pt-7" />
        </figure>
      </W>
    </div>
  )
}

function QuoteSpotlight({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div className="relative overflow-hidden" style={secPad(s)}>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[1000px] max-w-[160%] -translate-x-1/2 -translate-y-[40%]" style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 38%, transparent), transparent)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 70%, transparent), transparent)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(color-mix(in srgb, var(--fg) 14%, transparent) 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'radial-gradient(ellipse 60% 55% at 50% 40%, #000, transparent)' }} />
      <W className="relative max-w-[980px]">
        <figure className="flex flex-col items-center text-center">
          <EIcon s={s} el="icon" stroke={2} />
          <Quote s={s} className="mt-8 text-balance" style={{ ...title(s.style.titleSize * 1.15, 26), lineHeight: 1.15 }} />
          <figcaption className="mt-12 inline-flex items-center gap-3.5 rounded-full border py-2 pl-2 pr-6" style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb, var(--fg) 4%, transparent)' }}>
            <span className="rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg, var(--accent), transparent 80%)' }}>
              <Avatar s={s} size={42} />
            </span>
            <span className="text-left">
              <E s={s} el="author" kind="text" className="block text-[15px] font-semibold" />
              <E s={s} el="role" kind="text" className="block text-[13px]" style={{ color: 'var(--muted)' }} />
            </span>
          </figcaption>
        </figure>
      </W>
    </div>
  )
}

function QuotePull({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[1080px]">
        <figure className="grid gap-8 @4xl:grid-cols-[200px_minmax(0,1fr)] @4xl:gap-14">
          <figcaption className="order-last flex items-center gap-4 @4xl:order-first @4xl:flex-col @4xl:items-start @4xl:border-t-2 @4xl:pt-6" style={{ borderColor: 'var(--fg)' }}>
            <Avatar s={s} size={48} />
            <span>
              <E s={s} el="author" kind="text" className="block text-[15px] font-semibold" />
              <E s={s} el="role" kind="text" className="mt-0.5 block text-[13.5px] leading-snug" style={{ color: 'var(--muted)' }} />
            </span>
          </figcaption>
          <div className="relative border-y-2 py-10 @3xl:py-14" style={{ borderColor: 'var(--fg)' }}>
            <span className="absolute -top-[2px] left-0 -translate-y-1/2 px-0 pr-4" style={{ background: 'var(--bg)' }}>
              <EIcon s={s} el="icon" stroke={2} />
            </span>
            <Quote s={s} className="text-pretty" style={{ ...title(s.style.titleSize * 1.1, 26), lineHeight: 1.18 }} />
          </div>
        </figure>
      </W>
    </div>
  )
}

function QuoteSocial({ s }: { s: Section }) {
  return (
    <div style={secPad(s)}>
      <W className="max-w-[640px]">
        <div className="relative">
          <div aria-hidden className="absolute inset-x-8 -bottom-6 top-6 rotate-[3deg] rounded-[var(--r-card)] border" style={{ background: 'var(--card)', borderColor: 'var(--line)', opacity: 0.5 }} />
          <div aria-hidden className="absolute inset-x-4 -bottom-3 top-3 -rotate-[2deg] rounded-[var(--r-card)] border" style={{ background: 'var(--card)', borderColor: 'var(--line)', opacity: 0.8 }} />
          <figure className="relative rounded-[var(--r-card)] border p-6 text-left @2xl:p-8" style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '0 24px 60px -36px rgba(0,0,0,.4)' }}>
            <figcaption className="flex items-start gap-3">
              <Avatar s={s} size={46} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <E s={s} el="author" kind="text" className="block truncate text-[15.5px] font-bold" />
                  <BadgeCheck size={17} aria-hidden className="shrink-0" style={{ color: 'var(--accent)' }} />
                </span>
                <E s={s} el="handle" kind="text" className="block text-[14px]" style={{ color: 'var(--muted)' }} />
              </span>
              <span style={{ color: 'var(--fg)' }}>
                <SocialIcon name="x" size={20} />
              </span>
            </figcaption>
            <Quote s={s} className="mt-5 text-pretty" style={{ fontSize: 'clamp(18px, 2.1cqi, 21px)', lineHeight: 1.5, fontWeight: 450 }} />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-[13px]" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
              <E s={s} el="role" kind="text" className="block" />
              <span aria-hidden className="flex items-center gap-5">
                <span className="flex items-center gap-1.5">
                  <MessageCircle size={16} />
                  24
                </span>
                <span className="flex items-center gap-1.5">
                  <Repeat2 size={16} />
                  118
                </span>
                <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                  <Heart size={16} fill="currentColor" />
                  1,2B
                </span>
              </span>
            </div>
          </figure>
        </div>
      </W>
    </div>
  )
}

function QuoteVideo({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[1120px]">
        <figure className="relative overflow-hidden rounded-[var(--r-card)]" style={{ boxShadow: '0 40px 80px -40px rgba(0,0,0,.5)' }}>
          <EImage s={s} el="image" className="aspect-[4/5] w-full @2xl:aspect-[16/10] @4xl:aspect-[16/8]" />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,9,12,.88), rgba(8,9,12,.35) 55%, rgba(8,9,12,.05))' }} />
          <button
            type="button"
            aria-label="Videoyu oynat"
            onClick={(e) => e.stopPropagation()}
            className="group absolute left-6 top-6 grid size-16 place-items-center rounded-full bg-white/90 text-[#111] shadow-[0_10px_40px_rgba(0,0,0,.35)] backdrop-blur transition-transform hover:scale-105 @2xl:left-1/2 @2xl:top-[38%] @2xl:size-20 @2xl:-translate-x-1/2 @2xl:-translate-y-1/2"
          >
            <span aria-hidden className="absolute inset-0 rounded-full ring-8 ring-white/20" />
            <Play size={26} fill="currentColor" strokeWidth={0} className="ml-1" />
          </button>
          <span aria-hidden className="absolute right-6 top-6 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[12px] font-medium text-white backdrop-blur">
            2:14
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 text-white @3xl:p-12 [&_.ed]:pointer-events-auto">
            <Quote s={s} className="max-w-[820px] text-pretty" style={{ ...title(s.style.titleSize * 0.85, 21), color: s.style.titleColor || '#fff' }} />
            <figcaption className="mt-7 flex items-center gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[14px] font-semibold text-[#111]" aria-hidden>
                {initials(plain(s.content.author))}
              </span>
              <span>
                <E s={s} el="author" kind="text" className="block text-[15.5px] font-semibold" />
                <E s={s} el="role" kind="text" className="block text-[13.5px] text-white/75" />
              </span>
            </figcaption>
          </div>
        </figure>
      </W>
    </div>
  )
}

function QuoteLogo({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[940px]">
        <figure className="text-center">
          <div className="flex items-center gap-5">
            <span aria-hidden className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, var(--line))' }} />
            <span className="flex items-center gap-2.5">
              <span aria-hidden className="size-6 rotate-45 rounded-[5px]" style={{ background: 'var(--fg)' }} />
              <E s={s} el="company" kind="text" className="block whitespace-nowrap text-[22px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--f-head)' }} />
            </span>
            <span aria-hidden className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--line), transparent)' }} />
          </div>
          <Quote s={s} className="mt-12 text-balance" style={title(s.style.titleSize, 26)} />
          <Who s={s} center className="mt-10" />
        </figure>
      </W>
    </div>
  )
}

function QuoteGiant({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W>
        <figure className="grid gap-4 @4xl:grid-cols-[220px_minmax(0,1fr)] @4xl:gap-12">
          <div className="relative h-24 @4xl:h-auto">
            <div className="origin-top-left scale-[2.4] @4xl:scale-[4.4]">
              <EIcon s={s} el="icon" stroke={1.6} />
            </div>
          </div>
          <div>
            <Quote s={s} className="text-pretty" style={{ ...title(s.style.titleSize * 1.2, 28), lineHeight: 1.12 }} />
            <figcaption className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span aria-hidden className="h-[3px] w-10 rounded-full" style={{ background: 'var(--accent)' }} />
              <E s={s} el="author" kind="text" className="block text-[16px] font-semibold" />
              <E s={s} el="role" kind="text" className="block text-[15px]" style={{ color: 'var(--muted)' }} />
            </figcaption>
          </div>
        </figure>
      </W>
    </div>
  )
}

function QuoteGradient({ s }: { s: Section }) {
  const { title } = useType(s)
  const center = s.style.align === 'center'
  const vars = {
    background: 'linear-gradient(135deg, var(--btn-bg) 10%, color-mix(in srgb, var(--btn-bg) 72%, var(--btn-fg)))',
    color: 'var(--btn-fg)',
    '--accent': 'var(--btn-fg)',
    '--muted': 'color-mix(in srgb, var(--btn-fg) 74%, transparent)',
    '--line': 'color-mix(in srgb, var(--btn-fg) 22%, transparent)',
  } as CSSProperties
  return (
    <div style={secPad(s)}>
      <W className="max-w-[1100px]">
        <figure className={cn('relative overflow-hidden rounded-[var(--r-card)] px-7 py-12 @3xl:px-16 @3xl:py-20', center && 'text-center')} style={{ ...vars, boxShadow: '0 40px 80px -45px color-mix(in srgb, var(--btn-bg) 80%, #000)' }}>
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[380px] rounded-full blur-3xl" style={{ background: 'color-mix(in srgb, var(--btn-fg) 22%, transparent)' }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-[420px] rounded-full border" style={{ borderColor: 'var(--line)' }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-12 size-[300px] rounded-full border" style={{ borderColor: 'var(--line)' }} />
          <div className="relative">
            <EIcon s={s} el="icon" stroke={2} className={cn(center && 'mx-auto')} />
            <Quote s={s} className="mt-7 text-balance" style={{ ...title(s.style.titleSize, 26), color: s.style.titleColor || 'var(--btn-fg)' }} />
            <Who s={s} center={center} invert className="mt-10" />
          </div>
        </figure>
      </W>
    </div>
  )
}

function QuoteMinimal({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[880px]">
        <figure className="border-l-2 pl-6 @3xl:pl-10" style={{ borderColor: 'var(--accent)' }}>
          <Quote s={s} className="text-pretty" style={{ ...title(s.style.titleSize * 0.8, 22), lineHeight: 1.3 }} />
          <figcaption className="mt-7 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[15px]">
            <span aria-hidden style={{ color: 'var(--accent)' }}>
              —
            </span>
            <E s={s} el="author" kind="text" className="block font-semibold" />
            <span aria-hidden style={{ color: 'var(--muted)' }}>
              ·
            </span>
            <E s={s} el="role" kind="text" className="block" style={{ color: 'var(--muted)' }} />
          </figcaption>
        </figure>
      </W>
    </div>
  )
}

function QuoteStats({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W>
        <div className="grid overflow-hidden rounded-[var(--r-card)] border @4xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
          <div className="relative flex flex-col justify-between gap-12 overflow-hidden p-8 @3xl:p-12" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--card))' }}>
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full" style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 30%, transparent), transparent)' }} />
            <E s={s} el="company" kind="text" className="relative block text-[20px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--f-head)' }} />
            <div className="relative">
              <E s={s} el="metric" kind="heading" as="p" hint="p" className="block leading-none" style={{ ...title(s.style.titleSize * 2.6, 64), lineHeight: 0.95, color: s.style.titleColor || 'var(--accent)' }} />
              <E s={s} el="metricLabel" kind="text" as="p" hint="p" className="mt-4 block max-w-[260px] text-[16px] leading-snug" style={{ color: 'var(--muted)' }} />
            </div>
          </div>
          <figure className="flex flex-col justify-between gap-10 p-8 text-left @3xl:p-12">
            <div>
              <EIcon s={s} el="icon" stroke={2} />
              <Quote s={s} className="mt-6 text-pretty" style={title(s.style.titleSize * 0.78, 22)} />
            </div>
            <Who s={s} className="border-t pt-7" />
          </figure>
        </div>
      </W>
    </div>
  )
}

function QuotePortrait({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[900px]">
        <figure className="flex flex-col items-center text-center">
          <div className="relative">
            <span aria-hidden className="absolute -inset-2 rounded-full" style={{ background: 'conic-gradient(from 210deg, var(--accent), transparent 55%, var(--accent))', opacity: 0.55 }} />
            <span aria-hidden className="absolute -inset-1 rounded-full" style={{ background: 'var(--bg)' }} />
            <EImage s={s} el="image" className="relative size-28 !rounded-full [&>div]:!rounded-full" />
            <span className="absolute -bottom-2 -right-3 grid size-12 place-items-center rounded-full border [&_svg]:size-[22px]" style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}>
              <EIcon s={s} el="icon" stroke={2.2} />
            </span>
          </div>
          <Quote s={s} className="mt-10 text-balance" style={title(s.style.titleSize, 26)} />
          <figcaption className="mt-9">
            <E s={s} el="author" kind="text" className="block text-[16px] font-semibold" />
            <E s={s} el="role" kind="text" className="mt-1 block text-[14px]" style={{ color: 'var(--muted)' }} />
          </figcaption>
        </figure>
      </W>
    </div>
  )
}

export const QUOTE: KindVariants = {
  kind: 'quote',
  fields: [
    { key: 'image', label: 'Portre', el: 'image', def: IMAGES[3].url },
    { key: 'company', label: 'Şirket', el: 'text', def: 'Kuzey Medya' },
    { key: 'handle', label: 'Kullanıcı adı', el: 'text', def: '@elifarslan' },
    { key: 'metric', label: 'Rakam', el: 'heading', def: '3×' },
    { key: 'metricLabel', label: 'Rakam açıklaması', el: 'text', def: 'daha düşük sunucu faturası, ilk aydan itibaren' },
  ],
  variants: [
    { id: 'default', name: 'Büyük alıntı', tags: ['Editoryal'], blurb: 'Büyük tırnak, söz ve kişi.' },
    { id: 'centered-xl', name: 'Büyük ortalı', tags: ['Modern', 'Minimal'], blurb: 'Dev puntolu ortalı söz, halkalı tırnak ve altta portre.' },
    { id: 'split-photo', name: 'Fotoğraflı ikili', tags: ['Modern', 'Kurumsal'], blurb: 'Solda dikey portre, sağda söz ve imza.', extras: ['image'] },
    { id: 'stars-card', name: 'Yıldızlı kart', tags: ['SaaS', 'E-ticaret'], blurb: 'Beş yıldızlı, üstte tırnak rozetli yorum kartı.' },
    { id: 'spotlight', name: 'Koyu spot ışığı', tags: ['Koyu', 'Gradient'], blurb: 'Koyu zeminde ışık hüzmesi altında parlayan söz.', style: { palette: 'dark' } },
    { id: 'pull-quote', name: 'Editoryal alıntı', tags: ['Editoryal', 'Minimal'], blurb: 'Kalın çizgiler arasında dergi tarzı alıntı, solda imza.' },
    { id: 'social-post', name: 'Sosyal gönderi', tags: ['Modern', 'SaaS'], blurb: 'Doğrulanmış hesap görünümlü gönderi kartı.', extras: ['handle'] },
    { id: 'video', name: 'Video yorum', tags: ['Modern', 'Cesur'], blurb: 'Oynat butonlu görsel üzerinde söz ve kişi.', extras: ['image'] },
    { id: 'logo-quote', name: 'Logolu alıntı', tags: ['Kurumsal'], blurb: 'Üstte şirket logosu, altında söz ve imza.', extras: ['company'] },
    { id: 'giant-mark', name: 'Dev tırnak', tags: ['Cesur', 'Editoryal'], blurb: 'Solda dev tırnak işareti, sağda büyük söz.' },
    { id: 'gradient-card', name: 'Gradyan kart', tags: ['Gradient', 'Modern'], blurb: 'Marka renginde gradyan kart içinde söz.' },
    { id: 'minimal-line', name: 'Sade çizgi', tags: ['Minimal'], blurb: 'Vurgu çizgili sade alıntı ve tek satır imza.' },
    { id: 'stats', name: 'Rakamlı yorum', tags: ['SaaS', 'Kurumsal'], blurb: 'Büyük sonuç rakamı ve şirket yanında müşteri sözü.', extras: ['metric', 'metricLabel', 'company'] },
    { id: 'portrait', name: 'Portre üstte', tags: ['Minimal', 'Portfolyo'], blurb: 'Yuvarlak portre, tırnak rozeti ve ortalı söz.', extras: ['image'] },
  ],
}
