import type { DocState, Section, SectionKind } from '../types'
import { applyVariant, createVariantSection } from './index'

const cache = new Map<string, Section>()

/** Stable demo section of a design (default content), so thumbnails can be memoized. */
export function demoSection(kind: SectionKind, id: string): Section {
  const key = `${kind}:${id}`
  if (!cache.has(key)) cache.set(key, createVariantSection(kind, id))
  return cache.get(key)!
}

/** Sections a thumbnail shows: headers sit on the page's hero so transparent / floating bars read right. */
export function samplePage(kind: SectionKind, id: string, doc: DocState, source?: Section): Section[] {
  const s = source ? applyVariant(source, id) : demoSection(kind, id)
  if (kind === 'nav') return [s, doc.sections.find((x) => x.kind === 'hero') ?? demoSection('hero', 'default')]
  return [s]
}

/** Thumbnail geometry per kind: page width rendered, frame aspect (h / w) and which end is kept when cropped. */
export function frameOf(kind: SectionKind, mobile: boolean): { width: number; ratio: number; anchor: 'top' | 'bottom' } {
  const width = mobile ? 400 : 1280
  if (kind === 'nav') return { width, ratio: mobile ? 1.15 : 0.32, anchor: 'top' }
  if (kind === 'footer') return { width, ratio: mobile ? 2 : 0.46, anchor: 'bottom' }
  if (kind === 'banner') return { width, ratio: mobile ? 0.6 : 0.16, anchor: 'top' }
  return { width, ratio: mobile ? 2 : 0.62, anchor: 'top' }
}