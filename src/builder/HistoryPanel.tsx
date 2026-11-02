import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpDown, EyeOff, FileText, Globe, History, LayoutGrid, Palette, Plus, Redo2, SlidersHorizontal, Sparkles, Trash2, Type, Undo2, X, type LucideIcon } from 'lucide-react'
import { useB } from './store'
import { describeEntry, type HistoryKind } from './historyLabels'
import { IconBtn, cn } from './ui'

const ICONS: Record<HistoryKind, LucideIcon> = {
  open: FileText,
  text: Type,
  color: Palette,
  style: SlidersHorizontal,
  add: Plus,
  remove: Trash2,
  move: ArrowUpDown,
  visibility: EyeOff,
  layout: LayoutGrid,
  site: Globe,
  ai: Sparkles,
}

const WIDTH = 340

function ago(t: number, now: number) {
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 10) return 'şimdi'
  if (s < 60) return `${s} sn önce`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} dk önce`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} sa önce` : `${Math.round(h / 24)} gün önce`
}

/** Top-bar "Geçmiş" button with a revision list: jump to any state; later states stay restorable. */
export function HistoryButton() {
  const b = useB()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const { entries, cursor } = b.history

  // The top bar animates its tool groups, so follow the button while open.
  useEffect(() => {
    if (!open) return
    let raf = 0
    const track = () => {
      const r = anchor.current?.getBoundingClientRect()
      if (r) {
        const left = Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8))
        const top = r.bottom + 8
        setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }))
      }
      raf = requestAnimationFrame(track)
    }
    track()
    return () => cancelAnimationFrame(raf)
  }, [open])

  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const tick = window.setInterval(() => setNow(Date.now()), 15000)
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !anchor.current?.contains(t)) setOpen(false)
    }
    // Capture phase so the builder's own Escape handler (deselect) doesn't also fire.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.clearInterval(tick)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const rows = useMemo(
    () => (open ? entries.map((e, i) => ({ i, at: e.at, ...describeEntry(entries[i - 1]?.doc, e.doc, e.label) })).reverse() : []),
    [open, entries],
  )

  useEffect(() => {
    if (open) panel.current?.querySelector('[data-current]')?.scrollIntoView({ block: 'nearest' })
  }, [open, cursor])

  const empty = entries.length <= 1

  return (
    <div ref={anchor} className="relative">
      <IconBtn icon={History} label="Geçmiş" active={open} onClick={() => setOpen(!open)} />
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={panel}
              role="dialog"
              aria-label="Geçmiş"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              style={{ position: 'fixed', left: pos.left, top: pos.top, width: WIDTH, zIndex: 900, transformOrigin: 'top left' }}
              className="flex max-h-[min(560px,calc(100vh-80px))] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1e2025] text-ink-200 shadow-2xl shadow-black/60"
            >
              <div className="flex items-center gap-2 border-b border-white/[0.07] py-2 pl-3.5 pr-2">
                <History size={14} className="text-ink-400" />
                <span className="text-[12.5px] font-semibold text-ink-100">Geçmiş</span>
                <span className="text-[11px] text-ink-500">{empty ? '' : `${entries.length - 1} değişiklik`}</span>
                <span className="flex-1" />
                <IconBtn icon={Undo2} label="Geri al" kbd="⌘Z" size={28} iconSize={14} disabled={!b.canUndo} onClick={() => b.dispatch({ type: 'undo' })} />
                <IconBtn icon={Redo2} label="Yinele" kbd="⇧⌘Z" size={28} iconSize={14} disabled={!b.canRedo} onClick={() => b.dispatch({ type: 'redo' })} />
                <IconBtn icon={X} label="Kapat" kbd="Esc" size={28} iconSize={14} onClick={() => setOpen(false)} />
              </div>

              {empty ? (
                <div className="flex flex-col items-center px-6 py-9 text-center">
                  <span className="mb-3 grid size-10 place-items-center rounded-full bg-white/[0.05] text-ink-400">
                    <History size={18} />
                  </span>
                  <span className="text-[12.5px] font-semibold text-ink-100">Henüz değişiklik yok</span>
                  <span className="mt-1 text-[11.5px] leading-relaxed text-ink-500">Yaptığın her düzenleme burada listelenir; istediğin adıma tek tıkla dönebilirsin.</span>
                </div>
              ) : (
                <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-1.5">
                  {rows.map((r) => {
                    const Icon = ICONS[r.kind]
                    const current = r.i === cursor
                    const future = r.i > cursor
                    return (
                      <button
                        key={r.i}
                        type="button"
                        data-current={current || undefined}
                        aria-current={current ? 'step' : undefined}
                        title={future ? 'Bu duruma geri yükle' : current ? 'Şu anki durum' : 'Bu adıma dön'}
                        onClick={() => b.dispatch({ type: 'jump', cursor: r.i })}
                        className={cn(
                          'group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                          current ? 'bg-accent/15 ring-1 ring-inset ring-accent/30' : 'hover:bg-white/[0.05]',
                          future && 'opacity-45 hover:opacity-80',
                        )}
                      >
                        <span className={cn('grid size-7 shrink-0 place-items-center rounded-md', current ? 'bg-accent/25 text-accent-soft' : 'bg-white/[0.05] text-ink-400')}>
                          <Icon size={13} strokeWidth={1.9} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-[12.5px] font-medium', current ? 'text-white' : 'text-ink-100')}>{r.title}</span>
                          {r.context && <span className="block truncate text-[11px] text-ink-500">{r.context}</span>}
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                          {current ? (
                            <span className="rounded-full bg-accent/25 px-1.5 py-px text-[10px] font-semibold text-accent-soft">Şu an</span>
                          ) : future ? (
                            <span className="text-[10px] font-medium text-ink-400 opacity-0 transition-opacity group-hover:opacity-100">Geri yükle</span>
                          ) : null}
                          <span className="text-[10.5px] text-ink-500">{ago(r.at, now)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="border-t border-white/[0.07] px-3.5 py-2 text-[11px] leading-relaxed text-ink-500">
                {b.canRedo ? 'Soluk adımlar ileri durumlar — tıklayarak geri yükleyebilirsin. Yeni bir düzenleme onları siler.' : 'Bir adıma tıklayarak o duruma dön; sonraki adımlar kaybolmaz.'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
