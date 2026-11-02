import { elCss, fieldLabel } from './data'
import { ICON_SET, iconLook, tileCss } from './icons'
import { useB } from './store'
import { useTintedSrc } from './svgTint'
import type { Section } from './types'
import { cn } from './ui'

/** Selectable icon of a ready-made section ("items.<id>.icon" or "icon"): library glyph or custom SVG, optional tile. */
export function EIcon({ s, el, className, inline, stroke = 1.8 }: { s: Section; el: string; className?: string; inline?: boolean; stroke?: number }) {
  const b = useB()
  const l = iconLook(s, el)
  const es = s.els?.[el]
  const src = useTintedSrc(l.url ?? '', l.url && es?.iconColor ? { iconColor: es.iconColor } : undefined)
  if (!l.show || (l.hidden && b.preview)) return null
  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  const linked = b.activeField?.sectionId === s.id && b.activeField.el === el
  const I = ICON_SET[l.key].I
  return (
    <span
      className={cn('ed shrink-0 place-items-center', inline ? 'inline-grid' : 'grid', className)}
      style={{ ...tileCss(l), color: l.color, ...elCss({ margin: es?.margin, mt: es?.mt, mb: es?.mb, ml: es?.ml, mr: es?.mr }), ...(l.hidden ? { opacity: 0.3 } : {}) }}
      data-label={b.mode === 'studio' ? `İkon · ${l.url ? 'img' : 'svg'}${l.hidden ? ' · gizli' : ''}` : `${fieldLabel(s, el)} · tıkla, değiştir`}
      data-el={`${s.id}:${el}`}
      data-selected={selected || undefined}
      data-linked={linked || undefined}
      onClick={(e) => {
        if (b.preview) return
        e.preventDefault()
        e.stopPropagation()
        b.select({ sectionId: s.id, el }, { focus: true })
      }}
    >
      {l.url ? <img src={src} alt="" draggable={false} style={{ width: l.size, height: l.size, objectFit: 'contain' }} /> : <I size={l.size} strokeWidth={stroke} />}
    </span>
  )
}
