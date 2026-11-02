import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BookmarkPlus, Globe, Keyboard, X } from 'lucide-react'
import { findSection } from './data'
import { useB } from './store'
import { Toggle, cn, ease } from './ui'

export function Modal({ open, onClose, children, width = 520, top }: { open: boolean; onClose: () => void; children: ReactNode; width?: number; top?: boolean }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn('fixed inset-0 z-[80] flex justify-center bg-black/55 p-6 backdrop-blur-[2px]', top ? 'items-start pt-[12vh]' : 'items-center')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width }}
            className="max-h-[80vh] max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink-850 text-ink-100 shadow-[0_40px_120px_-20px_rgba(0,0,0,.8)]"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Head({ icon: I, title, sub, onClose }: { icon: typeof Globe; title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.07] px-5 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-soft">
        <I size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {sub && <p className="mt-0.5 text-[12.5px] text-ink-400">{sub}</p>}
      </div>
      <button type="button" aria-label="Kapat" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-white/[0.06] hover:text-white">
        <X size={16} />
      </button>
    </div>
  )
}

const field = 'w-full rounded-[10px] border border-white/[0.08] bg-ink-800 px-3 py-2.5 text-[14px] text-ink-100 outline-none transition placeholder:text-ink-500 focus:border-accent focus:ring-4 focus:ring-accent/20'

function slugify(t: string) {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }
  return t
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (c) => map[c])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function PageSettingsDialog() {
  const b = useB()
  const p = b.page
  const set = (patch: Partial<typeof p>) => b.setPage({ ...p, ...patch })
  const close = () => b.setDialog(null)
  const url = `pursae.dev/${p.slug || ''}`
  return (
    <>
      <Head icon={Globe} title="Sayfa ayarları" sub="Google'da ve paylaşımlarda sayfan nasıl görünsün?" onClose={close} />
      <div className="scroll-thin max-h-[60vh] space-y-4 overflow-y-auto px-5 py-5">
        <label className="block">
          <span className="mb-1.5 flex justify-between text-[12.5px] font-medium text-ink-300">
            Sayfa başlığı <span className={cn(p.title.length > 60 ? 'text-amber-300' : 'text-ink-500')}>{p.title.length}/60</span>
          </span>
          <input value={p.title} onChange={(e) => set({ title: e.target.value })} className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-300">Adres</span>
          <div className="flex items-center rounded-[10px] border border-white/[0.08] bg-ink-800 pl-3 focus-within:border-accent">
            <span className="text-[14px] text-ink-500">pursae.dev/</span>
            <input value={p.slug} placeholder="ana-sayfa için boş bırak" onChange={(e) => set({ slug: slugify(e.target.value) })} className="w-full bg-transparent px-1 py-2.5 text-[14px] outline-none placeholder:text-ink-500" />
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-[12.5px] font-medium text-ink-300">
            Açıklama <span className={cn(p.description.length > 160 ? 'text-amber-300' : 'text-ink-500')}>{p.description.length}/160</span>
          </span>
          <textarea rows={3} value={p.description} onChange={(e) => set({ description: e.target.value })} className={cn(field, 'resize-none')} />
        </label>
        <div className="flex items-center justify-between rounded-[10px] bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.06]">
          <div>
            <div className="text-[13px] font-medium">Arama motorlarında göster</div>
            <div className="text-[12px] text-ink-500">Kapalıyken Google bu sayfayı listelemez.</div>
          </div>
          <Toggle label="Arama motorlarında göster" on={p.indexable} onChange={(v) => set({ indexable: v })} />
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-500">Google önizlemesi</div>
          <div className="rounded-xl bg-white p-4 font-[Arial,sans-serif]">
            <div className="text-[12px] text-[#4d5156]">{url}</div>
            <div className="mt-0.5 truncate text-[18px] leading-snug text-[#1a0dab]">{p.title || 'Başlıksız sayfa'}</div>
            <div className="mt-1 line-clamp-2 text-[13px] leading-[1.5] text-[#4d5156]">{p.description || 'Açıklama eklenmedi.'}</div>
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-white/[0.07] px-5 py-3">
        <button type="button" onClick={close} className="h-9 rounded-lg bg-accent px-4 text-[13px] font-semibold text-white hover:bg-[#6b89ff]">
          Tamam
        </button>
      </div>
    </>
  )
}

export const SHORTCUTS: [string, string][] = [
  ['⌘ K', 'Komut paleti: her şeyi ara'],
  ['⌘ Z  /  ⇧ ⌘ Z', 'Geri al / Yinele'],
  ['⌘ C  /  ⌘ V', 'Bölümü kopyala / altına yapıştır'],
  ['⌘ D', 'Bölümü çoğalt'],
  ['⌥ ↑  /  ⌥ ↓', 'Bölümü yukarı / aşağı taşı'],
  ['⌫', 'Seçili bölümü sil'],
  ['Çift tık', 'Yazıyı sayfada düzenle'],
  ['Sağ tık', 'Öğe ve bölüm menüsü'],
  ['P', 'Önizleme aç / kapat'],
  ['/', 'Widget ara (Studio)'],
  ['Esc', 'Seçimi kaldır / kapat'],
  ['Shift + sürükle', 'Boşlukları 1px adımla ayarla'],
  ['?', 'Bu listeyi aç'],
]

function ShortcutsDialog() {
  const b = useB()
  return (
    <>
      <Head icon={Keyboard} title="Klavye kısayolları" sub="Windows'ta ⌘ yerine Ctrl kullan." onClose={() => b.setDialog(null)} />
      <div className="grid gap-px p-3">
        {SHORTCUTS.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.03]">
            <span className="text-[13px] text-ink-200">{d}</span>
            <kbd className="rounded-md bg-white/[0.07] px-2 py-1 font-mono text-[11px] text-ink-300">{k}</kbd>
          </div>
        ))}
      </div>
    </>
  )
}

function SaveDialog({ sectionId }: { sectionId: string }) {
  const b = useB()
  const s = findSection(b.doc, sectionId)
  const [name, setName] = useState(s ? `${s.name} · özel` : '')
  useEffect(() => setName(s ? `${s.name} · özel` : ''), [s?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => b.setDialog(null)
  const save = () => {
    b.saveComponent(sectionId, name.trim())
    close()
  }
  return (
    <>
      <Head icon={BookmarkPlus} title="Bileşen olarak kaydet" sub="Kaydettiğin bölümü tüm ayarlarıyla istediğin yere tekrar ekleyebilirsin." onClose={close} />
      <div className="px-5 py-5">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} className={field} placeholder="Bileşen adı" />
      </div>
      <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-3">
        <button type="button" onClick={close} className="h-9 rounded-lg px-4 text-[13px] font-medium text-ink-300 hover:bg-white/[0.06]">
          Vazgeç
        </button>
        <button type="button" onClick={save} className="h-9 rounded-lg bg-accent px-4 text-[13px] font-semibold text-white hover:bg-[#6b89ff]">
          Kaydet
        </button>
      </div>
    </>
  )
}

export function Dialogs() {
  const b = useB()
  const d = b.dialog
  return (
    <Modal open={!!d} onClose={() => b.setDialog(null)} width={d === 'shortcuts' ? 460 : 520}>
      {d === 'settings' && <PageSettingsDialog />}
      {d === 'shortcuts' && <ShortcutsDialog />}
      {d && typeof d === 'object' && <SaveDialog sectionId={d.save} />}
    </Modal>
  )
}
