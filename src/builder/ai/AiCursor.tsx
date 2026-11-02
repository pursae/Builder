import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { useAi } from './AiProvider'

interface R {
  l: number
  t: number
  w: number
  h: number
}

/** Shows where the AI is working: a highlight box plus a moving cursor. */
export function AiCursor({ page }: { page: React.RefObject<HTMLDivElement | null> }) {
  const ai = useAi()
  const f = ai.focus
  const [rect, setRect] = useState<R | null>(null)
  const last = useRef<R | null>(null)

  useLayoutEffect(() => {
    if (!f) {
      setRect(null)
      return
    }
    const root = page.current
    if (!root) return
    const sel = f.target.el ? `[data-el="${f.target.sectionId}:${f.target.el}"]` : `[data-section="${f.target.sectionId}"]`
    let node: HTMLElement | null = null
    let ro: ResizeObserver | null = null
    let tries = 0
    let poll = 0
    const measure = () => {
      if (!node) return
      const r = node.getBoundingClientRect()
      const fr = root.getBoundingClientRect()
      const next = { l: r.left - fr.left, t: r.top - fr.top, w: r.width, h: r.height }
      last.current = next
      setRect(next)
    }
    const find = () => {
      node = root.querySelector<HTMLElement>(sel) ?? (f.target.el ? root.querySelector<HTMLElement>(`[data-section="${f.target.sectionId}"]`) : null)
      if (!node) {
        if (tries++ < 12) poll = window.setTimeout(find, 100)
        return
      }
      node.scrollIntoView({ block: f.target.el ? 'center' : 'nearest', behavior: 'smooth' })
      measure()
      ro = new ResizeObserver(measure)
      ro.observe(node)
      poll = window.setInterval(measure, 250)
    }
    find()
    return () => {
      ro?.disconnect()
      window.clearTimeout(poll)
      window.clearInterval(poll)
    }
  }, [f, page])

  const show = ai.running && (rect ?? last.current)
  const cur = rect ?? last.current
  return (
    <>
      <AnimatePresence>
        {rect && f && (
          <motion.div
            key="hl"
            className="pointer-events-none absolute z-[46] rounded-lg"
            initial={{ opacity: 0, left: rect.l - 6, top: rect.t - 6, width: rect.w + 12, height: rect.h + 12 }}
            animate={{ opacity: 1, left: rect.l - 6, top: rect.t - 6, width: rect.w + 12, height: rect.h + 12 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            style={{ boxShadow: '0 0 0 2px #a78bfa, 0 0 0 7px rgba(167,139,250,.18), 0 0 40px rgba(139,92,246,.35)' }}
          >
            <span className="absolute -top-7 left-0 flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#4f6af7] px-2.5 py-1 text-[10.5px] font-semibold text-white shadow-lg">
              <Sparkles size={11} /> {f.label.replace(/(edildi|yapıldı|yazıldı|eklendi|değiştirildi|ayarlandı)$/, (m) => ({ edildi: 'ediliyor', yapıldı: 'yapılıyor', yazıldı: 'yazılıyor', eklendi: 'ekleniyor', değiştirildi: 'değiştiriliyor', ayarlandı: 'ayarlanıyor' })[m] ?? m)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {show && cur && (
          <motion.div
            key="cursor"
            className="pointer-events-none absolute left-0 top-0 z-[47]"
            initial={{ opacity: 0, x: cur.l + Math.min(cur.w, 600) - 8, y: cur.t + Math.min(cur.h, 260) - 4 }}
            animate={{ opacity: 1, x: cur.l + Math.min(cur.w, 600) - 8, y: cur.t + Math.min(cur.h, 260) - 4 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-[0_2px_6px_rgba(0,0,0,.4)]">
              <path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#8b5cf6" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="ml-4 mt-0.5 block w-fit whitespace-nowrap rounded-md bg-[#8b5cf6] px-1.5 py-0.5 text-[10.5px] font-semibold text-white shadow-md">Pursae AI</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
