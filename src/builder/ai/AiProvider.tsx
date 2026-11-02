import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { findSection, loadJSON, saveJSON, uid } from '../data'
import { useB } from '../store'
import { isAction, plan, type Attachment, type Step, type Target } from './agent'
import { cloneRequest, fetchClone } from './clone'
import { pageContext, systemPrompt } from './knowledge'
import { complete, listModels, LlmError, type ChatMsg, type Part } from './llm'
import { PROVIDERS, keyStatus, modelOf, providerOf, type ModelDef } from './providers'
import { TOOLS, describeCall, isReadOnly, planTool } from './tools'

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  attachments?: Attachment[]
  context?: string
  steps?: { label: string; target?: Target; done: boolean; failed?: boolean }[]
  status: 'thinking' | 'pending' | 'running' | 'done' | 'stopped'
  undoCursor?: number
  usage?: { input: number; output: number; cost: number; model: string; simulated: boolean }
  suggestions?: string[]
}

export interface AiSettings {
  active: string
  models: Record<string, string>
  keys: Record<string, string>
  autoApply: boolean
  speed: 'slow' | 'normal' | 'fast'
  showCursor: boolean
  voice: string
  budget: number
}

export interface UsageRecord {
  at: number
  provider: string
  model: string
  input: number
  output: number
  cost: number
  simulated: boolean
}

export interface LogEntry {
  id: string
  label: string
  target?: Target
  at: number
}

type SettingsTab = 'providers' | 'usage' | 'behavior'

interface AiApi {
  messages: AiMessage[]
  running: boolean
  send: (text: string, attachments: Attachment[]) => void
  stop: () => void
  approve: (id: string) => void
  reject: (id: string) => void
  undoRun: (id: string) => void
  clear: () => void
  focus: { target: Target; label: string } | null
  settings: AiSettings
  setSettings: (s: AiSettings) => void
  usage: UsageRecord[]
  resetUsage: () => void
  totals: { input: number; output: number; cost: number; requests: number }
  log: LogEntry[]
  settingsOpen: SettingsTab | null
  setSettingsOpen: (t: SettingsTab | null) => void
  engineLabel: string
  live: boolean
  /** Discovered models for a provider, or the built-in list until discovery succeeds. */
  modelsFor: (providerId: string) => ModelDef[]
  modelInfo: (providerId: string, modelId?: string) => ModelDef
  selectModel: (providerId: string, modelId: string) => void
  refreshModels: (providerId: string) => Promise<void>
  discovery: Record<string, { busy?: boolean; error?: string; count?: number; fetchedAt?: number }>
}

type ModelCache = Record<string, { models: ModelDef[]; fetchedAt: number }>
const MODELS_KEY = 'pursae-builder:ai-models'
const MODELS_TTL = 24 * 60 * 60 * 1000

const DEFAULT_SETTINGS: AiSettings = {
  active: 'anthropic',
  models: {},
  keys: {},
  autoApply: true,
  speed: 'normal',
  showCursor: true,
  voice: 'Samimi, net ve teknik açıdan güvenilir. Kısa cümleler.',
  budget: 20,
}

const SPEED = { slow: { ms: 40, chunk: 1 }, normal: { ms: 18, chunk: 1 }, fast: { ms: 12, chunk: 3 } }
/** Upper bound on model round-trips per user message. */
const MAX_TURNS = 10

const AiCtx = createContext<AiApi | null>(null)
export const useAi = () => {
  const v = useContext(AiCtx)
  if (!v) throw new Error('useAi must be used inside <AiProvider>')
  return v
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))
const tokens = (s: string) => Math.ceil(s.length / 4)

/** Previous turns as plain text, alternating user/assistant as providers require. */
function toHistory(prior: AiMessage[]): ChatMsg[] {
  const out: ChatMsg[] = []
  for (const m of prior.slice(-16)) {
    if (m.role === 'user') {
      const note = m.attachments?.length ? `\n[Ekler: ${m.attachments.map((a) => a.name).join(', ')}]` : ''
      const text = `${m.text}${note}`.trim() || '(boş mesaj)'
      const last = out[out.length - 1]
      if (last?.role === 'user') last.parts.push({ type: 'text', text })
      else out.push({ role: 'user', parts: [{ type: 'text', text }] })
    } else {
      const done = m.steps?.filter((s) => s.done && !s.failed).map((s) => s.label) ?? []
      const text = `${m.text.trim()}${done.length ? `\n[Yapılan işlemler: ${done.join('; ')}]` : ''}`.trim() || '(yanıt yok)'
      if (out[out.length - 1]?.role === 'user') out.push({ role: 'assistant', text, calls: [] })
    }
  }
  if (out[out.length - 1]?.role === 'user') out.pop()
  return out
}

function userParts(text: string, attachments: Attachment[]): Part[] {
  let body = text
  const images: Part[] = []
  for (const a of attachments) {
    if (a.kind === 'image') {
      body += `\n\n[Görsel eki: ${a.name} · sayfada kullanmak için değer: "attachment:${a.id}"]`
      if (a.data && a.mediaType) images.push({ type: 'image', mediaType: a.mediaType, data: a.data })
    } else if (a.text) {
      body += `\n\n[Dosya eki: ${a.name}${a.pages ? ` · ${a.pages} sayfa` : ''}]\n${a.text.slice(0, 12000)}`
    } else {
      body += `\n\n[Dosya eki: ${a.name} · içeriği okunamadı]`
    }
  }
  return [{ type: 'text', text: body.trim() || 'Bu dosyayı sayfamda kullan' }, ...images]
}

export function AiProvider({ children }: { children: ReactNode }) {
  const b = useB()
  const bRef = useRef(b)
  bRef.current = b
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [running, setRunning] = useState(false)
  const [focus, setFocus] = useState<AiApi['focus']>(null)
  const [settings, setSettingsState] = useState<AiSettings>(() => ({ ...DEFAULT_SETTINGS, ...loadJSON<Partial<AiSettings>>('pursae-builder:ai', {}) }))
  const [usage, setUsage] = useState<UsageRecord[]>(() => loadJSON('pursae-builder:ai-usage', []))
  const [log, setLog] = useState<LogEntry[]>([])
  const [settingsOpen, setSettingsOpen] = useState<SettingsTab | null>(null)
  const pending = useRef(new Map<string, Step[]>())
  const approvals = useRef(new Map<string, (ok: boolean) => void>())
  const assets = useRef(new Map<string, string>())
  const abort = useRef<AbortController | null>(null)
  const token = useRef({ stopped: false })
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const [catalog, setCatalog] = useState<ModelCache>(() => loadJSON(MODELS_KEY, {}))
  const [fetching, setFetching] = useState<Record<string, { busy?: boolean; error?: string }>>({})
  const catalogRef = useRef(catalog)
  catalogRef.current = catalog
  const discoverCtl = useRef(new Map<string, AbortController>())

  useEffect(() => saveJSON('pursae-builder:ai', settings), [settings])
  useEffect(() => saveJSON('pursae-builder:ai-usage', usage.slice(-500)), [usage])
  useEffect(() => saveJSON(MODELS_KEY, catalog), [catalog])

  const listFor = useCallback((id: string) => {
    const found = catalogRef.current[id]?.models
    return found?.length ? found : providerOf(id).models
  }, [])
  const infoOf = useCallback((providerId: string, modelId?: string) => modelOf(providerOf(providerId), modelId, listFor(providerId)), [listFor])

  const refreshModels = useCallback(async (id: string) => {
    const p = providerOf(id)
    const key = settingsRef.current.keys[id] ?? ''
    discoverCtl.current.get(id)?.abort()
    if (!key) return
    const ctrl = new AbortController()
    discoverCtl.current.set(id, ctrl)
    setFetching((f) => ({ ...f, [id]: { busy: true } }))
    try {
      const models = await listModels(p, key, ctrl.signal)
      setCatalog((c) => ({ ...c, [id]: { models, fetchedAt: Date.now() } }))
      setFetching((f) => ({ ...f, [id]: {} }))
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setFetching((f) => ({ ...f, [id]: { error: e instanceof LlmError ? e.message : String((e as Error).message ?? e) } }))
    } finally {
      if (discoverCtl.current.get(id) === ctrl) discoverCtl.current.delete(id)
    }
  }, [])

  // Stale or missing caches refresh on load; typing a key refreshes after a short pause.
  useEffect(() => {
    for (const p of PROVIDERS) {
      const key = settingsRef.current.keys[p.id]
      if (keyStatus(p, key) !== 'empty' && Date.now() - (catalogRef.current[p.id]?.fetchedAt ?? 0) > MODELS_TTL) void refreshModels(p.id)
    }
  }, [refreshModels])
  const prevKeys = useRef(settings.keys)
  const keyTimers = useRef(new Map<string, number>())
  useEffect(() => {
    const prev = prevKeys.current
    prevKeys.current = settings.keys
    for (const p of PROVIDERS) {
      if (settings.keys[p.id] === prev[p.id]) continue
      // Per-provider timers: editing one key must not cancel another provider's pending refresh.
      window.clearTimeout(keyTimers.current.get(p.id))
      if (keyStatus(p, settings.keys[p.id]) === 'empty') {
        discoverCtl.current.get(p.id)?.abort()
        setFetching((f) => ({ ...f, [p.id]: {} }))
      } else keyTimers.current.set(p.id, window.setTimeout(() => void refreshModels(p.id), 600))
    }
  }, [settings.keys, refreshModels])
  useEffect(() => {
    const timers = keyTimers.current
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

  const patch = useCallback((id: string, fn: (m: AiMessage) => AiMessage) => setMessages((ms) => ms.map((m) => (m.id === id ? fn(m) : m))), [])

  const typeOut = useCallback(
    async (msgId: string, text: string, run: { stopped: boolean }) => {
      const chunk = Math.max(3, Math.ceil(text.length / 250))
      for (let i = 0; i < text.length; i += chunk) {
        if (run.stopped) break
        const part = text.slice(i, i + chunk)
        patch(msgId, (m) => ({ ...m, text: m.text + part }))
        await sleep(10)
      }
    },
    [patch],
  )

  /** Plays one page-changing step with the AI cursor and typing animation. */
  const play = useCallback(async (st: Exclude<Step, { kind: 'say' }>, run: { stopped: boolean }) => {
    if (st.kind === 'wait') {
      await sleep(st.ms)
      return
    }
    const target = 'target' in st ? st.target : undefined
    if (target && settingsRef.current.showCursor) {
      setFocus({ target, label: st.label })
      await sleep(st.kind === 'type' ? 450 : 350)
    }
    const api = bRef.current
    if (st.kind === 'type') {
      const sp = SPEED[settingsRef.current.speed]
      const { sectionId, el } = st.target
      // Long texts type in bigger chunks so no field takes more than ~120 ticks.
      const chunk = Math.max(sp.chunk, Math.ceil(st.text.length / 120))
      for (let i = chunk; i < st.text.length + chunk; i += chunk) {
        if (run.stopped) break
        bRef.current.dispatch({ type: 'field', id: sectionId, el, value: st.text.slice(0, i) })
        await sleep(sp.ms)
      }
      if (!run.stopped) bRef.current.dispatch({ type: 'field', id: sectionId, el, value: st.text })
    } else if (st.kind === 'do') {
      st.run(api)
      // let the new section render before the cursor moves on
      if (target) await sleep(80)
    } else if (st.kind === 'device') {
      api.setDevice(st.device)
      await sleep(550)
    }
  }, [])

  const pushLog = useCallback((label: string, target?: Target) => setLog((l) => [{ id: uid('l'), label, target, at: Date.now() }, ...l].slice(0, 60)), [])

  /* ---------- Local demo engine ---------- */
  const execute = useCallback(
    async (msgId: string, steps: Step[]) => {
      const run = { stopped: false }
      token.current = run
      setRunning(true)
      patch(msgId, (m) => ({ ...m, status: 'running', undoCursor: bRef.current.history.cursor, steps: steps.filter(isAction).map((s) => ({ label: s.label, target: 'target' in s ? s.target : undefined, done: false })) }))
      let ai = 0
      for (const st of steps) {
        if (run.stopped) break
        if (st.kind === 'say') {
          await typeOut(msgId, st.text, run)
          continue
        }
        await play(st, run)
        if (st.kind === 'wait') continue
        const idx = ai++
        patch(msgId, (m) => ({ ...m, steps: m.steps?.map((x, i) => (i === idx ? { ...x, done: true } : x)) }))
        pushLog(st.label, 'target' in st ? st.target : undefined)
        await sleep(220)
      }
      window.setTimeout(() => setFocus(null), 900)
      patch(msgId, (m) => ({ ...m, status: run.stopped ? 'stopped' : 'done' }))
      setRunning(false)
    },
    [patch, play, typeOut, pushLog],
  )

  const runDemo = useCallback(
    async (replyId: string, text: string, attachments: Attachment[], prior: AiMessage[]) => {
      await sleep(650 + Math.random() * 400)
      // "Make me the same as <url>": the site is rendered and extracted before planning.
      const cloneUrl = attachments.length ? null : cloneRequest(text)
      let clone: Awaited<ReturnType<typeof fetchClone>> | undefined
      if (cloneUrl) {
        const run = { stopped: false }
        token.current = run
        await typeOut(replyId, `${cloneUrl} adresini gerçek bir tarayıcıda açıyorum; bölümleri, metinleri, görselleri, renkleri ve yerleşimi çıkarıyorum…\n`, run)
        clone = await fetchClone(cloneUrl)
        if (run.stopped) {
          patch(replyId, (m) => ({ ...m, status: 'stopped' }))
          return
        }
      }
      const api = bRef.current
      const sel = api.selection?.el ? api.selection : null
      const p = plan(text, api.doc, { selection: sel, attachments, clone })
      // Token estimate: system + page context + conversation + this turn.
      const s = settingsRef.current
      const provider = providerOf(s.active)
      const model = infoOf(provider.id, s.models[provider.id])
      const history = prior.reduce((n, m) => n + tokens(m.text), 0)
      const attach = attachments.reduce((n, a) => n + (a.kind === 'image' ? 850 : tokens(a.text ?? '')), 0)
      const input = 900 + tokens(s.voice) + Math.round(JSON.stringify(api.doc).length / 14) + history + tokens(text) + attach
      const output = p.steps.reduce((n, st) => n + (st.kind === 'say' ? tokens(st.text) : st.kind === 'type' ? tokens(st.text) + 30 : 40), 0)
      const cost = (input * model.in + output * model.out) / 1_000_000
      setUsage((u) => [...u, { at: Date.now(), provider: provider.id, model: model.id, input, output, cost, simulated: true }])
      patch(replyId, (m) => ({ ...m, usage: { input, output, cost, model: `${model.name} · demo`, simulated: true }, suggestions: p.suggestions }))

      const actions = p.steps.filter(isAction)
      if (!s.autoApply && actions.length) {
        pending.current.set(replyId, p.steps)
        patch(replyId, (m) => ({ ...m, status: 'pending', steps: actions.map((a) => ({ label: a.label, target: 'target' in a ? a.target : undefined, done: false })) }))
        return
      }
      await execute(replyId, p.steps)
    },
    [execute, patch, infoOf, typeOut],
  )

  /* ---------- Live model: plan → act → observe loop ---------- */
  const runAgent = useCallback(
    async (replyId: string, text: string, attachments: Attachment[], prior: AiMessage[]) => {
      const s = settingsRef.current
      const provider = providerOf(s.active)
      const model = infoOf(provider.id, s.models[provider.id])
      const key = s.keys[provider.id] ?? ''
      const run = { stopped: false }
      token.current = run
      const ctrl = new AbortController()
      abort.current = ctrl
      setRunning(true)
      for (const a of attachments) if (a.url) assets.current.set(a.id, a.url)
      patch(replyId, (m) => ({ ...m, undoCursor: bRef.current.history.cursor, steps: [] }))

      const convo: ChatMsg[] = [...toHistory(prior), { role: 'user', parts: userParts(text, attachments) }]
      const used = { input: 0, output: 0 }
      const costOf = () => (used.input * model.in + used.output * model.out) / 1_000_000
      let stepCount = 0
      let changed = false
      let failure = ''

      try {
        for (let turn = 0; turn < MAX_TURNS && !run.stopped; turn++) {
          patch(replyId, (m) => ({ ...m, status: 'thinking' }))
          const api = bRef.current
          const system = `${systemPrompt(s.voice)}\n\n${pageContext({ doc: api.doc, selection: api.selection, device: api.device, mode: api.mode, page: api.page, canUndo: api.canUndo })}`
          const res = await complete({ provider, model: model.id, key, system, messages: convo, tools: TOOLS, signal: ctrl.signal })
          used.input += res.usage.input
          used.output += res.usage.output
          patch(replyId, (m) => ({ ...m, status: 'running', usage: { input: used.input, output: used.output, cost: costOf(), model: model.name, simulated: false } }))
          if (run.stopped) break
          if (res.text.trim()) await typeOut(replyId, `${res.text.trim()}\n`, run)
          if (!res.calls.length) break
          convo.push({ role: 'assistant', text: res.text, calls: res.calls })

          const visible = res.calls.filter((c) => !isReadOnly(c))
          const base = stepCount
          stepCount += visible.length
          if (visible.length) {
            const entries = visible.map((c) => ({ label: describeCall(c, api.doc), target: typeof c.input.section_id === 'string' ? { sectionId: c.input.section_id } : undefined, done: false }))
            patch(replyId, (m) => ({ ...m, steps: [...(m.steps ?? []), ...entries] }))
          }
          if (!s.autoApply && visible.length) {
            patch(replyId, (m) => ({ ...m, status: 'pending' }))
            const ok = await new Promise<boolean>((resolve) => approvals.current.set(replyId, resolve))
            approvals.current.delete(replyId)
            if (!ok) {
              run.stopped = true
              patch(replyId, (m) => ({ ...m, steps: m.steps?.map((x, i) => (i >= base ? { ...x, failed: true } : x)) }))
              break
            }
            patch(replyId, (m) => ({ ...m, status: 'running' }))
          }

          const results: { id: string; name: string; content: string }[] = []
          let vi = 0
          for (const call of res.calls) {
            if (run.stopped) {
              results.push({ id: call.id, name: call.name, content: JSON.stringify({ error: 'Kullanıcı durdurdu.' }) })
              continue
            }
            const cur = bRef.current
            const p = planTool(call, { doc: cur.doc, page: cur.page, assets: assets.current })
            const idx = isReadOnly(call) ? -1 : base + vi++
            if ('error' in p) {
              results.push({ id: call.id, name: call.name, content: JSON.stringify({ error: p.error }) })
              if (idx >= 0) patch(replyId, (m) => ({ ...m, steps: m.steps?.map((x, i) => (i === idx ? { ...x, done: true, failed: true } : x)) }))
              continue
            }
            for (const st of p.steps) {
              if (run.stopped) break
              if (st.kind !== 'say') await play(st, run)
            }
            if (idx >= 0) {
              changed = true
              const target = p.target
              patch(replyId, (m) => ({ ...m, steps: m.steps?.map((x, i) => (i === idx ? { ...x, done: true, target: target ?? x.target } : x)) }))
              pushLog(describeCall(call, cur.doc), target)
              await sleep(160)
            }
            results.push({ id: call.id, name: call.name, content: JSON.stringify(p.result) })
          }
          convo.push({ role: 'tool', results })
          if (turn === MAX_TURNS - 1) await typeOut(replyId, '\nTur sınırına ulaştım; devam etmemi istersen “devam et” yaz.', run)
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') failure = e instanceof LlmError ? e.message : String((e as Error).message ?? e)
      }

      if (failure) await typeOut(replyId, `\nModel isteği başarısız oldu: ${failure}`, { stopped: false })
      if (used.input || used.output) setUsage((u) => [...u, { at: Date.now(), provider: provider.id, model: model.id, input: used.input, output: used.output, cost: costOf(), simulated: false }])
      window.setTimeout(() => setFocus(null), 900)
      patch(replyId, (m) => ({
        ...m,
        status: run.stopped ? 'stopped' : 'done',
        text: m.text.trim() || (failure ? m.text : changed ? 'Değişiklikleri yaptım.' : 'Tamam.'),
        suggestions: changed ? ['Mobilde nasıl görünüyor?', 'Başka ne iyileştirebiliriz?', 'Geri al'] : ['Bölüm nasıl eklerim?', 'Sayfamı incele ve öner', 'Kısayollar neler?'],
      }))
      abort.current = null
      setRunning(false)
    },
    [patch, play, typeOut, pushLog, infoOf],
  )

  const send = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (running) return
      const api = bRef.current
      const sel = api.selection?.el ? api.selection : null
      const selSection = sel ? findSection(api.doc, sel.sectionId) : undefined
      const user: AiMessage = { id: uid('m'), role: 'user', text, attachments, context: selSection && sel?.el ? `${selSection.name}` : undefined, status: 'done' }
      const reply: AiMessage = { id: uid('m'), role: 'assistant', text: '', status: 'thinking' }
      const prior = messages
      setMessages((ms) => [...ms, user, reply])
      const s = settingsRef.current
      const key = s.keys[providerOf(s.active).id]
      if (key && !/^\s*demo\s*$/i.test(text)) await runAgent(reply.id, text, attachments, prior)
      else await runDemo(reply.id, text, attachments, prior)
    },
    [running, messages, runAgent, runDemo],
  )

  const approve = useCallback(
    (id: string) => {
      const live = approvals.current.get(id)
      if (live) return live(true)
      const steps = pending.current.get(id)
      if (!steps) return
      pending.current.delete(id)
      void execute(id, steps)
    },
    [execute],
  )
  const reject = useCallback(
    (id: string) => {
      const live = approvals.current.get(id)
      if (live) return live(false)
      pending.current.delete(id)
      patch(id, (m) => ({ ...m, status: 'stopped', text: m.text || 'Plan iptal edildi; sayfada hiçbir şey değişmedi.' }))
    },
    [patch],
  )
  const stop = useCallback(() => {
    token.current.stopped = true
    abort.current?.abort()
    approvals.current.forEach((resolve) => resolve(false))
  }, [])
  const undoRun = useCallback(
    (id: string) => {
      const m = messages.find((x) => x.id === id)
      if (m?.undoCursor === undefined) return
      bRef.current.dispatch({ type: 'jump', cursor: m.undoCursor })
      bRef.current.notify('AI değişiklikleri geri alındı')
    },
    [messages],
  )

  const totals = useMemo(() => usage.reduce((t, u) => ({ input: t.input + u.input, output: t.output + u.output, cost: t.cost + u.cost, requests: t.requests + 1 }), { input: 0, output: 0, cost: 0, requests: 0 }), [usage])
  const provider = providerOf(settings.active)
  const live = !!settings.keys[provider.id]
  const engineLabel = `${infoOf(provider.id, settings.models[provider.id]).name}${live ? '' : ' · demo'}`

  const value: AiApi = {
    messages,
    running,
    send: (t, a) => void send(t, a),
    stop,
    approve,
    reject,
    undoRun,
    clear: () => setMessages([]),
    focus,
    settings,
    setSettings: setSettingsState,
    usage,
    resetUsage: () => setUsage([]),
    totals,
    log,
    settingsOpen,
    setSettingsOpen,
    engineLabel,
    live,
    modelsFor: listFor,
    modelInfo: infoOf,
    selectModel: (providerId, modelId) => setSettingsState((x) => ({ ...x, active: providerId, models: { ...x.models, [providerId]: modelId } })),
    refreshModels,
    discovery: Object.fromEntries(PROVIDERS.map((p) => [p.id, { ...fetching[p.id], count: catalog[p.id]?.models.length, fetchedAt: catalog[p.id]?.fetchedAt }])),
  }
  return <AiCtx.Provider value={value}>{children}</AiCtx.Provider>
}

export { PROVIDERS }
