export interface ModelDef {
  /** Model id sent to the provider API. */
  id: string
  name: string
  /** USD per 1M tokens (approximate list prices, may change). */
  in: number
  out: number
  /** Price could not be resolved from the catalog; `in`/`out` are 0. */
  unknown?: boolean
}

export interface ProviderDef {
  id: string
  name: string
  color: string
  keyHint: string
  prefix?: string
  url?: boolean
  /** Wire protocol: Anthropic Messages API or OpenAI-compatible chat completions. */
  api: 'anthropic' | 'openai'
  /** Upstream base URL; in dev it is reached through the Vite proxy at /llm/<id>. */
  base: string
  /** Path of the chat endpoint below `base`. */
  path: string
  /** Path of the model list endpoint below `base`. */
  modelsPath: string
  /** Built-in catalog: default choices and list prices for known ids. */
  models: ModelDef[]
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    color: '#d97757',
    keyHint: 'sk-ant-…',
    prefix: 'sk-ant-',
    api: 'anthropic',
    base: 'https://api.anthropic.com',
    path: '/v1/messages',
    modelsPath: '/v1/models?limit=100',
    models: [
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', in: 3, out: 15 },
      { id: 'claude-opus-4-1', name: 'Claude Opus 4.1', in: 15, out: 75 },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', in: 1, out: 5 },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    color: '#10a37f',
    keyHint: 'sk-…',
    prefix: 'sk-',
    api: 'openai',
    base: 'https://api.openai.com',
    path: '/v1/chat/completions',
    modelsPath: '/v1/models',
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', in: 2, out: 8 },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini', in: 0.4, out: 1.6 },
      { id: 'gpt-4o', name: 'GPT-4o', in: 2.5, out: 10 },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    color: '#4285f4',
    keyHint: 'AIza…',
    prefix: 'AIza',
    api: 'openai',
    base: 'https://generativelanguage.googleapis.com',
    path: '/v1beta/openai/chat/completions',
    modelsPath: '/v1beta/openai/models',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', in: 0.3, out: 2.5 },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', in: 1.25, out: 10 },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    color: '#fa520f',
    keyHint: 'API anahtarı',
    api: 'openai',
    base: 'https://api.mistral.ai',
    path: '/v1/chat/completions',
    modelsPath: '/v1/models',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', in: 2, out: 6 },
      { id: 'mistral-small-latest', name: 'Mistral Small', in: 0.2, out: 0.6 },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama (yerel)',
    color: '#9ca3af',
    keyHint: 'http://localhost:11434',
    url: true,
    api: 'openai',
    base: 'http://localhost:11434',
    path: '/v1/chat/completions',
    modelsPath: '/api/tags',
    models: [
      { id: 'qwen2.5', name: 'Qwen 2.5', in: 0, out: 0 },
      { id: 'llama3.1', name: 'Llama 3.1', in: 0, out: 0 },
    ],
  },
]

export const providerOf = (id: string) => PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]
/** Best-effort list prices (USD / 1M tokens) by model family; first match wins. */
const FAMILY: [RegExp, number, number][] = [
  [/claude-opus-4-[5-9]|claude-opus-[5-9]/, 5, 25],
  [/claude-(3-)?opus/, 15, 75],
  [/claude-.*sonnet/, 3, 15],
  [/claude-haiku-4|claude-haiku-[5-9]/, 1, 5],
  [/claude-3-5-haiku/, 0.8, 4],
  [/claude-3-haiku/, 0.25, 1.25],
  [/^gpt-5.*-nano/, 0.05, 0.4],
  [/^gpt-5.*-mini/, 0.25, 2],
  [/^gpt-5/, 1.25, 10],
  [/^gpt-4\.1-nano/, 0.1, 0.4],
  [/^gpt-4\.1-mini/, 0.4, 1.6],
  [/^gpt-4\.1/, 2, 8],
  [/^gpt-4o-mini/, 0.15, 0.6],
  [/^chatgpt-4o/, 5, 15],
  [/^gpt-4o/, 2.5, 10],
  [/^gpt-4-turbo/, 10, 30],
  [/^gpt-4/, 30, 60],
  [/^gpt-3\.5/, 0.5, 1.5],
  [/^o[134]-mini/, 1.1, 4.4],
  [/^o3/, 2, 8],
  [/^o1/, 15, 60],
  [/gemini-3.*pro/, 2, 12],
  [/gemini-.*flash-lite/, 0.1, 0.4],
  [/gemini-2\.0-flash/, 0.1, 0.4],
  [/gemini-1\.5-flash/, 0.075, 0.3],
  [/gemini-1\.5-pro/, 1.25, 5],
  [/gemini-.*flash/, 0.3, 2.5],
  [/gemini-.*pro/, 1.25, 10],
  [/mistral-large|pixtral-large/, 2, 6],
  [/mistral-medium|devstral-medium/, 0.4, 2],
  [/mistral-small|devstral-small/, 0.1, 0.3],
  [/magistral-medium/, 2, 5],
  [/magistral-small/, 0.5, 1.5],
  [/codestral/, 0.3, 0.9],
  [/ministral-3b/, 0.04, 0.04],
  [/ministral-8b/, 0.1, 0.1],
  [/pixtral-12b|open-mistral-nemo/, 0.15, 0.15],
]

const pretty = (id: string) =>
  id
    .replace(/^gpt-/, 'GPT-')
    .split('-')
    .map((w, i) => (i === 0 && w.startsWith('GPT') ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/^GPT /, 'GPT-')

/** Builds a model entry for any id: catalog first, then price family, else unknown price. */
export function describeModel(p: ProviderDef, id: string, name?: string): ModelDef {
  const known = p.models.find((m) => m.id === id)
  if (known) return { ...known, name: name || known.name }
  const label = name || (p.url ? id : pretty(id))
  if (p.url) return { id, name: label, in: 0, out: 0 }
  const fam = FAMILY.find(([re]) => re.test(id))
  return fam ? { id, name: label, in: fam[1], out: fam[2] } : { id, name: label, in: 0, out: 0, unknown: true }
}

/** Resolves the selected model from `list` (discovered or built-in); unknown ids keep working with best-effort pricing. */
export function modelOf(p: ProviderDef, id?: string, list: ModelDef[] = p.models) {
  return list.find((m) => m.id === id) ?? (id ? describeModel(p, id) : (list[0] ?? p.models[0]))
}

export const fmtPrice = (m: ModelDef) => (m.unknown ? 'fiyat bilinmiyor' : m.in === 0 && m.out === 0 ? 'yerel · ücretsiz' : `$${m.in} / $${m.out}`)

export function keyStatus(p: ProviderDef, key?: string): 'empty' | 'ok' | 'warn' {
  if (!key) return 'empty'
  if (p.url) return /^https?:\/\//.test(key) ? 'ok' : 'warn'
  if (p.prefix && !key.startsWith(p.prefix)) return 'warn'
  return key.length >= 20 ? 'ok' : 'warn'
}

export const fmtTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)
export const fmtCost = (n: number) => (n === 0 ? '$0' : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`)
