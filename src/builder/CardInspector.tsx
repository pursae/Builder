import { Copy, CornerLeftUp, Trash2 } from 'lucide-react'
import { CARD_NOUN, EL_NAMES, SHADOWS, fieldKind, fieldLabel, getGrid, getValue } from './data'
import { Box4Control, Swatches, hex, useSwatches } from './ContainerInspector'
import { iconLook } from './icons'
import { toPlain } from './rich'
import { deleteSelection, duplicateSelection } from './selectionActions'
import { useB } from './store'
import { ColorInput, Ctl, Panel, Select, Slider } from './StudioPanel'
import type { Box4, ContainerBox, ElStyle, Section } from './types'
import { Toggle, cn } from './ui'

/* Card boxes of ready-made sections ("items.<id>.card"): per-card overrides over the section's card defaults (Kartlar panel). */

const CARD_KEYS = ['bg', 'border', 'radius', 'shadow', 'padding', 'margin', 'mt', 'mb', 'ml', 'mr', 'height', 'heightUnit'] as const
type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted'

const cardId = (el: string) => el.split('.')[1]
const px = (v?: string) => Math.round(parseFloat(v ?? '') || 0)

/** What the card currently looks like on the canvas (defaults + overrides), for control values. */
function readCard(s: Section, el: string) {
  const n = document.querySelector<HTMLElement>(`[data-el="${s.id}:${el}"]`)
  const cs = n ? getComputedStyle(n) : null
  const side = (p: 'padding' | 'margin'): Box4 => ({ t: px(cs?.[`${p}Top`]), r: px(cs?.[`${p}Right`]), b: px(cs?.[`${p}Bottom`]), l: px(cs?.[`${p}Left`]) })
  const opaque = (c?: string) => (c && !/rgba\(.*,\s*0\)$|transparent/.test(c) ? c : undefined)
  return {
    bg: opaque(cs?.backgroundColor),
    bw: px(cs?.borderTopWidth),
    bs: (cs?.borderTopStyle ?? 'none') as string,
    bc: opaque(cs?.borderTopColor),
    radius: px(cs?.borderTopLeftRadius),
    padding: side('padding'),
    margin: side('margin'),
  }
}

function parseBorder(v?: string): { style: BorderStyle; w: number; color?: string } | null {
  if (!v) return null
  if (v === 'none') return { style: 'none', w: 1 }
  const m = /^(\d+(?:\.\d+)?)px\s+(solid|dashed|dotted)\s+(.+)$/.exec(v.trim())
  return m ? { style: m[2] as BorderStyle, w: Number(m[1]), color: m[3] } : null
}

export function CardStyleTab({ s, el }: { s: Section; el: string }) {
  const b = useB()
  const es: ElStyle = s.els?.[el] ?? {}
  const g = getGrid(s)
  const cur = readCard(s, el)
  const swatches = useSwatches(s)
  const noun = CARD_NOUN[s.kind] ?? 'Kart'
  const set = (patch: Partial<ElStyle>, key?: string) => b.dispatch({ type: 'elStyle', id: s.id, el, patch, key })
  const siblings = s.items.map((i) => `items.${i.id}.card`).filter((k) => k !== el)
  const custom = CARD_KEYS.some((k) => es[k] !== undefined)

  const border = parseBorder(es.border) ?? { style: (cur.bw && ['solid', 'dashed', 'dotted'].includes(cur.bs) ? cur.bs : 'none') as BorderStyle, w: cur.bw || g.borderW || 1, color: cur.bc }
  const borderColor = hex(border.color ?? g.borderColor, '#e6e7ea')
  const setBorder = (next: Partial<typeof border>, key?: string) => {
    const v = { ...border, color: borderColor, ...next }
    set({ border: v.style === 'none' ? 'none' : `${Math.max(1, v.w)}px ${v.style} ${v.color}` }, key)
  }
  const shadowKey = es.shadow ? ((Object.keys(SHADOWS) as ContainerBox['shadow'][]).find((k) => (SHADOWS[k] ?? 'none') === es.shadow) ?? 'md') : g.shadow
  const margin: Box4 = { t: es.mt ?? es.margin?.t ?? cur.margin.t, r: es.mr ?? es.margin?.r ?? cur.margin.r, b: es.mb ?? es.margin?.b ?? cur.margin.b, l: es.ml ?? es.margin?.l ?? cur.margin.l }

  const applyAll = () => {
    const picked = Object.fromEntries(CARD_KEYS.map((k) => [k, es[k]]))
    const els = { ...s.els }
    for (const k of siblings) {
      const next = Object.fromEntries(Object.entries({ ...els[k], ...picked }).filter(([, v]) => v !== undefined)) as ElStyle
      if (Object.keys(next).length) els[k] = next
      else delete els[k]
    }
    b.dispatch({ type: 'replace', doc: { ...b.doc, sections: b.doc.sections.map((x) => (x.id === s.id ? { ...x, els } : x)) }, label: `${noun} stili tümüne uygulandı` })
    b.notify(`${noun} stili ${siblings.length + 1} karta uygulandı`)
  }
  const reset = () => set(Object.fromEntries(CARD_KEYS.map((k) => [k, undefined])) as Partial<ElStyle>)

  return (
    <>
      <Panel title={`Bu kart · ${fieldLabel(s, el)}`}>
        <Ctl label="Göster">
          <Toggle label="Kartı göster" on={!es.hide} onChange={(v) => set({ hide: v ? undefined : true })} />
        </Ctl>
        <Ctl label="Arka plan">
          <ColorInput value={hex(es.bg ?? cur.bg ?? g.bg, '#ffffff')} onChange={(v) => set({ bg: v }, 'cbg')} onReset={es.bg ? () => set({ bg: undefined }) : undefined} />
        </Ctl>
        <Swatches colors={swatches} value={es.bg} onPick={(c) => set({ bg: c })} />
        <Ctl label="Köşe yarıçapı">
          <Slider value={es.radius ?? cur.radius} min={0} max={80} onChange={(v) => set({ radius: v }, 'cr')} />
        </Ctl>
        <Ctl label="Gölge">
          <Select
            value={shadowKey}
            w={110}
            onChange={(v) => set({ shadow: SHADOWS[v] ?? 'none' })}
            options={[
              { value: 'none', label: 'Yok' },
              { value: 'sm', label: 'Hafif' },
              { value: 'md', label: 'Orta' },
              { value: 'lg', label: 'Derin' },
            ]}
          />
        </Ctl>
      </Panel>
      <Panel title="Kenarlık">
        <Ctl label="Stil">
          <Select
            value={border.style}
            w={110}
            onChange={(v) => setBorder({ style: v })}
            options={[
              { value: 'none', label: 'Yok' },
              { value: 'solid', label: 'Düz' },
              { value: 'dashed', label: 'Kesikli' },
              { value: 'dotted', label: 'Noktalı' },
            ]}
          />
        </Ctl>
        {border.style !== 'none' && (
          <>
            <Ctl label="Kalınlık">
              <Slider value={border.w} min={1} max={12} onChange={(v) => setBorder({ w: v }, 'cbw')} />
            </Ctl>
            <Ctl label="Renk">
              <ColorInput value={borderColor} onChange={(v) => setBorder({ color: v }, 'cbc')} />
            </Ctl>
          </>
        )}
        {es.border !== undefined && (
          <button type="button" onClick={() => set({ border: undefined })} className="text-[11px] text-ink-500 hover:text-ink-200">
            ↺ Bölüm varsayılanına dön
          </button>
        )}
      </Panel>
      <Panel title="Boşluk ve boyut">
        <Box4Control label="İç boşluk (padding)" value={es.padding ?? cur.padding} max={200} onChange={(v) => set({ padding: v }, 'cp')} />
        <Box4Control label="Dış boşluk (margin)" value={margin} max={200} onChange={(v) => set({ margin: v, mt: undefined, mb: undefined, ml: undefined, mr: undefined }, 'cm')} />
        <Ctl label="Min. yükseklik">
          <Slider value={es.height ?? 0} min={0} max={800} onChange={(v) => set(v ? { height: v, heightUnit: 'px' } : { height: undefined, heightUnit: undefined }, 'ch')} />
        </Ctl>
        <p className="text-[11px] leading-relaxed text-ink-500">Kanvasta yeşil (iç) ve turuncu (dış) tutamaçları sürükleyerek de ayarlayabilirsin.</p>
      </Panel>
      <Panel title={`Tüm ${noun === 'Kart' ? 'kartlar' : `${noun.toLocaleLowerCase('tr')}lar`}`}>
        {siblings.length > 0 && (
          <button type="button" onClick={applyAll} className="h-7 w-full rounded-[5px] bg-accent text-[11.5px] font-medium text-white hover:bg-[#6b89ff]">
            Bu stili tüm kartlara uygula
          </button>
        )}
        {custom && (
          <button type="button" onClick={reset} className="h-7 w-full rounded-[5px] bg-white/[0.06] text-[11.5px] font-medium text-ink-200 hover:bg-white/10">
            Bu kartın ayarlarını sıfırla
          </button>
        )}
        <button type="button" onClick={() => b.select({ sectionId: s.id })} className="h-7 w-full rounded-[5px] bg-white/[0.06] text-[11.5px] font-medium text-ink-200 hover:bg-white/10">
          Bölüm varsayılanlarını aç
        </button>
        <p className="text-[11px] leading-relaxed text-ink-500">Buradaki ayarlar yalnızca bu karta uygulanır; bölüm geneli varsayılanlar kapsayıcının Stil › {s.kind === 'faq' ? 'Soru listesi' : 'Kartlar'} panelinde.</p>
      </Panel>
    </>
  )
}

/** İçerik tab of a card: its parts (select one) + card actions. */
export function CardContentTab({ s, el }: { s: Section; el: string }) {
  const b = useB()
  const id = cardId(el)
  const parts = [`items.${id}.icon`, `items.${id}.title`, `items.${id}.text`].filter((p) => (p.endsWith('.icon') ? s.kind === 'features' && iconLook(s, p).show : true))
  const sel = { sectionId: s.id, el }
  return (
    <Panel title={`İçindekiler · ${fieldLabel(s, el)}`}>
      <div className="space-y-1">
        {parts.map((p) => {
          const k = fieldKind(s, p)
          const v = k === 'icon' ? '' : toPlain(getValue(s, p)).split('\n')[0]
          const gone = s.els?.[p]?.removed
          return (
            <button
              key={p}
              type="button"
              onClick={() => b.select({ sectionId: s.id, el: p })}
              className={cn('flex h-7 w-full items-center gap-2 rounded-[5px] border border-white/[0.07] bg-ink-850 px-2 text-left text-[11.5px] text-ink-300 hover:border-white/15 hover:text-white', gone && 'opacity-50')}
            >
              <span className="shrink-0 text-ink-500">{EL_NAMES[k]}</span>
              <span className={cn('min-w-0 flex-1 truncate', gone && 'line-through')}>{v}</span>
              {gone && <span className="text-[10px] text-ink-500">silindi</span>}
            </button>
          )
        })}
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => duplicateSelection(b, sel)} className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-white/[0.06] text-[11.5px] text-ink-200 hover:bg-white/10">
          <Copy size={12} /> Çoğalt
        </button>
        <button type="button" onClick={() => b.select({ sectionId: s.id })} className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-white/[0.06] text-[11.5px] text-ink-200 hover:bg-white/10">
          <CornerLeftUp size={12} /> Üst öğe
        </button>
        <button type="button" onClick={() => deleteSelection(b, sel)} className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-white/[0.06] text-[11.5px] text-ink-200 hover:bg-red-500/15 hover:text-red-300">
          <Trash2 size={12} /> Sil
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-ink-500">Kartın boş alanına tıklayınca kart, içindeki yazıya tıklayınca o öğe seçilir. Esc bir üst öğeye çıkar.</p>
    </Panel>
  )
}
