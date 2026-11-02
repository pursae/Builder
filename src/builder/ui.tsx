import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'

export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')
export const spring = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 } as const
export const softSpring = { type: 'spring', stiffness: 300, damping: 32 } as const
export const ease = [0.22, 1, 0.36, 1] as const

type Side = 'bottom' | 'top' | 'right' | 'left'

/** Tooltip rendered in a portal so it never gets clipped by overflow. */
export function Tip({ label, side = 'bottom', kbd, children, className }: { label: ReactNode; side?: Side; kbd?: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const show = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const p =
        side === 'bottom'
          ? { x: r.left + r.width / 2, y: r.bottom + 8 }
          : side === 'top'
            ? { x: r.left + r.width / 2, y: r.top - 8 }
            : side === 'right'
              ? { x: r.right + 8, y: r.top + r.height / 2 }
              : { x: r.left - 8, y: r.top + r.height / 2 }
      setPos(p)
    }, 350)
  }
  const hide = () => {
    window.clearTimeout(timer.current)
    setPos(null)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const transform = { bottom: 'translate(-50%,0)', top: 'translate(-50%,-100%)', right: 'translate(0,-50%)', left: 'translate(-100%,-50%)' }[side]

  return (
    <span ref={ref} className={cn('inline-flex', className)} onMouseEnter={show} onMouseLeave={hide} onMouseDown={hide}>
      {children}
      {pos &&
        createPortal(
          <div style={{ position: 'fixed', left: pos.x, top: pos.y, transform, zIndex: 1000 }} className="pointer-events-none">
            <div className="tip-in flex items-center gap-2 whitespace-nowrap rounded-md border border-white/10 bg-[#202227] px-2 py-1.5 text-[11.5px] font-medium text-ink-100 shadow-xl shadow-black/40">
              {label}
              {kbd && <span className="rounded bg-white/10 px-1 py-px font-mono text-[10px] text-ink-300">{kbd}</span>}
            </div>
          </div>,
          document.body,
        )}
    </span>
  )
}

export function IconBtn({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  side = 'bottom',
  kbd,
  size = 34,
  className,
  iconSize = 17,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  side?: Side
  kbd?: string
  size?: number
  className?: string
  iconSize?: number
}) {
  return (
    <Tip label={label} side={side} kbd={kbd}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        style={{ width: size, height: size }}
        className={cn(
          'grid place-items-center rounded-md transition-colors duration-150',
          active ? 'bg-accent/15 text-accent-soft' : 'text-ink-300 hover:bg-white/[0.06] hover:text-ink-100',
          disabled && 'pointer-events-none opacity-35',
          className,
        )}
      >
        <Icon size={iconSize} strokeWidth={1.75} />
      </button>
    </Tip>
  )
}

/** Segmented control with a sliding indicator. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  size = 'md',
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: LucideIcon }[]
  id: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const h = size === 'lg' ? 'h-10 text-[13.5px]' : size === 'md' ? 'h-8 text-[12.5px]' : 'h-7 text-[11.5px]'
  return (
    <div className={cn('flex rounded-[10px] bg-black/30 p-[3px] ring-1 ring-white/[0.06]', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn('relative flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 font-medium transition-colors', h, on ? 'text-ink-100' : 'text-ink-400 hover:text-ink-200')}
          >
            {on && <motion.span layoutId={id} transition={spring} className="absolute inset-0 rounded-[8px] bg-ink-700 shadow-[0_1px_2px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.06)]" />}
            {o.icon && <o.icon size={14} className="relative" strokeWidth={1.9} />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn('relative h-[18px] w-8 shrink-0 rounded-full transition-colors duration-200', on ? 'bg-accent' : 'bg-ink-600')}
    >
      <motion.span layout transition={spring} className={cn('absolute top-[2px] size-[14px] rounded-full bg-white shadow', on ? 'right-[2px]' : 'left-[2px]')} />
    </button>
  )
}
