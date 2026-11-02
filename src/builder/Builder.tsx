import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { BasicPanel } from './BasicPanel'
import { Canvas } from './Canvas'
import { StructurePanel, StudioPanel } from './StudioPanel'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'
import { AiChat } from './ai/AiChat'
import { AiProvider } from './ai/AiProvider'
import { AiSettings } from './ai/AiSettings'
import { AiSidePanel } from './ai/AiSidePanel'
import { ContextMenu } from './ContextMenu'
import { deleteSelection, duplicateSelection, parentSelection } from './selectionActions'
import { Dialogs } from './Dialogs'
import { LibraryHost } from './variants/LibraryHost'
import { STORE_KEY, cloneSection, createSection, findSection, initialDoc, loadDoc, loadJSON, locate, saveJSON } from './data'
import { BuilderCtx, historyReducer, initHistory, insertBounds, type BasicView, type BuilderApi, type BuilderExtras, type MenuState, type Milestones, type PickerState, type StudioTab, type Toast } from './store'
import type { Device, ElStyle, Mode, PageSettings, Payload, SavedComponent, Section, Selection } from './types'
import { cn, ease } from './ui'

const PANEL_W = 316

export default function Builder() {
  const [history, dispatch] = useReducer(historyReducer, initialDoc, (d) => initHistory(loadDoc() ?? d))
  const doc = history.entries[history.cursor].doc

  const [mode, setModeRaw] = useState<Mode>('basic')
  const [device, setDevice] = useState<Device>('desktop')
  const [preview, setPreview] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [hoverSection, setHoverSection] = useState<string | null>(null)
  const [activeField, setActiveField] = useState<Selection | null>(null)
  const [focusReq, setFocusReq] = useState<BuilderApi['focusReq']>(null)
  const [scrollReq, setScrollReq] = useState<BuilderApi['scrollReq']>(null)
  const [basicView, setBasicView] = useState<BasicView>('list')
  const [studioTab, setStudioTab] = useState<StudioTab>('widgets')
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [boxHint, setBoxHint] = useState<'margin' | 'padding' | null>(null)
  const [dragging, setDragging] = useState<Payload | null>(null)
  const [drop, setDrop] = useState<number | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [structureOpen, setStructureOpen] = useState(true)
  const [publishState, setPublishState] = useState<'idle' | 'busy'>('idle')
  const [publishedRev, setPublishedRev] = useState(0)
  const canvasArea = useRef<HTMLDivElement>(null)
  const [clipboard, setClipboard] = useState<Section | null>(null)
  const [styleClipboard, setStyleClipboard] = useState<ElStyle | null>(null)
  const [saved, setSaved] = useState<SavedComponent[]>(() => loadJSON('pursae-builder:saved', []))
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [dialog, setDialog] = useState<BuilderExtras['dialog']>(null)
  const [page, setPage] = useState<PageSettings>(() =>
    loadJSON('pursae-builder:page', { title: 'Pursae — WordPress, Go’nun hızıyla', slug: '', description: 'Pursae, WordPress çekirdeğini Go ile yeniden yazar: tek binary, PostgreSQL ve WebAssembly eklentiler.', indexable: true }),
  )
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [flags, setFlags] = useState<Pick<Milestones, 'section' | 'publish' | 'dismissed'>>(() => loadJSON('pursae-builder:flags', { section: false, publish: false, dismissed: false }))

  const notify = useCallback<BuilderApi['notify']>((text, action) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, action }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 5000 : 2600)
  }, [])

  const select = useCallback<BuilderApi['select']>(
    (sel, opts) => {
      setSelection(sel)
      if (sel) {
        if (mode === 'basic') setBasicView('editor')
        if (opts?.focus && sel.el) setFocusReq({ ...sel, n: Date.now() })
        if (opts?.scroll) setScrollReq({ id: sel.sectionId, n: Date.now() })
      } else {
        setBasicView((v) => (v === 'editor' ? 'list' : v))
      }
    },
    [mode],
  )

  const setMode = useCallback(
    (m: Mode) => {
      if (m === mode) return
      setModeRaw(m)
      setInsertAt(null)
      setBasicView(selection ? 'editor' : 'list')
      notify(m === 'basic' ? 'Basit mod · yalnızca ihtiyacın olanlar' : m === 'studio' ? 'Studio · tüm araçlar açık' : 'AI · sohbet ederek düzenle')
    },
    [mode, selection, notify],
  )

  const add = useCallback<BuilderApi['add']>(
    (p, index) => {
      const { sections } = doc
      const selIdx = sections.findIndex((s) => s.id === locate(sections, selection?.sectionId)?.root.id)
      const at = index ?? insertAt ?? (selIdx >= 0 ? selIdx + 1 : insertBounds(sections).max)
      // Flexbox / Grid without a structure: ask for the structure first, Elementor-style.
      if (p.kind === 'layout' && !p.section && !p.content?.structure) {
        setPicker({ index: at, step: p.content?.type === 'grid' ? 'grid' : p.content?.type === 'flex' ? 'flex' : 'type' })
        setInsertAt(null)
        return
      }
      const section = p.section ? cloneSection(p.section) : createSection(p.kind, p.content)
      dispatch({ type: 'insert', section, index: at })
      setFlags((f) => ({ ...f, section: true }))
      setInsertAt(null)
      setSelection({ sectionId: section.id })
      if (mode === 'basic') setBasicView('editor')
      window.setTimeout(() => setScrollReq({ id: section.id, n: Date.now() }), 80)
      notify(`${p.label} eklendi`)
    },
    [doc, selection, insertAt, mode, notify],
  )

  const remove = useCallback(
    (id: string) => {
      const s = findSection(doc, id)
      dispatch({ type: 'remove', id })
      if (selection?.sectionId === id) {
        setSelection(null)
        setBasicView((v) => (v === 'editor' ? 'list' : v))
      }
      notify(`${s?.name ?? 'Bölüm'} silindi`, { label: 'Geri al', run: () => dispatch({ type: 'undo' }) })
    },
    [doc, selection, notify],
  )

  const publish = useCallback(() => {
    setPublishState('busy')
    const rev = history.rev
    window.setTimeout(() => {
      setPublishState('idle')
      setPublishedRev(rev)
      setFlags((f) => ({ ...f, publish: true }))
      notify('Sayfa yayınlandı')
    }, 1300)
  }, [history.rev, notify])

  /* ---------- Autosave ---------- */
  useEffect(() => {
    if (history.rev === 0) return
    setSaveState('saving')
    const t = window.setTimeout(() => {
      saveJSON(STORE_KEY, doc)
      setSaveState('saved')
    }, 500)
    return () => window.clearTimeout(t)
  }, [history.rev, doc])
  useEffect(() => saveJSON('pursae-builder:saved', saved), [saved])
  useEffect(() => saveJSON('pursae-builder:page', page), [page])
  useEffect(() => saveJSON('pursae-builder:flags', flags), [flags])

  /* ---------- Clipboard & saved components ---------- */
  const copySection = useCallback(
    (id: string) => {
      const s = findSection(doc, id)
      if (!s) return
      setClipboard(s)
      notify(`${s.name} kopyalandı · ⌘V ile yapıştır`)
    },
    [doc, notify],
  )
  const pasteSection = useCallback(
    (afterId?: string) => {
      if (!clipboard) return
      const ref = afterId ?? selection?.sectionId
      const root = locate(doc.sections, ref)?.root.id
      const idx = root ? doc.sections.findIndex((s) => s.id === root) + 1 : insertBounds(doc.sections).max
      const section = cloneSection(clipboard)
      dispatch({ type: 'insert', section, index: idx })
      setSelection({ sectionId: section.id })
      window.setTimeout(() => setScrollReq({ id: section.id, n: Date.now() }), 80)
      notify(`${section.name} yapıştırıldı`)
    },
    [clipboard, doc, selection, notify],
  )
  const copyStyle = useCallback(
    (id: string, el: string) => {
      const s = findSection(doc, id)
      const { hide: _h, removed: _r, ...style } = s?.els?.[el] ?? {}
      setStyleClipboard(style)
      notify('Stil kopyalandı')
    },
    [doc, notify],
  )
  const pasteStyle = useCallback(
    (id: string, el: string) => {
      if (!styleClipboard) return
      const own = findSection(doc, id)?.els?.[el]
      dispatch({ type: 'setElStyle', id, el, style: { ...styleClipboard, ...(own?.hide ? { hide: true } : {}), ...(own?.removed ? { removed: true } : {}) } })
      notify('Stil yapıştırıldı')
    },
    [doc, styleClipboard, notify],
  )
  const saveComponent = useCallback(
    (id: string, name: string) => {
      const s = findSection(doc, id)
      if (!s) return
      setSaved((list) => [{ id: `${Date.now()}`, name: name || s.name, section: cloneSection(s, name || s.name) }, ...list])
      notify(`“${name || s.name}” bileşenlerine kaydedildi`)
    },
    [doc, notify],
  )
  const removeSaved = useCallback((id: string) => setSaved((l) => l.filter((x) => x.id !== id)), [])
  const scrollTo = useCallback((id: string) => setScrollReq({ id, n: Date.now() }), [])
  const resetPage = useCallback(() => {
    dispatch({ type: 'replace', doc: initialDoc, label: 'Sayfa sıfırlandı' })
    setSelection(null)
    setBasicView('list')
    notify('Sayfa ilk haline döndü', { label: 'Geri al', run: () => dispatch({ type: 'undo' }) })
  }, [notify])

  const hero = doc.sections.find((s) => s.kind === 'hero')
  const milestones: Milestones = {
    title: !!hero && (hero.content.title !== 'WordPress,' || hero.content.accent !== "Go'nun hızıyla."),
    color: doc.site.brand !== initialDoc.site.brand || doc.site.fontPair !== initialDoc.site.fontPair || doc.site.corners !== initialDoc.site.corners,
    ...flags,
  }
  const setMilestone = useCallback((k: keyof Milestones) => {
    if (k === 'section' || k === 'publish' || k === 'dismissed') setFlags((f) => ({ ...f, [k]: true }))
  }, [])

  // Keep selection valid after undo/redo/removal.
  useEffect(() => {
    const s = selection && findSection(doc, selection.sectionId)
    if (selection && !s) {
      setSelection(null)
      setBasicView((v) => (v === 'editor' ? 'list' : v))
    } else if (s && selection?.el?.startsWith('items.') && !s.items.some((i) => i.id === selection.el!.split('.')[1])) {
      setSelection({ sectionId: s.id })
    }
  }, [doc, selection])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      const textSelected = !!window.getSelection()?.toString()
      if (mod && key === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      if (mod && key === 's') {
        e.preventDefault()
        notify('Değişiklikler otomatik kaydediliyor')
        return
      }
      const sel = { doc, dispatch, select, notify, remove }
      if (!typing && mod && key === 'd' && selection) {
        e.preventDefault()
        duplicateSelection(sel, selection)
        return
      }
      if (!typing && mod && key === 'c' && selection && !textSelected) {
        copySection(selection.sectionId)
        return
      }
      if (!typing && mod && key === 'v' && clipboard) {
        e.preventDefault()
        pasteSection()
        return
      }
      if (!typing && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && selection) {
        e.preventDefault()
        dispatch({ type: 'move', id: selection.sectionId, dir: e.key === 'ArrowUp' ? -1 : 1 })
        return
      }
      if (!typing && e.key === '?') {
        setDialog('shortcuts')
        return
      }
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault()
        dispatch({ type: 'redo' })
      } else if (e.key === 'Escape' && !typing) {
        if (menu) setMenu(null)
        else if (preview) setPreview(false)
        else if (picker) setPicker(null)
        else select(parentSelection(doc, selection))
      } else if (!typing && !mod && e.key.toLowerCase() === 'p') {
        setPreview((p) => !p)
      } else if (!typing && e.key === '/' && mode === 'studio') {
        e.preventDefault()
        setSelection(null)
        setStudioTab('widgets')
        window.setTimeout(() => document.getElementById('widget-search')?.focus(), 320)
      } else if (!typing && !mod && !preview && (e.key === 'Delete' || e.key === 'Backspace') && selection) {
        // Only the selected item: element, cell content, container or (if the section itself is selected) the section.
        e.preventDefault()
        if (!e.repeat) deleteSelection(sel, selection)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview, select, selection, doc, remove, mode, picker, menu, clipboard, copySection, pasteSection, notify])

  const api: BuilderApi = useMemo(
    () => ({
      doc,
      history,
      dispatch,
      canUndo: history.cursor > 0,
      canRedo: history.cursor < history.entries.length - 1,
      mode,
      setMode,
      device,
      setDevice,
      preview,
      setPreview,
      selection,
      select,
      hoverSection,
      setHoverSection,
      activeField,
      setActiveField,
      focusReq,
      scrollReq,
      basicView,
      setBasicView,
      studioTab,
      setStudioTab,
      picker,
      setPicker,
      boxHint,
      setBoxHint,
      insertAt,
      setInsertAt,
      dragging,
      setDragging,
      drop,
      setDrop,
      add,
      remove,
      notify,
      structureOpen,
      setStructureOpen,
      publishState,
      dirty: history.rev !== publishedRev,
      publish,
      clipboard,
      copySection,
      pasteSection,
      styleClipboard,
      copyStyle,
      pasteStyle,
      saved,
      saveComponent,
      removeSaved,
      menu,
      setMenu,
      paletteOpen,
      setPaletteOpen,
      dialog,
      setDialog,
      page,
      setPage,
      saveState,
      scrollTo,
      milestones,
      setMilestone,
      resetPage,
    }),
    [doc, history, mode, setMode, device, preview, selection, select, hoverSection, activeField, focusReq, scrollReq, basicView, studioTab, picker, boxHint, insertAt, dragging, drop, add, remove, notify, structureOpen, publishState, publishedRev, publish, clipboard, copySection, pasteSection, styleClipboard, copyStyle, pasteStyle, saved, saveComponent, removeSaved, menu, paletteOpen, dialog, page, saveState, scrollTo, milestones, setMilestone, resetPage],
  )

  const panelOpen = !preview && !collapsed

  return (
    <MotionConfig reducedMotion="user">
      <BuilderCtx.Provider value={api}>
        <AiProvider>
        <div className="flex h-full flex-col">
          <TopBar />
          <div className="flex min-h-0 flex-1">
            <motion.aside
              initial={false}
              animate={{ width: panelOpen ? PANEL_W : 0 }}
              transition={{ duration: 0.42, ease }}
              className="relative shrink-0 overflow-hidden border-r border-white/[0.07] bg-ink-900"
            >
              <div className="absolute inset-y-0 left-0" style={{ width: PANEL_W }}>
                <AnimatePresence initial={false}>
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: mode === 'basic' ? -24 : 24, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: mode === 'basic' ? 24 : -24, filter: 'blur(6px)' }}
                    transition={{ duration: 0.36, ease }}
                    className="absolute inset-0"
                  >
                    {mode === 'basic' ? <BasicPanel /> : mode === 'studio' ? <StudioPanel /> : <AiSidePanel />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.aside>

            <div ref={canvasArea} className="relative flex min-w-0 flex-1">
              {!preview && (
                <button
                  type="button"
                  aria-label={collapsed ? 'Paneli aç' : 'Paneli kapat'}
                  onClick={() => setCollapsed((c) => !c)}
                  className="absolute left-0 top-1/2 z-40 grid h-12 w-4 -translate-y-1/2 place-items-center rounded-r-md bg-ink-800 text-ink-400 ring-1 ring-white/10 transition hover:w-5 hover:text-white"
                >
                  {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                </button>
              )}
              <Canvas />
              <AnimatePresence>
                {mode === 'ai' && !preview && (
                  <motion.div key="ai-chat" className="pointer-events-none absolute inset-0 z-[55]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <AiChat />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>{mode === 'studio' && structureOpen && !preview && <StructurePanel key="structure" constraints={canvasArea} />}</AnimatePresence>
              <AnimatePresence>
                {preview && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setPreview(false)}
                    className="absolute left-1/2 top-4 z-50 flex h-9 -translate-x-1/2 items-center gap-2 rounded-full bg-black/80 pl-4 pr-3 text-[12.5px] font-medium text-white shadow-xl backdrop-blur"
                  >
                    Önizleme · düzenlemeye dön <kbd className="rounded bg-white/15 px-1.5 font-mono text-[10.5px]">Esc</kbd>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <ContextMenu />
          <CommandPalette />
          <Dialogs />
          <LibraryHost />
          <AiSettings />

          {/* toasts */}
          <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2">
            <AnimatePresence initial={false}>
              {toasts.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.28, ease }}
                  className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-[#1e2025]/95 py-2 pl-4 pr-2 text-[12.5px] text-ink-100 shadow-2xl shadow-black/50 backdrop-blur"
                >
                  {t.text}
                  {t.action ? (
                    <button
                      type="button"
                      onClick={() => {
                        t.action?.run()
                        setToasts((x) => x.filter((y) => y.id !== t.id))
                      }}
                      className="rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-white"
                    >
                      {t.action.label}
                    </button>
                  ) : (
                    <button type="button" aria-label="Kapat" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className={cn('grid size-6 place-items-center rounded-full text-ink-400 hover:text-white')}>
                      <X size={13} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        </AiProvider>
      </BuilderCtx.Provider>
    </MotionConfig>
  )
}
