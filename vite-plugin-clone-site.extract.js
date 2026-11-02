/*
 * Runs inside the target page (headless Chrome, via Runtime.evaluate) and returns a compact,
 * editor-oriented description of the rendered page: sections in visual order, each with a tree of
 * boxes (row / column / grid) and leaves (heading, text, button, link, image, icon, input, divider).
 * Geometry comes from layout boxes, styles from getComputedStyle. Plain browser JS, no imports.
 *
 * Node keys: t type · r [x,y,w,h] · tx text · tag · href · src · alt · ph placeholder
 *   dir row|column|grid · cols · gap · gapY · al align-items · jc justify · wrap · kids
 *   mt margin-top · ml/mr side offsets · self align-self · basis % of parent row · maxW · minH · ratio
 *   st style: c bg bgi bgs bgp bd rad sh pad f fs fw lh ls ta tf it ul op list fit
 */
// eslint-disable-next-line no-unused-vars
function __cloneExtract(opts) {
  opts = opts || {}
  const VW = document.documentElement.clientWidth || window.innerWidth
  const VH = window.innerHeight
  const MAX_NODES = opts.maxNodes || 2600
  let count = 0
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'HEAD', 'IFRAME', 'OBJECT', 'EMBED', 'CANVAS', 'MAP', 'AREA', 'DIALOG', 'SOURCE', 'TRACK'])
  const MEDIA = new Set(['IMG', 'PICTURE', 'svg', 'SVG', 'VIDEO'])
  const FORM = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
  const CANDIDATE = new Set(['HEADER', 'FOOTER', 'SECTION', 'NAV', 'ASIDE', 'ARTICLE'])

  const round = (n) => Math.round(n)
  const px = (v) => parseFloat(v) || 0
  const csCache = new WeakMap()
  const css = (el) => {
    let c = csCache.get(el)
    if (!c) {
      c = getComputedStyle(el)
      csCache.set(el, c)
    }
    return c
  }
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
  }
  const union = (rs) => {
    const x = Math.min(...rs.map((r) => r.x))
    const y = Math.min(...rs.map((r) => r.y))
    return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y }
  }

  /* ---------- colors ---------- */
  const cvs = document.createElement('canvas')
  cvs.width = cvs.height = 1
  const ctx = cvs.getContext('2d', { willReadFrequently: true })
  const colorCache = new Map()
  function color(c) {
    if (!c || c === 'transparent' || c === 'none') return null
    if (colorCache.has(c)) return colorCache.get(c)
    let p = null
    const m = c.match(/^rgba?\(([^)]+)\)$/)
    if (m) p = m[1].split(/[\s,/]+/).filter(Boolean).map((v) => (v.endsWith('%') ? (parseFloat(v) / 100) * (p && p.length === 3 ? 1 : 255) : parseFloat(v)))
    else if (ctx) {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = c
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      p = [d[0], d[1], d[2], d[3] / 255]
    }
    let out = null
    if (p && p.length >= 3) {
      const a = p.length > 3 ? p[3] : 1
      if (a >= 0.02) {
        const rgb = p.slice(0, 3).map((n) => Math.max(0, Math.min(255, Math.round(n))))
        out = a >= 0.98 ? '#' + rgb.map((n) => n.toString(16).padStart(2, '0')).join('') : 'rgba(' + rgb.join(',') + ',' + Math.round(a * 100) / 100 + ')'
      }
    }
    colorCache.set(c, out)
    return out
  }
  const absUrl = (u) => {
    try {
      return new URL(u, location.href).href
    } catch (e) {
      return null
    }
  }

  /* ---------- visibility ---------- */
  /** Screen-reader-only copies (clip / 1px boxes) duplicate visible text. */
  function srOnly(el, cs) {
    if (cs.position !== 'absolute' && cs.position !== 'fixed') return false
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return true
    const r = el.getBoundingClientRect()
    return r.width <= 2 || r.height <= 2
  }
  /** A fixed / sticky bar pinned to the top of the page (site header) is kept as normal flow. */
  function topBar(el, cs) {
    if (cs.position !== 'fixed') return false
    const r = el.getBoundingClientRect()
    const tag = el.tagName
    return r.top <= 4 && r.width >= VW * 0.8 && r.height <= 180 && r.height >= 24 && (tag === 'HEADER' || tag === 'NAV' || el.getAttribute('role') === 'banner' || !!el.querySelector('nav, a[href]'))
  }
  function visible(el) {
    if (SKIP.has(el.tagName)) return false
    const cs = css(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false
    if (cs.position === 'fixed' && !topBar(el, cs)) return false
    // display: contents has no box of its own; its children are judged instead.
    if (cs.display === 'contents') return true
    if (srOnly(el, cs)) return false
    if (el.getAttribute('aria-hidden') === 'true' && px(cs.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    if (cs.display !== 'contents' && (r.width < 1 || r.height < 1)) {
      if (cs.overflow === 'hidden' || !el.firstElementChild) return false
    }
    // Off-screen slider items: less than half (or 40px) of the box inside the viewport width.
    const inside = Math.min(r.right, VW) - Math.max(r.left, 0)
    if (inside < Math.min(r.width * 0.5, 40)) return false
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)' || (r.width <= 1 && r.height <= 1)) return false
    return true
  }

  /* ---------- text ---------- */
  /** Items of a horizontal flex / grid row are blockified by CSS but still read as one line. */
  const rowFlow = (n) => {
    if (n.nodeType !== 1) return false
    const cs = css(n)
    return (/flex/.test(cs.display) && !cs.flexDirection.startsWith('column')) || (/grid/.test(cs.display) && cs.gridAutoFlow.startsWith('column'))
  }
  function textOf(el) {
    let out = ''
    const walk = (n) => {
      const inRow = rowFlow(n)
      for (const c of n.childNodes) {
        if (c.nodeType === 3) out += c.nodeValue
        else if (c.nodeType === 1) {
          if (SKIP.has(c.tagName) || MEDIA.has(c.tagName)) continue
          const cs = css(c)
          if (cs.display === 'none' || cs.visibility === 'hidden' || srOnly(c, cs)) continue
          if (c.tagName === 'BR') {
            out += '\n'
            continue
          }
          const block = !inRow && /^(block|flex|grid|list-item|table)/.test(cs.display)
          if (block && out && !out.endsWith('\n')) out += '\n'
          if (inRow && out && !/\s$/.test(out)) out += ' '
          walk(c)
          if (block && !out.endsWith('\n')) out += '\n'
        }
      }
    }
    walk(el)
    return out
      .replace(/[ \t\r\f\v\u00a0\u200b]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim()
      .slice(0, 2400)
  }

  const fontName = (f) => (f || '').split(',')[0].replace(/["']/g, '').trim()
  const clipText = (cs) => cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text'
  // Gradient text (background-clip: text) is a text color, not a decoration.
  const decoInline = (cs) => !clipText(cs) && (!!color(cs.backgroundColor) || borderOf(cs) || (cs.backgroundImage && cs.backgroundImage !== 'none'))

  /** Element children render inline only (no blocks, media or button-like chips): a text leaf. */
  function inlineOnly(el, depth) {
    for (const c of el.children) {
      if (!visible(c)) continue
      if (MEDIA.has(c.tagName)) {
        const r = c.getBoundingClientRect()
        if (r.width > 28 || r.height > 28) return false
        continue
      }
      if (FORM.has(c.tagName) || c.tagName === 'BUTTON' || /^H[1-6]$/.test(c.tagName)) return false
      const cs = css(c)
      if (!cs.display.startsWith('inline') && cs.display !== 'contents') return false
      if (cs.display !== 'inline' && cs.display !== 'contents' && decoInline(cs) && depth === 0 && el.children.length > 1) return false
      if (!inlineOnly(c, depth + 1)) return false
    }
    return true
  }

  function borderOf(cs) {
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: px(cs['border' + s + 'Width']), s: cs['border' + s + 'Style'], c: color(cs['border' + s + 'Color']) }))
    const live = sides.filter((x) => x.w > 0 && x.s !== 'none' && x.s !== 'hidden' && x.c)
    if (!live.length) return null
    if (live.length === 4 && live.every((x) => x.w === live[0].w && x.c === live[0].c)) return round(live[0].w * 10) / 10 + 'px ' + live[0].s + ' ' + live[0].c
    // Partial borders (dividers) are kept as box-shadow-free CSS per side.
    const names = ['top', 'right', 'bottom', 'left']
    return sides
      .map((x, i) => (x.w > 0 && x.s !== 'none' && x.c ? 'border-' + names[i] + ':' + round(x.w * 10) / 10 + 'px ' + x.s + ' ' + x.c : ''))
      .filter(Boolean)
      .join(';')
  }

  function radiusOf(cs) {
    const v = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px)
    const m = Math.max(...v)
    return m > 0 ? round(Math.min(m, 999)) : 0
  }

  function bgImage(cs) {
    const bi = cs.backgroundImage
    if (!bi || bi === 'none') return null
    return bi.replace(/url\((["']?)(.*?)\1\)/g, (_, q, u) => 'url("' + (u.startsWith('data:') && u.length > 2000 ? '' : absUrl(u)) + '")')
  }

  const pad = (cs) => [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)].map(round)

  function textStyle(cs) {
    const fs = px(cs.fontSize)
    const lh = cs.lineHeight === 'normal' ? 0 : px(cs.lineHeight) / (fs || 16)
    const ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing) / (fs || 16)
    let c = color(cs.webkitTextFillColor) || color(cs.color)
    if (clipText(cs) && (!c || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || cs.color === 'rgba(0, 0, 0, 0)')) {
      const stop = (cs.backgroundImage || '').match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|oklab\([^)]+\)|oklch\([^)]+\))/i)
      c = stop ? color(stop[1]) : c
    }
    const st = { c, f: fontName(cs.fontFamily), fs: round(fs * 10) / 10, fw: parseInt(cs.fontWeight, 10) || 400 }
    if (lh) st.lh = round(lh * 100) / 100
    if (Math.abs(ls) > 0.004) st.ls = round(ls * 1000) / 1000
    const ta = cs.textAlign === 'start' ? (cs.direction === 'rtl' ? 'right' : 'left') : cs.textAlign === 'end' ? 'right' : cs.textAlign
    if (ta === 'center' || ta === 'right' || ta === 'justify') st.ta = ta === 'justify' ? 'left' : ta
    if (cs.textTransform && cs.textTransform !== 'none') st.tf = cs.textTransform
    if (cs.fontStyle === 'italic') st.it = 1
    if ((cs.textDecorationLine || '').includes('underline')) st.ul = 1
    return st
  }

  function decoStyle(cs, st) {
    const bg = color(cs.backgroundColor)
    if (bg) st.bg = bg
    const bgi = bgImage(cs)
    if (bgi) {
      st.bgi = bgi
      if (cs.backgroundSize && cs.backgroundSize !== 'auto') st.bgs = cs.backgroundSize
      if (cs.backgroundPosition && cs.backgroundPosition !== '0% 0%') st.bgp = cs.backgroundPosition
    }
    const bd = borderOf(cs)
    if (bd) st.bd = bd
    const rad = radiusOf(cs)
    if (rad) st.rad = rad
    if (cs.boxShadow && cs.boxShadow !== 'none') st.sh = cs.boxShadow.slice(0, 200)
    const op = px(cs.opacity)
    if (cs.opacity !== '' && op < 0.98 && op > 0.05) st.op = round(op * 100) / 100
    return st
  }
  const hasDeco = (st) => !!(st.bg || st.bgi || st.bd || st.sh)

  /* ---------- leaves ---------- */
  function mk(t, el, r, extra) {
    count++
    return Object.assign({ t, _r: r || box(el), _el: el }, extra)
  }

  function imageNode(el) {
    const img = el.tagName === 'PICTURE' ? el.querySelector('img') : el
    if (!img) return null
    const r = box(el.tagName === 'PICTURE' ? img : el)
    if (r.w < 6 || r.h < 6) return null
    let src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || ''
    if (!src || (src.startsWith('data:') && src.length < 200)) src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || src
    src = absUrl(src)
    if (!src) return null
    const cs = css(img)
    const st = decoStyle(cs, {})
    delete st.bgi
    if (cs.objectFit && cs.objectFit !== 'fill') st.fit = cs.objectFit === 'contain' || cs.objectFit === 'scale-down' ? 'contain' : 'cover'
    else if (img.naturalWidth && img.naturalHeight && r.w && r.h) {
      const nat = img.naturalWidth / img.naturalHeight
      if (Math.abs(nat / (r.w / r.h) - 1) > 0.08) st.fit = 'contain'
    }
    return mk('image', el, r, { src, alt: (img.alt || '').slice(0, 200), ratio: round((r.w / r.h) * 1000) / 1000, nw: img.naturalWidth || 0, st })
  }

  function svgNode(el) {
    const r = box(el)
    if (r.w < 4 || r.h < 4) return null
    const cs = css(el)
    const copy = el.cloneNode(true)
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    copy.setAttribute('width', String(round(r.w)))
    copy.setAttribute('height', String(round(r.h)))
    const fg = color(cs.color) || '#000000'
    copy.setAttribute('color', fg)
    // Resolve fills/strokes that come from CSS so the standalone file looks the same.
    const live = el.querySelectorAll('*')
    const clones = copy.querySelectorAll('*')
    for (let i = 0; i < live.length && i < 400; i++) {
      const lc = css(live[i])
      if (lc.fill && lc.fill !== 'none' && !clones[i].getAttribute('fill')) clones[i].setAttribute('fill', color(lc.fill) || lc.fill)
      if (lc.stroke && lc.stroke !== 'none' && !clones[i].getAttribute('stroke')) clones[i].setAttribute('stroke', color(lc.stroke) || lc.stroke)
    }
    if (!copy.getAttribute('fill') && cs.fill && cs.fill !== 'none') copy.setAttribute('fill', color(cs.fill) || cs.fill)
    let s = new XMLSerializer().serializeToString(copy)
    s = s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    if (s.length > 24000 || /<use[^>]+href="(?!#)/.test(s)) return null
    return mk('icon', el, r, { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s), ratio: round((r.w / r.h) * 1000) / 1000, st: {} })
  }

  function inputNode(el) {
    const type = (el.getAttribute('type') || '').toLowerCase()
    if (/^(hidden|checkbox|radio|file|image|range|color)$/.test(type)) return null
    const cs = css(el)
    const r = box(el)
    if (type === 'submit' || type === 'button') {
      const st = Object.assign(textStyle(cs), decoStyle(cs, {}), { pad: pad(cs) })
      return mk('button', el, r, { tx: (el.value || 'Gönder').slice(0, 80), st })
    }
    const ph = el.tagName === 'SELECT' ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '') : el.getAttribute('placeholder') || el.value || ''
    const st = Object.assign(textStyle(cs), decoStyle(cs, {}), { pad: pad(cs) })
    return mk('input', el, r, { tag: el.tagName.toLowerCase(), ph: ph.slice(0, 120), st })
  }

  /** a / button with its own fill or border (or a single decorated child filling it). */
  function buttonish(el, cs) {
    const tag = el.tagName
    const role = el.getAttribute('role')
    if (tag !== 'A' && tag !== 'BUTTON' && role !== 'button' && !/\b(btn|button)\b/i.test(el.className && el.className.baseVal === undefined ? el.className : '')) return null
    const r = el.getBoundingClientRect()
    if (r.height > 110 || r.width > 600) return null
    if (decoInline(cs) && !(cs.backgroundImage !== 'none' && !color(cs.backgroundColor) && !borderOf(cs) && !/gradient/.test(cs.backgroundImage))) return el
    const kids = [...el.children].filter(visible)
    if (kids.length === 1) {
      const kr = kids[0].getBoundingClientRect()
      const kcs = css(kids[0])
      if (kr.width * kr.height >= r.width * r.height * 0.8 && (color(kcs.backgroundColor) || borderOf(kcs))) return kids[0]
    }
    return null
  }

  function buttonNode(el, skin) {
    const cs = css(el)
    const scs = css(skin)
    const tx = textOf(el)
    if (!tx) return null
    const st = Object.assign(textStyle(scs.color ? scs : cs), decoStyle(scs, {}), { pad: pad(scs) })
    st.ta = 'center'
    const href = el.tagName === 'A' ? absUrl(el.getAttribute('href') || '') : null
    return mk('button', el, box(skin), { tx, href: href && !href.startsWith('javascript:') ? href : undefined, st })
  }

  /** Inline links / bold / italics inside a paragraph as the editor's rich-text subset (b, i, a, br); null when plain. */
  const esc = (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  function richOf(el) {
    if (!el.querySelector('a[href], b, strong, em, i, span, mark')) return null
    const base = css(el)
    const baseBold = (parseInt(base.fontWeight, 10) || 400) >= 600
    const baseItalic = base.fontStyle === 'italic'
    let tags = 0
    const walk = (n, inLink) => {
      let out = ''
      const inRow = rowFlow(n)
      for (const c of n.childNodes) {
        if (c.nodeType === 3) {
          out += esc(c.nodeValue)
          continue
        }
        if (c.nodeType !== 1 || SKIP.has(c.tagName) || MEDIA.has(c.tagName)) continue
        const cs = css(c)
        if (cs.display === 'none' || cs.visibility === 'hidden' || srOnly(c, cs)) continue
        if (c.tagName === 'BR') {
          out += '<br>'
          continue
        }
        let inner = walk(c, inLink || c.tagName === 'A')
        const href = c.tagName === 'A' ? absUrl(c.getAttribute('href') || '') : null
        if (!inLink && href && /^(https?:|mailto:|tel:)/.test(href)) {
          inner = '<a href="' + esc(href) + '">' + inner + '</a>'
          tags++
        } else if (inner.trim()) {
          if (!baseBold && (parseInt(cs.fontWeight, 10) || 400) >= 600) {
            inner = '<b>' + inner + '</b>'
            tags++
          }
          if (!baseItalic && cs.fontStyle === 'italic') {
            inner = '<i>' + inner + '</i>'
            tags++
          }
        }
        out += inRow ? (out && !/\s$/.test(out) ? ' ' : '') + inner : /^(block|flex|grid|list-item|table)/.test(cs.display) ? '<br>' + inner + '<br>' : inner
      }
      return out
    }
    let html = walk(el, el.tagName === 'A')
    if (!tags) return null
    html = html
      .replace(/[ \t\r\n\f\v\u00a0\u200b]+/g, ' ')
      .replace(/\s*<br>\s*/g, '<br>')
      .replace(/(<br>){2,}/g, '<br>')
      .replace(/^(<br>)+|(<br>)+$/g, '')
      .trim()
    return html.length <= 6000 ? html : null
  }

  // Reveal / highlight effects stack two copies of the same text on top of each other.
  const placed = new Map()
  function duplicateText(tx, r) {
    const list = placed.get(tx) || []
    const hit = list.some((o) => {
      const w = Math.min(o.x + o.w, r.x + r.w) - Math.max(o.x, r.x)
      const h = Math.min(o.y + o.h, r.y + r.h) - Math.max(o.y, r.y)
      return w > 0 && h > 0 && w * h > Math.min(o.w * o.h, r.w * r.h) * 0.6
    })
    if (!hit) placed.set(tx, list.concat([r]))
    return hit
  }

  function textNode(el, t) {
    const tx = textOf(el)
    if (!tx) return null
    if (duplicateText(tx, box(el))) return null
    const cs = css(el)
    const st = textStyle(cs)
    decoStyle(cs, st)
    if (clipText(cs)) {
      delete st.bgi
      delete st.bgs
      delete st.bgp
    }
    const p = pad(cs)
    // Clickable leaves keep their padding even without a fill: it is their hit area and the spacing between menu items.
    const clickable = el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'
    if (p.some((v) => v > 0) && (hasDeco(st) || clickable)) st.pad = p
    if (cs.display === 'list-item' && cs.listStyleType !== 'none') st.list = cs.listStyleType
    const extra = { tx }
    if (t !== 'link') {
      const html = richOf(el)
      if (html) extra.html = html
    }
    if (t === 'heading') extra.tag = el.tagName.toLowerCase()
    if (t === 'link') {
      const href = absUrl(el.getAttribute('href') || '')
      if (href && !href.startsWith('javascript:')) extra.href = href
    }
    const block = !cs.display.startsWith('inline')
    const n = mk(t, el, null, extra)
    n.st = st
    n._block = block
    return n
  }

  /* ---------- UI mockups → screenshots ---------- */
  // Product screenshots built from DOM (app chrome, dashboards, chat threads…) are dense trees of tiny,
  // often absolutely positioned text with no real links or big headings. Rebuilding them node by node
  // only produces overlapping text, so they become one image cut from the rendered page.
  const snaps = []
  function mockup(el) {
    if (opts.snaps === false || snaps.length >= 14) return false
    const r = el.getBoundingClientRect()
    if (r.width < 180 || r.height < 120) return false
    const all = el.getElementsByTagName('*')
    if (all.length < 30 || all.length > 4000) return false
    let texts = 0
    let small = 0
    let links = 0
    let abs = 0
    for (let i = 0; i < all.length; i++) {
      const e = all[i]
      if (e.tagName === 'A' && e.hasAttribute('href') && ++links > 2) return false
      const ecs = css(e)
      if (ecs.display === 'none' || ecs.visibility === 'hidden') continue
      if (ecs.position === 'absolute') abs++
      let own = false
      for (const t of e.childNodes) if (t.nodeType === 3 && t.nodeValue.trim()) own = true
      if (!own) continue
      const fs = px(ecs.fontSize)
      if (fs >= 22) return false
      texts++
      if (fs <= 13.5) small++
    }
    if (el.getAttribute('aria-hidden') === 'true' && texts >= 6) return true
    return (texts >= 10 && small >= texts * 0.6) || (abs >= 8 && texts >= 6 && small >= texts * 0.5)
  }
  function snapNode(el) {
    const r = box(el)
    const x = Math.max(0, r.x)
    const w = Math.min(VW, r.x + r.w) - x
    const rr = { x, y: r.y, w, h: r.h }
    const id = 'snap' + snaps.length
    snaps.push({ id, x: round(rr.x), y: round(rr.y), w: round(rr.w), h: round(rr.h) })
    const st = {}
    const rad = radiusOf(css(el))
    if (rad) st.rad = rad
    return mk('image', el, rr, { src: '', snap: id, alt: '', ratio: round((rr.w / rr.h) * 1000) / 1000, st })
  }

  /* ---------- containers ---------- */
  function node(el) {
    if (count > MAX_NODES || !visible(el)) return null
    const tag = el.tagName
    if (tag === 'IMG' || tag === 'PICTURE') return imageNode(el)
    if (tag === 'svg' || tag === 'SVG') return svgNode(el)
    if (tag === 'VIDEO') {
      const poster = el.getAttribute('poster')
      const r = box(el)
      return poster && r.w > 20 ? mk('image', el, r, { src: absUrl(poster), alt: '', ratio: round((r.w / r.h) * 1000) / 1000, st: { fit: 'cover' } }) : null
    }
    if (FORM.has(tag)) return inputNode(el)
    if (tag === 'HR') {
      const cs = css(el)
      const r = box(el)
      return mk('divider', el, r, { st: { bg: color(cs.borderTopColor) || color(cs.backgroundColor) || '#e5e7eb', h: Math.max(1, round(px(cs.borderTopWidth) || r.h)) } })
    }
    const cs = css(el)
    const skin = buttonish(el, cs)
    if (skin) {
      const b = buttonNode(el, skin)
      if (b) return b
    }
    // A text-only link whose inner wrappers are flex/block (menus) is still one link.
    // …unless it holds decorated blocks of its own (date badges, chips, cards): those are laid out as a box.
    const decoBlocks = () => [...el.querySelectorAll('*')].slice(0, 60).some((d) => !css(d).display.startsWith('inline') && decoInline(css(d)) && d.getBoundingClientRect().width > 8)
    if (tag === 'A' && !el.querySelector('img,svg,video,picture,h1,h2,h3,h4,h5,h6,p,ul,ol,input,button') && !decoBlocks()) {
      const n = textNode(el, 'link')
      if (n) {
        const inner = el.firstElementChild && el.children.length === 1 ? css(el.firstElementChild) : null
        if (inner && inner.color) n.st.c = color(inner.color) || n.st.c
        return n
      }
    }
    if (mockup(el)) return snapNode(el)
    if (inlineOnly(el, 0)) {
      if (/^H[1-6]$/.test(tag)) return textNode(el, 'heading')
      const tx = textOf(el)
      if (tx) {
        if (tag === 'A') return textNode(el, 'link')
        // <li><a>Menu</a></li>: the link carries the href and usually the styling.
        const links = [...el.querySelectorAll('a[href]')].filter(visible)
        if (links.length === 1 && textOf(links[0]) === tx) {
          const n = textNode(links[0], 'link')
          if (n) {
            n._r = box(el)
            return n
          }
        }
        return textNode(el, 'text')
      }
      // Empty decorated element: a shape / spacer / background image block.
      const st = decoStyle(cs, {})
      const r = box(el)
      if (hasDeco(st) && r.w >= 4 && r.h >= 2) {
        if (r.h <= 4) return mk('divider', el, r, { st: { bg: st.bg || '#e5e7eb', h: Math.max(1, round(r.h)) } })
        return mk('box', el, r, { dir: 'column', kids: [], st, minH: round(r.h), _fixedW: round(r.w) })
      }
      return null
    }
    return container(el, cs)
  }

  /** Absolutely positioned media without text (photos, blobs, illustrations) → a background layer. */
  function layerOf(c, ccs, r) {
    if (ccs.position !== 'absolute' && ccs.zIndex !== '-1') return null
    const cr = box(c)
    const area = (cr.w * cr.h) / Math.max(1, r.w * r.h)
    if (area < 0.12 || textOf(c)) return null
    const cover = area >= 0.85
    const place = cover ? { bgs: 'cover', bgp: 'center' } : { bgs: round(cr.w) + 'px ' + round(cr.h) + 'px', bgp: round(cr.x - r.x) + 'px ' + round(cr.y - r.y) + 'px' }
    const media = c.tagName === 'IMG' || c.tagName === 'svg' || c.tagName === 'PICTURE' ? c : c.querySelector('img,svg')
    if (media && (media.tagName === 'svg' || media.tagName === 'SVG')) {
      const n = svgNode(media)
      count--
      return n ? Object.assign({ bgi: 'url("' + n.src + '")' }, cover ? { bgs: '100% 100%', bgp: 'center' } : place) : null
    }
    if (media) {
      const img = media.tagName === 'PICTURE' ? media.querySelector('img') : media
      const src = img && (img.currentSrc || img.src)
      if (!src) return null
      return Object.assign({ bgi: 'url("' + absUrl(src) + '")' }, cover ? { bgs: css(img).objectFit === 'contain' ? 'contain' : 'cover', bgp: css(img).objectPosition || 'center' } : place)
    }
    const bgi = bgImage(ccs) || (c.firstElementChild ? bgImage(css(c.firstElementChild)) : null)
    const bgc = color(ccs.backgroundColor)
    if (bgi) return Object.assign({ bgi }, cover ? { bgs: ccs.backgroundSize, bgp: ccs.backgroundPosition } : place)
    if (bgc && cover) return { bg: bgc }
    return null
  }

  function container(el, cs, force) {
    const kids = []
    const layers = []
    const r = box(el)
    for (const c of el.childNodes) {
      if (count > MAX_NODES) break
      if (c.nodeType === 3) {
        const t = c.nodeValue.replace(/\s+/g, ' ').trim()
        if (!t) continue
        const range = document.createRange()
        range.selectNodeContents(c)
        const rr = range.getBoundingClientRect()
        if (rr.width < 1) continue
        const st = textStyle(cs)
        kids.push(mk('text', el, { x: rr.left + window.scrollX, y: rr.top + window.scrollY, w: rr.width, h: rr.height }, { tx: t, st }))
        continue
      }
      if (c.nodeType !== 1) continue
      const ccs = visible(c) ? css(c) : null
      if (!ccs) continue
      if (layers.length < 3) {
        const layer = layerOf(c, ccs, r)
        if (layer) {
          layers.push(layer)
          continue
        }
      }
      if (ccs.display === 'contents') {
        const sub = container(c, ccs)
        if (sub) kids.push(...(sub.t === 'box' && !hasDeco(sub.st || {}) ? sub.kids : [sub]))
        continue
      }
      const n = node(c)
      if (n) kids.push(n)
    }
    const st = decoStyle(cs, {})
    // Later DOM siblings paint on top, so they come first in the CSS background list.
    const imgs = layers.filter((l) => l.bgi).reverse()
    if (imgs.length) {
      const own = st.bgi ? [{ bgi: st.bgi, bgs: st.bgs || 'auto', bgp: st.bgp || '0% 0%' }] : []
      const all = imgs.concat(own)
      st.bgi = all.map((l) => l.bgi).join(', ')
      st.bgs = all.map((l) => l.bgs || 'auto').join(', ')
      st.bgp = all.map((l) => l.bgp || 'center').join(', ')
    }
    const solid = layers.find((l) => l.bg)
    if (solid && !st.bg) st.bg = solid.bg
    // Text color/font cascade: kept on boxes so unstyled descendants inherit correctly.
    const deco = hasDeco(st)
    if (!kids.length) {
      if (!deco || r.w < 4 || r.h < 4) return null
      return mk('box', el, r, { dir: 'column', kids: [], st, minH: round(r.h), _fixedW: round(r.w) })
    }
    if (kids.length === 1 && !deco && !force) return kids[0]
    const n = mk('box', el, r, { kids, st })
    n._pad = pad(cs)
    n._bw = [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)]
    n._cs = { display: cs.display, dir: cs.flexDirection, ai: cs.alignItems, jc: cs.justifyContent, gtc: cs.gridTemplateColumns, cg: px(cs.columnGap), rg: px(cs.rowGap), maxW: cs.maxWidth }
    if (deco && st.pad === undefined && n._pad.some((v) => v > 0)) st.pad = n._pad
    else if (n._pad.some((v) => v > 0)) st.pad = n._pad
    if (force || deco) Object.assign(st, inheritText(cs))
    return n
  }

  function inheritText(cs) {
    const t = textStyle(cs)
    return { c: t.c, f: t.f }
  }

  /* ---------- layout inference ---------- */
  function lines(kids) {
    const sorted = kids.slice().sort((a, b) => a._r.y - b._r.y || a._r.x - b._r.x)
    const out = []
    for (const k of sorted) {
      const r = k._r
      let line = null
      for (const l of out) {
        const top = Math.max(l.y, r.y)
        const bot = Math.min(l.y + l.h, r.y + r.h)
        const overlap = bot - top
        const sideBySide = l.items.every((o) => r.x >= o._r.x + o._r.w - 3 || o._r.x >= r.x + r.w - 3)
        if (overlap > Math.min(l.h, r.h) * 0.45 && sideBySide) {
          line = l
          break
        }
      }
      if (line) {
        line.items.push(k)
        const y2 = Math.max(line.y + line.h, r.y + r.h)
        line.y = Math.min(line.y, r.y)
        line.h = y2 - line.y
      } else out.push({ y: r.y, h: r.h, items: [k] })
    }
    for (const l of out) l.items.sort((a, b) => a._r.x - b._r.x)
    return out.sort((a, b) => a.y - b.y)
  }

  const median = (a) => {
    if (!a.length) return 0
    const s = a.slice().sort((x, y) => x - y)
    return s[Math.floor(s.length / 2)]
  }

  function contentBox(n) {
    const r = n._r
    const p = n._pad || [0, 0, 0, 0]
    const b = n._bw || [0, 0, 0, 0]
    return { x: r.x + p[3] + b[3], y: r.y + p[0] + b[0], w: Math.max(1, r.w - p[1] - p[3] - b[1] - b[3]), h: Math.max(1, r.h - p[0] - p[2] - b[0] - b[2]) }
  }

  function synthRow(items) {
    count++
    return { t: 'box', _r: union(items.map((k) => k._r)), kids: items, st: {}, _synth: true }
  }

  /** Decides row / column / grid for a box and places its children (offsets, self, basis, width). */
  function arrange(n) {
    if (n.t !== 'box') return
    const kids = n.kids
    const cb = n._synth ? n._r : contentBox(n)
    const ls = lines(kids)
    const multi = ls.filter((l) => l.items.length > 1)
    if (kids.length > 1 && ls.length === 1) n.dir = 'row'
    else if (!multi.length) n.dir = 'column'
    else {
      const full = ls.slice(0, -1)
      const cols = ls[0].items.length
      const ws = kids.map((k) => k._r.w)
      const similar = Math.max(...ws) <= Math.min(...ws) * 1.25 + 4
      if (cols > 1 && full.every((l) => l.items.length === cols) && ls[ls.length - 1].items.length <= cols && similar) {
        n.dir = 'grid'
        n.cols = cols
      } else {
        n.dir = 'column'
        n.kids = ls.map((l) => (l.items.length > 1 ? synthRow(l.items) : l.items[0]))
      }
    }

    if (n.dir === 'grid') {
      const l0 = ls[0].items
      const gx = []
      for (let i = 1; i < l0.length; i++) gx.push(l0[i]._r.x - (l0[i - 1]._r.x + l0[i - 1]._r.w))
      const gy = []
      for (let i = 1; i < ls.length; i++) gy.push(ls[i].y - (ls[i - 1].y + ls[i - 1].h))
      n.gap = Math.max(0, round(median(gx)))
      n.gapY = Math.max(0, round(gy.length ? median(gy) : n.gap))
      n.kids = ls.flatMap((l) => l.items)
      n.mt0 = round(ls[0].y - cb.y)
      for (const k of n.kids) k.self = 'stretch'
    } else if (n.dir === 'row') {
      const items = ls[0].items
      n.kids = items
      const gx = []
      for (let i = 1; i < items.length; i++) gx.push(items[i]._r.x - (items[i - 1]._r.x + items[i - 1]._r.w))
      const first = items[0]._r
      const last = items[items.length - 1]._r
      const left = first.x - cb.x
      const right = cb.x + cb.w - (last.x + last.w)
      const minGap = Math.max(0, round(Math.min(...gx)))
      const medGap = Math.max(0, round(median(gx)))
      const spread = Math.max(...gx) - Math.min(...gx)
      if (left < 6 && right < 6 && items.length > 1 && (spread > 24 || (items.length === 2 && gx[0] > 48))) n.jc = 'space-between'
      else if (Math.abs(left - right) < 8 && left > 12) n.jc = 'center'
      else if (right < 6 && left > 24) n.jc = 'end'
      n.gap = n.jc === 'space-between' ? Math.min(minGap, 40) : medGap
      const tops = items.map((k) => k._r.y)
      const mids = items.map((k) => k._r.y + k._r.h / 2)
      const bots = items.map((k) => k._r.y + k._r.h)
      const spreadOf = (a) => Math.max(...a) - Math.min(...a)
      const top = Math.min(...tops)
      if (spreadOf(mids) < 3 && spreadOf(tops) >= 3) n.al = 'center'
      else if (spreadOf(bots) < 3 && spreadOf(tops) >= 3) n.al = 'end'
      else n.al = 'start'
      if (n.al === 'start') for (const k of items) if (k._r.y - top > 1) k.mt = round(k._r.y - top)
      n.mt0 = round(top - cb.y)
      for (const k of items) {
        const frac = k._r.w / cb.w
        // A hair under the measured share, so subpixel rounding never pushes the last item to a new line.
        if (k.t === 'box' || (frac > 0.22 && (k.t === 'text' || k.t === 'heading') && k._block)) k.basis = Math.max(1, Math.floor(frac * 1000) / 10 - 0.3)
        if (k.t === 'box' && n.al !== 'start') k.self = undefined
      }
      // Rows that only hold short leaves (menus, chips) wrap instead of stacking on mobile.
      const vw = document.documentElement.clientWidth
      if (items.length > 2 && (left < -4 || right < -4 || n._r.x < -4 || n._r.x + n._r.w > vw + 4)) {
        // Marquees / logo strips overflow their box: keep one clipped line like the source.
        n.clip = 1
      } else if (!(items.every((k) => k.t === 'image' || k.t === 'icon') && medGap <= 8)) n.wrap = 1
      // Pictures butted against each other form one composite picture: it scales, never stacks.
      const composite = items.every((k) => k.t === 'image' || k.t === 'icon') && medGap <= 8
      if (!n.clip && !composite && items.some((k) => k.t === 'box' || (k.basis && k.basis >= 30) || (k.t === 'image' && k._r.w > 200))) n.stack = 1
    } else {
      n.kids.sort((a, b) => a._r.y - b._r.y)
      let prev = cb.y
      for (const k of n.kids) {
        const off = k._r.y - prev
        if (Math.abs(off) >= 1) k.mt = round(Math.max(-1200, off))
        prev = Math.max(prev, k._r.y + k._r.h)
        const l = k._r.x - cb.x
        const rr = cb.x + cb.w - (k._r.x + k._r.w)
        if (k._r.w >= cb.w - 3) k.self = 'stretch'
        else if (Math.abs(l - rr) <= 4) k.self = 'center'
        else if (l < rr) {
          k.self = 'start'
          if (l > 2) k.ml = round(l)
        } else {
          k.self = 'end'
          if (rr > 2) k.mr = round(rr)
        }
        if (k.self !== 'stretch' && (k.t === 'box' || ((k.t === 'text' || k.t === 'heading') && k._block))) k.maxW = Math.ceil(k._r.w) + (k.t === 'box' ? 0 : 2)
      }
      const extra = cb.y + cb.h - prev
      if (extra > 12 && !n._synth) n.minH = round(n._r.h)
    }
    for (const k of n.kids) {
      if (k.t === 'box') arrange(k)
      if (k._fixedW && !k.maxW && !k.basis) k.maxW = k._fixedW
    }
  }

  /* ---------- sections ---------- */
  /** Wrappers of a fixed header collapse to 0px; the bar inside still belongs to the page. */
  const holdsTopBar = (el) => [...el.querySelectorAll('header, nav, [role="banner"]')].slice(0, 6).some((h) => topBar(h, css(h)) && visible(h))
  function flowKids(el) {
    return [...el.children].filter((c) => {
      if (!visible(c)) return false
      const cs = css(c)
      if (cs.position === 'absolute' && !(c.tagName === 'HEADER' || c.querySelector('nav'))) return false
      const r = c.getBoundingClientRect()
      return r.height >= 2 || holdsTopBar(c)
    })
  }

  function split(el, depth) {
    const kids = flowKids(el)
    const r = el.getBoundingClientRect()
    const isCand = CANDIDATE.has(el.tagName) || el.getAttribute('role') === 'banner' || el.getAttribute('role') === 'contentinfo'
    if (depth > 0 && !kids.length) return [el]
    const wide = kids.filter((k) => k.getBoundingClientRect().width >= VW * 0.9)
    const ls = lines(kids.map((k) => ({ _r: box(k) })))
    const stacked = ls.every((l) => l.items.length === 1)
    if (depth > 0 && isCand && (r.height < VH * 2.2 || !stacked || wide.length < 2) && el.tagName !== 'MAIN') return [el]
    if (depth > 12) return [el]
    if (kids.length === 1) return split(kids[0], depth + 1)
    if (stacked && wide.length >= Math.max(1, kids.length - 1)) return kids.flatMap((k) => (k.getBoundingClientRect().width >= VW * 0.9 ? split(k, depth + 1) : [k]))
    return depth === 0 ? kids : [el]
  }

  function bgBehind(el) {
    for (let e = el; e; e = e.parentElement) {
      const c = color(css(e).backgroundColor)
      if (c && !c.startsWith('rgba')) return c
    }
    return '#ffffff'
  }

  function strip(n) {
    delete n._el
    delete n._cs
    delete n._pad
    delete n._bw
    delete n._block
    delete n._fixedW
    delete n._synth
    if (n._r) n.r = [round(n._r.x), round(n._r.y), round(n._r.w), round(n._r.h)]
    delete n._r
    if (n.st) for (const k of Object.keys(n.st)) if (n.st[k] === undefined || n.st[k] === null || n.st[k] === '') delete n.st[k]
    if (n.kids) n.kids.forEach(strip)
    return n
  }

  const sectionEls = split(document.body, 0)
    .filter((el) => el.getBoundingClientRect().height >= 4)
    .map((el, i) => ({ el, i, y: el.getBoundingClientRect().top }))
    .sort((a, b) => (Math.abs(a.y - b.y) < 2 ? a.i - b.i : a.y - b.y))
    .map((x) => x.el)
  const sections = []
  for (const el of sectionEls) {
    if (count > MAX_NODES) break
    const cs = css(el)
    // A section that is just a run of inline text (a big statement <h2>/<p>) stays one text leaf.
    const leafy = el.tagName === 'IMG' || el.tagName === 'PICTURE' || el.tagName === 'svg' || (inlineOnly(el, 0) && !!textOf(el))
    const root = leafy ? node(el) : container(el, cs, true)
    if (!root) continue
    let wrap = root
    if (root.t !== 'box') {
      const p = leafy && root.t !== 'image' && root.t !== 'icon' ? pad(cs) : [0, 0, 0, 0]
      if (root.st) delete root.st.pad
      wrap = Object.assign(mk('box', el, box(el), { kids: [root], st: p.some((v) => v > 0) ? { pad: p } : {} }), { _pad: p })
      root._r = contentBox(wrap)
    }
    let own = color(cs.backgroundColor)
    // A section narrower than the page (centered column, card, letter) keeps its width and position inside a
    // full-width band; the band takes the color of what surrounds it.
    const er = el.getBoundingClientRect()
    if (wrap.t === 'box' && er.width < VW - 8) {
      const band = mk('box', el, { x: 0, y: er.top + window.scrollY, w: VW, h: er.height }, { kids: [wrap], st: {} })
      band._pad = [0, 0, 0, 0]
      wrap = band
      own = null
    }
    arrange(wrap)
    const heading = el.querySelector('h1,h2,h3')
    const name = (heading && textOf(heading).split('\n')[0].slice(0, 48)) || (el.id ? '#' + el.id : el.tagName.toLowerCase())
    // A transparent header laid over the hero takes the hero's color once it sits above it.
    const overlay = !own && el.getBoundingClientRect().top + window.scrollY < 4
    sections.push({ tag: el.tagName.toLowerCase(), id: el.id || undefined, name, bg: own && !own.startsWith('rgba') ? own : bgBehind(el.parentElement || el), overlay: overlay || undefined, root: strip(wrap) })
  }
  sections.forEach((s, i) => {
    // Empty space between two sections (spacer elements, margins) is kept as the next section's top offset.
    const prev = sections[i - 1]
    if (prev && prev.root.r && s.root.r) {
      const gap = s.root.r[1] - (prev.root.r[1] + prev.root.r[3])
      if (gap > 2) s.root.mt = Math.min(round(gap), 600)
    }
    const next = sections[i + 1]
    if (s.overlay && next && next.root.r && next.root.r[1] < s.root.r[1] + s.root.r[3] - 4) s.bg = next.bg
    else delete s.overlay
  })

  /* ---------- design tokens ---------- */
  const tally = (map, k, w) => k && map.set(k, (map.get(k) || 0) + (w || 1))
  const fonts = new Map()
  const btnBg = new Map()
  const textColors = new Map()
  const walk = (n) => {
    if (n.st && n.st.f && n.tx) tally(fonts, n.st.f, n.tx.length)
    if (n.t === 'button' && n.st && n.st.bg && n.st.bg.startsWith('#')) tally(btnBg, n.st.bg)
    if (n.st && n.st.c && n.tx) tally(textColors, n.st.c, n.tx.length)
    if (n.kids) n.kids.forEach(walk)
  }
  sections.forEach((s) => walk(s.root))
  const top = (m, k) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k || 6).map((e) => e[0])
  const fontLinks = [...document.querySelectorAll('link[rel~="stylesheet"][href]')]
    .map((l) => absUrl(l.getAttribute('href')))
    .filter((h) => h && /^https:\/\/(fonts\.googleapis\.com|fonts\.bunny\.net|use\.typekit\.net)\//.test(h))
  const meta = (n) => {
    const m = document.querySelector('meta[name="' + n + '"],meta[property="' + n + '"]')
    return m ? (m.getAttribute('content') || '').slice(0, 300) : ''
  }
  const bodyCs = css(document.body)
  return {
    url: location.href,
    title: document.title.slice(0, 200),
    description: meta('description') || meta('og:description'),
    lang: document.documentElement.lang || '',
    viewport: { w: VW, h: VH },
    height: Math.round(document.documentElement.scrollHeight),
    fonts: top(fonts, 6),
    fontLinks,
    tokens: { text: color(bodyCs.color) || '#111111', bg: bgBehind(document.body), font: fontName(bodyCs.fontFamily), size: px(bodyCs.fontSize), brand: top(btnBg, 3)[0] || null, buttons: top(btnBg, 4), colors: top(textColors, 6) },
    sections,
    snaps,
    nodes: count,
    truncated: count > MAX_NODES,
  }
}
