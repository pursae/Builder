import { AnimatePresence, motion } from 'motion/react'
import { Check, CloudCheck, Command, Sparkles, Contrast, Eye, EyeOff, FileText, Keyboard, Layers, LoaderCircle, Monitor, Plus, Redo2, Search, Smartphone, Tablet, Undo2 } from 'lucide-react'
import { HistoryButton } from './HistoryPanel'
import { useB } from './store'
import { useAi } from './ai/AiProvider'
import { fmtTokens } from './ai/providers'
import type { Device, Mode } from './types'
import { IconBtn, Tip, cn, ease, spring } from './ui'

const DEVICES: { d: Device; icon: typeof Monitor; label: string }[] = [
  { d: 'desktop', icon: Monitor, label: 'Masaüstü' },
  { d: 'tablet', icon: Tablet, label: 'Tablet' },
  { d: 'mobile', icon: Smartphone, label: 'Mobil' },
]

function ModeSwitch() {
  const b = useB()
  const opts: { m: Mode; label: string; tip: string }[] = [
    { m: 'basic', label: 'Basit', tip: 'Yalnızca yazılar, fotoğraflar ve renkler' },
    { m: 'studio', label: 'Studio', tip: 'Tüm araçlar ve ayrıntılı stil ayarları' },
    { m: 'ai', label: 'AI', tip: 'Sohbet ederek düzenle' },
  ]
  return (
    <div className="flex h-8 rounded-[9px] bg-black/40 p-[3px] ring-1 ring-white/[0.07]" role="radiogroup" aria-label="Düzenleme modu">
      {opts.map((o) => {
        const on = b.mode === o.m
        return (
          <Tip key={o.m} label={o.tip}>
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => b.setMode(o.m)}
              className={cn(
                'relative flex h-[26px] items-center gap-1 rounded-[7px] px-3.5 text-[12.5px] font-semibold transition-colors duration-200',
                on ? (o.m === 'ai' ? 'text-white' : 'text-[#2f4bd8]') : 'text-ink-400 hover:text-ink-200',
              )}
            >
              {on && (
                <motion.span
                  layoutId="mode-pill"
                  transition={spring}
                  className={cn('absolute inset-0 rounded-[7px] shadow-[0_1px_3px_rgba(0,0,0,.35)]', o.m === 'ai' ? 'bg-gradient-to-r from-[#8b5cf6] to-[#4f6af7]' : 'bg-white')}
                />
              )}
              {o.m === 'ai' && <Sparkles size={12} className={cn('relative', !on && 'text-[#a78bfa]')} />}
              <span className="relative">{o.label}</span>
            </button>
          </Tip>
        )
      })}
    </div>
  )
}

const collapse = {
  initial: { width: 0, opacity: 0 },
  animate: { width: 'auto', opacity: 1 },
  exit: { width: 0, opacity: 0 },
  transition: { duration: 0.32, ease },
}

function AiChip() {
  const ai = useAi()
  return (
    <button
      type="button"
      onClick={() => ai.setSettingsOpen('providers')}
      className="flex h-8 items-center gap-2 whitespace-nowrap rounded-lg bg-[#8b5cf6]/12 px-2.5 text-[12px] font-medium text-[#ddd6fe] ring-1 ring-[#8b5cf6]/30 transition hover:bg-[#8b5cf6]/20"
    >
      <Sparkles size={13} />
      {ai.engineLabel}
      <span className="h-3.5 w-px bg-white/15" />
      <span className="text-[#c4b5fd]/80">{fmtTokens(ai.totals.input + ai.totals.output)} token</span>
    </button>
  )
}

export function TopBar() {
  const b = useB()
  const studio = b.mode === 'studio'
  return (
    <header className="relative z-50 flex h-[52px] shrink-0 items-center border-b border-white/[0.07] bg-ink-900">
      {/* left */}
      <div className="flex min-w-0 flex-1 items-center gap-1 pl-3">
        <div className="mr-2 flex items-center gap-2.5 pr-1">
          <span className="grid size-[30px] place-items-center rounded-[9px] bg-gradient-to-br from-[#6d8bff] to-[#3c55e0] text-[15px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25)]">P</span>
          <span className="hidden whitespace-nowrap text-[13.5px] font-semibold text-ink-100 xl:block">Pursae Web Builder</span>
        </div>
        <AnimatePresence initial={false}>
          {studio && (
            <motion.div key="studio-tools" {...collapse} className="flex items-center gap-0.5 overflow-hidden">
              <IconBtn icon={Plus} label="Öğe ekle" active={!b.selection && b.studioTab === 'widgets'} onClick={() => { b.select(null); b.setStudioTab('widgets') }} className="bg-white/[0.06]" />
              <IconBtn icon={Contrast} label="Globaller" onClick={() => { b.select(null); b.setStudioTab('globals') }} />
              <IconBtn icon={Keyboard} label="Klavye kısayolları" kbd="?" onClick={() => b.setDialog('shortcuts')} />
              <IconBtn icon={Search} label="Widget ara" kbd="/" onClick={() => { b.select(null); b.setStudioTab('widgets'); window.setTimeout(() => document.getElementById('widget-search')?.focus(), 320) }} />
              <span className="mx-1.5 h-5 w-px bg-white/10" />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {b.mode === 'ai' && (
            <motion.div key="ai-tools" {...collapse} className="flex items-center overflow-hidden pr-2">
              <AiChip />
            </motion.div>
          )}
        </AnimatePresence>
        <IconBtn icon={Undo2} label="Geri al" kbd="⌘Z" disabled={!b.canUndo} onClick={() => b.dispatch({ type: 'undo' })} />
        <IconBtn icon={Redo2} label="Yinele" kbd="⇧⌘Z" disabled={!b.canRedo} onClick={() => b.dispatch({ type: 'redo' })} />
        <HistoryButton />
      </div>

      {/* center */}
      <div className="flex h-full items-center border-x border-white/[0.07]">
        <Tip label="Sayfa ayarları ve SEO">
          <button type="button" onClick={() => b.setDialog('settings')} className="hidden h-[51px] items-center gap-2 border-r border-white/[0.07] px-4 text-[12.5px] transition-colors hover:bg-white/[0.03] lg:flex">
            <FileText size={14} className="text-ink-500" />
            <span className="font-medium text-ink-100">Ana sayfa</span>
            <span className={cn('rounded-full px-1.5 py-px text-[10.5px] font-medium transition-colors', b.dirty ? 'bg-amber-400/12 text-amber-300' : 'bg-emerald-400/12 text-emerald-300')}>
              {b.dirty ? 'Taslak' : 'Yayında'}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-ink-500 2xl:w-[86px]">
              {b.saveState === 'saving' ? <LoaderCircle size={12} className="animate-spin" /> : <CloudCheck size={13} />}
              <span className="hidden 2xl:inline">{b.saveState === 'saving' ? 'Kaydediliyor' : 'Kaydedildi'}</span>
            </span>
          </button>
        </Tip>
        <div className="flex h-full items-center gap-1 px-3">
          {DEVICES.map(({ d, icon: I, label }) => (
            <Tip key={d} label={label}>
              <button type="button" aria-label={label} aria-pressed={b.device === d} onClick={() => b.setDevice(d)} className={cn('relative grid h-[52px] w-10 place-items-center transition-colors', b.device === d ? 'text-accent-soft' : 'text-ink-400 hover:text-ink-100')}>
                <I size={17} strokeWidth={1.75} />
                {b.device === d && <motion.span layoutId="device-line" transition={spring} className="absolute inset-x-1.5 bottom-0 h-[2px] rounded-full bg-accent-soft" />}
              </button>
            </Tip>
          ))}
        </div>
      </div>

      {/* right */}
      <div className="flex flex-1 items-center justify-end gap-1 pr-3">
        <Tip label="Her şeyi ara" kbd="⌘K">
          <button type="button" onClick={() => b.setPaletteOpen(true)} className="mr-1 hidden h-8 items-center gap-2 rounded-lg bg-white/[0.04] pl-2.5 pr-2 text-[12px] text-ink-400 ring-1 ring-white/[0.06] transition-colors hover:text-ink-100 xl:flex">
            <Search size={13} /> Ara
            <span className="flex items-center gap-0.5 rounded bg-white/[0.07] px-1 py-px font-mono text-[10px]">
              <Command size={9} />K
            </span>
          </button>
        </Tip>
        <span className="xl:hidden">
          <IconBtn icon={Search} label="Her şeyi ara" kbd="⌘K" onClick={() => b.setPaletteOpen(true)} />
        </span>
        <ModeSwitch />
        <AnimatePresence initial={false}>
          {studio && (
            <motion.div key="studio-right" {...collapse} className="flex items-center overflow-hidden pl-1">
              <IconBtn icon={Layers} label="Yapı paneli" active={b.structureOpen} onClick={() => b.setStructureOpen(!b.structureOpen)} />
            </motion.div>
          )}
        </AnimatePresence>
        <IconBtn icon={b.preview ? EyeOff : Eye} label={b.preview ? 'Düzenlemeye dön' : 'Önizle'} kbd="P" active={b.preview} onClick={() => b.setPreview(!b.preview)} />
        <span className="mx-1.5 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={b.publish}
          disabled={!b.dirty || b.publishState === 'busy'}
          className={cn(
            'relative flex h-8 min-w-[104px] items-center justify-center gap-1.5 overflow-hidden rounded-lg px-4 text-[12.5px] font-semibold transition-colors duration-300',
            b.dirty || b.publishState === 'busy' ? 'bg-accent text-white hover:bg-[#6b89ff]' : 'bg-white/[0.06] text-ink-400',
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={b.publishState === 'busy' ? 'busy' : b.dirty ? 'dirty' : 'done'}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1.5"
            >
              {b.publishState === 'busy' ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" /> Yayınlanıyor
                </>
              ) : b.dirty ? (
                'Yayınla'
              ) : (
                <>
                  <Check size={14} strokeWidth={2.5} /> Yayında
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </header>
  )
}
