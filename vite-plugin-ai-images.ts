import type { Plugin } from 'vite'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Dev-only image search + download for the AI assistant.
 * POST /api/ai-images {query, count?, orientation?} → searches Openverse (CC, commercial use)
 * and falls back to Wikimedia Commons, downloads into public/ai-images/ and records attribution
 * in public/ai-images/credits.json.
 */
const DIR = 'ai-images'
const MAX_BYTES = 6 * 1024 * 1024
const UA = 'PursaeBuilder/0.1 (local dev image search)'
const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

type Orientation = 'landscape' | 'portrait' | 'square'
interface Candidate { srcs: string[]; page: string; creator: string; license: string; title: string; width?: number; height?: number; source: 'openverse' | 'wikimedia' }
export interface AiImageOut { url: string; width?: number; height?: number; alt: string; credit: string; license: string; source: string }
interface Credit { file: string; source: string; page: string; creator: string; license: string; title: string; query: string; at: string }

const strip = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
const slug = (s: string) =>
  s.toLowerCase().replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image'
const shape = (w?: number, h?: number): Orientation | undefined => (w && h ? (w / h > 1.15 ? 'landscape' : h / w > 1.15 ? 'portrait' : 'square') : undefined)

/** Rejects non-http(s) URLs and obvious local/private hosts. */
function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    const h = u.hostname.replace(/^\[|\]$/g, '')
    if (/^(localhost|0\.0\.0\.0|::1?|.*\.local|.*\.internal)$/i.test(h) || /^(127|10|0)\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^169\.254\./.test(h) || /^f[cd]/i.test(h)) return null
    return u
  } catch {
    return null
  }
}

function sniff(b: Uint8Array): keyof typeof TYPES | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp'
  return null
}

async function getJson(url: string, ms: number) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(ms) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

let openverseDownUntil = 0
async function searchOpenverse(q: string, n: number, o?: Orientation): Promise<Candidate[]> {
  if (Date.now() < openverseDownUntil) throw new Error('Openverse kısa süre önce yanıt vermedi')
  const ar = o === 'landscape' ? 'wide' : o === 'portrait' ? 'tall' : o === 'square' ? 'square' : ''
  try {
    const d = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=${n}&license_type=commercial&mature=false${ar ? `&aspect_ratio=${ar}` : ''}`, 7000)
    return (d.results ?? []).map((r: Record<string, any>) => ({
      srcs: [r.url, r.thumbnail].filter((x): x is string => typeof x === 'string'),
      page: String(r.foreign_landing_url ?? ''),
      creator: strip(String(r.creator ?? 'Bilinmiyor')),
      license: `CC ${String(r.license ?? '').toUpperCase()}${r.license_version ? ` ${r.license_version}` : ''}`.trim(),
      title: strip(String(r.title ?? q)),
      width: r.width ?? undefined,
      height: r.height ?? undefined,
      source: 'openverse' as const,
    }))
  } catch (e) {
    openverseDownUntil = Date.now() + 10 * 60_000
    throw e
  }
}

async function searchWikimedia(q: string, n: number): Promise<Candidate[]> {
  const d = await getJson(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${Math.min(50, n)}&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&prop=imageinfo&iiprop=url|mime|extmetadata|size&iiurlwidth=1600`,
    12000,
  )
  const pages = Object.values<Record<string, any>>(d.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  return pages.flatMap((p) => {
    const ii = p.imageinfo?.[0]
    if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime)) return []
    const m = ii.extmetadata ?? {}
    return [{
      srcs: [ii.thumburl, ii.size < MAX_BYTES ? ii.url : undefined].filter((x): x is string => typeof x === 'string'),
      page: String(ii.descriptionurl ?? ''),
      creator: strip(String(m.Artist?.value ?? 'Bilinmiyor')).slice(0, 120),
      license: strip(String(m.LicenseShortName?.value ?? 'Wikimedia Commons')),
      title: strip(String(m.ImageDescription?.value ?? p.title ?? q)).replace(/^File:/, '').slice(0, 160),
      width: ii.thumbwidth ?? ii.width,
      height: ii.thumbheight ?? ii.height,
      source: 'wikimedia' as const,
    }]
  })
}

/** Downloads one image with manual redirects (each hop re-validated), size cap, type + magic byte checks. */
async function download(raw: string): Promise<{ bytes: Uint8Array; ext: keyof typeof TYPES }> {
  let url = safeUrl(raw)
  for (let hop = 0; hop < 5; hop++) {
    if (!url) throw new Error('güvensiz adres')
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'image/jpeg,image/png,image/webp' }, redirect: 'manual', signal: AbortSignal.timeout(15000) })
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location')
      url = loc ? safeUrl(new URL(loc, url).href) : null
      continue
    }
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`)
    const type = (r.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!/^image\/(jpeg|png|webp)$/.test(type)) throw new Error(`desteklenmeyen tür ${type || '?'}`)
    if (Number(r.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('dosya çok büyük')
    const chunks: Uint8Array[] = []
    let size = 0
    const reader = r.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_BYTES) {
        await reader.cancel()
        throw new Error('dosya çok büyük')
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let off = 0
    for (const c of chunks) bytes.set(c, (off += c.length) - c.length)
    const ext = sniff(bytes)
    if (!ext) throw new Error('geçersiz görsel verisi')
    return { bytes, ext }
  }
  throw new Error('çok fazla yönlendirme')
}

export default function aiImages(): Plugin {
  let root = ''
  let base = '/'
  const inflight = new Map<string, Promise<{ images: AiImageOut[]; error?: string }>>()
  let creditsLock: Promise<unknown> = Promise.resolve()
  const outDir = () => path.join(root, 'public', DIR)

  const saveCredits = (entries: Credit[]) =>
    (creditsLock = creditsLock.then(async () => {
      const file = path.join(outDir(), 'credits.json')
      const cur: Credit[] = await fs.readFile(file, 'utf8').then((t) => JSON.parse(t), () => [])
      const byFile = new Map(cur.map((c) => [c.file, c]))
      for (const e of entries) byFile.set(e.file, e)
      await fs.writeFile(file, `${JSON.stringify([...byFile.values()], null, 2)}\n`)
    }).catch(() => {}))

  async function run(query: string, count: number, orientation?: Orientation, log?: (msg: string) => void) {
    await fs.mkdir(outDir(), { recursive: true })
    const existing = await fs.readdir(outDir()).catch(() => [] as string[])
    const images: AiImageOut[] = []
    const credits: Credit[] = []
    const problems: string[] = []
    // Search engines also match descriptions/categories; prefer hits that name the query words.
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    const score = (c: Candidate) => words.filter((w) => `${c.title} ${c.page.replace(/%28|%29|_/g, ' ')}`.toLowerCase().includes(w)).length * 2 + Number(!!orientation && shape(c.width, c.height) === orientation)

    const one = async (c: Candidate) => {
      for (const src of c.srcs) {
        const hash = createHash('sha1').update(src).digest('hex').slice(0, 10)
        try {
          let file = existing.find((f) => f.includes(`-${hash}.`))
          if (!file) {
            const { bytes, ext } = await download(src)
            file = `${slug(query)}-${hash}.${ext}`
            await fs.writeFile(path.join(outDir(), file), bytes)
            existing.push(file)
          }
          const credit = `${c.creator} · ${c.license} · ${c.source === 'openverse' ? 'Openverse' : 'Wikimedia Commons'}`
          images.push({ url: `${base}${DIR}/${file}`, width: c.width, height: c.height, alt: c.title.slice(0, 140), credit, license: c.license, source: c.page })
          credits.push({ file, source: src, page: c.page, creator: c.creator, license: c.license, title: c.title, query, at: new Date().toISOString() })
          return
        } catch (e) {
          problems.push((e as Error).message)
        }
      }
    }

    // A source whose downloads fall short hands over to the next one.
    let found = 0
    const sources = [['Openverse', () => searchOpenverse(query, count * 3, orientation)], ['Wikimedia', () => searchWikimedia(query, count * 4)]] as const
    for (const [name, search] of sources) {
      if (images.length >= count) break
      let candidates: Candidate[] = []
      for (let attempt = 0; attempt < (name === 'Openverse' ? 1 : 2); attempt++) {
        try {
          candidates = (await search()).sort((a, b) => score(b) - score(a))
          break
        } catch (e) {
          problems.push(`${name}: ${(e as Error).message}`)
        }
      }
      found += candidates.length
      const seen = new Set(images.map((i) => i.source))
      candidates = candidates.filter((c) => !seen.has(c.page))
      for (let i = 0; i < candidates.length && images.length < count; i += count) await Promise.all(candidates.slice(i, i + count).map(one))
    }
    if (credits.length) await saveCredits(credits)
    const out = images.slice(0, count)
    const why = [...new Set(problems)].slice(0, 4).join('; ')
    if (why) log?.(`[ai-images] “${query}” ${out.length}/${count}: ${why}`)
    if (!out.length) return { images: [], error: `“${query}” için görsel ${found ? 'indirilemedi' : 'bulunamadı'}${why ? ` (${why})` : ''}.` }
    return { images: out, ...(out.length < count ? { error: `${count} görselden ${out.length} tanesi indirilebildi${why ? ` (${why})` : ''}.` } : {}) }
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
    name: 'pursae-ai-images',
    apply: 'serve',
    configResolved(c) {
      root = c.root
      base = c.base.endsWith('/') ? c.base : `${c.base}/`
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        const local = url.startsWith(base) ? `/${url.slice(base.length)}` : url
        // Served directly so fresh downloads work without relying on Vite's public-file cache.
        if (req.method === 'GET' && local.startsWith(`/${DIR}/`)) {
          const name = local.slice(DIR.length + 2)
          const ext = name.split('.').pop() ?? ''
          if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(name) && name !== 'credits.json') return next()
          try {
            const data = await fs.readFile(path.join(outDir(), name))
            res.setHeader('content-type', name === 'credits.json' ? 'application/json; charset=utf-8' : TYPES[ext])
            res.setHeader('cache-control', 'no-cache')
            res.setHeader('x-content-type-options', 'nosniff')
            return res.end(data)
          } catch {
            return next()
          }
        }
        if (local !== '/api/ai-images') return next()
        if (req.method !== 'POST') return send(res, 405, { images: [], error: 'Yalnızca POST.' })
        try {
          const body = await readBody(req)
          const query = typeof body.query === 'string' ? body.query.replace(/\s+/g, ' ').trim().slice(0, 100) : ''
          if (!query) return send(res, 400, { images: [], error: 'query gerekli.' })
          const count = Math.max(1, Math.min(8, Math.round(Number(body.count) || 4)))
          const orientation = ['landscape', 'portrait', 'square'].includes(body.orientation) ? (body.orientation as Orientation) : undefined
          const key = `${query.toLowerCase()}|${count}|${orientation ?? ''}`
          let job = inflight.get(key)
          if (!job) {
            job = run(query, count, orientation, (m) => server.config.logger.warn(m, { timestamp: true })).finally(() => inflight.delete(key))
            inflight.set(key, job)
          }
          send(res, 200, await job)
        } catch (e) {
          send(res, 500, { images: [], error: `Görsel indirme hatası: ${(e as Error).message}` })
        }
      })
    },
  }
}
