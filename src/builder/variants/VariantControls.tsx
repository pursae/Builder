import { ChevronDown, ChevronLeft, ChevronRight, LayoutTemplate } from 'lucide-react'
import { useB } from '../store'
import type { Section } from '../types'
import { cn } from '../ui'
import { currentVariant, hasVariants, variantDoc, variantLabel, variantsOf } from './index'
import { openLibrary } from './libraryState'
import { PreviewCtx, Thumb } from './Preview'
import { frameOf, samplePage } from './samples'

/** Switches a top-level section to another design as one undoable step. */
function useSetVariant(s: Section) {
  const b = useB()
  return (id: string) => {
    const next = variantDoc(b.doc, s.id, id)
    if (next) b.dispatch({ type: 'replace', doc: next, label: variantLabel(s.kind, id) })
  }
}

const isTop = (b: ReturnType<typeof useB>, s: Section) => b.doc.sections.some((x) => x.id === s.id)

/** Basic mode: current design preview, previous / next and the full library. */
export function DesignPicker({ s }: { s: Section }) {
  const b = useB()
  const set = useSetVariant(s)
  if (!hasVariants(s.kind) || !isTop(b, s)) return null
  const vs = variantsOf(s.kind)
  const cur = currentVariant(s)
  const i = Math.max(0, vs.findIndex((v) => v.id === cur?.id))
  const f = frameOf(s.kind, false)
  const page = [s, ...samplePage(s.kind, cur?.id ?? 'default', b.doc).slice(1)]
  const step = (d: number) => set(vs[(i + d + vs.length) % vs.length].id)
  const open = () => openLibrary({ mode: 'change', sectionId: s.id, kind: s.kind })
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink-500">Tasarım</span>
        <span className="text-[11px] tabular-nums text-ink-500">
          {i + 1} / {vs.length}
        </span>
      </div>
      <button type="button" onClick={open} aria-label="Tasarım kütüphanesini aç" className="block w-full overflow-hidden rounded-[10px] bg-white ring-1 ring-white/10 transition hover:ring-2 hover:ring-accent">
        <PreviewCtx>
          <Thumb sections={page} width={f.width} frameW={266} frameH={Math.round(266 * Math.max(f.ratio, 0.34))} anchor={f.anchor} site={b.doc.site} />
        </PreviewCtx>
      </button>
      <div className="mt-2.5 flex items-center gap-1.5">
        <button type="button" aria-label="Önceki tasarım" onClick={() => step(-1)} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-300 transition hover:bg-white/[0.07] hover:text-white">
          <ChevronLeft size={16} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[13px] font-medium text-ink-100">{cur?.name}</div>
          <div className="truncate text-[11px] text-ink-500">{cur?.tags.join(' · ')}</div>
        </div>
        <button type="button" aria-label="Sonraki tasarım" onClick={() => step(1)} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-300 transition hover:bg-white/[0.07] hover:text-white">
          <ChevronRight size={16} />
        </button>
      </div>
      <button type="button" onClick={open} className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-[10px] bg-white/[0.06] text-[12.5px] font-medium text-ink-100 transition hover:bg-white/[0.1]">
        <LayoutTemplate size={14} /> Tüm tasarımlar ({vs.length})
      </button>
    </div>
  )
}

/** Studio inspector row: design dropdown + library button. */
export function DesignRow({ s }: { s: Section }) {
  const b = useB()
  const set = useSetVariant(s)
  if (!hasVariants(s.kind) || !isTop(b, s)) return null
  const cur = currentVariant(s)
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11.5px] text-ink-400">Tasarım</span>
      <div className="flex items-center gap-1">
        <div className="relative w-[124px]">
          <select
            aria-label="Tasarım"
            value={cur?.id}
            onChange={(e) => set(e.target.value)}
            className="h-7 w-full appearance-none rounded-[5px] border border-white/[0.08] bg-ink-850 pl-2 pr-6 text-[12px] text-ink-100 outline-none transition focus:border-accent/70"
          >
            {variantsOf(s.kind).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-500" />
        </div>
        <button
          type="button"
          title="Tasarım kütüphanesi"
          aria-label="Tasarım kütüphanesi"
          onClick={() => openLibrary({ mode: 'change', sectionId: s.id, kind: s.kind })}
          className={cn('grid size-7 place-items-center rounded-[5px] bg-white/[0.06] text-ink-200 transition hover:bg-white/10 hover:text-white')}
        >
          <LayoutTemplate size={13} />
        </button>
      </div>
    </div>
  )
}

/** Big entry button of the add-section flows. */
export function LibraryButton({ index, compact }: { index?: number; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => openLibrary({ mode: 'add', index })}
      className={cn('group flex w-full items-center gap-3 rounded-xl text-left ring-1 ring-accent/40 transition hover:ring-accent', compact ? 'bg-accent/10 px-2.5 py-2' : 'bg-gradient-to-br from-accent/25 to-accent/5 px-3.5 py-3')}
    >
      <span className={cn('grid shrink-0 place-items-center rounded-lg bg-accent text-white shadow-lg shadow-accent/30', compact ? 'size-8' : 'size-10')}>
        <LayoutTemplate size={compact ? 15 : 18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block font-semibold text-ink-100', compact ? 'text-[12.5px]' : 'text-[14px]')}>Tasarım kütüphanesi</span>
        <span className={cn('block text-ink-400', compact ? 'text-[11px]' : 'text-[12px]')}>Üst menü, karşılama, alt bilgi ve daha fazlası · hazır tasarımlar</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
    </button>
  )
}
