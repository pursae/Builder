import { useState, type CSSProperties } from 'react'
import { ArrowRight, ArrowUpRight, ChevronRight, Cookie, Megaphone, Sparkles, X } from 'lucide-react'
import { useB } from '../store'
import type { Section } from '../types'
import { Btn, E, W, cn } from './kit'
import type { KindVariants } from './types'

/* ---------- Shared bits ---------- */
function Text({ s, el = 'text', className, style }: { s: Section; el?: string; className?: string; style?: CSSProperties }) {
  return <E s={s} el={el} kind="text" className={className} style={style} />
}

function Link({ s, className, style }: { s: Section; className?: string; style?: CSSProperties }) {
  return <E s={s} el="link" kind="link" as="a" hint="a" className={className} style={style} />
}

/** Link with a trailing arrow (hidden with the link when it's empty in preview). */
function ArrowLink({ s, className, style, icon = 'arrow' }: { s: Section; className?: string; style?: CSSProperties; icon?: 'arrow' | 'up' | 'chevron' }) {
  const { preview } = useB()
  if (preview && !s.content.link) return null
  const Icon = icon === 'up' ? ArrowUpRight : icon === 'chevron' ? ChevronRight : ArrowRight
  return (
    <span className={cn('group inline-flex items-center gap-1.5 whitespace-nowrap font-semibold', className)} style={style}>
      <Link s={s} />
      <Icon size={15} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
    </span>
  )
}

const Spark = ({ className, style }: { className?: string; style?: CSSProperties }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={className} style={style}>
    <path d="M12 0c.8 6.2 5 10.9 12 12-7 1.1-11.2 5.8-12 12-.8-6.2-5-10.9-12-12C7 10.9 11.2 6.2 12 0z" fill="currentColor" />
  </svg>
)

/* ---------- Designs ---------- */
function BannerBrand({ s }: { s: Section }) {
  return (
    <div className="py-3">
      <W className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[14px] font-medium">
        <Text s={s} />
        <ArrowLink s={s} className="underline decoration-1 underline-offset-4" style={{ color: 'var(--accent)' }} />
      </W>
    </div>
  )
}

function BannerPill({ s }: { s: Section }) {
  return (
    <div className="py-2.5">
      <W className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-[14px]">
        <E s={s} el="badge" kind="badge" className="inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-bold uppercase tracking-[.08em]" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }} />
        <Text s={s} style={{ color: 'var(--muted)' }} />
        <ArrowLink s={s} icon="chevron" style={{ color: 'var(--fg)' }} />
      </W>
    </div>
  )
}

function BannerGradient({ s }: { s: Section }) {
  return (
    <div
      className="relative overflow-hidden py-3"
      style={{
        color: 'var(--btn-fg)',
        backgroundColor: 'var(--btn-bg)',
        backgroundImage: 'radial-gradient(60% 180% at 12% 0%, rgba(255,255,255,.22), transparent 60%), linear-gradient(100deg, var(--btn-bg), oklch(from var(--btn-bg) calc(l * .92) calc(c * 1.1) calc(h + 55)) 55%, oklch(from var(--btn-bg) l c calc(h + 110)))',
      }}
    >
      <W className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-[14px] font-medium">
        <Sparkles size={16} aria-hidden className="shrink-0 opacity-90" />
        <Text s={s} />
        <span className="inline-flex items-center rounded-full px-3 py-1" style={{ background: 'color-mix(in srgb, var(--btn-fg) 16%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--btn-fg) 28%, transparent)' }}>
          <ArrowLink s={s} className="text-[13px]" />
        </span>
      </W>
    </div>
  )
}

function BannerTicker({ s }: { s: Section }) {
  const sep = (n: number) =>
    Array.from({ length: n }, (_, i) => (
      <Spark key={i} className="size-2.5 shrink-0" style={{ opacity: 0.25 + (i / n) * 0.55 }} />
    ))
  return (
    <div className="overflow-hidden" style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
      <div className="flex items-center justify-center gap-5 py-3 font-mono text-[12.5px] font-medium uppercase tracking-[.12em] @3xl:gap-7">
        <div aria-hidden className="hidden shrink-0 items-center gap-7 @3xl:flex" style={{ maskImage: 'linear-gradient(90deg, transparent, #000)' }}>
          {sep(5)}
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-5 gap-y-1 px-6 text-center @3xl:flex-nowrap @3xl:px-0">
          <Text s={s} className="@3xl:whitespace-nowrap" />
          <Spark className="hidden size-2.5 shrink-0 @md:block" />
          <ArrowLink s={s} className="underline decoration-1 underline-offset-4" />
        </div>
        <div aria-hidden className="hidden shrink-0 flex-row-reverse items-center gap-7 @3xl:flex" style={{ maskImage: 'linear-gradient(270deg, transparent, #000)' }}>
          {sep(5)}
        </div>
      </div>
    </div>
  )
}

function BannerCountdown({ s }: { s: Section }) {
  return (
    <div className="py-3">
      <W className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[14px]">
        <Text s={s} className="text-center font-medium" />
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inset-0 motion-safe:animate-ping rounded-full opacity-60" style={{ background: 'var(--accent)' }} />
            <span className="relative size-2 rounded-full" style={{ background: 'var(--accent)' }} />
          </span>
          <E s={s} el="countdown" kind="text" className="rounded-[min(var(--r-btn),8px)] px-2.5 py-1 font-mono text-[14px] font-semibold tabular-nums tracking-[.04em]" style={{ background: 'var(--fg)', color: 'var(--bg)' }} />
        </span>
        <Btn s={s} el="link" size="sm" className="h-8 px-3.5 text-[13px]" />
      </W>
    </div>
  )
}

function BannerCookie({ s }: { s: Section }) {
  return (
    <div className="py-4">
      <W>
        <div className="flex flex-col gap-4 p-4 @3xl:flex-row @3xl:items-center @3xl:gap-5 @3xl:py-3.5 @3xl:pl-4 @3xl:pr-3.5" style={{ background: 'linear-gradient(var(--card), var(--card)), var(--bg)', border: '1px solid var(--line)', borderRadius: 'min(var(--r-card), 18px)', boxShadow: '0 18px 40px -24px rgba(0,0,0,.3)' }}>
          <div className="flex min-w-0 flex-1 items-start gap-3.5 @3xl:items-center">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center" style={{ borderRadius: 'min(var(--r-card), 12px)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
              <Cookie size={19} strokeWidth={1.8} />
            </span>
            <Text s={s} className="text-[14px] leading-[1.5]" style={{ color: 'var(--muted)' }} />
          </div>
          <Btn s={s} el="link" size="sm" className="shrink-0 self-start @3xl:self-auto" />
        </div>
      </W>
    </div>
  )
}

function BannerFloat({ s }: { s: Section }) {
  return (
    <div className="px-4 py-4">
      <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 pl-2 pr-4 text-center text-[13.5px]" style={{ background: 'linear-gradient(var(--card), var(--card)), var(--bg)', borderRadius: 999, border: '1px solid var(--line)', boxShadow: '0 12px 30px -16px rgba(0,0,0,.28)' }}>
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}>
          <span className="size-2 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent)' }} />
        </span>
        <Text s={s} className="font-medium" />
        <span aria-hidden className="hidden h-4 w-px @md:block" style={{ background: 'var(--line)' }} />
        <ArrowLink s={s} style={{ color: 'var(--accent)' }} />
      </div>
    </div>
  )
}

function BannerIcon({ s }: { s: Section }) {
  return (
    <div className="border-b py-3" style={{ borderColor: 'var(--line)' }}>
      <W className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[14px]">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
            <Megaphone size={15} strokeWidth={2} />
          </span>
          <Text s={s} className="font-medium" />
        </div>
        <ArrowLink s={s} icon="up" className="pl-11 @3xl:pl-0" style={{ color: 'var(--accent)' }} />
      </W>
    </div>
  )
}

function BannerSplit({ s }: { s: Section }) {
  return (
    <div className="py-2.5">
      <W className="grid items-center gap-x-6 gap-y-1.5 text-center text-[13.5px] @3xl:grid-cols-[1fr_auto_1fr] @3xl:text-left">
        <Text s={s} className="font-medium" />
        <span aria-hidden className="mx-auto hidden h-4 w-px @3xl:block" style={{ background: 'var(--line)' }} />
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 @3xl:justify-end">
          <Text s={s} el="text2" style={{ color: 'var(--muted)' }} />
          <ArrowLink s={s} style={{ color: 'var(--accent)' }} />
        </div>
      </W>
    </div>
  )
}

function BannerDismiss({ s }: { s: Section }) {
  const { preview } = useB()
  const [closed, setClosed] = useState(false)
  if (preview && closed) return null
  return (
    <div className="relative border-t-2 py-3" style={{ borderColor: 'var(--accent)' }}>
      <W className="flex items-center gap-4">
        <span aria-hidden className="hidden w-8 shrink-0 @3xl:block" />
        <p className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[14px]">
          <Text s={s} />
          <ArrowLink s={s} className="underline decoration-1 underline-offset-4" style={{ color: 'var(--accent)' }} />
        </p>
        <button
          type="button"
          aria-label="Duyuruyu kapat"
          onClick={(e) => {
            e.stopPropagation()
            if (preview) setClosed(true)
          }}
          className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_9%,transparent)]"
          style={{ color: 'var(--muted)' }}
        >
          <X size={16} aria-hidden />
        </button>
      </W>
    </div>
  )
}

function BannerSparkle({ s }: { s: Section }) {
  return (
    <div className="relative overflow-hidden py-3.5">
      <Spark className="absolute left-[8%] top-1.5 hidden size-3 @3xl:block" style={{ color: 'var(--accent)', opacity: 0.5 }} />
      <Spark className="absolute bottom-1.5 left-[14%] hidden size-2 @3xl:block" style={{ color: 'var(--accent)', opacity: 0.35 }} />
      <Spark className="absolute right-[10%] top-2 hidden size-2.5 @3xl:block" style={{ color: 'var(--accent)', opacity: 0.45 }} />
      <Spark className="absolute bottom-2 right-[16%] hidden size-3.5 @3xl:block" style={{ color: 'var(--accent)', opacity: 0.3 }} />
      <W className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-[14.5px]">
        <Spark className="size-4 shrink-0" style={{ color: 'var(--accent)' }} />
        <Text s={s} className="font-medium" />
        <span className="inline-flex items-center rounded-[min(var(--r-btn),6px)] px-2 py-0.5" style={{ background: 'color-mix(in srgb, var(--accent) 18%, transparent)' }}>
          <ArrowLink s={s} style={{ color: 'var(--fg)' }} />
        </span>
      </W>
    </div>
  )
}

export const BANNER: KindVariants = {
  kind: 'banner',
  fields: [
    { key: 'badge', label: 'Rozet', el: 'badge', def: 'Yeni' },
    { key: 'countdown', label: 'Geri sayım', el: 'text', def: '02 : 14 : 37', hint: 'Sabit yazı; örn. 02 : 14 : 37' },
    { key: 'text2', label: 'İkinci mesaj', el: 'text', def: 'Kasım boyunca ücretsiz taşıma desteği.' },
  ],
  variants: [
    { id: 'default', name: 'İnce şerit', tags: ['Minimal'], blurb: 'Ortalı tek satır duyuru.' },
    { id: 'brand-arrow', name: 'Marka şeridi', tags: ['Modern', 'Cesur'], blurb: 'Marka renginde, oklu bağlantılı şerit.', C: BannerBrand, style: { palette: 'brand' } },
    { id: 'new-pill', name: 'Yeni rozetli', tags: ['Koyu', 'SaaS'], blurb: 'Koyu zeminde "Yeni" rozetiyle duyuru.', C: BannerPill, style: { palette: 'dark' }, extras: ['badge'] },
    { id: 'gradient', name: 'Gradyan şerit', tags: ['Gradient', 'Cesur'], blurb: 'Marka renginden türeyen renkli geçişli şerit.', C: BannerGradient },
    { id: 'ticker', name: 'Kayan yazı görünümü', tags: ['Cesur', 'Ajans'], blurb: 'Yıldız ayraçlı, büyük harfli ters renkli bant.', C: BannerTicker },
    { id: 'countdown', name: 'Geri sayım', tags: ['E-ticaret', 'Cesur'], blurb: 'Kampanya için sayaç ve küçük buton.', C: BannerCountdown, style: { palette: 'light' }, extras: ['countdown'] },
    { id: 'notice', name: 'Bilgilendirme kartı', tags: ['Minimal', 'Kurumsal'], blurb: 'İkonlu kart içinde not ve onay butonu.', C: BannerCookie },
    { id: 'floating-pill', name: 'Yüzen kapsül', tags: ['Modern', 'Glass'], blurb: 'Sayfa zemininde ortalı küçük bir kapsül.', C: BannerFloat, style: { bg: 'transparent' } },
    { id: 'icon-left', name: 'İkonlu satır', tags: ['Kurumsal', 'Minimal'], blurb: 'Solda ikon ve metin, sağda bağlantı.', C: BannerIcon, style: { palette: 'light' } },
    { id: 'split', name: 'İki mesaj', tags: ['E-ticaret', 'Modern'], blurb: 'Ayraçla bölünmüş iki ayrı duyuru.', C: BannerSplit, extras: ['text2'] },
    { id: 'dismiss', name: 'Kapatılabilir', tags: ['Minimal', 'SaaS'], blurb: 'Üstü renkli çizgili, kapatma düğmeli şerit.', C: BannerDismiss },
    { id: 'sparkle', name: 'Parıltılı vurgu', tags: ['Modern', 'Gradient'], blurb: 'Yıldız süsleri ve fosforlu bağlantı vurgusu.', C: BannerSparkle, style: { palette: 'sand' } },
  ],
}
