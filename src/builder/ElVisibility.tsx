import { useMemo } from 'react'
import type { Section } from './types'

/**
 * Hidden / deleted elements, applied by `data-el` so every renderer (ready-made sections, cells, free-form
 * nodes, icons) honors them: deleted = never rendered, hidden = dimmed in the editor and gone in preview.
 */
export function ElVisibility({ sections }: { sections: Section[] }) {
  const css = useMemo(() => {
    const removed: string[] = []
    const hidden: string[] = []
    // EIcon dims and labels hidden icons itself.
    const labelled: string[] = []
    const walk = (s: Section) => {
      for (const [el, st] of Object.entries(s.els ?? {})) {
        const sel = `[data-el="${s.id}:${el.replace(/["\\]/g, '')}"]`
        if (st.removed) removed.push(sel)
        else if (st.hide) {
          hidden.push(sel)
          if (el !== 'icon' && !el.endsWith('.icon')) labelled.push(sel)
        }
      }
      for (const i of s.items) if (i.sub) walk(i.sub)
    }
    sections.forEach(walk)
    return [
      removed.length ? `.cv :is(${removed.join(',')}){display:none!important}` : '',
      hidden.length ? `.cv[data-preview='true'] :is(${hidden.join(',')}){display:none!important}` : '',
      hidden.length ? `.cv[data-preview='false'] :is(${hidden.join(',')}){opacity:.3!important}` : '',
      labelled.length ? `.cv[data-preview='false'] :is(${labelled.join(',')})::after{content:attr(data-label) ' · gizli'}` : '',
    ].join('')
  }, [sections])
  return css ? <style>{css}</style> : null
}
