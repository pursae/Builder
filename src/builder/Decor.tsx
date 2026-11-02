import { useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { motion } from 'motion/react'
import { Move } from 'lucide-react'
import { POSITIONED_DECOR, getBg, sanitizeSvg, sized } from './data'
import { useB } from './store'
import type { BgSettings, DecorId, Section } from './types'
import { cn } from './ui'

/** The decorative drawing itself (also used for small previews). */
export function DecorShape({ id, svg, className, style }: { id: DecorId; svg?: string; className?: string; style?: CSSProperties }) {
  const common = { viewBox: '0 0 800 800', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, className: cn('size-full', className), style }
  switch (id) {
    case 'globe':
      return (
        <svg {...common}>
          <circle cx="400" cy="400" r="390" />
          <ellipse cx="400" cy="400" rx="390" ry="150" />
          <ellipse cx="400" cy="400" rx="390" ry="290" />
          <ellipse cx="400" cy="400" rx="150" ry="390" />
          <ellipse cx="400" cy="400" rx="290" ry="390" />
          <line x1="10" y1="400" x2="790" y2="400" />
          <line x1="400" y1="10" x2="400" y2="790" />
        </svg>
      )
    case 'rings':
      return (
        <svg {...common}>
          {[60, 125, 190, 255, 320, 385].map((r) => (
            <circle key={r} cx="400" cy="400" r={r} />
          ))}
        </svg>
      )
    case 'waves':
      return (
        <svg {...common}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={i} d={`M0 ${220 + i * 60} C 130 ${160 + i * 60}, 270 ${280 + i * 60}, 400 ${220 + i * 60} S 670 ${160 + i * 60}, 800 ${220 + i * 60}`} />
          ))}
        </svg>
      )
    case 'blob':
      return <div className={cn('size-full rounded-full blur-3xl', className)} style={{ background: 'currentColor', ...style }} />
    case 'custom':
      return svg ? <div className={cn('size-full [&>svg]:size-full', className)} style={style} dangerouslySetInnerHTML={{ __html: sanitizeSvg(svg) }} /> : null
    default:
      return null
  }
}

const ANIM = {
  none: {},
  spin: { animate: { rotate: 360 }, transition: { duration: 90, repeat: Infinity, ease: 'linear' as const } },
  float: { animate: { y: [0, -18, 0] }, transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' as const } },
  pulse: { animate: { scale: [1, 1.06, 1] }, transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const } },
}

/** Background layers rendered behind a section's content. */
export function SectionBackground({ s }: { s: Section }) {
  const g = getBg(s)
  const color = g.decorColor || 'currentColor'
  const pattern = g.decor === 'dots' || g.decor === 'grid'
  const cell = Math.max(8, Math.round((48 * g.decorScale) / 100))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden data-mbg>
      {g.type === 'gradient' && <div className="absolute inset-0 transition-[background] duration-500" style={{ background: `linear-gradient(${g.gradAngle}deg, ${g.gradFrom}, ${g.gradTo})` }} />}
      {g.type === 'image' && g.image && (
        <>
          <img src={sized(g.image, 1800)} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-black transition-opacity duration-300" style={{ opacity: g.overlay / 100 }} />
        </>
      )}
      {pattern && (
        <div
          className="absolute inset-0"
          style={{
            color,
            opacity: g.decorOpacity / 100,
            backgroundImage:
              g.decor === 'dots'
                ? 'radial-gradient(currentColor 1.4px, transparent 1.6px)'
                : 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: `${cell}px ${cell}px`,
            backgroundPosition: `${g.decorX}% ${g.decorY}%`,
          }}
        />
      )}
      {POSITIONED_DECOR.includes(g.decor) && (
        <div
          className="absolute aspect-square transition-[left,top,width,opacity] duration-300"
          style={{
            left: `${g.decorX}%`,
            top: `${g.decorY}%`,
            width: `min(${Math.round(9.8 * g.decorScale)}px, ${(0.95 * g.decorScale).toFixed(1)}cqi)`,
            transform: `translate(-50%, -50%) rotate(${g.decorRotate}deg)`,
            color,
            opacity: g.decorOpacity / 100,
          }}
        >
          <motion.div key={g.decorAnim} className="size-full" {...ANIM[g.decorAnim]}>
            <DecorShape id={g.decor} svg={g.decorSvg} />
          </motion.div>
        </div>
      )}
    </div>
  )
}

/** Drag handle on the canvas to move the decor around. */
export function DecorHandle({ s }: { s: Section }) {
  const b = useB()
  const g = getBg(s)
  const [live, setLive] = useState(false)
  if (!POSITIONED_DECOR.includes(g.decor)) return null
  const start = (e: RPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const host = (e.currentTarget as HTMLElement).closest('[data-section]') as HTMLElement | null
    if (!host) return
    setLive(true)
    document.body.style.cursor = 'grabbing'
    const move = (ev: PointerEvent) => {
      const r = host.getBoundingClientRect()
      const x = Math.max(-40, Math.min(140, Math.round(((ev.clientX - r.left) / r.width) * 100)))
      const y = Math.max(-40, Math.min(140, Math.round(((ev.clientY - r.top) / r.height) * 100)))
      b.dispatch({ type: 'bg', id: s.id, patch: { decorX: x, decorY: y }, key: 'drag', label: 'Dekor taşındı' })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.cursor = ''
      setLive(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return (
    <button
      type="button"
      title="Dekoru sürükleyerek taşı"
      data-ovl-avoid
      onPointerDown={start}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute z-[19] flex h-7 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center gap-1.5 rounded-full bg-[#0ea5e9] px-2.5 text-[11px] font-semibold text-white shadow-lg transition-transform hover:scale-105 active:cursor-grabbing',
        live && 'scale-110 ring-2 ring-white/70',
      )}
      style={{ left: `clamp(40px, ${g.decorX}%, calc(100% - 40px))`, top: `clamp(20px, ${g.decorY}%, calc(100% - 20px))` }}
    >
      <Move size={13} /> Dekor
    </button>
  )
}

export type { BgSettings }
