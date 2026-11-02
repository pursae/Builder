import { Menu } from 'lucide-react'
import { useMemo, type CSSProperties } from 'react'
import { elCss, fieldLabel, repeatCols } from './data'
import { fontStack } from './fonts'
import { E, TintImg } from './sections'
import { useB } from './store'
import type { ElStyle, Item, NodeLayout, Section } from './types'
import { cn } from './ui'

const FONT_HOST = /^https:\/\/(fonts\.googleapis\.com|fonts\.bunny\.net)\/[^"'()\\\s<>]+$/
const SELF = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' } as const
const JUSTIFY = { start: 'flex-start', center: 'center', end: 'flex-end', 'space-between': 'space-between' } as const
const elKey = (it: Item) => `items.${it.id}.title`

/** Styles free-form nodes add on top of elCss (font, border, shadow, background layers…). */
export function extraCss(e?: ElStyle): CSSProperties {
  if (!e) return {}
  const out: CSSProperties = {}
  if (e.font) out.fontFamily = fontStack(e.font)
  if (e.border) {
    if (e.border.includes(':')) {
      for (const part of e.border.split(';')) {
        const [k, v] = part.split(':')
        const side = k?.trim().match(/^border-(top|right|bottom|left)$/)?.[1]
        if (side && v) (out as Record<string, string>)[`border${side[0].toUpperCase()}${side.slice(1)}`] = v.trim()
      }
    } else out.border = e.border
  }
  if (e.shadow) out.boxShadow = e.shadow
  if (e.transform) out.textTransform = e.transform
  if (e.italic) out.fontStyle = 'italic'
  if (e.underline) out.textDecoration = 'underline'
  if (e.bgImage) {
    out.backgroundImage = e.bgImage
    out.backgroundSize = e.bgSize ?? 'cover'
    out.backgroundPosition = e.bgPos ?? 'center'
    out.backgroundRepeat = 'no-repeat'
  }
  if (e.opacity !== undefined) out.opacity = e.opacity
  return out
}

/** elCss with `background` split into longhands so it can sit next to background layers. */
function baseCss(e: ElStyle | undefined, kind: Parameters<typeof elCss>[1]): CSSProperties {
  const c = { ...elCss(e, kind) } as CSSProperties & { background?: string }
  if (c.background) {
    c.backgroundColor = c.background
    delete c.background
  }
  return c
}

/** Where a node sits inside its parent box. */
function placement(lay: NodeLayout | undefined, parent: NodeLayout['dir'], fill: boolean): CSSProperties {
  if (parent === 'grid') return { minWidth: 0 }
  if (parent === 'row') return { flex: lay?.basis ? `0 1 ${lay.basis}%` : '0 1 auto', minWidth: 0 }
  const self = lay?.self ?? 'stretch'
  return { alignSelf: SELF[self], ...(fill && self !== 'stretch' ? { width: '100%' } : {}) }
}

type Ctx = { s: Section; kids: Map<string, Item[]> }

function NodeView({ c, it, parent, parentLay }: { c: Ctx; it: Item; parent: NodeLayout['dir']; parentLay?: NodeLayout }) {
  const b = useB()
  const { s } = c
  const el = elKey(it)
  const es = s.els?.[el]
  const lay = it.lay
  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  const stackedRow = parent === 'row' && parentLay?.stack
  const oneLine: CSSProperties = parent === 'row' && parentLay?.wrap && it.node !== 'box' && it.title.length < 40 && !it.title.includes('\n') ? { whiteSpace: 'nowrap', flexShrink: 0 } : {}
  // Children of rows that stack on mobile take the full width (boxes) or keep the row's alignment.
  const stackCls = stackedRow ? (it.node === 'box' || lay?.basis ? '@max-3xl:basis-auto! @max-3xl:w-full!' : parentLay?.justify === 'center' ? '@max-3xl:self-center!' : '@max-3xl:self-start!') : ''
  const select = (e: React.MouseEvent) => {
    if (b.preview) return
    e.stopPropagation()
    b.select({ sectionId: s.id, el }, { focus: true })
  }

  switch (it.node) {
    case 'box': {
      const dir = lay?.dir ?? 'column'
      const kids = c.kids.get(it.id) ?? []
      const grid = dir === 'grid'
      // Rows of short leaves (menus, button pairs) stay on one line on wide screens; font metrics that differ
      // by a pixel from the source must not push the last item down. They wrap only on small screens.
      const leafRow = dir === 'row' && !!lay?.wrap && kids.every((k) => k.node !== 'box')
      const cols = Math.max(1, lay?.cols ?? 2)
      const style: CSSProperties = {
        position: 'relative',
        display: grid ? 'grid' : 'flex',
        ...(grid
          ? ({ '--gd': repeatCols(cols), '--gt': repeatCols(cols >= 4 ? Math.ceil(cols / 2) : Math.min(cols, 2)), '--gm': repeatCols(cols >= 4 && kids.every((k) => k.node === 'image' || k.node === 'icon') ? 2 : 1) } as CSSProperties)
          : { flexDirection: dir === 'row' ? 'row' : 'column', flexWrap: lay?.wrap && !leafRow ? 'wrap' : 'nowrap', justifyContent: lay?.justify ? JUSTIFY[lay.justify] : undefined }),
        alignItems: dir === 'row' ? SELF[lay?.align ?? 'start'] : grid ? 'start' : undefined,
        columnGap: lay?.gap,
        rowGap: lay?.gapY ?? (dir === 'row' ? Math.max(12, Math.min(lay?.gap ?? 0, 32)) : lay?.gap),
        ...placement(lay, parent, true),
        ...baseCss(es, 'text'),
        ...extraCss(es),
      }
      if (!b.preview && !kids.length && !es?.height && !es?.bgImage) style.minHeight = 48
      if (lay?.clip) Object.assign(style, { flexWrap: 'nowrap', overflow: 'hidden', maxWidth: '100%' })
      const box = (
        <div
          className={cn('cell', grid && 'grid-cols-(--gm) @3xl:grid-cols-(--gt) @5xl:grid-cols-(--gd)', dir === 'row' && lay?.stack && '@max-3xl:flex-col! @max-3xl:items-stretch!', stackCls, leafRow && '@max-3xl:flex-wrap!', lay?.menu && '@max-3xl:hidden!')}
          style={style}
          data-el={`${s.id}:${el}`}
          data-selected={selected || undefined}
          data-label={b.mode === 'studio' ? fieldLabel(s, el) : undefined}
          onClick={select}
        >
          {kids.map((k) => (
            <NodeView key={k.id} c={c} it={k} parent={dir} parentLay={lay} />
          ))}
        </div>
      )
      if (!lay?.menu) return box
      const color = s.els?.[kids[0] ? elKey(kids[0]) : '']?.color
      return (
        <>
          {box}
          <span className="ml-auto hidden self-center @max-3xl:block" style={{ color }} aria-hidden>
            <Menu size={28} strokeWidth={2} />
          </span>
        </>
      )
    }
    case 'image':
    case 'icon': {
      const style: CSSProperties = {
        ...placement(lay, parent, false),
        ...baseCss(es, 'image'),
        ...extraCss(es),
        maxWidth: '100%',
        aspectRatio: lay?.ratio ? String(lay.ratio) : undefined,
        borderRadius: es?.radius || undefined,
        overflow: 'hidden',
        flexShrink: parent === 'row' ? (parentLay?.clip ? 0 : 1) : undefined,
      }
      if (es?.width === undefined && parent !== 'row') style.width = '100%'
      return (
        <div className={cn('ed block', stackCls)} style={style} data-el={`${s.id}:${el}`} data-selected={selected || undefined} data-label={b.mode === 'studio' ? `${it.node === 'icon' ? 'İkon' : 'Görsel'} · img` : `${fieldLabel(s, el)} · tıkla, değiştir`} onClick={select}>
          {it.title && <TintImg src={it.title} es={es} alt={it.text} className="block size-full" style={{ objectFit: es?.fit ?? (it.node === 'icon' ? 'contain' : 'cover') }} />}
        </div>
      )
    }
    case 'divider':
      return (
        <div
          className={cn('ed block', stackCls)}
          style={{ ...placement(lay, parent, true), ...baseCss(es, 'image'), height: es?.height ?? 1, backgroundColor: es?.bg ?? 'var(--line)' }}
          data-el={`${s.id}:${el}`}
          data-selected={selected || undefined}
          data-label="Ayırıcı"
          onClick={select}
        />
      )
    case 'button':
      return (
        <E
          s={s}
          el={el}
          kind="button"
          as="a"
          hint="a"
          className={cn('inline-flex items-center justify-center text-center leading-tight', stackCls)}
          style={{ ...placement(lay, parent, false), whiteSpace: 'pre-line', textDecoration: 'none', ...extraCss(es), ...oneLine }}
        />
      )
    case 'input':
      return (
        <E
          s={s}
          el={el}
          kind="text"
          as="div"
          hint={it.tag ?? 'input'}
          rich={false}
          className={cn('flex items-center', stackCls)}
          style={{ ...placement(lay, parent, true), opacity: 0.85, ...extraCss(es), alignItems: it.tag === 'textarea' ? 'flex-start' : 'center' }}
        />
      )
    default: {
      const kind = it.node === 'heading' ? 'heading' : it.node === 'link' ? 'link' : 'text'
      const as = it.node === 'heading' ? (it.tag && /^h[1-6]$/.test(it.tag) ? it.tag : 'h2') : it.node === 'link' ? 'a' : es?.list ? 'li' : 'p'
      return (
        <E
          s={s}
          el={el}
          kind={kind}
          as={as}
          hint={as}
          multiline
          className={cn('block', stackCls)}
          style={{
            ...placement(lay, parent, !!es?.maxWidth),
            margin: 0,
            whiteSpace: 'pre-line',
            overflowWrap: 'anywhere',
            ...(es?.list ? { display: 'list-item', listStyleType: es.list, listStylePosition: 'inside' } : {}),
            ...(kind === 'link' ? { textDecoration: 'none', color: 'inherit' } : {}),
            ...extraCss(es),
            ...oneLine,
          }}
        />
      )
    }
  }
}

/** Small screens: big type and spacing from desktop sources scale down. */
function mobileCss(s: Section) {
  const rules: string[] = []
  // Overlapping layers (a node pulled up over its previous sibling with a negative margin) only line up
  // when the parent's padding and the sibling's height keep their desktop sizes.
  const pinned = new Set<string>()
  const siblings = new Map<string, Item[]>()
  for (const it of s.items) {
    const p = it.parent ?? ''
    if (!siblings.has(p)) siblings.set(p, [])
    siblings.get(p)!.push(it)
  }
  for (const list of siblings.values())
    list.forEach((it, i) => {
      if ((s.els?.[elKey(it)]?.mt ?? 0) >= 0) return
      pinned.add(it.id)
      if (it.parent) pinned.add(it.parent)
      for (const prev of list.slice(0, i)) pinned.add(prev.id)
    })
  for (const it of s.items) {
    const e = s.els?.[elKey(it)]
    const sel = `[data-el="${s.id}:${elKey(it)}"]`
    if (!it.parent && it.node === 'box') {
      const l = e?.padding?.l ?? 0
      const r = e?.padding?.r ?? 0
      rules.push(`${sel}{padding-left:${Math.min(20, Math.max(16, l))}px!important;padding-right:${Math.min(20, Math.max(16, r))}px!important}`)
    }
    if (!e) continue
    const decl: string[] = []
    const pin = pinned.has(it.id)
    if (e.fontSize && e.fontSize > 30) decl.push(`font-size:${Math.max(26, Math.round(e.fontSize * 0.62))}px!important`)
    if (it.parent && e.padding && (e.padding.l > 28 || e.padding.r > 28)) decl.push(`padding-left:${Math.min(e.padding.l, 20)}px!important;padding-right:${Math.min(e.padding.r, 20)}px!important`)
    if (!pin && e.padding && (e.padding.t > 64 || e.padding.b > 64)) decl.push(`padding-top:${Math.round(e.padding.t * 0.55)}px!important;padding-bottom:${Math.round(e.padding.b * 0.55)}px!important`)
    if (e.mt && e.mt > 48) decl.push(`margin-top:${Math.round(Math.max(24, e.mt * 0.5))}px!important`)
    if (e.margin && (e.margin.l > 20 || e.margin.r > 20)) decl.push('margin-left:0!important;margin-right:0!important')
    if (!pin && e.height && e.height > 240 && it.node === 'box') decl.push('min-height:0!important')
    if (decl.length) rules.push(`${sel}{${decl.join(';')}}`)
  }
  return rules.length ? `@container (max-width: 640px){${rules.join('')}}` : ''
}

export function CustomSection({ s }: { s: Section }) {
  const kids = useMemo(() => {
    const ids = new Set(s.items.map((i) => i.id))
    const m = new Map<string, Item[]>()
    for (const it of s.items) {
      const p = it.parent && ids.has(it.parent) ? it.parent : ''
      if (!m.has(p)) m.set(p, [])
      m.get(p)!.push(it)
    }
    return m
  }, [s.items])
  const fonts = (s.content.fonts ?? '').split('\n').map((u) => u.trim()).filter((u) => FONT_HOST.test(u))
  const css = useMemo(() => mobileCss(s), [s])
  const c = { s, kids }
  return (
    <div className="relative flex flex-col" style={{ fontFamily: s.content.font ? `'${s.content.font.replace(/['"\\;{}]/g, '')}', Inter, sans-serif` : undefined }}>
      {(fonts.length > 0 || css) && <style>{`${fonts.map((u) => `@import url("${u}");`).join('')}${css}`}</style>}
      {(kids.get('') ?? []).map((it) => (
        <NodeView key={it.id} c={c} it={it} parent="column" />
      ))}
    </div>
  )
}
