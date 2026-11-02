import { createSection, uid } from '../data'
import { isRich, toStored } from '../rich'
import { fontUrlFor, matchFont } from '../fonts'
import type { Box4, DocState, ElStyle, Item, NodeLayout, NodeType, PageSettings, Section, SiteSettings } from '../types'
import type { Step } from './agent'
import type { ToolCall, ToolCtx, ToolDef, ToolPlan } from './tools'

/* ---------- Server payload (see vite-plugin-clone-site.ts / .extract.js) ---------- */
export interface CloneStyle {
  c?: string
  bg?: string
  bgi?: string
  bgs?: string
  bgp?: string
  bd?: string
  rad?: number
  sh?: string
  pad?: number[]
  f?: string
  fs?: number
  fw?: number
  lh?: number
  ls?: number
  ta?: 'left' | 'center' | 'right'
  tf?: string
  it?: number
  ul?: number
  op?: number
  list?: string
  fit?: 'cover' | 'contain'
  h?: number
}

export interface CloneNode {
  t: NodeType
  r?: number[]
  tx?: string
  /** Same text with inline links / bold / italics in the editor's rich-text subset. */
  html?: string
  tag?: string
  href?: string
  src?: string
  alt?: string
  ph?: string
  dir?: 'row' | 'column' | 'grid'
  cols?: number
  gap?: number
  gapY?: number
  al?: 'start' | 'center' | 'end'
  jc?: 'center' | 'end' | 'space-between'
  wrap?: number
  stack?: number
  clip?: number
  menu?: number
  kids?: CloneNode[]
  mt?: number
  mt0?: number
  ml?: number
  mr?: number
  self?: 'start' | 'center' | 'end' | 'stretch'
  basis?: number
  maxW?: number
  minH?: number
  ratio?: number
  st?: CloneStyle
}

export interface CloneSectionData {
  tag: string
  id?: string
  name: string
  bg: string
  overlay?: boolean
  root: CloneNode
}

export interface CloneData {
  url: string
  title: string
  description: string
  lang: string
  viewport: { w: number; h: number }
  height: number
  fonts: string[]
  fontLinks: string[]
  tokens: { text: string; bg: string; font: string; size: number; brand: string | null; buttons: string[]; colors: string[] }
  sections: CloneSectionData[]
  nodes: number
  truncated: boolean
  static?: boolean
}

export interface CloneResult {
  data: CloneData
  shots: Record<string, { file: string; w: number; h: number }>
  images: { ok: number; failed: number }
  engine: 'chrome' | 'static'
  blocked?: number
  folder: string
  error?: string
}

export const canClone = import.meta.env.DEV
export const CLONE_DEV_ONLY = 'Site klonlama yalnızca geliştirme sunucusunda (npm run dev) çalışır.'
const ENDPOINT = `${import.meta.env.BASE_URL}api/clone-site`

/* ---------- Request detection ---------- */
const URL_RE = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s"'<>]*)?)/i
const INTENT = /aynısı|aynisi|aynı(sını)?|klon|kopya|kopyala|birebir|bire bir|1[:e]1|benzerini|taklidi|clone|copy|replicate|same as|gibi (bir )?site|gibi yap/i

/** URL in a "make me the same as this site" request, or null. */
export function cloneRequest(text: string): string | null {
  const m = text.match(URL_RE)
  if (!m || !INTENT.test(text.replace(m[0], ' '))) return null
  const raw = m[1].replace(/[.,;:!?)]+$/, '')
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

/** images=false only inspects: nothing is downloaded into the project. */
export async function fetchClone(url: string, signal?: AbortSignal, images = true): Promise<CloneResult | { error: string }> {
  if (!canClone) return { error: CLONE_DEV_ONLY }
  try {
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, images }), signal })
    const text = await r.text()
    try {
      const v = JSON.parse(text)
      return v?.data ? (v as CloneResult) : { error: v?.error ?? `Klon servisi yanıt vermedi (HTTP ${r.status}).` }
    } catch {
      return { error: `Klon servisi yanıt vermedi (HTTP ${r.status}).` }
    }
  } catch (e) {
    return { error: `Klon servisine ulaşılamadı: ${(e as Error).message}` }
  }
}

export interface CloneJob {
  url: string
  done: boolean
  value: CloneResult | { error: string }
}

export function startCloneJob(url: string, images = true): CloneJob {
  const job: CloneJob = { url, done: false, value: { error: 'Henüz bitmedi.' } }
  void fetchClone(url, undefined, images).then((v) => Object.assign(job, { done: true, value: v }))
  return job
}

/* ---------- Data → editor sections ---------- */
const box4 = (p?: number[]): Box4 | undefined => (p && p.some((v) => v) ? { t: p[0] ?? 0, r: p[1] ?? 0, b: p[2] ?? 0, l: p[3] ?? 0 } : undefined)
const TRANSFORMS = new Set(['uppercase', 'lowercase', 'capitalize'])

function styleOf(n: CloneNode): ElStyle {
  const st = n.st ?? {}
  const e: ElStyle = {}
  if (st.c) e.color = st.c
  if (st.bg) e.bg = st.bg
  if (st.bgi) {
    e.bgImage = st.bgi
    if (st.bgs) e.bgSize = st.bgs
    if (st.bgp) e.bgPos = st.bgp
  }
  if (st.bd) e.border = st.bd
  if (st.rad) e.radius = st.rad
  if (st.sh) e.shadow = st.sh
  const pad = box4(st.pad)
  if (pad) e.padding = pad
  if (st.f) e.font = matchFont(st.f)?.family ?? st.f
  if (st.fs) e.fontSize = st.fs
  if (st.fw && n.t !== 'box') e.fontWeight = st.fw
  if (st.lh) e.lineHeight = st.lh
  if (st.ls) e.letterSpacing = st.ls
  if (st.ta) e.align = st.ta
  if (st.tf && TRANSFORMS.has(st.tf)) e.transform = st.tf as ElStyle['transform']
  if (st.it) e.italic = true
  if (st.ul) e.underline = true
  if (st.op !== undefined) e.opacity = st.op
  if (st.list) e.list = st.list
  if (st.fit) e.fit = st.fit
  // Boxes only pass color / font down to children.
  if (n.t === 'box') {
    delete e.fontSize
    delete e.lineHeight
    delete e.letterSpacing
    delete e.align
  }
  // Placement inside the parent.
  if (n.mt) e.mt = n.mt
  if (n.ml || n.mr) e.margin = { t: n.mt ?? 0, r: n.mr ?? 0, b: 0, l: n.ml ?? 0 }
  if (n.maxW && n.self !== 'stretch') e.maxWidth = n.maxW
  if (n.minH) e.height = n.minH
  const w = n.r?.[2]
  const h = n.r?.[3]
  if ((n.t === 'image' || n.t === 'icon') && w) e.width = Math.round(w)
  if (n.t === 'input' && w && h) {
    e.width = Math.round(w)
    e.height = Math.round(h)
  }
  if (n.t === 'divider') e.height = st.h ?? 1
  return e
}

interface Built {
  items: Item[]
  els: Record<string, ElStyle>
}

function addNode(n: CloneNode, parent: string | undefined, out: Built, parentDir?: string) {
  const id = uid('n')
  const lay: NodeLayout = {}
  if (n.t === 'box') {
    lay.dir = n.dir ?? 'column'
    if (n.cols) lay.cols = n.cols
    if (n.gap) lay.gap = n.gap
    if (n.gapY) lay.gapY = n.gapY
    if (n.al) lay.align = n.al
    if (n.jc) lay.justify = n.jc
    if (n.wrap) lay.wrap = true
    if (n.stack) lay.stack = true
    if (n.clip) lay.clip = true
    if (n.menu) lay.menu = true
  }
  if (n.self && parentDir === 'column') lay.self = n.self
  if (n.basis && parentDir === 'row') lay.basis = n.basis
  if (n.ratio) lay.ratio = n.ratio
  const rich = (n.t === 'text' || n.t === 'heading') && n.html ? toStored(n.html) : ''
  const title = n.t === 'image' || n.t === 'icon' ? n.src ?? '' : n.t === 'input' ? n.ph ?? '' : rich || (n.tx ?? '')
  const item: Item = { id, title, text: n.t === 'image' ? n.alt ?? '' : '', node: n.t, ...(parent ? { parent } : {}), ...(n.tag ? { tag: n.tag } : {}), ...(n.href ? { href: n.href } : {}), ...(Object.keys(lay).length ? { lay } : {}) }
  out.items.push(item)
  const es = styleOf(n)
  // Grid / row offsets of the first line become the box's own top spacing.
  if (n.t === 'box' && n.mt0 && n.mt0 > 0 && n.dir !== 'column') es.padding = { ...(es.padding ?? { t: 0, r: 0, b: 0, l: 0 }), t: (es.padding?.t ?? 0) + n.mt0 }
  if (Object.keys(es).length) out.els[`items.${id}.title`] = es
  for (const k of n.kids ?? []) addNode(k, id, out, n.t === 'box' ? n.dir ?? 'column' : undefined)
  return id
}

const SYSTEM_FONTS = /^(inter|arial|helvetica|helvetica neue|times|times new roman|georgia|verdana|tahoma|system-ui|-apple-system|blinkmacsystemfont|segoe ui|sans-serif|serif|monospace|roboto mono|courier new)$/i

function fontUrls(d: CloneData) {
  const own = d.fontLinks.filter((u) => /^https:\/\/(fonts\.googleapis\.com|fonts\.bunny\.net)\//.test(u))
  const fams = [...new Set([...d.fonts, d.tokens.font].filter((f) => f && !SYSTEM_FONTS.test(f)))]
  const gen = fams.map((f) => fontUrlFor(f, [300, 400, 500, 600, 700, 800], [400]) ?? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap`)
  return [...new Set([...own, ...gen])].slice(0, 6)
}

const luminance = (hex: string) => {
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  if (!m) return 1
  const n = parseInt(m[1], 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

const TAG_NAMES: Record<string, string> = { header: 'Üst menü', nav: 'Menü', footer: 'Alt bilgi' }

function firstText(n: CloneNode): string | undefined {
  if ((n.t === 'heading' || n.t === 'text') && n.tx?.trim()) return n.tx.trim().slice(0, 48)
  for (const k of n.kids ?? []) {
    const t = firstText(k)
    if (t) return t
  }
}

/** Header link rows collapse into a hamburger on small screens, like the source's mobile menu. */
function markMenus(n: CloneNode): boolean {
  const kids = n.kids ?? []
  const navItem = (k: CloneNode) => k.t === 'link' || (k.t === 'text' && (k.tx ?? '').length < 32 && !(k.tx ?? '').includes('\n'))
  if (n.t === 'box' && n.dir === 'row' && kids.length >= 3 && kids.every(navItem) && kids.filter((k) => k.t === 'link').length >= kids.length / 2) {
    n.menu = 1
    return true
  }
  let found = false
  for (const k of kids) if (markMenus(k)) found = true
  // Every row around the menu keeps logo + hamburger + actions side by side.
  if (found && n.dir === 'row') {
    delete n.stack
    delete n.wrap
    // Header groups size to their content so the bar still fits once the links collapse.
    for (const k of kids) delete k.basis
  }
  return found
}

export function buildClone(r: CloneResult): { sections: Section[]; site: Partial<SiteSettings>; page: Partial<PageSettings>; host: string } {
  const d = r.data
  const fonts = fontUrls(d).join('\n')
  const host = (() => {
    try {
      return new URL(d.url).hostname.replace(/^www\./, '')
    } catch {
      return d.url
    }
  })()
  const sections = d.sections.map((cs, i) => {
    const s = createSection('custom')
    const out: Built = { items: [], els: {} }
    if (cs.tag === 'header' || cs.tag === 'nav' || i === 0) markMenus(cs.root)
    addNode(cs.root, undefined, out, 'column')
    const bg = /^#[0-9a-f]{6}$/i.test(cs.bg) ? cs.bg : '#ffffff'
    const label = !cs.name || cs.name.startsWith('#') ? firstText(cs.root) || '' : cs.name
    s.name = `${TAG_NAMES[cs.tag] ?? (i === 1 && d.sections[0]?.tag === 'header' ? 'Karşılama' : label || `Bölüm ${i + 1}`)}`.slice(0, 60)
    s.items = out.items
    s.els = out.els
    s.content = { fonts, font: d.tokens.font || '', source: d.url }
    s.style = { ...s.style, palette: luminance(bg) < 0.45 ? 'dark' : 'light', bg, padding: 0 }
    return s
  })
  const brand = d.tokens.brand && /^#[0-9a-f]{6}$/i.test(d.tokens.brand) ? d.tokens.brand : undefined
  return {
    sections,
    site: brand ? { brand } : {},
    page: { title: d.title.slice(0, 60), description: d.description.slice(0, 160), slug: host.split('.')[0].replace(/[^a-z0-9-]/g, '') || 'klon' },
    host,
  }
}

/* ---------- Steps ---------- */
const countNodes = (n: CloneNode): number => 1 + (n.kids ?? []).reduce((a, k) => a + countNodes(k), 0)

/** Plays the clone onto the page: clears it (undoable), then builds section by section. */
export function cloneSteps(r: CloneResult, doc: DocState, opts: { replace: boolean; say: boolean }): { steps: Step[]; built: ReturnType<typeof buildClone> } {
  const built = buildClone(r)
  const { sections, site, page, host } = built
  const steps: Step[] = []
  const d = r.data
  const nodes = d.sections.reduce((a, s) => a + countNodes(s.root), 0)
  if (opts.say)
    steps.push({
      kind: 'say',
      text: `${host} adresini ${r.engine === 'chrome' ? 'gerçek bir tarayıcıda açıp hesaplanmış stillerini ve yerleşimini' : 'statik HTML olarak'} inceledim: ${d.sections.length} bölüm, ${nodes} öğe, ${r.images.ok} görsel indirildi${r.images.failed ? ` (${r.images.failed} görsel indirilemedi)` : ''}. Yazı tipleri: ${d.fonts.slice(0, 3).join(', ') || d.tokens.font || '—'}${d.tokens.brand ? `, ana renk ${d.tokens.brand}` : ''}.\n${r.error ? `${r.error}\n` : ''}Şimdi sayfayı düzenlenebilir öğelerle birebir kuruyorum.\n`,
    })
  const firstId = sections[0]?.id
  steps.push({
    kind: 'do',
    label: opts.replace ? 'Sayfa klon için temizlendi' : 'Klon için yer açıldı',
    target: undefined,
    run: (api) => {
      if (opts.replace) api.dispatch({ type: 'replace', doc: { ...api.doc, sections: [], site: { ...api.doc.site, ...site } }, label: `${host} klonu: sayfa temizlendi` })
      else if (site.brand) api.dispatch({ type: 'site', patch: site })
    },
  })
  // The main headline is typed live; everything else lands with its section.
  let typed: { s: Section; el: string; text: string } | null = null
  for (const s of sections.slice(0, 3)) {
    const h = s.items.find((i) => i.node === 'heading' && (i.tag === 'h1' || i.tag === 'h2'))
    if (h && h.title.length < 160 && !isRich(h.title)) {
      typed = { s, el: `items.${h.id}.title`, text: h.title }
      h.title = ''
      break
    }
  }
  const base = opts.replace ? 0 : undefined
  sections.forEach((s, i) => {
    steps.push({
      kind: 'do',
      label: `${s.name} kuruldu`,
      target: { sectionId: s.id },
      run: (api) => {
        const index = base !== undefined ? base + i : api.doc.sections.length
        api.dispatch({ type: 'insert', section: s, index })
      },
    })
    if (typed && typed.s === s) steps.push({ kind: 'type', target: { sectionId: s.id, el: typed.el }, text: typed.text, label: 'Ana başlık yazıldı' })
  })
  steps.push({ kind: 'do', label: 'Sayfa başlığı ve açıklaması aktarıldı', target: firstId ? { sectionId: firstId } : undefined, run: (api) => api.setPage({ ...api.page, ...page, slug: api.page.slug === 'anasayfa' || !api.page.slug ? page.slug ?? api.page.slug : api.page.slug }) })
  if (opts.say)
    steps.push({
      kind: 'say',
      text: `\nHazır! ${host} sayfasının ${sections.length} bölümünü aynı sırayla, aynı metin, görsel, renk, yazı tipi, boşluk ve sütun düzeniyle kurdum. Her başlık, metin, buton ve görsel tek tek seçilip düzenlenebilir; kutular Studio’da “Kutu” olarak görünür. Görseller ${r.folder} klasöründe.${d.truncated ? ' Sayfa çok büyük olduğu için en alttaki bazı öğeler alınmadı.' : ''} Beğenmezsen “Geri al” ile eski sayfana dönebilirsin.`,
    })
  return { steps, built }
}

/** Compact, model-friendly view of the extraction (for the LLM tool result). */
export function cloneOutline(r: CloneResult, sections?: Section[]) {
  const leaf = (n: CloneNode, acc: string[]) => {
    if (acc.length > 24) return
    if (n.t === 'heading' || n.t === 'button' || n.t === 'link') acc.push(`${n.t}:${(n.tx ?? '').slice(0, 60)}`)
    else if (n.t === 'image') acc.push('image')
    else if (n.t === 'text' && acc.filter((x) => x.startsWith('text')).length < 3) acc.push(`text:${(n.tx ?? '').slice(0, 50)}`)
    n.kids?.forEach((k) => leaf(k, acc))
  }
  return {
    url: r.data.url,
    title: r.data.title,
    engine: r.engine,
    tokens: r.data.tokens,
    fonts: r.data.fonts,
    images: r.images,
    screenshots: Object.fromEntries(Object.entries(r.shots).map(([k, v]) => [k, v.file])),
    sections: r.data.sections.map((s, i) => {
      const acc: string[] = []
      leaf(s.root, acc)
      return { ...(sections?.[i] ? { section_id: sections[i].id, name: sections[i].name } : { name: s.name }), bg: s.bg, layout: s.root.kids?.map((k) => (k.t === 'box' ? `${k.dir}${k.cols ? `×${k.cols}` : ''}` : k.t)).join(', '), content: acc }
    }),
  }
}

/* ---------- AI tools ---------- */
export const CLONE_TOOLS: ToolDef[] = [
  {
    name: 'clone_site',
    description:
      'Bir web sitesini (URL) gerçek tarayıcıda açar; bölümlerini, metinlerini, görsellerini (projeye indirir), renklerini, yazı tiplerini, boşluklarını ve sütun düzenini çıkarır ve sayfayı editörün düzenlenebilir “Serbest bölüm” öğeleriyle 1:1 KURAR. Kullanıcı “şu sitenin aynısını/klonunu yap” dediğinde TEK çağrıyla bunu kullan; bölümleri elle add_section ile yeniden kurmaya çalışma. mode=replace (varsayılan) sayfayı klonla değiştirir, append sona ekler. Dönen sonuçta yeni bölüm id’leri ve kaynak özeti olur; sonra gerekirse set_text/style_element ile ince ayar yap. Yalnızca geliştirme sunucusunda çalışır.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Klonlanacak sayfanın tam adresi (https://…)' },
        mode: { type: 'string', enum: ['replace', 'append'], description: 'replace: sayfayı değiştir (varsayılan), append: sona ekle' },
      },
      required: ['url'],
    },
  },
  {
    name: 'inspect_site',
    description: 'Bir web sitesini sayfayı DEĞİŞTİRMEDEN inceler: bölüm listesi, başlıklar, butonlar, renk/yazı tipi tokenları ve ekran görüntüsü yolları. Analiz ya da “şu siteye benzer ama…” istekleri için kullan.',
    parameters: { type: 'object', properties: { url: { type: 'string', description: 'İncelenecek sayfanın adresi' } }, required: ['url'] },
  },
]

export const isCloneTool = (name: string) => name === 'clone_site' || name === 'inspect_site'

/** Waits (non-blocking) until the job finishes, then yields the steps built from its result. */
function lazySteps(job: CloneJob, build: () => Step[], maxMs = 120_000): Step[] {
  const steps: Step[] = []
  steps[Symbol.iterator] = function* (): Generator<Step, undefined> {
    for (let t = 0; t < maxMs && !job.done; t += 250) yield { kind: 'wait', ms: 250 }
    yield* build()
    return undefined
  } as () => ArrayIterator<Step>
  return steps
}

export function planCloneTool(call: ToolCall, ctx: ToolCtx): ToolPlan | null {
  if (!isCloneTool(call.name)) return null
  const raw = typeof call.input?.url === 'string' ? call.input.url.trim() : ''
  if (!raw) return { error: 'url gerekli.' }
  if (!canClone) return { error: CLONE_DEV_ONLY }
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const job = startCloneJob(url, call.name !== 'inspect_site')
  let built: ReturnType<typeof buildClone> | null = null
  const replace = call.input?.mode !== 'append'
  const steps = lazySteps(job, () => {
    if (call.name === 'inspect_site' || 'error' in job.value) return []
    const plan = cloneSteps(job.value, ctx.doc, { replace, say: false })
    built = plan.built
    return plan.steps
  })
  const result = {
    toJSON() {
      if (!job.done) return { error: 'Site incelemesi zaman aşımına uğradı.' }
      if ('error' in job.value) return { error: job.value.error }
      const out = cloneOutline(job.value, built?.sections)
      return call.name === 'inspect_site'
        ? out
        : { ok: true, mode: replace ? 'replace' : 'append', note: 'Sayfa klonlandı. Bölümler “Serbest bölüm” (custom) türünde; öğeler items.<id>.title alanlarında. İnce ayar için get_section ile öğe id’lerini al.', ...(job.value.error ? { warning: job.value.error } : {}), ...out }
    },
  }
  return { steps, result }
}

export function describeCloneCall(call: ToolCall): string | null {
  if (!isCloneTool(call.name)) return null
  const url = String(call.input?.url ?? '')
  const host = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  return call.name === 'clone_site' ? `${host} sitesi klonlandı` : `${host} incelendi`
}
