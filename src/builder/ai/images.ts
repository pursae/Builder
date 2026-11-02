import type { Step } from './agent'

/* ---------- AI image search (dev server endpoint, see vite-plugin-ai-images.ts) ---------- */
export interface AiImage {
  url: string
  width?: number
  height?: number
  alt: string
  credit: string
  license: string
  source: string
}

export interface ImageResult {
  images: AiImage[]
  error?: string
}

export interface ImageQuery {
  query: string
  count?: number
  orientation?: 'landscape' | 'portrait' | 'square'
}

export const canFetchImages = import.meta.env.DEV
export const DEV_ONLY = 'Görsel indirme yalnızca geliştirme sunucusunda çalışır.'
const ENDPOINT = `${import.meta.env.BASE_URL}api/ai-images`

const parse = (status: number, text: string): ImageResult => {
  try {
    const r = JSON.parse(text) as ImageResult
    return { images: Array.isArray(r.images) ? r.images : [], ...(r.error ? { error: r.error } : {}) }
  } catch {
    return { images: [], error: `Görsel servisi yanıt vermedi (HTTP ${status}).` }
  }
}

/** Blocking fallback; the server dedupes identical in-flight queries, so this joins a running job. */
export function fetchImagesSync(q: ImageQuery): ImageResult {
  if (!canFetchImages) return { images: [], error: DEV_ONLY }
  try {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', ENDPOINT, false)
    xhr.setRequestHeader('content-type', 'application/json')
    xhr.send(JSON.stringify(q))
    return parse(xhr.status, xhr.responseText)
  } catch (e) {
    return { images: [], error: `Görsel servisine ulaşılamadı: ${(e as Error).message}` }
  }
}

export interface ImageJob {
  query: ImageQuery
  done: boolean
  value: ImageResult
}

export function startImageJob(query: ImageQuery): ImageJob {
  const job: ImageJob = { query, done: false, value: { images: [] } }
  if (!canFetchImages) return Object.assign(job, { done: true, value: { images: [], error: DEV_ONLY } })
  fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(query) })
    .then(async (r) => parse(r.status, await r.text()))
    .catch((e: Error) => ({ images: [], error: `Görsel servisine ulaşılamadı: ${e.message}` }))
    .then((v) => Object.assign(job, { done: true, value: v }))
  return job
}

/** Job result; blocks on a sync request only if the async one hasn't finished yet. */
export const jobResult = (job: ImageJob): ImageResult => (job.done ? job.value : Object.assign(job, { done: true, value: fetchImagesSync(job.query) }).value)

/**
 * Step players walk step lists with for…of and await between steps, so a custom iterator can keep
 * yielding short waits until the download finishes — the UI stays live without changing the player.
 * Indexed access (filter/length) still sees only the real steps.
 */
export function waitForJobs(steps: Step[], at: number, jobs: ImageJob[], maxMs = 60_000): Step[] {
  steps[Symbol.iterator] = function* (): Generator<Step, undefined> {
    for (let i = 0; i <= steps.length; i++) {
      if (i === at) for (let t = 0; t < maxMs && jobs.some((j) => !j.done); t += 250) yield { kind: 'wait', ms: 250 }
      if (i < steps.length) yield steps[i]
    }
    return undefined
  } as () => ArrayIterator<Step>
  return steps
}
