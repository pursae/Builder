import { useEffect, type CSSProperties } from 'react'
import type { DocState, ElStyle, FontPairId, Section, SiteSettings } from './types'

/* ---------- Catalog ---------- */
export type FontCat = 'sans' | 'serif' | 'display' | 'hand' | 'mono'

export interface FontDef {
  family: string
  cat: FontCat
  weights: number[]
  italics: number[]
  /** Google Fonts popularity rank (lower = more used). */
  pop: number
  /** Ships the latin-ext subset, so ş ğ ı İ ç ö ü render in the font itself. */
  tr: boolean
  /** System fonts: a CSS stack, nothing to download. */
  stack?: string
}

export const FONT_CATS: { id: FontCat; label: string }[] = [
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'hand', label: 'El yazısı' },
  { id: 'mono', label: 'Mono' },
]

const FALLBACK: Record<FontCat, string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: "Georgia, 'Times New Roman', serif",
  display: 'ui-sans-serif, system-ui, sans-serif',
  hand: 'cursive',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

// [family, category, weights (hundreds), italic weights, popularity rank, 0 = no latin-ext]
// Generated from fonts.google.com/metadata/fonts; every row was checked against the CSS2 API.
const CAT = { s: 'sans', r: 'serif', d: 'display', h: 'hand', m: 'mono' } as const
const ROWS: [string, keyof typeof CAT, string, string, number, 0?][] = [
  ['Open Sans', 's', '345678', '345678', 2],
  ['Roboto', 's', '123456789', '123456789', 2],
  ['Arimo', 's', '4567', '4567', 3],
  ['DM Sans', 's', '123456789', '123456789', 3],
  ['Google Sans', 's', '4567', '4567', 3],
  ['Montserrat', 's', '123456789', '123456789', 3],
  ['Inter', 's', '123456789', '123456789', 4],
  ['Nunito Sans', 's', '23456789', '23456789', 4],
  ['Lato', 's', '13479', '13479', 5],
  ['Nunito', 's', '23456789', '23456789', 5],
  ['Poppins', 's', '123456789', '123456789', 5],
  ['Roboto Mono', 'm', '1234567', '1234567', 5],
  ['Source Sans 3', 's', '23456789', '23456789', 5],
  ['Libre Franklin', 's', '123456789', '123456789', 6],
  ['Fjalla One', 's', '4', '', 7],
  ['Roboto Slab', 'r', '123456789', '', 7],
  ['Oswald', 's', '234567', '', 8],
  ['Outfit', 's', '123456789', '', 8],
  ['Playfair Display', 'r', '456789', '456789', 8],
  ['Sora', 's', '12345678', '', 8],
  ['Ubuntu', 's', '3457', '3457', 9],
  ['Rubik', 's', '3456789', '3456789', 10],
  ['Work Sans', 's', '123456789', '123456789', 10],
  ['JetBrains Mono', 'm', '12345678', '12345678', 11],
  ['Merriweather', 'r', '3456789', '3456789', 11],
  ['Saira', 's', '123456789', '123456789', 11],
  ['Bebas Neue', 's', '4', '', 12],
  ['Dosis', 's', '2345678', '', 12],
  ['Roboto Condensed', 's', '123456789', '123456789', 12],
  ['Space Grotesk', 's', '34567', '', 12],
  ['Bricolage Grotesque', 's', '2345678', '', 13],
  ['Cormorant Garamond', 'r', '34567', '34567', 13],
  ['Plus Jakarta Sans', 's', '2345678', '2345678', 14],
  ['Prompt', 's', '123456789', '123456789', 14],
  ['Slabo 27px', 'r', '4', '', 15],
  ['Black Ops One', 'd', '4', '', 16],
  ['Figtree', 's', '3456789', '3456789', 16],
  ['Geist Mono', 'm', '123456789', '123456789', 17],
  ['Lora', 'r', '4567', '4567', 17],
  ['Mukta', 's', '2345678', '', 17],
  ['Crimson Text', 'r', '467', '467', 18],
  ['EB Garamond', 'r', '45678', '45678', 18],
  ['Raleway', 's', '123456789', '123456789', 19],
  ['Bungee', 'd', '4', '', 20],
  ['Geist', 's', '123456789', '123456789', 20],
  ['Archivo', 's', '123456789', '123456789', 21],
  ['Libre Baskerville', 'r', '4567', '4567', 22],
  ['Manrope', 's', '2345678', '', 23],
  ['Quicksand', 's', '34567', '', 23],
  ['Alfa Slab One', 'd', '4', '', 24],
  ['IBM Plex Mono', 'm', '1234567', '1234567', 25],
  ['Bitter', 'r', '123456789', '123456789', 26],
  ['Fraunces', 'r', '123456789', '123456789', 26],
  ['Kanit', 's', '123456789', '123456789', 26],
  ['Syne', 's', '45678', '', 26],
  ['Caveat', 'h', '4567', '', 27],
  ['Instrument Serif', 'r', '4', '4', 27],
  ['Indie Flower', 'h', '4', '', 28],
  ['Lobster', 'd', '4', '', 28],
  ['Literata', 'r', '23456789', '23456789', 29],
  ['Source Code Pro', 'm', '23456789', '23456789', 29],
  ['Zeyada', 'h', '4', '', 29],
  ['Dancing Script', 'h', '4567', '', 30],
  ['Hind', 's', '34567', '', 30],
  ['Lilita One', 'd', '4', '', 30],
  ['Press Start 2P', 'd', '4', '', 30],
  ['Bodoni Moda', 'r', '456789', '456789', 31],
  ['Josefin Sans', 's', '1234567', '1234567', 31],
  ['Cardo', 'r', '47', '4', 32],
  ['Audiowide', 'd', '4', '', 33],
  ['PT Serif', 'r', '47', '47', 35],
  ['Cairo', 's', '23456789', '', 36],
  ['Shadows Into Light', 'h', '4', '', 36],
  ['Fira Code', 'm', '34567', '', 37],
  ['Inconsolata', 'm', '23456789', '', 37],
  ['Vollkorn', 'r', '456789', '456789', 37],
  ['Baloo 2', 'd', '45678', '', 39],
  ['Zilla Slab', 'r', '34567', '34567', 40],
  ['Playfair', 'r', '3456789', '3456789', 41],
  ['Cormorant', 'r', '34567', '34567', 42],
  ['DM Serif Display', 'r', '4', '4', 43],
  ['IBM Plex Serif', 'r', '1234567', '1234567', 43],
  ['Newsreader', 'r', '2345678', '2345678', 44],
  ['Playball', 'd', '4', '', 44],
  ['Cantata One', 'r', '4', '', 47],
  ['Lexend', 's', '123456789', '', 47],
  ['Righteous', 'd', '4', '', 47],
  ['Anton', 's', '4', '', 48],
  ['Damion', 'h', '4', '', 48],
  ['Faustina', 'r', '345678', '345678', 49],
  ['Parisienne', 'h', '4', '', 49],
  ['Pacifico', 'h', '4', '', 51],
  ['Anonymous Pro', 'm', '47', '47', 52],
  ['Grenze Gotisch', 'd', '123456789', '', 52],
  ['Luckiest Guy', 'd', '4', '', 54],
  ['Rajdhani', 's', '34567', '', 54],
  ['Caprasimo', 'd', '4', '', 55],
  ['Special Elite', 'd', '4', '', 55],
  ['Silkscreen', 'd', '47', '', 56],
  ['Libre Caslon Text', 'r', '47', '4', 59],
  ['Cinzel', 'r', '456789', '', 61],
  ['Google Sans Code', 'm', '345678', '345678', 61],
  ['Unbounded', 's', '23456789', '', 61],
  ['Bangers', 'd', '4', '', 62],
  ['Oxanium', 'd', '2345678', '', 64],
  ['Passion One', 'd', '479', '', 66],
  ['Teko', 's', '34567', '', 66],
  ['Exo 2', 's', '123456789', '123456789', 68],
  ['Gabarito', 'd', '456789', '', 73],
  ['Comfortaa', 'd', '34567', '', 76],
  ['Rammetto One', 'd', '4', '', 78],
  ['Forum', 'd', '4', '', 79],
  ['Chango', 'd', '4', '', 82],
  ['Croissant One', 'd', '4', '', 82],
  ['Space Mono', 'm', '47', '47', 84],
  ['Staatliches', 'd', '4', '', 86],
  ['Architects Daughter', 'h', '4', '', 88],
  ['Pangolin', 'h', '4', '', 89],
  ['Give You Glory', 'h', '4', '', 93],
  ['Onest', 's', '123456789', '', 93],
  ['Satisfy', 'h', '4', '', 97, 0],
  ['Great Vibes', 'h', '4', '', 98],
  ['Abril Fatface', 'd', '4', '', 99],
  ['Kalam', 'h', '347', '', 106],
  ['Kaushan Script', 'h', '4', '', 109],
  ['Permanent Marker', 'h', '4', '', 136, 0],
  ['Crimson Pro', 'r', '23456789', '23456789', 159],
]

const hundreds = (s: string) => s.split('').map((d) => Number(d) * 100)

export const GOOGLE_FONTS: FontDef[] = ROWS.map(([family, c, w, i, pop, tr]) => ({ family, cat: CAT[c], weights: hundreds(w), italics: hundreds(i), pop, tr: tr !== 0 }))

export const SYSTEM_FONTS: FontDef[] = (
  [
    ['System UI', 'sans', "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", '123456789'],
    ['Helvetica', 'sans', "'Helvetica Neue', Helvetica, Arial, sans-serif", '47'],
    ['Arial', 'sans', 'Arial, Helvetica, sans-serif', '47'],
    ['Verdana', 'sans', 'Verdana, Geneva, sans-serif', '47'],
    ['Trebuchet MS', 'sans', "'Trebuchet MS', sans-serif", '47'],
    ['Georgia', 'serif', 'Georgia, serif', '47'],
    ['Times New Roman', 'serif', "'Times New Roman', Times, serif", '47'],
    ['Courier New', 'mono', "'Courier New', monospace", '47'],
  ] as const
).map(([family, cat, stack, w]) => ({ family, cat, stack, weights: hundreds(w), italics: hundreds(w), pop: 0, tr: true }))

const BY_NAME = new Map([...GOOGLE_FONTS, ...SYSTEM_FONTS].map((f) => [f.family.toLowerCase(), f]))
const unquote = (s: string) => s.trim().replace(/^['"]|['"]$/g, '')

export const getFont = (name?: string) => (name ? BY_NAME.get(unquote(name).toLowerCase()) : undefined)

/** Loose lookup for typed / extracted names ("playfair-display", "PlayfairDisplay"). */
export function matchFont(name?: string) {
  if (!name) return undefined
  const exact = getFont(name)
  if (exact) return exact
  const k = unquote(name).toLowerCase().replace(/[\s_-]+/g, '')
  return [...BY_NAME.values()].find((f) => f.family.toLowerCase().replace(/\s+/g, '') === k)
}

export const WEIGHT_NAMES: Record<number, string> = { 100: 'İnce', 200: 'Çok hafif', 300: 'Hafif', 400: 'Normal', 500: 'Orta', 600: 'Yarı kalın', 700: 'Kalın', 800: 'Çok kalın', 900: 'Siyah' }

const ANY_WEIGHTS = [300, 400, 500, 600, 700, 800]
export const weightsOf = (name?: string) => getFont(name)?.weights ?? ANY_WEIGHTS
const snap = (list: number[], w: number) => list.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), list[0] ?? w)
/** Nearest weight the family really ships. */
export const fitWeight = (name: string | undefined, w: number) => snap(weightsOf(name), w)

/* ---------- Site fonts ---------- */
/** Element font values that follow the site settings instead of naming a family. */
export const SITE_HEADING = '@heading'
export const SITE_BODY = '@body'
export const DEFAULT_BODY = 'Inter'

/** Heading font of each font pair preset (mirrors FONT_PAIRS in data.ts). */
const PAIR_FONT: Record<FontPairId, { family: string; weight: number; italic: boolean }> = {
  elegant: { family: 'Instrument Serif', weight: 400, italic: true },
  modern: { family: 'Space Grotesk', weight: 600, italic: false },
  plain: { family: 'Inter', weight: 700, italic: false },
}

export function siteFonts(site: SiteSettings) {
  const pair = PAIR_FONT[site.fontPair] ?? PAIR_FONT.elegant
  const heading = site.headingFont || pair.family
  return {
    heading,
    headingWeight: site.headingWeight ?? pair.weight,
    /** The pair's italic accent line, when the heading font has real italics. */
    italicAccent: pair.italic && (getFont(heading)?.italics.length ?? 0) > 0,
    body: site.bodyFont || DEFAULT_BODY,
    bodyWeight: site.bodyWeight ?? 400,
  }
}

const clean = (s: string) => s.replace(/['"\\;{}<>]/g, '').trim()

/** CSS font-family for a library name, a site token or any other (extracted) family. */
export function fontStack(name?: string): string | undefined {
  if (!name) return undefined
  if (name === SITE_HEADING) return 'var(--f-head)'
  if (name === SITE_BODY) return 'var(--f-body)'
  const f = getFont(name)
  if (f) return f.stack ?? `'${f.family}', ${FALLBACK[f.cat]}`
  return `'${clean(name)}', Inter, sans-serif`
}

/** Family, case and slant of an element style (merged into elCss). */
export function typeCss(e: ElStyle): CSSProperties {
  return {
    fontFamily: fontStack(e.font),
    textTransform: e.transform,
    fontStyle: e.italic === true ? 'italic' : e.italic === false ? 'normal' : undefined,
  }
}

/** CSS variables the page root sets; sections read --f-head / --f-body. */
export function siteFontVars(site: SiteSettings): CSSProperties {
  const f = siteFonts(site)
  const head = fontStack(f.heading)
  return { '--f-head': head, '--f-display': head, '--f-body': fontStack(f.body), fontFamily: 'var(--f-body)', fontWeight: f.bodyWeight !== 400 ? f.bodyWeight : undefined } as CSSProperties
}

/* ---------- Presets (font pairs) ---------- */
export interface FontPreset {
  id: string
  name: string
  pair: FontPairId
  heading?: string
  weight?: number
  body?: string
}

export const FONT_PRESETS: FontPreset[] = [
  { id: 'elegant', name: 'Zarif', pair: 'elegant' },
  { id: 'modern', name: 'Modern', pair: 'modern' },
  { id: 'plain', name: 'Sade', pair: 'plain' },
  { id: 'editorial', name: 'Editoryal', pair: 'elegant', heading: 'Playfair Display', weight: 500, body: 'Source Sans 3' },
  { id: 'classic', name: 'Klasik', pair: 'elegant', heading: 'Cormorant Garamond', weight: 600, body: 'Montserrat' },
  { id: 'warm', name: 'Sıcak', pair: 'elegant', heading: 'Lora', weight: 600, body: 'Lato' },
  { id: 'literary', name: 'Edebi', pair: 'elegant', heading: 'Fraunces', weight: 500, body: 'Figtree' },
  { id: 'tech', name: 'Teknoloji', pair: 'modern', heading: 'Manrope', weight: 700, body: 'Inter' },
  { id: 'geometric', name: 'Geometrik', pair: 'modern', heading: 'Poppins', weight: 600, body: 'DM Sans' },
  { id: 'startup', name: 'Girişim', pair: 'modern', heading: 'Plus Jakarta Sans', weight: 700, body: 'Plus Jakarta Sans' },
  { id: 'friendly', name: 'Dostane', pair: 'modern', heading: 'Nunito', weight: 800, body: 'Nunito' },
  { id: 'bold', name: 'Güçlü', pair: 'plain', heading: 'Oswald', weight: 600, body: 'Roboto' },
]

export const presetPatch = (p: FontPreset): Partial<SiteSettings> => ({ fontPair: p.pair, headingFont: p.heading, headingWeight: p.weight, bodyFont: p.body, bodyWeight: undefined })

export const activePreset = (site: SiteSettings) =>
  FONT_PRESETS.find((p) => p.pair === site.fontPair && p.heading === (site.headingFont || undefined) && p.weight === site.headingWeight && p.body === (site.bodyFont || undefined) && !site.bodyWeight)

export const presetFonts = (p: FontPreset) => ({ heading: p.heading ?? PAIR_FONT[p.pair].family, weight: p.weight ?? PAIR_FONT[p.pair].weight, body: p.body ?? DEFAULT_BODY })

/* ---------- Loading (Google Fonts CSS2, on demand) ---------- */
const GF = 'https://fonts.googleapis.com/css2'
/** family → loaded 'ital,wght' variants; index.css already ships these for the editor chrome. */
const have = new Map<string, Set<string>>([
  ['Inter', new Set(['0,400', '0,500', '0,600', '0,700'])],
  ['Instrument Serif', new Set(['0,400', '1,400'])],
  ['Space Grotesk', new Set(['0,500', '0,600', '0,700'])],
  ['JetBrains Mono', new Set(['0,400', '0,500'])],
])
const previewed = new Set<string>()
const links = new Set<string>()
let warm = false

function addLink(href: string) {
  if (typeof document === 'undefined' || links.has(href)) return
  links.add(href)
  if (!warm) {
    warm = true
    for (const [url, cross] of [['https://fonts.googleapis.com', false], ['https://fonts.gstatic.com', true]] as const) {
      const p = document.createElement('link')
      p.rel = 'preconnect'
      p.href = url
      if (cross) p.crossOrigin = ''
      document.head.appendChild(p)
    }
  }
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = href
  l.dataset.font = ''
  document.head.appendChild(l)
}

const famParam = (f: string) => encodeURIComponent(f).replace(/%20/g, '+')
const byTuple = (a: string, b: string) => {
  const [ai, aw] = a.split(',').map(Number)
  const [bi, bw] = b.split(',').map(Number)
  return ai - bi || aw - bw
}

/** CSS2 url for 'ital,wght' variants (the API rejects unsorted tuples and unknown weights). */
export function fontCssUrl(family: string, variants: string[]) {
  const v = [...new Set(variants)].sort(byTuple)
  const axis = v.some((x) => x.startsWith('1,')) ? `ital,wght@${v.join(';')}` : `wght@${v.map((x) => x.split(',')[1]).join(';')}`
  return `${GF}?family=${famParam(family)}:${axis}&display=swap`
}

/** Stylesheet url for a library font (weights snapped to the family); undefined for other names. */
export function fontUrlFor(name: string, weights: number[], italics: number[] = []) {
  const f = matchFont(name)
  return f && !f.stack ? fontCssUrl(f.family, variants(f, weights, italics)) : undefined
}

/** Variants of a library font for the given weights, snapped to what the family really has. */
function variants(f: FontDef, weights: number[], italics: number[]) {
  return [...weights.map((w) => `0,${snap(f.weights, w)}`), ...(f.italics.length ? italics.map((w) => `1,${snap(f.italics, w)}`) : [])]
}

/** Loads the missing weights of a library font (one stylesheet per batch, deduped). */
export function loadFont(name: string, weights: number[] = [400], italics: number[] = []) {
  const f = getFont(name)
  if (!f || f.stack) return
  const got = have.get(f.family) ?? new Set<string>()
  const missing = [...new Set(variants(f, weights, italics))].filter((v) => !got.has(v))
  if (!missing.length) return
  for (const v of missing) got.add(v)
  have.set(f.family, got)
  addLink(fontCssUrl(f.family, missing))
}

export const SAMPLE = 'Işığı güçlü, şık ve özgün'
const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPQRSŞTUÜVWXYZabcçdefgğhıijklmnoöpqrsştuüvwxyz0123456789·.,:() '

/**
 * Tiny glyph subset (text=) so picker rows can render in their own font. Skipped once the real font
 * is loaded: a later subset face would otherwise shadow the full one for the same weight.
 */
export function previewFont(name: string, weight = 400) {
  const f = getFont(name)
  if (!f || f.stack || have.has(f.family) || previewed.has(f.family)) return
  previewed.add(f.family)
  const chars = [...new Set(`${f.family}${ALPHABET}`)].join('')
  addLink(`${GF}?family=${famParam(f.family)}:wght@${snap(f.weights, weight)}&text=${encodeURIComponent(chars)}&display=swap`)
}

/** Every library font (and weight) the page uses: site fonts plus per-element overrides. */
export function docFontNeeds(doc: DocState) {
  const site = siteFonts(doc.site)
  const need = new Map<string, { w: Set<number>; i: Set<number> }>()
  const add = (name: string | undefined, w: number[], i: number[] = []) => {
    const fam = name === SITE_HEADING ? site.heading : name === SITE_BODY ? site.body : name
    const f = getFont(fam)
    if (!f || f.stack) return
    const e = need.get(f.family) ?? { w: new Set([400]), i: new Set<number>() }
    for (const x of w) e.w.add(x)
    for (const x of i) e.i.add(x)
    need.set(f.family, e)
  }
  add(site.heading, [site.headingWeight], site.italicAccent ? [site.headingWeight] : [])
  add(site.body, [400, 500, 600, 700, site.bodyWeight], [400])
  const walk = (list: Section[]) => {
    for (const s of list) {
      if (s.style.titleWeight) add(site.heading, [s.style.titleWeight])
      for (const es of Object.values(s.els ?? {})) {
        if (es.font) {
          const w = es.fontWeight ? [es.fontWeight] : [400, 600, 700]
          add(es.font, w, es.italic ? w : [])
        } else if (es.fontWeight) {
          add(site.body, [es.fontWeight])
          add(site.heading, [es.fontWeight])
        }
      }
      for (const it of s.items) if (it.sub) walk([it.sub])
    }
  }
  walk(doc.sections)
  return need
}

/** Stylesheet links a standalone copy of the page needs (export / publish). */
export const docFontLinks = (doc: DocState) =>
  [...docFontNeeds(doc)].map(([fam, n]) => {
    const f = getFont(fam)!
    return fontCssUrl(f.family, variants(f, [...n.w], [...n.i]))
  })

/** Keeps the fonts the page uses loaded in the editor (canvas and preview share the document). */
export function useDocFonts(doc: DocState) {
  useEffect(() => {
    for (const [fam, n] of docFontNeeds(doc)) loadFont(fam, [...n.w], [...n.i])
  }, [doc])
}

/* ---------- AI tool inputs ---------- */
/** Font argument → family, site token, or undefined ("" / inherit = follow the site fonts). */
export function parseFontArg(v: unknown): { value: string | undefined } | { error: string } {
  if (typeof v !== 'string') return { error: 'font bir aile adı olmalı.' }
  const t = v.trim()
  if (!t || /^(inherit|site|default|varsayılan)$/i.test(t)) return { value: undefined }
  if (/^@?(heading|başlık)$/i.test(t)) return { value: SITE_HEADING }
  if (/^@?(body|gövde)$/i.test(t)) return { value: SITE_BODY }
  const f = matchFont(t)
  if (f) return { value: f.family }
  const k = t.toLowerCase().slice(0, 4)
  const near = GOOGLE_FONTS.filter((x) => x.family.toLowerCase().includes(k)).slice(0, 5).map((x) => x.family)
  return { error: `"${t}" font kütüphanesinde yok.${near.length ? ` Yakın adlar: ${near.join(', ')}.` : ''} Kütüphanedeki bir aile adını kullan.` }
}

/** set_site font fields (fontPreset, headingFont/bodyFont, weights) → site patch; weights snap to the family. */
export function aiSiteFonts(a: Record<string, unknown>, site: SiteSettings): { patch: Partial<SiteSettings>; parts: string[] } | { error: string } {
  const patch: Partial<SiteSettings> = {}
  const parts: string[] = []
  if (typeof a.fontPreset === 'string' && a.fontPreset) {
    const p = FONT_PRESETS.find((x) => x.id === a.fontPreset)
    if (!p) return { error: `fontPreset: ${FONT_PRESETS.map((x) => x.id).join(', ')}` }
    Object.assign(patch, presetPatch(p))
    parts.push(`font eşleşmesi ${p.name}`)
  }
  for (const k of ['headingFont', 'bodyFont'] as const) {
    if (!(k in a) || a[k] === null || a[k] === undefined) continue
    const r = parseFontArg(a[k])
    if ('error' in r) return r
    if (r.value?.startsWith('@')) return { error: `${k} bir aile adı olmalı.` }
    patch[k] = r.value
    parts.push(`${k === 'headingFont' ? 'başlık' : 'gövde'} fontu ${r.value ?? 'varsayılan'}`)
  }
  const next = siteFonts({ ...site, ...patch })
  for (const [k, fam] of [['headingWeight', next.heading], ['bodyWeight', next.body]] as const) {
    const w = Number(a[k])
    if (a[k] !== undefined && a[k] !== null && Number.isFinite(w)) patch[k] = fitWeight(fam, w)
    else if ((k === 'headingWeight' ? 'headingFont' : 'bodyFont') in patch && !weightsOf(fam).includes(k === 'headingWeight' ? next.headingWeight : next.bodyWeight)) patch[k] = fitWeight(fam, k === 'headingWeight' ? next.headingWeight : next.bodyWeight)
  }
  return { patch, parts }
}

/** Compact font list for the AI prompt (Turkish-ready families first, per category). */
export function fontDigest(per = 12) {
  return FONT_CATS.map((c) => `${c.label}: ${GOOGLE_FONTS.filter((f) => f.cat === c.id && f.tr).slice(0, per).map((f) => f.family).join(', ')}`).join('; ')
}

/* ---------- Recently used ---------- */
const RECENT_KEY = 'pursae-builder:recent-fonts'

export function recentFonts(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!getFont(x)).slice(0, 6) : []
  } catch {
    return []
  }
}

export function pushRecent(name: string) {
  if (!getFont(name)) return
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([name, ...recentFonts().filter((x) => x !== name)].slice(0, 6)))
  } catch {
    /* storage full / blocked */
  }
}
