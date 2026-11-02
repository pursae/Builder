import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Check, ChevronDown, ChevronUp, CircleStop, FileText, Image as ImageIcon, LoaderCircle, MousePointerClick, Paperclip, RotateCcw, Settings2, Sparkles, Trash2, X } from 'lucide-react'
import { useB } from '../store'
import { fieldLabel, findSection } from '../data'
import { cn, ease, spring } from '../ui'
import { readAttachment, type Attachment } from './agent'
import { useAi, type AiMessage } from './AiProvider'
import { ProviderLogo } from './logos'
import { ModelPicker } from './ModelPicker'
import { fmtCost, fmtTokens } from './providers'

const SUGGESTIONS = [
  { label: 'Demo’yu başlat', prompt: 'demo', hint: 'Tüm yetenekleri canlı izle' },
  { label: 'Rengi mor yap', prompt: 'Sitenin rengini mor yap', hint: 'Marka rengi' },
  { label: 'SSS bölümü ekle', prompt: 'SSS bölümü ekle', hint: 'Yeni bölüm' },
  { label: 'Editörü bana öğret', prompt: 'Editörde neler yapabilirim? Bana rehberlik et.', hint: 'Rehber' },
]

export function AiAvatar({ size = 28 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8b5cf6] via-[#6366f1] to-[#3b82f6] text-white shadow-[0_0_0_1px_rgba(255,255,255,.15)_inset]" style={{ width: size, height: size }}>
      <Sparkles size={size * 0.5} />
    </span>
  )
}

function FileChip({ f, onRemove }: { f: Attachment; onRemove?: () => void }) {
  return (
    <span className="flex max-w-[220px] items-center gap-2 rounded-lg bg-white/[0.06] py-1 pl-1 pr-2 ring-1 ring-white/[0.08]">
      {f.kind === 'image' && f.url ? (
        <img src={f.url} alt="" className="size-8 rounded-md object-cover" />
      ) : (
        <span className="grid size-8 place-items-center rounded-md bg-white/[0.07] text-ink-300">{f.loading ? <LoaderCircle size={14} className="animate-spin" /> : <FileText size={14} />}</span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] font-medium text-ink-100">{f.name}</span>
        <span className="block text-[10.5px] text-ink-500">
          {f.loading ? 'okunuyor…' : f.kind === 'pdf' ? `PDF${f.pages ? ` · ${f.pages} sayfa` : ''}` : f.kind === 'text' ? 'Metin' : f.kind === 'image' ? 'Görsel' : 'Dosya'} · {Math.max(1, Math.round(f.size / 1024))} KB
        </span>
      </span>
      {onRemove && (
        <button type="button" aria-label="Kaldır" onClick={onRemove} className="ml-0.5 grid size-5 place-items-center rounded text-ink-500 hover:bg-white/10 hover:text-white">
          <X size={11} />
        </button>
      )}
    </span>
  )
}

function Message({ m, last }: { m: AiMessage; last: boolean }) {
  const ai = useAi()
  const b = useB()
  if (m.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {m.attachments && m.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {m.attachments.map((f) => (
              <FileChip key={f.id} f={f} />
            ))}
          </div>
        )}
        {m.text && <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[13.5px] leading-relaxed text-white">{m.text}</div>}
        {m.context && (
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <MousePointerClick size={11} /> Bağlam: {m.context}
          </span>
        )}
      </div>
    )
  }
  const runningIdx = m.status === 'running' ? (m.steps?.findIndex((s) => !s.done) ?? -1) : -1
  const thinking = (
    <div className="flex h-6 items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="size-1.5 rounded-full bg-ink-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
      ))}
      <span className="ml-2 text-[12px] text-ink-500">{m.text || m.steps?.length ? 'Düşünüyor…' : 'Sayfanı inceliyor…'}</span>
    </div>
  )
  return (
    <div className="flex gap-2.5">
      <AiAvatar />
      <div className="min-w-0 flex-1 pt-0.5">
        {m.status === 'thinking' && !m.text && !m.steps?.length ? (
          thinking
        ) : (
          <>
            {m.text && <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-100">{m.text}</div>}
            {m.status === 'pending' && <div className="text-[13.5px] text-ink-100">Şu değişiklikleri yapmayı planlıyorum:</div>}
            {m.steps && m.steps.length > 0 && (
              <div className="mt-2.5 space-y-0.5 rounded-xl bg-white/[0.03] p-1.5 ring-1 ring-white/[0.06]">
                {m.steps.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!s.target}
                    onClick={() => s.target && b.select(s.target.el ? { sectionId: s.target.sectionId, el: s.target.el } : { sectionId: s.target.sectionId }, { scroll: true })}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12.5px] transition-colors enabled:hover:bg-white/[0.05]"
                  >
                    {s.failed ? (
                      <X size={13} className="text-red-400" strokeWidth={2.6} />
                    ) : s.done ? (
                      <Check size={13} className="text-emerald-400" strokeWidth={2.6} />
                    ) : i === runningIdx ? (
                      <LoaderCircle size={13} className="animate-spin text-accent-soft" />
                    ) : (
                      <span className="size-[13px] rounded-full border border-ink-600" />
                    )}
                    <span className={cn(s.failed ? 'text-ink-500 line-through' : s.done ? 'text-ink-200' : i === runningIdx ? 'text-white' : 'text-ink-500')}>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
            {m.status === 'thinking' && <div className="mt-2">{thinking}</div>}
            {m.status === 'pending' && (
              <div className="mt-2.5 flex gap-2">
                <button type="button" onClick={() => ai.approve(m.id)} className="h-8 rounded-lg bg-accent px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#6b89ff]">
                  Uygula
                </button>
                <button type="button" onClick={() => ai.reject(m.id)} className="h-8 rounded-lg px-3 text-[12.5px] font-medium text-ink-300 hover:bg-white/[0.06]">
                  Vazgeç
                </button>
              </div>
            )}
            {(m.status === 'done' || m.status === 'stopped') && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
                {m.status === 'stopped' && <span className="text-amber-300">Durduruldu</span>}
                {m.usage && (
                  <span title={m.usage.simulated ? 'Tahmini değer (demo motoru)' : undefined}>
                    {m.usage.model} · ↑{fmtTokens(m.usage.input)} ↓{fmtTokens(m.usage.output)} · {fmtCost(m.usage.cost)}
                    {m.usage.simulated && ' · tahmini'}
                  </span>
                )}
                {m.undoCursor !== undefined && (m.steps?.some((s) => s.done) ?? false) && (
                  <button type="button" onClick={() => ai.undoRun(m.id)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-ink-300 hover:bg-white/[0.06] hover:text-white">
                    <RotateCcw size={11} /> Geri al
                  </button>
                )}
              </div>
            )}
            {last && m.status === 'done' && m.suggestions && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {m.suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => ai.send(s, [])} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11.5px] text-ink-200 ring-1 ring-white/[0.08] transition hover:bg-accent/20 hover:text-white">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function AiChat() {
  const ai = useAi()
  const b = useB()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [drag, setDrag] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const empty = ai.messages.length === 0
  const loading = files.some((f) => f.loading)

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [ai.messages])
  useLayoutEffect(() => {
    const t = input.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${Math.min(t.scrollHeight, 160)}px`
  }, [text])

  const addFiles = (list: FileList | File[]) => {
    Array.from(list).forEach((file) => {
      const tmp: Attachment = { id: `tmp-${Math.random()}`, name: file.name, size: file.size, kind: 'file', loading: true }
      setFiles((f) => [...f, tmp])
      void readAttachment(file).then((a) => setFiles((f) => f.map((x) => (x.id === tmp.id ? a : x))))
    })
  }

  const submit = (override?: string) => {
    const t = (override ?? text).trim()
    if ((!t && files.length === 0) || loading || ai.running) return
    ai.send(t || 'Bu dosyayı sayfamda kullan', files)
    setText('')
    setFiles([])
    setCollapsed(false)
  }

  const sel = b.selection?.el ? findSection(b.doc, b.selection.sectionId) : undefined

  const composer = (
    <div
      className={cn('relative rounded-2xl border bg-[#1a1b20]/95 shadow-[0_24px_70px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl transition-colors', drag ? 'border-accent' : 'border-white/10')}
      onDragOver={(e: DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e: DragEvent) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDrag(false)
        addFiles(e.dataTransfer.files)
      }}
    >
      <AnimatePresence>
        {drag && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-accent/15 text-[13px] font-semibold text-accent-soft">
            Dosyayı buraya bırak
          </motion.div>
        )}
      </AnimatePresence>
      {(files.length > 0 || sel) && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
          {sel && b.selection?.el && (
            <span className="flex items-center gap-1.5 rounded-lg bg-accent/15 py-1 pl-2 pr-1 text-[11.5px] text-accent-soft ring-1 ring-accent/30">
              <MousePointerClick size={12} /> {sel.name} › {fieldLabel(sel, b.selection.el)}
              <button type="button" aria-label="Bağlamı kaldır" onClick={() => b.select(null)} className="grid size-5 place-items-center rounded hover:bg-white/10">
                <X size={11} />
              </button>
            </span>
          )}
          {files.map((f) => (
            <FileChip key={f.id} f={f} onRemove={() => setFiles((x) => x.filter((y) => y.id !== f.id))} />
          ))}
        </div>
      )}
      <textarea
        ref={input}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        onPaste={(e: ClipboardEvent) => {
          if (e.clipboardData.files.length) {
            e.preventDefault()
            addFiles(e.clipboardData.files)
          }
        }}
        placeholder={sel ? 'Seçili öğe için ne yapayım? Örn: “bunu kısalt”' : 'Siteni nasıl değiştireyim? “demo” yazarak başlayabilirsin…'}
        className="block max-h-40 w-full resize-none bg-transparent px-4 pb-2 pt-3.5 text-[14px] leading-relaxed text-ink-100 outline-none placeholder:text-ink-500"
      />
      <div className="flex items-center gap-1 px-2 pb-2">
        <input ref={fileInput} type="file" multiple accept="image/*,.txt,.md,.csv,.json,.pdf" className="sr-only" onChange={(e) => e.target.files && addFiles(e.target.files)} />
        <button type="button" title="Dosya ekle (görsel, txt, pdf)" onClick={() => fileInput.current?.click()} className="grid size-8 place-items-center rounded-lg text-ink-400 transition hover:bg-white/[0.07] hover:text-white">
          <Paperclip size={16} />
        </button>
        <button
          type="button"
          title="Görsel ekle"
          onClick={() => {
            if (fileInput.current) {
              fileInput.current.accept = 'image/*'
              fileInput.current.click()
              window.setTimeout(() => fileInput.current && (fileInput.current.accept = 'image/*,.txt,.md,.csv,.json,.pdf'), 500)
            }
          }}
          className="grid size-8 place-items-center rounded-lg text-ink-400 transition hover:bg-white/[0.07] hover:text-white"
        >
          <ImageIcon size={16} />
        </button>
        <ModelPicker up title="Modeli değiştir" className="ml-1 flex h-7 max-w-[240px] items-center gap-1.5 overflow-hidden rounded-lg px-2 text-[11.5px] text-ink-400 transition enabled:hover:bg-white/[0.07] enabled:hover:text-ink-100">
          <ProviderLogo id={ai.settings.active} size={14} bare className="size-3.5" />
          <span className="min-w-0 truncate">{ai.engineLabel}</span>
          <ChevronDown size={11} className="shrink-0" />
        </ModelPicker>
        <span className="ml-auto hidden text-[11px] text-ink-600 sm:block">Enter gönder · Shift+Enter satır</span>
        {ai.running ? (
          <button type="button" onClick={ai.stop} className="ml-2 flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[12px] font-semibold text-white hover:bg-white/15">
            <CircleStop size={14} /> Durdur
          </button>
        ) : (
          <button
            type="button"
            aria-label="Gönder"
            disabled={(!text.trim() && files.length === 0) || loading}
            onClick={() => submit()}
            className="ml-2 grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#4f6af7] text-white shadow-lg shadow-indigo-500/25 transition disabled:from-ink-700 disabled:to-ink-700 disabled:text-ink-500 disabled:shadow-none"
          >
            <ArrowUp size={16} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className={cn('pointer-events-none absolute inset-0 z-[55] flex flex-col items-center px-6 transition-colors duration-500', empty ? 'justify-center bg-ink-950/60 backdrop-blur-[3px]' : 'justify-end pb-5')}>
      {!empty && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/45 to-transparent" />}
      <motion.div layout transition={spring} className="pointer-events-auto relative w-full max-w-[720px]">
        <AnimatePresence initial={false}>
          {empty && (
            <motion.div key="intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease }} className="mb-6 text-center">
              <div className="mx-auto mb-4 w-fit">
                <AiAvatar size={48} />
              </div>
              <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-white">Siteni birlikte düzenleyelim</h2>
              <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-300">Ne istediğini yaz, görsel ya da belge ekle. Yaptığım her değişikliği sayfada canlı göreceksin ve tek tıkla geri alabileceksin.</p>
              <div className="mt-6 grid grid-cols-2 gap-2 text-left">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => submit(s.prompt)}
                    className="group rounded-xl border border-white/10 bg-[#1a1b20]/95 px-3.5 py-3 text-left shadow-[0_24px_70px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl transition hover:border-accent/40 hover:bg-[#202127]"
                  >
                    <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink-100">
                      {s.prompt === 'demo' && <Sparkles size={14} className="text-[#a78bfa]" />}
                      {s.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-500">{s.hint}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!empty && (
          <motion.div layout className="mb-2 overflow-hidden rounded-2xl border border-white/10 bg-[#141519]/92 shadow-[0_24px_70px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              <AiAvatar size={20} />
              <span className="text-[12.5px] font-semibold text-ink-100">Pursae AI</span>
              {ai.running && (
                <span className="flex items-center gap-1 rounded-full bg-[#8b5cf6]/15 px-2 py-0.5 text-[10.5px] font-medium text-[#c4b5fd]">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#a78bfa]" /> sayfayı düzenliyor
                </span>
              )}
              <span className="ml-auto" />
              <button type="button" title="Ayarlar" onClick={() => ai.setSettingsOpen('providers')} className="grid size-7 place-items-center rounded-md text-ink-500 hover:bg-white/[0.06] hover:text-white">
                <Settings2 size={14} />
              </button>
              <button type="button" title="Sohbeti temizle" disabled={ai.running} onClick={ai.clear} className="grid size-7 place-items-center rounded-md text-ink-500 hover:bg-white/[0.06] hover:text-white disabled:opacity-40">
                <Trash2 size={14} />
              </button>
              <button type="button" title={collapsed ? 'Genişlet' : 'Küçült'} onClick={() => setCollapsed(!collapsed)} className="grid size-7 place-items-center rounded-md text-ink-500 hover:bg-white/[0.06] hover:text-white">
                {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.3, ease }}>
                  <div ref={list} className="scroll-thin max-h-[min(44vh,420px)] space-y-4 overflow-y-auto px-4 py-4">
                    {ai.messages.map((m, i) => (
                      <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                        <Message m={m} last={i === ai.messages.length - 1} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        {composer}
      </motion.div>
    </div>
  )
}
