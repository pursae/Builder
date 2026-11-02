import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, CalendarDays, ChevronDown, Clock, Mail, MapPin, Phone } from 'lucide-react'
import { IMAGES } from '../data'
import { useB } from '../store'
import type { Section } from '../types'
import { BTN, E, EImage, LOOK, Slot, W, cn, initials, list, secPad, useType } from './kit'
import type { KindVariants } from './types'

/* ---------- Shared bits ---------- */
const SOLID = 'linear-gradient(var(--card), var(--card)), var(--bg)'
const LIFT = '0 40px 80px -40px rgba(0,0,0,.4)'
const CTL = 'w-full bg-transparent text-[15px] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-(color:--muted) placeholder:opacity-75 disabled:cursor-default disabled:opacity-100'
/** Boxed input (built-in look). */
const BOX = cn(CTL, 'h-12 border px-4 focus:border-(--accent)')
const BOX_ST: CSSProperties = { borderColor: 'var(--line)', borderRadius: 'var(--r-btn)', background: 'var(--bg)' }
const AREA_ST: CSSProperties = { ...BOX_ST, borderRadius: 'min(var(--r-card), 16px)' }
const LABEL = 'mb-2 block text-[13px] font-medium'

const notes = (v?: string) =>
  (v ?? '')
    .split('\n')
    .map((x) => x.split('|').map((p) => p.trim()))
    .filter((p) => p[0])

type FieldProps = {
  s: Section
  /** Accessible name, used when the design shows no visible (editable) label. */
  sr: string
  /** Content key of the visible label. */
  label?: string
  ph: string
  type?: string
  auto?: string
  rows?: number
  cls?: string
  st?: CSSProperties
  labelCls?: string
  className?: string
}

/** Real input / textarea (disabled while editing) with a <label>: an editable label field or a hidden one. */
function Field({ s, sr, label, ph, type = 'text', auto, rows, cls = BOX, st = rows ? AREA_ST : BOX_ST, labelCls = LABEL, className }: FieldProps) {
  const id = useId()
  const { preview } = useB()
  const shown = !!label && s.content[label] !== undefined && !(preview && !s.content[label])
  return (
    <div className={className}>
      {shown ? (
        <label htmlFor={id} className={labelCls}>
          <E s={s} el={label} kind="text" />
        </label>
      ) : (
        <label htmlFor={id} className="sr-only">
          {sr}
        </label>
      )}
      {rows ? (
        <textarea id={id} rows={rows} disabled={!preview} placeholder={ph} className={cn(cls, 'h-auto resize-none py-3')} style={st} />
      ) : (
        <input id={id} type={type} autoComplete={auto} disabled={!preview} placeholder={ph} className={cls} style={st} />
      )}
    </div>
  )
}

function Choice({ s, sr, label, options, icon, labelCls = LABEL, className }: { s: Section; sr: string; label?: string; options: string[]; icon?: ReactNode; labelCls?: string; className?: string }) {
  const id = useId()
  const { preview } = useB()
  const shown = !!label && s.content[label] !== undefined && !(preview && !s.content[label])
  return (
    <div className={className}>
      {shown ? (
        <label htmlFor={id} className={labelCls}>
          <E s={s} el={label} kind="text" />
        </label>
      ) : (
        <label htmlFor={id} className="sr-only">
          {sr}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
            {icon}
          </span>
        )}
        <select id={id} disabled={!preview} className={cn(BOX, 'appearance-none pr-10', !!icon && 'pl-11')} style={BOX_ST}>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDown aria-hidden size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
      </div>
    </div>
  )
}

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

function Submit({ s, look = 'primary', className, style }: { s: Section; look?: keyof typeof LOOK; className?: string; style?: CSSProperties }) {
  return <E s={s} el="primary" kind="button" as="button" hint="button" className={cn(BTN.lg, 'transition-[background-color,color,opacity,box-shadow] duration-300 hover:opacity-90', className)} style={{ ...LOOK[look], ...style }} />
}

function Note({ s, className, style }: { s: Section; className?: string; style?: CSSProperties }) {
  return <E s={s} el="note" kind="text" as="p" hint="p" className={cn('block text-[12.5px] leading-snug', className)} style={{ color: 'var(--muted)', ...style }} />
}

const Form = ({ children, className, style, label }: { children: ReactNode; className?: string; style?: CSSProperties; label?: string }) => (
  <form noValidate aria-label={label ?? 'İletişim formu'} onSubmit={(e) => e.preventDefault()} className={className} style={style}>
    {children}
  </form>
)

const CONTACT = [
  { key: 'address', icon: MapPin, sr: 'Adres' },
  { key: 'phone', icon: Phone, sr: 'Telefon' },
  { key: 'email', icon: Mail, sr: 'E-posta' },
  { key: 'hours', icon: Clock, sr: 'Çalışma saatleri' },
] as const

/* ---------- Designs ---------- */
function FormCard({ s }: { s: Section }) {
  return (
    <div className="relative overflow-hidden" style={secPad(s)}>
      <div aria-hidden className="absolute left-1/2 top-[38%] aspect-square w-[min(900px,120%)] -translate-x-1/2 rounded-full opacity-70 blur-3xl" style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 22%, transparent), transparent)' }} />
      <W className="relative">
        <div className="mx-auto max-w-[640px] text-center">
          <Eyebrow s={s} />
          <Title s={s} className="mt-4" />
          <Body s={s} className="mx-auto mt-5 max-w-[540px]" />
        </div>
        <Form className="mx-auto mt-12 grid max-w-[620px] gap-5 p-6 @md:p-9" style={{ background: SOLID, borderRadius: 'var(--r-card)', border: '1px solid var(--line)', boxShadow: LIFT }}>
          <div className="grid gap-5 @md:grid-cols-2">
            <Field s={s} sr="Adınız" label="nameLabel" ph="Ad Soyad" auto="name" />
            <Field s={s} sr="E-posta" label="emailLabel" ph="ornek@site.com" type="email" auto="email" />
          </div>
          <Field s={s} sr="Mesajınız" label="messageLabel" ph="Size nasıl yardımcı olabiliriz?" rows={5} />
          <Submit s={s} className="mt-1 w-full" />
          <Note s={s} className="text-center" />
        </Form>
      </W>
    </div>
  )
}

function FormContact({ s }: { s: Section }) {
  return (
    <div style={secPad(s)}>
      <W className="grid gap-14 @4xl:grid-cols-[.9fr_1.1fr] @4xl:gap-20">
        <div>
          <Eyebrow s={s} />
          <Title s={s} className="mt-4" />
          <Body s={s} className="mt-5" />
          <ul className="mt-10 grid gap-3">
            {CONTACT.map(({ key, icon: Icon, sr }) => (
              <li key={key} className="flex items-center gap-4 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
                <span aria-hidden className="grid size-11 shrink-0 place-items-center" style={{ borderRadius: 'min(var(--r-card), 12px)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <span className="sr-only">{sr}:</span>
                <E s={s} el={key} kind="text" className="text-[15.5px] font-medium" />
              </li>
            ))}
          </ul>
        </div>
        <Form className="grid content-start gap-5 p-6 @md:p-9" style={{ background: SOLID, borderRadius: 'var(--r-card)', border: '1px solid var(--line)', boxShadow: LIFT }}>
          <div className="grid gap-5 @md:grid-cols-2">
            <Field s={s} sr="Adınız" label="nameLabel" ph="Ad Soyad" auto="name" />
            <Field s={s} sr="E-posta" label="emailLabel" ph="ornek@site.com" type="email" auto="email" />
          </div>
          <Choice s={s} sr="Konu" options={['Genel soru', 'Taşıma desteği', 'Kurumsal destek', 'Basın']} />
          <Field s={s} sr="Mesajınız" label="messageLabel" ph="Mesajınızı yazın…" rows={5} />
          <div>
            <Submit s={s} />
          </div>
        </Form>
      </W>
    </div>
  )
}

function FormDark({ s }: { s: Section }) {
  const dark = cn(CTL, 'h-12 border-b px-0 focus:border-(--accent)')
  const st: CSSProperties = { borderColor: 'var(--line)' }
  const lbl = 'mb-1 block text-[11.5px] font-semibold uppercase tracking-[.12em] text-(color:--muted)'
  return (
    <div style={secPad(s)}>
      <W>
        <div className="relative overflow-hidden p-7 @md:p-12 @5xl:p-16" style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--line)' }}>
          <div aria-hidden className="absolute -left-1/4 -top-1/2 aspect-square w-[80%] rounded-full opacity-60 blur-3xl" style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 38%, transparent), transparent)' }} />
          <div aria-hidden className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'linear-gradient(120deg, #000, transparent 55%)' }} />
          <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />
          <div className="relative grid gap-12 @4xl:grid-cols-2 @4xl:gap-20">
            <div className="flex flex-col">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb, var(--fg) 4%, transparent)' }}>
                <span aria-hidden className="size-1.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)' }} />
                <Eyebrow s={s} className="text-[11.5px] tracking-[.12em]" />
              </span>
              <Title s={s} className="mt-6" />
              <Body s={s} className="mt-5" />
              <div className="mt-auto flex items-center gap-3 pt-10 text-[14px]" style={{ color: 'var(--muted)' }}>
                <Clock aria-hidden size={16} />
                <span className="sr-only">Çalışma saatleri:</span>
                <E s={s} el="hours" kind="text" />
              </div>
            </div>
            <Form className="grid content-start gap-7">
              <div className="grid gap-7 @md:grid-cols-2">
                <Field s={s} sr="Adınız" label="nameLabel" ph="Ad Soyad" auto="name" cls={dark} st={st} labelCls={lbl} />
                <Field s={s} sr="E-posta" label="emailLabel" ph="ornek@site.com" type="email" auto="email" cls={dark} st={st} labelCls={lbl} />
              </div>
              <Field s={s} sr="Mesajınız" label="messageLabel" ph="Projenizden kısaca bahsedin" rows={4} cls={cn(dark, 'px-0')} st={st} labelCls={lbl} />
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Submit s={s} />
                <Note s={s} className="max-w-[260px]" />
              </div>
            </Form>
          </div>
        </div>
      </W>
    </div>
  )
}

function FormImage({ s }: { s: Section }) {
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W>
        <div className="relative overflow-hidden" style={{ borderRadius: 'var(--r-card)' }}>
          <div className="absolute inset-0">
            <EImage s={s} className="size-full [--r-card:0px]">
              <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
            </EImage>
          </div>
          <div className="pointer-events-none relative grid gap-10 p-6 @md:p-12 @4xl:grid-cols-[1fr_440px] @4xl:items-center @4xl:gap-16 @5xl:p-16">
            <div className="pointer-events-auto text-white">
              <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1.5 backdrop-blur-md">
                <Eyebrow s={s} className="text-[11.5px] tracking-[.12em]" style={{ color: '#fff' }} />
              </span>
              <E s={s} el="title" kind="heading" as="h2" hint="h2" className="mt-6 block text-balance" style={{ ...title(s.style.titleSize, 30), color: s.style.titleColor || '#fff' }} />
              <Body s={s} className="mt-5 max-w-[460px]" style={{ color: 'rgba(255,255,255,.84)' }} />
            </div>
            <Form className="pointer-events-auto grid gap-4 p-6 backdrop-blur-xl @md:p-8" style={{ background: 'color-mix(in srgb, var(--bg) 90%, transparent)', color: 'var(--fg)', borderRadius: 'min(var(--r-card), 20px)', boxShadow: '0 40px 80px -30px rgba(0,0,0,.6)' }}>
              <Field s={s} sr="Adınız" ph="Ad Soyad" auto="name" />
              <Field s={s} sr="E-posta" ph="E-posta adresiniz" type="email" auto="email" />
              <Field s={s} sr="Mesajınız" ph="Mesajınız" rows={4} />
              <Submit s={s} className="w-full" />
              <Note s={s} className="text-center" />
            </Form>
          </div>
        </div>
      </W>
    </div>
  )
}

function FormUnderline({ s }: { s: Section }) {
  const line = cn(CTL, 'border-b-[1.5px] pb-3 pt-1 text-[19px] focus:border-(--fg) @3xl:text-[21px]')
  const st: CSSProperties = { borderColor: 'var(--line)' }
  const lbl = 'mb-3 block text-[11.5px] font-semibold uppercase tracking-[.16em] text-(color:--muted)'
  return (
    <div style={secPad(s)}>
      <W className="grid gap-14 @4xl:grid-cols-[.85fr_1.15fr] @4xl:gap-24">
        <div>
          <Eyebrow s={s} />
          <Title s={s} size={1.1} className="mt-4" />
          <Body s={s} className="mt-6" />
          <div className="mt-10 flex items-center gap-3 text-[17px] font-medium">
            <span className="sr-only">E-posta:</span>
            <E s={s} el="email" kind="text" className="underline decoration-1 underline-offset-[6px]" style={{ textDecorationColor: 'var(--accent)' }} />
          </div>
        </div>
        <Form className="grid content-start gap-10 @md:grid-cols-2">
          <Field s={s} sr="Adınız" label="nameLabel" ph="Ad Soyad" auto="name" cls={line} st={st} labelCls={lbl} />
          <Field s={s} sr="E-posta" label="emailLabel" ph="ornek@site.com" type="email" auto="email" cls={line} st={st} labelCls={lbl} />
          <Field s={s} sr="Mesajınız" label="messageLabel" ph="Merhaba, …" rows={3} cls={cn(line, 'py-1')} st={st} labelCls={lbl} className="@md:col-span-2" />
          <div className="flex items-center gap-4 @md:col-span-2">
            <Submit s={s} look="fg" className="h-14 px-8" />
            <span aria-hidden className="grid size-14 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }}>
              <ArrowRight size={18} />
            </span>
          </div>
        </Form>
      </W>
    </div>
  )
}

function FormNewsletter({ s }: { s: Section }) {
  const { preview } = useB()
  const id = useId()
  return (
    <div style={secPad(s)}>
      <W>
        <div className="relative grid gap-8 overflow-hidden p-7 @md:p-10 @4xl:grid-cols-[1fr_1.05fr] @4xl:items-center @4xl:gap-14 @5xl:p-14" style={{ background: SOLID, borderRadius: 'var(--r-card)', border: '1px solid var(--line)' }}>
          <svg aria-hidden viewBox="0 0 200 200" className="absolute -right-10 -top-14 size-56 opacity-[.07]" fill="none" stroke="currentColor" strokeWidth="1.5">
            {[20, 40, 60, 80, 100].map((r) => (
              <circle key={r} cx="100" cy="100" r={r} />
            ))}
          </svg>
          <div className="relative">
            <Eyebrow s={s} />
            <Title s={s} size={0.72} min={26} className="mt-3" />
            <Body s={s} className="mt-3 text-[16px]" />
          </div>
          <Form label="Bülten kaydı" className="relative">
            <label htmlFor={id} className="sr-only">
              E-posta adresiniz
            </label>
            <div className="flex flex-col gap-2 border p-1.5 @md:flex-row @md:items-center" style={{ borderColor: 'var(--line)', borderRadius: 'calc(var(--r-btn) + 6px)', background: 'var(--bg)' }}>
              <Mail aria-hidden size={18} className="ml-3 hidden shrink-0 @md:block" style={{ color: 'var(--muted)' }} />
              <input id={id} type="email" autoComplete="email" disabled={!preview} placeholder="E-posta adresiniz" className={cn(CTL, 'h-12 min-w-0 flex-1 px-3')} />
              <Submit s={s} className="shrink-0" />
            </div>
            <Note s={s} className="mt-3 pl-1" />
          </Form>
        </div>
      </W>
    </div>
  )
}

const TIMES = ['09:30', '11:00', '13:30', '15:00', '16:30']

function FormBooking({ s }: { s: Section }) {
  const [time, setTime] = useState(1)
  const { preview } = useB()
  const tid = useId()
  const showTime = s.content.timeLabel !== undefined && !(preview && !s.content.timeLabel)
  return (
    <div style={secPad(s)}>
      <W>
        <div className="grid overflow-hidden @4xl:grid-cols-[.9fr_1.1fr]" style={{ borderRadius: 'var(--r-card)', border: '1px solid var(--line)', background: SOLID, boxShadow: LIFT }}>
          <div className="relative flex flex-col overflow-hidden p-7 @md:p-10 @5xl:p-12" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
            <div aria-hidden className="absolute -bottom-24 -right-24 size-72 rounded-full border-[40px] opacity-10" style={{ borderColor: 'currentColor' }} />
            <Eyebrow s={s} style={{ color: 'inherit', opacity: 0.8 }} />
            <Title s={s} size={0.85} min={28} className="mt-4" />
            <Body s={s} className="mt-5 text-[16px]" style={{ color: 'inherit', opacity: 0.82 }} />
            <ul className="relative mt-auto grid gap-3 pt-10 text-[14.5px]">
              <li className="flex items-center gap-3">
                <Clock aria-hidden size={17} />
                <span className="sr-only">Çalışma saatleri:</span>
                <E s={s} el="hours" kind="text" />
              </li>
              <li className="flex items-center gap-3">
                <Phone aria-hidden size={17} />
                <span className="sr-only">Telefon:</span>
                <E s={s} el="phone" kind="text" />
              </li>
            </ul>
          </div>
          <Form label="Randevu formu" className="grid content-start gap-5 p-7 @md:p-10 @5xl:p-12">
            <div className="grid gap-5 @md:grid-cols-2">
              <Field s={s} sr="Adınız" label="nameLabel" ph="Ad Soyad" auto="name" />
              <Field s={s} sr="E-posta" label="emailLabel" ph="ornek@site.com" type="email" auto="email" />
            </div>
            <Choice s={s} sr="Tarih" label="dateLabel" icon={<CalendarDays size={17} />} options={['Salı, 12 Kasım', 'Çarşamba, 13 Kasım', 'Perşembe, 14 Kasım', 'Cuma, 15 Kasım']} />
            <div role="radiogroup" aria-labelledby={tid}>
              {showTime ? (
                <span id={tid} className={LABEL}>
                  <E s={s} el="timeLabel" kind="text" />
                </span>
              ) : (
                <span id={tid} className="sr-only">
                  Saat
                </span>
              )}
              <div className="grid grid-cols-3 gap-2 @md:grid-cols-5">
                {TIMES.map((t, n) => {
                  const on = n === time
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTime(n)
                      }}
                      className="h-11 border text-[14px] font-medium tabular-nums transition-colors"
                      style={{ borderRadius: 'var(--r-btn)', borderColor: on ? 'var(--accent)' : 'var(--line)', background: on ? 'color-mix(in srgb, var(--accent) 12%, var(--bg))' : 'var(--bg)', color: on ? 'var(--accent)' : 'var(--fg)' }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
            <Field s={s} sr="Not" ph="Görüşmede neyi konuşmak istersiniz?" rows={3} />
            <Submit s={s} className="w-full" />
          </Form>
        </div>
      </W>
    </div>
  )
}

function MapArt() {
  return (
    <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" fill="none">
      <rect width="600" height="600" fill="var(--card)" />
      <path d="M-20 430 C 120 380 180 470 300 420 S 480 330 620 380" stroke="color-mix(in srgb, var(--accent) 22%, transparent)" strokeWidth="38" strokeLinecap="round" />
      <path d="M60 60 h150 v120 h-150z M250 40 h130 v90 h-130z M420 70 h140 v150 h-140z M70 230 h110 v110 h-110z M420 250 h120 v80 h-120z M90 500 h170 v80 h-170z M330 480 h160 v100 h-160z" fill="color-mix(in srgb, var(--fg) 5%, transparent)" />
      <path d="M240 190 h140 v130 h-140z" fill="color-mix(in srgb, var(--accent) 12%, transparent)" />
      <g stroke="var(--bg)" strokeLinecap="round">
        <path d="M-10 210 H610 M225 -10 V610 M400 -10 V610 M-10 360 C 150 350 260 330 610 300" strokeWidth="18" />
        <path d="M-10 120 H610 M120 -10 V610 M520 -10 V610 M-10 470 H610" strokeWidth="9" />
      </g>
      <g stroke="var(--line)" strokeDasharray="2 10" strokeLinecap="round" strokeWidth="2">
        <path d="M-10 210 H610 M225 -10 V610 M400 -10 V610" />
      </g>
    </svg>
  )
}

function FormMap({ s }: { s: Section }) {
  return (
    <div style={secPad(s)}>
      <W className="grid gap-12 @4xl:grid-cols-2 @4xl:gap-16">
        <div className="relative min-h-[360px] overflow-hidden @4xl:min-h-full" style={{ borderRadius: 'var(--r-card)', border: '1px solid var(--line)' }}>
          <MapArt />
          <div aria-hidden className="absolute left-[52%] top-[42%] -translate-x-1/2 -translate-y-full">
            <span className="absolute left-1/2 top-full size-16 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 22%, transparent)' }} />
            <svg viewBox="0 0 24 32" className="relative h-11 w-8 drop-shadow-lg">
              <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.5 12 32 12 32s12-11.5 12-20.3C24 5.2 18.6 0 12 0z" fill="var(--btn-bg)" />
              <circle cx="12" cy="11.5" r="4.5" fill="var(--btn-fg)" />
            </svg>
          </div>
          <div className="absolute inset-x-4 bottom-4 grid gap-2 p-4 @md:inset-x-auto @md:left-5 @md:bottom-5 @md:w-[300px] @md:p-5" style={{ background: SOLID, borderRadius: 'min(var(--r-card), 16px)', border: '1px solid var(--line)', boxShadow: LIFT }}>
            {CONTACT.filter((c) => c.key !== 'email').map(({ key, icon: Icon, sr }) => (
              <div key={key} className="flex items-start gap-3 text-[14px] leading-snug">
                <Icon aria-hidden size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="sr-only">{sr}:</span>
                <E s={s} el={key} kind="text" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow s={s} />
          <Title s={s} size={0.9} className="mt-4" />
          <Body s={s} className="mt-5" />
          <Form className="mt-10 grid gap-4">
            <div className="grid gap-4 @md:grid-cols-2">
              <Field s={s} sr="Adınız" ph="Ad Soyad" auto="name" />
              <Field s={s} sr="E-posta" ph="E-posta adresiniz" type="email" auto="email" />
            </div>
            <Field s={s} sr="Mesajınız" ph="Mesajınız" rows={5} />
            <div>
              <Submit s={s} />
            </div>
          </Form>
        </div>
      </W>
    </div>
  )
}

function FormSteps({ s }: { s: Section }) {
  const steps = list(s.content.steps)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[820px]">
        <div className="text-center">
          <Eyebrow s={s} />
          <Title s={s} className="mt-4" />
          <Body s={s} className="mx-auto mt-5 max-w-[560px]" />
        </div>
        <Slot s={s} el="steps" as="ul" className="mx-auto mt-12 flex max-w-[620px] items-start">
          {steps.map((t, n) => (
            <li key={`${t}-${n}`} aria-current={n === 0 ? 'step' : undefined} className="relative flex flex-1 flex-col items-center gap-2.5 text-center">
              {n > 0 && <span aria-hidden className="absolute right-1/2 top-[17px] h-0.5 w-[calc(100%-44px)] -translate-x-[22px]" style={{ background: 'var(--line)' }} />}
              <span className="relative grid size-9 place-items-center rounded-full text-[13.5px] font-semibold tabular-nums" style={n === 0 ? { background: 'var(--btn-bg)', color: 'var(--btn-fg)', boxShadow: '0 0 0 5px color-mix(in srgb, var(--accent) 18%, transparent)' } : { background: 'var(--bg)', color: 'var(--muted)', boxShadow: 'inset 0 0 0 1.5px var(--line)' }}>
                {n + 1}
              </span>
              <span className="text-[13px] font-medium @md:text-[14px]" style={{ color: n === 0 ? 'var(--fg)' : 'var(--muted)' }}>
                {t}
              </span>
            </li>
          ))}
        </Slot>
        <Form className="mt-10 overflow-hidden" style={{ background: SOLID, borderRadius: 'var(--r-card)', border: '1px solid var(--line)', boxShadow: LIFT }}>
          <div aria-hidden className="h-1" style={{ background: 'var(--line)' }}>
            <div className="h-full" style={{ width: `${100 / Math.max(steps.length, 1)}%`, background: 'var(--accent)' }} />
          </div>
          <div className="grid gap-5 p-6 @md:grid-cols-2 @md:p-9">
            <Field s={s} sr="Adınız" label="nameLabel" ph="Ad Soyad" auto="name" />
            <Field s={s} sr="E-posta" label="emailLabel" ph="ornek@site.com" type="email" auto="email" />
            <Field s={s} sr="Şirket" ph="Şirket (isteğe bağlı)" auto="organization" />
            <Choice s={s} sr="Site sayısı" options={['1 site', '2 – 5 site', '6 – 20 site', '20+ site']} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t px-6 py-5 @md:px-9" style={{ borderColor: 'var(--line)' }}>
            <span aria-hidden className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--muted)' }}>
              1 / {Math.max(steps.length, 1)}
            </span>
            <Submit s={s} />
          </div>
        </Form>
      </W>
    </div>
  )
}

function FormChat({ s }: { s: Section }) {
  const { head } = useType(s)
  const chat = cn(CTL, 'h-11 border px-3.5 text-[14.5px] focus:border-(--accent)')
  return (
    <div style={secPad(s)}>
      <W className="grid items-center gap-14 @4xl:grid-cols-[.85fr_1.15fr] @4xl:gap-20">
        <div>
          <Eyebrow s={s} />
          <Title s={s} className="mt-4" />
          <ul className="mt-10 grid gap-4 text-[15px]">
            {CONTACT.filter((c) => c.key === 'email' || c.key === 'hours').map(({ key, icon: Icon, sr }) => (
              <li key={key} className="flex items-center gap-3">
                <span aria-hidden className="grid size-9 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--fg) 7%, transparent)' }}>
                  <Icon size={16} />
                </span>
                <span className="sr-only">{sr}:</span>
                <E s={s} el={key} kind="text" className="font-medium" />
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden" style={{ background: SOLID, borderRadius: 'var(--r-card)', border: '1px solid var(--line)', boxShadow: LIFT }}>
          <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
            <span aria-hidden className="relative grid size-11 shrink-0 place-items-center rounded-full text-[14px] font-semibold" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
              {initials(s.content.agentName)}
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 0 2.5px var(--card)' }} />
            </span>
            <div className="min-w-0">
              <E s={s} el="agentName" kind="text" className="block" style={head(15.5)} />
              <E s={s} el="agentRole" kind="text" className="block text-[12.5px]" style={{ color: 'var(--muted)' }} />
            </div>
          </div>
          <div className="grid gap-3 px-5 py-6" style={{ background: 'color-mix(in srgb, var(--fg) 2.5%, transparent)' }}>
            <div className="max-w-[88%] px-4 py-3" style={{ background: 'color-mix(in srgb, var(--fg) 7%, transparent)', borderRadius: '6px 18px 18px 18px' }}>
              <Body s={s} className="text-[15px] leading-[1.55]" style={{ color: 'var(--fg)' }} />
            </div>
            <div aria-hidden className="flex w-fit gap-1 rounded-full px-3 py-2.5" style={{ background: 'color-mix(in srgb, var(--fg) 7%, transparent)' }}>
              {[0, 1, 2].map((n) => (
                <span key={n} className="size-1.5 rounded-full" style={{ background: 'var(--muted)', opacity: 1 - n * 0.25 }} />
              ))}
            </div>
          </div>
          <Form label="Destek mesajı" className="grid gap-3 border-t p-5" style={{ borderColor: 'var(--line)' }}>
            <div className="grid gap-3 @md:grid-cols-2">
              <Field s={s} sr="Adınız" ph="Adınız" auto="name" cls={chat} st={BOX_ST} />
              <Field s={s} sr="E-posta" ph="E-posta" type="email" auto="email" cls={chat} st={BOX_ST} />
            </div>
            <div className="flex items-end gap-3">
              <Field s={s} sr="Mesajınız" ph="Bir mesaj yazın…" rows={2} cls={cn(chat, 'py-2.5')} className="flex-1" />
              <Submit s={s} className="h-11 shrink-0 px-4" />
            </div>
          </Form>
        </div>
      </W>
    </div>
  )
}

function FormFaq({ s }: { s: Section }) {
  const { head } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="grid gap-14 @4xl:grid-cols-[1.2fr_.8fr] @4xl:gap-16">
        <div>
          <Eyebrow s={s} />
          <Title s={s} className="mt-4" />
          <Body s={s} className="mt-5 max-w-[560px]" />
          <Form className="mt-10 grid gap-4">
            <div className="grid gap-4 @md:grid-cols-2">
              <Field s={s} sr="Adınız" label="nameLabel" ph="Ad Soyad" auto="name" />
              <Field s={s} sr="E-posta" label="emailLabel" ph="ornek@site.com" type="email" auto="email" />
            </div>
            <Field s={s} sr="Mesajınız" label="messageLabel" ph="Sorunuzu yazın" rows={5} />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Submit s={s} />
              <Note s={s} className="max-w-[300px]" />
            </div>
          </Form>
        </div>
        <aside className="self-start p-6 @md:p-8" style={{ background: 'color-mix(in srgb, var(--fg) 4%, transparent)', borderRadius: 'var(--r-card)', border: '1px solid var(--line)' }}>
          <Slot s={s} el="notes" as="ul" className="grid">
            {notes(s.content.notes).map(([q, a], n) => (
              <li key={`${q}-${n}`} className={cn('py-5', n > 0 && 'border-t', n === 0 && 'pt-0')} style={{ borderColor: 'var(--line)' }}>
                <p style={head(16)}>{q}</p>
                {a && (
                  <p className="mt-2 text-[14.5px] leading-[1.6]" style={{ color: 'var(--muted)' }}>
                    {a}
                  </p>
                )}
              </li>
            ))}
          </Slot>
          <div className="mt-2 flex items-center gap-3 border-t pt-5 text-[14px]" style={{ borderColor: 'var(--line)' }}>
            <Mail aria-hidden size={16} style={{ color: 'var(--accent)' }} />
            <span className="sr-only">E-posta:</span>
            <E s={s} el="email" kind="text" className="font-medium" />
          </div>
        </aside>
      </W>
    </div>
  )
}

export const FORM: KindVariants = {
  kind: 'form',
  fields: [
    { key: 'nameLabel', label: 'Ad alanı etiketi', el: 'text', def: 'Adınız', group: 'Form etiketleri' },
    { key: 'emailLabel', label: 'E-posta alanı etiketi', el: 'text', def: 'E-posta', group: 'Form etiketleri' },
    { key: 'messageLabel', label: 'Mesaj alanı etiketi', el: 'text', def: 'Mesajınız', group: 'Form etiketleri' },
    { key: 'dateLabel', label: 'Tarih etiketi', el: 'text', def: 'Tarih', group: 'Form etiketleri' },
    { key: 'timeLabel', label: 'Saat etiketi', el: 'text', def: 'Uygun saat', group: 'Form etiketleri' },
    { key: 'address', label: 'Adres', el: 'text', def: 'Moda Cad. 112, Kadıköy / İstanbul', group: 'İletişim bilgileri' },
    { key: 'phone', label: 'Telefon', el: 'text', def: '+90 216 555 01 23', group: 'İletişim bilgileri' },
    { key: 'email', label: 'E-posta', el: 'text', def: 'merhaba@pursae.dev', group: 'İletişim bilgileri' },
    { key: 'hours', label: 'Çalışma saatleri', el: 'text', def: 'Hafta içi 09:00 – 18:00', group: 'İletişim bilgileri' },
    { key: 'note', label: 'Alt not', el: 'text', def: 'Bilgilerinizi yalnızca size dönüş yapmak için kullanırız.' },
    { key: 'image', label: 'Arka plan fotoğrafı', el: 'image', def: IMAGES[5].url },
    { key: 'steps', label: 'Adımlar', el: 'text', def: 'Bilgileriniz, Projeniz, Gönderin', hint: 'Virgülle ayırın.' },
    { key: 'agentName', label: 'Temsilci adı', el: 'text', def: 'Deniz Yılmaz' },
    { key: 'agentRole', label: 'Temsilci notu', el: 'text', def: 'Destek ekibi · genelde 2 saatte yanıt verir' },
    {
      key: 'notes',
      label: 'Sık sorulanlar',
      el: 'text',
      multiline: true,
      def: 'Ne kadar sürede dönüş yapıyorsunuz? | Hafta içi en geç bir iş günü içinde yanıtlıyoruz.\nTaşıma ücretli mi? | WordPress içe aktarma aracı topluluk sürümünde ücretsizdir.\nKurumsal destek var mı? | Evet; SLA, öncelikli destek ve kurulum yardımı sunuyoruz.',
      hint: 'Her satır: Soru | Yanıt',
    },
  ],
  variants: [
    { id: 'default', name: 'İki sütun form', tags: ['Modern'], blurb: 'Solda başlık, sağda form.' },
    { id: 'card-center', name: 'Ortalı kart', tags: ['Modern', 'SaaS'], blurb: 'Ortalı başlık altında ışıltılı bir form kartı.', C: FormCard, extras: ['nameLabel', 'emailLabel', 'messageLabel', 'note'] },
    { id: 'contact-list', name: 'İletişim bilgileriyle', tags: ['Kurumsal'], blurb: 'Solda adres, telefon ve saatler; sağda form kartı.', C: FormContact, extras: ['nameLabel', 'emailLabel', 'messageLabel', 'address', 'phone', 'email', 'hours'] },
    { id: 'dark', name: 'Koyu panel', tags: ['Koyu', 'SaaS'], blurb: 'Izgara desenli koyu kartta çizgi alanlı form.', C: FormDark, style: { palette: 'dark' }, extras: ['nameLabel', 'emailLabel', 'messageLabel', 'hours', 'note'] },
    { id: 'image', name: 'Fotoğraf üstünde form', tags: ['Cesur', 'Glass'], blurb: 'Fotoğraf zemin üstünde buzlu cam form kartı.', C: FormImage, extras: ['image', 'note'] },
    { id: 'underline', name: 'Çizgili minimal', tags: ['Minimal', 'Ajans'], blurb: 'Büyük yazılı, alt çizgili sade alanlar.', C: FormUnderline, style: { palette: 'light' }, extras: ['nameLabel', 'emailLabel', 'messageLabel', 'email'] },
    { id: 'newsletter', name: 'Bülten satırı', tags: ['Minimal', 'E-ticaret'], blurb: 'Tek satırda e-posta alanı ve buton.', C: FormNewsletter, style: { titleSize: 44 }, extras: ['note'] },
    { id: 'booking', name: 'Randevu', tags: ['Kurumsal', 'Modern'], blurb: 'Renkli bilgi paneli, tarih seçimi ve saat düğmeleri.', C: FormBooking, extras: ['nameLabel', 'emailLabel', 'dateLabel', 'timeLabel', 'hours', 'phone'] },
    { id: 'map', name: 'Harita ve form', tags: ['Kurumsal'], blurb: 'Adres kartlı harita çizimi yanında form.', C: FormMap, extras: ['address', 'phone', 'hours'] },
    { id: 'steps', name: 'Adım adım', tags: ['SaaS', 'Modern'], blurb: 'Adım göstergesi ve ilerleme çubuğuyla form.', C: FormSteps, extras: ['steps', 'nameLabel', 'emailLabel'] },
    { id: 'chat', name: 'Destek sohbeti', tags: ['SaaS', 'Modern'], blurb: 'Temsilci mesajıyla açılan sohbet penceresi.', C: FormChat, extras: ['agentName', 'agentRole', 'email', 'hours'] },
    { id: 'faq-notes', name: 'SSS notlarıyla', tags: ['Kurumsal', 'Minimal'], blurb: 'Formun yanında sık sorulan kısa yanıtlar.', C: FormFaq, extras: ['nameLabel', 'emailLabel', 'messageLabel', 'note', 'notes', 'email'] },
  ],
}
