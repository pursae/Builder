import { createContext, useContext } from 'react'
import { CELL_DEFAULTS, KINDS, MAX_DEPTH, cloneSection, createLayout, defaultBox, findSection, getValue, fieldLabel, isCardEl, locate, nestHeight, newItem, resizeCells, uid } from './data'
import type { BgSettings, CellBox, CellType, ContainerBox, Device, ElStyle, GridSettings, Item, PageSettings, SavedComponent, DocState, LayoutType, Mode, Payload, Section, SectionStyle, Selection, SiteSettings } from './types'
export type DocAction =
  | { type: 'field'; id: string; el: string; value: string }
  | { type: 'content'; id: string; key: string; value: string; label: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'style'; id: string; patch: Partial<SectionStyle>; label?: string; key?: string }
  | { type: 'cell'; id: string; itemId: string; cell: CellType }
  | { type: 'nest'; id: string; itemId: string; section: Section }
  | { type: 'structure'; id: string; structure: string }
  | { type: 'box'; id: string; patch: Partial<ContainerBox>; key?: string }
  | { type: 'cellBox'; id: string; itemId: string; patch: Partial<CellBox>; key?: string }
  | { type: 'gridSize'; id: string; cols: number; rows: number }
  | { type: 'elStyle'; id: string; el: string; patch: Partial<ElStyle> | null; key?: string }
  | { type: 'addItem'; id: string; item?: Item }
  | { type: 'removeItem'; id: string; itemId: string }
  | { type: 'move'; id: string; dir: -1 | 1 }
  | { type: 'reorder'; ids: string[] }
  | { type: 'toggleHidden'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'insert'; section: Section; index: number }
  | { type: 'site'; patch: Partial<SiteSettings>; key?: string }
  | { type: 'grid'; id: string; patch: Partial<GridSettings>; key?: string }
  | { type: 'bg'; id: string; patch: Partial<BgSettings>; key?: string; label?: string }
  | { type: 'itemPatch'; id: string; itemId: string; patch: Partial<Item> }
  | { type: 'setElStyle'; id: string; el: string; style: ElStyle }
  | { type: 'replace'; doc: DocState; label: string }
  | { type: 'jump'; cursor: number }
  | { type: 'undo' }
  | { type: 'redo' }

export interface HistoryState {
  entries: { doc: DocState; label: string; at: number }[]
  cursor: number
  lastKey?: string
  lastAt: number
  sv: number // structure version, drives layout animations
  rev: number
}

export const initHistory = (doc: DocState): HistoryState => ({
  entries: [{ doc, label: 'Sayfa açıldı', at: Date.now() }],
  cursor: 0,
  lastAt: 0,
  sv: 0,
  rev: 0,
})

/** Maps the section with `id` wherever it lives (top level or nested in layout cells); null when absent. */
function mapIn(list: Section[], id: string, fn: (s: Section) => Section): Section[] | null {
  let hit = false
  const out = list.map((s) => {
    if (hit) return s
    if (s.id === id) {
      hit = true
      return fn(s)
    }
    if (!s.items.some((i) => i.sub)) return s
    const items = s.items.map((i) => {
      if (hit || !i.sub) return i
      const r = mapIn([i.sub], id, fn)
      if (!r) return i
      hit = true
      return { ...i, sub: r[0] }
    })
    return hit ? { ...s, items } : s
  })
  return hit ? out : null
}

const mapSection = (doc: DocState, id: string, fn: (s: Section) => Section): DocState => {
  const sections = mapIn(doc.sections, id, fn)
  return sections ? { ...doc, sections } : doc
}

const emptyCell = (i: Item): Item => ({ ...i, title: '', text: '', sub: undefined })

/** Allowed index range: nav stays first and footer stays last. */
export function insertBounds(sections: Section[]) {
  const min = sections[0] && KINDS[sections[0].kind].pinned ? 1 : 0
  const last = sections[sections.length - 1]
  const max = last && KINDS[last.kind].pinned && sections.length > min ? sections.length - 1 : sections.length
  return { min, max }
}

function apply(doc: DocState, a: DocAction): { doc: DocState; label: string; key?: string; structural?: boolean } | null {
  switch (a.type) {
    case 'field': {
      const s = findSection(doc, a.id)
      if (!s || getValue(s, a.el) === a.value || isCardEl(a.el)) return null
      const next = mapSection(doc, a.id, (sec) => {
        if (a.el.startsWith('items.')) {
          const [, itemId, f] = a.el.split('.')
          return { ...sec, items: sec.items.map((i) => (i.id === itemId ? { ...i, [f === 'text' ? 'text' : f === 'icon' ? 'icon' : 'title']: a.value } : i)) }
        }
        return { ...sec, content: { ...sec.content, [a.el]: a.value } }
      })
      return { doc: next, label: `${fieldLabel(s, a.el)} düzenlendi`, key: `f:${a.id}:${a.el}` }
    }
    case 'content':
      return { doc: mapSection(doc, a.id, (s) => ({ ...s, content: { ...s.content, [a.key]: a.value } })), label: a.label, key: `c:${a.id}:${a.key}` }
    case 'rename':
      return { doc: mapSection(doc, a.id, (s) => ({ ...s, name: a.name })), label: 'Bölüm adı değişti', key: `n:${a.id}` }
    case 'style':
      return {
        doc: mapSection(doc, a.id, (s) => ({ ...s, style: { ...s.style, ...a.patch } })),
        label: a.label ?? 'Stil değişti',
        key: a.key ? `s:${a.id}:${a.key}` : undefined,
      }
    case 'cell': {
      if (a.cell === 'layout') {
        const loc = locate(doc.sections, a.id)
        if (!loc) return null
        return apply(doc, { type: 'nest', id: a.id, itemId: a.itemId, section: createLayout('flex', '50-50', { nested: true, palette: loc.s.style.palette }) })
      }
      return {
        doc: mapSection(doc, a.id, (s) => ({ ...s, items: s.items.map((i) => (i.id === a.itemId ? { ...emptyCell(i), title: a.cell, text: CELL_DEFAULTS[a.cell] } : i)) })),
        label: a.cell ? 'Hücreye öğe eklendi' : 'Hücre boşaltıldı',
        structural: !!findSection(doc, a.id)?.items.find((i) => i.id === a.itemId)?.sub,
      }
    }
    case 'nest': {
      const loc = locate(doc.sections, a.id)
      if (!loc || loc.depth + nestHeight(a.section) > MAX_DEPTH) return null
      return {
        doc: mapSection(doc, a.id, (s) => ({ ...s, items: s.items.map((i) => (i.id === a.itemId ? { ...i, title: 'layout', text: '', sub: a.section } : i)) })),
        label: `${a.section.content.type === 'grid' ? 'Grid' : 'Flexbox'} kapsayıcı eklendi`,
        structural: true,
      }
    }
    case 'structure':
      return {
        doc: mapSection(doc, a.id, (s) => {
          const content = { ...s.content, structure: a.structure }
          const d = defaultBox({ content, kind: s.kind })
          const box = s.box ? { ...s.box, gridCols: d.gridCols, gridRows: d.gridRows, direction: d.direction } : undefined
          return { ...s, content, box, items: resizeCells(s.items, a.structure).map((i) => (i.box?.width ? { ...i, box: { ...i.box, width: undefined } } : i)) }
        }),
        label: 'Yapı değişti',
        structural: true,
      }
    case 'box':
      return {
        doc: mapSection(doc, a.id, (s) => ({ ...s, box: { ...defaultBox(s), ...s.box, ...a.patch } })),
        label: 'Kapsayıcı ayarı değişti',
        key: a.key ? `b:${a.id}:${a.key}` : undefined,
      }
    case 'elStyle':
      return {
        doc: mapSection(doc, a.id, (s) => {
          const els = { ...s.els }
          if (a.patch === null) delete els[a.el]
          else els[a.el] = { ...els[a.el], ...a.patch }
          return { ...s, els }
        }),
        label: a.patch === null ? 'Öğe stili sıfırlandı' : 'Öğe stili değişti',
        key: a.key ? `e:${a.id}:${a.el}:${a.key}` : undefined,
      }
    case 'cellBox':
      return {
        doc: mapSection(doc, a.id, (s) => ({ ...s, items: s.items.map((i) => (i.id === a.itemId ? { ...i, box: { ...i.box, ...a.patch } } : i)) })),
        label: 'Hücre ayarı değişti',
        key: a.key ? `cb:${a.itemId}:${a.key}` : undefined,
      }
    case 'gridSize': {
      const n = Math.max(1, a.cols * a.rows)
      return {
        doc: mapSection(doc, a.id, (s) => ({
          ...s,
          box: { ...defaultBox(s), ...s.box, gridCols: a.cols, gridRows: a.rows },
          items: Array.from({ length: n }, (_, i) => s.items[i] ?? { id: uid('c'), title: '', text: '' }),
        })),
        label: 'Izgara boyutu değişti',
        key: `g:${a.id}`,
        structural: true,
      }
    }
    case 'addItem': {
      const s = findSection(doc, a.id)
      if (!s) return null
      return { doc: mapSection(doc, a.id, (sec) => ({ ...sec, items: [...sec.items, a.item ?? newItem(sec)] })), label: 'Öğe eklendi' }
    }
    case 'removeItem':
      return { doc: mapSection(doc, a.id, (s) => ({ ...s, items: s.items.filter((i) => i.id !== a.itemId) })), label: 'Öğe silindi' }
    case 'move': {
      const list = [...doc.sections]
      const i = list.findIndex((s) => s.id === a.id)
      const j = i + a.dir
      const { min, max } = insertBounds(list)
      if (i < 0 || KINDS[list[i].kind].pinned || j < min || j >= max) return null
      ;[list[i], list[j]] = [list[j], list[i]]
      return { doc: { ...doc, sections: list }, label: 'Bölüm taşındı', structural: true }
    }
    case 'reorder': {
      const byId = new Map(doc.sections.map((s) => [s.id, s]))
      const moved = a.ids.map((id) => byId.get(id)).filter(Boolean) as Section[]
      const rest = doc.sections.filter((s) => !a.ids.includes(s.id))
      const head = rest.filter((s) => s.kind === 'nav')
      const tail = rest.filter((s) => s.kind !== 'nav')
      return { doc: { ...doc, sections: [...head, ...moved, ...tail] }, label: 'Bölüm taşındı', key: 'reorder', structural: true }
    }
    case 'toggleHidden': {
      const s = findSection(doc, a.id)
      if (!s) return null
      return { doc: mapSection(doc, a.id, (sec) => ({ ...sec, hidden: !sec.hidden })), label: s.hidden ? 'Bölüm gösterildi' : 'Bölüm gizlendi', structural: true }
    }
    case 'remove': {
      const loc = locate(doc.sections, a.id)
      // Nested container: its cell becomes empty again.
      if (loc?.parent && loc.item) {
        const cell = loc.item.id
        return { doc: mapSection(doc, loc.parent.id, (p) => ({ ...p, items: p.items.map((i) => (i.id === cell ? emptyCell(i) : i)) })), label: 'Kapsayıcı silindi', structural: true }
      }
      return { doc: { ...doc, sections: doc.sections.filter((s) => s.id !== a.id) }, label: 'Bölüm silindi', structural: true }
    }
    case 'duplicate': {
      const loc = locate(doc.sections, a.id)
      // Nested container: the copy goes into the next empty sibling cell, or a new cell right after it.
      if (loc?.parent && loc.item) {
        const copy = cloneSection(loc.s, `${loc.s.name} (kopya)`)
        const cell = loc.item.id
        return {
          doc: mapSection(doc, loc.parent.id, (p) => {
            const at = p.items.findIndex((i) => i.id === cell)
            const next = p.items[at + 1]
            if (next && !next.title) return { ...p, items: p.items.map((i) => (i === next ? { ...i, title: 'layout', text: '', sub: copy } : i)) }
            const items = [...p.items]
            items.splice(at + 1, 0, { id: uid('c'), title: 'layout', text: '', sub: copy, box: p.items[at].box ? { ...p.items[at].box } : undefined })
            return { ...p, items }
          }),
          label: 'Kapsayıcı çoğaltıldı',
          structural: true,
        }
      }
      const i = doc.sections.findIndex((s) => s.id === a.id)
      if (i < 0 || KINDS[doc.sections[i].kind].pinned) return null
      const src = doc.sections[i]
      // Free-form sections keep their tree (parent links) and per-node styles.
      const copy: Section = src.kind === 'custom' ? cloneSection(src, `${src.name} (kopya)`) : { ...src, id: uid(), name: `${src.name} (kopya)`, items: src.items.map((x) => ({ ...x, id: uid('i') })) }
      const list = [...doc.sections]
      list.splice(i + 1, 0, copy)
      return { doc: { ...doc, sections: list }, label: 'Bölüm çoğaltıldı', structural: true }
    }
    case 'insert': {
      const { min, max } = insertBounds(doc.sections)
      const idx = Math.max(min, Math.min(max, a.index))
      const list = [...doc.sections]
      list.splice(idx, 0, a.section)
      return { doc: { ...doc, sections: list }, label: `${a.section.name} eklendi`, structural: true }
    }
    case 'bg':
      return {
        doc: mapSection(doc, a.id, (s) => ({ ...s, bg: { ...s.bg, ...a.patch } })),
        label: a.label ?? 'Arka plan değişti',
        key: a.key ? `bg:${a.id}:${a.key}` : undefined,
      }
    case 'grid':
      return {
        doc: mapSection(doc, a.id, (s) => ({ ...s, grid: { ...s.grid, ...a.patch } })),
        label: 'Izgara ayarı değişti',
        key: a.key ? `g:${a.id}:${a.key}` : undefined,
      }
    case 'itemPatch':
      return {
        doc: mapSection(doc, a.id, (s) => ({ ...s, items: s.items.map((i) => (i.id === a.itemId ? { ...i, ...a.patch } : i)) })),
        label: 'Bağlantı değişti',
      }
    case 'setElStyle':
      return { doc: mapSection(doc, a.id, (s) => ({ ...s, els: { ...s.els, [a.el]: a.style } })), label: 'Stil yapıştırıldı' }
    case 'replace':
      return { doc: a.doc, label: a.label, structural: true }
    case 'site':
      return { doc: { ...doc, site: { ...doc.site, ...a.patch } }, label: 'Site stili değişti', key: a.key ? `site:${a.key}` : undefined }
    default:
      return null
  }
}

export function historyReducer(state: HistoryState, a: DocAction): HistoryState {
  if (a.type === 'undo' || a.type === 'redo' || a.type === 'jump') {
    const cursor = a.type === 'jump' ? a.cursor : state.cursor + (a.type === 'undo' ? -1 : 1)
    if (cursor < 0 || cursor >= state.entries.length) return state
    return { ...state, cursor, lastKey: undefined, sv: state.sv + 1, rev: state.rev + 1 }
  }
  const current = state.entries[state.cursor].doc
  const res = apply(current, a)
  if (!res) return state
  const now = Date.now()
  const coalesce = !!res.key && res.key === state.lastKey && now - state.lastAt < 1500
  const kept = state.entries.slice(0, state.cursor + 1)
  const entries = coalesce
    ? [...kept.slice(0, -1), { doc: res.doc, label: res.label, at: now }]
    : [...kept, { doc: res.doc, label: res.label, at: now }].slice(-80)
  return {
    entries,
    cursor: entries.length - 1,
    lastKey: res.key,
    lastAt: now,
    sv: res.structural ? state.sv + 1 : state.sv,
    rev: state.rev + 1,
  }
}

/* ---------- Context ---------- */
export type BasicView = 'list' | 'editor' | 'add' | 'design'
export type StudioTab = 'widgets' | 'components' | 'globals'

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

export interface PickerState {
  index: number
  step: 'type' | LayoutType
}

export interface BuilderApi extends BuilderExtras {
  doc: DocState
  history: HistoryState
  dispatch: (a: DocAction) => void
  canUndo: boolean
  canRedo: boolean
  mode: Mode
  setMode: (m: Mode) => void
  device: Device
  setDevice: (d: Device) => void
  preview: boolean
  setPreview: (b: boolean) => void
  selection: Selection | null
  select: (sel: Selection | null, opts?: { focus?: boolean; scroll?: boolean }) => void
  hoverSection: string | null
  setHoverSection: (id: string | null) => void
  activeField: Selection | null
  setActiveField: (f: Selection | null) => void
  focusReq: (Selection & { n: number }) | null
  scrollReq: { id: string; n: number } | null
  basicView: BasicView
  setBasicView: (v: BasicView) => void
  studioTab: StudioTab
  setStudioTab: (t: StudioTab) => void
  picker: PickerState | null
  boxHint: 'margin' | 'padding' | null
  setBoxHint: (h: 'margin' | 'padding' | null) => void
  setPicker: (p: PickerState | null) => void
  insertAt: number | null
  setInsertAt: (i: number | null) => void
  dragging: Payload | null
  setDragging: (p: Payload | null) => void
  drop: number | null
  setDrop: (i: number | null) => void
  add: (p: Payload, index?: number) => void
  remove: (id: string) => void
  notify: (text: string, action?: Toast['action']) => void
  structureOpen: boolean
  setStructureOpen: (b: boolean) => void
  publishState: 'idle' | 'busy'
  dirty: boolean
  publish: () => void
}

export interface MenuState {
  x: number
  y: number
  sectionId: string
  el?: string
}

export interface Milestones {
  title: boolean
  color: boolean
  section: boolean
  publish: boolean
  dismissed: boolean
}

export interface BuilderExtras {
  clipboard: Section | null
  copySection: (id: string) => void
  pasteSection: (afterId?: string) => void
  styleClipboard: ElStyle | null
  copyStyle: (id: string, el: string) => void
  pasteStyle: (id: string, el: string) => void
  saved: SavedComponent[]
  saveComponent: (id: string, name: string) => void
  removeSaved: (id: string) => void
  menu: MenuState | null
  setMenu: (m: MenuState | null) => void
  paletteOpen: boolean
  setPaletteOpen: (b: boolean) => void
  dialog: 'settings' | 'shortcuts' | { save: string } | null
  setDialog: (d: BuilderExtras['dialog']) => void
  page: PageSettings
  setPage: (p: PageSettings) => void
  saveState: 'saved' | 'saving'
  scrollTo: (id: string) => void
  milestones: Milestones
  setMilestone: (k: keyof Milestones) => void
  resetPage: () => void
}

export const BuilderCtx = createContext<BuilderApi | null>(null)

export function useB() {
  const v = useContext(BuilderCtx)
  if (!v) throw new Error('useB must be used inside <Builder>')
  return v
}
