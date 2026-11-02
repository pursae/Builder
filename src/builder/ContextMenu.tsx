import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, BookmarkPlus, ClipboardCopy, ClipboardPaste, Copy, CornerLeftUp, Eye, EyeOff, LayoutTemplate, Paintbrush, Pencil, RotateCcw, Settings2, Trash2, type LucideIcon } from 'lucide-react'
import { KINDS, locate } from './data'
import { hasVariants } from './variants'
import { openLibrary } from './variants/libraryState'
import { deleteSelection, describeTarget, duplicateSelection, resolveTarget, toggleHideSelection } from './selectionActions'
import { useB } from './store'
import { cn } from './ui'

type Entry = { label: string; icon: LucideIcon; run: () => void; kbd?: string; danger?: boolean; disabled?: boolean } | 'sep' | { title: string }

export function ContextMenu() {
  const b = useB()
  const m = b.menu
  useEffect(() => {
    if (!m) return
    const close = () => b.setMenu(null)
    window.addEventListener('mousedown', close)
    window.addEventListener('resize', close)
    window.addEventListener('wheel', close, { passive: true })
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('wheel', close)
    }
  }, [m, b])

  const loc = m ? locate(b.doc.sections, m.sectionId) : undefined
  const s = loc?.s
  const entries: Entry[] = []
  if (m && s) {
    const pinned = !!KINDS[s.kind].pinned
    const studio = b.mode === 'studio'
    const parent = loc?.parent
    const t = m.el ? resolveTarget(b.doc, { sectionId: s.id, el: m.el }) : null
    if (m.el && t) {
      // Element actions apply to the right-clicked element only; the section has its own explicit delete below.
      const el = m.el
      const target = { sectionId: s.id, el }
      const empty = t.kind === 'cell' && !t.item?.title
      const hidden = !!s.els?.[el]?.hide
      entries.push({ title: describeTarget(t) })
      entries.push({ label: 'Düzenle', icon: Pencil, run: () => b.select(target, { focus: true }), disabled: empty })
      if (studio) {
        entries.push({ label: 'Stili kopyala', icon: Paintbrush, run: () => b.copyStyle(s.id, el), disabled: empty })
        entries.push({ label: 'Stili yapıştır', icon: ClipboardPaste, run: () => b.pasteStyle(s.id, el), disabled: !b.styleClipboard || empty })
      }
      entries.push({ label: 'Öğe ayarlarını sıfırla', icon: RotateCcw, run: () => b.dispatch({ type: 'elStyle', id: s.id, el, patch: null }), disabled: !s.els?.[el] })
      entries.push('sep')
      entries.push({ label: 'Çoğalt', icon: Copy, kbd: '⌘D', run: () => duplicateSelection(b, target), disabled: t.kind === 'field' || empty })
      entries.push({ label: hidden ? 'Göster' : 'Gizle', icon: hidden ? Eye : EyeOff, run: () => toggleHideSelection(b, target), disabled: empty })
      entries.push({ label: t.kind === 'item' ? `Sil · ${t.name}` : 'Sil', icon: Trash2, kbd: '⌫', danger: true, run: () => deleteSelection(b, target), disabled: empty })
      entries.push({ label: 'Üst öğeyi seç', icon: CornerLeftUp, kbd: 'Esc', run: () => b.select({ sectionId: s.id }) })
      entries.push('sep')
      entries.push({ title: parent ? `İç kapsayıcı · ${s.name}` : `Bölüm · ${s.name}` })
      if (!parent && hasVariants(s.kind)) entries.push({ label: 'Tasarımı değiştir', icon: LayoutTemplate, run: () => openLibrary({ mode: 'change', sectionId: s.id, kind: s.kind }) })
      entries.push({ label: parent ? 'Kapsayıcıyı sil' : 'Bölümü sil', icon: Trash2, danger: true, run: () => b.remove(s.id), disabled: pinned })
    } else {
      entries.push({ title: parent ? `İç kapsayıcı · ${s.name}` : `Bölüm · ${s.name}` })
      entries.push({ label: parent ? 'Kapsayıcıyı düzenle' : 'Bölümü düzenle', icon: Settings2, run: () => b.select({ sectionId: s.id }) })
      if (!parent && hasVariants(s.kind)) entries.push({ label: 'Tasarımı değiştir', icon: LayoutTemplate, run: () => openLibrary({ mode: 'change', sectionId: s.id, kind: s.kind }) })
      if (parent) entries.push({ label: 'Üst kapsayıcıyı seç', icon: CornerLeftUp, run: () => b.select({ sectionId: parent.id }) })
      entries.push({ label: 'Çoğalt', icon: Copy, kbd: '⌘D', run: () => b.dispatch({ type: 'duplicate', id: s.id }), disabled: pinned })
      entries.push({ label: 'Kopyala', icon: ClipboardCopy, kbd: '⌘C', run: () => b.copySection(s.id), disabled: pinned })
      entries.push({ label: 'Altına yapıştır', icon: ClipboardPaste, kbd: '⌘V', run: () => b.pasteSection(s.id), disabled: !b.clipboard || s.kind === 'footer' })
      entries.push({ label: 'Bileşen olarak kaydet', icon: BookmarkPlus, run: () => b.setDialog({ save: s.id }), disabled: pinned })
      entries.push('sep')
      if (!parent) {
        entries.push({ label: 'Yukarı taşı', icon: ArrowUp, kbd: '⌥↑', run: () => b.dispatch({ type: 'move', id: s.id, dir: -1 }), disabled: pinned })
        entries.push({ label: 'Aşağı taşı', icon: ArrowDown, kbd: '⌥↓', run: () => b.dispatch({ type: 'move', id: s.id, dir: 1 }), disabled: pinned })
      }
      entries.push({ label: s.hidden ? 'Göster' : 'Gizle', icon: s.hidden ? Eye : EyeOff, run: () => b.dispatch({ type: 'toggleHidden', id: s.id }) })
      entries.push({ label: parent ? 'Kapsayıcıyı sil' : 'Bölümü sil', icon: Trash2, kbd: '⌫', danger: true, run: () => b.remove(s.id), disabled: pinned })
    }
  }

  const left = m ? Math.min(m.x, window.innerWidth - 248) : 0
  const top = m ? Math.min(m.y, window.innerHeight - entries.length * 31 - 16) : 0

  return createPortal(
    <AnimatePresence>
      {m && s && (
        <motion.div
          key={`${m.sectionId}-${m.el}-${m.x}-${m.y}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
          transition={{ duration: 0.12 }}
          style={{ left, top, transformOrigin: 'top left' }}
          className="fixed z-[90] w-[232px] rounded-xl border border-white/10 bg-[#1e2025]/98 p-1.5 shadow-2xl shadow-black/60 backdrop-blur"
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {entries.map((en, i) =>
            en === 'sep' ? (
              <div key={i} className="mx-2 my-1 h-px bg-white/[0.07]" />
            ) : 'title' in en ? (
              <div key={i} className="truncate px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[.08em] text-ink-500">
                {en.title}
              </div>
            ) : (
              <button
                key={i}
                type="button"
                disabled={en.disabled}
                onClick={() => {
                  en.run()
                  b.setMenu(null)
                }}
                className={cn(
                  'flex h-[30px] w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[12.5px] transition-colors disabled:opacity-35',
                  en.danger ? 'text-red-300 hover:bg-red-500/15' : 'text-ink-200 hover:bg-white/[0.07] hover:text-white',
                )}
              >
                <en.icon size={14} strokeWidth={1.8} />
                <span className="flex-1">{en.label}</span>
                {en.kbd && <span className="font-mono text-[10.5px] text-ink-500">{en.kbd}</span>}
              </button>
            ),
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
