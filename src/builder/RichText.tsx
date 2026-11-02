import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Bold, Check, Code, Italic, Link2, List, ListOrdered, RemoveFormatting, Strikethrough, Underline, Unlink, type LucideIcon } from 'lucide-react'
import { escapeHtml, safeHref, sanitizeRich, toHtml, toStored } from './rich'
export { richKind } from './rich'
import { cn } from './ui'

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl+'

type Fmt = { b: boolean; i: boolean; u: boolean; s: boolean; code: boolean; href: string | null; ul: boolean; ol: boolean }
const NONE: Fmt = { b: false, i: false, u: false, s: false, code: false, href: null, ul: false, ol: false }

function rangeIn(root: HTMLElement | null): Range | null {
  const sel = window.getSelection()
  if (!root || !sel || !sel.rangeCount) return null
  const r = sel.getRangeAt(0)
  return root.contains(r.commonAncestorContainer) ? r : null
}

function closestIn(root: HTMLElement, node: Node | null, tag: string): HTMLElement | null {
  let n: Node | null = node
  while (n && n !== root) {
    if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === tag) return n as HTMLElement
    n = n.parentNode
  }
  return null
}

const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value)
const fire = (root: HTMLElement) => root.dispatchEvent(new Event('input', { bubbles: true }))

function readFmt(root: HTMLElement | null): Fmt {
  const r = rangeIn(root)
  if (!root || !r) return NONE
  const q = (c: string) => {
    try {
      return document.queryCommandState(c)
    } catch {
      return false
    }
  }
  const a = closestIn(root, r.startContainer, 'A')
  return {
    b: q('bold'),
    i: q('italic'),
    // Links are underlined by CSS, so check the actual tags for u/s.
    u: !!closestIn(root, r.startContainer, 'U'),
    s: !!(closestIn(root, r.startContainer, 'S') || closestIn(root, r.startContainer, 'STRIKE')),
    code: !!closestIn(root, r.startContainer, 'CODE'),
    href: a?.getAttribute('href') ?? null,
    ul: !!closestIn(root, r.startContainer, 'UL'),
    ol: !!closestIn(root, r.startContainer, 'OL'),
  }
}

function unwrap(el: HTMLElement) {
  const p = el.parentNode
  if (!p) return
  while (el.firstChild) p.insertBefore(el.firstChild, el)
  p.removeChild(el)
}

function toggleCode(root: HTMLElement) {
  const r = rangeIn(root)
  if (!r) return
  const inCode = closestIn(root, r.commonAncestorContainer, 'CODE')
  if (inCode) unwrap(inCode)
  else {
    if (r.collapsed) return
    const frag = r.extractContents()
    frag.querySelectorAll('code').forEach((c) => unwrap(c))
    const c = document.createElement('code')
    c.appendChild(frag)
    r.insertNode(c)
    const sel = window.getSelection()
    const nr = document.createRange()
    nr.selectNodeContents(c)
    sel?.removeAllRanges()
    sel?.addRange(nr)
  }
  fire(root)
}

/** "example.com" → https://…, "a@b.co" → mailto:… */
function normalizeUrl(v: string) {
  const t = v.trim()
  if (!t) return ''
  if (/^[a-z][a-z0-9+.-]*:|^[#/.?]/i.test(t)) return t
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(t)) return `mailto:${t}`
  if (/^\+?[\d\s()-]{6,}$/.test(t)) return `tel:${t.replace(/[\s()-]/g, '')}`
  return `https://${t}`
}

/** Paste and drop always go through the sanitizer (no attributes, scripts or images reach the DOM). */
export function richPaste(e: React.ClipboardEvent, lists: boolean, multiline: boolean) {
  e.preventDefault()
  const html = e.clipboardData.getData('text/html')
  const text = e.clipboardData.getData('text/plain')
  if (html) {
    let clean = sanitizeRich(html, { lists, paste: true })
    if (!multiline) clean = clean.replace(/<br>/g, ' ')
    exec('insertHTML', clean)
  } else if (text) {
    if (multiline) exec('insertHTML', escapeHtml(text.replace(/\r\n?/g, '\n')).replace(/\n/g, '<br>'))
    else exec('insertText', text.replace(/\s*\n\s*/g, ' '))
  }
}

/* ---------- Toolbar ---------- */
function Btn({ icon: Icon, label, kbd, on, onRun }: { icon: LucideIcon; label: string; kbd?: string; on?: boolean; onRun: () => void }) {
  return (
    <button
      type="button"
      title={kbd ? `${label} (${kbd})` : label}
      aria-label={label}
      aria-pressed={on}
      onMouseDown={(e) => {
        e.preventDefault()
        onRun()
      }}
      className={cn('grid size-6 shrink-0 place-items-center rounded-[4px] transition-colors', on ? 'bg-accent/20 text-accent-soft' : 'text-ink-300 hover:bg-white/[0.07] hover:text-white')}
    >
      <Icon size={13} strokeWidth={2.2} />
    </button>
  )
}

const Sep = () => <span className="mx-0.5 h-4 w-px shrink-0 bg-white/10" />

export function RichToolbar({ root, lists, className, onExit }: { root: RefObject<HTMLElement | null>; lists?: boolean; className?: string; onExit?: () => void }) {
  const [fmt, setFmt] = useState<Fmt>(NONE)
  const [link, setLink] = useState<{ url: string; range: Range | null; bad?: boolean } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const bar = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => setFmt(readFmt(root.current)), [root])

  const run = (fn: () => void) => {
    const el = root.current
    if (!el) return
    if (document.activeElement !== el) el.focus()
    exec('styleWithCSS', 'false')
    fn()
    refresh()
  }

  const openLink = useCallback(() => {
    const el = root.current
    if (!el) return
    const r = rangeIn(el)
    setLink({ url: (r && closestIn(el, r.startContainer, 'A')?.getAttribute('href')) ?? '', range: r?.cloneRange() ?? null })
  }, [root])

  const restore = (r: Range | null) => {
    const el = root.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    if (r) sel.addRange(r)
    else {
      const end = document.createRange()
      end.selectNodeContents(el)
      end.collapse(false)
      sel.addRange(end)
    }
  }

  const applyLink = () => {
    const el = root.current
    if (!el || !link) return
    const raw = link.url.trim()
    if (!raw) return removeLink()
    const href = safeHref(normalizeUrl(raw))
    if (!href) {
      setLink({ ...link, bad: true })
      return
    }
    restore(link.range)
    const r = rangeIn(el)
    const a = r && closestIn(el, r.startContainer, 'A')
    if (a) {
      a.setAttribute('href', href)
      fire(el)
    } else if (!r || r.collapsed) exec('insertHTML', `<a href="${escapeHtml(href)}">${escapeHtml(raw)}</a>`)
    else exec('createLink', href)
    setLink(null)
    refresh()
  }

  const removeLink = () => {
    const el = root.current
    if (!el || !link) return
    restore(link.range)
    const r = rangeIn(el)
    const a = r && closestIn(el, r.startContainer, 'A')
    if (a) {
      const nr = document.createRange()
      nr.selectNodeContents(a)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(nr)
    }
    exec('unlink')
    setLink(null)
    refresh()
  }

  useEffect(() => {
    document.addEventListener('selectionchange', refresh)
    return () => document.removeEventListener('selectionchange', refresh)
  }, [refresh])

  // Shortcuts live on the editable itself so ⌘K only means "link" while typing here.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      const k = e.key.toLowerCase()
      const act: Record<string, () => void> = {
        b: () => exec('bold'),
        i: () => exec('italic'),
        u: () => exec('underline'),
        e: () => toggleCode(el),
        k: openLink,
      }
      const fn = e.shiftKey ? (k === 'x' ? () => exec('strikeThrough') : undefined) : act[k]
      if (!fn) return
      e.preventDefault()
      e.stopPropagation()
      fn()
      refresh()
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (link) input.current?.focus()
  }, [!!link])

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div
      ref={bar}
      data-rt-toolbar=""
      onClick={stop}
      onDoubleClick={stop}
      onPointerDown={stop}
      onMouseDown={stop}
      onContextMenu={stop}
      onKeyDown={stop}
      className={cn('text-[12px]', className)}
    >
      <div className="flex flex-wrap items-center gap-px">
        <Btn icon={Bold} label="Kalın" kbd={`${mod}B`} on={fmt.b} onRun={() => run(() => exec('bold'))} />
        <Btn icon={Italic} label="İtalik" kbd={`${mod}I`} on={fmt.i} onRun={() => run(() => exec('italic'))} />
        <Btn icon={Underline} label="Altı çizili" kbd={`${mod}U`} on={fmt.u} onRun={() => run(() => exec('underline'))} />
        <Btn icon={Strikethrough} label="Üstü çizili" kbd={`${mod}⇧X`} on={fmt.s} onRun={() => run(() => exec('strikeThrough'))} />
        <Btn icon={Code} label="Satır içi kod" kbd={`${mod}E`} on={fmt.code} onRun={() => run(() => root.current && toggleCode(root.current))} />
        <Sep />
        <Btn icon={Link2} label={fmt.href ? 'Bağlantıyı düzenle' : 'Bağlantı ekle'} kbd={`${mod}K`} on={!!fmt.href || !!link} onRun={() => (link ? setLink(null) : openLink())} />
        {lists && (
          <>
            <Sep />
            <Btn icon={List} label="Madde listesi" on={fmt.ul} onRun={() => run(() => exec('insertUnorderedList'))} />
            <Btn icon={ListOrdered} label="Numaralı liste" on={fmt.ol} onRun={() => run(() => exec('insertOrderedList'))} />
          </>
        )}
        <Sep />
        <Btn
          icon={RemoveFormatting}
          label="Biçimi temizle"
          onRun={() =>
            run(() => {
              exec('removeFormat')
              exec('unlink')
            })
          }
        />
      </div>
      {link && (
        <div className="mt-1 flex items-center gap-1 border-t border-white/[0.07] pt-1">
          <input
            ref={input}
            value={link.url}
            placeholder="https://… ya da #bolum"
            spellCheck={false}
            onChange={(e) => setLink({ ...link, url: e.target.value, bad: false })}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') {
                e.preventDefault()
                applyLink()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                const r = link.range
                setLink(null)
                restore(r)
              }
            }}
            onBlur={(e) => {
              const to = e.relatedTarget as Node | null
              if (to && (bar.current?.contains(to) || root.current?.contains(to))) return
              setLink(null)
              onExit?.()
            }}
            className={cn('h-6 min-w-0 flex-1 rounded-[4px] border bg-ink-850 px-1.5 text-[11.5px] text-ink-100 outline-none', link.bad ? 'border-red-400/70' : 'border-white/[0.1] focus:border-accent/70')}
          />
          <Btn icon={Check} label="Uygula" onRun={applyLink} />
          {fmt.href !== null || link.url ? <Btn icon={Unlink} label="Bağlantıyı kaldır" onRun={removeLink} /> : null}
        </div>
      )}
    </div>
  )
}

/* ---------- Inspector field ---------- */
export function RichField({
  value,
  onChange,
  multiline = true,
  lists = false,
  rows = 3,
  placeholder,
  variant = 'studio',
  dataField,
  onFocus,
  onBlur,
}: {
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  lists?: boolean
  rows?: number
  placeholder?: string
  variant?: 'studio' | 'basic'
  dataField?: string
  onFocus?: () => void
  onBlur?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const last = useRef<string | null>(null)
  const [empty, setEmpty] = useState(!value)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || value === last.current) return
    el.innerHTML = toHtml(value, { lists })
    last.current = value
    setEmpty(!value)
  }, [value, lists])

  const emit = () => {
    const el = ref.current
    if (!el) return
    const next = toStored(el.innerHTML, { lists })
    setEmpty(!el.textContent && !el.querySelector('li'))
    last.current = next
    if (next !== value) onChange(next)
  }

  const basic = variant === 'basic'
  const lh = basic ? 21 : 17
  return (
    <div
      className={cn(
        'group w-full border transition',
        basic ? 'rounded-[10px] border-white/[0.08] bg-ink-800 hover:border-white/15 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20' : 'rounded-[5px] border-white/[0.08] bg-ink-850 focus-within:border-accent/70',
      )}
    >
      <RichToolbar root={ref} lists={lists} className={cn('border-b border-white/[0.07] px-1 py-0.5', basic ? 'rounded-t-[10px] bg-white/[0.02]' : 'rounded-t-[5px] bg-ink-800')} />
      <div className="relative">
        {empty && placeholder && <span className={cn('pointer-events-none absolute left-0 top-0 text-ink-500', basic ? 'px-3 py-2.5 text-[14px]' : 'px-2 py-1.5 text-[12px]')}>{placeholder}</span>}
        <div
          ref={ref}
          data-field={dataField}
          role="textbox"
          aria-multiline={multiline}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          onInput={emit}
          onFocus={onFocus}
          onBlur={onBlur}
          onPaste={(e) => richPaste(e, lists, multiline)}
          onDrop={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            const r = rangeIn(ref.current)
            if (!multiline) e.preventDefault()
            else if (!(r && ref.current && closestIn(ref.current, r.startContainer, 'LI')) || e.shiftKey) {
              e.preventDefault()
              exec('insertLineBreak')
            }
          }}
          style={{ minHeight: rows * lh + (basic ? 20 : 12) } as CSSProperties}
          className={cn(
            'rt max-h-[320px] w-full overflow-y-auto break-words text-ink-100 outline-none',
            basic ? 'rounded-b-[10px] px-3 py-2.5 text-[14px] leading-[21px]' : 'rounded-b-[5px] px-2 py-1.5 text-[12px] leading-[17px]',
          )}
        />
      </div>
    </div>
  )
}

/* ---------- Floating toolbar for inline canvas editing ---------- */
export function FloatingRichToolbar({ root, lists, onExit }: { root: RefObject<HTMLElement | null>; lists?: boolean; onExit: () => void }) {
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null)
  useLayoutEffect(() => {
    const place = () => {
      const r = root.current?.getBoundingClientRect()
      if (!r) return
      const below = r.bottom + 10
      const above = below + 80 > window.innerHeight && r.top > 120
      setPos({ x: Math.max(8, Math.min(r.left, window.innerWidth - 340)), y: above ? r.top - 40 : below, above })
    }
    place()
    const ro = new ResizeObserver(place)
    if (root.current) ro.observe(root.current)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [root])
  if (!pos) return null
  return createPortal(
    <div style={{ position: 'fixed', left: pos.x, top: pos.y, transform: pos.above ? 'translateY(-100%)' : undefined, zIndex: 70 }} className="tip-in">
      <RichToolbar root={root} lists={lists} onExit={onExit} className="w-max max-w-[340px] rounded-[7px] border border-white/10 bg-[#202227] p-1 shadow-xl shadow-black/40" />
    </div>,
    document.body,
  )
}
