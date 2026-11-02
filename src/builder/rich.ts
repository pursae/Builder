/* Minimal rich text: a whitelisted HTML subset stored in plain string fields.
   Values without these tags stay plain text (backward compatible). */

const RICH_RE = /<\/?(b|strong|i|em|u|s|strike|del|code|a|br|ul|ol|li)\b[^>]*>/i
const DROP = new Set(['script', 'style', 'template', 'iframe', 'frame', 'object', 'embed', 'noscript', 'head', 'title', 'meta', 'link', 'base', 'svg', 'math', 'img', 'picture', 'video', 'audio', 'source', 'canvas', 'input', 'button', 'select', 'textarea', 'form', 'option'])
const MAP: Record<string, string> = { b: 'b', strong: 'b', i: 'i', em: 'i', u: 'u', ins: 'u', s: 's', strike: 's', del: 's', code: 'code', kbd: 'code', tt: 'code', samp: 'code' }
const BLOCK = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'section', 'article', 'header', 'footer', 'aside', 'nav', 'main', 'figure', 'figcaption', 'tr', 'dt', 'dd', 'table'])

export interface RichOpts {
  /** Keep ul/ol/li; otherwise list items become "• " lines. */
  lists?: boolean
  /** Pasted content: map inline styles (Google Docs, Word) to tags and collapse source whitespace. */
  paste?: boolean
}

/** Element kinds that accept formatting (paragraphs and headings). */
export const richKind = (k: string) => k === 'text' || k === 'heading'

export const isRich = (v: string | undefined) => !!v && RICH_RE.test(v)

export const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** http(s), mailto, tel, #anchor or a relative path; anything else (javascript:, data:…) is rejected. */
export function safeHref(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  const probe = v.replace(/[\u0000-\u0020\u007f-\u009f]+/g, '')
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(probe)
  if (scheme && !/^(https?|mailto|tel)$/i.test(scheme[1])) return null
  if (!scheme && probe.startsWith('//')) return null
  return v
}

function parse(html: string): DocumentFragment {
  const t = document.createElement('template')
  t.innerHTML = html
  return t.content
}

function styleTags(el: HTMLElement): string[] {
  const st = el.style
  const out: string[] = []
  const w = st.fontWeight
  if (w === 'bold' || w === 'bolder' || Number(w) >= 600) out.push('b')
  if (st.fontStyle === 'italic' || st.fontStyle === 'oblique') out.push('i')
  const deco = `${st.textDecoration} ${st.textDecorationLine}`
  if (/underline/.test(deco)) out.push('u')
  if (/line-through/.test(deco)) out.push('s')
  return out
}

function clean(src: Node, out: Node, o: RichOpts, inLink: boolean, inList: boolean) {
  for (const n of Array.from(src.childNodes)) {
    if (n.nodeType === Node.TEXT_NODE) {
      let text = n.textContent ?? ''
      if (o.paste) text = text.replace(/\s*\n\s*/g, ' ')
      if (text) out.appendChild(document.createTextNode(text))
      continue
    }
    if (n.nodeType !== Node.ELEMENT_NODE) continue
    const el = n as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (DROP.has(tag)) continue
    if (tag === 'br') {
      out.appendChild(document.createElement('br'))
      continue
    }
    if (tag === 'a') {
      const href = inLink ? null : safeHref(el.getAttribute('href'))
      if (!href) {
        clean(el, out, o, inLink, inList)
        continue
      }
      const a = document.createElement('a')
      a.setAttribute('href', href)
      if (/^https?:/i.test(href)) {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
      }
      clean(el, a, o, true, inList)
      if (a.textContent) out.appendChild(a)
      continue
    }
    if (tag === 'ul' || tag === 'ol') {
      if (o.lists) {
        const list = document.createElement(tag)
        clean(el, list, o, inLink, true)
        if (list.childNodes.length) out.appendChild(list)
      } else {
        clean(el, out, o, inLink, true)
      }
      continue
    }
    if (tag === 'li') {
      if (o.lists && inList && out instanceof HTMLElement && /^(UL|OL)$/.test(out.tagName)) {
        const li = document.createElement('li')
        clean(el, li, o, inLink, false)
        out.appendChild(li)
      } else {
        if (out.lastChild && out.lastChild.nodeName !== 'BR') out.appendChild(document.createElement('br'))
        out.appendChild(document.createTextNode('• '))
        clean(el, out, o, inLink, false)
        out.appendChild(document.createElement('br'))
      }
      continue
    }
    if (BLOCK.has(tag)) {
      if (out.lastChild && out.lastChild.nodeName !== 'BR' && !/^(UL|OL)$/.test(out.lastChild.nodeName)) out.appendChild(document.createElement('br'))
      clean(el, out, o, inLink, false)
      if (out.lastChild && out.lastChild.nodeName !== 'BR' && !/^(UL|OL)$/.test(out.lastChild.nodeName)) out.appendChild(document.createElement('br'))
      continue
    }
    let tags = MAP[tag] ? [MAP[tag]] : []
    if (o.paste) {
      // Google Docs wraps everything in <b style="font-weight:normal">.
      if (tag === 'b' && /normal|^[1-5]00$/.test(el.style.fontWeight)) tags = []
      for (const t of styleTags(el)) if (!tags.includes(t)) tags.push(t)
    }
    if (!tags.length) {
      clean(el, out, o, inLink, inList)
      continue
    }
    const outer = document.createElement(tags[0])
    let inner: HTMLElement = outer
    for (const t of tags.slice(1)) inner = inner.appendChild(document.createElement(t))
    clean(el, inner, o, inLink, inList)
    if (outer.textContent || outer.querySelector('br')) out.appendChild(outer)
  }
}

const cache = new Map<string, string>()

/** Whitelisted HTML subset: b, i, u, s, code, a[href], br (+ ul/ol/li with `lists`). */
export function sanitizeRich(html: string, o: RichOpts = { lists: true }): string {
  const key = `${o.lists ? 1 : 0}${o.paste ? 1 : 0}${html}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const box = document.createElement('div')
  clean(parse(html), box, o, false, false)
  const res = box.innerHTML
    .replace(/(<br>){3,}/g, '<br><br>')
    .replace(/^(<br>)+/, '')
    .replace(/(<br>)+(?=<\/li>|<\/?(ul|ol)>|$)/g, '')
  if (cache.size > 400) cache.clear()
  cache.set(key, res)
  return res
}

function decode(html: string) {
  const t = document.createElement('textarea')
  t.innerHTML = html
  return t.value
}

/** Plain text for SEO, AI context, audits, labels. Plain values pass through unchanged. */
export function toPlain(v: string | undefined): string {
  if (!v) return ''
  if (!isRich(v)) return v
  const text = v
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/(ul|ol)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
  return decode(text).replace(/\n{3,}/g, '\n\n').trim()
}

/** Editor HTML → stored value: plain text when nothing is formatted, otherwise sanitized HTML. */
export function toStored(html: string, o: RichOpts = {}): string {
  const safe = sanitizeRich(html, { lists: o.lists })
  if (/<(?!br>)[a-z]/i.test(safe)) return safe
  return decode(safe.replace(/<br>/g, '\n')).replace(/\u00a0/g, ' ').replace(/\s+$/, '')
}

/** Stored value → HTML for an editable surface / render. */
export function toHtml(v: string, o: RichOpts = { lists: true }): string {
  return isRich(v) ? sanitizeRich(v, o) : escapeHtml(v).replace(/\n/g, '<br>')
}
