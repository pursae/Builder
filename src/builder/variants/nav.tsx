import { Fragment, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, CircleHelp, Cpu, LayoutTemplate, Mail, Map as MapIcon, Phone, Puzzle, Search, ShoppingBag, Sparkles, User, Zap } from 'lucide-react'
import { getGrid } from '../data'
import { useB } from '../store'
import type { Item, Section } from '../types'
import { ease } from '../ui'
import { Brand, Btn, E, Slot, Social, W, cn, useMobileMenu, useNarrow, useSolidBg, useType } from './kit'
import type { KindVariants } from './types'

/* ---------- Local helpers ---------- */
const bsz = (s: Section) => s.style.titleSize || 19
const LINK = 'text-[var(--muted)] transition-colors duration-200 hover:text-[var(--fg)]'
/** Outline button ring as a border: live pages strip box-shadows from editable elements. */
const OUTLINE: CSSProperties = { border: '1.5px solid var(--btn2)' }

/** One menu link (item title). */
function L({ s, i, className, style }: { s: Section; i: Item; className?: string; style?: CSSProperties }) {
  return <E s={s} el={`items.${i.id}.title`} kind="link" as="a" hint="a" className={cn(LINK, className)} style={style} />
}

/** Desktop link row; `grid` = this row carries the gap handles (only one per design). */
function Links({ s, items = s.items, className, style, linkClass, label = 'Ana menü', grid = true, sep }: { s: Section; items?: Item[]; className?: string; style?: CSSProperties; linkClass?: string; label?: string; grid?: boolean; sep?: ReactNode }) {
  return (
    <nav aria-label={label} data-grid={grid ? s.id : undefined} className={cn('flex items-center', className)} style={{ columnGap: getGrid(s).gapX, ...style }}>
      {items.map((i, k) => (
        <Fragment key={i.id}>
          {sep && k > 0 && sep}
          <L s={s} i={i} className={linkClass} />
        </Fragment>
      ))}
    </nav>
  )
}

/** Non-input search box showing the `search` placeholder text (selectable as one field). */
function SearchBox({ s, className, kbd, round }: { s: Section; className?: string; kbd?: boolean; round?: boolean }) {
  return (
    <Slot
      s={s}
      el="search"
      className={cn('flex h-10 min-w-0 cursor-text items-center gap-2.5 px-3.5 text-[14px]', className)}
      style={{ background: 'color-mix(in srgb, var(--fg) 6%, transparent)', border: '1px solid var(--line)', borderRadius: round ? 'var(--r-btn)' : 'min(var(--r-btn), 12px)', color: 'var(--muted)' }}
    >
      <Search size={16} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{s.content.search}</span>
      {kbd && (
        <kbd className="shrink-0 rounded-[5px] px-1.5 py-0.5 font-[JetBrains_Mono] text-[11px] leading-none" style={{ boxShadow: 'inset 0 0 0 1px var(--line)' }} aria-hidden>
          ⌘K
        </kbd>
      )}
    </Slot>
  )
}

/* ---------- Designs ---------- */
function NavCenteredLogo({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 1100 })
  const half = Math.ceil(s.items.length / 2)
  return (
    <header ref={m.ref} className="relative">
      <W className="grid h-[80px] grid-cols-[1fr_auto_1fr] items-center gap-6">
        {m.narrow ? <span /> : <Links s={s} items={s.items.slice(0, half)} className="text-[14.5px] font-medium" />}
        <Brand s={s} mark="solid" size={bsz(s)} className="justify-self-center" />
        <div className="flex items-center justify-end gap-6">
          {!m.narrow && <Links s={s} items={s.items.slice(half)} label="Ana menü (devam)" grid={false} className="text-[14.5px] font-medium" />}
          {!m.narrow && <Btn s={s} look="ghost" size="sm" style={OUTLINE} />}
          {m.toggle}
        </div>
      </W>
      {m.panel(<Btn s={s} size="md" className="flex-1" />)}
    </header>
  )
}

function NavSplit({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 1080 })
  return (
    <header ref={m.ref} className="relative" style={{ boxShadow: 'inset 0 -1px 0 var(--line)' }}>
      <W className="grid h-[68px] grid-cols-[1fr_auto_1fr] items-center gap-6">
        <Brand s={s} mark="square" size={bsz(s)} />
        {m.narrow ? <span /> : <Links s={s} className="text-[14.5px] font-medium" />}
        <div className="flex items-center justify-end gap-2">
          {!m.narrow && <Btn s={s} size="sm" />}
          {m.toggle}
        </div>
      </W>
      {m.panel(<Btn s={s} size="md" className="flex-1" />)}
    </header>
  )
}

/** Height must match the -72px bottom margin preset so the next section slides under the bar. */
function NavTransparent({ s }: { s: Section }) {
  const m = useMobileMenu(s)
  const solid = useSolidBg(s)
  return (
    <header ref={m.ref} className="relative transition-colors duration-300" style={{ background: m.open ? solid : undefined }}>
      <W className="flex h-[72px] items-center justify-between gap-6">
        <Brand s={s} size={bsz(s)} />
        {!m.narrow && <Links s={s} className="text-[14.5px] font-medium" linkClass="text-[color-mix(in_srgb,var(--fg)_80%,transparent)]" />}
        <div className="flex items-center gap-2">
          {!m.narrow && <Btn s={s} look="ghost" size="sm" className="hover:bg-[color-mix(in_srgb,var(--fg)_12%,transparent)]" style={OUTLINE} />}
          {m.toggle}
        </div>
      </W>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[71px] h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--line) 20%, var(--line) 80%, transparent)' }} />
      {m.panel(<Btn s={s} size="md" className="flex-1" />)}
    </header>
  )
}

/** Height must match the -64px bottom margin preset. */
function NavGlass({ s }: { s: Section }) {
  const m = useMobileMenu(s)
  const solid = useSolidBg(s)
  return (
    <header ref={m.ref} className="relative">
      <div aria-hidden className="absolute inset-0 backdrop-blur-xl backdrop-saturate-150" style={{ background: `color-mix(in srgb, ${solid} 70%, transparent)`, boxShadow: 'inset 0 -1px 0 var(--line), 0 10px 30px -18px rgba(0,0,0,.35)' }} />
      <W className="relative flex h-16 items-center justify-between gap-6">
        <Brand s={s} mark="soft" size={bsz(s)} />
        {!m.narrow && <Links s={s} className="text-[14px] font-medium" />}
        <div className="flex items-center gap-2">
          {!m.narrow && <Btn s={s} size="sm" className="shadow-[0_6px_20px_-8px_var(--btn-bg)]" />}
          {m.toggle}
        </div>
      </W>
      <div className="relative">{m.panel(<Btn s={s} size="md" className="flex-1" />)}</div>
    </header>
  )
}

function NavPill({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 960 })
  return (
    <header ref={m.ref} className="relative py-4">
      <W>
        <div
          className="overflow-hidden transition-[border-radius] duration-300"
          style={{
            background: 'color-mix(in srgb, var(--fg) 6%, var(--bg))',
            boxShadow: 'inset 0 0 0 1px var(--line), 0 14px 34px -22px rgba(0,0,0,.45)',
            borderRadius: m.open ? 'min(var(--r-card), 24px)' : 'calc(var(--r-btn) + min(var(--r-btn), 11px))',
          }}
        >
          <div className="flex h-[58px] items-center justify-between gap-4 pl-5 pr-[11px]">
            <Brand s={s} mark="solid" size={bsz(s) - 2} />
            {!m.narrow && <Links s={s} className="flex-1 justify-center text-[14px] font-medium" />}
            <div className="flex items-center gap-1">
              {!m.narrow && <Btn s={s} size="sm" />}
              {m.toggle}
            </div>
          </div>
          {m.panel(<Btn s={s} size="md" className="flex-1" />)}
        </div>
      </W>
    </header>
  )
}

const MEGA_ICONS = [Zap, Cpu, Puzzle, LayoutTemplate, MapIcon, CircleHelp, Sparkles]

function NavMega({ s }: { s: Section }) {
  const b = useB()
  const m = useMobileMenu(s, { breakpoint: 960 })
  const solid = useSolidBg(s)
  const { head, body } = useType(s)
  const pid = useId()
  const [hover, setHover] = useState(false)
  const n = s.items.length
  const inPanel = n > 3 ? s.items.slice(0, n - 2) : s.items
  const inBar = n > 3 ? s.items.slice(n - 2) : []
  const sel = b.selection?.sectionId === s.id ? b.selection.el : undefined
  const keep = !!sel && (sel.startsWith('mega') || inPanel.some((i) => sel.startsWith(`items.${i.id}.`)))
  const open = !m.narrow && (hover || keep)
  return (
    <header
      ref={m.ref}
      className="relative"
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => e.key === 'Escape' && setHover(false)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHover(false)}
    >
      <W className="flex h-[68px] items-center justify-between gap-6">
        <Brand s={s} mark="square" size={bsz(s)} />
        {!m.narrow && (
          <nav aria-label="Ana menü" data-grid={s.id} className="flex items-center text-[14.5px] font-medium" style={{ columnGap: getGrid(s).gapX }}>
            <div className={cn('flex items-center gap-0.5', open ? 'text-[var(--fg)]' : 'text-[var(--muted)]')} onMouseEnter={() => setHover(true)}>
              <E s={s} el="megaLabel" kind="link" as="a" hint="a" className="transition-colors hover:text-[var(--fg)]" />
              <button type="button" aria-expanded={open} aria-controls={pid} aria-label="Ürün menüsünü aç" onClick={() => setHover((o) => !o)} className="grid size-6 place-items-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]">
                <ChevronDown size={15} className={cn('transition-transform duration-300', open && 'rotate-180')} aria-hidden />
              </button>
            </div>
            {inBar.map((i) => (
              <span key={i.id} onMouseEnter={() => setHover(false)}>
                <L s={s} i={i} />
              </span>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {!m.narrow && <Btn s={s} size="sm" />}
          {m.toggle}
        </div>
      </W>
      <AnimatePresence>
        {open && (
          <motion.div
            id={pid}
            key="mega"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease }}
            className="absolute inset-x-0 top-full z-40"
            style={{ background: solid, color: 'var(--fg)', boxShadow: 'inset 0 1px 0 var(--line), 0 1px 0 var(--line), 0 40px 60px -30px rgba(0,0,0,.4)' }}
          >
            <W className="grid gap-8 py-8 @5xl:grid-cols-[260px_1fr]">
              <div className="flex flex-col justify-between gap-6 @5xl:pr-8 @5xl:shadow-[inset_-1px_0_0_var(--line)]">
                <div>
                  <E s={s} el="megaTitle" kind="heading" as="h3" hint="h3" className="block text-balance" style={head(20)} />
                  <E s={s} el="megaText" kind="text" as="p" hint="p" multiline className="mt-3 block text-[14px] leading-relaxed" style={body} />
                </div>
                <div aria-hidden className="h-20 rounded-[min(var(--r-card),14px)]" style={{ background: 'radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--accent) 45%, transparent), transparent 60%), color-mix(in srgb, var(--fg) 5%, transparent)', boxShadow: 'inset 0 0 0 1px var(--line)' }} />
              </div>
              <ul className="grid grid-cols-2 gap-1.5 @6xl:grid-cols-3">
                {inPanel.map((i, k) => {
                  const Icon = MEGA_ICONS[k % MEGA_ICONS.length]
                  return (
                    <li key={i.id} className="flex gap-3.5 rounded-[min(var(--r-card),14px)] p-3.5 transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)]">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[min(var(--r-card),10px)]" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                        <Icon size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <L s={s} i={i} className="block text-[15px] font-semibold text-[var(--fg)]! hover:opacity-80" />
                        <E s={s} el={`items.${i.id}.text`} kind="text" as="p" hint="p" className="mt-1 block text-[13.5px] leading-snug" style={{ color: 'var(--muted)' }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </W>
          </motion.div>
        )}
      </AnimatePresence>
      {m.panel(<Btn s={s} size="md" className="flex-1" />)}
    </header>
  )
}

function NavAnnounce({ s }: { s: Section }) {
  const m = useMobileMenu(s)
  return (
    <header ref={m.ref} className="relative">
      <div className="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-[13px] font-medium" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
        <Sparkles size={14} className="shrink-0 opacity-80" aria-hidden />
        <E s={s} el="announce" kind="text" />
        <span className="inline-flex items-center gap-1">
          <E s={s} el="announceLink" kind="link" as="a" hint="a" className="font-semibold underline decoration-[color-mix(in_srgb,currentColor_45%,transparent)] underline-offset-4 hover:decoration-current" />
          <span aria-hidden>→</span>
        </span>
      </div>
      <W className="flex h-[68px] items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Brand s={s} size={bsz(s)} />
          {!m.narrow && <span aria-hidden className="h-5 w-px" style={{ background: 'var(--line)' }} />}
          {!m.narrow && <Links s={s} className="text-[14.5px] font-medium" />}
        </div>
        <div className="flex items-center gap-2">
          {!m.narrow && <Btn s={s} size="sm" />}
          {m.toggle}
        </div>
      </W>
      {m.panel(<Btn s={s} size="md" className="flex-1" />)}
    </header>
  )
}

function NavSearch({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 1100 })
  return (
    <header ref={m.ref} className="relative" style={{ boxShadow: 'inset 0 -1px 0 var(--line)' }}>
      <W className="flex h-[68px] items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-9">
          <Brand s={s} mark="soft" size={bsz(s)} />
          {!m.narrow && <Links s={s} className="text-[14.5px] font-medium" />}
        </div>
        <div className="flex items-center gap-3">
          {!m.narrow && <SearchBox s={s} kbd className="w-[230px]" />}
          {!m.narrow && <Btn s={s} size="sm" />}
          {m.toggle}
        </div>
      </W>
      {m.panel(
        <>
          <SearchBox s={s} kbd className="w-full" />
          <Btn s={s} size="md" className="flex-1" />
        </>,
      )}
    </header>
  )
}

function NavTwoCta({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 1024 })
  return (
    <header ref={m.ref} className="relative">
      <W className="flex h-[72px] items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-10">
          <Brand s={s} mark="solid" size={bsz(s)} />
          {!m.narrow && <Links s={s} className="text-[14.5px] font-medium" />}
        </div>
        <div className="flex items-center gap-2">
          {!m.narrow && <E s={s} el="login" kind="link" as="a" hint="a" className="inline-flex h-9 items-center px-3.5 text-[14px] font-semibold transition-opacity hover:opacity-70" />}
          {!m.narrow && <Btn s={s} size="sm" />}
          {m.toggle}
        </div>
      </W>
      {m.panel(
        <>
          <E s={s} el="login" kind="link" as="a" hint="a" className="inline-flex h-11 flex-1 items-center justify-center px-5 text-[14.5px] font-semibold" style={{ ...OUTLINE, borderRadius: 'var(--r-btn)' }} />
          <Btn s={s} size="md" className="flex-1" />
        </>,
      )}
    </header>
  )
}

function NavDark({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 1024 })
  return (
    <header ref={m.ref} className="relative">
      <W className="flex h-16 items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-6">
          <Brand s={s} mark="square" size={bsz(s) - 1} />
          {!m.narrow && <span aria-hidden className="h-5 w-px" style={{ background: 'var(--line)' }} />}
          {!m.narrow && <Links s={s} className="text-[12px] font-semibold uppercase tracking-[.14em]" />}
        </div>
        <div className="flex items-center gap-2">
          {!m.narrow && <Btn s={s} look="fg" size="sm" />}
          {m.toggle}
        </div>
      </W>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--accent) 35%, var(--accent) 65%, transparent)', opacity: 0.7 }} />
      {m.panel(<Btn s={s} look="fg" size="md" className="flex-1" />)}
    </header>
  )
}

function NavMinimal({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 900 })
  const cta = 'inline-flex items-center text-[14px] font-medium underline decoration-1 underline-offset-[6px] transition-[text-decoration-thickness] hover:decoration-2'
  return (
    <header ref={m.ref} className="relative">
      <W className="flex h-[84px] items-center justify-between gap-6">
        <Brand s={s} mark="none" size={bsz(s)} nameClass="font-medium tracking-[-0.03em]" />
        <div className="flex items-center gap-10">
          {!m.narrow && <Links s={s} className="text-[14px]" linkClass="text-[var(--fg)]! opacity-60 transition-opacity hover:opacity-100" />}
          {!m.narrow && <E s={s} el="primary" kind="button" as="a" hint="a" className={cta} />}
          {m.toggle}
        </div>
      </W>
      {m.panel(<E s={s} el="primary" kind="button" as="a" hint="a" className={cta} />)}
    </header>
  )
}

function NavDrawer({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 99999, sheet: true })
  const tight = useNarrow(m.ref, 640)
  const mid = useNarrow(m.ref, 960)
  return (
    <header ref={m.ref} className="relative">
      <W className="relative flex h-[76px] items-center justify-between gap-4">
        <Brand s={s} mark="solid" size={bsz(s)} />
        {!mid && s.content.tagline !== undefined && (
          <E s={s} el="tagline" kind="text" className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[13.5px]" style={{ color: 'var(--muted)' }} />
        )}
        <div className="flex items-center gap-3">
          {!tight && <Btn s={s} size="sm" />}
          <div className="rounded-full" style={{ boxShadow: 'inset 0 0 0 1px var(--line)' }}>
            {m.toggle}
          </div>
        </div>
      </W>
      {m.panel(tight ? <Btn s={s} size="md" className="flex-1" /> : undefined)}
    </header>
  )
}

function NavDoubleRow({ s }: { s: Section }) {
  const m = useMobileMenu(s)
  return (
    <header ref={m.ref} className="relative">
      <div className="text-[12.5px]" style={{ background: 'color-mix(in srgb, var(--fg) 4%, var(--bg))', boxShadow: 'inset 0 -1px 0 var(--line)', color: 'var(--muted)' }}>
        <W className="flex h-10 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <Phone size={13} className="shrink-0" aria-hidden />
              <E s={s} el="phone" kind="link" as="a" hint="a" className="whitespace-nowrap transition-colors hover:text-[var(--fg)]" />
            </span>
            <span className="inline-flex items-center gap-1.5 @max-xl:hidden">
              <Mail size={13} className="shrink-0" aria-hidden />
              <E s={s} el="email" kind="link" as="a" hint="a" className="whitespace-nowrap transition-colors hover:text-[var(--fg)]" />
            </span>
          </div>
          <Social s={s} size={15} className="gap-3" />
        </W>
      </div>
      <W className="flex h-[68px] items-center justify-between gap-6">
        <Brand s={s} size={bsz(s)} />
        <div className="flex items-center gap-7">
          {!m.narrow && <Links s={s} className="text-[14.5px] font-medium" />}
          {!m.narrow && <Btn s={s} size="sm" />}
          {m.toggle}
        </div>
      </W>
      {m.panel(<Btn s={s} size="md" className="flex-1" />)}
    </header>
  )
}

function IconBtn({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} className="relative grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]">
      {children}
    </button>
  )
}

function NavShop({ s }: { s: Section }) {
  const m = useMobileMenu(s)
  const promo = 'text-[13.5px] font-semibold transition-opacity hover:opacity-75'
  return (
    <header ref={m.ref} className="relative">
      <W className="flex h-[72px] items-center gap-3 @3xl:gap-6">
        {m.narrow && <div className="-ml-2">{m.toggle}</div>}
        <Brand s={s} mark="square" size={bsz(s)} />
        {!m.narrow && <SearchBox s={s} round className="mx-auto h-11 w-full max-w-[520px] flex-1" />}
        <div className={cn('flex items-center gap-1', m.narrow && 'ml-auto')}>
          <IconBtn label="Hesabım">
            <User size={20} aria-hidden />
          </IconBtn>
          <IconBtn label="Sepet">
            <ShoppingBag size={20} aria-hidden />
            {s.content.cart !== undefined && (
              <Slot s={s} el="cart" as="span" className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-bold leading-none" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
                {s.content.cart}
              </Slot>
            )}
          </IconBtn>
        </div>
      </W>
      {m.narrow && (
        <W className="pb-3">
          <SearchBox s={s} round className="h-11 w-full" />
        </W>
      )}
      {!m.narrow && (
        <div style={{ boxShadow: 'inset 0 1px 0 var(--line), inset 0 -1px 0 var(--line)' }}>
          <W className="flex h-12 items-center justify-between gap-6">
            <Links s={s} label="Kategoriler" className="text-[14px] font-medium" />
            <E s={s} el="primary" kind="button" as="a" hint="a" className={promo} style={{ color: 'var(--accent)' }} />
          </W>
        </div>
      )}
      {m.panel(<Btn s={s} size="md" className="flex-1" />)}
    </header>
  )
}

function NavBrandBar({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 1024 })
  return (
    <header ref={m.ref} className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(520px 140px at 12% -20%, color-mix(in srgb, #fff 22%, transparent), transparent 70%), radial-gradient(420px 120px at 92% 140%, color-mix(in srgb, #000 18%, transparent), transparent 70%)' }} />
      <W className="relative flex h-[72px] items-center justify-between gap-6">
        <Brand s={s} mark="solid" size={bsz(s) + 1} nameClass="font-bold" />
        <div className="flex items-center gap-7">
          {!m.narrow && (
            <Links
              s={s}
              className="text-[14.5px] font-semibold"
              linkClass="text-[var(--fg)]! opacity-85 transition-opacity hover:opacity-100"
              sep={
                <span aria-hidden className="select-none opacity-35">
                  /
                </span>
              }
            />
          )}
          {!m.narrow && <Btn s={s} size="sm" className="shadow-[0_8px_24px_-10px_rgba(0,0,0,.45)]" />}
          {m.toggle}
        </div>
      </W>
      <div className="relative">{m.panel(<Btn s={s} size="md" className="flex-1" />)}</div>
    </header>
  )
}

function NavEditorial({ s }: { s: Section }) {
  const m = useMobileMenu(s)
  const { title } = useType(s)
  return (
    <header ref={m.ref} className="relative">
      <W>
        <div className="flex h-11 items-center justify-between gap-4 text-[11.5px] font-semibold uppercase tracking-[.18em]" style={{ color: 'var(--muted)', boxShadow: 'inset 0 -1px 0 var(--line)' }}>
          <E s={s} el="tagline" kind="text" className="truncate" />
          {!m.narrow && <E s={s} el="primary" kind="button" as="a" hint="a" className="shrink-0 text-[var(--fg)] underline-offset-4 hover:underline" />}
        </div>
        <div className={cn('flex items-center', m.narrow ? 'justify-between py-4' : 'justify-center py-7')}>
          <E s={s} el="brand" kind="heading" as="a" hint="a" className="block" style={{ ...title(bsz(s) * 2.6, 30), lineHeight: 1 }} />
          {m.toggle}
        </div>
        {!m.narrow && (
          <div className="border-y-[3px] border-double py-3" style={{ borderColor: 'var(--fg)' }}>
            <Links s={s} className="justify-center text-[12.5px] font-semibold uppercase tracking-[.16em]" />
          </div>
        )}
      </W>
      {m.panel(<Btn s={s} size="md" className="flex-1" />)}
    </header>
  )
}

function NavBoxed({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 1024 })
  const line = 'color-mix(in srgb, var(--fg) 16%, transparent)'
  return (
    <header ref={m.ref} className="relative py-4">
      <W>
        <div className="flex h-14 items-stretch overflow-hidden" style={{ boxShadow: `inset 0 0 0 1px ${line}`, borderRadius: 'min(var(--r-card), 12px)' }}>
          <div className="flex items-center px-5" style={{ boxShadow: `inset -1px 0 0 ${line}` }}>
            <Brand s={s} mark="square" size={bsz(s) - 1} />
          </div>
          <div className="flex flex-1 items-center px-6">{!m.narrow && <Links s={s} className="text-[14px] font-medium" />}</div>
          {!m.narrow && <Btn s={s} size="md" className="h-auto! px-7" style={{ borderRadius: 0 }} />}
          {m.narrow && (
            <div className="grid place-items-center px-2" style={{ boxShadow: `inset 1px 0 0 ${line}` }}>
              {m.toggle}
            </div>
          )}
        </div>
      </W>
      <W>{m.panel(<Btn s={s} size="md" className="flex-1" />)}</W>
    </header>
  )
}

function NavTabs({ s }: { s: Section }) {
  const m = useMobileMenu(s, { breakpoint: 1024 })
  const gap = Math.max(2, getGrid(s).gapX - 20)
  return (
    <header ref={m.ref} className="relative">
      <W className="grid h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-6">
        <Brand s={s} mark="ring" size={bsz(s)} />
        {m.narrow ? (
          <span />
        ) : (
          <nav aria-label="Ana menü" data-grid={s.id} className="flex items-center p-1 text-[14px] font-medium" style={{ columnGap: gap, background: 'color-mix(in srgb, var(--fg) 7%, transparent)', borderRadius: 'calc(var(--r-btn) + min(var(--r-btn), 4px))', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
            {s.items.map((i, k) => (
              <L
                key={i.id}
                s={s}
                i={i}
                className="inline-flex h-9 items-center whitespace-nowrap border border-transparent px-4 hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]"
                style={{ borderRadius: 'var(--r-btn)', ...(k === 0 ? { background: 'var(--bg)', color: 'var(--fg)', borderColor: 'var(--line)' } : {}) }}
              />
            ))}
          </nav>
        )}
        <div className="flex items-center justify-end gap-2">
          {!m.narrow && <Btn s={s} size="sm" />}
          {m.toggle}
        </div>
      </W>
      {m.panel(<Btn s={s} size="md" className="flex-1" />)}
    </header>
  )
}

/* ---------- Registry ---------- */
export const NAV: KindVariants = {
  kind: 'nav',
  fields: [
    { key: 'announce', label: 'Duyuru metni', el: 'text', def: "Pursae 0.1 yayında: WASM eklenti SDK'sı ve Golementor önizlemesi", group: 'Duyuru' },
    { key: 'announceLink', label: 'Duyuru bağlantısı', el: 'link', def: 'Sürüm notları', group: 'Duyuru' },
    { key: 'search', label: 'Arama kutusu yazısı', el: 'text', def: 'Belgelerde ve eklentilerde ara…', hint: 'Arama kutusunda görünen yer tutucu metin' },
    { key: 'login', label: 'Giriş bağlantısı', el: 'link', def: 'Giriş yap' },
    { key: 'phone', label: 'Telefon', el: 'link', def: '+90 212 555 01 01', group: 'İletişim' },
    { key: 'email', label: 'E-posta', el: 'link', def: 'merhaba@pursae.dev', group: 'İletişim' },
    { key: 'social', label: 'Sosyal ağlar', el: 'text', def: 'instagram, x, linkedin, youtube', group: 'İletişim', hint: 'Virgülle ayırın; adres eklemek için ad|https://… yazın' },
    { key: 'cart', label: 'Sepet adedi', el: 'badge', def: '2' },
    { key: 'tagline', label: 'Kısa slogan', el: 'text', def: 'Go ile yeniden yazılmış WordPress' },
    { key: 'megaLabel', label: 'Açılır menü bağlantısı', el: 'link', def: 'Ürün', group: 'Mega menü' },
    { key: 'megaTitle', label: 'Panel başlığı', el: 'heading', def: 'Tek binary, eksiksiz platform', group: 'Mega menü' },
    { key: 'megaText', label: 'Panel açıklaması', el: 'text', def: 'PostgreSQL, WASM eklentiler ve Golementor sayfa oluşturucu tek bir Go uygulamasında.', multiline: true, group: 'Mega menü' },
  ],
  variants: [
    { id: 'default', name: 'Klasik', tags: ['Modern', 'SaaS'], blurb: 'Logo solda, menü ve buton sağda.' },
    { id: 'centered-logo', name: 'Ortada logo', tags: ['Modern', 'Ajans'], blurb: 'Logo ortada; bağlantılar iki yana bölünür, buton sağ uçta.', C: NavCenteredLogo },
    { id: 'split', name: 'Ortalı menü', tags: ['Modern', 'SaaS'], blurb: 'Logo solda, bağlantılar tam ortada, buton sağda.', C: NavSplit },
    {
      id: 'transparent',
      name: 'Şeffaf (hero üstü)',
      tags: ['Modern', 'Cesur'],
      blurb: 'Arka plansız menü bir sonraki bölümün üstüne biner; karşılama görseliyle bütünleşir.',
      C: NavTransparent,
      style: { palette: 'brand', bg: 'transparent' },
      box: { margin: { t: 0, r: 0, b: -72, l: 0 }, zIndex: 10 },
    },
    {
      id: 'glass-sticky',
      name: 'Cam efektli yapışkan',
      tags: ['Glass', 'Modern', 'SaaS'],
      blurb: 'Yarı saydam, bulanık cam şerit; sayfa kayarken üstte sabit kalır.',
      C: NavGlass,
      style: { bg: 'transparent', motion: { sticky: true } },
      box: { margin: { t: 0, r: 0, b: -64, l: 0 }, zIndex: 10 },
    },
    { id: 'pill', name: 'Kapsül', tags: ['Modern', 'Minimal'], blurb: 'Bölüm zemininde yüzen, iç boşluklu yuvarlak kapsül menü.', C: NavPill },
    {
      id: 'mega',
      name: 'Mega menü',
      tags: ['Kurumsal', 'SaaS'],
      blurb: 'Üzerine gelince açılan geniş panel; bağlantılar ikon ve açıklamalarıyla listelenir.',
      C: NavMega,
      extras: ['megaLabel', 'megaTitle', 'megaText'],
      box: { zIndex: 20 },
    },
    { id: 'announce', name: 'Duyurulu', tags: ['SaaS', 'Modern'], blurb: 'Üstte vurgulu duyuru şeridi, altında klasik menü.', C: NavAnnounce, extras: ['announce', 'announceLink'] },
    { id: 'search', name: 'Aramalı', tags: ['SaaS', 'Kurumsal'], blurb: 'Bağlantıların yanında kısayol ipuçlu arama kutusu.', C: NavSearch, extras: ['search'] },
    { id: 'two-cta', name: 'İki butonlu', tags: ['SaaS', 'Modern'], blurb: 'Bağlantılar logonun yanında; sağda giriş bağlantısı ve ana buton.', C: NavTwoCta, extras: ['login'] },
    { id: 'dark-solid', name: 'Koyu çizgili', tags: ['Koyu', 'Cesur'], blurb: 'Koyu zemin, büyük harfli bağlantılar ve altta parlayan vurgu çizgisi.', C: NavDark, style: { palette: 'dark' } },
    { id: 'minimal', name: 'Ultra minimal', tags: ['Minimal', 'Portfolyo'], blurb: 'Yalnızca site adı ve yazı bağlantıları; buton altı çizili bir bağlantı.', C: NavMinimal, style: { palette: 'light' } },
    {
      id: 'drawer',
      name: 'Çekmece menü',
      tags: ['Minimal', 'Ajans', 'Portfolyo'],
      blurb: 'Menü her ekranda hamburger düğmesinin açtığı yan kartta durur.',
      C: NavDrawer,
      extras: ['tagline'],
      box: { zIndex: 20 },
    },
    { id: 'double-row', name: 'Çift satır', tags: ['Kurumsal'], blurb: 'Üstte telefon, e-posta ve sosyal ağlar; altta ana menü.', C: NavDoubleRow, extras: ['phone', 'email', 'social'] },
    { id: 'shop', name: 'E-ticaret', tags: ['E-ticaret', 'Modern'], blurb: 'Geniş arama, hesap ve sepet ikonları; kategoriler ikinci satırda.', C: NavShop, extras: ['search', 'cart'] },
    { id: 'brand-bar', name: 'Marka renkli', tags: ['Cesur', 'Gradient'], blurb: 'Marka renginde parlak şerit; bağlantılar eğik çizgiyle ayrılır.', C: NavBrandBar, style: { palette: 'brand' } },
    {
      id: 'editorial',
      name: 'Editoryal',
      tags: ['Editoryal', 'Portfolyo'],
      blurb: 'Gazete başlığı gibi ortada büyük site adı, altında çift çizgili bağlantı satırı.',
      C: NavEditorial,
      extras: ['tagline'],
      hide: ['logo'],
      style: { palette: 'sand' },
    },
    { id: 'boxed', name: 'Çerçeveli', tags: ['Minimal', 'Cesur'], blurb: 'İnce çizgilerle hücrelere bölünmüş kutu menü; buton bir hücreyi doldurur.', C: NavBoxed },
    { id: 'tabs', name: 'Sekmeli', tags: ['Modern', 'SaaS'], blurb: 'Bağlantılar ortada segmentli bir sekme rayında; ilki etkin görünür.', C: NavTabs },
  ],
}
