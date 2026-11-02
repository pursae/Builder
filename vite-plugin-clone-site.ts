import type { Plugin } from 'vite'
import { spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { isIP } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Dev-only site inspector for the "clone this site" AI workflow.
 * POST /api/clone-site {url} → renders the page in headless Chrome (driven over the DevTools
 * protocol, no extra npm deps), extracts sections / boxes / leaves with computed styles and layout
 * boxes (vite-plugin-clone-site.extract.js), downloads the images into public/ai-images/clone/<site>/
 * and returns the structure with local image URLs plus desktop / mobile screenshots of the source.
 * Without Chrome it falls back to a static HTML outline (no styles).
 *
 * Safety: http(s) only, default ports, every hostname is resolved and private / loopback /
 * link-local addresses are refused — for the page itself and for every sub-request Chrome makes
 * (Fetch domain interception), redirects included. Size, count and time limits everywhere.
 */
const DIR = 'ai-images/clone'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const MAX_IMAGE = 8 * 1024 * 1024
const MAX_IMAGES = 160
const MAX_HTML = 6 * 1024 * 1024
const PAGE_TIMEOUT = 25_000
const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon' }

/* ---------- URL + address safety ---------- */
function privateIp(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  }
  const v = ip.toLowerCase()
  if (v.startsWith('::ffff:')) return privateIp(v.slice(7))
  return v === '::' || v === '::1' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff')
}

const hostOk = new Map<string, { ok: boolean; at: number }>()
/** Resolves the host and refuses non-public addresses (cached briefly per host). */
async function publicHost(host: string) {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (!h || /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home\.arpa)$/.test(h)) return false
  if (isIP(h)) return !privateIp(h)
  const hit = hostOk.get(h)
  if (hit && Date.now() - hit.at < 60_000) return hit.ok
  let ok = false
  try {
    const addrs = await lookup(h, { all: true, verbatim: true })
    ok = addrs.length > 0 && addrs.every((a) => !privateIp(a.address))
  } catch {
    ok = false
  }
  hostOk.set(h, { ok, at: Date.now() })
  return ok
}

async function safeUrl(raw: string): Promise<URL | null> {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (u.username || u.password) return null
  if (u.port && !['80', '443', '8080', '8443'].includes(u.port)) return null
  return (await publicHost(u.hostname)) ? u : null
}

/** GET with manual redirects (each hop re-validated), byte cap and timeout. */
async function safeFetch(raw: string, accept: string, max: number, ms = 15000): Promise<{ bytes: Uint8Array; type: string; url: string }> {
  let url = await safeUrl(raw)
  for (let hop = 0; hop < 5; hop++) {
    if (!url) throw new Error('güvensiz adres')
    const r = await fetch(url, { headers: { 'user-agent': UA, accept }, redirect: 'manual', signal: AbortSignal.timeout(ms) })
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location')
      url = loc ? await safeUrl(new URL(loc, url).href) : null
      continue
    }
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`)
    if (Number(r.headers.get('content-length') ?? 0) > max) throw new Error('dosya çok büyük')
    const chunks: Uint8Array[] = []
    let size = 0
    const reader = r.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > max) {
        await reader.cancel()
        throw new Error('dosya çok büyük')
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let off = 0
    for (const c of chunks) bytes.set(c, (off += c.length) - c.length)
    return { bytes, type: (r.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase(), url: url.href }
  }
  throw new Error('çok fazla yönlendirme')
}

function sniff(b: Uint8Array, type: string): keyof typeof TYPES | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  const ascii = (s: number, e: number) => String.fromCharCode(...b.slice(s, e))
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp'
  if (ascii(0, 4) === 'GIF8') return 'gif'
  if (ascii(4, 12) === 'ftypavif' || ascii(4, 12) === 'ftypavis') return 'avif'
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'ico'
  const head = new TextDecoder().decode(b.slice(0, 600)).trimStart().toLowerCase()
  if ((type.includes('svg') || head.startsWith('<?xml') || head.startsWith('<svg')) && head.includes('<svg')) return 'svg'
  return null
}

const sanitizeSvg = (svg: string) =>
  svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href\s*=\s*["'])\s*javascript:[^"']*/gi, '$1#')

/* ---------- Chrome over the DevTools protocol ---------- */
export function findChrome(): string | null {
  const env = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH
  const list = [
    env,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ]
  return list.find((p) => p && existsSync(p)) ?? null
}

type Handler = (params: any, sessionId?: string) => void
class Cdp {
  private id = 0
  private calls = new Map<number, { ok: (v: any) => void; no: (e: Error) => void }>()
  private subs = new Map<string, Set<Handler>>()
  private ws: WebSocket
  constructor(ws: WebSocket) {
    this.ws = ws
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data))
      if (msg.id !== undefined) {
        const c = this.calls.get(msg.id)
        this.calls.delete(msg.id)
        if (msg.error) c?.no(new Error(msg.error.message))
        else c?.ok(msg.result)
      } else if (msg.method) this.subs.get(msg.method)?.forEach((h) => h(msg.params, msg.sessionId))
    })
    ws.addEventListener('close', () => this.calls.forEach((c) => c.no(new Error('Chrome bağlantısı kapandı'))))
  }
  send<T = any>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    const id = ++this.id
    return new Promise((ok, no) => {
      this.calls.set(id, { ok, no })
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }
  on(method: string, h: Handler) {
    if (!this.subs.has(method)) this.subs.set(method, new Set())
    this.subs.get(method)!.add(h)
    return () => this.subs.get(method)!.delete(h)
  }
}

export async function launchChrome(bin: string): Promise<{ cdp: Cdp; close: () => Promise<void> }> {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'pursae-clone-'))
  const proc: ChildProcess = spawn(
    bin,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-features=Translate,MediaRouter,OptimizationHints',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const endpoint = await new Promise<string>((ok, no) => {
    let buf = ''
    const t = setTimeout(() => no(new Error('Chrome açılamadı (zaman aşımı)')), 15000)
    proc.stderr!.on('data', (d) => {
      buf += String(d)
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) {
        clearTimeout(t)
        ok(m[1])
      }
    })
    proc.on('exit', () => {
      clearTimeout(t)
      no(new Error('Chrome beklenmedik şekilde kapandı'))
    })
  })
  const ws = new WebSocket(endpoint)
  await new Promise<void>((ok, no) => {
    ws.addEventListener('open', () => ok(), { once: true })
    ws.addEventListener('error', () => no(new Error('Chrome DevTools bağlantısı kurulamadı')), { once: true })
  })
  const cdp = new Cdp(ws)
  const close = async () => {
    try {
      await Promise.race([cdp.send('Browser.close'), new Promise((r) => setTimeout(r, 1500))])
    } catch {
      /* already gone */
    }
    ws.close()
    proc.kill('SIGKILL')
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {})
  }
  return { cdp, close }
}

const PREP = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{animation-delay:0s!important;animation-duration:1ms!important;animation-iteration-count:1!important;transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important}';
  document.head.appendChild(st);
  for (const img of document.querySelectorAll('img')) {
    img.loading = 'eager';
    const ds = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
    if (ds && (!img.getAttribute('src') || img.getAttribute('src').startsWith('data:'))) img.setAttribute('src', ds);
    const dss = img.getAttribute('data-srcset') || img.getAttribute('data-lazy-srcset');
    if (dss) img.setAttribute('srcset', dss);
  }
  const H = () => document.documentElement.scrollHeight;
  for (let y = 0; y < H() && y < 40000; y += Math.round(innerHeight * 0.7)) { scrollTo(0, y); await sleep(110); }
  scrollTo(0, H()); await sleep(300);
  scrollTo(0, 0); await sleep(500);
  const pending = [...document.images].filter((i) => !i.complete);
  await Promise.race([Promise.all(pending.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))), sleep(4000)]);
  try { await Promise.race([document.fonts.ready, sleep(3000)]); } catch (e) {}
  await sleep(200);
  return { h: H(), w: document.documentElement.clientWidth };
})()`

interface Shot {
  file: string
  w: number
  h: number
}

async function renderPage(bin: string, url: string, extractSrc: string, saveShot: (name: string, b64: string) => Promise<string>) {
  const { cdp, close } = await launchChrome(bin)
  const timer = setTimeout(() => void close(), PAGE_TIMEOUT + 30_000)
  try {
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'deny' }).catch(() => {})
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
    const s = (m: string, p: Record<string, unknown> = {}) => cdp.send(m, p, sessionId)
    let blocked = 0
    let requests = 0
    // Every request (documents, subresources, redirects) passes the same public-address check.
    cdp.on('Fetch.requestPaused', (p, sid) => {
      if (sid !== sessionId) return
      void (async () => {
        const u = String(p.request.url)
        requests++
        let ok = u.startsWith('data:') || u.startsWith('blob:')
        if (!ok && requests < 1500 && p.resourceType !== 'Media' && p.resourceType !== 'WebSocket' && p.resourceType !== 'EventSource') ok = !!(await safeUrl(u))
        if (ok) await s('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {})
        else {
          blocked++
          await s('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }).catch(() => {})
        }
      })()
    })
    await s('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] })
    await s('Page.enable')
    await s('Network.setUserAgentOverride', { userAgent: UA, acceptLanguage: 'tr-TR,tr;q=0.9,en;q=0.8' })
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    const loaded = new Promise<void>((ok) => {
      const off = cdp.on('Page.loadEventFired', (_p, sid) => {
        if (sid === sessionId) {
          off()
          ok()
        }
      })
    })
    const nav = await s('Page.navigate', { url })
    if (nav.errorText) throw new Error(`Sayfa açılamadı: ${nav.errorText}`)
    await Promise.race([loaded, new Promise((r) => setTimeout(r, PAGE_TIMEOUT))])
    await new Promise((r) => setTimeout(r, 600))
    const evalJs = async (expression: string) => {
      const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 30000 })
      if (r.exceptionDetails) throw new Error(`Sayfa betiği hata verdi: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`.slice(0, 300))
      return r.result.value
    }
    const dims = (await evalJs(PREP)) as { h: number; w: number }
    const data = await evalJs(`(${extractSrc})({})`)
    const shots: Record<string, Shot> = {}
    const shoot = async (name: string, w: number) => {
      const h = Math.min(14000, Math.max(600, Number((await evalJs('document.documentElement.scrollHeight')) || dims.h)))
      const scale = w > 800 ? 0.5 : 1
      const r = await s('Page.captureScreenshot', { format: 'jpeg', quality: 72, captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale } })
      shots[name] = { file: await saveShot(name, r.data), w: Math.round(w * scale), h: Math.round(h * scale) }
    }
    await shoot('desktop', 1440).catch(() => {})
    // UI mockups flagged by the extractor are cut from the rendered page (fixed overlays hidden first).
    const snaps: Record<string, string> = {}
    const regions = (Array.isArray(data?.snaps) ? data.snaps : []) as { id: string; x: number; y: number; w: number; h: number }[]
    if (regions.length) {
      await evalJs(`for (const el of document.querySelectorAll('body *')) { const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') { el.dataset.cloneHidden = '1'; el.style.setProperty('visibility', 'hidden', 'important') } }`).catch(() => {})
      for (const g of regions.slice(0, 14)) {
        if (g.w < 8 || g.h < 8 || g.h > 4000) continue
        const r = await s('Page.captureScreenshot', { format: 'jpeg', quality: 86, captureBeyondViewport: true, clip: { x: g.x, y: g.y, width: g.w, height: g.h, scale: 1.5 } }).catch(() => null)
        if (r?.data) snaps[g.id] = r.data
      }
      await evalJs(`for (const el of document.querySelectorAll('[data-clone-hidden]')) el.style.removeProperty('visibility')`).catch(() => {})
    }
    await s('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }).catch(() => {})
    await new Promise((r) => setTimeout(r, 700))
    await shoot('mobile', 390).catch(() => {})
    return { data, shots, blocked, snaps }
  } finally {
    clearTimeout(timer)
    await close()
  }
}

/* ---------- Static fallback (no Chrome): plain outline from HTML ---------- */
function staticOutline(html: string, base: string) {
  const ent = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  const clean = html.replace(/<(script|style|noscript|template|svg)[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  const abs = (u: string) => {
    try {
      return new URL(ent(u), base).href
    } catch {
      return ''
    }
  }
  const title = ent(clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
  const description = ent(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ?? '')
  const blocks = clean.split(/(?=<(?:header|section|footer|nav)\b)/i)
  const text = (s: string) => ent(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim()
  const sections = blocks
    .map((b, i) => {
      const kids: Record<string, unknown>[] = []
      for (const m of b.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>|<p[^>]*>([\s\S]*?)<\/p>|<a([^>]*)>([\s\S]*?)<\/a>|<img([^>]*)>|<li[^>]*>([\s\S]*?)<\/li>/gi)) {
        if (m[1]) kids.push({ t: 'heading', tag: m[1].toLowerCase(), tx: text(m[2]) })
        else if (m[3] !== undefined) kids.push({ t: 'text', tx: text(m[3]) })
        else if (m[4] !== undefined) {
          const href = abs(m[4].match(/href=["']([^"']*)/i)?.[1] ?? '')
          kids.push({ t: /class=["'][^"']*(btn|button)/i.test(m[4]) ? 'button' : 'link', tx: text(m[5]), href })
        } else if (m[6] !== undefined) {
          const src = abs(m[6].match(/\ssrc=["']([^"']*)/i)?.[1] ?? m[6].match(/data-src=["']([^"']*)/i)?.[1] ?? '')
          if (src) kids.push({ t: 'image', src, alt: ent(m[6].match(/alt=["']([^"']*)/i)?.[1] ?? '') })
        } else if (m[7] !== undefined) kids.push({ t: 'text', tx: text(m[7]), st: { list: 'disc' } })
      }
      const tag = (b.match(/^<(\w+)/)?.[1] ?? 'div').toLowerCase()
      const usable = kids.filter((k) => k.t === 'image' || (typeof k.tx === 'string' && k.tx)).slice(0, 80)
      return usable.length ? { tag, name: String(usable.find((k) => k.t === 'heading')?.tx ?? `${tag} ${i + 1}`).slice(0, 48), bg: '#ffffff', root: { t: 'box', dir: 'column', kids: usable, st: { pad: [48, 24, 48, 24] }, maxW: 1100, self: 'center' } } : null
    })
    .filter(Boolean)
  const fontLinks = [...html.matchAll(/<link[^>]+href=["']([^"']*fonts\.googleapis\.com[^"']*)/gi)].map((m) => abs(m[1]))
  return { url: base, title, description, lang: '', viewport: { w: 1440, h: 900 }, height: 0, fonts: [], fontLinks, tokens: { text: '#111111', bg: '#ffffff', font: '', size: 16, brand: null, buttons: [], colors: [] }, sections, nodes: 0, truncated: false, static: true }
}

/* ---------- Plugin ---------- */
export interface CloneOut {
  data: Record<string, any>
  shots: Record<string, Shot>
  images: { ok: number; failed: number }
  engine: 'chrome' | 'static'
  blocked?: number
  folder: string
  error?: string
}

export default function cloneSite(): Plugin {
  let root = ''
  let base = '/'
  const cache = new Map<string, { at: number; job: Promise<CloneOut> }>()
  const outDir = (...p: string[]) => path.join(root, 'public', DIR, ...p)
  // Source screenshots and the raw extraction are diagnostics, not page assets: they stay out of the project.
  const snapDir = (...p: string[]) => path.join(os.tmpdir(), 'pursae-clone-snapshots', ...p)

  async function run(url: URL, log: (m: string) => void, withImages: boolean): Promise<CloneOut> {
    const slug = `${url.hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)}-${createHash('sha1').update(url.href).digest('hex').slice(0, 6)}`
    await fs.mkdir(snapDir(slug), { recursive: true })
    const publicUrl = (file: string) => `${base}${DIR}/${slug}/${file}`
    const saveShot = async (name: string, b64: string) => {
      const file = snapDir(slug, `source-${name}.jpg`)
      await fs.writeFile(file, Buffer.from(b64, 'base64'))
      return file
    }

    const bin = findChrome()
    let data: Record<string, any>
    let shots: Record<string, Shot> = {}
    let engine: CloneOut['engine'] = 'chrome'
    let blocked = 0
    let snaps: Record<string, string> = {}
    let warn: string | undefined
    const extractSrc = (await fs.readFile(path.join(root, 'vite-plugin-clone-site.extract.js'), 'utf8')).replace(/^[\s\S]*?(?=function __cloneExtract)/, '')
    try {
      if (!bin) throw new Error('Chrome bulunamadı (CHROME_PATH ile belirtebilirsin)')
      const r = await renderPage(bin, url.href, extractSrc, saveShot)
      data = r.data
      shots = r.shots
      blocked = r.blocked
      snaps = r.snaps
    } catch (e) {
      warn = `Tarayıcıyla işlenemedi: ${(e as Error).message}. Statik HTML'den yalnızca içerik çıkarıldı (stiller yok).`
      log(`[clone-site] ${url.href}: ${(e as Error).message}`)
      engine = 'static'
      const page = await safeFetch(url.href, 'text/html,application/xhtml+xml', MAX_HTML)
      data = staticOutline(new TextDecoder().decode(page.bytes), page.url)
    }

    // Collect every remote image (img src + CSS background urls) and swap in local copies.
    const urls = new Set<string>()
    const visit = (n: any) => {
      if (n.src && /^https?:/.test(n.src)) urls.add(n.src)
      const bgi: string | undefined = n.st?.bgi
      if (bgi) for (const m of bgi.matchAll(/url\("([^"]+)"\)/g)) if (/^https?:/.test(m[1])) urls.add(m[1])
      n.kids?.forEach(visit)
    }
    data.sections?.forEach((s: any) => visit(s.root))
    const local = new Map<string, string>()
    let failed = 0
    const list = withImages ? [...urls].slice(0, MAX_IMAGES) : []
    if (list.length) await fs.mkdir(outDir(slug), { recursive: true })
    const one = async (src: string) => {
      const hash = createHash('sha1').update(src).digest('hex').slice(0, 12)
      try {
        const have = (await fs.readdir(outDir(slug))).find((f) => f.startsWith(`${hash}.`))
        if (have) return local.set(src, publicUrl(have))
        const r = await safeFetch(src, 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,*/*;q=0.5', MAX_IMAGE)
        const ext = sniff(r.bytes, r.type)
        if (!ext) throw new Error(`desteklenmeyen tür ${r.type || '?'}`)
        const bytes = ext === 'svg' ? new TextEncoder().encode(sanitizeSvg(new TextDecoder().decode(r.bytes))) : r.bytes
        await fs.writeFile(outDir(slug, `${hash}.${ext}`), bytes)
        local.set(src, publicUrl(`${hash}.${ext}`))
      } catch {
        failed++
      }
    }
    for (let i = 0; i < list.length; i += 6) await Promise.all(list.slice(i, i + 6).map(one))
    const swap = (n: any) => {
      if (n.src && local.has(n.src)) n.src = local.get(n.src)
      if (n.st?.bgi && withImages) n.st.bgi = String(n.st.bgi).replace(/url\("([^"]+)"\)/g, (m: string, u: string) => (local.has(u) ? `url("${local.get(u)}")` : /^https?:/.test(u) ? 'none' : m)).replace(/^none(,\s*none)*$/, '')
      if (n.st && !n.st.bgi) delete n.st.bgi
      n.kids?.forEach(swap)
    }
    data.sections?.forEach((s: any) => swap(s.root))
    const snapUrls = new Map<string, string>()
    if (withImages)
      for (const [id, b64] of Object.entries(snaps)) {
        const bytes = Buffer.from(b64, 'base64')
        const file = `snap-${createHash('sha1').update(bytes).digest('hex').slice(0, 12)}.jpg`
        await fs.mkdir(outDir(slug), { recursive: true })
        await fs.writeFile(outDir(slug, file), bytes)
        snapUrls.set(id, publicUrl(file))
      }
    const fillSnaps = (n: any) => {
      if (n.snap) {
        n.src = snapUrls.get(n.snap) ?? ''
        delete n.snap
      }
      n.kids?.forEach(fillSnaps)
    }
    data.sections?.forEach((s: any) => fillSnaps(s.root))
    delete data.snaps
    await fs.writeFile(snapDir(slug, 'structure.json'), JSON.stringify(data))
    if (failed) log(`[clone-site] ${url.hostname}: ${failed}/${list.length} görsel indirilemedi`)
    return { data, shots, images: { ok: local.size, failed }, engine, blocked, folder: withImages ? `public/${DIR}/${slug}` : '', ...(warn ? { error: warn } : {}) }
  }

  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
  }

  async function readBody(req: IncomingMessage) {
    let raw = ''
    for await (const chunk of req) {
      raw += chunk
      if (raw.length > 4096) throw new Error('istek çok büyük')
    }
    return JSON.parse(raw || '{}')
  }

  return {
    name: 'pursae-clone-site',
    apply: 'serve',
    configResolved(c) {
      root = c.root
      base = c.base.endsWith('/') ? c.base : `${c.base}/`
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        const local = url.startsWith(base) ? `/${url.slice(base.length)}` : url
        // Fresh downloads are served directly (Vite's public-file index is built at startup).
        if (req.method === 'GET' && local.startsWith(`/${DIR}/`)) {
          const m = local.slice(DIR.length + 2).match(/^([a-z0-9-]+)\/([a-z0-9-]+\.(jpg|png|webp|gif|svg|avif|ico))$/)
          if (!m) return next()
          try {
            const data = await fs.readFile(outDir(m[1], m[2]))
            res.setHeader('content-type', TYPES[m[3]])
            res.setHeader('cache-control', 'no-cache')
            res.setHeader('x-content-type-options', 'nosniff')
            if (m[3] === 'svg') res.setHeader('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox")
            return res.end(data)
          } catch {
            return next()
          }
        }
        if (local !== '/api/clone-site') return next()
        if (req.method !== 'POST') return send(res, 405, { error: 'Yalnızca POST.' })
        try {
          const body = await readBody(req)
          let raw = typeof body.url === 'string' ? body.url.trim() : ''
          if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`
          const target = await safeUrl(raw)
          if (!target) return send(res, 400, { error: 'Geçerli, herkese açık bir http(s) adresi gerekli.' })
          target.hash = ''
          const withImages = body.images !== false
          const rev = (await fs.stat(path.join(root, 'vite-plugin-clone-site.extract.js')).catch(() => null))?.mtimeMs ?? 0
          const key = `${withImages ? 'full' : 'inspect'} ${rev} ${target.href}`
          const hit = cache.get(key)
          let job = hit && Date.now() - hit.at < 10 * 60_000 && !body.fresh ? hit.job : undefined
          if (!job) {
            job = run(target, (m) => server.config.logger.warn(m, { timestamp: true }), withImages)
            cache.set(key, { at: Date.now(), job })
            job.catch(() => cache.delete(key))
          }
          send(res, 200, await job)
        } catch (e) {
          send(res, 500, { error: `Site incelenemedi: ${(e as Error).message}` })
        }
      })
    },
  }
}
