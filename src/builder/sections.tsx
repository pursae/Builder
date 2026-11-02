import { createContext, createElement, useContext, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, ChevronDown, Columns3, Copy, CornerLeftUp, Heading, Image as ImageIcon, LayoutGrid, Menu, Pilcrow, Play, Plus, RectangleHorizontal, Square, X } from 'lucide-react'
import { CARD_NOUN, EL_NAMES, FONT_PAIRS, KINDS, MAX_DEPTH, SHADOWS, createLayout, getGrid, paletteVars, repeatCols, box4, cardCss, cellWidth, elCss, fieldLabel, getBox, getStructure, getValue, sized } from './data'
import { useB } from './store'
import { siteFonts } from './fonts'
import type { CellType, ElKind, ElStyle, GridSettings, Item, LayoutType, Section } from './types'
import { Tip, cn, ease } from './ui'
import { LayoutPicker, arrowNav } from './LayoutPicker'
import { SectionBackground } from './Decor'
import { useTintedSrc } from './svgTint'
import { CustomSection } from './CustomSection'
import { EIcon } from './EIcon'
import { FloatingRichToolbar, richKind, richPaste } from './RichText'
import { isRich, sanitizeRich, toPlain, toStored } from './rich'
import { withVariants } from './variants/render'

const PLACEHOLDER = 'Yazı ekle'

/** Link target of a button / link: "#sectionId" or a URL. */
export function getHref(s: Section, el: string) {
  if (el.startsWith('items.')) return s.items.find((i) => i.id === el.split('.')[1])?.href
  return s.content[`${el}Href`]
}

/* ---------- Editable element ---------- */
export function E({
  s,
  el,
  kind,
  as = 'span',
  hint,
  className,
  style,
  multiline,
  rich = richKind(kind),
}: {
  s: Section
  el: string
  kind: ElKind
  as?: string
  hint?: string
  className?: string
  style?: CSSProperties
  multiline?: boolean
  /** Bold/italic/link… formatting (safe HTML subset) for text-like elements. */
  rich?: boolean
}) {
  const b = useB()
  const value = getValue(s, el)
  const lists = rich && kind === 'text' && !!multiline
  const html = useMemo(() => (isRich(value) ? sanitizeRich(value, { lists }) : null), [value, lists])
  const [editing, setEditing] = useState(false)
  const [ver, setVer] = useState(0)
  const ref = useRef<HTMLElement | null>(null)
  const done = useRef(false)

  useEffect(() => {
    if (!editing || !ref.current) return
    const node = ref.current
    node.focus()
    const r = document.createRange()
    r.selectNodeContents(node)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(r)
  }, [editing])

  if (!value && b.preview) return null

  const finish = (commit: boolean) => {
    if (done.current) return
    done.current = true
    const text = rich && ref.current ? toStored(ref.current.innerHTML, { lists }).trim() : (ref.current?.innerText ?? value).replace(/\n+$/, '').trim()
    setEditing(false)
    setVer((v) => v + 1) // remount so React owns a clean DOM node again
    if (commit && text !== value && toPlain(text) !== PLACEHOLDER) b.dispatch({ type: 'field', id: s.id, el, value: text })
  }

  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  const linked = b.activeField?.sectionId === s.id && b.activeField.el === el
  const label = b.mode === 'studio' ? `${EL_NAMES[kind]}${hint ? ` · ${hint}` : ''}` : `${fieldLabel(s, el)} · çift tıkla, yaz`

  const node = createElement(
    as,
    {
      key: ver,
      ref,
      className: cn('ed', rich && 'rt', !value && 'opacity-40', className),
      style: {
        ...style,
        ...elCss(s.els?.[el], kind),
        ...(kind === 'button' && s.els?.[el]?.width !== undefined && !s.els[el].align ? { textAlign: 'center' } : {}),
        // Vertical margin/padding and width/height need a box on inline elements.
        ...((s.els?.[el]?.margin || s.els?.[el]?.padding || s.els?.[el]?.mt !== undefined || s.els?.[el]?.mb !== undefined || s.els?.[el]?.width !== undefined || s.els?.[el]?.height !== undefined || s.els?.[el]?.maxWidth !== undefined) && !/\b(block|flex|inline-flex|inline-block)\b/.test(className ?? '') ? { display: 'inline-block' } : {}),
      },
      'data-label': label,
      'data-el': `${s.id}:${el}`,
      'data-selected': selected || undefined,
      'data-linked': linked || undefined,
      'data-editing': editing || undefined,
      contentEditable: editing ? (rich ? 'true' : 'plaintext-only') : undefined,
      suppressContentEditableWarning: true,
      spellCheck: editing,
      onPaste: editing && rich ? (e: React.ClipboardEvent) => richPaste(e, lists, !!multiline) : undefined,
      onDrop: editing && rich ? (e: React.DragEvent) => e.preventDefault() : undefined,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault()
        if (b.preview) {
          const inner = (e.target as HTMLElement).closest('a')
          const href = inner && inner !== ref.current && ref.current?.contains(inner) ? inner.getAttribute('href') ?? undefined : getHref(s, el)
          if (href?.startsWith('#')) b.scrollTo(href.slice(1))
          else if (href && /^(https?:|mailto:|tel:)/.test(href)) window.open(href, '_blank', 'noopener')
          return
        }
        e.stopPropagation()
        if (!editing) b.select({ sectionId: s.id, el }, { focus: true })
      },
      onDoubleClick: (e: React.MouseEvent) => {
        if (b.preview) return
        e.stopPropagation()
        done.current = false
        setEditing(true)
      },
      onBlur: editing
        ? (e: React.FocusEvent) => {
            if ((e.relatedTarget as HTMLElement | null)?.closest('[data-rt-toolbar]')) return
            finish(true)
          }
        : undefined,
      onKeyDown: editing
        ? (e: React.KeyboardEvent) => {
            e.stopPropagation()
            const an = window.getSelection()?.anchorNode
            const li = (an instanceof Element ? an : an?.parentElement)?.closest('li')
            const inList = lists && !!li && !!ref.current?.contains(li)
            if (e.key === 'Enter' && (!multiline || !e.shiftKey) && !(inList && !(e.metaKey || e.ctrlKey))) {
              e.preventDefault()
              finish(true)
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              finish(false)
            }
          }
        : undefined,
      ...(html !== null ? { dangerouslySetInnerHTML: { __html: html } } : {}),
    },
    html !== null ? undefined : value || PLACEHOLDER,
  )
  return (
    <>
      {node}
      {editing && rich && <FloatingRichToolbar root={ref} lists={lists} onExit={() => finish(true)} />}
    </>
  )
}

/** <img> that shows the recolored SVG when the element has an icon color. */
export function TintImg({ src, es, alt = '', className, style }: { src: string; es?: ElStyle; alt?: string; className?: string; style?: CSSProperties }) {
  return <img src={useTintedSrc(src, es)} alt={alt} loading="lazy" draggable={false} className={className} style={style} />
}

export function EImage({ s, el = 'image', className, children }: { s: Section; el?: string; className?: string; children?: ReactNode }) {
  const b = useB()
  const raw = getValue(s, el)
  const url = useTintedSrc(raw, s.els?.[el])
  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  const linked = b.activeField?.sectionId === s.id && b.activeField.el === el
  const es = s.els?.[el]
  return (
    <div
      className={cn('ed overflow-visible', className)}
      style={{ borderRadius: 'var(--r-card)', ...elCss({ margin: es?.margin, mt: es?.mt, mb: es?.mb, ml: es?.ml, mr: es?.mr, width: es?.width, widthUnit: es?.widthUnit, maxWidth: es?.maxWidth, maxWidthUnit: es?.maxWidthUnit, height: es?.height, heightUnit: es?.heightUnit }, 'image') }}
      data-label={b.mode === 'studio' ? 'Görsel · img' : `${fieldLabel(s, el)} · tıkla, değiştir`}
      data-el={`${s.id}:${el}`}
      data-selected={selected || undefined}
      data-linked={linked || undefined}
      onClick={(e) => {
        if (b.preview) return
        e.stopPropagation()
        b.select({ sectionId: s.id, el }, { focus: true })
      }}
    >
      <div className="relative size-full overflow-hidden" style={{ borderRadius: s.els?.[el]?.radius !== undefined ? s.els[el].radius : 'var(--r-card)' }}>
        <AnimatePresence initial={false}>
          <motion.img
            key={raw}
            src={sized(url, 1400)}
            alt=""
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className={cn('absolute inset-0 size-full', es?.fit === 'contain' ? 'object-contain' : 'object-cover')}
          />
        </AnimatePresence>
        {children}
      </div>
    </div>
  )
}

/* ---------- Shared bits ---------- */
const W = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('mx-auto w-full max-w-[1160px] px-6 @3xl:px-10', className)}>{children}</div>
)

export const padY = (p: number) => `clamp(${Math.round(p * 0.5)}px, ${(p / 12).toFixed(2)}cqi, ${p}px)`

/** Vertical spacing of ready-made sections, driven by the box model (responsive). */
export function secPad(s: Section): CSSProperties {
  const p = getBox(s).padding
  return { paddingTop: padY(p.t), paddingBottom: padY(p.b) }
}

function useType(s: Section) {
  const { doc } = useB()
  const sf = siteFonts(doc.site)
  const fp = { ...FONT_PAIRS[doc.site.fontPair], display: 'var(--f-head)', weight: sf.headingWeight, italicAccent: sf.italicAccent }
  const title = (max = s.style.titleSize, min = 30): CSSProperties => ({
    fontFamily: fp.display,
    fontWeight: s.style.titleWeight ?? fp.weight,
    letterSpacing: `${s.style.letterSpacing ?? fp.tracking}em`,
    lineHeight: fp.lh,
    fontSize: `clamp(${Math.min(min, max)}px, ${(max / 12).toFixed(2)}cqi, ${max}px)`,
    color: s.style.titleColor || undefined,
  })
  const body: CSSProperties = { color: 'var(--muted)', fontSize: s.style.bodySize ? `${s.style.bodySize}px` : undefined }
  return { fp, title, body }
}

const btnBase = 'inline-flex h-12 items-center justify-center gap-2 px-6 text-[15px] font-semibold transition-[background-color,color,border-color,border-radius] duration-300'
const primaryStyle: CSSProperties = { background: 'var(--btn-bg)', color: 'var(--btn-fg)', borderRadius: 'var(--r-btn)' }
const secondaryStyle: CSSProperties = { boxShadow: 'inset 0 0 0 1.5px var(--btn2)', color: 'var(--fg)', borderRadius: 'var(--r-btn)' }

function Buttons({ s, center }: { s: Section; center?: boolean }) {
  return (
    <div className={cn('mt-10 flex flex-wrap gap-3', center && 'justify-center')}>
      <E s={s} el="primary" kind="button" as="a" hint="a" className={btnBase} style={primaryStyle} />
      {s.content.secondary !== undefined && <E s={s} el="secondary" kind="button" as="a" hint="a" className={btnBase} style={secondaryStyle} />}
    </div>
  )
}

function Head({ s, center, className }: { s: Section; center?: boolean; className?: string }) {
  const { title, body } = useType(s)
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center', className)}>
      {s.content.eyebrow !== undefined && (
        <E s={s} el="eyebrow" kind="badge" className="inline-block text-[12.5px] font-semibold uppercase tracking-[.14em]" style={{ color: 'var(--accent)' }} />
      )}
      <E s={s} el="title" kind="heading" as="h2" hint="h2" className="mt-4 block text-balance" style={title()} />
      {s.content.body !== undefined && (
        <E s={s} el="body" kind="text" as="p" hint="p" multiline className="mt-5 block text-[17px] leading-[1.65]" style={body} />
      )}
    </div>
  )
}

function Logo({ s }: { s: Section }) {
  return (
    <span className="grid size-[30px] shrink-0 place-items-center rounded-full border-2 border-current">
      <E s={s} el="logo" kind="text" className="font-[Space_Grotesk] text-[14px] font-bold leading-none" />
    </span>
  )
}

/* ---------- Section renderers ---------- */
function Nav({ s }: { s: Section }) {
  return (
    <div className="flex h-[68px] items-center">
      <W className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <Logo s={s} />
          <E s={s} el="brand" kind="heading" className="text-[19px] font-semibold tracking-[-0.01em]" />
        </div>
        <div className="flex items-center gap-7">
          <nav data-grid={s.id} className="hidden items-center text-[14.5px] @4xl:flex" style={{ color: 'var(--muted)', columnGap: getGrid(s).gapX }}>
            {s.items.map((i) => (
              <E key={i.id} s={s} el={`items.${i.id}.title`} kind="link" as="a" hint="a" />
            ))}
          </nav>
          <E s={s} el="primary" kind="button" as="a" hint="a" className="hidden h-10 items-center px-4 text-[14px] font-semibold @md:inline-flex" style={primaryStyle} />
          <Menu size={21} className="@4xl:hidden" />
        </div>
      </W>
    </div>
  )
}

/** Parses the tiny terminal markup: "$ " prompt, "✓ " ok, "› " info, "✗ " error, 2+ spaces → muted, *word* → green. */
function TermLine({ line }: { line: string }) {
  const prefixes: [string, string][] = [
    ['$ ', 'text-white/40'],
    ['✓ ', 'text-emerald-400'],
    ['› ', 'text-white/35'],
    ['✗ ', 'text-red-400'],
  ]
  const hit = prefixes.find(([p]) => line.startsWith(p))
  const rest = hit ? line.slice(hit[0].length) : line
  const parts = rest.split(/(\s{2,})/)
  const rich = (t: string, muted: boolean, k: number) =>
    t.split(/(\*[^*]+\*)/).map((seg, i) =>
      seg.startsWith('*') && seg.endsWith('*') && seg.length > 2 ? (
        <span key={`${k}-${i}`} className="text-emerald-400">
          {seg.slice(1, -1)}
        </span>
      ) : (
        <span key={`${k}-${i}`} className={muted ? 'text-white/45' : undefined}>
          {seg}
        </span>
      ),
    )
  let afterGap = false
  return (
    <div className="h-[1.9em] whitespace-pre">
      {hit && <span className={hit[1]}>{hit[0]}</span>}
      {parts.map((p, i) => {
        if (/^\s{2,}$/.test(p)) {
          afterGap = true
          return <span key={i}>{p}</span>
        }
        return rich(p, afterGap, i)
      })}
    </div>
  )
}

function TerminalView({ s }: { s: Section }) {
  const b = useB()
  const el = 'terminal'
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const value = s.content.terminal ?? ''
  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  const linked = b.activeField?.sectionId === s.id && b.activeField.el === el
  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])
  const lines = value.split('\n')
  return (
    <div
      className="ed block"
      data-label={b.mode === 'studio' ? 'Kod · terminal' : 'Terminal · çift tıkla, yaz'}
      data-el={`${s.id}:${el}`}
      data-selected={selected || undefined}
      data-linked={linked || undefined}
      data-editing={editing || undefined}
      style={{ borderRadius: 12 }}
      onClick={(e) => {
        if (b.preview) return
        e.stopPropagation()
        b.select({ sectionId: s.id, el }, { focus: true })
      }}
      onDoubleClick={(e) => {
        if (b.preview) return
        e.stopPropagation()
        setEditing(true)
      }}
    >
      <div className="overflow-hidden rounded-[12px] border border-white/10 bg-[#141518] text-[#e6e8ec] shadow-[0_40px_90px_-30px_rgba(0,0,0,.6)]">
        <div className="flex h-10 items-center gap-2 border-b border-white/[0.07] px-4">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-white/20" />
          ))}
          <E s={s} el="termTitle" kind="text" className="ml-3 font-mono text-[12px] text-white/45" />
        </div>
        <div className="relative px-5 py-5 font-mono text-[12px] leading-[1.9] @md:text-[12.5px]">
          {editing ? (
            <textarea
              ref={ref}
              defaultValue={value}
              spellCheck={false}
              rows={Math.max(lines.length, 3)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Escape') setEditing(false)
              }}
              onBlur={(e) => {
                setEditing(false)
                if (e.target.value !== value) b.dispatch({ type: 'field', id: s.id, el, value: e.target.value })
              }}
              className="block w-full resize-none overflow-hidden whitespace-pre bg-transparent leading-[1.9] text-[#e6e8ec] outline-none"
            />
          ) : (
            <pre className="overflow-hidden">
              {lines.map((line, i) => (
                <TermLine key={i} line={line} />
              ))}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

/** Custom HTML in a sandboxed iframe that reports its own height. */
export function HtmlEmbed({ s, el = 'html' }: { s: Section; el?: string }) {
  const b = useB()
  const id = useId()
  const [h, setH] = useState(240)
  const html = s.content[el] ?? ''
  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  const linked = b.activeField?.sectionId === s.id && b.activeField.el === el
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.data && e.data.__pursae === id && typeof e.data.h === 'number') setH(Math.max(40, Math.ceil(e.data.h)))
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [id])
  const doc = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>html,body{margin:0;background:transparent;font-family:Inter,sans-serif}</style></head><body>${html}<script>const post=()=>parent.postMessage({__pursae:${JSON.stringify(id)},h:document.documentElement.scrollHeight},'*');new ResizeObserver(post).observe(document.documentElement);addEventListener('load',post);post();</script></body></html>`
  return (
    <div
      className="ed relative block"
      data-label={b.mode === 'studio' ? 'HTML · iframe' : 'HTML · tıkla, düzenle'}
      data-el={`${s.id}:${el}`}
      data-selected={selected || undefined}
      data-linked={linked || undefined}
      style={{ borderRadius: 12 }}
    >
      <iframe title="Özel HTML" sandbox="allow-scripts" srcDoc={doc} className="block w-full border-0 transition-[height] duration-300" style={{ height: h }} />
      {!b.preview && (
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            b.select({ sectionId: s.id, el }, { focus: true })
          }}
        />
      )}
    </div>
  )
}

function FloatCard({ className, delay = 0, still, children }: { className: string; delay?: number; still?: boolean; children: ReactNode }) {
  return (
    <motion.div
      animate={still ? { y: 0 } : { y: [0, -6, 0] }}
      transition={still ? { duration: 0.3 } : { duration: 5, delay, repeat: Infinity, ease: 'easeInOut' }}
      className={cn('absolute hidden rounded-[10px] bg-white px-4 py-3 text-[#121418] shadow-[0_18px_40px_-12px_rgba(0,0,0,.45)] @3xl:block', className)}
    >
      {children}
    </motion.div>
  )
}

function Terminal({ s }: { s: Section }) {
  const cards = s.content.floatCards ?? ''
  const still = cards === 'still'
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <TerminalView s={s} />
      {cards !== 'off' && (
        <>
      <FloatCard className="-bottom-8 -left-8 w-[200px]" delay={0.4} still={still}>
        <E s={s} el="card1Label" kind="text" className="block text-[10px] font-semibold tracking-[.12em] text-[#6b7280]" />
        <div className="mt-1.5 flex items-center gap-1.5 text-[14px] font-semibold text-emerald-600">
          <Check size={15} strokeWidth={2.6} /> <E s={s} el="card1Value" kind="text" />
        </div>
        <div className="mt-2.5 h-1 rounded-full bg-emerald-500" />
      </FloatCard>
      <FloatCard className="-right-6 -top-8 w-[170px]" still={still}>
        <E s={s} el="card2Label" kind="text" className="block text-[10px] font-semibold tracking-[.12em] text-[#6b7280]" />
        <E s={s} el="card2Value" kind="text" className="mt-1 block text-[22px] font-semibold tracking-tight" />
        <E s={s} el="card2Sub" kind="text" className="block text-[12px] text-[#6b7280]" />
      </FloatCard>
        </>
      )}
    </div>
  )
}

function Hero({ s }: { s: Section }) {
  const { fp, title, body } = useType(s)
  const center = s.style.align === 'center'
  const visual = s.content.visual || 'terminal'
  return (
    <div className="relative" style={secPad(s)}>
      <W className={cn('relative grid items-center gap-16', visual !== 'none' && !center && '@5xl:grid-cols-[1.05fr_.95fr]')}>
        <div className={cn(center && 'mx-auto max-w-3xl text-center')}>
          <E s={s} el="eyebrow" kind="badge" className="dot-badge inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium" style={{ background: 'color-mix(in srgb, var(--fg) 14%, transparent)' }} />
          <h1 className="mt-8" style={title(s.style.titleSize, 44)}>
            <E s={s} el="title" kind="heading" hint="h1" className="block" />
            <E s={s} el="accent" kind="heading" hint="h1" className={cn('block', fp.italicAccent && 'italic')} style={{ color: s.style.titleColor || 'var(--hl)' }} />
          </h1>
          <E s={s} el="body" kind="text" as="p" hint="p" multiline className={cn('mt-7 block max-w-[36rem] text-[17px] leading-[1.65]', center && 'mx-auto')} style={body} />
          <Buttons s={s} center={center} />
          <div data-grid={s.id} className={cn('mt-9 flex flex-wrap text-[12px] font-semibold uppercase tracking-[.08em]', center && 'justify-center')} style={{ color: 'var(--muted)', columnGap: getGrid(s).gapX, rowGap: getGrid(s).gapY }}>
            {s.items.map((i) => (
              <span key={i.id} className="inline-flex items-center gap-1.5">
                <EIcon s={s} el={`items.${i.id}.icon`} inline stroke={2.4} />
                <E s={s} el={`items.${i.id}.title`} kind="badge" />
              </span>
            ))}
          </div>
        </div>
        {visual === 'terminal' && <Terminal s={s} />}
        {visual === 'html' && <HtmlEmbed s={s} />}
        {visual === 'image' && <EImage s={s} className="aspect-[4/3.3] w-full shadow-[0_40px_90px_-30px_rgba(0,0,0,.5)]" />}
      </W>
    </div>
  )
}

function Banner({ s }: { s: Section }) {
  return (
    <div className="py-3.5">
      <W className="text-center text-[14px]">
        <E s={s} el="text" kind="text" />{' '}
        <E s={s} el="link" kind="link" as="a" hint="a" className="font-medium underline decoration-1 underline-offset-4" style={{ color: 'var(--accent)' }} />
      </W>
    </div>
  )
}

function gridStyle(g: GridSettings): CSSProperties {
  return { '--gm': repeatCols(g.colsM), '--gt': repeatCols(g.colsT), '--gd': repeatCols(g.cols), columnGap: g.gapX, rowGap: g.gapY } as CSSProperties
}

function cardStyle(g: GridSettings): CSSProperties {
  return {
    padding: g.pad,
    background: g.bg ?? 'var(--card)',
    border: g.border ? `${g.borderW}px solid ${g.borderColor ?? 'var(--line)'}` : 'none',
    borderRadius: g.radius ?? 'var(--r-card)',
    boxShadow: SHADOWS[g.shadow],
  }
}

/** Selectable card box of a list item: clicking its padding / background selects "items.<id>.card". */
function ECard({ s, id, className, style, children }: { s: Section; id: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  const b = useB()
  const el = `items.${id}.card`
  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  return (
    <div
      className={cn('ed edb', className)}
      style={{ ...style, ...cardCss(s.els?.[el]) }}
      data-el={`${s.id}:${el}`}
      data-label={b.mode === 'studio' ? `${CARD_NOUN[s.kind] ?? 'Kart'} · div` : `${fieldLabel(s, el)} · tıkla`}
      data-selected={selected || undefined}
      onClick={(e) => {
        if (b.preview) return
        e.stopPropagation()
        b.select({ sectionId: s.id, el })
      }}
    >
      {children}
    </div>
  )
}

function Features({ s }: { s: Section }) {
  const g = getGrid(s)
  const center = s.style.align === 'center'
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} center={center} />
        <div data-grid={s.id} className="mt-14 grid grid-cols-(--gm) @3xl:grid-cols-(--gt) @5xl:grid-cols-(--gd)" style={gridStyle(g)}>
          {s.items.map((i) => {
            return (
              <ECard key={i.id} s={s} id={i.id} className={cn(center && 'text-center')} style={cardStyle(g)}>
                <EIcon s={s} el={`items.${i.id}.icon`} className={cn('mb-6', center && 'mx-auto')} />
                <E s={s} el={`items.${i.id}.title`} kind="heading" as="h3" hint="h3" className="block text-[17px] font-semibold tracking-[-0.01em]" />
                <E s={s} el={`items.${i.id}.text`} kind="text" as="p" hint="p" multiline className="mt-2 block text-[14.5px] leading-[1.6]" style={{ color: 'var(--muted)' }} />
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

function Media({ s }: { s: Section }) {
  const { title, body } = useType(s)
  const left = s.content.imageSide === 'left'
  return (
    <div style={secPad(s)}>
      <W className="grid items-center gap-12 @4xl:grid-cols-2 @4xl:gap-20">
        <EImage s={s} className={cn('aspect-[4/3.4] w-full', left && '@4xl:order-first', !left && '@4xl:order-last')} />
        <div>
          <E s={s} el="eyebrow" kind="badge" className="inline-block text-[12.5px] font-semibold uppercase tracking-[.14em]" style={{ color: 'var(--accent)' }} />
          <E s={s} el="title" kind="heading" as="h2" hint="h2" className="mt-4 block text-balance" style={title()} />
          <E s={s} el="body" kind="text" as="p" hint="p" multiline className="mt-5 block text-[17px] leading-[1.65]" style={body} />
          <div className="mt-8 flex items-center gap-2 text-[15px] font-semibold" style={{ color: 'var(--accent)' }}>
            <E s={s} el="primary" kind="link" as="a" hint="a" />
            <ArrowRight size={17} />
          </div>
        </div>
      </W>
    </div>
  )
}

function Steps({ s }: { s: Section }) {
  const { fp } = useType(s)
  const g = getGrid(s)
  const center = s.style.align === 'center'
  // Gap of 0–1px keeps the classic divided look; larger gaps turn steps into cards.
  const divided = g.gapX <= 1 && g.gapY <= 1
  return (
    <div style={secPad(s)}>
      <W>
        <Head s={s} center={center} />
        <div
          data-grid={s.id}
          className={cn('mt-14 grid grid-cols-(--gm) @3xl:grid-cols-(--gt) @5xl:grid-cols-(--gd)', divided && 'overflow-hidden border')}
          style={{ ...gridStyle(g), ...(divided ? { background: 'var(--line)', borderColor: 'var(--line)', borderRadius: g.radius ?? 'var(--r-card)' } : {}) }}
        >
          {s.items.map((i, n) => (
            <ECard
              key={i.id}
              s={s}
              id={i.id}
              className={cn(divided && 'edb-in', center && 'text-center')}
              style={divided ? { padding: g.pad, background: g.bg ?? 'var(--bg)' } : { ...cardStyle(g), border: g.border ? cardStyle(g).border : `1px solid var(--line)` }}
            >
              <div className="text-[44px] leading-none" style={{ fontFamily: fp.display, fontWeight: fp.weight, color: 'var(--accent)' }}>
                {String(n + 1).padStart(2, '0')}
              </div>
              <E s={s} el={`items.${i.id}.title`} kind="heading" as="h3" hint="h3" className="mt-8 block text-[19px] font-semibold" />
              <E s={s} el={`items.${i.id}.text`} kind="text" as="p" hint="p" multiline className="mt-2 block text-[14.5px] leading-[1.6]" style={{ color: 'var(--muted)' }} />
            </ECard>
          ))}
        </div>
      </W>
    </div>
  )
}

function Quote({ s }: { s: Section }) {
  const { title } = useType(s)
  const center = s.style.align === 'center'
  const initials = (s.content.author || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
  return (
    <div style={secPad(s)}>
      <W className={cn('max-w-[900px]', center && 'text-center')}>
        <EIcon s={s} el="icon" stroke={2} className={cn(center && 'mx-auto')} />
        <E s={s} el="quote" kind="heading" as="blockquote" hint="blockquote" multiline className="mt-7 block text-balance" style={title(s.style.titleSize, 26)} />
        <div className={cn('mt-9 flex items-center gap-3', center && 'justify-center')}>
          <span className="grid size-11 place-items-center rounded-full text-[14px] font-semibold" style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
            {initials}
          </span>
          <div className="text-left">
            <E s={s} el="author" kind="text" className="block text-[15px] font-semibold" />
            <E s={s} el="role" kind="text" className="block text-[13.5px]" style={{ color: 'var(--muted)' }} />
          </div>
        </div>
      </W>
    </div>
  )
}

function Faq({ s }: { s: Section }) {
  const [open, setOpen] = useState<string | null>(s.items[0]?.id ?? null)
  return (
    <div style={secPad(s)}>
      <W className="grid gap-12 @4xl:grid-cols-[.8fr_1.2fr]">
        <Head s={s} />
        <div className="border-t" style={{ borderColor: 'var(--line)' }}>
          {s.items.map((i) => {
            const isOpen = open === i.id
            return (
              <ECard key={i.id} s={s} id={i.id} className="border-b" style={{ borderColor: 'var(--line)', paddingBlock: getGrid(s).gapY / 2 }}>
                <div className="flex items-start justify-between gap-6">
                  <E s={s} el={`items.${i.id}.title`} kind="heading" as="h3" hint="h3" className="text-[17px] font-semibold" />
                  <button
                    type="button"
                    aria-label={isOpen ? 'Kapat' : 'Aç'}
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(isOpen ? null : i.id)
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-full border"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <ChevronDown size={15} className={cn('transition-transform duration-300', isOpen && 'rotate-180')} />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
                      <div className="pt-3 pr-12">
                        <E s={s} el={`items.${i.id}.text`} kind="text" as="p" hint="p" multiline className="block text-[15px] leading-[1.65]" style={{ color: 'var(--muted)' }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ECard>
            )
          })}
        </div>
      </W>
    </div>
  )
}

function Cta({ s }: { s: Section }) {
  const center = s.style.align === 'center'
  const { title, body } = useType(s)
  return (
    <div className="relative overflow-hidden" style={secPad(s)}>
      <W className={cn('relative', center && 'text-center')}>
        <E s={s} el="title" kind="heading" as="h2" hint="h2" className="block text-balance" style={title()} />
        <E s={s} el="body" kind="text" as="p" hint="p" multiline className={cn('mt-5 block max-w-xl text-[18px] leading-[1.6]', center && 'mx-auto')} style={body} />
        <Buttons s={s} center={center} />
      </W>
    </div>
  )
}

function Footer({ s }: { s: Section }) {
  return (
    <div className="py-12">
      <W className="flex flex-col gap-8 @3xl:flex-row @3xl:items-center @3xl:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo s={s} />
            <E s={s} el="brand" kind="heading" className="text-[17px] font-semibold" />
          </div>
          <E s={s} el="note" kind="text" as="p" hint="p" className="mt-3 block text-[13.5px]" style={{ color: 'var(--muted)' }} />
        </div>
        <div data-grid={s.id} className="flex flex-wrap text-[14px]" style={{ color: 'var(--muted)', columnGap: getGrid(s).gapX, rowGap: getGrid(s).gapY }}>
          {s.items.map((i) => (
            <E key={i.id} s={s} el={`items.${i.id}.title`} kind="link" as="a" hint="a" />
          ))}
        </div>
      </W>
    </div>
  )
}

function TextBlock({ s }: { s: Section }) {
  const center = s.style.align === 'center'
  const { title, body } = useType(s)
  return (
    <div style={secPad(s)}>
      <W className={cn('max-w-[860px]', center && 'text-center')}>
        <E s={s} el="title" kind="heading" as="h2" hint="h2" className="block text-balance" style={title()} />
        <E s={s} el="body" kind="text" as="p" hint="p" multiline className="mt-5 block text-[17px] leading-[1.7]" style={body} />
      </W>
    </div>
  )
}

function ImageBlock({ s }: { s: Section }) {
  const video = s.content.video === '1'
  return (
    <div style={secPad(s)}>
      <W>
        <EImage s={s} className="aspect-[16/8] w-full">
          {video && (
            <div className="absolute inset-0 grid place-items-center bg-black/25">
              <span className="grid size-20 place-items-center rounded-full bg-white/90 text-[#121418] shadow-2xl backdrop-blur">
                <Play size={28} className="translate-x-0.5" fill="currentColor" />
              </span>
            </div>
          )}
        </EImage>
        <E s={s} el="caption" kind="text" as="p" hint="figcaption" className="mt-4 block text-center text-[14px]" style={{ color: 'var(--muted)' }} />
      </W>
    </div>
  )
}

function Form({ s }: { s: Section }) {
  const field = 'h-12 w-full border bg-transparent px-4 text-[15px] outline-none transition-colors focus:border-[var(--accent)]'
  const fs: CSSProperties = { borderColor: 'var(--line)', borderRadius: 'var(--r-btn)', background: 'var(--card)' }
  const { preview } = useB()
  return (
    <div style={secPad(s)}>
      <W className="grid gap-12 @4xl:grid-cols-2 @4xl:gap-20">
        <Head s={s} />
        <form className="grid gap-3" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-3 @md:grid-cols-2">
            <input disabled={!preview} placeholder="Adınız" className={field} style={fs} />
            <input disabled={!preview} placeholder="E-posta" className={field} style={fs} />
          </div>
          <textarea disabled={!preview} placeholder="Mesajınız" rows={5} className={cn(field, 'h-auto resize-none py-3')} style={{ ...fs, borderRadius: 'min(var(--r-card), 18px)' }} />
          <div>
            <E s={s} el="primary" kind="button" as="button" hint="button" className={cn(btnBase, 'mt-2')} style={primaryStyle} />
          </div>
        </form>
      </W>
    </div>
  )
}

type CellPick = CellType | 'box' | LayoutType
const CELL_GROUPS: { title: string; layout?: boolean; items: { t: CellPick; label: string; icon: typeof Heading; hint: string }[] }[] = [
  {
    title: 'Temel',
    items: [
      { t: 'heading', label: 'Başlık', icon: Heading, hint: 'Başlık ekle' },
      { t: 'text', label: 'Metin', icon: Pilcrow, hint: 'Paragraf ekle' },
      { t: 'button', label: 'Buton', icon: RectangleHorizontal, hint: 'Buton ekle' },
      { t: 'image', label: 'Görsel', icon: ImageIcon, hint: 'Görsel ekle' },
    ],
  },
  {
    title: 'Düzen',
    layout: true,
    items: [
      { t: 'box', label: 'Kapsayıcı', icon: Square, hint: 'Tek sütunlu iç kapsayıcı' },
      { t: 'flex', label: 'Flexbox', icon: Columns3, hint: 'İç Flexbox · yapı seç' },
      { t: 'grid', label: 'Grid', icon: LayoutGrid, hint: 'İç Grid · yapı seç' },
    ],
  },
]

/** Nesting level of the layout being rendered (1 = top-level section). */
const NestDepth = createContext(1)

const cardCls = 'relative w-full rounded-xl bg-white text-left shadow-[0_10px_30px_-12px_rgba(16,18,24,.35)] ring-1 ring-black/[0.07]'

function Cell({ s, item, tall, dashed }: { s: Section; item: Item; tall: boolean; dashed: boolean }) {
  const b = useB()
  const { title, body } = useType(s)
  const depth = useContext(NestDepth)
  const [menu, setMenu] = useState<null | 'menu' | 'type' | LayoutType>(null)
  const [over, setOver] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const type = (item.title === 'layout' && !item.sub ? '' : item.title) as CellType
  const el = `items.${item.id}.text`
  const canNest = depth < MAX_DEPTH
  const drag = b.dragging
  const dragLayout = !!drag && drag.kind === 'layout' && !drag.section && canNest
  // Cells holding a nested container leave drops to the inner cells.
  const accepts = !b.preview && type !== 'layout' && (!!drag?.cell || (dragLayout && !type))
  const set = (cell: CellType) => {
    b.dispatch({ type: 'cell', id: s.id, itemId: item.id, cell })
    setMenu(null)
    if (cell) window.setTimeout(() => b.select({ sectionId: s.id, el }, { focus: true }), 30)
  }
  const nest = (t: LayoutType, structure: string) => {
    const sub = createLayout(t, structure, { nested: true, palette: s.style.palette })
    b.dispatch({ type: 'nest', id: s.id, itemId: item.id, section: sub })
    setMenu(null)
    window.setTimeout(() => b.select({ sectionId: sub.id }), 30)
  }
  const pick = (t: CellPick) => {
    if (t === 'box') nest('flex', 'col')
    else if (t === 'flex' || t === 'grid') setMenu(t)
    else set(t)
  }

  // Esc / a click elsewhere closes the menu (before the editor's own Esc handling).
  useEffect(() => {
    if (!menu) return
    const focus = menu === 'menu' ? window.setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-pick]')?.focus({ preventScroll: true }), 200) : 0
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setMenu(null)
    }
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(null)
    }
    window.addEventListener('keydown', key, true)
    window.addEventListener('mousedown', down)
    return () => {
      window.clearTimeout(focus)
      window.removeEventListener('keydown', key, true)
      window.removeEventListener('mousedown', down)
    }
  }, [menu])

  if (b.preview && !type) return <div />

  const nested = type === 'layout'
  const minH = depth > 1 ? (type ? '' : 'min-h-[104px]') : item.box?.padding ? 'min-h-[110px]' : 'min-h-[150px]'
  return (
    <div
      ref={ref}
      className={cn('group/cell relative flex h-full flex-col', !b.preview && !nested && minH)}
      style={{
        justifyContent: { start: 'flex-start', center: 'center', end: 'flex-end' }[item.box?.valign ?? (nested ? 'start' : 'center')],
        textAlign: ({ start: 'left', center: 'center', end: 'right' } as const)[item.box?.halign ?? 'start'],
      }}
      onDragOver={(e) => {
        if (!accepts) return
        e.preventDefault()
        e.stopPropagation()
        if (!over) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!accepts || !drag) return
        e.preventDefault()
        e.stopPropagation()
        if (drag.cell) set(drag.cell)
        else {
          const t = drag.content?.type === 'grid' ? 'grid' : 'flex'
          if (drag.content?.structure) nest(t, drag.content.structure)
          else setMenu(drag.content?.type ? t : 'type')
        }
        b.setDragging(null)
        b.setDrop(null)
        setOver(false)
      }}
    >
      {!b.preview && (!type || over) && (
        <div
          className={cn('pointer-events-none absolute inset-0 border-2 transition-colors duration-200', dashed || !type ? 'border-dashed' : 'border-solid')}
          style={{
            borderRadius: 'min(var(--r-card), 14px)',
            borderColor: over ? 'var(--ov)' : 'color-mix(in srgb, var(--fg) 18%, transparent)',
            background: over ? 'color-mix(in srgb, var(--ov) 10%, transparent)' : 'color-mix(in srgb, var(--fg) 2.5%, transparent)',
          }}
        />
      )}

      {!type && !b.preview && (
        <div className={cn('relative grid place-items-center', menu ? 'px-2 py-3' : depth > 1 ? 'py-4' : 'py-6')} onClick={(e) => menu && e.stopPropagation()}>
          <AnimatePresence mode="wait" initial={false}>
            {menu === 'menu' ? (
              <motion.div
                key="menu"
                role="menu"
                aria-label="Hücreye ekle"
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.16, ease }}
                className={cn(cardCls, 'max-w-[300px] p-2')}
                onKeyDown={arrowNav}
              >
                <button type="button" aria-label="Kapat" title="Kapat · Esc" onClick={() => setMenu(null)} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-md text-[#8a8f99] outline-none transition-colors hover:bg-black/[0.05] hover:text-[#2b2f36] focus-visible:ring-2 focus-visible:ring-accent">
                  <X size={13} />
                </button>
                {CELL_GROUPS.map((g, gi) => (
                  <div key={g.title} className={cn(gi > 0 && 'mt-1.5 border-t border-black/[0.06] pt-1.5')}>
                    <div className="flex h-6 items-center gap-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-[.09em] text-[#8a8f99]">
                      {g.title}
                      {g.layout && !canNest && <span className="font-medium normal-case tracking-normal">· en fazla {MAX_DEPTH} seviye</span>}
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(62px,1fr))] gap-0.5">
                      {g.items.map(({ t, label, icon: I, hint }) => (
                        <button
                          key={t}
                          type="button"
                          role="menuitem"
                          data-pick
                          title={hint}
                          disabled={g.layout && !canNest}
                          onClick={() => pick(t)}
                          className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium text-[#2b2f36] outline-none transition-colors hover:bg-[#f1f2f4] focus-visible:bg-[#f1f2f4] focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-35"
                        >
                          <I size={17} strokeWidth={1.6} className="text-[#50555c]" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : menu ? (
              <motion.div key="picker" initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.16, ease }} className={cn(cardCls, 'max-w-[440px] px-3 pb-3 pt-2.5')}>
                <button type="button" aria-label="Kapat" title="Kapat · Esc" onClick={() => setMenu(null)} className="absolute right-1.5 top-1.5 z-10 grid size-6 place-items-center rounded-md text-[#8a8f99] outline-none transition-colors hover:bg-black/[0.05] hover:text-[#2b2f36] focus-visible:ring-2 focus-visible:ring-accent">
                  <X size={13} />
                </button>
                <LayoutPicker tone="light" size="xs" initialStep={menu} onBack={() => setMenu('menu')} onPick={(t, structure) => nest(t, structure)} />
              </motion.div>
            ) : (
              <motion.div key="plus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  aria-label="Öğe ekle"
                  aria-haspopup="menu"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenu('menu')
                  }}
                  className={cn('grid place-items-center rounded-full text-white shadow-lg outline-none transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--ov)_35%,transparent)]', depth > 1 ? 'size-8' : 'size-10')}
                  style={{ background: 'var(--ov)', color: 'var(--ov-ink)' }}
                >
                  <Plus size={depth > 1 ? 16 : 18} strokeWidth={2.4} />
                </button>
                <span className={depth > 1 ? 'text-[11px]' : 'text-[12px]'} style={{ color: 'var(--muted)' }}>
                  {over && dragLayout ? 'Kapsayıcıyı buraya bırak' : depth > 1 ? 'Öğe ya da kapsayıcı ekle' : 'Öğe ekle ya da widget sürükle'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {type === 'heading' && <E s={s} el={el} kind="heading" as="h3" hint="h3" className="block text-balance" style={title(s.style.titleSize, 24)} />}
      {type === 'text' && <E s={s} el={el} kind="text" as="p" hint="p" multiline className="block text-[16px] leading-[1.65]" style={body} />}
      {type === 'button' && (
        <div style={{ textAlign: 'inherit' }}>
          <E s={s} el={el} kind="button" as="a" hint="a" className={btnBase} style={primaryStyle} />
        </div>
      )}
      {type === 'image' && <EImage s={s} el={el} className={cn('w-full', tall ? 'h-full min-h-[260px]' : 'aspect-[4/3]')} />}
      {nested && item.sub && <NestedLayout parent={s} sub={item.sub} fill={!item.box?.valign} />}

      {type && !nested && !b.preview && (
        <button
          type="button"
          aria-label="Hücreyi boşalt"
          onClick={(e) => {
            e.stopPropagation()
            set('')
          }}
          className="absolute -right-2 -top-2 z-30 grid size-6 place-items-center rounded-full bg-[#1b1c20] text-white opacity-0 shadow-lg transition-opacity group-hover/cell:opacity-100"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

/** Devtools-style margin / padding visualisation. */
export function BoxBars({ v, outside }: { v: { t: number; r: number; b: number; l: number }; outside?: boolean }) {
  const color = outside ? 'rgba(246, 158, 74, .38)' : 'rgba(110, 200, 120, .38)'
  const bar = (style: CSSProperties, n: number, key: string) =>
    n > 0 ? (
      <div key={key} className="pointer-events-none absolute z-[16] grid place-items-center text-[10.5px] font-semibold text-[#1b1c20]" style={{ ...style, background: color }}>
        {n >= 14 && <span className="rounded bg-white/80 px-1">{n}</span>}
      </div>
    ) : null
  return outside ? (
    <>
      {bar({ left: -v.l, right: -v.r, top: -v.t, height: v.t }, v.t, 't')}
      {bar({ left: -v.l, right: -v.r, bottom: -v.b, height: v.b }, v.b, 'b')}
      {bar({ top: 0, bottom: 0, left: -v.l, width: v.l }, v.l, 'l')}
      {bar({ top: 0, bottom: 0, right: -v.r, width: v.r }, v.r, 'r')}
    </>
  ) : (
    <>
      {bar({ left: 0, right: 0, top: 0, height: v.t }, v.t, 't')}
      {bar({ left: 0, right: 0, bottom: 0, height: v.b }, v.b, 'b')}
      {bar({ top: v.t, bottom: v.b, left: 0, width: v.l }, v.l, 'l')}
      {bar({ top: v.t, bottom: v.b, right: 0, width: v.r }, v.r, 'r')}
    </>
  )
}

const JUSTIFY = { start: 'flex-start', center: 'center', end: 'flex-end', 'space-between': 'space-between', 'space-around': 'space-around', 'space-evenly': 'space-evenly' } as const
const ALIGN = { stretch: 'stretch', start: 'flex-start', center: 'center', end: 'flex-end' } as const

/** Section-level frame styles for containers (margin, border, radius, shadow…). */
export function containerFrameStyle(s: Section): CSSProperties {
  const bx = getBox(s)
  const layout = s.kind === 'layout'
  const full = bx.contentWidth === 'full'
  return {
    margin: box4(bx.margin),
    ...(full && bx.width !== 100 ? { width: `${bx.width}${bx.widthUnit}`, marginInline: bx.margin.l || bx.margin.r ? undefined : 'auto' } : {}),
    border: bx.borderStyle !== 'none' ? `${bx.borderWidth}px ${bx.borderStyle} ${bx.borderColor}` : undefined,
    borderRadius: bx.radius || undefined,
    boxShadow: SHADOWS[bx.shadow],
    zIndex: bx.zIndex || undefined,
    minHeight: bx.minHeight ? `${bx.minHeight}${bx.minHeightUnit}` : undefined,
    ...(layout || bx.minHeight ? { display: 'flex', flexDirection: 'column', justifyContent: 'center' } : {}),
    ...(!layout && bx.radius ? { overflow: 'clip' } : {}),
  }
}

/** Extra padding for sections whose own spacing is fixed (menu, banner, footer) plus side padding. */
export function framePad(s: Section): CSSProperties {
  if (s.kind === 'layout') return {}
  const p = getBox(s).padding
  const own = KINDS[s.kind].spacing
  return {
    paddingLeft: p.l || undefined,
    paddingRight: p.r || undefined,
    ...(own ? {} : { paddingTop: p.t ? padY(p.t) : undefined, paddingBottom: p.b ? padY(p.b) : undefined }),
  }
}

function CellBoxView({ s, item, index, width, row, tall, grid }: { s: Section; item: Item; index: number; width?: number; row: boolean; tall: boolean; grid: boolean }) {
  const b = useB()
  const bx = getBox(s)
  const el = `items.${item.id}.text`
  const selected = b.selection?.sectionId === s.id && b.selection.el === el
  const w = item.box?.width ?? width
  const style: CSSProperties = {
    padding: item.box?.padding ? box4(item.box.padding) : undefined,
    background: item.box?.bg,
    borderRadius: item.box?.radius || undefined,
  }
  if (!grid && w !== undefined) {
    ;(style as Record<string, string>)['--w'] = row ? `calc(${w}% - ${(bx.gapX * (1 - w / 100)).toFixed(2)}px)` : `${w}%`
  }
  // Empty and container cells always fill their grid area: an empty one is a drop target, a container sizes from it.
  if (grid && (!item.title || item.title === 'layout')) style.justifySelf = 'stretch'
  return (
    <div
      className={cn('cell relative flex flex-col', !grid && 'shrink', !grid && w !== undefined && (bx.stackMobile ? 'w-full @3xl:w-(--w)' : 'w-(--w)'))}
      style={style}
      data-selected={selected || undefined}
      data-label={b.mode === 'studio' ? `Hücre ${index + 1}` : undefined}
      onClick={(e) => {
        if (b.preview) return
        e.stopPropagation()
        b.select({ sectionId: s.id, el }, { focus: true })
      }}
    >
      <Cell s={s} item={item} tall={tall} dashed={grid} />
    </div>
  )
}

function Layout({ s }: { s: Section }) {
  const b = useB()
  const bx = getBox(s)
  const showPad = !b.preview && b.boxHint === 'padding' && b.selection?.sectionId === s.id && !b.selection.el
  const pad = showPad ? <BoxBars v={bx.padding} /> : null
  const st = getStructure(s.content.structure)
  const grid = s.content.type === 'grid'
  const row = bx.direction.startsWith('row')
  const boxed = bx.contentWidth === 'boxed'
  const inner: CSSProperties = {
    paddingTop: padY(bx.padding.t),
    paddingBottom: padY(bx.padding.b),
    paddingLeft: bx.padding.l,
    paddingRight: bx.padding.r,
    maxWidth: boxed ? `${bx.width}${bx.widthUnit}` : undefined,
    marginInline: 'auto',
    width: '100%',
    position: 'relative',
  }

  if (grid) {
    return (
      <div style={inner}>
        {pad}
        <div
          className={cn('grid', bx.stackMobile && '@max-3xl:grid-cols-1!')}
          style={{
            gridTemplateColumns: `repeat(${bx.gridCols}, minmax(0, 1fr))`,
            columnGap: bx.gapX,
            rowGap: bx.gapY,
            justifyItems: bx.justify.startsWith('space') ? 'stretch' : ALIGN[bx.justify as 'start' | 'center' | 'end'] ?? 'stretch',
            alignItems: ALIGN[bx.align],
          }}
        >
          {s.items.map((it, i) => (
            <CellBoxView key={it.id} s={s} item={it} index={i} row grid tall={false} />
          ))}
        </div>
      </div>
    )
  }

  // Flexbox. A structure with a tall cell (left column + stacked right) gets a nested column.
  const tallIdx = st.cells.findIndex((c) => c[3] > 1)
  const flexStyle: CSSProperties = {
    display: 'flex',
    flexDirection: bx.direction,
    flexWrap: bx.wrap ? 'wrap' : 'nowrap',
    justifyContent: JUSTIFY[bx.justify],
    alignItems: ALIGN[bx.align],
    columnGap: bx.gapX,
    rowGap: bx.gapY,
  }
  const stack = bx.stackMobile ? '@max-3xl:flex-col!' : ''

  if (tallIdx >= 0 && s.items.length === st.cells.length) {
    const tall = s.items[tallIdx]
    const rest = s.items.filter((_, i) => i !== tallIdx)
    return (
      <div style={inner}>
        {pad}
        <div className={stack} style={{ ...flexStyle, flexWrap: 'nowrap' }}>
          <CellBoxView s={s} item={tall} index={tallIdx} width={cellWidth(s, tallIdx)} row={row} tall grid={false} />
          <div className={cn('flex min-w-0 flex-1 flex-col')} style={{ rowGap: bx.gapY }}>
            {rest.map((it) => (
              <CellBoxView key={it.id} s={s} item={it} index={s.items.indexOf(it)} row={false} tall={false} grid={false} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={inner}>
      {pad}
      <div className={stack} style={flexStyle}>
        {s.items.map((it, i) => (
          <CellBoxView key={it.id} s={s} item={it} index={i} width={cellWidth(s, i)} row={row} tall={st.cells[i]?.[3] > 1} grid={false} />
        ))}
      </div>
    </div>
  )
}

/** A Flexbox / Grid container inside a layout cell. Same data and inspector as a top-level layout section. */
function NestedLayout({ parent, sub, fill }: { parent: Section; sub: Section; fill: boolean }) {
  const b = useB()
  const depth = useContext(NestDepth) + 1
  const selected = b.selection?.sectionId === sub.id
  const sectionOnly = selected && !b.selection?.el
  const hiddenHere = sub.hidden || sub.style.hideOn.includes(b.device)
  if (b.preview && hiddenHere) return null
  // Inherits the surrounding colors unless it has its own palette or background.
  const own = !!sub.style.bg || sub.style.palette !== parent.style.palette
  const Icon = sub.content.type === 'grid' ? LayoutGrid : Columns3
  return (
    <NestDepth.Provider value={depth}>
      <div
        id={sub.style.cssId || undefined}
        className={cn('nf', !b.preview && hiddenHere && 'opacity-40')}
        data-section={sub.id}
        data-selected={selected || undefined}
        data-hint={(b.hoverSection === sub.id && !selected) || undefined}
        style={{
          ...(own ? { ...paletteVars(sub.style.palette, b.doc.site.brand, sub.style.bg), background: 'var(--bg)', color: 'var(--fg)' } : {}),
          ...(fill ? { flex: '1 1 auto' } : {}),
          ...containerFrameStyle(sub),
          position: 'relative',
        }}
        onClick={(e) => {
          if (b.preview) return
          e.stopPropagation()
          b.select({ sectionId: sub.id })
        }}
      >
        {sub.style.css && <style>{sub.style.css.replace(/\bselector\b/g, `[data-section="${sub.id}"]`)}</style>}
        {sub.bg && <SectionBackground s={sub} />}
        <div className="relative z-[1]">
          <Layout s={sub} />
        </div>
        {!b.preview && (
          <>
            <span className="nf-ui pointer-events-none absolute left-0 top-0 z-20 flex -translate-y-full items-center gap-1 rounded-t-md px-1.5 py-[2px] text-[10.5px] font-semibold" style={{ background: 'var(--ov)', color: 'var(--ov-ink)' }}>
              <Icon size={11} strokeWidth={2.2} />
              {sub.name}
              {hiddenHere && ' · gizli'}
            </span>
            {sectionOnly && (
              <div className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-full items-center gap-px overflow-hidden rounded-t-[7px] text-[#0b1030]" style={{ background: 'color-mix(in srgb, var(--ov) 70%, #c7d5ff)' }} onClick={(e) => e.stopPropagation()}>
                {[
                  { i: CornerLeftUp, l: 'Üst kapsayıcıyı seç', f: () => b.select({ sectionId: parent.id }) },
                  { i: Copy, l: 'Çoğalt', f: () => b.dispatch({ type: 'duplicate', id: sub.id }) },
                  { i: X, l: 'Sil', f: () => b.remove(sub.id) },
                ].map(({ i: I, l, f }) => (
                  <Tip key={l} label={l}>
                    <button type="button" aria-label={l} onClick={f} className="grid h-6 w-7 place-items-center outline-none hover:bg-white/30 focus-visible:bg-white/40">
                      <I size={12.5} strokeWidth={2.2} />
                    </button>
                  </Tip>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </NestDepth.Provider>
  )
}

function HtmlBlock({ s }: { s: Section }) {
  return (
    <div style={secPad(s)}>
      <W>
        <HtmlEmbed s={s} />
      </W>
    </div>
  )
}

export const RENDERERS: Record<Section['kind'], (p: { s: Section }) => ReactNode> = {
  nav: withVariants('nav', Nav),
  hero: withVariants('hero', Hero),
  banner: withVariants('banner', Banner),
  features: withVariants('features', Features),
  media: withVariants('media', Media),
  steps: withVariants('steps', Steps),
  quote: withVariants('quote', Quote),
  faq: withVariants('faq', Faq),
  cta: withVariants('cta', Cta),
  footer: withVariants('footer', Footer),
  text: TextBlock,
  image: ImageBlock,
  form: withVariants('form', Form),
  layout: Layout,
  html: HtmlBlock,
  custom: CustomSection,
}
