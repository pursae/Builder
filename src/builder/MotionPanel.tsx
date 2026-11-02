import type { ReactNode } from 'react'
import { Play } from 'lucide-react'
import { EL_NAMES, GRID_CAPS, fieldKind } from './data'
import { EASINGS, ENTRANCES, HOVERS, getElMotion, getMotion, hasEntrance, motionPatch, replayMotion, type Motion } from './motion'
import { Ctl, Panel, Select, Slider } from './StudioPanel'
import { useB } from './store'
import type { EntranceId, MotionSettings, Section } from './types'
import { Toggle, cn } from './ui'

function Sub({ children }: { children: ReactNode }) {
  return <div className="pt-1 text-[10.5px] font-semibold uppercase tracking-[.08em] text-ink-500">{children}</div>
}

function Row({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11.5px] text-ink-400">{label}</span>
      <Toggle label={label} on={on} onChange={onChange} />
    </div>
  )
}

function ReplayButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? 'Önce bir giriş animasyonu seç' : 'Animasyonu kanvasta oynat'}
      className="flex h-7 w-full items-center justify-center gap-1.5 rounded-[5px] bg-white/[0.06] text-[11.5px] font-medium text-ink-200 transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
    >
      <Play size={11} className="fill-current" /> Önizle
    </button>
  )
}

/** Entrance controls shared by sections and single elements. */
function EntranceControls({ m, set, replay, stagger }: { m: Motion; set: (p: MotionSettings, key?: string) => void; replay: () => void; stagger?: boolean }) {
  const on = hasEntrance(m)
  return (
    <>
      <Ctl label="Animasyon">
        <Select
          value={m.entrance}
          onChange={(v: EntranceId) => {
            set({ entrance: v })
            if (v !== 'none') window.setTimeout(replay, 60)
          }}
          options={ENTRANCES.map((e) => ({ value: e.id, label: e.label }))}
        />
      </Ctl>
      {on && (
        <>
          <Ctl label="Süre">
            <Slider value={m.duration} min={100} max={2500} step={50} unit="ms" onChange={(v) => set({ duration: v }, 'dur')} />
          </Ctl>
          <Ctl label="Gecikme">
            <Slider value={m.delay} min={0} max={3000} step={50} unit="ms" onChange={(v) => set({ delay: v }, 'delay')} />
          </Ctl>
          <Ctl label="Yumuşatma">
            <Select value={m.easing} onChange={(v) => set({ easing: v })} options={EASINGS.map((e) => ({ value: e.id, label: e.label }))} />
          </Ctl>
          <Ctl label="Tekrar">
            <Select
              value={m.repeat ? 'every' : 'once'}
              onChange={(v) => set({ repeat: v === 'every' })}
              options={[
                { value: 'once', label: 'Bir kez' },
                { value: 'every', label: 'Her görünüşte' },
              ]}
            />
          </Ctl>
          {stagger && (
            <>
              <Row label="Alt öğeleri sırayla canlandır" on={m.stagger} onChange={(v) => set({ stagger: v })} />
              {m.stagger && (
                <Ctl label="Aralık">
                  <Slider value={m.staggerDelay} min={20} max={500} step={10} unit="ms" onChange={(v) => set({ staggerDelay: v }, 'stagger')} />
                </Ctl>
              )}
            </>
          )}
        </>
      )}
      <ReplayButton disabled={!on} onClick={replay} />
    </>
  )
}

/** Studio › Gelişmiş › Hareket efektleri (section / container). */
export function SectionMotionPanel({ s }: { s: Section }) {
  const b = useB()
  const m = getMotion(s)
  const elSelected = b.selection?.sectionId === s.id && !!b.selection.el
  const set = (patch: MotionSettings, key?: string) => b.dispatch({ type: 'style', id: s.id, patch: motionPatch(s, patch), label: 'Hareket efekti değişti', key: key ? `motion-${key}` : undefined })
  const cards = !!GRID_CAPS[s.kind]?.cols || s.kind === 'layout'
  return (
    <Panel title={elSelected ? 'Hareket efektleri · Bölüm' : 'Hareket efektleri'} open={!elSelected}>
      <Sub>Giriş animasyonu</Sub>
      <EntranceControls m={m} set={set} replay={() => replayMotion(s.id)} stagger />

      <Sub>Kaydırma efektleri</Sub>
      <Ctl label="Parallax">
        <Slider value={m.parallax} min={-100} max={100} step={5} unit="" onChange={(v) => set({ parallax: v }, 'parallax')} />
      </Ctl>
      {m.parallax !== 0 && (
        <Ctl label="Katman">
          <Select
            value={m.parallaxTarget}
            onChange={(v) => set({ parallaxTarget: v })}
            options={[
              { value: 'bg', label: 'Arka plan' },
              { value: 'content', label: 'İçerik' },
            ]}
          />
        </Ctl>
      )}
      <Row label="Kaydırırken solma" on={m.scrollFade} onChange={(v) => set({ scrollFade: v })} />
      <Row label="Kaydırırken küçülme" on={m.scrollScale} onChange={(v) => set({ scrollScale: v })} />
      <Row label="Yapışkan (üstte sabit)" on={m.sticky} onChange={(v) => set({ sticky: v })} />

      <Sub>Fareyle üzerine gelince</Sub>
      <Ctl label="Efekt">
        <Select value={m.hover} onChange={(v) => set({ hover: v, ...(v !== 'none' && !s.style.motion?.hoverTarget && cards ? { hoverTarget: 'items' as const } : {}) })} options={HOVERS.map((h) => ({ value: h.id, label: h.label }))} />
      </Ctl>
      {m.hover !== 'none' && (
        <Ctl label="Uygula">
          <Select
            value={m.hoverTarget}
            onChange={(v) => set({ hoverTarget: v })}
            options={[
              { value: 'self', label: 'Bölüme' },
              { value: 'items', label: 'Kartlara / hücrelere' },
            ]}
          />
        </Ctl>
      )}
      <p className={cn('text-[11px] leading-relaxed text-ink-500')}>
        Düzenlerken içerik gizlenmez; efektler önizlemede (P) ve yayındaki sitede oynar. Arka plan parallax'ı görsel, gradyan ya da dekor ister. Hareketi azaltmayı seçen ziyaretçilerde efektler sadeleşir.
      </p>
    </Panel>
  )
}

/** Entrance animation of a single element (heading, text, button, image, icon, card title…). */
export function ElMotionPanel({ s, el }: { s: Section; el: string }) {
  const b = useB()
  const es = s.els?.[el]
  const m = getElMotion(es)
  const set = (patch: MotionSettings, key?: string) => b.dispatch({ type: 'elStyle', id: s.id, el, patch: { motion: { ...es?.motion, ...patch } }, key: key ? `motion-${key}` : undefined })
  return (
    <Panel title={`Giriş animasyonu · ${EL_NAMES[fieldKind(s, el)] ?? 'Öğe'}`}>
      <EntranceControls m={m} set={set} replay={() => replayMotion(s.id, el)} />
    </Panel>
  )
}
