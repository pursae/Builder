import { CARD_NOUN, EL_NAMES, KINDS, NODE_NAMES, fieldKind, getValue, sectionPath } from './data'
import { iconLook } from './icons'
import { toPlain } from './rich'
import type { DocState, Item, Section, Selection } from './types'

/** Rows of the Yapı (navigator) panel below one container. */
export type NavRow =
  | { type: 'el'; key: string; el: string; tag: string; label: string; state?: 'hidden' | 'removed'; dim?: boolean; children?: NavRow[] }
  | { type: 'group'; key: string; el: string; tag: string; label: string; children: NavRow[] }
  | { type: 'sub'; key: string; sub: Section; cell: string }

const short = (v: string, n = 26) => {
  const t = toPlain(v).split('\n')[0].trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

const state = (s: Section, el: string): 'hidden' | 'removed' | undefined => (s.els?.[el]?.removed ? 'removed' : s.els?.[el]?.hide ? 'hidden' : undefined)

const ITEM_NOUN: Record<string, string> = { nav: 'Bağlantı', hero: 'Öne çıkan', features: 'Kart', steps: 'Adım', faq: 'Soru', footer: 'Bağlantı' }

function elRow(s: Section, el: string, tag: string, label: string): NavRow {
  return { type: 'el', key: `${s.id}/${el}`, el, tag, label, state: state(s, el) }
}

function customRows(s: Section, kids: Map<string, Item[]>, parent: string): NavRow[] {
  return (kids.get(parent) ?? []).map((it) => {
    const el = `items.${it.id}.title`
    const text = it.node === 'box' || it.node === 'image' || it.node === 'icon' || it.node === 'divider' ? '' : short(it.title)
    const row = elRow(s, el, NODE_NAMES[it.node ?? 'text'] ?? 'Öğe', text || (it.node === 'box' ? `${it.lay?.dir === 'row' ? 'satır' : it.lay?.dir === 'grid' ? 'ızgara' : 'sütun'}` : ''))
    if (it.node === 'box' && row.type === 'el') row.children = customRows(s, kids, it.id)
    return row
  })
}

export function navRows(s: Section): NavRow[] {
  const def = KINDS[s.kind]
  if (s.kind === 'layout') {
    return s.items.map((i, n): NavRow => {
      const el = `items.${i.id}.text`
      if (i.title === 'layout' && i.sub) return { type: 'sub', key: i.sub.id, sub: i.sub, cell: `Hücre ${n + 1}` }
      if (!i.title) return { ...elRow(s, el, 'Hücre', `${n + 1} · boş`), dim: true } as NavRow
      return elRow(s, el, EL_NAMES[fieldKind(s, el)] ?? 'Öğe', i.title === 'image' ? `Hücre ${n + 1}` : short(i.text) || `Hücre ${n + 1}`)
    })
  }
  if (s.kind === 'custom') {
    const ids = new Set(s.items.map((i) => i.id))
    const kids = new Map<string, Item[]>()
    for (const it of s.items) {
      const p = it.parent && ids.has(it.parent) ? it.parent : ''
      if (!kids.has(p)) kids.set(p, [])
      kids.get(p)!.push(it)
    }
    return customRows(s, kids, '')
  }
  const rows: NavRow[] = []
  if (s.kind === 'quote' && iconLook(s, 'icon').show) rows.push(elRow(s, 'icon', 'İkon', 'Alıntı ikonu'))
  for (const f of def.fields) if (!f.showIf || f.showIf(s)) rows.push(elRow(s, f.key, EL_NAMES[f.el] ?? 'Öğe', f.label))
  if (def.items) {
    const it = def.items
    const icons = s.kind === 'features' || s.kind === 'hero'
    s.items.forEach((i, n) => {
      const title = `items.${i.id}.title`
      const parts: NavRow[] = []
      if (icons && iconLook(s, `items.${i.id}.icon`).show) parts.push(elRow(s, `items.${i.id}.icon`, 'İkon', ''))
      parts.push(elRow(s, title, EL_NAMES[it.titleEl] ?? 'Öğe', short(getValue(s, title)) || it.titleLabel))
      if (it.textEl) parts.push(elRow(s, `items.${i.id}.text`, EL_NAMES[it.textEl] ?? 'Öğe', short(getValue(s, `items.${i.id}.text`)) || it.textLabel || ''))
      const tag = `${ITEM_NOUN[s.kind] ?? 'Öğe'} ${n + 1}`
      // Card boxes are selectable themselves (items.<id>.card); other item groups select their title.
      if (CARD_NOUN[s.kind]) {
        const card = `items.${i.id}.card`
        rows.push({ type: 'el', key: `${s.id}/${i.id}`, el: card, tag, label: short(i.title), state: state(s, card), children: parts })
      } else rows.push(parts.length === 1 ? parts[0] : { type: 'group', key: `${s.id}/${i.id}`, el: title, tag, label: short(i.title), children: parts })
    })
  }
  return rows
}

/** Navigator keys to unfold so the selected row is visible. Containers use their id, inner groups "<sectionId>/<id>". */
export function openKeysFor(doc: Pick<DocState, 'sections'>, sel: Selection | null): string[] {
  if (!sel) return []
  const path = sectionPath(doc.sections, sel.sectionId)
  if (!path.length) return []
  const keys = (sel.el ? path : path.slice(0, -1)).map((p) => p.s.id)
  const s = path[path.length - 1].s
  if (!sel.el?.startsWith('items.')) return keys
  const id = sel.el.split('.')[1]
  if (s.kind === 'custom') {
    const byId = new Map(s.items.map((i) => [i.id, i]))
    let p = byId.get(id)?.parent
    while (p && byId.has(p)) {
      keys.push(`${s.id}/items.${p}.title`)
      p = byId.get(p)!.parent
    }
  } else if (s.kind !== 'layout') keys.push(`${s.id}/${id}`)
  return keys
}

/** Same id format as `data-nav` on rows. */
export const navId = (sectionId: string, el?: string) => `${sectionId}|${el ?? ''}`
