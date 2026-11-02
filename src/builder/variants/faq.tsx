import { useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChevronDown, MessageCircle, Plus, Search, Sparkles } from 'lucide-react'
import { getGrid } from '../data'
import type { Item, Section } from '../types'
import { ease } from '../ui'
import { Btn, E, ECard, Slot, W, cn, secPad, useType } from './kit'
import type { KindVariants } from './types'

const plain = (v?: string) => (v ?? '').replace(/<[^>]+>/g, '')
const pad = (n: number) => String(n).padStart(2, '0')

/* ---------- Accordion bits ---------- */
type Acc = { open: boolean; panel: string; toggle: () => void }

/** Open state of the questions (several may be open; the first starts open). */
function useAcc(s: Section) {
  const uid = useId()
  const [open, setOpen] = useState<string[]>(() => (s.items[0] ? [s.items[0].id] : []))
  return (id: string): Acc => ({
    open: open.includes(id),
    panel: `${uid}-${id}`,
    toggle: () => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id])),
  })
}

function Toggle({ a, className, style, children }: { a: Acc; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-expanded={a.open}
      aria-controls={a.panel}
      aria-label={a.open ? 'Cevabı gizle' : 'Cevabı göster'}
      onClick={(e) => {
        e.stopPropagation()
        a.toggle()
      }}
      className={cn('grid shrink-0 place-items-center transition-[background-color,color,box-shadow] duration-300', className)}
      style={style}
    >
      {children}
    </button>
  )
}

function Panel({ a, children }: { a: Acc; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {a.open && (
        <motion.div key="a" id={a.panel} role="region" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease }} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const Chevron = ({ open, size = 17 }: { open: boolean; size?: number }) => <ChevronDown size={size} aria-hidden className={cn('transition-transform duration-300', open && 'rotate-180')} />

function Question({ s, i, size = 17, className, style }: { s: Section; i: Item; size?: number; className?: string; style?: CSSProperties }) {
  return <E s={s} el={`items.${i.id}.title`} kind="heading" as="h3" hint="h3" className={cn('block leading-snug', className)} style={{ fontSize: size, fontWeight: 600, ...style }} />
}

function Answer({ s, i, size = 15.5, className, style }: { s: Section; i: Item; size?: number; className?: string; style?: CSSProperties }) {
  const { body } = useType(s)
  return <E s={s} el={`items.${i.id}.text`} kind="text" as="p" hint="p" multiline className={cn('block leading-[1.7]', className)} style={{ ...body, fontSize: body.fontSize ?? size, ...style }} />
}

function Head({ s, center, scale = 1, className }: { s: Section; center?: boolean; scale?: number; className?: string }) {
  const { title } = useType(s)
  return (
    <div className={cn(center && 'mx-auto text-center', className)}>
      <E s={s} el="eyebrow" kind="badge" className="inline-block text-[12.5px] font-semibold uppercase tracking-[.14em]" style={{ color: 'var(--accent)' }} />
      <E s={s} el="title" kind="heading" as="h2" hint="h2" className="mt-4 block text-balance" style={title(s.style.titleSize * scale, 30)} />
    </div>
  )
}

/* ---------- Designs ---------- */
function FaqCentered({ s }: { s: Section }) {
  const acc = useAcc(s)
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[840px]">
        <Head s={s} center className="max-w-2xl" />
        <div data-grid={s.id} className="mt-14 border-t" style={{ borderColor: 'var(--line)' }}>
          {s.items.map((i) => {
            const a = acc(i.id)
            return (
              <ECard key={i.id} s={s} id={i.id} className="border-b" style={{ borderColor: 'var(--line)' }}>
                <div className="flex cursor-pointer items-center justify-between gap-6" style={{ paddingBlock: g.gapY / 2 }} onClick={a.toggle}>
                  <Question s={s} i={i} size={18} />
                  <Toggle a={a} className="size-9 rounded-full" style={{ background: a.open ? 'var(--btn-bg)' : 'color-mix(in srgb, var(--fg) 7%, transparent)', color: a.open ? 'var(--btn-fg)' : 'var(--fg)' }}>
                    <Chevron open={a.open} />
                  </Toggle>
                </div>
                <Panel a={a}>
                  <Answer s={s} i={i} className="-mt-1 pr-14" style={{ paddingBottom: g.gapY / 2 }} />
                </Panel>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

function FaqGrid({ s }: { s: Section }) {
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} className="max-w-2xl" />
        <div data-grid={s.id} className="mt-14 grid gap-x-14 @3xl:grid-cols-2" style={{ rowGap: g.gapY }}>
          {s.items.map((i) => (
            <ECard key={i.id} s={s} id={i.id} className="flex gap-4 border-t pt-7" style={{ borderColor: 'var(--line)' }}>
              <span aria-hidden className="mt-[1px] grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold" style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
                ?
              </span>
              <div className="min-w-0">
                <Question s={s} i={i} size={18} />
                <Answer s={s} i={i} className="mt-3" />
              </div>
            </ECard>
          ))}
        </div>
      </W>
    </div>
  )
}

function FaqPlusCards({ s }: { s: Section }) {
  const acc = useAcc(s)
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[900px]">
        <Head s={s} center className="max-w-2xl" />
        <div data-grid={s.id} className="mt-14 flex flex-col" style={{ rowGap: Math.max(8, Math.round(g.gapY * 0.3)) }}>
          {s.items.map((i) => {
            const a = acc(i.id)
            return (
              <ECard key={i.id} s={s} id={i.id} className="rounded-[var(--r-card)] transition-shadow duration-300" style={{ background: 'var(--card)', boxShadow: a.open ? '0 24px 50px -32px rgba(0,0,0,.35), inset 0 0 0 1px var(--line)' : 'inset 0 0 0 1px color-mix(in srgb, var(--line) 60%, transparent)' }}>
                <div className="flex cursor-pointer items-center justify-between gap-5 px-6 py-5 @3xl:px-8 @3xl:py-6" onClick={a.toggle}>
                  <Question s={s} i={i} />
                  <Toggle a={a} className="size-9 rounded-[min(var(--r-btn),12px)]" style={{ background: a.open ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 13%, transparent)', color: a.open ? 'var(--bg)' : 'var(--accent)' }}>
                    <Plus size={18} strokeWidth={2.2} aria-hidden className={cn('transition-transform duration-300', a.open && 'rotate-45')} />
                  </Toggle>
                </div>
                <Panel a={a}>
                  <Answer s={s} i={i} className="px-6 pb-6 pr-16 @3xl:px-8 @3xl:pb-7 @3xl:pr-20" />
                </Panel>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

function FaqNumbered({ s }: { s: Section }) {
  const { head } = useType(s)
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} className="max-w-3xl" />
        <ol data-grid={s.id} className="mt-14 border-t-2" style={{ borderColor: 'var(--fg)' }}>
          {s.items.map((i, n) => (
            <ECard key={i.id} s={s} id={i.id} as="li" className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-5 gap-y-3 border-b @4xl:grid-cols-[96px_minmax(0,1fr)_minmax(0,1.3fr)] @4xl:gap-x-10" style={{ borderColor: 'var(--line)', paddingBlock: Math.round(g.gapY * 0.7) }}>
              <span aria-hidden className="row-span-2 tabular-nums leading-none @4xl:row-span-1" style={{ ...head(30), color: 'var(--accent)' }}>
                {pad(n + 1)}
              </span>
              <Question s={s} i={i} size={19} />
              <Answer s={s} i={i} className="col-start-2 @4xl:col-start-3" />
            </ECard>
          ))}
        </ol>
      </W>
    </div>
  )
}

function FaqSidebar({ s }: { s: Section }) {
  const acc = useAcc(s)
  const g = getGrid(s)
  const { head } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="grid gap-12 @4xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] @4xl:gap-16">
        <div className="flex flex-col gap-10 @4xl:self-start">
          <Head s={s} />
          <aside className="rounded-[var(--r-card)] border p-7" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <span aria-hidden className="grid size-11 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
              <MessageCircle size={20} />
            </span>
            <E s={s} el="ctaTitle" kind="heading" as="h3" hint="h3" className="mt-5 block" style={head(20)} />
            <E s={s} el="ctaText" kind="text" as="p" hint="p" multiline className="mt-2 block text-[15px] leading-relaxed" style={{ color: 'var(--muted)' }} />
            <Btn s={s} el="primary" size="md" className="mt-6" />
          </aside>
        </div>
        <div data-grid={s.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
          {s.items.map((i) => {
            const a = acc(i.id)
            return (
              <ECard key={i.id} s={s} id={i.id} className="border-b" style={{ borderColor: 'var(--line)' }}>
                <div className="flex cursor-pointer items-start justify-between gap-6" style={{ paddingBlock: g.gapY / 2 }} onClick={a.toggle}>
                  <Question s={s} i={i} className="pt-1" />
                  <Toggle a={a} className="size-8 rounded-full border" style={{ borderColor: a.open ? 'var(--accent)' : 'var(--line)', color: a.open ? 'var(--accent)' : 'var(--fg)' }}>
                    <Plus size={16} aria-hidden className={cn('transition-transform duration-300', a.open && 'rotate-45')} />
                  </Toggle>
                </div>
                <Panel a={a}>
                  <Answer s={s} i={i} className="-mt-1 pr-14" style={{ paddingBottom: g.gapY / 2 }} />
                </Panel>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

function FaqDark({ s }: { s: Section }) {
  const acc = useAcc(s)
  const g = getGrid(s)
  return (
    <div className="relative overflow-hidden" style={secPad(s)}>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] max-w-[150%] -translate-x-1/2 -translate-y-1/2" style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 30%, transparent), transparent)' }} />
      <W className="relative max-w-[880px]">
        <Head s={s} center className="max-w-2xl" />
        <div data-grid={s.id} className="mt-14 flex flex-col" style={{ rowGap: Math.max(8, Math.round(g.gapY * 0.25)) }}>
          {s.items.map((i) => {
            const a = acc(i.id)
            return (
              <ECard key={i.id} s={s} id={i.id} className="relative overflow-hidden rounded-[var(--r-card)] border transition-colors duration-300" style={{ borderColor: a.open ? 'color-mix(in srgb, var(--accent) 40%, var(--line))' : 'var(--line)', background: a.open ? 'color-mix(in srgb, var(--accent) 8%, var(--card))' : 'color-mix(in srgb, var(--fg) 3%, transparent)' }}>
                <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] transition-opacity duration-300" style={{ background: 'var(--accent)', opacity: a.open ? 1 : 0 }} />
                <div className="flex cursor-pointer items-center justify-between gap-5 px-6 py-5" onClick={a.toggle}>
                  <Question s={s} i={i} />
                  <Toggle a={a} className="size-8 rounded-full" style={{ color: a.open ? 'var(--accent)' : 'var(--muted)', background: 'color-mix(in srgb, var(--fg) 6%, transparent)' }}>
                    <Chevron open={a.open} size={16} />
                  </Toggle>
                </div>
                <Panel a={a}>
                  <Answer s={s} i={i} className="px-6 pb-6 pr-16" />
                </Panel>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

function FaqBordered({ s }: { s: Section }) {
  const acc = useAcc(s)
  const g = getGrid(s)
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} className="max-w-2xl" />
        <div data-grid={s.id} className="mt-12 grid items-start gap-x-4 @3xl:grid-cols-2" style={{ rowGap: Math.max(10, Math.round(g.gapY * 0.4)) }}>
          {s.items.map((i, n) => {
            const a = acc(i.id)
            return (
              <ECard key={i.id} s={s} id={i.id} className="rounded-[var(--r-card)] border-[1.5px] transition-colors duration-300" style={{ borderColor: a.open ? 'var(--fg)' : 'var(--line)' }}>
                <div className="flex cursor-pointer items-start justify-between gap-4 p-6" onClick={a.toggle}>
                  <div className="min-w-0">
                    <span aria-hidden className="block font-mono text-[12px] tracking-[.08em]" style={{ color: a.open ? 'var(--accent)' : 'var(--muted)' }}>
                      {pad(n + 1)}
                    </span>
                    <Question s={s} i={i} className="mt-2" />
                  </div>
                  <Toggle a={a} className="size-8 rounded-full border" style={{ borderColor: 'var(--line)', background: a.open ? 'var(--fg)' : 'transparent', color: a.open ? 'var(--bg)' : 'var(--fg)' }}>
                    <Chevron open={a.open} size={16} />
                  </Toggle>
                </div>
                <Panel a={a}>
                  <Answer s={s} i={i} className="px-6 pb-6" />
                </Panel>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

function FaqMinimal({ s }: { s: Section }) {
  const acc = useAcc(s)
  const g = getGrid(s)
  const { title } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className="max-w-[1000px]">
        <Head s={s} scale={1.15} className="max-w-3xl" />
        <div data-grid={s.id} className="mt-16 border-b" style={{ borderColor: 'var(--line)' }}>
          {s.items.map((i) => {
            const a = acc(i.id)
            const py = Math.round(g.gapY * 0.65)
            return (
              <ECard key={i.id} s={s} id={i.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
                <div className="flex cursor-pointer items-center justify-between gap-8" style={{ paddingBlock: py }} onClick={a.toggle}>
                  <Question s={s} i={i} style={{ ...title(Math.round(s.style.titleSize * 0.5), 20), lineHeight: 1.25 }} />
                  <Toggle a={a} className="size-9" style={{ color: a.open ? 'var(--accent)' : 'var(--fg)' }}>
                    <Plus size={24} strokeWidth={1.4} aria-hidden className={cn('transition-transform duration-300', a.open && 'rotate-45')} />
                  </Toggle>
                </div>
                <Panel a={a}>
                  <Answer s={s} i={i} size={16.5} className="max-w-[660px]" style={{ paddingBottom: py }} />
                </Panel>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

function FaqChat({ s }: { s: Section }) {
  const g = getGrid(s)
  const bubble = 'min(var(--r-card), 22px)'
  return (
    <div style={secPad(s)}>
      <W className="max-w-[780px]">
        <Head s={s} center className="max-w-2xl" />
        <ul data-grid={s.id} className="mt-14 flex flex-col" style={{ rowGap: Math.round(g.gapY * 0.8) }}>
          {s.items.map((i) => (
            <ECard key={i.id} s={s} id={i.id} as="li" className="flex flex-col gap-3">
              <div className="flex justify-end pl-10 @2xl:pl-28">
                <div className="px-5 py-3.5" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)', borderRadius: bubble, borderBottomRightRadius: 6 }}>
                  <Question s={s} i={i} size={16} style={{ fontWeight: 500 }} />
                </div>
              </div>
              <div className="flex items-end gap-3 pr-6 @2xl:pr-20">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}>
                  <Sparkles size={16} />
                </span>
                <div className="min-w-0 border px-5 py-4" style={{ background: 'var(--card)', borderColor: 'var(--line)', borderRadius: bubble, borderBottomLeftRadius: 6 }}>
                  <Answer s={s} i={i} style={{ color: 'color-mix(in srgb, var(--fg) 82%, transparent)' }} />
                </div>
              </div>
            </ECard>
          ))}
        </ul>
        <div aria-hidden className="mt-5 flex items-center gap-3">
          <span className="size-9" />
          <span className="flex gap-1.5 border px-4 py-3.5" style={{ background: 'var(--card)', borderColor: 'var(--line)', borderRadius: bubble, borderBottomLeftRadius: 6 }}>
            {[0, 1, 2].map((k) => (
              <span key={k} className="size-1.5 rounded-full" style={{ background: 'var(--muted)', opacity: 0.4 + k * 0.25 }} />
            ))}
          </span>
        </div>
      </W>
    </div>
  )
}

function FaqTabs({ s }: { s: Section }) {
  const uid = useId()
  const [sel, setSel] = useState(s.items[0]?.id)
  const cur = s.items.find((i) => i.id === sel) ?? s.items[0]
  const n = cur ? s.items.indexOf(cur) : -1
  const tabId = (id: string) => `${uid}-t-${id}`
  const onKey = (e: KeyboardEvent) => {
    if (!cur || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    e.preventDefault()
    const next = s.items[(n + (e.key === 'ArrowDown' ? 1 : -1) + s.items.length) % s.items.length]
    setSel(next.id)
    document.getElementById(tabId(next.id))?.focus()
  }
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} className="max-w-2xl" />
        <div className="mt-12 grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] @4xl:gap-10">
          <div role="tablist" aria-orientation="vertical" aria-label="Sorular" data-grid={s.id} className="flex flex-col gap-1.5" onKeyDown={onKey}>
            {s.items.map((i, k) => {
              const on = i.id === cur?.id
              return (
                <div key={i.id} onClickCapture={() => setSel(i.id)}>
                  <ECard s={s} id={i.id} className="flex cursor-pointer items-center gap-4 rounded-[var(--r-card)] px-5 py-4 transition-[background-color,box-shadow] duration-300" style={{ background: on ? 'var(--card)' : 'transparent', boxShadow: on ? 'inset 0 0 0 1px var(--line), 0 14px 30px -24px rgba(0,0,0,.35)' : undefined }}>
                    <span aria-hidden className="w-6 shrink-0 font-mono text-[12.5px] tabular-nums" style={{ color: on ? 'var(--accent)' : 'var(--muted)' }}>
                      {pad(k + 1)}
                    </span>
                    <Question s={s} i={i} size={16} className="min-w-0 flex-1 transition-opacity" style={{ opacity: on ? 1 : 0.7 }} />
                    <button
                      type="button"
                      role="tab"
                      id={tabId(i.id)}
                      aria-selected={on}
                      aria-controls={`${uid}-panel`}
                      aria-label={plain(i.title)}
                      tabIndex={on ? 0 : -1}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSel(i.id)
                      }}
                      className="grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-300"
                      style={{ background: on ? 'var(--btn-bg)' : 'transparent', color: on ? 'var(--btn-fg)' : 'var(--muted)' }}
                    >
                      <ArrowRight size={16} aria-hidden />
                    </button>
                  </ECard>
                </div>
              )
            })}
          </div>
          {cur && (
            <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={tabId(cur.id)} className="relative self-start overflow-hidden rounded-[var(--r-card)] border p-8 @3xl:p-10" style={{ background: 'color-mix(in srgb, var(--accent) 6%, var(--card))', borderColor: 'var(--line)' }}>
              <span aria-hidden className="pointer-events-none absolute -right-4 -top-10 select-none text-[180px] font-bold leading-none" style={{ fontFamily: 'var(--f-head)', color: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}>
                ?
              </span>
              <span aria-hidden className="relative font-mono text-[12.5px] tabular-nums" style={{ color: 'var(--accent)' }}>
                {pad(n + 1)} / {pad(s.items.length)}
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={cur.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease }} className="relative">
                  <Answer s={s} i={cur} size={18} className="mt-6" style={{ color: 'var(--fg)' }} />
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </W>
    </div>
  )
}

function FaqSearch({ s }: { s: Section }) {
  const acc = useAcc(s)
  return (
    <div className="relative overflow-hidden" style={secPad(s)}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px]" style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent)' }} />
      <W className="relative max-w-[860px]">
        <Head s={s} center className="max-w-2xl" />
        <Slot s={s} el="search" className="mx-auto mt-9 flex h-14 max-w-[560px] items-center gap-3 rounded-full border px-5 text-left text-[15.5px]" style={{ background: 'var(--bg)', borderColor: 'var(--line)', boxShadow: '0 18px 40px -26px rgba(0,0,0,.35)' }}>
          <Search size={19} aria-hidden className="shrink-0" style={{ color: 'var(--muted)' }} />
          <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--muted)' }}>
            {s.content.search}
          </span>
          <kbd aria-hidden className="hidden rounded-md border px-2 py-0.5 font-mono text-[12px] @2xl:inline" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
            ⌘K
          </kbd>
        </Slot>
        <div data-grid={s.id} className="mt-12 overflow-hidden rounded-[var(--r-card)] border" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
          {s.items.map((i, n) => {
            const a = acc(i.id)
            return (
              <ECard key={i.id} s={s} id={i.id} className={cn(n > 0 && 'border-t')} style={{ borderColor: 'var(--line)' }}>
                <div className="flex cursor-pointer items-center justify-between gap-5 px-6 py-5" onClick={a.toggle}>
                  <Question s={s} i={i} />
                  <Toggle a={a} className="size-8 rounded-full" style={{ color: a.open ? 'var(--accent)' : 'var(--muted)' }}>
                    <Chevron open={a.open} />
                  </Toggle>
                </div>
                <Panel a={a}>
                  <Answer s={s} i={i} className="px-6 pb-6 pr-16" />
                </Panel>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

export const FAQ: KindVariants = {
  kind: 'faq',
  fields: [
    { key: 'ctaTitle', label: 'Kutu başlığı', el: 'heading', def: 'Sorunuz mu kaldı?' },
    { key: 'ctaText', label: 'Kutu metni', el: 'text', def: 'Ekibimiz Discord ve e-posta üzerinden genellikle birkaç saat içinde yanıt veriyor.', multiline: true },
    { key: 'primary', label: 'Buton', el: 'button', def: 'Bize yazın' },
    { key: 'search', label: 'Arama kutusu', el: 'text', def: 'Bir soru arayın… örn. eklentiler', hint: 'Arama kutusunda görünen yazı' },
  ],
  pool: [
    { title: 'Hangi veritabanlarını destekliyor?', text: 'Pursae PostgreSQL 14 ve üzeri ile çalışır. Yerel geliştirme için gömülü SQLite modu da var.' },
    { title: 'Barındırma için ne gerekiyor?', text: "Tek bir binary ve bir PostgreSQL veritabanı yeterli. 512 MB RAM'li küçük bir sunucu çoğu site için yetiyor." },
    { title: 'Golementor ücretli mi?', text: 'Hayır. Golementor sayfa oluşturucu Pursae ile birlikte gelir ve GPL-2.0 lisanslıdır.' },
    { title: 'Eklentileri hangi dille yazabilirim?', text: "WASM'a derlenen her dille: Go, Rust, AssemblyScript ve daha fazlası. Eklentiler izole bir sandbox içinde çalışır." },
  ],
  variants: [
    { id: 'default', name: 'İki sütun akordiyon', tags: ['Modern'], blurb: 'Solda başlık, sağda açılır sorular.' },
    { id: 'centered', name: 'Ortalı akordiyon', tags: ['Minimal', 'Modern'], blurb: 'Ortalı başlık altında çizgili, tek sütun açılır sorular.' },
    { id: 'grid-open', name: 'İki sütun liste', tags: ['Kurumsal', 'SaaS'], blurb: 'Tüm cevaplar açık, iki sütunlu soru listesi.', minItems: 4 },
    { id: 'plus-cards', name: 'Artı ikonlu kartlar', tags: ['Modern', 'SaaS'], blurb: 'Dolgulu kartlarda soru ve dönen artı ikonu.' },
    { id: 'numbered', name: 'Numaralı liste', tags: ['Editoryal'], blurb: 'Büyük numaralar, yan yana soru ve cevap satırları.', minItems: 4 },
    { id: 'sidebar-cta', name: 'İletişim kutulu', tags: ['Kurumsal', 'SaaS'], blurb: 'Solda başlık ve destek kutusu, sağda akordiyon.', extras: ['ctaTitle', 'ctaText', 'primary'] },
    { id: 'dark', name: 'Koyu akordiyon', tags: ['Koyu', 'Modern'], blurb: 'Koyu zeminde ışıltılı, vurgu çizgili soru kartları.', style: { palette: 'dark' } },
    { id: 'bordered', name: 'Çerçeveli kutular', tags: ['Minimal', 'Ajans'], blurb: 'İki sütunda numaralı, çerçeveli açılır kutular.', minItems: 4 },
    { id: 'minimal', name: 'Sade çizgiler', tags: ['Minimal', 'Editoryal'], blurb: 'Büyük puntolu sorular ve ince çizgiler.' },
    { id: 'chat', name: 'Sohbet balonları', tags: ['Modern', 'SaaS'], blurb: 'Soru ve cevaplar mesajlaşma balonlarında.' },
    { id: 'tabs', name: 'Sekmeli', tags: ['SaaS', 'Kurumsal'], blurb: 'Solda soru listesi, sağda seçilen sorunun cevabı.' },
    { id: 'search', name: 'Arama başlıklı', tags: ['SaaS', 'Modern'], blurb: 'Arama kutulu başlık ve tek panelde sorular.', extras: ['search'] },
  ],
}
