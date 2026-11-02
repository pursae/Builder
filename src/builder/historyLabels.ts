import { fieldLabel } from './data'
import type { DocState, Section } from './types'

export type HistoryKind = 'open' | 'text' | 'color' | 'style' | 'add' | 'remove' | 'move' | 'visibility' | 'layout' | 'site' | 'ai'

export interface HistoryInfo {
  title: string
  context?: string
  kind: HistoryKind
}

/** Style / box / background keys grouped under one human-readable noun. */
const NOUNS: [string, string[]][] = [
  ['Renk', ['color', 'titleColor', 'iconColor', 'iconColors', 'borderColor', 'decorColor', 'palette']],
  ['Arka plan', ['bg', 'type', 'gradFrom', 'gradTo', 'gradAngle', 'image', 'overlay', 'bgImage', 'bgSize', 'bgPos']],
  ['Yazı boyutu', ['fontSize', 'titleSize', 'bodySize']],
  ['Yazı kalınlığı', ['fontWeight', 'titleWeight']],
  ['Yazı tipi', ['font', 'fontPair']],
  ['Yazı biçimi', ['transform', 'italic', 'underline', 'list']],
  ['Satır yüksekliği', ['lineHeight']],
  ['Harf aralığı', ['letterSpacing']],
  ['Dış boşluk', ['margin', 'mt', 'mb']],
  ['İç boşluk', ['padding', 'pad']],
  ['Aralık', ['gapX', 'gapY']],
  ['Hizalama', ['align', 'justify', 'wrap']],
  ['Yön', ['direction', 'stackMobile']],
  ['Boyut', ['width', 'widthUnit', 'maxWidth', 'maxWidthUnit', 'height', 'heightUnit', 'minHeight', 'minHeightUnit', 'contentWidth', 'fit']],
  ['Köşe yuvarlaklığı', ['radius', 'corners']],
  ['Kenarlık', ['border', 'borderStyle', 'borderWidth']],
  ['Gölge', ['shadow']],
  ['Saydamlık', ['opacity']],
  ['Animasyon', ['anim']],
  ['Görünürlük', ['hideOn']],
  ['Özel CSS', ['css', 'cssId']],
  ['Dekor', ['decor', 'decorSvg', 'decorOpacity', 'decorScale', 'decorX', 'decorY', 'decorRotate', 'decorAnim']],
  ['Sütun sayısı', ['cols', 'colsT', 'colsM', 'gridCols', 'gridRows']],
  ['Katman sırası', ['zIndex']],
  ['Ana renk', ['brand']],
]
const NOUN_OF = new Map(NOUNS.flatMap(([noun, keys]) => keys.map((k) => [k, noun] as const)))

const GENERIC = new Set(['Stil değişti', 'Öğe stili değişti', 'Kapsayıcı ayarı değişti', 'Arka plan değişti', 'Hücre ayarı değişti', 'Izgara ayarı değişti', 'Site stili değişti'])

type Obj = Record<string, unknown> | undefined

function changedKeys(a: Obj, b: Obj): string[] {
  if (a === b) return []
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])
  return [...keys].filter((k) => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k]))
}

function nounFor(keys: string[]): string | null {
  const nouns = new Set(keys.map((k) => NOUN_OF.get(k) ?? '?'))
  if (nouns.size !== 1 || nouns.has('?')) return null
  return [...nouns][0]
}

function elName(s: Section, el: string): string | null {
  const name = fieldLabel(s, el)
  return name && name !== el ? name : null
}

/** What changed inside one section: style keys and the element they belong to. */
function sectionDiff(p: Section, n: Section) {
  const keys = [
    ...changedKeys(p.style as unknown as Obj, n.style as unknown as Obj),
    ...changedKeys(p.box as unknown as Obj, n.box as unknown as Obj),
    ...changedKeys(p.bg as Obj, n.bg as Obj),
    ...changedKeys(p.grid as Obj, n.grid as Obj),
  ]
  const els = changedKeys(p.els as Obj, n.els as Obj)
  for (const el of els) keys.push(...changedKeys(p.els?.[el] as Obj, n.els?.[el] as Obj))
  const items = p.items !== n.items
  if (items) {
    const before = new Map(p.items.map((i) => [i.id, i]))
    for (const it of n.items) {
      const old = before.get(it.id)
      if (old && old !== it) keys.push(...changedKeys(old.box as Obj, it.box as Obj))
    }
  }
  return { keys, els, textChanged: p.content !== n.content || items }
}

const kindFromLabel = (label: string): HistoryKind =>
  /^AI|klon/i.test(label)
    ? 'ai'
    : /eklendi|çoğaltıldı|yapıştırıldı|kuruldu/.test(label)
      ? 'add'
      : /silindi|boşaltıldı|temizlendi/.test(label)
        ? 'remove'
        : /taşındı/.test(label)
          ? 'move'
          : /gizlendi|gösterildi/.test(label)
            ? 'visibility'
            : /Yapı|Izgara|Düzen|Hücre/.test(label)
              ? 'layout'
              : /düzenlendi|adı/.test(label)
                ? 'text'
                : 'style'

/** Human-readable Turkish description of a history entry, derived by diffing it against the previous one. */
export function describeEntry(prev: DocState | undefined, next: DocState, label: string): HistoryInfo {
  if (!prev) return { title: label, kind: 'open' }

  const before = new Map(prev.sections.map((s) => [s.id, s]))
  const nextIds = new Set(next.sections.map((s) => s.id))
  const added = next.sections.filter((s) => !before.has(s.id))
  const removed = prev.sections.filter((s) => !nextIds.has(s.id))
  const changed = next.sections.filter((s) => before.has(s.id) && before.get(s.id) !== s)

  if (prev.site !== next.site && !added.length && !removed.length && !changed.length) {
    const noun = nounFor(changedKeys(prev.site as unknown as Obj, next.site as unknown as Obj))
    return { title: noun && GENERIC.has(label) ? `${noun} değişti` : label, context: 'Site geneli', kind: noun === 'Ana renk' ? 'color' : 'site' }
  }

  if (added.length === 1 && !removed.length && label.endsWith(' eklendi') && label.startsWith(added[0].name)) {
    return { title: 'Bölüm eklendi', context: added[0].name, kind: 'add' }
  }
  if (label === 'Bölüm çoğaltıldı' && added.length === 1) return { title: label, context: added[0].name.replace(/ \(kopya\)$/, ''), kind: 'add' }
  if (label === 'Bölüm silindi' && removed.length === 1) return { title: label, context: removed[0].name, kind: 'remove' }

  if (changed.length !== 1 || added.length || removed.length) return { title: label, kind: kindFromLabel(label) }

  const s = changed[0]
  const p = before.get(s.id)!
  if (label === 'Bölüm taşındı' || label === 'Bölüm gizlendi' || label === 'Bölüm gösterildi') return { title: label, context: s.name, kind: kindFromLabel(label) }

  const d = sectionDiff(p, s)
  const where = d.els.length === 1 ? elName(s, d.els[0]) : null
  const context = where ? `${s.name} / ${where}` : s.name

  if (label.endsWith(' düzenlendi') && d.textChanged && !d.keys.length) {
    return { title: 'Metin düzenlendi', context: `${s.name} / ${label.slice(0, -' düzenlendi'.length)}`, kind: 'text' }
  }
  if (GENERIC.has(label)) {
    const noun = nounFor(d.keys)
    if (noun) return { title: `${noun} değişti`, context, kind: noun === 'Renk' || noun === 'Arka plan' ? 'color' : 'style' }
  }
  return { title: label, context, kind: kindFromLabel(label) }
}
