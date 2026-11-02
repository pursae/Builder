import type { ReactNode } from 'react'
import type { Section, SectionKind } from '../types'
import { findVariant } from './index'

/** Renderer of a ready-made section kind that draws the section's chosen design (built-in one by default). */
export function withVariants(kind: SectionKind, Base: (p: { s: Section }) => ReactNode) {
  function Designed({ s }: { s: Section }) {
    const C = s.content.variant ? findVariant(kind, s.content.variant)?.C : undefined
    return C ? <C s={s} /> : <Base s={s} />
  }
  Designed.displayName = `Designed(${kind})`
  return Designed
}
