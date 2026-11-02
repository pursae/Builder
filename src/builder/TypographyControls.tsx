import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { FontPicker, WeightSelect } from './FontPicker'
import { FONT_PRESETS, SITE_BODY, SITE_HEADING, activePreset, fitWeight, fontStack, getFont, presetFonts, presetPatch, previewFont, siteFonts, weightsOf } from './fonts'
import { Ctl, Select } from './StudioPanel'
import { useB } from './store'
import type { ElStyle, Section, SiteSettings } from './types'
import { cn, spring } from './ui'

/* ---------- Font pair presets (Basic › Tasarım, Studio › Globaller) ---------- */
export function FontPresetGrid({ large }: { large?: boolean }) {
  const b = useB()
  const on = activePreset(b.doc.site)?.id
  useEffect(() => {
    for (const p of FONT_PRESETS) {
      const f = presetFonts(p)
      previewFont(f.heading, f.weight)
    }
  }, [])
  return (
    <div className="grid grid-cols-3 gap-2">
      {FONT_PRESETS.map((p) => {
        const f = presetFonts(p)
        const sel = on === p.id
        return (
          <button
            key={p.id}
            type="button"
            title={`${f.heading} / ${f.body}`}
            onClick={() => b.dispatch({ type: 'site', patch: presetPatch(p) })}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-xl ring-1 transition',
              large ? 'h-[88px] gap-1' : 'h-[64px] gap-0.5 rounded-lg',
              sel ? 'bg-accent/12 ring-2 ring-accent' : 'bg-white/[0.03] ring-white/[0.07] hover:bg-white/[0.06]',
            )}
          >
            <span className={cn('leading-none text-ink-100', large ? 'text-[30px]' : 'text-[22px]')} style={{ fontFamily: fontStack(f.heading), fontWeight: f.weight }}>
              Aa
            </span>
            <span className={cn(large ? 'text-[12px]' : 'text-[10.5px]', sel ? 'font-semibold text-ink-100' : 'text-ink-400')}>{p.name}</span>
            {sel && !large && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="absolute right-1 top-1 grid size-3.5 place-items-center rounded-full bg-accent text-white">
                <Check size={9} strokeWidth={3} />
              </motion.span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Site heading / body fonts (Studio › Globaller › Tipografi) ---------- */
export function SiteTypography() {
  const b = useB()
  const site = b.doc.site
  const f = siteFonts(site)
  const base = siteFonts({ ...site, headingFont: undefined, headingWeight: undefined, bodyFont: undefined, bodyWeight: undefined })
  const set = (patch: Partial<SiteSettings>, key?: string) => b.dispatch({ type: 'site', patch, key })
  // Keep the chosen weight only when the new family ships it.
  const keep = (fam: string, cur: number | undefined, fallback: number) => (weightsOf(fam).includes(cur ?? fallback) ? cur : fitWeight(fam, cur ?? fallback))
  return (
    <>
      <FontPresetGrid />
      <Ctl label="Başlık fontu" stack>
        <FontPicker
          value={site.headingFont}
          defaultLabel={`Hazır stil · ${base.heading}`}
          defaultFont={base.heading}
          onChange={(v) => set({ headingFont: v, headingWeight: keep(v ?? base.heading, site.headingWeight, base.headingWeight) })}
        />
      </Ctl>
      <Ctl label="Başlık kalınlığı">
        <WeightSelect family={f.heading} value={site.headingWeight} defaultLabel={`Hazır (${base.headingWeight})`} onChange={(v) => set({ headingWeight: v })} />
      </Ctl>
      <Ctl label="Gövde fontu" stack>
        <FontPicker value={site.bodyFont} defaultLabel={`Varsayılan · ${base.body}`} defaultFont={base.body} onChange={(v) => set({ bodyFont: v, bodyWeight: keep(v ?? base.body, site.bodyWeight, 400) })} />
      </Ctl>
      <Ctl label="Gövde kalınlığı">
        <WeightSelect family={f.body} value={site.bodyWeight} defaultLabel="Normal (400)" onChange={(v) => set({ bodyWeight: v })} />
      </Ctl>
      <div className="rounded-[6px] bg-white px-3 py-2.5 text-[#121418]">
        <div className="truncate text-[21px] leading-[1.15]" style={{ fontFamily: fontStack(f.heading), fontWeight: f.headingWeight }}>
          Işıl ışıl çözümler
        </div>
        <div className="mt-1 text-[12px] leading-snug text-[#5b616c]" style={{ fontFamily: fontStack(f.body), fontWeight: f.bodyWeight }}>
          Gövde metni: ağaç, çiçek, ılık rüzgâr, İstanbul’da güzel bir gün.
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-ink-500">Tüm bölümler bu fontları devralır; tek bir öğeyi Stil › Font ailesi ile ayrıca değiştirebilirsin.</p>
    </>
  )
}

/* ---------- Single element (Studio › Stil › Bu öğe) ---------- */
/** Family the element renders in without its own font (read from the canvas). */
function inheritedFamily(s: Section, el: string, fallback: string) {
  const node = document.querySelector<HTMLElement>(`[data-el="${s.id}:${el}"]`)
  const first = node ? getComputedStyle(node).fontFamily.split(',')[0] : ''
  return getFont(first)?.family ?? fallback
}

function useElFamily(s: Section, el: string, es: ElStyle) {
  const site = siteFonts(useB().doc.site)
  const inherited = es.font ? site.body : inheritedFamily(s, el, site.body)
  const family = es.font === SITE_HEADING ? site.heading : es.font === SITE_BODY ? site.body : es.font ?? inherited
  return { site, inherited, family }
}

type SetEl = (patch: Partial<ElStyle>, key?: string) => void

export function ElFontFamily({ s, el, es, set }: { s: Section; el: string; es: ElStyle; set: SetEl }) {
  const { site, inherited } = useElFamily(s, el, es)
  return (
    <Ctl label="Font ailesi" stack>
      <FontPicker
        value={es.font}
        defaultLabel={es.font ? 'Site fontu (devral)' : `Site fontu · ${inherited}`}
        defaultFont={inherited}
        site={{ heading: site.heading, body: site.body }}
        onChange={(v) => {
          const fam = v === SITE_HEADING ? site.heading : v === SITE_BODY ? site.body : v ?? inherited
          set({ font: v, ...(es.fontWeight && !weightsOf(fam).includes(es.fontWeight) ? { fontWeight: fitWeight(fam, es.fontWeight) } : {}) })
        }}
      />
    </Ctl>
  )
}

export function ElFontWeight({ s, el, es, set }: { s: Section; el: string; es: ElStyle; set: SetEl }) {
  const { family } = useElFamily(s, el, es)
  return <WeightSelect family={family} value={es.fontWeight} onChange={(v) => set({ fontWeight: v })} />
}

export function ElTextStyle({ es, set }: { es: ElStyle; set: SetEl }) {
  return (
    <>
      <Ctl label="Harf dönüşümü">
        <Select
          value={es.transform ?? ''}
          w={130}
          onChange={(v) => set({ transform: v || undefined })}
          options={[
            { value: '', label: 'Varsayılan' },
            { value: 'none', label: 'Yok' },
            { value: 'uppercase', label: 'BÜYÜK HARF' },
            { value: 'lowercase', label: 'küçük harf' },
            { value: 'capitalize', label: 'Baş Harfler' },
          ]}
        />
      </Ctl>
      <Ctl label="Stil">
        <Select
          value={es.italic === undefined ? '' : es.italic ? 'italic' : 'normal'}
          w={130}
          onChange={(v) => set({ italic: v === '' ? undefined : v === 'italic' })}
          options={[
            { value: '', label: 'Varsayılan' },
            { value: 'normal', label: 'Normal' },
            { value: 'italic', label: 'İtalik' },
          ]}
        />
      </Ctl>
    </>
  )
}
