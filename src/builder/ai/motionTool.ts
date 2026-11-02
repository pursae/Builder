import { fieldLabel } from '../data'
import { EASINGS, ENTRANCES, HOVERS, entranceLabel, motionPatch } from '../motion'
import type { MotionSettings } from '../types'
import type { Step } from './agent'
import type { ToolCall, ToolCtx, ToolDef, ToolPlan } from './tools'

type Schema = Record<string, unknown>
const str = (description: string): Schema => ({ type: 'string', description })
const num = (description: string): Schema => ({ type: 'number', description })
const bool = (description: string): Schema => ({ type: 'boolean', description })
const oneOf = (values: readonly string[], description: string): Schema => ({ type: 'string', enum: values, description })

export const MOTION_TOOLS: ToolDef[] = [
  {
    name: 'set_motion',
    description:
      'Bölüme ya da tek bir öğeye hareket efekti verir: giriş animasyonu (ekrana girince oynar), alt öğeleri sırayla canlandırma (kart ızgaraları için ideal), kaydırma efektleri (parallax, solma, küçülme, yapışkan) ve fareyle üzerine gelme efekti. el verilirse yalnızca o öğenin giriş animasyonu (entrance, duration, delay, easing, repeat) ayarlanır. Yalnızca değiştirmek istediğin alanları gönder; entrance "none" animasyonu kaldırır. Efektler önizlemede ve yayında oynar, editörde içerik gizlenmez.',
    parameters: {
      type: 'object',
      properties: {
        section_id: str('Sayfa bağlamındaki bölüm id'),
        el: str('İsteğe bağlı öğe alanı (ör. title, primary, image, items.<id>.title); verilmezse bölümün kendisi'),
        entrance: oneOf(
          ENTRANCES.map((e) => e.id),
          'Giriş animasyonu. Sakin: fade, fade-up, zoom-in, blur. Hareketli (az kullan): slide-*, flip, bounce.',
        ),
        duration: num('Süre ms (100-2500, varsayılan 700)'),
        delay: num('Gecikme ms (0-3000)'),
        easing: oneOf(
          EASINGS.map((e) => e.id),
          'Yumuşatma (varsayılan smooth)',
        ),
        repeat: bool('Her görünüşte tekrar oynat (varsayılan: bir kez)'),
        stagger: bool('Bölüm: alt blokları / kartları sırayla canlandır'),
        stagger_delay: num('Sırayla canlandırma aralığı ms (20-500, varsayılan 90)'),
        parallax: num('Bölüm: parallax hızı -100…100, 0 kapalı (ör. 30)'),
        parallax_target: oneOf(['bg', 'content'], 'Parallax katmanı: bg (arka plan görseli/gradyan/dekor) ya da content'),
        scroll_fade: bool('Bölüm: kaydırırken kenarlarda solma'),
        scroll_scale: bool('Bölüm: kaydırırken kenarlarda hafif küçülme'),
        sticky: bool('Bölüm: üstte yapışkan kalır (genelde yalnızca üst menü)'),
        hover: oneOf(
          HOVERS.map((h) => h.id),
          'Bölüm: fareyle üzerine gelme efekti',
        ),
        hover_target: oneOf(['self', 'items'], 'Hover efektinin hedefi: self (bölüm) ya da items (kartlar/hücreler)'),
      },
      required: ['section_id'],
    },
  },
]

const n_ = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined)
const b_ = (v: unknown) => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : undefined)
const clamp = (v: number, a: number, b: number) => Math.round(Math.min(b, Math.max(a, v)))

export function planMotionTool(call: ToolCall, ctx: ToolCtx): ToolPlan | null {
  if (call.name !== 'set_motion') return null
  const a = call.input ?? {}
  const s = ctx.doc.sections.find((x) => x.id === a.section_id)
  if (!s) return { error: `"${String(a.section_id)}" id'li bölüm yok. Mevcut id'ler: ${ctx.doc.sections.map((x) => `${x.id} (${x.name})`).join(', ')}` }
  const el = typeof a.el === 'string' && a.el ? a.el : undefined
  if (el?.startsWith('items.') && !s.items.some((i) => i.id === el.split('.')[1])) return { error: `"${s.name}" içinde ${el} öğesi yok.` }

  const p: MotionSettings = {}
  const bad: string[] = []
  const pickEnum = <K extends keyof MotionSettings>(key: K, input: string, values: readonly string[]) => {
    if (!(input in a) || a[input] == null) return
    if (values.includes(String(a[input]))) p[key] = String(a[input]) as MotionSettings[K]
    else bad.push(`${input}: ${values.join(', ')}`)
  }
  const pickNum = (key: 'duration' | 'delay' | 'staggerDelay' | 'parallax', input: string, min: number, max: number) => {
    const v = n_(a[input])
    if (v !== undefined) p[key] = clamp(v, min, max)
  }
  const pickBool = (key: 'repeat' | 'stagger' | 'scrollFade' | 'scrollScale' | 'sticky', input: string) => {
    const v = b_(a[input])
    if (v !== undefined) p[key] = v
  }
  pickEnum('entrance', 'entrance', ENTRANCES.map((e) => e.id))
  pickEnum('easing', 'easing', EASINGS.map((e) => e.id))
  pickNum('duration', 'duration', 100, 2500)
  pickNum('delay', 'delay', 0, 3000)
  pickBool('repeat', 'repeat')
  if (!el) {
    pickBool('stagger', 'stagger')
    pickNum('staggerDelay', 'stagger_delay', 20, 500)
    pickNum('parallax', 'parallax', -100, 100)
    pickEnum('parallaxTarget', 'parallax_target', ['bg', 'content'])
    pickBool('scrollFade', 'scroll_fade')
    pickBool('scrollScale', 'scroll_scale')
    pickBool('sticky', 'sticky')
    pickEnum('hover', 'hover', HOVERS.map((h) => h.id))
    pickEnum('hoverTarget', 'hover_target', ['self', 'items'])
  }
  if (bad.length) return { error: `Geçersiz değer. ${bad.join(' · ')}` }
  if (!Object.keys(p).length) return { error: el ? 'Öğeler için yalnızca entrance, duration, delay, easing ve repeat ayarlanır.' : 'Değiştirilecek alan verilmedi.' }

  const what = p.entrance ? (p.entrance === 'none' ? 'animasyonu kaldırıldı' : `${entranceLabel(p.entrance).toLocaleLowerCase('tr')} animasyonu verildi`) : 'hareket efekti ayarlandı'
  // Re-read the section when the step runs: earlier steps of the same turn may have changed its motion.
  const step: Step = el
    ? {
        kind: 'do',
        label: `${s.name} › ${fieldLabel(s, el)} ${what}`,
        target: { sectionId: s.id, el },
        run: (api) => {
          const cur = api.doc.sections.find((x) => x.id === s.id) ?? s
          api.dispatch({ type: 'elStyle', id: s.id, el, patch: { motion: { ...cur.els?.[el]?.motion, ...p } } })
        },
      }
    : {
        kind: 'do',
        label: `${s.name} ${what}`,
        target: { sectionId: s.id },
        run: (api) => api.dispatch({ type: 'style', id: s.id, patch: motionPatch(api.doc.sections.find((x) => x.id === s.id) ?? s, p), label: 'AI hareket efekti' }),
      }
  return { steps: [step], result: { ok: true, note: 'Efektler önizlemede (editor_ui preview_on) görülür.' }, target: { sectionId: s.id, el } }
}

export function describeMotionCall(call: ToolCall, ctx: Pick<ToolCtx, 'doc'>): string | null {
  if (call.name !== 'set_motion') return null
  const s = ctx.doc.sections.find((x) => x.id === call.input?.section_id)
  return `${s?.name ?? 'Bölüm'} hareket efekti ayarlandı`
}
