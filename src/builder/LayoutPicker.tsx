import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { FLEX_STRUCTURES, GRID_STRUCTURES, getStructure, loadJSON, saveJSON } from './data'
import { useB } from './store'
import type { LayoutType, Section, Structure } from './types'
import { Segmented, cn, ease } from './ui'

type Tone = 'light' | 'dark'
export type ContentWidth = 'boxed' | 'full'

const TONES = {
  light: {
    title: '#2b2f36',
    sub: '#6b7079',
    block: '#50555c',
    dash: '#6b7079',
    band: 'rgba(0,0,0,.045)',
    back: 'text-[#50555c] hover:bg-black/[0.06]',
    seg: 'bg-white ring-1 ring-black/[0.08]',
    segOn: 'bg-[#2b2f36] text-white shadow-sm',
    segOff: 'text-[#6b7079] hover:text-[#2b2f36]',
  },
  dark: {
    title: '#eef0f3',
    sub: '#8a8f9a',
    block: '#4a4e57',
    dash: '#8a8f9a',
    band: 'rgba(255,255,255,.05)',
    back: 'text-ink-300 hover:bg-white/[0.07]',
    seg: 'bg-black/30 ring-1 ring-white/[0.06]',
    segOn: 'bg-ink-700 text-ink-100 shadow-sm',
    segOff: 'text-ink-400 hover:text-ink-200',
  },
}

/** lg: canvas add zone · sm: Basic panel · xs: inline inside a layout cell. */
type Size = 'lg' | 'sm' | 'xs'
const SIZES = {
  lg: { title: 'text-[22px]', head: 'mb-7', desc: 'text-[13px]', typeGap: 'gap-4', typeTile: 'w-[176px] p-2.5', typeName: 'mt-3 text-[14px]', typeSub: 'text-[12px]', grid: 'mx-auto max-w-[940px] grid-cols-3 gap-x-6 gap-y-5 @3xl:grid-cols-6', arrow: 16 },
  sm: { title: 'text-[14px]', head: 'mb-4', desc: 'text-[11.5px]', typeGap: 'gap-2.5', typeTile: 'flex-1 p-2', typeName: 'mt-2.5 text-[13px]', typeSub: 'text-[11px]', grid: 'grid-cols-3 gap-2.5', arrow: 14 },
  xs: { title: 'text-[12.5px]', head: 'mb-3', desc: 'text-[11px]', typeGap: 'gap-2', typeTile: 'w-[112px] p-1.5', typeName: 'mt-2 text-[12px]', typeSub: 'text-[10.5px]', grid: 'grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5', arrow: 11 },
}

const TYPES: { type: LayoutType; name: string; sub: string; st: string }[] = [
  { type: 'flex', name: 'Flexbox', sub: 'Esnek satır ve sütunlar', st: '25-50-25' },
  { type: 'grid', name: 'Grid', sub: 'Eşit hücreli ızgara', st: 'g3x2' },
]

const WIDTH_KEY = 'pursae-builder:layout-width'

export function StructureThumb({ st, tone, dashed, className, arrow = 16 }: { st: Structure; tone: Tone; dashed?: boolean; className?: string; arrow?: number }) {
  const t = TONES[tone]
  return (
    <div
      className={cn('grid', dashed ? 'gap-0' : 'gap-[2px]', className)}
      style={{ gridTemplateColumns: `repeat(${st.cols}, 1fr)`, gridTemplateRows: `repeat(${st.rows}, 1fr)` }}
    >
      {st.cells.map(([x, y, w, h], i) => (
        <span
          key={i}
          className="grid place-items-center text-white"
          style={{
            gridColumn: `${x + 1} / span ${w}`,
            gridRow: `${y + 1} / span ${h}`,
            background: dashed ? 'transparent' : t.block,
            outline: dashed ? `1.5px dashed ${t.dash}` : undefined,
            outlineOffset: dashed ? '-0.75px' : undefined,
          }}
        >
          {st.arrow === 'down' && <ArrowDown size={arrow} strokeWidth={2.2} />}
          {st.arrow === 'right' && <ArrowRight size={arrow} strokeWidth={2.2} />}
        </span>
      ))}
    </div>
  )
}

/** Arrow keys move focus between the picker's tiles. */
export function arrowNav(e: KeyboardEvent<HTMLElement>) {
  const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
  if (!dir) return
  const list = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-pick]'))
  const i = list.indexOf(document.activeElement as HTMLButtonElement)
  if (i < 0) return
  e.preventDefault()
  e.stopPropagation()
  list[(i + dir + list.length) % list.length]?.focus()
}

const tileCls = 'group rounded-md outline-none ring-accent transition-shadow hover:ring-2 focus-visible:ring-2'

/**
 * Container picker: Flexbox or Grid, then a structure. With `widthChoice` the structure step also asks
 * for the content width (boxed / full), so one click on a structure still inserts.
 */
export function LayoutPicker({
  tone,
  initialStep = 'type',
  onPick,
  compact,
  size: sizeProp,
  widthChoice,
  onBack,
}: {
  tone: Tone
  initialStep?: 'type' | LayoutType
  onPick: (type: LayoutType, structure: string, width: ContentWidth) => void
  compact?: boolean
  size?: Size
  widthChoice?: boolean
  /** Back button on the first step (e.g. to the cell's element menu). */
  onBack?: () => void
}) {
  const [step, setStep] = useState<'type' | LayoutType>(initialStep)
  const [width, setWidthState] = useState<ContentWidth>(() => (loadJSON<string>(WIDTH_KEY, 'boxed') === 'full' ? 'full' : 'boxed'))
  const setWidth = (w: ContentWidth) => {
    setWidthState(w)
    saveJSON(WIDTH_KEY, w)
  }
  const size: Size = sizeProp ?? (compact ? 'sm' : 'lg')
  const z = SIZES[size]
  const t = TONES[tone]
  const list = step === 'grid' ? GRID_STRUCTURES : FLEX_STRUCTURES
  const root = useRef<HTMLDivElement>(null)
  const boxed = widthChoice && width === 'boxed'

  // Keyboard users land on the first tile of each step.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (root.current?.contains(document.activeElement) || document.activeElement === document.body) root.current?.querySelector<HTMLElement>('[data-pick]')?.focus({ preventScroll: true })
    }, 60)
    return () => window.clearTimeout(id)
  }, [step])

  const back = (label: string | null, run: () => void) => (
    <button
      type="button"
      aria-label="Geri"
      onClick={(e) => {
        e.stopPropagation()
        run()
      }}
      className={cn('absolute left-0 flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors', size === 'lg' ? 'text-[12px]' : 'text-[11.5px]', t.back)}
    >
      <ArrowLeft size={size === 'xs' ? 13 : 14} /> {size === 'lg' && label}
    </button>
  )

  return (
    <div ref={root} onKeyDown={arrowNav}>
      <AnimatePresence mode="wait" initial={false}>
        {step === 'type' ? (
          <motion.div key="type" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease }}>
            <div className={cn('relative flex items-center justify-center', z.head)}>
              {onBack && back('Öğeler', onBack)}
              <h3 className={cn('font-semibold tracking-[-0.01em]', z.title)} style={{ color: t.title }}>
                {size === 'xs' ? 'Kapsayıcı türü' : 'Düzen türünü seç'}
              </h3>
            </div>
            <div className={cn('flex justify-center', z.typeGap)}>
              {TYPES.map((o) => (
                <button
                  key={o.type}
                  type="button"
                  data-pick
                  onClick={(e) => {
                    e.stopPropagation()
                    setStep(o.type)
                  }}
                  className={cn(tileCls, 'flex flex-col items-center text-center', z.typeTile)}
                >
                  <StructureThumb st={getStructure(o.st)} tone={tone} dashed={o.type === 'grid'} arrow={z.arrow} className="aspect-[180/88] w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                  <span className={cn('font-semibold leading-tight', z.typeName)} style={{ color: t.title }}>
                    {o.name}
                  </span>
                  {size !== 'xs' && (
                    <span className={cn('mt-0.5 leading-snug', z.typeSub)} style={{ color: t.sub }}>
                      {o.sub}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease }}>
            <div className={cn('relative flex items-center justify-center', widthChoice ? (size === 'lg' ? 'mb-4' : 'mb-3') : z.head)}>
              {back(step === 'flex' ? 'Flexbox' : 'Grid', () => setStep('type'))}
              <h3 className={cn('font-semibold tracking-[-0.01em]', z.title)} style={{ color: t.title }}>
                {size === 'xs' ? (step === 'flex' ? 'Flexbox yapısı' : 'Grid yapısı') : 'Yapını seç'}
              </h3>
            </div>
            {widthChoice && (
              <div className={cn('flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5', size === 'lg' ? 'mb-6' : 'mb-4')}>
                <div role="radiogroup" aria-label="İçerik genişliği" className={cn('inline-flex rounded-lg p-0.5', t.seg)}>
                  {(
                    [
                      { v: 'boxed', label: 'Kutulu' },
                      { v: 'full', label: 'Tam genişlik' },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={width === o.v}
                      onClick={(e) => {
                        e.stopPropagation()
                        setWidth(o.v)
                      }}
                      className={cn('flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent', width === o.v ? t.segOn : t.segOff)}
                    >
                      <WidthGlyph full={o.v === 'full'} />
                      {o.label}
                    </button>
                  ))}
                </div>
                <span className={z.desc} style={{ color: t.sub }}>
                  {width === 'boxed' ? 'İçerik 1160 px’de ortalanır' : 'İçerik kenardan kenara uzanır'}
                </span>
              </div>
            )}
            <div className={cn('grid', z.grid)}>
              {list.map((st, i) => (
                <motion.button
                  key={st.id}
                  type="button"
                  data-pick
                  aria-label={`${step === 'grid' ? 'Grid' : 'Flexbox'} · ${st.cells.length} hücre`}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.015, duration: 0.22, ease }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onPick(step, st.id, widthChoice ? width : 'boxed')
                  }}
                  className={cn(tileCls, size === 'xs' ? 'p-0.5' : 'p-1')}
                >
                  <div className={cn('flex aspect-[180/88] rounded-[3px] transition-[padding] duration-300', boxed ? 'px-[11%]' : 'px-0')} style={{ background: widthChoice ? t.band : undefined }}>
                    <StructureThumb st={st} tone={tone} dashed={step === 'grid'} arrow={z.arrow} className="h-full w-full" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function WidthGlyph({ full }: { full: boolean }) {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden className="shrink-0">
      <rect x="0.5" y="0.5" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <rect x={full ? 1.5 : 4} y="2.5" width={full ? 11 : 6} height="5" rx="0.75" fill="currentColor" />
    </svg>
  )
}

/** Change an existing layout's type and structure from a side panel. */
export function StructureChooser({ s, dense }: { s: Section; dense?: boolean }) {
  const b = useB()
  const type: LayoutType = s.content.type === 'grid' ? 'grid' : 'flex'
  const list = type === 'grid' ? GRID_STRUCTURES : FLEX_STRUCTURES
  return (
    <div className="space-y-3">
      <Segmented
        id={`ltype-${s.id}`}
        size={dense ? 'sm' : 'md'}
        value={type}
        onChange={(v) => {
          if (v === type) return
          b.dispatch({ type: 'content', id: s.id, key: 'type', value: v, label: 'Düzen türü değişti' })
          b.dispatch({ type: 'structure', id: s.id, structure: (v === 'grid' ? GRID_STRUCTURES : FLEX_STRUCTURES)[v === 'grid' ? 4 : 2].id })
        }}
        options={[
          { value: 'flex', label: 'Flexbox' },
          { value: 'grid', label: 'Grid' },
        ]}
      />
      <div className={cn('grid grid-cols-3', dense ? 'gap-1.5' : 'gap-2')}>
        {list.map((st) => {
          const on = s.content.structure === st.id
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => b.dispatch({ type: 'structure', id: s.id, structure: st.id })}
              className={cn('rounded-md p-1.5 ring-1 transition', on ? 'bg-accent/15 ring-2 ring-accent' : 'ring-white/[0.06] hover:bg-white/[0.05]')}
            >
              <StructureThumb st={st} tone="dark" dashed={type === 'grid'} className="aspect-[180/88] w-full" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
