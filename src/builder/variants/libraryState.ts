import { useSyncExternalStore } from 'react'
import type { SectionKind } from '../types'

/** Design library dialog: add a new section (optionally at `index`) or change the design of `sectionId`. */
export type LibraryState = { mode: 'add'; kind?: SectionKind; index?: number } | { mode: 'change'; sectionId: string; kind: SectionKind }

let state: LibraryState | null = null
const subs = new Set<() => void>()

export function openLibrary(next: LibraryState | null) {
  state = next
  subs.forEach((f) => f())
}
export const closeLibrary = () => openLibrary(null)

const subscribe = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}
export const useLibrary = () => useSyncExternalStore(subscribe, () => state)
