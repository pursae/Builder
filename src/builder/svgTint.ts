import { useEffect, useMemo, useState } from 'react'
import type { ElStyle } from './types'

/**
 * SVG icon recoloring. The markup is rewritten (fill / stroke / stop-color …) and rendered back
 * through <img src="data:…">, so scripts in the file can never run and multi-path / two-tone icons
 * keep their shapes, holes (fill="none") and per-part colors.
 */

const PAINT_PROPS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'] as const
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'text', 'tspan', 'use'])
const DROP = new Set(['script', 'foreignobject', 'iframe', 'embed', 'object', 'audio', 'video', 'handler', 'listener'])
const MAX_BYTES = 400_000

export const isSvgSrc = (src?: string) => !!src && (/^data:image\/svg\+xml[;,]/i.test(src) || (!src.startsWith('data:') && /\.svg$/i.test(src.split(/[?#]/)[0])))

export const hasTint = (e?: ElStyle) => !!e && (!!e.iconColor || Object.values(e.iconColors ?? {}).some(Boolean))

/* ---------- Colors ---------- */
let ctx: CanvasRenderingContext2D | null | undefined
const normCache = new Map<string, { hex: string; a: number } | null>()

/** Any CSS color → lowercase #rrggbb (+ alpha); keywords, url(#…) paints and invalid values → null. */
export function normColor(raw: string): { hex: string; a: number } | null {
  const v = raw.trim().toLowerCase()
  if (!v || /^(none|transparent|inherit|initial|unset|currentcolor|context-fill|context-stroke)$/.test(v) || v.startsWith('url(') || v.startsWith('var(')) return null
  if (normCache.has(v)) return normCache.get(v)!
  let out: { hex: string; a: number } | null = null
  const short = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  if (/^#[0-9a-f]{6}$/.test(v)) out = { hex: v, a: 1 }
  else if (short) out = { hex: `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`, a: 1 }
  else {
    if (ctx === undefined) ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
    if (ctx) {
      ctx.fillStyle = '#010203'
      ctx.fillStyle = v
      const a = String(ctx.fillStyle)
      ctx.fillStyle = '#030201'
      ctx.fillStyle = v
      const b = String(ctx.fillStyle)
      if (a === b) {
        if (a.startsWith('#')) out = { hex: a, a: 1 }
        else {
          const m = a.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
          if (m) out = { hex: `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`, a: m[4] !== undefined ? Number(m[4]) : 1 }
        }
      }
    }
  }
  normCache.set(v, out)
  return out
}

const withAlpha = (hex: string, a: number) => (a < 1 && /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}` : hex)

/* ---------- Parsing + sanitizing ---------- */
function parse(markup: string): SVGSVGElement | null {
  if (typeof DOMParser === 'undefined' || markup.length > MAX_BYTES) return null
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null
  sanitize(root)
  return root as unknown as SVGSVGElement
}

const SAFE_HREF = /^(#|data:image\/(png|jpe?g|gif|webp|avif);)/i
const cleanCss = (css: string) => css.replace(/@import[^;]*;?/gi, '').replace(/url\(\s*(['"]?)(?!#)[^)]*\)/gi, 'none').replace(/expression\s*\(/gi, '(')

/** Strip anything active or external: scripts, foreignObject, on* handlers, non-local links. */
function sanitize(root: Element) {
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    if (DROP.has(el.localName.toLowerCase())) {
      el.remove()
      continue
    }
    for (const at of Array.from(el.attributes)) {
      const n = at.name.toLowerCase()
      if (n.startsWith('on') || /(java|vb)script:/i.test(at.value.replace(/[\s\u0000-\u001f]+/g, ''))) el.removeAttribute(at.name)
      else if ((n === 'href' || n === 'xlink:href' || n === 'src') && !SAFE_HREF.test(at.value.trim())) el.removeAttribute(at.name)
      else if (n === 'style') el.setAttribute('style', cleanCss(at.value))
      else if (/url\(/i.test(at.value) && !/^\s*url\(\s*['"]?#/i.test(at.value)) el.removeAttribute(at.name)
    }
    if (el.localName === 'style') el.textContent = cleanCss(el.textContent ?? '')
  }
}

/** Every paint value in the document (attributes, inline styles, <style> rules). */
function eachPaint(root: Element, fn: (value: string, prop: string) => string | null) {
  const decl = new RegExp(`(^|[;{\\s])(${PAINT_PROPS.join('|')})(\\s*:\\s*)([^;}!]+)`, 'gi')
  const inCss = (css: string) => css.replace(decl, (all, pre: string, prop: string, sep: string, val: string) => {
    const next = fn(val, prop.toLowerCase())
    return next === null ? all : `${pre}${prop}${sep}${next}`
  })
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const p of PAINT_PROPS) {
      const v = el.getAttribute(p)
      if (v === null) continue
      const next = fn(v, p)
      if (next !== null) el.setAttribute(p, next)
    }
    const st = el.getAttribute('style')
    if (st) el.setAttribute('style', inCss(st))
    if (el.localName === 'style' && el.textContent) el.textContent = inCss(el.textContent)
  }
}

/** Shapes painted with the default (black) fill: no fill anywhere up the tree. */
function usesDefaultFill(root: Element) {
  const hasFill = (el: Element) => el.hasAttribute('fill') || /(^|;)\s*fill\s*:/i.test(el.getAttribute('style') ?? '') || el.hasAttribute('class')
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (!SHAPES.has(el.localName) || el.closest('defs, clipPath, mask, symbol, pattern, marker')) continue
    let n: Element | null = el
    let found = false
    while (n) {
      if (hasFill(n)) {
        found = true
        break
      }
      n = n === root ? null : n.parentElement
    }
    if (!found) return true
  }
  return false
}

const currentOf = (root: Element) => normColor(root.getAttribute('color') ?? root.getAttribute('style')?.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1] ?? '#000000')

/** Distinct colors of an SVG, most used first (#rrggbb). */
export function svgPalette(markup: string): string[] {
  const root = parse(markup)
  if (!root) return []
  const count = new Map<string, number>()
  const add = (hex: string) => count.set(hex, (count.get(hex) ?? 0) + 1)
  const cur = currentOf(root)
  eachPaint(root, (v, prop) => {
    if (prop === 'color') return null
    const c = /^\s*currentcolor\s*$/i.test(v) ? cur : normColor(v)
    if (c && c.a > 0) add(c.hex)
    return null
  })
  if (!root.hasAttribute('fill') && usesDefaultFill(root)) add('#000000')
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex)
}

/** Recolored, sanitized SVG as a data URL; null when the markup can't be parsed. */
export function tintSvg(markup: string, all?: string, map?: Record<string, string>): string | null {
  const root = parse(markup)
  if (!root) return null
  const to = (hex: string) => map?.[hex] || all || null
  const cur = currentOf(root)
  const curTo = cur ? to(cur.hex) : null
  eachPaint(root, (v) => {
    if (/^\s*currentcolor\s*$/i.test(v)) return curTo && cur ? withAlpha(curTo, cur.a) : null
    const c = normColor(v)
    const next = c && to(c.hex)
    return c && next ? withAlpha(next, c.a) : null
  })
  if (!root.hasAttribute('fill') && usesDefaultFill(root)) {
    const black = to('#000000')
    if (black) root.setAttribute('fill', black)
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(root))}`
}

/* ---------- Pasted / uploaded SVG code ---------- */
export const MAX_SVG_CODE = 100_000
const SVG_NS = 'http://www.w3.org/2000/svg'
const DRAWN = 'path, rect, circle, ellipse, line, polygon, polyline, text, use, image'

export const svgSrc = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** Raw SVG code (full file, HTML snippet …) → sanitized standalone markup, or a user-facing error. */
export function cleanSvgCode(raw: string): { svg: string } | { error: string } {
  const text = raw
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
  if (!text) return { error: 'SVG kodu boş.' }
  if (text.length > MAX_SVG_CODE) return { error: `SVG çok büyük (${Math.ceil(text.length / 1024)} KB · en fazla 100 KB).` }
  const m = text.match(/<svg[\s>][\s\S]*<\/svg\s*>/i)
  if (!m) return { error: 'Geçerli bir SVG değil — kod <svg …> … </svg> biçiminde olmalı.' }
  const markup = m[0].replace(/^<svg\b([^>]*)>/i, (_, attrs: string) => {
    let a = attrs
    if (!/\sxmlns\s*=/i.test(a)) a = ` xmlns="${SVG_NS}"${a}`
    if (/\bxlink:/i.test(m[0]) && !/\sxmlns:xlink\s*=/i.test(a)) a = ` xmlns:xlink="http://www.w3.org/1999/xlink"${a}`
    return `<svg${a}>`
  })
  const root = parse(markup)
  if (!root) return { error: 'Geçerli bir SVG değil — kod okunamadı (kapanmamış etiket ya da hatalı karakter olabilir).' }
  for (const el of Array.from(root.querySelectorAll('*'))) if (el.namespaceURI !== SVG_NS || el.localName === 'metadata') el.remove()
  if (!root.querySelector(DRAWN)) return { error: 'SVG içinde çizilecek bir şekil yok.' }
  const svg = new XMLSerializer().serializeToString(root)
  return svg.length > MAX_SVG_CODE ? { error: 'SVG çok büyük (en fazla 100 KB).' } : { svg }
}

/** Indented markup for editing; long files are left as they are. */
export function prettySvg(svg: string) {
  if (svg.length > 6000 || /<(text|tspan|style)[\s>]/i.test(svg)) return svg
  let depth = 0
  return svg
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map((line) => {
      if (line.startsWith('</')) depth = Math.max(0, depth - 1)
      const out = '  '.repeat(depth) + line
      if (/^<[^/!?]/.test(line) && !line.endsWith('/>') && !line.includes('</')) depth++
      return out
    })
    .join('\n')
}

/* ---------- Loading ---------- */
const texts = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()

function decodeData(src: string): string | null {
  const i = src.indexOf(',')
  if (i < 0) return null
  const meta = src.slice(0, i)
  const body = src.slice(i + 1)
  try {
    if (/;base64$/i.test(meta)) return new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0)))
    return decodeURIComponent(body)
  } catch {
    return null
  }
}

function load(src: string): Promise<string | null> {
  let p = pending.get(src)
  if (!p) {
    p = fetch(src, { credentials: 'omit' })
      .then(async (r) => {
        if (!r.ok) return null
        const t = await r.text()
        return t.length <= MAX_BYTES && /<svg[\s>]/i.test(t) ? t : null
      })
      .catch(() => null)
      .then((t) => {
        texts.set(src, t)
        return t
      })
    pending.set(src, p)
  }
  return p
}

/** Raw SVG markup behind a src (data URL or .svg file); null for other images or while loading. */
export function useSvgMarkup(src?: string, enabled = true): string | null {
  const svg = enabled && isSvgSrc(src)
  const isData = svg && src!.startsWith('data:')
  const [, bump] = useState(0)
  useEffect(() => {
    if (!svg || isData || texts.has(src!)) return
    let live = true
    load(src!).then(() => live && bump((n) => n + 1))
    return () => {
      live = false
    }
  }, [src, svg, isData])
  if (!svg) return null
  if (isData) return decodeData(src!)
  return texts.get(src!) ?? null
}

/** The src to render: the recolored SVG when the element has an icon color, otherwise the original. */
export function useTintedSrc(src: string, e?: ElStyle): string {
  const tinted = hasTint(e)
  const markup = useSvgMarkup(src, tinted)
  const map = e?.iconColors
  const key = tinted ? `${e?.iconColor ?? ''}|${JSON.stringify(map ?? {})}` : ''
  return useMemo(() => (tinted && markup ? tintSvg(markup, e?.iconColor, map) ?? src : src), [markup, key, src]) // eslint-disable-line react-hooks/exhaustive-deps
}
