import { KINDS, createSection, uid } from '../data'
import type { DocState, Section, SectionKind, SectionStyle } from '../types'
import type { KindVariants, StyleTag, Variant } from './types'
import { NAV } from './nav'
import { HERO } from './hero'
import { FOOTER } from './footer'
import { FEATURES } from './features'
import { STEPS } from './steps'
import { MEDIA } from './media'
import { QUOTE } from './quote'
import { FAQ } from './faq'
import { CTA } from './cta'
import { FORM } from './form'
import { BANNER } from './banner'

export { STYLE_TAGS } from './types'
export type { KindVariants, StyleTag, Variant } from './types'

export const DEFAULT_VARIANT = 'default'

/** Built-in section, or a design whose renderer is actually attached. Unwired entries stay out of the library. */
const isReady = (v: Variant) => v.id === DEFAULT_VARIANT || typeof v.C === 'function'

/** Design library, in category order. The first variant of every kind is the built-in design ('default'). */
export const LIBRARY: KindVariants[] = [NAV, HERO, FOOTER, FEATURES, MEDIA, STEPS, QUOTE, FAQ, CTA, FORM, BANNER]
  .map((k) => ({ ...k, variants: k.variants.filter(isReady) }))
  .filter((k) => k.variants.length > 0)

const BY_KIND = new Map<SectionKind, KindVariants>(LIBRARY.map((k) => [k.kind, k]))

export const kindVariants = (kind: SectionKind) => BY_KIND.get(kind)
export const variantsOf = (kind: SectionKind): Variant[] => BY_KIND.get(kind)?.variants ?? []
/** More than the built-in design to choose from. */
export const hasVariants = (kind: SectionKind) => variantsOf(kind).length > 1
export const findVariant = (kind: SectionKind, id?: string) => variantsOf(kind).find((v) => v.id === (id || DEFAULT_VARIANT))
/** The section's design (the built-in one when unset or unknown). */
export const currentVariant = (s: Pick<Section, 'kind' | 'content'>) => findVariant(s.kind, s.content.variant) ?? variantsOf(s.kind)[0]
export const variantCount = () => LIBRARY.reduce((n, k) => n + k.variants.length, 0)

/* ---------- Panels: extra fields, hidden fields ---------- */
// Extra content keys become regular fields of the kind (labels, Basic / Studio text fields, AI set_text),
// shown only while a design that uses them is active; built-in fields a design doesn't draw are hidden.
for (const kv of LIBRARY) {
  const def = KINDS[kv.kind]
  for (const f of def.fields) {
    const own = f.showIf
    f.showIf = (s) => {
      const v = currentVariant(s)
      if (v?.hide?.includes(f.key)) return false
      if (v?.extras?.includes(f.key)) return true
      return own ? own(s) : true
    }
  }
  for (const x of kv.fields) {
    if (def.fields.some((f) => f.key === x.key)) continue
    def.fields.push({ key: x.key, label: x.label, el: x.el, multiline: x.multiline, group: x.group ?? 'Tasarım', hint: x.hint, showIf: (s) => !!currentVariant(s)?.extras?.includes(x.key) })
  }
}

/* ---------- Applying a design ---------- */
const BASE_STYLE = new Map<SectionKind, SectionStyle>()
const baseStyle = (kind: SectionKind) => {
  if (!BASE_STYLE.has(kind)) BASE_STYLE.set(kind, createSection(kind).style)
  return BASE_STYLE.get(kind)!
}

/** `cur` without the keys `prev` set, plus `next`; undefined when nothing is left. */
function swap<T extends object>(cur: T | undefined, prev: Partial<T> | undefined, next: Partial<T> | undefined, base?: Partial<T>): T | undefined {
  if (!prev && !next) return cur
  const out: Record<string, unknown> = { ...cur }
  for (const k of Object.keys(prev ?? {})) {
    if (base && base[k as keyof T] !== undefined) out[k] = base[k as keyof T]
    else delete out[k]
  }
  Object.assign(out, next)
  return Object.keys(out).length ? (out as T) : undefined
}

/**
 * The section in another design. Content and items are kept (the designs of a kind share one content
 * model); extra fields the design needs get defaults, the previous design's style presets are undone.
 */
export function applyVariant(s: Section, id: string): Section {
  const kv = BY_KIND.get(s.kind)
  const next = kv && findVariant(s.kind, id)
  if (!kv || !next) return s
  const prev = currentVariant(s)
  const content = { ...s.content }
  for (const key of next.extras ?? []) {
    const f = kv.fields.find((x) => x.key === key)
    if (f && content[key] === undefined) content[key] = f.def
  }
  if (next.id === DEFAULT_VARIANT) delete content.variant
  else content.variant = next.id
  let items = s.items
  const max = KINDS[s.kind].items?.max ?? Infinity
  const want = Math.min(max, next.minItems ?? 0)
  if (items.length < want && kv.pool?.length) {
    const used = new Set(items.map((i) => i.title))
    const fresh = kv.pool.filter((p) => !used.has(p.title))
    items = [...items, ...fresh.slice(0, want - items.length).map((p) => ({ ...p, id: uid('i') }))]
  }
  const base = baseStyle(s.kind)
  const style = swap<SectionStyle>(s.style, prev?.style, next.style, base) ?? s.style
  return {
    ...s,
    content,
    items,
    style: { ...style, hideOn: s.style.hideOn },
    box: swap(s.box, prev?.box, next.box),
    bg: swap(s.bg, prev?.bg, next.bg),
    grid: swap(s.grid, prev?.grid, next.grid),
  }
}

/** A new section of `kind` in design `id`. */
export function createVariantSection(kind: SectionKind, id: string): Section {
  return applyVariant(createSection(kind), id)
}

/** The page with one top-level section switched to design `id` (null when nothing changes). */
export function variantDoc(doc: DocState, sectionId: string, id: string): DocState | null {
  const i = doc.sections.findIndex((x) => x.id === sectionId)
  if (i < 0) return null
  const s = doc.sections[i]
  if ((s.content.variant || DEFAULT_VARIANT) === id) return null
  const next = applyVariant(s, id)
  if (next === s) return null
  const sections = [...doc.sections]
  sections[i] = next
  return { ...doc, sections }
}

/** History label of a design switch. */
export const variantLabel = (kind: SectionKind, id: string) => `${KINDS[kind].name} tasarımı: ${findVariant(kind, id)?.name ?? id}`

/** Compact catalogue for the AI system prompt: "kind: id=Ad[etiket], …". */
export function variantCatalog() {
  return LIBRARY.map((k) => `- ${k.kind}: ${k.variants.map((v) => `${v.id}=${v.name}${v.tags.length ? ` [${v.tags.join('/')}]` : ''}`).join(', ')}`).join('\n')
}

export const tagCount = (vs: Variant[], tag: StyleTag) => vs.filter((v) => v.tags.includes(tag)).length
