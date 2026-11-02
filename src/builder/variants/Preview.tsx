import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { CORNERS, paletteVars } from '../data'
import { siteFontVars } from '../fonts'
import { SectionBackground } from '../Decor'
import { RENDERERS, containerFrameStyle, framePad } from '../sections'
import { BuilderCtx, useB, type BuilderApi } from '../store'
import type { Section, SiteSettings } from '../types'
import { cn } from '../ui'

/** Read-only builder context for previews: live-page rendering, nothing selectable. */
export function PreviewCtx({ children }: { children: ReactNode }) {
  const b = useB()
  const site = b.doc.site
  // Only the page matters to a preview; recreating it on every editor state change would re-render all thumbnails.
  const value = useMemo<BuilderApi>(() => ({ ...b, preview: true, selection: null, activeField: null, hoverSection: null, focusReq: null, dragging: null }), [site, b.mode, b.doc.sections])
  return (
    <BuilderCtx.Provider value={value}>
      <MotionConfig reducedMotion="always">{children}</MotionConfig>
    </BuilderCtx.Provider>
  )
}

export function pageVars(site: SiteSettings): CSSProperties {
  const corner = CORNERS[site.corners]
  return { '--brand': site.brand, '--r-card': `${corner.card}px`, '--r-btn': `${corner.btn}px`, ...siteFontVars(site) } as CSSProperties
}

/** One section drawn like on the live page (no editor chrome). Needs a PreviewCtx above it. */
export const SectionView = memo(function SectionView({ s, brand }: { s: Section; brand: string }) {
  const R = RENDERERS[s.kind]
  return (
    <section className="sf" style={{ ...paletteVars(s.style.palette, brand, s.style.bg), background: 'var(--bg)', color: 'var(--fg)', ...containerFrameStyle(s) }}>
      {s.style.css && <style>{s.style.css.replace(/\bselector\b/g, `[data-section="${s.id}"]`)}</style>}
      <SectionBackground s={s} />
      <div className="relative z-[1]" style={framePad(s)}>
        <R s={s} />
      </div>
    </section>
  )
})

/** A page fragment (sections stacked) at `width` px, like the canvas page. */
export function PageView({ sections, width, site, className, style }: { sections: Section[]; width: number; site: SiteSettings; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn('cv @container relative bg-white text-left', className)} data-preview="true" data-mode="basic" style={{ ...pageVars(site), width, ...style }}>
      {sections.map((s) => (
        <SectionView key={s.id} s={s} brand={site.brand} />
      ))}
    </div>
  )
}

/** Becomes true once the element scrolls near the viewport (and stays true). */
export function useSeen<T extends HTMLElement>(margin = '400px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || seen) return
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: margin })
    io.observe(node)
    return () => io.disconnect()
  }, [seen, margin])
  return { ref, seen }
}

/**
 * Scaled live thumbnail: renders the page fragment at `width` px and scales it into the frame
 * (`frameW` × `frameH`), lazily once visible. `anchor` = which end stays visible when cropped.
 */
export function Thumb({ sections, width, frameW, frameH, anchor = 'top', site, className }: { sections: Section[]; width: number; frameW: number; frameH: number; anchor?: 'top' | 'bottom'; site: SiteSettings; className?: string }) {
  const { ref, seen } = useSeen<HTMLDivElement>()
  const k = frameW / width
  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)} style={{ width: frameW, height: frameH }} aria-hidden inert>
      {seen ? (
        <div className={cn('absolute left-0 origin-top-left', anchor === 'bottom' ? 'bottom-0' : 'top-0')} style={{ transform: `scale(${k})`, transformOrigin: anchor === 'bottom' ? 'bottom left' : 'top left' }}>
          <PageView sections={sections} width={width} site={site} style={{ minHeight: frameH / k }} />
        </div>
      ) : (
        <div className="absolute inset-0 animate-pulse bg-white/[0.04]" />
      )}
    </div>
  )
}
