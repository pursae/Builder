import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { Check, LayoutTemplate, Monitor, Search, Smartphone, SwatchBook, X } from 'lucide-react'
import { KINDS } from '../data'
import { useB } from '../store'
import type { Section, SectionKind } from '../types'
import { cn, ease } from '../ui'
import { LIBRARY, STYLE_TAGS, applyVariant, createVariantSection, currentVariant, kindVariants, variantCount, variantDoc, variantLabel, type StyleTag, type Variant } from './index'
import { closeLibrary, type LibraryState } from './libraryState'
import { PreviewCtx, Thumb } from './Preview'
import { frameOf, samplePage } from './samples'

const norm = (t: string) => t.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

type LibCat = SectionKind | 'themes'

/** Width of an element, kept up to date. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    ro.observe(node)
    return () => ro.disconnect()
  }, [])
  return { ref, w }
}

export default function DesignLibrary({ state }: { state: LibraryState }) {
  const b = useB()
  const { sections } = b.doc
  const changing = state.mode === 'change' ? sections.find((s) => s.id === state.sectionId) : undefined
  const [cat, setCat] = useState<LibCat>(state.kind ?? 'themes')
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<StyleTag | null>(null)
  const [mobile, setMobile] = useState(false)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    search.current?.focus({ preventScroll: true })
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      closeLibrary()
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [])

  /** Section a click in `kind` restyles: the one being changed, or the page's only header / footer. */
  const targetOf = (kind: SectionKind): Section | undefined => {
    if (changing && changing.kind === kind) return changing
    if (KINDS[kind].pinned) return sections.find((s) => s.kind === kind)
    return undefined
  }
  const insertAt = state.mode === 'add' ? state.index : changing ? sections.indexOf(changing) + 1 : undefined

  const apply = (kind: SectionKind, v: Variant) => {
    const target = targetOf(kind)
    if (target) {
      const next = variantDoc(b.doc, target.id, v.id)
      if (next) {
        b.dispatch({ type: 'replace', doc: next, label: variantLabel(kind, v.id) })
        b.notify(`Tasarım: ${v.name}`, { label: 'Geri al', run: () => b.dispatch({ type: 'undo' }) })
      }
      b.select({ sectionId: target.id }, { scroll: true })
    } else {
      const section = createVariantSection(kind, v.id)
      const index = KINDS[kind].pinned ? (kind === 'nav' ? 0 : sections.length) : insertAt
      b.add({ kind, label: `${KINDS[kind].name} · ${v.name}`, section }, index)
    }
    closeLibrary()
  }

  const nq = norm(q.trim())
  const themes = cat === 'themes'
  const match = (k: SectionKind, v: Variant) => (!tag || v.tags.includes(tag)) && (!nq || norm(`${v.name} ${v.blurb} ${v.tags.join(' ')} ${v.id} ${KINDS[k].name}`).includes(nq))
  const groups = (nq || themes ? LIBRARY : LIBRARY.filter((k) => k.kind === cat)).map((k) => ({ k, vs: k.variants.filter((v) => match(k.kind, v)) })).filter((g) => g.vs.length || (!nq && !themes))
  const pool = nq || themes ? LIBRARY.flatMap((k) => k.variants) : kindVariants(cat)?.variants ?? []
  const counts = Object.fromEntries(STYLE_TAGS.map((t) => [t, pool.filter((v) => v.tags.includes(t)).length]))

  const target = themes ? undefined : targetOf(cat)
  const context = themes ? null : changing && cat === changing.kind
    ? <>“<b className="font-semibold text-ink-100">{changing.name}</b>” bölümünün tasarımını değiştiriyorsun · yazıların ve görsellerin korunur</>
    : target
      ? <>Sayfadaki <b className="font-semibold text-ink-100">{KINDS[cat].name}</b> bölümüne uygulanır · içerik korunur</>
      : <>Seçtiğin tasarım yeni bir <b className="font-semibold text-ink-100">{KINDS[cat].name.toLocaleLowerCase('tr')}</b> bölümü olarak {insertAt !== undefined && sections[insertAt - 1] ? <>“{sections[insertAt - 1].name}” altına</> : 'sayfaya'} eklenir</>

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && closeLibrary()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dl-title"
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease }}
        className="absolute inset-3 mx-auto flex max-w-[1440px] overflow-hidden rounded-2xl border border-white/10 bg-ink-900 text-ink-200 shadow-[0_40px_120px_-20px_rgba(0,0,0,.8)] sm:inset-6"
      >
        <aside className="flex w-[216px] shrink-0 flex-col border-r border-white/[0.07] bg-ink-950/50">
          <div className="px-5 pb-4 pt-5">
            <div id="dl-title" className="flex items-center gap-2 text-[15px] font-semibold text-ink-100">
              <LayoutTemplate size={17} className="text-accent-soft" /> Tasarım kütüphanesi
            </div>
            <p className="mt-1 text-[12px] leading-snug text-ink-500">{variantCount()} hazır tasarım · sitenin renk, yazı ve köşe ayarlarına uyar</p>
          </div>
          <nav aria-label="Kategoriler" className="scroll-thin flex-1 space-y-px overflow-y-auto px-2 pb-3">
            <button
              type="button"
              aria-current={(!nq && themes) || undefined}
              onClick={() => {
                setCat('themes')
                setQ('')
              }}
              className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent', !nq && themes ? 'bg-white/[0.08] font-medium text-white' : 'text-ink-300 hover:bg-white/[0.04] hover:text-ink-100')}
            >
              <SwatchBook size={15} strokeWidth={1.8} className={!nq && themes ? 'text-accent-soft' : 'text-ink-500'} />
              <span className="flex-1 truncate">Temalar</span>
              <span className="text-[11px] tabular-nums text-ink-500">{variantCount()}</span>
            </button>
            <div className="mx-2.5 my-2 h-px bg-white/[0.07]" />
            {LIBRARY.map((k) => {
              const I = KINDS[k.kind].icon
              const on = !nq && cat === k.kind
              return (
                <button
                  key={k.kind}
                  type="button"
                  aria-current={on || undefined}
                  onClick={() => {
                    setCat(k.kind)
                    setQ('')
                  }}
                  className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent', on ? 'bg-white/[0.08] font-medium text-white' : 'text-ink-300 hover:bg-white/[0.04] hover:text-ink-100')}
                >
                  <I size={15} strokeWidth={1.8} className={on ? 'text-accent-soft' : 'text-ink-500'} />
                  <span className="flex-1 truncate">{KINDS[k.kind].name}</span>
                  {changing?.kind === k.kind && <span className="size-1.5 rounded-full bg-accent" title="Değiştirilen bölüm" />}
                  <span className="text-[11px] tabular-nums text-ink-500">{k.variants.length}</span>
                </button>
              )
            })}
          </nav>
          <p className="border-t border-white/[0.07] px-5 py-3 text-[11px] leading-relaxed text-ink-500">Tek tıkla uygulanır · ⌘Z ile geri alınır. Her öğe sonra tıklanıp düzenlenebilir.</p>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-white/[0.07] px-5 pb-3 pt-4">
            <div className="flex items-center gap-3">
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-white/[0.05] px-3 ring-1 ring-white/[0.06] focus-within:ring-accent/70">
                <Search size={15} className="shrink-0 text-ink-500" />
                <input
                  ref={search}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tasarım ara · ör. koyu, e-ticaret, bülten, video…"
                  aria-label="Tasarım ara"
                  className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink-100 outline-none placeholder:text-ink-500"
                />
                {q && (
                  <button type="button" aria-label="Aramayı temizle" onClick={() => setQ('')} className="grid size-5 place-items-center rounded text-ink-500 hover:text-white">
                    <X size={13} />
                  </button>
                )}
              </label>
              <div role="group" aria-label="Önizleme cihazı" className="flex h-9 shrink-0 items-center rounded-lg bg-white/[0.05] p-0.5 ring-1 ring-white/[0.06]">
                {[
                  { on: false, I: Monitor, l: 'Masaüstü' },
                  { on: true, I: Smartphone, l: 'Mobil' },
                ].map(({ on, I, l }) => (
                  <button key={l} type="button" aria-pressed={mobile === on} title={`${l} önizleme`} onClick={() => setMobile(on)} className={cn('flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors', mobile === on ? 'bg-white/[0.1] text-white' : 'text-ink-400 hover:text-ink-100')}>
                    <I size={14} /> <span className="hidden lg:inline">{l}</span>
                  </button>
                ))}
              </div>
              <button type="button" aria-label="Kapat" title="Kapat · Esc" onClick={closeLibrary} className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-white/[0.07] hover:text-white">
                <X size={17} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Stil filtresi">
              <Chip on={!tag} onClick={() => setTag(null)} label="Tümü" n={pool.length} />
              {STYLE_TAGS.map((t) => (
                <Chip key={t} on={tag === t} disabled={!counts[t]} onClick={() => setTag(tag === t ? null : t)} label={t} n={counts[t]} />
              ))}
            </div>
            {!nq && themes && <p className="mt-3 text-[12px] text-ink-400">Hazır temalar, bölüme göre gruplanır. Tıklayınca eklenir; var olan bir bölümde yazılar, butonlar ve görseller korunur.</p>}
            {!nq && !themes && <p className="mt-3 text-[12px] text-ink-400">{context}</p>}
          </header>

          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
            <PreviewCtx>
              {groups.map(({ k, vs }) => (
                <section key={k.kind} className="mb-8 last:mb-0" aria-label={KINDS[k.kind].name}>
                  {(nq || themes) && (
                    <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.08em] text-ink-400">
                      {KINDS[k.kind].name} <span className="font-normal normal-case tracking-normal text-ink-500">· {vs.length}</span>
                    </h3>
                  )}
                  <Grid kind={k.kind} variants={vs} mobile={mobile} target={targetOf(k.kind)} onPick={(v) => apply(k.kind, v)} />
                </section>
              ))}
              {!groups.some((g) => g.vs.length) && (
                <div className="grid place-items-center py-24 text-center text-[13px] text-ink-400">
                  <Search size={22} className="mb-3 text-ink-600" />
                  Bu filtreye uyan tasarım yok.
                  <button type="button" onClick={() => { setQ(''); setTag(null) }} className="mt-3 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-medium text-ink-100 hover:bg-white/[0.12]">
                    Filtreleri temizle
                  </button>
                </div>
              )}
            </PreviewCtx>
          </div>
        </main>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

function Chip({ on, label, n, disabled, onClick }: { on: boolean; label: string; n: number; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn('flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30', on ? 'bg-accent text-white' : 'bg-white/[0.05] text-ink-300 hover:bg-white/[0.09] hover:text-white')}
    >
      {label}
      <span className={cn('text-[10.5px] tabular-nums', on ? 'text-white/70' : 'text-ink-500')}>{n}</span>
    </button>
  )
}

function Grid({ kind, variants, mobile, target, onPick }: { kind: SectionKind; variants: Variant[]; mobile: boolean; target?: Section; onPick: (v: Variant) => void }) {
  const b = useB()
  const { ref, w } = useWidth<HTMLDivElement>()
  const f = frameOf(kind, mobile)
  const min = mobile ? 176 : kind === 'nav' || kind === 'banner' ? 420 : 300
  const gap = 20
  const cols = Math.max(1, Math.floor((w + gap) / (min + gap)))
  const cw = w ? Math.floor((w - gap * (cols - 1)) / cols) : 0
  const ch = Math.round(cw * f.ratio)
  const current = target ? currentVariant(target)?.id : undefined
  const pages = useMemo(() => new Map(variants.map((v) => [v.id, target ? [applyVariant(target, v.id), ...samplePage(kind, v.id, b.doc).slice(1)] : samplePage(kind, v.id, b.doc)])), [variants, target, kind, b.doc])
  return (
    <div ref={ref} className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap }}>
      {cw > 0 &&
        variants.map((v) => {
          const on = v.id === current
          return (
            <div key={v.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onPick(v)}
                title={v.blurb}
                aria-label={`${v.name} · ${on ? 'kullanılıyor' : target ? 'uygula' : 'ekle'}`}
                className={cn('group relative block w-full overflow-hidden rounded-xl bg-white text-left outline-none ring-1 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:ring-2 hover:ring-accent focus-visible:ring-2 focus-visible:ring-accent', on ? 'ring-2 ring-accent' : 'ring-white/10')}
                style={{ height: ch }}
              >
                <Thumb sections={pages.get(v.id)!} width={f.width} frameW={cw} frameH={ch} anchor={f.anchor} site={b.doc.site} />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/55 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="rounded-full bg-accent px-3 py-1 text-[11.5px] font-semibold text-white shadow-lg">{on ? 'Kullanılıyor' : target ? 'Uygula' : 'Ekle'}</span>
                </span>
                {on && (
                  <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-semibold text-white shadow-lg">
                    <Check size={11} strokeWidth={3} /> Kullanılıyor
                  </span>
                )}
              </button>
              <div className="mt-2 flex items-baseline justify-between gap-2 px-0.5">
                <span className="truncate text-[13px] font-medium text-ink-100">{v.name}</span>
                <span className="shrink-0 truncate text-[11px] text-ink-500">{v.tags.join(' · ')}</span>
              </div>
            </div>
          )
        })}
    </div>
  )
}
