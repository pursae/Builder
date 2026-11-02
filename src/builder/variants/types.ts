import type { ReactNode } from 'react'
import type { BgSettings, ContainerBox, ElKind, GridSettings, Item, Section, SectionKind, SectionStyle } from '../types'

/** Style filters of the design library. */
export const STYLE_TAGS = ['Minimal', 'Modern', 'Kurumsal', 'Koyu', 'Cesur', 'Editoryal', 'Glass', 'Gradient', 'E-ticaret', 'SaaS', 'Ajans', 'Portfolyo'] as const
export type StyleTag = (typeof STYLE_TAGS)[number]

/**
 * A content key only some designs use (stats, logos, extra images…). Stored in `section.content`
 * like the built-in fields; `def` fills it in when a design that needs it is applied.
 */
export interface ExtraField {
  key: string
  label: string
  el: ElKind
  def: string
  multiline?: boolean
  group?: string
  hint?: string
}

export interface Variant {
  /** Unique within the kind; stored in `section.content.variant` ('default' = the built-in design). */
  id: string
  name: string
  tags: StyleTag[]
  /** One line for the library tooltip and the AI catalogue. */
  blurb: string
  /** Renderer; omitted for the built-in design. */
  C?: (p: { s: Section }) => ReactNode
  /** Extra content keys (of the kind's `fields`) this design shows. */
  extras?: string[]
  /** Built-in field / option keys this design doesn't show (hidden in the panels). */
  hide?: string[]
  /** Applied with the design and reset when another design is chosen. */
  style?: Partial<SectionStyle>
  box?: Partial<ContainerBox>
  bg?: Partial<BgSettings>
  grid?: Partial<GridSettings>
  /** Top up the item list from the kind's `pool` to at least this many items. */
  minItems?: number
}

export interface KindVariants {
  kind: SectionKind
  /** Extra content keys used by some designs of this kind. */
  fields: ExtraField[]
  /** Items appended when a design needs more than the section has (minItems). */
  pool?: Omit<Item, 'id'>[]
  variants: Variant[]
}
