import { useMemo, useState, type ReactNode } from 'react'
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignHorizontalDistributeCenter,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceAround,
  AlignVerticalSpaceBetween,
  AlignVerticalDistributeCenter,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Columns3,
  LayoutGrid,
  Link2,
  Monitor,
  Smartphone,
  Tablet,
  StretchHorizontal,
  StretchVertical,
  Unlink2,
  type LucideIcon,
} from 'lucide-react'
import { BRANDS, CARD_NOUN, CELL_TYPES, isCardEl, DECORS, EL_NAMES, GRID_CAPS, IMAGES, MAX_DEPTH, POSITIONED_DECOR, getBg, cellWidth, fieldKind, fieldLabel, getBox, getGrid, getValue, locate, palette, sized } from './data'
import { hasTint, isSvgSrc, normColor, svgPalette, useSvgMarkup } from './svgTint'
import { StructureChooser } from './LayoutPicker'
import { RichField } from './RichText'
import { useB } from './store'
import type { BgSettings, Box4, CellType, ContainerBox, DecorId, ElStyle, GridSettings, Section } from './types'
import { DecorShape } from './Decor'
import { IconStyleTab } from './IconInspector'
import { CardStyleTab } from './CardInspector'
import { Toggle, cn } from './ui'
import { AdvancedTab, ColorInput, Ctl, IconSeg, Panel, Select, Slider, StyleTab, inputCls } from './StudioPanel'
import { ElMotionPanel } from './MotionPanel'
import { ElFontFamily, ElFontWeight, ElTextStyle } from './TypographyControls'

const ZERO: Box4 = { t: 0, r: 0, b: 0, l: 0 }

/** Elementor-style 4-side input with link toggle. */
export function Box4Control({ label, value, onChange, hint, max = 400 }: { label: string; value: Box4; onChange: (v: Box4) => void; hint?: 'margin' | 'padding'; max?: number }) {
  const b = useB()
  const [linked, setLinked] = useState(value.t === value.r && value.r === value.b && value.b === value.l)
  const sides: [keyof Box4, string][] = [
    ['t', 'Üst'],
    ['r', 'Sağ'],
    ['b', 'Alt'],
    ['l', 'Sol'],
  ]
  return (
    <div
      onMouseEnter={() => hint && b.setBoxHint(hint)}
      onMouseLeave={() => hint && b.setBoxHint(null)}
      onFocusCapture={() => hint && b.setBoxHint(hint)}
      onBlurCapture={() => hint && b.setBoxHint(null)}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11.5px] text-ink-400">{label}</span>
        <span className="rounded bg-white/[0.06] px-1.5 py-px font-mono text-[10px] text-ink-400">px</span>
      </div>
      <div className="flex">
        {sides.map(([k, l], i) => (
          <label key={k} className="min-w-0 flex-1">
            <input
              type="number"
              min={-max}
              max={max}
              value={value[k]}
              onChange={(e) => {
                const n = Math.max(-max, Math.min(max, Number(e.target.value) || 0))
                onChange(linked ? { t: n, r: n, b: n, l: n } : { ...value, [k]: n })
              }}
              className={cn(
                'h-8 w-full border border-white/[0.08] bg-ink-850 text-center text-[12px] text-ink-100 outline-none transition [appearance:textfield] focus:relative focus:z-10 focus:border-accent/70 [&::-webkit-inner-spin-button]:appearance-none',
                i === 0 ? 'rounded-l-[5px]' : '-ml-px',
              )}
            />
            <span className="mt-1 block text-center text-[9.5px] uppercase tracking-wide text-ink-500">{l}</span>
          </label>
        ))}
        <button
          type="button"
          title={linked ? 'Bağlantıyı kopar' : 'Değerleri bağla'}
          onClick={() => {
            if (!linked) onChange({ t: value.t, r: value.t, b: value.t, l: value.t })
            setLinked(!linked)
          }}
          className={cn('-ml-px grid h-8 w-8 shrink-0 place-items-center rounded-r-[5px] border border-white/[0.08] transition-colors', linked ? 'bg-accent text-white' : 'bg-ink-850 text-ink-400 hover:text-ink-100')}
        >
          {linked ? <Link2 size={13} /> : <Unlink2 size={13} />}
        </button>
      </div>
    </div>
  )
}

function UnitSlider<U extends string>({ value, unit, units, min, max, onChange }: { value: number; unit: U; units: { u: U; min: number; max: number }[]; min?: number; max?: number; onChange: (v: number, u: U) => void }) {
  const cur = units.find((x) => x.u === unit) ?? units[0]
  return (
    <div className="flex items-center gap-1.5">
      <Slider value={value} min={min ?? cur.min} max={max ?? cur.max} unit={unit} onChange={(v) => onChange(v, unit)} />
      <select
        value={unit}
        onChange={(e) => {
          const u = e.target.value as U
          const next = units.find((x) => x.u === u)!
          onChange(Math.min(next.max, Math.max(next.min, u === '%' || u === 'vw' || u === 'vh' ? 100 : value)), u)
        }}
        className="h-7 w-[42px] appearance-none rounded-[5px] border border-white/[0.08] bg-ink-850 text-center text-[10.5px] text-ink-300 outline-none"
      >
        {units.map((x) => (
          <option key={x.u} value={x.u}>
            {x.u}
          </option>
        ))}
      </select>
    </div>
  )
}

function Stack({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11.5px] text-ink-400">{label}</span>
      {children}
    </div>
  )
}

function useBox(s: Section) {
  const b = useB()
  const bx = getBox(s)
  const set = (patch: Partial<ContainerBox>, key?: string) => b.dispatch({ type: 'box', id: s.id, patch, key })
  return { b, bx, set }
}

/* ---------- Container: Düzen ---------- */
export function ContainerLayoutTab({ s }: { s: Section }) {
  const { b, bx, set } = useBox(s)
  const grid = s.content.type === 'grid'
  const row = bx.direction.startsWith('row')
  const J: { value: ContainerBox['justify']; icon: LucideIcon; label: string }[] = row
    ? [
        { value: 'start', icon: AlignHorizontalJustifyStart, label: 'Başa' },
        { value: 'center', icon: AlignHorizontalJustifyCenter, label: 'Ortaya' },
        { value: 'end', icon: AlignHorizontalJustifyEnd, label: 'Sona' },
        { value: 'space-between', icon: AlignHorizontalSpaceBetween, label: 'Aralara dağıt' },
        { value: 'space-around', icon: AlignHorizontalSpaceAround, label: 'Çevreye dağıt' },
        { value: 'space-evenly', icon: AlignHorizontalDistributeCenter, label: 'Eşit dağıt' },
      ]
    : [
        { value: 'start', icon: AlignVerticalJustifyStart, label: 'Başa' },
        { value: 'center', icon: AlignVerticalJustifyCenter, label: 'Ortaya' },
        { value: 'end', icon: AlignVerticalJustifyEnd, label: 'Sona' },
        { value: 'space-between', icon: AlignVerticalSpaceBetween, label: 'Aralara dağıt' },
        { value: 'space-around', icon: AlignVerticalSpaceAround, label: 'Çevreye dağıt' },
        { value: 'space-evenly', icon: AlignVerticalDistributeCenter, label: 'Eşit dağıt' },
      ]
  const A: { value: ContainerBox['align']; icon: LucideIcon; label: string }[] = row
    ? [
        { value: 'start', icon: AlignVerticalJustifyStart, label: 'Üste' },
        { value: 'center', icon: AlignVerticalJustifyCenter, label: 'Ortaya' },
        { value: 'end', icon: AlignVerticalJustifyEnd, label: 'Alta' },
        { value: 'stretch', icon: StretchVertical, label: 'Esnet' },
      ]
    : [
        { value: 'start', icon: AlignHorizontalJustifyStart, label: 'Sola' },
        { value: 'center', icon: AlignHorizontalJustifyCenter, label: 'Ortaya' },
        { value: 'end', icon: AlignHorizontalJustifyEnd, label: 'Sağa' },
        { value: 'stretch', icon: StretchHorizontal, label: 'Esnet' },
      ]
  return (
    <>
      <Panel title="Kapsayıcı">
        <Ctl label="Kapsayıcı düzeni">
          <Select
            value={grid ? 'grid' : 'flex'}
            w={120}
            onChange={(v) => {
              if ((v === 'grid') === grid) return
              b.dispatch({ type: 'content', id: s.id, key: 'type', value: v, label: 'Düzen türü değişti' })
              b.dispatch({ type: 'structure', id: s.id, structure: v === 'grid' ? 'g2x2' : '50-50' })
            }}
            options={[
              { value: 'flex', label: 'Flexbox' },
              { value: 'grid', label: 'Grid' },
            ]}
          />
        </Ctl>
        <Ctl label="İçerik genişliği">
          <Select
            value={bx.contentWidth}
            w={120}
            onChange={(v) => set(v === 'full' ? { contentWidth: v, width: 100, widthUnit: '%' } : { contentWidth: v, width: 1160, widthUnit: 'px' })}
            options={[
              { value: 'boxed', label: 'Kutulu' },
              { value: 'full', label: 'Tam genişlik' },
            ]}
          />
        </Ctl>
        <Stack label={bx.contentWidth === 'boxed' ? 'Kutu genişliği' : 'Genişlik'}>
          <UnitSlider
            value={bx.width}
            unit={bx.widthUnit}
            units={[
              { u: 'px', min: 240, max: 1600 },
              { u: '%', min: 10, max: 100 },
              { u: 'vw', min: 10, max: 100 },
            ]}
            onChange={(v, u) => set({ width: v, widthUnit: u }, 'width')}
          />
        </Stack>
        <Stack label="Min. yükseklik">
          <UnitSlider
            value={bx.minHeight}
            unit={bx.minHeightUnit}
            units={[
              { u: 'px', min: 0, max: 1200 },
              { u: 'vh', min: 0, max: 100 },
            ]}
            onChange={(v, u) => set({ minHeight: v, minHeightUnit: u }, 'minh')}
          />
        </Stack>
      </Panel>

      <Panel title="Öğeler">
        {!grid ? (
          <>
            <Ctl label="Yön">
              <IconSeg
                value={bx.direction}
                onChange={(v) => set({ direction: v })}
                options={[
                  { value: 'row', icon: ArrowRight, label: 'Satır' },
                  { value: 'column', icon: ArrowDown, label: 'Sütun' },
                  { value: 'row-reverse', icon: ArrowLeft, label: 'Satır · ters' },
                  { value: 'column-reverse', icon: ArrowUp, label: 'Sütun · ters' },
                ]}
              />
            </Ctl>
            <Stack label="İçeriği yasla (justify-content)">
              <IconSeg value={bx.justify} onChange={(v) => set({ justify: v })} options={J} />
            </Stack>
            <Ctl label="Öğeleri hizala">
              <IconSeg value={bx.align} onChange={(v) => set({ align: v })} options={A} />
            </Ctl>
          </>
        ) : (
          <>
            <Ctl label="Sütunlar">
              <Slider value={bx.gridCols} min={1} max={6} unit="" onChange={(v) => b.dispatch({ type: 'gridSize', id: s.id, cols: Math.max(1, Math.min(6, v)), rows: bx.gridRows })} />
            </Ctl>
            <Ctl label="Satırlar">
              <Slider value={bx.gridRows} min={1} max={6} unit="" onChange={(v) => b.dispatch({ type: 'gridSize', id: s.id, cols: bx.gridCols, rows: Math.max(1, Math.min(6, v)) })} />
            </Ctl>
            <Ctl label="Öğeleri yasla">
              <IconSeg value={bx.justify.startsWith('space') ? 'start' : bx.justify} onChange={(v) => set({ justify: v })} options={J.slice(0, 3)} />
            </Ctl>
            <Ctl label="Öğeleri hizala">
              <IconSeg value={bx.align} onChange={(v) => set({ align: v })} options={A} />
            </Ctl>
          </>
        )}
        <Ctl label="Sütun boşluğu">
          <Slider value={bx.gapX} min={0} max={120} onChange={(v) => set({ gapX: v }, 'gapx')} />
        </Ctl>
        <Ctl label="Satır boşluğu">
          <Slider value={bx.gapY} min={0} max={120} onChange={(v) => set({ gapY: v }, 'gapy')} />
        </Ctl>
        {!grid && (
          <Ctl label="Kaydır (wrap)">
            <Toggle label="Kaydır" on={bx.wrap} onChange={(v) => set({ wrap: v })} />
          </Ctl>
        )}
        <Ctl label="Mobilde alt alta diz">
          <Toggle label="Mobilde alt alta diz" on={bx.stackMobile} onChange={(v) => set({ stackMobile: v })} />
        </Ctl>
      </Panel>

      <Panel title="Yapı">
        <StructureChooser s={s} dense />
        <p className="text-[11px] leading-relaxed text-ink-500">Bir hücreye tıklayarak genişliğini, iç boşluğunu ve arka planını ayrıca ayarlayabilirsin.</p>
      </Panel>
    </>
  )
}

/* ---------- Container: Stil ---------- */
export function ContainerStyleTab({ s }: { s: Section }) {
  const { bx, set } = useBox(s)
  return (
    <>
      {GRID_CAPS[s.kind] && <GridPanel s={s} />}
      <StyleTab s={s} />
      <BackgroundPanels s={s} />
      {s.kind !== 'layout' && (
        <Panel title="Boyut">
          <Stack label="Genişlik">
            <UnitSlider
              value={bx.width}
              unit={bx.widthUnit}
              units={[
                { u: '%', min: 10, max: 100 },
                { u: 'px', min: 240, max: 1600 },
                { u: 'vw', min: 10, max: 100 },
              ]}
              onChange={(v, u) => set({ width: v, widthUnit: u, contentWidth: 'full' }, 'width')}
            />
          </Stack>
          <Stack label="Min. yükseklik">
            <UnitSlider
              value={bx.minHeight}
              unit={bx.minHeightUnit}
              units={[
                { u: 'px', min: 0, max: 1200 },
                { u: 'vh', min: 0, max: 100 },
              ]}
              onChange={(v, u) => set({ minHeight: v, minHeightUnit: u }, 'minh')}
            />
          </Stack>
        </Panel>
      )}
      <Panel title="Kenarlık">
        <Ctl label="Kenarlık türü">
          <Select
            value={bx.borderStyle}
            w={120}
            onChange={(v) => set({ borderStyle: v })}
            options={[
              { value: 'none', label: 'Yok' },
              { value: 'solid', label: 'Düz' },
              { value: 'dashed', label: 'Kesikli' },
              { value: 'dotted', label: 'Noktalı' },
            ]}
          />
        </Ctl>
        {bx.borderStyle !== 'none' && (
          <>
            <Ctl label="Kalınlık">
              <Slider value={bx.borderWidth} min={1} max={20} onChange={(v) => set({ borderWidth: v }, 'bw')} />
            </Ctl>
            <Ctl label="Renk">
              <ColorInput value={bx.borderColor} onChange={(v) => set({ borderColor: v }, 'bc')} />
            </Ctl>
          </>
        )}
        <Ctl label="Köşe yarıçapı">
          <Slider value={bx.radius} min={0} max={80} onChange={(v) => set({ radius: v }, 'radius')} />
        </Ctl>
      </Panel>
      <Panel title="Kutu gölgesi">
        <Ctl label="Gölge">
          <Select
            value={bx.shadow}
            w={120}
            onChange={(v) => set({ shadow: v })}
            options={[
              { value: 'none', label: 'Yok' },
              { value: 'sm', label: 'Hafif' },
              { value: 'md', label: 'Orta' },
              { value: 'lg', label: 'Derin' },
            ]}
          />
        </Ctl>
      </Panel>
    </>
  )
}

/* ---------- Container: Gelişmiş ---------- */
export function ContainerAdvancedTab({ s }: { s: Section }) {
  const { bx, set } = useBox(s)
  return (
    <>
      <Panel title="Düzen">
        <Box4Control label="Kenar boşluğu (margin)" hint="margin" value={bx.margin} onChange={(v) => set({ margin: v }, 'margin')} />
        <Box4Control label="İç boşluk (padding)" hint="padding" value={bx.padding} onChange={(v) => set({ padding: v }, 'padding')} />
        <Ctl label="Z-index">
          <input type="number" value={bx.zIndex} onChange={(e) => set({ zIndex: Number(e.target.value) || 0 }, 'z')} className={cn(inputCls, 'w-[70px]')} />
        </Ctl>
        <p className="text-[11px] leading-relaxed text-ink-500">İpucu: kutuların üzerine gelince kanvasta margin turuncu, padding yeşil görünür.</p>
      </Panel>
      <AdvancedTab s={s} />
    </>
  )
}

/* ---------- Cell (child container) ---------- */
function useCell(s: Section, el: string) {
  const b = useB()
  const id = el.split('.')[1]
  const index = s.items.findIndex((i) => i.id === id)
  const item = s.items[index]
  const set = (patch: NonNullable<typeof item.box>, key?: string) => b.dispatch({ type: 'cellBox', id: s.id, itemId: id, patch, key })
  return { b, item, index, set }
}

export function CellLayoutTab({ s, el }: { s: Section; el: string }) {
  const { b, item, index, set } = useCell(s, el)
  if (!item) return null
  const grid = s.content.type === 'grid'
  const type = item.title as CellType
  const canNest = (locate(b.doc.sections, s.id)?.depth ?? 1) < MAX_DEPTH
  return (
    <>
      <Panel title={`Hücre ${index + 1}`}>
        <Ctl label="İçerik türü">
          <Select value={type} w={120} onChange={(v) => b.dispatch({ type: 'cell', id: s.id, itemId: item.id, cell: v })} options={CELL_TYPES.filter((o) => o.value !== 'layout' || canNest || type === 'layout')} />
        </Ctl>
        {type === 'layout' && item.sub && (
          <div className="flex items-center gap-2.5 rounded-[6px] border border-white/[0.07] bg-ink-850 p-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-[5px] bg-accent/15 text-accent-soft">
              {item.sub.content.type === 'grid' ? <LayoutGrid size={15} /> : <Columns3 size={15} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink-100">{item.sub.name}</span>
              <span className="block text-[10.5px] text-ink-500">{item.sub.items.length} hücre · iç kapsayıcı</span>
            </span>
            <button type="button" onClick={() => b.select({ sectionId: item.sub!.id }, { scroll: true })} className="h-7 shrink-0 rounded-[5px] bg-accent px-2.5 text-[11.5px] font-semibold text-white hover:brightness-110">
              Düzenle
            </button>
          </div>
        )}
        {(type === 'heading' || type === 'text') && (
          <Stack label="Metin">
            <RichField value={getValue(s, el)} onChange={(v) => b.dispatch({ type: 'field', id: s.id, el, value: v })} rows={type === 'text' ? 4 : 2} lists={type === 'text'} />
          </Stack>
        )}
        {type === 'button' && (
          <Stack label="Metin">
            <textarea
              rows={2}
              value={getValue(s, el)}
              onChange={(e) => b.dispatch({ type: 'field', id: s.id, el, value: e.target.value })}
              className="w-full resize-y rounded-[5px] border border-white/[0.08] bg-ink-850 px-2 py-1.5 text-[12px] leading-snug text-ink-100 outline-none focus:border-accent/70"
            />
          </Stack>
        )}
        {type === 'image' && (
          <div className="grid grid-cols-4 gap-1">
            {IMAGES.map((img) => (
              <button key={img.url} type="button" onClick={() => b.dispatch({ type: 'field', id: s.id, el, value: img.url })} className={cn('aspect-square overflow-hidden rounded ring-2', getValue(s, el) === img.url ? 'ring-accent' : 'ring-transparent hover:ring-white/30')}>
                <img src={sized(img.url, 160)} alt={img.alt} className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </Panel>
      <Panel title="Hücre düzeni">
        {!grid && (
          <Ctl label="Genişlik">
            <Slider value={item.box?.width ?? cellWidth(s, index)} min={5} max={100} unit="%" onChange={(v) => set({ width: v }, 'w')} />
          </Ctl>
        )}
        <Ctl label="Dikey hizalama">
          <IconSeg
            value={item.box?.valign ?? 'center'}
            onChange={(v) => set({ valign: v })}
            options={[
              { value: 'start', icon: AlignVerticalJustifyStart, label: 'Üst' },
              { value: 'center', icon: AlignVerticalJustifyCenter, label: 'Orta' },
              { value: 'end', icon: AlignVerticalJustifyEnd, label: 'Alt' },
            ]}
          />
        </Ctl>
        <Ctl label="Yatay hizalama">
          <IconSeg
            value={item.box?.halign ?? 'start'}
            onChange={(v) => set({ halign: v })}
            options={[
              { value: 'start', icon: AlignHorizontalJustifyStart, label: 'Sol' },
              { value: 'center', icon: AlignHorizontalJustifyCenter, label: 'Orta' },
              { value: 'end', icon: AlignHorizontalJustifyEnd, label: 'Sağ' },
            ]}
          />
        </Ctl>
      </Panel>
    </>
  )
}

export function CellStyleTab({ s, el }: { s: Section; el: string }) {
  const { item, set } = useCell(s, el)
  if (!item) return null
  return (
    <>
      <Panel title="Hücre arka planı">
        <Ctl label="Renk">
          <ColorInput value={item.box?.bg ?? '#ffffff'} onChange={(v) => set({ bg: v }, 'bg')} onReset={item.box?.bg ? () => set({ bg: undefined }) : undefined} />
        </Ctl>
        <Ctl label="Köşe yarıçapı">
          <Slider value={item.box?.radius ?? 0} min={0} max={60} onChange={(v) => set({ radius: v }, 'r')} />
        </Ctl>
      </Panel>
      {item.title && item.title !== 'layout' && <ElSizePanel s={s} el={el} />}
      {item.title !== 'layout' && <StyleTab s={s} el={el} />}
    </>
  )
}

export function CellAdvancedTab({ s, el }: { s: Section; el: string }) {
  const { item, set } = useCell(s, el)
  if (!item) return null
  return (
    <>
      <Panel title="Hücre boşlukları">
        <Box4Control label="İç boşluk (padding)" value={item.box?.padding ?? ZERO} onChange={(v) => set({ padding: v }, 'p')} />
      </Panel>
      {item.title && <ElMotionPanel s={s} el={el} />}
    </>
  )
}


/* ---------- Any element inside a ready-made section ---------- */
function useEl(s: Section, el: string) {
  const b = useB()
  const es: ElStyle = s.els?.[el] ?? {}
  const set = (patch: Partial<ElStyle>, key?: string) => b.dispatch({ type: 'elStyle', id: s.id, el, patch, key })
  const reset = () => b.dispatch({ type: 'elStyle', id: s.id, el, patch: null })
  return { b, es, set, reset }
}

const DEFAULT_SIZE: Record<string, number> = { heading: 48, text: 17, button: 15, badge: 13, link: 15, image: 16, code: 12.5 }

/** Current computed margin of an element on the canvas (for slider defaults). */
function computedMargin(s: Section, el: string, side: 'top' | 'bottom') {
  const node = document.querySelector<HTMLElement>(`[data-el="${s.id}:${el}"]`)
  return node ? Math.round(parseFloat(getComputedStyle(node)[side === 'top' ? 'marginTop' : 'marginBottom']) || 0) : 0
}

export function ElStyleTab({ s, el }: { s: Section; el: string }) {
  const { es, set, reset } = useEl(s, el)
  const kind = fieldKind(s, el)
  if (kind === 'icon') return <IconStyleTab s={s} el={el} />
  if (isCardEl(el) && CARD_NOUN[s.kind]) return <CardStyleTab s={s} el={el} />
  const isImg = kind === 'image'
  const custom = Object.keys(es).length > 0
  return (
    <>
      <Panel title={`Bu öğe · ${fieldLabel(s, el)}`}>
        {!isImg && (
          <>
            <ElFontFamily s={s} el={el} es={es} set={set} />
            <Ctl label="Yazı boyutu">
              <Slider value={es.fontSize ?? (kind === 'heading' ? Math.min(s.style.titleSize, 120) : DEFAULT_SIZE[kind])} min={8} max={160} onChange={(v) => set({ fontSize: v }, 'fs')} />
            </Ctl>
            <Ctl label="Kalınlık">
              <ElFontWeight s={s} el={el} es={es} set={set} />
            </Ctl>
            <Ctl label="Satır yüksekliği">
              <Slider value={es.lineHeight ?? 1.4} min={0.8} max={2.4} step={0.05} unit="" onChange={(v) => set({ lineHeight: v }, 'lh')} />
            </Ctl>
            <Ctl label="Harf aralığı">
              <Slider value={es.letterSpacing ?? 0} min={-0.1} max={0.3} step={0.005} unit="em" onChange={(v) => set({ letterSpacing: v }, 'ls')} />
            </Ctl>
            <ElTextStyle es={es} set={set} />
            <Ctl label="Hizalama">
              <IconSeg
                value={es.align ?? 'left'}
                onChange={(v) => set({ align: v })}
                options={[
                  { value: 'left', icon: AlignHorizontalJustifyStart, label: 'Sola' },
                  { value: 'center', icon: AlignHorizontalJustifyCenter, label: 'Ortaya' },
                  { value: 'right', icon: AlignHorizontalJustifyEnd, label: 'Sağa' },
                ]}
              />
            </Ctl>
            <Ctl label="Yazı rengi">
              <ColorInput value={es.color ?? '#121418'} onChange={(v) => set({ color: v }, 'c')} onReset={es.color ? () => set({ color: undefined }) : undefined} />
            </Ctl>
            <Ctl label="Arka plan">
              <ColorInput value={es.bg ?? '#ffffff'} onChange={(v) => set({ bg: v }, 'bg')} onReset={es.bg ? () => set({ bg: undefined }) : undefined} />
            </Ctl>
          </>
        )}
        <Ctl label="Köşe yarıçapı">
          <Slider value={es.radius ?? 0} min={0} max={80} onChange={(v) => set({ radius: v }, 'r')} />
        </Ctl>
        {custom && (
          <button type="button" onClick={reset} className="h-7 w-full rounded-[5px] bg-white/[0.06] text-[11.5px] font-medium text-ink-200 hover:bg-white/10">
            Bu öğenin ayarlarını sıfırla
          </button>
        )}
      </Panel>
      {isImg && isSvgSrc(getValue(s, el)) && <IconColorPanel s={s} el={el} />}
      <ElSizePanel s={s} el={el} />
      <StyleTab s={s} el={el} />
    </>
  )
}

/** Theme / brand colors offered as one-click swatches. */
export function useSwatches(s: Section, extra: string[] = []) {
  const b = useB()
  const p = palette(s.style.palette, b.doc.site.brand)
  const list = [p.accent, p.fg, p.bg, b.doc.site.brand, ...BRANDS.map((x) => x.value), '#ffffff', '#000000', ...extra]
  return [...new Set(list.map((c) => normColor(c)?.hex).filter((c): c is string => !!c))]
}

export function Swatches({ colors, value, onPick }: { colors: string[]; value?: string; onPick: (c: string) => void }) {
  const cur = value ? normColor(value)?.hex : undefined
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          title={c.toUpperCase()}
          aria-label={`Renk ${c}`}
          onClick={() => onPick(c)}
          className={cn('size-5 rounded-full ring-1 ring-inset ring-white/20 transition-transform hover:scale-110', cur === c && 'outline-2 outline-offset-2 outline-accent-soft')}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}

function GridIconColor({ s, value, onChange }: { s: Section; value?: string; onChange: (v: string | undefined, key?: string) => void }) {
  const b = useB()
  const swatches = useSwatches(s)
  return (
    <>
      <Ctl label="Simge rengi">
        <ColorInput value={hex(value, hex(palette(s.style.palette, b.doc.site.brand).accent, '#4058e3'))} onChange={(v) => onChange(v, 'ic')} onReset={value ? () => onChange(undefined) : undefined} />
      </Ctl>
      <Swatches colors={swatches} value={value} onPick={(c) => onChange(c)} />
    </>
  )
}

export const hex = (c: string | undefined, fallback: string) => (c && normColor(c)?.hex) || fallback

function IconColorPanel({ s, el }: { s: Section; el: string }) {
  const { es, set } = useEl(s, el)
  const markup = useSvgMarkup(getValue(s, el))
  const colors = useMemo(() => (markup ? svgPalette(markup).slice(0, 8) : []), [markup])
  const swatches = useSwatches(s, colors)
  const map = es.iconColors ?? {}
  const setOne = (orig: string, v?: string) => {
    const next = { ...map }
    if (v) next[orig] = v
    else delete next[orig]
    set({ iconColors: Object.keys(next).length ? next : undefined }, `ic:${orig}`)
  }
  return (
    <Panel title="İkon rengi">
      {!markup ? (
        <p className="text-[11px] leading-relaxed text-ink-500">SVG okunuyor… (başka bir alan adındaki dosyalar okunamazsa renk değiştirilemez.)</p>
      ) : (
        <>
          <Ctl label="Tek renk">
            <ColorInput value={hex(es.iconColor, colors[0] ?? '#000000')} onChange={(v) => set({ iconColor: v }, 'ic')} onReset={es.iconColor ? () => set({ iconColor: undefined }) : undefined} />
          </Ctl>
          <Swatches colors={swatches} value={es.iconColor} onPick={(c) => set({ iconColor: c })} />
          {colors.length > 1 && (
            <Stack label="Renkler (iki / çok tonlu)">
              <div className="space-y-1.5">
                {colors.map((c, i) => (
                  <div key={c} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-ink-400">
                      <span className="size-3.5 rounded-full ring-1 ring-inset ring-white/20" style={{ background: c }} title={`Orijinal ${c.toUpperCase()}`} />
                      Renk {i + 1}
                    </span>
                    <ColorInput value={hex(map[c] ?? es.iconColor, c)} onChange={(v) => setOne(c, v)} onReset={map[c] ? () => setOne(c) : undefined} />
                  </div>
                ))}
              </div>
            </Stack>
          )}
          {hasTint(es) && (
            <button type="button" onClick={() => set({ iconColor: undefined, iconColors: undefined })} className="h-7 w-full rounded-[5px] bg-white/[0.06] text-[11.5px] font-medium text-ink-200 hover:bg-white/10">
              Orijinal renklere dön
            </button>
          )}
          <p className="text-[11px] leading-relaxed text-ink-500">Tek renk tüm ikonu boyar; iki tonlu ikonlarda her rengi ayrı seçebilirsin. Şeffaf (fill="none") alanlar korunur.</p>
        </>
      )}
    </Panel>
  )
}

function computedSize(s: Section, el: string, dim: 'width' | 'height') {
  const node = document.querySelector<HTMLElement>(`[data-el="${s.id}:${el}"]`)
  return node ? Math.round(node.getBoundingClientRect()[dim]) : dim === 'width' ? 200 : 48
}

function SizeLabel({ label, onReset }: { label: string; onReset?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11.5px] text-ink-400">{label}</span>
      {onReset && (
        <button type="button" title="Otomatiğe dön" onClick={onReset} className="text-[10.5px] text-ink-500 hover:text-ink-200">
          ↺ Otomatik
        </button>
      )}
    </div>
  )
}

function ElSizePanel({ s, el }: { s: Section; el: string }) {
  const { es, set } = useEl(s, el)
  const kind = fieldKind(s, el)
  const soft = kind === 'heading' || kind === 'text' || kind === 'link'
  const wMode = es.width === undefined ? 'auto' : es.width === 100 && es.widthUnit === '%' ? 'full' : 'custom'
  return (
    <Panel title="Boyut">
      <div className="space-y-1.5">
        <SizeLabel label="Genişlik" />
        <IconlessSeg
          value={wMode}
          onChange={(v) => set(v === 'auto' ? { width: undefined, widthUnit: undefined } : v === 'full' ? { width: 100, widthUnit: '%' } : { width: Math.min(1600, computedSize(s, el, 'width')), widthUnit: 'px' })}
          options={[
            { value: 'auto', label: 'Otomatik' },
            { value: 'full', label: 'Tam' },
            { value: 'custom', label: 'Özel' },
          ]}
        />
        {es.width !== undefined && (
          <UnitSlider
            value={es.width}
            unit={es.widthUnit ?? 'px'}
            units={[
              { u: 'px', min: 20, max: 1600 },
              { u: '%', min: 5, max: 100 },
              { u: 'vw', min: 5, max: 100 },
            ]}
            onChange={(v, u) => set({ width: v, widthUnit: u }, 'w')}
          />
        )}
      </div>
      <div className="space-y-1.5">
        <SizeLabel label="Maks. genişlik" onReset={es.maxWidth !== undefined ? () => set({ maxWidth: undefined, maxWidthUnit: undefined }) : undefined} />
        <UnitSlider
          value={es.maxWidth ?? 100}
          unit={es.maxWidthUnit ?? '%'}
          units={[
            { u: 'px', min: 20, max: 1600 },
            { u: '%', min: 5, max: 100 },
          ]}
          onChange={(v, u) => set({ maxWidth: v, maxWidthUnit: u }, 'maxw')}
        />
      </div>
      <div className="space-y-1.5">
        <SizeLabel label={soft ? 'Min. yükseklik' : 'Yükseklik'} />
        <IconlessSeg
          value={es.height === undefined ? 'auto' : 'custom'}
          onChange={(v) => set(v === 'auto' ? { height: undefined, heightUnit: undefined } : { height: Math.min(1000, computedSize(s, el, 'height')), heightUnit: 'px' })}
          options={[
            { value: 'auto', label: 'Otomatik' },
            { value: 'custom', label: 'Özel' },
          ]}
        />
        {es.height !== undefined && (
          <UnitSlider
            value={es.height}
            unit={es.heightUnit ?? 'px'}
            units={[
              { u: 'px', min: 0, max: 1000 },
              { u: 'vh', min: 0, max: 100 },
            ]}
            onChange={(v, u) => set({ height: v, heightUnit: u }, 'h')}
          />
        )}
      </div>
      {kind === 'image' && (
        <Stack label="Görsel sığdırma">
          <IconlessSeg
            value={es.fit ?? 'cover'}
            onChange={(v) => set({ fit: v === 'cover' ? undefined : v })}
            options={[
              { value: 'cover', label: 'Kapla' },
              { value: 'contain', label: 'Sığdır' },
            ]}
          />
        </Stack>
      )}
      <p className="text-[11px] leading-relaxed text-ink-500">Seçili öğenin sağ ve alt kenarındaki tutamaçları kanvasta sürükleyerek de boyutlandırabilirsin.</p>
    </Panel>
  )
}

export function ElAdvancedTab({ s, el }: { s: Section; el: string }) {
  const { es, set } = useEl(s, el)
  return (
    <>
      <Panel title={`Boşluklar · ${EL_NAMES[fieldKind(s, el)]}`}>
        <Ctl label="Üstteki boşluk">
          <Slider value={es.mt ?? computedMargin(s, el, 'top')} min={-200} max={400} onChange={(v) => set({ mt: v }, 'mt')} />
        </Ctl>
        <Ctl label="Alttaki boşluk">
          <Slider value={es.mb ?? computedMargin(s, el, 'bottom')} min={-200} max={400} onChange={(v) => set({ mb: v }, 'mb')} />
        </Ctl>
        <Box4Control label="Kenar boşluğu (margin)" value={es.margin ?? ZERO} max={400} onChange={(v) => set({ margin: v, mt: undefined, mb: undefined }, 'm')} />
        {fieldKind(s, el) !== 'image' && fieldKind(s, el) !== 'icon' && <Box4Control label="İç boşluk (padding)" value={es.padding ?? ZERO} onChange={(v) => set({ padding: v }, 'p')} />}
        <p className="text-[11px] leading-relaxed text-ink-500">Negatif margin de girebilirsin. Bölümün kendi boşlukları için kapsayıcıyı seç.</p>
      </Panel>
      <ElMotionPanel s={s} el={el} />
      <AdvancedTab s={s} />
    </>
  )
}


/* ---------- Item grid of ready-made sections ---------- */
function ColsInput({ icon: I, label, value, onChange }: { icon: LucideIcon; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-[6px] border border-white/[0.08] bg-ink-850 py-1.5" title={label}>
      <I size={12} className="text-ink-500" />
      <div className="flex items-center">
        <button type="button" aria-label="Azalt" onClick={() => onChange(Math.max(1, value - 1))} className="grid size-5 place-items-center rounded text-ink-400 hover:bg-white/10 hover:text-white">
          −
        </button>
        <span className="w-5 text-center text-[12.5px] font-semibold text-ink-100">{value}</span>
        <button type="button" aria-label="Artır" onClick={() => onChange(Math.min(6, value + 1))} className="grid size-5 place-items-center rounded text-ink-400 hover:bg-white/10 hover:text-white">
          +
        </button>
      </div>
    </div>
  )
}

export function GridPanel({ s }: { s: Section }) {
  const b = useB()
  const caps = GRID_CAPS[s.kind]!
  const g = getGrid(s)
  const set = (patch: Partial<GridSettings>, key?: string) => b.dispatch({ type: 'grid', id: s.id, patch, key })
  return (
    <>
      <Panel title={caps.label}>
        {caps.cols && (
          <Stack label="Sütun sayısı">
            <div className="flex gap-1.5">
              <ColsInput icon={Monitor} label="Masaüstü" value={g.cols} onChange={(v) => set({ cols: v })} />
              <ColsInput icon={Tablet} label="Tablet" value={g.colsT} onChange={(v) => set({ colsT: v })} />
              <ColsInput icon={Smartphone} label="Mobil" value={g.colsM} onChange={(v) => set({ colsM: v })} />
            </div>
          </Stack>
        )}
        {caps.gapX && (
          <Ctl label={caps.cols ? 'Sütun boşluğu' : 'Yan boşluk'}>
            <Slider value={g.gapX} min={0} max={160} onChange={(v) => set({ gapX: v }, 'gx')} />
          </Ctl>
        )}
        {caps.gapY && (
          <Ctl label={s.kind === 'faq' ? 'Satır aralığı' : 'Satır boşluğu'}>
            <Slider value={g.gapY} min={0} max={160} onChange={(v) => set({ gapY: v }, 'gy')} />
          </Ctl>
        )}
        {(caps.gapX || caps.gapY) && s.kind !== 'faq' && <p className="text-[11px] leading-relaxed text-ink-500">Boşluklar kanvasta mor görünür; etiketi sürükleyerek de ayarlayabilirsin.</p>}
        {s.kind === 'steps' && <p className="text-[11px] leading-relaxed text-ink-500">0–1 px boşluk çizgili görünümü korur, daha büyük değerler adımları karta çevirir.</p>}
      </Panel>
      {caps.cards && (
        <Panel title="Kartlar">
          <Ctl label="İç boşluk">
            <Slider value={g.pad} min={0} max={96} onChange={(v) => set({ pad: v }, 'pad')} />
          </Ctl>
          <Ctl label="Köşe yarıçapı">
            <div className="flex items-center gap-1">
              {g.radius !== undefined && (
                <button type="button" title="Globale dön" onClick={() => set({ radius: undefined })} className="text-[10px] text-ink-500 hover:text-ink-200">
                  ↺
                </button>
              )}
              <Slider value={g.radius ?? 12} min={0} max={60} onChange={(v) => set({ radius: v }, 'r')} />
            </div>
          </Ctl>
          <Ctl label="Arka plan">
            <ColorInput value={g.bg ?? '#f6f7f8'} onChange={(v) => set({ bg: v }, 'bg')} onReset={g.bg ? () => set({ bg: undefined }) : undefined} />
          </Ctl>
          <Ctl label="Kenarlık">
            <Toggle label="Kenarlık" on={g.border} onChange={(v) => set({ border: v })} />
          </Ctl>
          {g.border && (
            <>
              <Ctl label="Kalınlık">
                <Slider value={g.borderW} min={1} max={8} onChange={(v) => set({ borderW: v }, 'bw')} />
              </Ctl>
              <Ctl label="Kenarlık rengi">
                <ColorInput value={g.borderColor ?? '#e6e7ea'} onChange={(v) => set({ borderColor: v }, 'bc')} onReset={g.borderColor ? () => set({ borderColor: undefined }) : undefined} />
              </Ctl>
            </>
          )}
          <Ctl label="Gölge">
            <Select
              value={g.shadow}
              w={110}
              onChange={(v) => set({ shadow: v })}
              options={[
                { value: 'none', label: 'Yok' },
                { value: 'sm', label: 'Hafif' },
                { value: 'md', label: 'Orta' },
                { value: 'lg', label: 'Derin' },
              ]}
            />
          </Ctl>
          {caps.icon && (
            <>
              <Ctl label="Simgeleri göster">
                <Toggle label="Simgeleri göster" on={g.showIcon} onChange={(v) => set({ showIcon: v })} />
              </Ctl>
              {g.showIcon && (
                <>
                  <Ctl label="Simge boyutu">
                    <Slider value={g.iconSize} min={24} max={96} onChange={(v) => set({ iconSize: v }, 'is')} />
                  </Ctl>
                  <GridIconColor s={s} value={g.iconColor} onChange={(v, key) => set({ iconColor: v }, key)} />
                </>
              )}
            </>
          )}
        </Panel>
      )}
    </>
  )
}


/* ---------- Background type + decorative SVG ---------- */
export function DecorPicker({ value, onChange, size = 'sm' }: { value: DecorId; onChange: (d: DecorId) => void; size?: 'sm' | 'lg' }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {DECORS.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onChange(d.id)}
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg py-1.5 ring-1 transition',
            value === d.id ? 'bg-accent/15 ring-2 ring-accent' : 'ring-white/[0.07] hover:bg-white/[0.05]',
          )}
        >
          <span className={cn('relative grid place-items-center overflow-hidden rounded-md bg-[#3d55d8] text-white', size === 'lg' ? 'size-11' : 'size-9')}>
            {d.id === 'dots' || d.id === 'grid' ? (
              <span
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage: d.id === 'dots' ? 'radial-gradient(currentColor 1px, transparent 1.3px)' : 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
                  backgroundSize: '8px 8px',
                }}
              />
            ) : d.id === 'none' ? (
              <span className="text-[16px] opacity-60">∅</span>
            ) : d.id === 'custom' ? (
              <span className="font-mono text-[10px] opacity-80">&lt;svg&gt;</span>
            ) : (
              <span className={cn('opacity-70', d.id === 'blob' ? 'size-6' : 'size-[80%]')}>
                <DecorShape id={d.id} style={{ strokeWidth: 3 } as React.CSSProperties} />
              </span>
            )}
          </span>
          <span className={cn('text-[10.5px]', value === d.id ? 'font-semibold text-ink-100' : 'text-ink-400')}>{d.name}</span>
        </button>
      ))}
    </div>
  )
}

function BackgroundPanels({ s }: { s: Section }) {
  const b = useB()
  const g = getBg(s)
  const set = (patch: Partial<BgSettings>, key?: string) => b.dispatch({ type: 'bg', id: s.id, patch, key })
  const positioned = POSITIONED_DECOR.includes(g.decor)
  return (
    <>
      <Panel title="Arka plan türü" open={g.type !== 'color'}>
        <IconlessSeg
          value={g.type}
          onChange={(v) => set({ type: v })}
          options={[
            { value: 'color', label: 'Renk' },
            { value: 'gradient', label: 'Gradyan' },
            { value: 'image', label: 'Görsel' },
          ]}
        />
        {g.type === 'gradient' && (
          <>
            <Ctl label="Başlangıç">
              <ColorInput value={g.gradFrom} onChange={(v) => set({ gradFrom: v }, 'gf')} />
            </Ctl>
            <Ctl label="Bitiş">
              <ColorInput value={g.gradTo} onChange={(v) => set({ gradTo: v }, 'gt')} />
            </Ctl>
            <Ctl label="Açı">
              <Slider value={g.gradAngle} min={0} max={360} unit="°" onChange={(v) => set({ gradAngle: v }, 'ga')} />
            </Ctl>
          </>
        )}
        {g.type === 'image' && (
          <>
            <div className="grid grid-cols-4 gap-1">
              {IMAGES.map((img) => (
                <button key={img.url} type="button" title={img.alt} onClick={() => set({ image: img.url })} className={cn('aspect-square overflow-hidden rounded ring-2', g.image === img.url ? 'ring-accent' : 'ring-transparent hover:ring-white/30')}>
                  <img src={sized(img.url, 160)} alt={img.alt} className="size-full object-cover" />
                </button>
              ))}
            </div>
            <Ctl label="Karartma">
              <Slider value={g.overlay} min={0} max={90} unit="%" onChange={(v) => set({ overlay: v }, 'ov')} />
            </Ctl>
          </>
        )}
      </Panel>
      <Panel title="Dekor (SVG)" open={g.decor !== 'none'}>
        <DecorPicker value={g.decor} onChange={(d) => set({ decor: d, ...(d === 'custom' && !g.decorSvg ? { decorSvg: SAMPLE_SVG } : {}) })} />
        {g.decor === 'custom' && (
          <Stack label="SVG kodu">
            <textarea
              rows={6}
              spellCheck={false}
              wrap="off"
              value={g.decorSvg ?? ''}
              onChange={(e) => set({ decorSvg: e.target.value }, 'svg')}
              className="w-full resize-y rounded-[5px] border border-white/[0.08] bg-[#0f1012] px-2 py-1.5 font-mono text-[10.5px] leading-[1.6] text-ink-100 outline-none focus:border-accent/70"
            />
            <label className="flex h-7 cursor-pointer items-center justify-center rounded-[5px] border border-dashed border-white/15 text-[11.5px] text-ink-300 hover:text-white">
              .svg dosyası yükle
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (f) set({ decorSvg: await f.text() })
                }}
              />
            </label>
            <p className="text-[11px] leading-relaxed text-ink-500">Renk için SVG içinde <code className="text-ink-300">currentColor</code> kullan.</p>
          </Stack>
        )}
        {g.decor !== 'none' && (
          <>
            <Ctl label="Renk">
              <ColorInput value={g.decorColor ?? '#ffffff'} onChange={(v) => set({ decorColor: v }, 'dc')} onReset={g.decorColor ? () => set({ decorColor: undefined }) : undefined} />
            </Ctl>
            <Ctl label="Opaklık">
              <Slider value={g.decorOpacity} min={0} max={100} unit="%" onChange={(v) => set({ decorOpacity: v }, 'do')} />
            </Ctl>
            <Ctl label={positioned ? 'Boyut' : 'Desen boyutu'}>
              <Slider value={g.decorScale} min={20} max={300} unit="%" onChange={(v) => set({ decorScale: v }, 'ds')} />
            </Ctl>
            <Ctl label="Yatay konum">
              <Slider value={g.decorX} min={-40} max={140} unit="%" onChange={(v) => set({ decorX: v }, 'dx')} />
            </Ctl>
            <Ctl label="Dikey konum">
              <Slider value={g.decorY} min={-40} max={140} unit="%" onChange={(v) => set({ decorY: v }, 'dy')} />
            </Ctl>
            {positioned && (
              <>
                <Ctl label="Döndür">
                  <Slider value={g.decorRotate} min={-180} max={180} unit="°" onChange={(v) => set({ decorRotate: v }, 'dr')} />
                </Ctl>
                <Ctl label="Hareket">
                  <Select
                    value={g.decorAnim}
                    w={120}
                    onChange={(v) => set({ decorAnim: v })}
                    options={[
                      { value: 'none', label: 'Sabit' },
                      { value: 'spin', label: 'Yavaşça döner' },
                      { value: 'float', label: 'Süzülür' },
                      { value: 'pulse', label: 'Nefes alır' },
                    ]}
                  />
                </Ctl>
                <p className="text-[11px] leading-relaxed text-ink-500">Kanvastaki mavi “Dekor” tutamacını sürükleyerek de taşıyabilirsin.</p>
              </>
            )}
          </>
        )}
      </Panel>
    </>
  )
}

const SAMPLE_SVG = `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.5">
  <polygon points="100,10 190,60 190,140 100,190 10,140 10,60" />
  <polygon points="100,45 160,80 160,120 100,155 40,120 40,80" />
</svg>`

function IconlessSeg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-[6px] border border-white/[0.08] bg-ink-850 p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn('h-6 flex-1 rounded-[4px] text-[11.5px] font-medium transition-colors', value === o.value ? 'bg-ink-600 text-white' : 'text-ink-400 hover:text-ink-200')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
