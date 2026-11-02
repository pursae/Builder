import { describeModel, type ModelDef, type ProviderDef } from './providers'
import type { ToolCall, ToolDef } from './tools'

export type Part = { type: 'text'; text: string } | { type: 'image'; mediaType: string; data: string }

export type ChatMsg =
  | { role: 'user'; parts: Part[] }
  | { role: 'assistant'; text: string; calls: ToolCall[] }
  | { role: 'tool'; results: { id: string; name: string; content: string }[] }

export interface Completion {
  text: string
  calls: ToolCall[]
  usage: { input: number; output: number }
}

export interface CompleteArgs {
  provider: ProviderDef
  model: string
  key: string
  system: string
  messages: ChatMsg[]
  tools?: ToolDef[]
  maxTokens?: number
  signal?: AbortSignal
}

export class LlmError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

function baseOf(p: ProviderDef, key: string) {
  if (p.url) return key.replace(/\/+$/, '') || p.base
  return import.meta.env.DEV ? `/llm/${p.id}` : p.base
}
const endpoint = (p: ProviderDef, key: string) => `${baseOf(p, key)}${p.path}`

const authHeaders = (p: ProviderDef, key: string): Record<string, string> =>
  p.api === 'anthropic' ? { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } : p.url ? {} : { authorization: `Bearer ${key}` }

const post = (url: string, headers: Record<string, string>, body: unknown, signal?: AbortSignal) => request(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal })

async function request(url: string, init: RequestInit) {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new LlmError(`Sağlayıcıya ulaşılamadı (${(e as Error).message}). İnternet bağlantını, adresi ya da CORS ayarını kontrol et.`)
  }
  const raw = await res.text()
  let json: Record<string, unknown> = {}
  try {
    json = raw ? JSON.parse(raw) : {}
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const err = json.error as { message?: string } | string | undefined
    const msg =
      (typeof err === 'string' ? err : err?.message) ??
      (typeof json.detail === 'string' ? json.detail : undefined) ??
      (Array.isArray(json) ? (json[0] as { error?: { message?: string } })?.error?.message : undefined) ??
      raw.slice(0, 300)
    const hint = res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(msg)) ? ' API anahtarını kontrol et.' : res.status === 404 ? ' Model adı ya da adres yanlış olabilir.' : res.status === 429 ? ' Hız ya da kota sınırına takıldın.' : ''
    throw new LlmError(`${res.status}: ${(msg || res.statusText).replace(/\.\s*$/, '')}.${hint}`, res.status)
  }
  return json
}

const parseArgs = (s: unknown): Record<string, unknown> => {
  if (s && typeof s === 'object') return s as Record<string, unknown>
  try {
    return JSON.parse(String(s || '{}'))
  } catch {
    return {}
  }
}

/* ---------- Anthropic Messages API ---------- */
async function anthropic(a: CompleteArgs): Promise<Completion> {
  const messages = a.messages.map((m) => {
    if (m.role === 'user')
      return {
        role: 'user',
        content: m.parts.map((p) => (p.type === 'text' ? { type: 'text', text: p.text } : { type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.data } })),
      }
    if (m.role === 'assistant')
      return {
        role: 'assistant',
        content: [...(m.text ? [{ type: 'text', text: m.text }] : []), ...m.calls.map((c) => ({ type: 'tool_use', id: c.id, name: c.name, input: c.input }))],
      }
    return { role: 'user', content: m.results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.content })) }
  })
  const json = await post(
    endpoint(a.provider, a.key),
    authHeaders(a.provider, a.key),
    {
      model: a.model,
      max_tokens: a.maxTokens ?? 4096,
      system: a.system,
      messages,
      ...(a.tools?.length ? { tools: a.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) } : {}),
    },
    a.signal,
  )
  const content = (json.content as { type: string; text?: string; id?: string; name?: string; input?: unknown }[]) ?? []
  const usage = json.usage as { input_tokens?: number; output_tokens?: number } | undefined
  return {
    text: content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join(''),
    calls: content.filter((c) => c.type === 'tool_use').map((c) => ({ id: c.id!, name: c.name!, input: parseArgs(c.input) })),
    usage: { input: usage?.input_tokens ?? 0, output: usage?.output_tokens ?? 0 },
  }
}

/* ---------- OpenAI-compatible chat completions (OpenAI, Gemini, Mistral, Ollama) ---------- */
async function openai(a: CompleteArgs): Promise<Completion> {
  const messages: unknown[] = [{ role: 'system', content: a.system }]
  for (const m of a.messages) {
    if (m.role === 'user') {
      const onlyText = m.parts.every((p) => p.type === 'text')
      messages.push({
        role: 'user',
        content: onlyText ? m.parts.map((p) => (p as { text: string }).text).join('\n\n') : m.parts.map((p) => (p.type === 'text' ? { type: 'text', text: p.text } : { type: 'image_url', image_url: { url: `data:${p.mediaType};base64,${p.data}` } })),
      })
    } else if (m.role === 'assistant') {
      messages.push({
        role: 'assistant',
        content: m.text || (m.calls.length ? null : ''),
        ...(m.calls.length ? { tool_calls: m.calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.input) } })) } : {}),
      })
    } else {
      for (const r of m.results) messages.push({ role: 'tool', tool_call_id: r.id, ...(a.provider.id === 'openai' ? {} : { name: r.name }), content: r.content })
    }
  }
  const p = a.provider
  const json = await post(
    endpoint(p, a.key),
    authHeaders(p, a.key),
    {
      model: a.model,
      messages,
      ...(p.id === 'openai' ? { max_completion_tokens: a.maxTokens ?? 4096 } : { max_tokens: a.maxTokens ?? 4096 }),
      ...(a.tools?.length ? { tools: a.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })) } : {}),
    },
    a.signal,
  )
  const choice = (json.choices as { message?: { content?: string | null; tool_calls?: { id?: string; function: { name: string; arguments: unknown } }[] } }[] | undefined)?.[0]
  const msg = choice?.message
  const usage = json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined
  return {
    text: typeof msg?.content === 'string' ? msg.content : '',
    calls: (msg?.tool_calls ?? []).map((c, i) => ({ id: c.id || `call_${Date.now().toString(36)}${i}`, name: c.function.name, input: parseArgs(c.function.arguments) })),
    usage: { input: usage?.prompt_tokens ?? 0, output: usage?.completion_tokens ?? 0 },
  }
}

export function complete(a: CompleteArgs): Promise<Completion> {
  return a.provider.api === 'anthropic' ? anthropic(a) : openai(a)
}

const OPENAI_SKIP = /embedding|tts|whisper|dall-e|image|audio|realtime|transcribe|moderation|search|instruct|codex|computer-use|deep-research|-pro\b/
const GEMINI_SKIP = /embedding|aqa|imagen|veo|tts|image|audio|live|learnlm|robotics|computer-use/

type Listed = { id: string; name?: string; created?: number }

/** Fetches the chat-capable models the key can use, newest first where the API tells. */
export async function listModels(p: ProviderDef, key: string, signal?: AbortSignal): Promise<ModelDef[]> {
  let json: Record<string, unknown>
  try {
    json = await request(`${baseOf(p, key)}${p.modelsPath}`, { headers: authHeaders(p, key), signal })
  } catch (e) {
    if (!(e instanceof LlmError)) throw e
    if (p.url) {
      // Other OpenAI-compatible local servers (LM Studio, llama.cpp, vLLM) only expose /v1/models.
      const alt = await request(`${baseOf(p, key)}/v1/models`, { signal }).catch(() => Promise.reject(e))
      return ((alt.data ?? []) as { id: string }[]).map((m) => describeModel(p, String(m.id)))
    }
    if (p.id !== 'google') throw e
    // Native Gemini listing as a fallback for the OpenAI-compatible one.
    const native = await request(`${baseOf(p, key)}/v1beta/models?pageSize=1000&key=${encodeURIComponent(key)}`, { signal }).catch(() => Promise.reject(e))
    json = {
      data: ((native.models ?? []) as { name: string; displayName?: string; supportedGenerationMethods?: string[] }[]).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => ({ id: m.name, display_name: m.displayName })),
    }
  }
  const data = (json.data ?? []) as Record<string, unknown>[]
  let rows: Listed[]
  if (p.url) rows = ((json.models ?? []) as { name?: string; model?: string }[]).map((m) => ({ id: String(m.name ?? m.model ?? '') }))
  else if (p.api === 'anthropic') rows = data.map((m) => ({ id: String(m.id), name: m.display_name as string | undefined }))
  else if (p.id === 'google') rows = data.map((m) => ({ id: String(m.id).replace(/^models\//, ''), name: m.display_name as string | undefined })).filter((m) => /^gemini-/.test(m.id) && !GEMINI_SKIP.test(m.id))
  else if (p.id === 'mistral')
    rows = data
      .filter((m) => {
        const c = m.capabilities as { completion_chat?: boolean; function_calling?: boolean } | undefined
        return !c || (c.completion_chat !== false && c.function_calling !== false)
      })
      .filter((m) => !m.deprecation)
      .map((m) => ({ id: String(m.id), created: m.created as number | undefined }))
  else
    rows = data
      .map((m) => ({ id: String(m.id), created: m.created as number | undefined }))
      .filter((m) => /^(gpt-|chatgpt-|o\d)/.test(m.id) && !OPENAI_SKIP.test(m.id))
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
  const seen = new Set<string>()
  return rows.filter((m) => m.id && !seen.has(m.id) && seen.add(m.id)).map((m) => describeModel(p, m.id, m.name))
}

/** Sends a tiny request to verify the key, model and network path. */
export async function ping(provider: ProviderDef, model: string, key: string) {
  await complete({ provider, model, key, system: 'Reply with: ok', messages: [{ role: 'user', parts: [{ type: 'text', text: 'ping' }] }], maxTokens: 16 })
}
