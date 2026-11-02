import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CircleAlert, KeyRound, LoaderCircle, RefreshCw, Search, Settings2 } from 'lucide-react'
import { cn, ease } from '../ui'
import { useAi } from './AiProvider'
import { ProviderLogo } from './logos'
import { PROVIDERS, fmtPrice } from './providers'

/** Model switcher for every provider with a key; `up` opens above the trigger (composer at screen bottom). */
export function ModelPicker({ up, className, panelClassName, title, children }: { up?: boolean; className?: string; panelClassName?: string; title?: string; children: ReactNode }) {
  const ai = useAi()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const configured = PROVIDERS.filter((p) => ai.settings.keys[p.id])
  const total = configured.reduce((n, p) => n + ai.modelsFor(p.id).length, 0)
  const term = q.trim().toLowerCase()

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  useEffect(() => {
    if (ai.running) setOpen(false)
  }, [ai.running])

  const settings = () => {
    setOpen(false)
    ai.setSettingsOpen('providers')
  }

  return (
    <div ref={root} className="relative min-w-0">
      <button type="button" title={ai.running ? 'AI çalışırken model değiştirilemez' : title} disabled={ai.running} aria-expanded={open} onClick={() => setOpen(!open)} className={cn('disabled:cursor-not-allowed disabled:opacity-50', className)}>
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: up ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: up ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease }}
            className={cn(
              'absolute z-30 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1b20] shadow-[0_24px_70px_-20px_rgba(0,0,0,.9)]',
              up ? 'bottom-full mb-2 origin-bottom-left' : 'top-full mt-2 origin-top-left',
              panelClassName,
            )}
          >
            {configured.length === 0 ? (
              <div className="p-4 text-center">
                <KeyRound size={18} className="mx-auto text-ink-500" />
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">Model seçmek için önce bir sağlayıcıya API anahtarı ekle. Anahtarı girince modeller otomatik listelenir.</p>
                <button type="button" onClick={settings} className="mt-3 h-8 rounded-lg bg-accent px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#6b89ff]">
                  Sağlayıcılar
                </button>
              </div>
            ) : (
              <>
                {total > 8 && (
                  <div className="flex items-center gap-2 border-b border-white/[0.07] px-3">
                    <Search size={13} className="shrink-0 text-ink-500" />
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Model ara…" className="h-9 min-w-0 flex-1 bg-transparent text-[12.5px] text-ink-100 outline-none placeholder:text-ink-500" />
                  </div>
                )}
                <div className="scroll-thin max-h-[min(50vh,380px)] overflow-y-auto p-1.5">
                  {configured.map((p) => {
                    const d = ai.discovery[p.id] ?? {}
                    const current = ai.settings.active === p.id ? ai.modelInfo(p.id, ai.settings.models[p.id]).id : null
                    const models = ai.modelsFor(p.id).filter((m) => !term || m.name.toLowerCase().includes(term) || m.id.toLowerCase().includes(term))
                    if (term && !models.length) return null
                    return (
                      <div key={p.id} className="mb-1 last:mb-0">
                        <div className="flex items-center gap-2 px-2 pb-1 pt-1.5">
                          <ProviderLogo id={p.id} size={12} />
                          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-ink-400">{p.name}</span>
                          <span className="shrink-0 text-[10.5px] text-ink-600">{d.count ? `${d.count} model` : 'varsayılan liste'}</span>
                          <button
                            type="button"
                            title="Modelleri yenile"
                            disabled={d.busy}
                            onClick={() => void ai.refreshModels(p.id)}
                            className="grid size-6 shrink-0 place-items-center rounded-md text-ink-500 hover:bg-white/[0.07] hover:text-white disabled:opacity-60"
                          >
                            {d.busy ? <LoaderCircle size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          </button>
                        </div>
                        {d.error && (
                          <p className="mx-2 mb-1 flex gap-1.5 break-words rounded-md bg-amber-400/[0.07] px-2 py-1.5 text-[11px] leading-snug text-amber-200/90">
                            <CircleAlert size={12} className="mt-px shrink-0 text-amber-300" />
                            <span className="min-w-0">{d.error}</span>
                          </p>
                        )}
                        {models.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            title={m.id}
                            onClick={() => {
                              ai.selectModel(p.id, m.id)
                              setOpen(false)
                            }}
                            className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06]', current === m.id && 'bg-accent/[0.12]')}
                          >
                            <ProviderLogo id={p.id} size={12} bare className="size-4" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] text-ink-100">{m.name}</span>
                              {m.name !== m.id && <span className="block truncate font-mono text-[10.5px] text-ink-600">{m.id}</span>}
                            </span>
                            <span className={cn('shrink-0 text-[10.5px]', m.unknown ? 'text-ink-600' : 'text-ink-400')}>{fmtPrice(m)}</span>
                            <span className="grid size-4 shrink-0 place-items-center">{current === m.id && <Check size={13} className="text-accent-soft" strokeWidth={2.6} />}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                  {term && !configured.some((p) => ai.modelsFor(p.id).some((m) => m.name.toLowerCase().includes(term) || m.id.toLowerCase().includes(term))) && (
                    <p className="px-2 py-3 text-center text-[12px] text-ink-500">“{q}” ile eşleşen model yok</p>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.07] px-3 py-2 text-[11px] text-ink-500">
                  <span>Fiyatlar 1M token (girdi / çıktı)</span>
                  <button type="button" onClick={settings} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-ink-300 hover:bg-white/[0.06] hover:text-white">
                    <Settings2 size={12} /> AI ayarları
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
