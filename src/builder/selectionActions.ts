import { CARD_NOUN, EL_NAMES, KINDS, NODE_NAMES, cloneSection, fieldKind, fieldLabel, getValue, isCardEl, locate, uid } from './data'
import { toPlain } from './rich'
import type { BuilderApi, DocAction } from './store'
import type { DocState, ElStyle, Item, Section, SectionKind, Selection } from './types'

/**
 * Delete / duplicate / hide for whatever is selected on the canvas.
 *
 * How deleting fits the data model:
 * - section / nested container → the existing 'remove' action (a nested one empties its cell);
 * - Flexbox / Grid cell content → the cell becomes empty again (add placeholder shows);
 * - free-form ('custom') node → the node and its subtree leave `items`;
 * - card box (Features / Steps / FAQ) or part of another list item (menu / footer link, hero highlight) → the item leaves `items`;
 * - fixed field of a ready-made section (title, body, button, image, icon…) or a card's title / text / icon → `els[el].removed`,
 *   restorable from the Yapı panel, the inspector or undo.
 */

export type SelCtx = Pick<BuilderApi, 'doc' | 'dispatch' | 'select' | 'notify' | 'remove'>

export type TargetKind = 'section' | 'container' | 'cell' | 'node' | 'item' | 'field'

export interface Target {
  kind: TargetKind
  s: Section
  el?: string
  item?: Item
  /** What Delete affects, e.g. "Başlık", "Kart 2", "Metin · Hücre 1". */
  name: string
  /** Containing section / container (parent of a container). */
  parent?: Section
}

const ITEM_NOUN: Partial<Record<SectionKind, string>> = {
  nav: 'Menü bağlantısı',
  hero: 'Öne çıkan',
  features: 'Kart',
  steps: 'Adım',
  faq: 'Soru',
  footer: 'Bağlantı',
}

const itemId = (el: string) => el.split('.')[1]
const isIcon = (el: string) => el === 'icon' || el.endsWith('.icon')
const snippet = (v: string, n = 22) => {
  const t = toPlain(v).split('\n')[0].trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

export function resolveTarget(doc: Pick<DocState, 'sections'>, sel: Selection | null | undefined): Target | null {
  const loc = locate(doc.sections, sel?.sectionId)
  if (!sel || !loc) return null
  const { s, parent } = loc
  const el = sel.el
  if (!el) return { kind: parent ? 'container' : 'section', s, parent, name: s.name }
  const item = el.startsWith('items.') ? s.items.find((i) => i.id === itemId(el)) : undefined
  if (s.kind === 'layout') {
    const n = s.items.findIndex((i) => i.id === item?.id) + 1
    const type = item?.title === 'layout' ? 'box' : fieldKind(s, el)
    return { kind: 'cell', s, el, item, parent, name: item?.title ? `${EL_NAMES[type] ?? 'Öğe'} · Hücre ${n}` : `Hücre ${n}` }
  }
  if (s.kind === 'custom') return { kind: 'node', s, el, item, parent, name: NODE_NAMES[item?.node ?? 'text'] ?? 'Öğe' }
  // Cards are selectable boxes: the card itself is the list item, its title / text / icon are fields of it.
  if (item && CARD_NOUN[s.kind] && !isCardEl(el)) return { kind: 'field', s, el, item, parent, name: `${fieldLabel(s, `items.${item.id}.card`)} · ${EL_NAMES[fieldKind(s, el)]?.toLocaleLowerCase('tr') ?? 'öğe'}` }
  if (item && !isIcon(el) && KINDS[s.kind].items) {
    const n = s.items.indexOf(item) + 1
    return { kind: 'item', s, el, item, parent, name: `${ITEM_NOUN[s.kind] ?? 'Öğe'} ${n}` }
  }
  return { kind: 'field', s, el, item, parent, name: fieldLabel(s, el) }
}

/** Selection one level up: card part → card, free-form node → its box, element → its container, nested container → parent container. */
export function parentSelection(doc: Pick<DocState, 'sections'>, sel: Selection | null): Selection | null {
  if (!sel) return null
  if (sel.el) {
    const s = locate(doc.sections, sel.sectionId)?.s
    const id = sel.el.startsWith('items.') ? itemId(sel.el) : ''
    if (s && id && CARD_NOUN[s.kind] && !isCardEl(sel.el)) return { sectionId: s.id, el: `items.${id}.card` }
    const up = s?.kind === 'custom' ? s.items.find((i) => i.id === id)?.parent : undefined
    if (up && s!.items.some((i) => i.id === up)) return { sectionId: s!.id, el: `items.${up}.title` }
    return { sectionId: sel.sectionId }
  }
  const p = locate(doc.sections, sel.sectionId)?.parent
  return p ? { sectionId: p.id } : null
}

/* ---------- Pure doc helpers ---------- */
function mapSection(doc: DocState, id: string, fn: (s: Section) => Section): DocState {
  const walk = (s: Section): Section => {
    if (s.id === id) return fn(s)
    if (!s.items.some((i) => i.sub)) return s
    let hit = false
    const items = s.items.map((i) => {
      if (!i.sub) return i
      const n = walk(i.sub)
      if (n === i.sub) return i
      hit = true
      return { ...i, sub: n }
    })
    return hit ? { ...s, items } : s
  }
  return { ...doc, sections: doc.sections.map(walk) }
}

function patchEl(s: Section, el: string, patch: Partial<ElStyle>): Section {
  const next: Record<string, unknown> = { ...s.els?.[el], ...patch }
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k]
  const els = { ...s.els }
  if (Object.keys(next).length) els[el] = next as ElStyle
  else delete els[el]
  return { ...s, els }
}

/** Free-form node ids: `id` and everything below it. */
function subtree(s: Section, id: string): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const i of s.items) {
      if (!i.parent || !out.has(i.parent) || out.has(i.id)) continue
      out.add(i.id)
      grew = true
    }
  }
  return out
}

/** Element-style keys of `ids` copied onto their new ids. */
function copyEls(s: Section, map: Map<string, string>): Section['els'] {
  const els = { ...s.els }
  for (const [k, v] of Object.entries(s.els ?? {})) {
    const p = k.split('.')
    if (p[0] === 'items' && map.has(p[1])) els[`items.${map.get(p[1])}.${p.slice(2).join('.')}`] = { ...v }
  }
  return els
}

const undoAction = (c: SelCtx) => ({ label: 'Geri al', run: () => c.dispatch({ type: 'undo' }) })
const replace = (c: SelCtx, doc: DocState, label: string): DocAction => ({ type: 'replace', doc, label })

/* ---------- Delete ---------- */
export function deleteSelection(c: SelCtx, sel: Selection | null): boolean {
  const t = resolveTarget(c.doc, sel)
  if (!t) return false
  const { s, el } = t
  switch (t.kind) {
    case 'section':
      if (KINDS[s.kind].pinned) {
        c.notify(`${s.name} sabit bir bölüm · silinemez, gizlenebilir`)
        return false
      }
      c.remove(s.id)
      return true
    case 'container':
      c.remove(s.id)
      if (t.parent) c.select({ sectionId: t.parent.id })
      return true
    case 'cell':
      if (!t.item?.title) {
        c.notify('Hücre zaten boş')
        return false
      }
      c.dispatch({ type: 'cell', id: s.id, itemId: t.item.id, cell: '' })
      break
    case 'node': {
      if (!t.item) return false
      const gone = subtree(s, t.item.id)
      const doc = mapSection(c.doc, s.id, (x) => ({
        ...x,
        items: x.items.filter((i) => !gone.has(i.id)),
        els: Object.fromEntries(Object.entries(x.els ?? {}).filter(([k]) => !(k.startsWith('items.') && gone.has(itemId(k))))),
      }))
      c.dispatch(replace(c, doc, `${t.name} silindi`))
      break
    }
    case 'item':
      if (!t.item) return false
      c.dispatch(replace(c, mapSection(c.doc, s.id, (x) => ({ ...x, items: x.items.filter((i) => i.id !== t.item!.id) })), `${t.name} silindi`))
      break
    case 'field':
      c.dispatch(replace(c, mapSection(c.doc, s.id, (x) => patchEl(x, el!, { removed: true })), `${t.name} silindi`))
      break
  }
  c.select({ sectionId: s.id })
  c.notify(`${t.name} silindi`, undoAction(c))
  return true
}

/* ---------- Duplicate ---------- */
export function duplicateSelection(c: SelCtx, sel: Selection | null): boolean {
  let t = resolveTarget(c.doc, sel)
  if (!t) return false
  // Duplicating a part of a card duplicates the card.
  if (t.kind === 'field' && t.item && CARD_NOUN[t.s.kind]) t = resolveTarget(c.doc, { sectionId: t.s.id, el: `items.${t.item.id}.card` }) ?? t
  const { s, el, item } = t
  switch (t.kind) {
    case 'section':
    case 'container':
      if (KINDS[s.kind].pinned) {
        c.notify(`${s.name} çoğaltılamaz`)
        return false
      }
      c.dispatch({ type: 'duplicate', id: s.id })
      return true
    case 'field':
      c.notify(`${t.name} sabit bir alan · çoğaltılamaz`)
      return false
    case 'item': {
      const max = KINDS[s.kind].items?.max ?? Infinity
      if (!item) return false
      if (s.items.length >= max) {
        c.notify(`En fazla ${max} öğe eklenebilir`)
        return false
      }
      const id = uid('i')
      const doc = mapSection(c.doc, s.id, (x) => {
        const items = [...x.items]
        items.splice(items.indexOf(items.find((i) => i.id === item.id)!) + 1, 0, { ...item, id, box: item.box ? { ...item.box } : undefined })
        return { ...x, items, els: copyEls(x, new Map([[item.id, id]])) }
      })
      c.dispatch(replace(c, doc, `${t.name} çoğaltıldı`))
      c.select({ sectionId: s.id, el: el!.replace(item.id, id) })
      return true
    }
    case 'node': {
      if (!item) return false
      const ids = subtree(s, item.id)
      const map = new Map([...ids].map((i) => [i, uid('n')]))
      const copies = s.items.filter((i) => ids.has(i.id)).map((i) => ({ ...i, id: map.get(i.id)!, parent: i.parent && map.has(i.parent) ? map.get(i.parent) : i.parent, lay: i.lay ? { ...i.lay } : undefined }))
      const doc = mapSection(c.doc, s.id, (x) => {
        const items = [...x.items]
        // After the original's last descendant so sibling order stays: original, copy.
        const last = Math.max(...items.map((i, n) => (ids.has(i.id) ? n : -1)))
        items.splice(last + 1, 0, ...copies)
        return { ...x, items, els: copyEls(x, map) }
      })
      c.dispatch(replace(c, doc, `${t.name} çoğaltıldı`))
      c.select({ sectionId: s.id, el: `items.${map.get(item.id)}.title` })
      return true
    }
    case 'cell': {
      if (!item?.title) {
        c.notify('Boş hücre çoğaltılamaz')
        return false
      }
      const id = uid('c')
      const at = s.items.indexOf(item)
      const next = s.items[at + 1]
      const fill = (i: Item): Item => ({ ...i, title: item.title, text: item.text, href: item.href, sub: item.sub ? cloneSection(item.sub) : undefined })
      const doc = mapSection(c.doc, s.id, (x) => {
        if (next && !next.title) return { ...x, items: x.items.map((i) => (i.id === next.id ? fill(i) : i)), els: copyEls(x, new Map([[item.id, next.id]])) }
        const items = [...x.items]
        items.splice(at + 1, 0, fill({ id, title: '', text: '', box: item.box ? { ...item.box } : undefined }))
        return { ...x, items, els: copyEls(x, new Map([[item.id, id]])) }
      })
      c.dispatch(replace(c, doc, `${t.name} çoğaltıldı`))
      c.select({ sectionId: s.id, el: `items.${next && !next.title ? next.id : id}.text` })
      return true
    }
  }
}

/* ---------- Hide / restore ---------- */
export function isElHidden(s: Section, el: string) {
  return !!s.els?.[el]?.hide
}
export function isElRemoved(s: Section, el: string) {
  return !!s.els?.[el]?.removed
}

export function toggleHideSelection(c: SelCtx, sel: Selection | null) {
  const t = resolveTarget(c.doc, sel)
  if (!t) return
  if (!t.el) {
    c.dispatch({ type: 'toggleHidden', id: t.s.id })
    return
  }
  const hide = !isElHidden(t.s, t.el)
  c.dispatch(replace(c, mapSection(c.doc, t.s.id, (x) => patchEl(x, t.el!, { hide: hide || undefined })), `${elName(t.s, t.el)} ${hide ? 'gizlendi' : 'gösterildi'}`))
}

/** Brings back a deleted fixed field (and un-hides it). */
export function restoreEl(c: SelCtx, sectionId: string, el: string) {
  const s = locate(c.doc.sections, sectionId)?.s
  if (!s) return
  c.dispatch(replace(c, mapSection(c.doc, sectionId, (x) => patchEl(x, el, { removed: undefined, hide: undefined })), `${elName(s, el)} geri getirildi`))
  c.select({ sectionId, el })
}

/** Short element name for labels: "Başlık", "Kart başlığı", "Metin · Hücre 1"… */
export function elName(s: Section, el: string) {
  if (s.kind === 'custom') return NODE_NAMES[s.items.find((i) => i.id === itemId(el))?.node ?? 'text'] ?? 'Öğe'
  if (s.kind === 'layout') return resolveTarget({ sections: [s] }, { sectionId: s.id, el })?.name ?? 'Hücre'
  return fieldLabel(s, el)
}

/** Context-menu header: "Başlık · h1", "Kart 2 · h3"… (tag read from the canvas node). */
export function describeTarget(t: Target): string {
  if (!t.el) return t.parent ? `İç kapsayıcı · ${t.s.name}` : `Bölüm · ${t.s.name}`
  const node = document.querySelector(`[data-el="${t.s.id}:${t.el}"]`)
  const tag = node && node.tagName !== 'DIV' && node.tagName !== 'SPAN' ? node.tagName.toLowerCase() : node?.querySelector('img') ? 'img' : ''
  const text = t.kind === 'node' && t.item && t.item.node !== 'image' && t.item.node !== 'icon' && t.item.node !== 'box' ? snippet(getValue(t.s, t.el), 16) : ''
  return [t.name, text, tag].filter(Boolean).join(' · ')
}
