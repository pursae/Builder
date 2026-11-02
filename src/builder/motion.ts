import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { EasingId, ElStyle, EntranceId, HoverId, MotionSettings, Section, SectionStyle } from './types'
import './motion.css'

/* ---------- Presets ---------- */
export const ENTRANCES: { id: EntranceId; label: string; heavy?: boolean }[] = [
  { id: 'none', label: 'Yok' },
  { id: 'fade', label: 'Belirme' },
  { id: 'fade-up', label: 'Aşağıdan belirme' },
  { id: 'fade-down', label: 'Yukarıdan belirme' },
  { id: 'fade-left', label: 'Soldan belirme' },
  { id: 'fade-right', label: 'Sağdan belirme' },
  { id: 'zoom-in', label: 'Yakınlaşma' },
  { id: 'zoom-out', label: 'Uzaklaşma' },
  { id: 'slide-up', label: 'Aşağıdan kayma', heavy: true },
  { id: 'slide-left', label: 'Soldan kayma', heavy: true },
  { id: 'slide-right', label: 'Sağdan kayma', heavy: true },
  { id: 'blur', label: 'Bulanıktan netleşme' },
  { id: 'flip', label: 'Çevrilme', heavy: true },
  { id: 'bounce', label: 'Zıplama', heavy: true },
]

export const EASINGS: { id: EasingId; label: string; css: string }[] = [
  { id: 'smooth', label: 'Yumuşak', css: 'cubic-bezier(.22,1,.36,1)' },
  { id: 'ease-out', label: 'Yavaşlayarak', css: 'cubic-bezier(0,0,.2,1)' },
  { id: 'ease-in-out', label: 'Hızlan · yavaşla', css: 'cubic-bezier(.65,0,.35,1)' },
  { id: 'ease', label: 'Standart', css: 'ease' },
  { id: 'spring', label: 'Esnek (taşma)', css: 'cubic-bezier(.34,1.56,.64,1)' },
  { id: 'linear', label: 'Doğrusal', css: 'linear' },
]

export const HOVERS: { id: HoverId; label: string }[] = [
  { id: 'none', label: 'Yok' },
  { id: 'lift', label: 'Yukarı kalk' },
  { id: 'glow', label: 'Parıltı' },
  { id: 'scale', label: 'Büyüt' },
]

export type Motion = Required<MotionSettings>

export const MOTION_DEFAULTS: Motion = {
  entrance: 'none',
  duration: 700,
  delay: 0,
  easing: 'smooth',
  repeat: false,
  stagger: false,
  staggerDelay: 90,
  parallax: 0,
  parallaxTarget: 'bg',
  scrollFade: false,
  scrollScale: false,
  sticky: false,
  hover: 'none',
  hoverTarget: 'self',
}

/** Old `style.anim` values. */
const LEGACY: Record<string, EntranceId> = { fade: 'fade', up: 'fade-up', zoom: 'zoom-in', left: 'fade-left' }
export const legacyEntrance = (anim?: string): EntranceId | undefined => (anim ? LEGACY[anim] : undefined)

export function getMotion(s: Section): Motion {
  const m = s.style.motion
  return { ...MOTION_DEFAULTS, ...m, entrance: m?.entrance ?? legacyEntrance(s.style.anim) ?? 'none' }
}

export const getElMotion = (es?: ElStyle): Motion => ({ ...MOTION_DEFAULTS, ...es?.motion })

/** Style patch for the section; folds the legacy `anim` field into `motion`. */
export function motionPatch(s: Section, patch: MotionSettings): Partial<SectionStyle> {
  const legacy = legacyEntrance(s.style.anim)
  return { motion: { ...(legacy ? { entrance: legacy } : {}), ...s.style.motion, ...patch }, anim: undefined }
}

export const hasEntrance = (m: MotionSettings) => !!m.entrance && m.entrance !== 'none'
export const hasScrollFx = (m: MotionSettings) => !!m.parallax || !!m.scrollFade || !!m.scrollScale
export const isHeavy = (m: MotionSettings) => !!ENTRANCES.find((e) => e.id === m.entrance)?.heavy || !!m.parallax || !!m.sticky
export const entranceLabel = (id: EntranceId) => ENTRANCES.find((e) => e.id === id)?.label ?? id

/** Non-default motion fields (AI page context); undefined when the section has no motion. */
export function motionSummary(s: Section): Partial<Motion> | undefined {
  const m = getMotion(s)
  const out = Object.fromEntries(Object.entries(m).filter(([k, v]) => v !== MOTION_DEFAULTS[k as keyof Motion])) as Partial<Motion>
  if (m.entrance === 'none') for (const k of ['duration', 'delay', 'easing', 'repeat', 'stagger', 'staggerDelay'] as const) delete out[k]
  if (!m.parallax) delete out.parallaxTarget
  if (m.hover === 'none') delete out.hoverTarget
  return Object.keys(out).length ? out : undefined
}

/** Section attributes for the CSS-only effects (sticky, hover); preview / live output only. */
export function motionAttrs(s: Section, live: boolean): { 'data-msticky'?: string; 'data-mhover'?: HoverId; 'data-mhover-on'?: 'self' | 'items' } {
  if (!live) return {}
  const m = getMotion(s)
  return {
    ...(m.sticky ? { 'data-msticky': '' } : {}),
    ...(m.hover !== 'none' ? { 'data-mhover': m.hover, 'data-mhover-on': m.hoverTarget } : {}),
  }
}

/* ---------- Keyframes ---------- */
const T0 = 'translate3d(0,0,0)'
const move = (x: number, y: number): Keyframe[] => [
  { opacity: 0, transform: `translate3d(${x}px,${y}px,0)` },
  { opacity: 1, transform: T0 },
]
const slide = (x: number, y: number): Keyframe[] => [{ opacity: 0, transform: `translate3d(${x}px,${y}px,0)` }, { opacity: 1, offset: 0.35 }, { opacity: 1, transform: T0 }]

const FRAMES: Record<Exclude<EntranceId, 'none'>, Keyframe[]> = {
  fade: [{ opacity: 0 }, { opacity: 1 }],
  'fade-up': move(0, 40),
  'fade-down': move(0, -40),
  'fade-left': move(-48, 0),
  'fade-right': move(48, 0),
  'zoom-in': [
    { opacity: 0, transform: 'scale(.86)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
  'zoom-out': [
    { opacity: 0, transform: 'scale(1.14)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
  'slide-up': slide(0, 120),
  'slide-left': slide(-140, 0),
  'slide-right': slide(140, 0),
  blur: [
    { opacity: 0, filter: 'blur(14px)', transform: 'scale(1.03)' },
    { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' },
  ],
  flip: [
    { opacity: 0, transformOrigin: '50% 0%', transform: 'perspective(1200px) rotateX(-38deg) translate3d(0,24px,0)' },
    { opacity: 1, transformOrigin: '50% 0%', transform: `perspective(1200px) rotateX(0deg) ${T0}` },
  ],
  bounce: [
    { opacity: 0, transform: 'translate3d(0,64px,0)' },
    { opacity: 1, transform: 'translate3d(0,-10px,0)', offset: 0.55 },
    { transform: 'translate3d(0,4px,0)', offset: 0.78 },
    { opacity: 1, transform: T0 },
  ],
}

export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Track {
  el: HTMLElement
  m: Motion
  /** Extra delay (stagger), ms. */
  offset: number
}

/** Paused at its first frame (hidden) until played; leaves no styles behind when finished or cancelled. */
function arm(t: Track, reduced: boolean): Animation | null {
  if (!hasEntrance(t.m) || typeof t.el.animate !== 'function') return null
  const frames = reduced ? FRAMES.fade : FRAMES[t.m.entrance as Exclude<EntranceId, 'none'>]
  const a = t.el.animate(frames, {
    duration: reduced ? Math.min(t.m.duration, 300) : t.m.duration,
    delay: reduced ? Math.min(t.offset, 120) : t.m.delay + t.offset,
    easing: EASINGS.find((e) => e.id === t.m.easing)?.css ?? 'ease',
    fill: 'backwards',
  })
  a.pause()
  return a
}

/* ---------- Targets ---------- */
const shown = (el: Element): el is HTMLElement => el instanceof HTMLElement && !(el instanceof HTMLStyleElement) && el.getClientRects().length > 0

/** Content blocks for staggering: unwraps single-child wrappers and expands card grids into their cards. */
function blocks(root: Element, depth = 0): HTMLElement[] {
  let el = root
  while (el.children.length === 1) el = el.children[0]
  return Array.from(el.children)
    .filter(shown)
    .flatMap((c) => {
      if (c.matches('[data-grid]')) return Array.from(c.children).filter(shown)
      if (depth < 3 && c.querySelector('[data-grid]')) return blocks(c, depth + 1)
      return [c]
    })
}

function tracks(root: HTMLElement, sectionId: string, m: Motion, els: [string, Motion][]) {
  const own = els.map(([key, em]) => ({ el: root.querySelector<HTMLElement>(`[data-el="${sectionId}:${CSS.escape(key)}"]`), m: em })).filter((t): t is { el: HTMLElement; m: Motion } => !!t.el)
  const mine = new Set(own.map((t) => t.el))
  const list = hasEntrance(m) ? (m.stagger ? blocks(root) : Array.from(root.children).filter(shown)).filter((el) => !mine.has(el)).slice(0, 48) : []
  return {
    section: list.map((el, i) => ({ el, m, offset: m.stagger ? Math.min(i * m.staggerDelay, 1500) : 0 })),
    own: own.map((t) => ({ ...t, offset: 0 })),
  }
}

/* ---------- Replay ("Önizle" in the inspector) ---------- */
const REPLAY = 'builder:motion-replay'

export function replayMotion(sectionId: string, el?: string) {
  const node = document.querySelector<HTMLElement>(`[data-section="${sectionId}"]`)
  const fire = () => window.dispatchEvent(new CustomEvent(REPLAY, { detail: { id: sectionId, el } }))
  if (!node) return fire()
  const r = node.getBoundingClientRect()
  const inView = r.top < window.innerHeight * 0.8 && r.bottom > 80
  if (inView) return fire()
  node.scrollIntoView({ block: 'start', behavior: 'smooth' })
  window.setTimeout(fire, 450)
}

/* ---------- Scroll effects ---------- */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if (o === 'auto' || o === 'scroll') return p
  }
  return null
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

function scrollFx(section: HTMLElement, content: HTMLElement, m: Motion) {
  const scroller = scrollParent(section)
  const layers = m.parallax && m.parallaxTarget === 'bg' ? Array.from(section.querySelector(':scope > [data-mbg]')?.children ?? []).filter((c): c is HTMLElement => c instanceof HTMLElement) : []
  const moveContent = !!m.parallax && m.parallaxTarget === 'content'
  const prevTransition = content.style.transitionProperty
  if (m.scrollFade) content.style.transitionProperty = 'none'
  let frame = 0
  const update = () => {
    frame = 0
    const vp = scroller ? scroller.getBoundingClientRect() : { top: 0, height: window.innerHeight }
    const r = section.getBoundingClientRect()
    // -1: leaving at the top, 0: centered, 1: entering at the bottom.
    const p = clamp((r.top + r.height / 2 - (vp.top + vp.height / 2)) / (vp.height / 2 + r.height / 2), -1, 1)
    if (layers.length) {
      const amp = Math.abs(m.parallax) * 1.2
      const y = -p * amp * Math.sign(m.parallax)
      const sc = 1 + (2 * amp) / Math.max(r.height, 1) + 0.01
      for (const l of layers) {
        l.style.translate = `0 ${y.toFixed(1)}px`
        l.style.scale = sc.toFixed(4)
      }
    }
    const ty = moveContent ? p * m.parallax * 0.8 : 0
    content.style.translate = ty ? `0 ${ty.toFixed(1)}px` : ''
    content.style.scale = m.scrollScale ? (1 - smooth(0.3, 1, Math.abs(p)) * 0.12).toFixed(4) : ''
    content.style.opacity = m.scrollFade ? (1 - smooth(0.35, 0.95, Math.abs(p)) * 0.9).toFixed(3) : ''
  }
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }
  update()
  const target: HTMLElement | Window = scroller ?? window
  target.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  return () => {
    cancelAnimationFrame(frame)
    target.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    for (const l of layers) {
      l.style.translate = ''
      l.style.scale = ''
    }
    content.style.translate = ''
    content.style.scale = ''
    content.style.opacity = ''
    content.style.transitionProperty = prevTransition
  }
}

/* ---------- Hook used by the canvas frame ---------- */
/**
 * Entrance animations and scroll effects for one section. `live` (preview / published page) plays them on
 * scroll; while editing nothing is hidden and only the inspector's "Önizle" replays the entrance.
 * Content stays visible if this never runs (progressive enhancement).
 */
export function useSectionMotion(ref: RefObject<HTMLElement | null>, s: Section, live: boolean) {
  const m = getMotion(s)
  const els = Object.entries(s.els ?? {})
    .filter(([, es]) => es.motion && hasEntrance(es.motion))
    .map(([k, es]) => [k, getElMotion(es)] as [string, Motion])
  const sig = JSON.stringify([m, els])
  const cfg = useRef({ m, els })
  cfg.current = { m, els }

  useLayoutEffect(() => {
    const root = ref.current
    const section = root?.closest<HTMLElement>('[data-section]')
    if (!root || !section) return
    const { m, els } = cfg.current
    const reduced = reducedMotion()
    const cleanups: (() => void)[] = []
    let replaying: Animation[] = []

    if (live) {
      const { section: list, own } = tracks(root, s.id, m, els)
      const groups = [...(list.length ? [{ trigger: root, items: list, repeat: m.repeat }] : []), ...own.map((t) => ({ trigger: t.el, items: [t], repeat: t.m.repeat }))]
      for (const g of groups) {
        let anims = g.items.map((t) => arm(t, reduced))
        let played = false
        const enter = new IntersectionObserver(
          (entries) => {
            if (!played && entries.some((e) => e.isIntersecting)) {
              played = true
              anims.forEach((a) => a?.play())
            }
          },
          { rootMargin: '0px 0px -12% 0px' },
        )
        enter.observe(g.trigger)
        const exit = g.repeat
          ? new IntersectionObserver((entries) => {
              if (played && entries.every((e) => !e.isIntersecting)) {
                played = false
                anims.forEach((a) => a?.cancel())
                anims = g.items.map((t) => arm(t, reduced))
              }
            })
          : null
        exit?.observe(g.trigger)
        cleanups.push(() => {
          enter.disconnect()
          exit?.disconnect()
          anims.forEach((a) => a?.cancel())
        })
      }
      if (!reduced && hasScrollFx(m)) cleanups.push(scrollFx(section, root, m))
    }

    const onReplay = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; el?: string }>).detail
      if (d?.id !== s.id) return
      replaying.forEach((a) => a.cancel())
      const { m, els } = cfg.current
      const t = tracks(root, s.id, d.el ? MOTION_DEFAULTS : m, d.el ? els.filter(([k]) => k === d.el) : els)
      replaying = [...t.section, ...t.own].map((x) => arm(x, reduced)).filter((a): a is Animation => !!a)
      replaying.forEach((a) => a.play())
    }
    window.addEventListener(REPLAY, onReplay)

    return () => {
      window.removeEventListener(REPLAY, onReplay)
      replaying.forEach((a) => a.cancel())
      cleanups.forEach((f) => f())
    }
  }, [ref, s.id, sig, live])
}
