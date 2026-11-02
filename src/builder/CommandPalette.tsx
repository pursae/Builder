import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, CornerDownLeft, Eye, Globe, History, Keyboard, Layers, Monitor, Redo2, RotateCcw, Rocket, Search, SlidersHorizontal, Smartphone, Sparkles, Tablet, Undo2, Columns2, LayoutGrid, LayoutTemplate, type LucideIcon } from 'lucide-react'
import { KINDS, TEMPLATES } from './data'
import { openLibrary } from './variants/libraryState'
import { Modal } from './Dialogs'
import { insertBounds, useB } from './store'
import { cn } from './ui'

interface Cmd {
  id: string
  group: string
  label: string
  hint?: string
  icon: LucideIcon
  run: () => void
}

export function CommandPalette() {
  const b = useB()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (b.paletteOpen) {
      setQ('')
      setActive(0)
    }
  }, [b.paletteOpen])

  const cmds = useMemo<Cmd[]>(() => {
    const out: Cmd[] = []
    b.doc.sections.forEach((s, i) =>
      out.push({ id: `go-${s.id}`, group: 'Bölümlere git', label: s.name, hint: `${i + 1}. bölüm`, icon: KINDS[s.kind].icon, run: () => b.select({ sectionId: s.id }, { scroll: true }) }),
    )
    const max = insertBounds(b.doc.sections).max
    out.push({ id: 'add-flex', group: 'Ekle', label: 'Flexbox kapsayıcı', hint: 'Yapı seç', icon: Columns2, run: () => b.setPicker({ index: max, step: 'flex' }) })
    out.push({ id: 'add-grid', group: 'Ekle', label: 'Grid kapsayıcı', hint: 'Yapı seç', icon: LayoutGrid, run: () => b.setPicker({ index: max, step: 'grid' }) })
    out.push({ id: 'library', group: 'Ekle', label: 'Tasarım kütüphanesi', hint: 'Hazır üst menü, karşılama, alt bilgi…', icon: LayoutTemplate, run: () => openLibrary({ mode: 'add' }) })
    TEMPLATES.forEach((t) => out.push({ id: `add-${t.kind}`, group: 'Ekle', label: t.label, hint: KINDS[t.kind].blurb, icon: KINDS[t.kind].icon, run: () => b.add(t) }))
    b.saved.forEach((c) => out.push({ id: `saved-${c.id}`, group: 'Kaydettiklerim', label: c.name, icon: Bookmark, run: () => b.add({ kind: c.section.kind, label: c.name, section: c.section }) }))
    const act = (id: string, label: string, icon: LucideIcon, run: () => void, hint?: string) => out.push({ id, group: 'Eylemler', label, icon, run, hint })
    act('mode', b.mode === 'basic' ? "Studio'ya geç" : 'Basit moda geç', b.mode === 'basic' ? SlidersHorizontal : Sparkles, () => b.setMode(b.mode === 'basic' ? 'studio' : 'basic'))
    act('preview', b.preview ? 'Önizlemeden çık' : 'Önizle', Eye, () => b.setPreview(!b.preview), 'P')
    act('desktop', 'Masaüstü görünümü', Monitor, () => b.setDevice('desktop'))
    act('tablet', 'Tablet görünümü', Tablet, () => b.setDevice('tablet'))
    act('mobile', 'Mobil görünümü', Smartphone, () => b.setDevice('mobile'))
    act('undo', 'Geri al', Undo2, () => b.dispatch({ type: 'undo' }), '⌘Z')
    act('redo', 'Yinele', Redo2, () => b.dispatch({ type: 'redo' }), '⇧⌘Z')
    act('publish', 'Yayınla', Rocket, b.publish)
    act('settings', 'Sayfa ayarları ve SEO', Globe, () => b.setDialog('settings'))
    act('structure', 'Yapı panelini aç/kapat', Layers, () => {
      b.setMode('studio')
      b.setStructureOpen(!b.structureOpen)
    })
    act('history', 'Geçmiş: son değişiklik', History, () => b.notify(`Son değişiklik: ${b.history.entries[b.history.cursor].label}`))
    act('shortcuts', 'Klavye kısayolları', Keyboard, () => b.setDialog('shortcuts'), '?')
    act('reset', 'Sayfayı ilk haline döndür', RotateCcw, b.resetPage)
    return out
  }, [b])

  const query = q.trim().toLocaleLowerCase('tr')
  const filtered = query ? cmds.filter((c) => `${c.label} ${c.group} ${c.hint ?? ''}`.toLocaleLowerCase('tr').includes(query)) : cmds
  const groups = [...new Set(filtered.map((c) => c.group))]
  const ordered = groups.flatMap((g) => filtered.filter((c) => c.group === g))

  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (c?: Cmd) => {
    if (!c) return
    b.setPaletteOpen(false)
    window.setTimeout(c.run, 0)
  }

  return (
    <Modal open={b.paletteOpen} onClose={() => b.setPaletteOpen(false)} width={580} top>
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
        <Search size={17} className="text-ink-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(ordered.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              run(ordered[active])
            } else if (e.key === 'Escape') b.setPaletteOpen(false)
          }}
          placeholder="Bölüm, ekleme ya da komut ara…"
          className="h-14 w-full bg-transparent text-[15px] text-ink-100 outline-none placeholder:text-ink-500"
        />
        <kbd className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10.5px] text-ink-400">Esc</kbd>
      </div>
      <div ref={list} className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
        {ordered.length === 0 && <div className="px-3 py-10 text-center text-[13px] text-ink-500">“{q}” için sonuç yok</div>}
        {groups.map((g) => (
          <div key={g} className="mb-1">
            <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[.1em] text-ink-500">{g}</div>
            {filtered
              .filter((c) => c.group === g)
              .map((c) => {
                const i = ordered.indexOf(c)
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-i={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => run(c)}
                    className={cn('flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors', i === active ? 'bg-accent/15 text-white' : 'text-ink-200')}
                  >
                    <c.icon size={16} strokeWidth={1.7} className={i === active ? 'text-accent-soft' : 'text-ink-400'} />
                    <span className="flex-1 truncate text-[13.5px]">{c.label}</span>
                    {c.hint && <span className="truncate text-[11.5px] text-ink-500">{c.hint}</span>}
                    {i === active && <CornerDownLeft size={13} className="text-ink-400" />}
                  </button>
                )
              })}
          </div>
        ))}
      </div>
    </Modal>
  )
}
