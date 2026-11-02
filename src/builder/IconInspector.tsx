import { useEffect, useMemo, useState } from 'react'
import type { ClipboardEvent } from 'react'
import { ChevronRight, Search, Upload } from 'lucide-react'
import { fieldLabel, getValue, palette } from './data'
import { hex, Swatches, useSwatches } from './ContainerInspector'
import { ICON_KEYS, ICON_SET, ICON_STYLE_KEYS, iconLook, isIconUrl } from './icons'
import { useB } from './store'
import { ColorInput, Ctl, Panel, Slider, inputCls } from './StudioPanel'
import { cleanSvgCode, prettySvg, svgSrc, useSvgMarkup } from './svgTint'
import type { ElStyle, Section } from './types'
import { Toggle, cn } from './ui'

const isSvgFile = (f: File) => f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)

/** Icon elements of the same kind in this section (cards / list items), for "apply to all". */
const siblingsOf = (s: Section, el: string) => (el.startsWith('items.') ? s.items.map((i) => `items.${i.id}.icon`) : [el])

/* ---------- İçerik: icon picker + custom SVG ---------- */
export function IconContentTab({ s, el }: { s: Section; el: string }) {
  const b = useB()
  const l = iconLook(s, el)
  const [q, setQ] = useState('')
  const remote = l.url && !l.url.startsWith('data:') ? l.url : ''
  const [url, setUrl] = useState(remote)
  const [urlOpen, setUrlOpen] = useState(!!remote)
  useEffect(() => setUrl(remote), [remote])
  const inline = useSvgMarkup(l.url, !!l.url?.startsWith('data:image/svg+xml'))
  const saved = useMemo(() => (inline ? prettySvg(inline) : ''), [inline])
  const [code, setCode] = useState(saved)
  const [err, setErr] = useState('')
  useEffect(() => {
    setCode(saved)
    setErr('')
  }, [saved])
  const set = (value: string) => b.dispatch({ type: 'field', id: s.id, el, value })
  const apply = (raw: string) => {
    const r = cleanSvgCode(raw)
    if ('error' in r) return setErr(r.error)
    setErr('')
    setCode(prettySvg(r.svg))
    const src = svgSrc(r.svg)
    if (src !== l.url) set(src)
  }
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(e.clipboardData.files).find(isSvgFile)
    if (file) {
      e.preventDefault()
      void file.text().then((t) => {
        setCode(t)
        apply(t)
      })
      return
    }
    const t = e.clipboardData.getData('text/plain')
    const ta = e.currentTarget
    const whole = !ta.value.trim() || (ta.selectionStart === 0 && ta.selectionEnd === ta.value.length)
    if (whole && /<svg[\s>]/i.test(t)) {
      e.preventDefault()
      setCode(t)
      apply(t)
    }
  }
  const dirty = code.trim() !== saved.trim()
  const list = useMemo(() => {
    const t = q.trim().toLocaleLowerCase('tr')
    return t ? ICON_KEYS.filter((k) => k.includes(t) || ICON_SET[k].tags.includes(t)) : ICON_KEYS
  }, [q])
  const Cur = ICON_SET[l.key].I
  return (
    <>
      <Panel title="İkon">
        <div className="flex items-center gap-2.5 rounded-[6px] border border-white/[0.07] bg-ink-850 p-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-[6px] bg-white/[0.06] text-ink-100">
            {l.url ? <img src={l.url} alt="" className="size-5 object-contain" /> : <Cur size={18} strokeWidth={1.8} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-ink-100">{l.url ? 'Özel SVG / görsel' : l.key}</div>
            <div className="truncate text-[10.5px] text-ink-500">{fieldLabel(s, el)}</div>
          </div>
        </div>
        <label className="relative block">
          <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İkon ara… (ör. güvenlik, hız, kargo)" className={cn(inputCls, 'w-full pl-6')} />
        </label>
        <div className="scroll-thin grid max-h-[248px] grid-cols-6 gap-1 overflow-y-auto pr-0.5">
          {list.map((k) => {
            const I = ICON_SET[k].I
            const on = !l.url && l.key === k
            return (
              <button
                key={k}
                type="button"
                title={k}
                aria-label={`İkon ${k}`}
                aria-pressed={on}
                onClick={() => set(k)}
                className={cn('grid aspect-square place-items-center rounded-[6px] transition-colors', on ? 'bg-accent/20 text-white ring-1 ring-accent' : 'text-ink-300 hover:bg-white/[0.07] hover:text-white')}
              >
                <I size={16} strokeWidth={1.8} />
              </button>
            )
          })}
        </div>
        {!list.length && <p className="text-[11px] text-ink-500">“{q}” için ikon bulunamadı.</p>}
        <p className="text-[11px] leading-relaxed text-ink-500">{ICON_KEYS.length} ikon · Türkçe ya da İngilizce arayabilirsin.</p>
      </Panel>
      <Panel title="Özel SVG" open={!!l.url}>
        <Ctl label="SVG kodu" stack>
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              if (err) setErr('')
            }}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                apply(code)
              }
            }}
            rows={5}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="SVG kodu"
            aria-invalid={!!err || undefined}
            placeholder={'<svg viewBox="0 0 24 24">…</svg>'}
            className={cn(
              'scroll-thin block max-h-[260px] min-h-[92px] w-full resize-y break-all rounded-[5px] border bg-ink-850 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] text-ink-100 outline-none transition placeholder:text-ink-500',
              err ? 'border-red-400/60 focus:border-red-400' : 'border-white/[0.08] focus:border-accent/70',
            )}
          />
          {err && (
            <p role="alert" className="text-[11px] leading-snug text-red-300">
              {err}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[10.5px] text-ink-500">{dirty ? 'Uygulanmadı · ⌘/Ctrl+Enter' : 'Yapıştırınca otomatik uygulanır'}</span>
            <button
              type="button"
              disabled={!dirty || !code.trim()}
              onClick={() => apply(code)}
              className="h-6 shrink-0 rounded-[5px] bg-accent px-3 text-[11px] font-medium text-white hover:bg-[#6b89ff] disabled:cursor-default disabled:bg-white/[0.06] disabled:text-ink-500"
            >
              Uygula
            </button>
          </div>
        </Ctl>
        <label className="flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-[5px] border border-dashed border-white/15 text-[11.5px] text-ink-300 hover:text-white">
          <Upload size={12} /> .svg dosyası yükle
          <input
            type="file"
            accept=".svg,image/svg+xml"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              const r = cleanSvgCode(await f.text())
              if ('error' in r) return b.notify(`${f.name}: ${r.error}`)
              setErr('')
              set(svgSrc(r.svg))
            }}
          />
        </label>
        <div>
          <button type="button" aria-expanded={urlOpen} onClick={() => setUrlOpen(!urlOpen)} className="flex items-center gap-1 text-[11.5px] text-ink-400 hover:text-ink-200">
            <ChevronRight size={12} className={cn('transition-transform', urlOpen && 'rotate-90')} />
            Adres ile ekle
          </button>
          {urlOpen && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => isIconUrl(url) && url.trim() !== l.url && set(url.trim())}
              onKeyDown={(e) => e.key === 'Enter' && isIconUrl(url) && set(url.trim())}
              placeholder="https://…/ikon.svg"
              aria-label="SVG / görsel adresi"
              className={cn(inputCls, 'mt-1.5 w-full')}
            />
          )}
        </div>
        {l.url && (
          <button type="button" onClick={() => set(l.key)} className="h-7 w-full rounded-[5px] bg-white/[0.06] text-[11.5px] font-medium text-ink-200 hover:bg-red-500/15 hover:text-red-300">
            Kaldır · varsayılan ikona dön
          </button>
        )}
        <p className="text-[11px] leading-relaxed text-ink-500">SVG ikonlar Stil sekmesindeki ikon rengiyle boyanır.</p>
      </Panel>
    </>
  )
}

/* ---------- Stil: color, size, tile ---------- */
export function IconStyleTab({ s, el }: { s: Section; el: string }) {
  const b = useB()
  const es: ElStyle = s.els?.[el] ?? {}
  const l = iconLook(s, el)
  const p = palette(s.style.palette, b.doc.site.brand)
  const swatches = useSwatches(s)
  const set = (patch: Partial<ElStyle>, key?: string) => b.dispatch({ type: 'elStyle', id: s.id, el, patch, key })
  const toHex = (c: string) => hex(c === 'var(--accent)' ? p.accent : c === 'currentColor' ? p.muted : c, hex(b.doc.site.brand, '#4058e3'))
  const siblings = siblingsOf(s, el).filter((x) => x !== el)
  const custom = Object.keys(es).length > 0

  const applyAll = () => {
    const picked = Object.fromEntries(ICON_STYLE_KEYS.map((k) => [k, es[k]]))
    const els = { ...s.els }
    for (const k of siblings) {
      const next = Object.fromEntries(Object.entries({ ...els[k], ...picked }).filter(([, v]) => v !== undefined)) as ElStyle
      if (Object.keys(next).length) els[k] = next
      else delete els[k]
    }
    b.dispatch({ type: 'replace', doc: { ...b.doc, sections: b.doc.sections.map((x) => (x.id === s.id ? { ...x, els } : x)) }, label: 'İkon stili tüm kartlara uygulandı' })
    b.notify(`İkon stili ${siblings.length + 1} öğeye uygulandı`)
  }

  return (
    <>
      <Panel title={`Bu ikon · ${fieldLabel(s, el)}`}>
        <Ctl label="Göster">
          <Toggle label="İkonu göster" on={!es.hide} onChange={(v) => set({ hide: v ? undefined : true })} />
        </Ctl>
        <Ctl label="İkon rengi">
          <ColorInput value={toHex(l.color)} onChange={(v) => set({ iconColor: v }, 'ic')} onReset={es.iconColor ? () => set({ iconColor: undefined }) : undefined} />
        </Ctl>
        <Swatches colors={swatches} value={es.iconColor} onPick={(c) => set({ iconColor: c })} />
        <Ctl label="İkon boyutu">
          <Slider value={l.size} min={8} max={120} onChange={(v) => set({ iconSize: v }, 'isz')} />
        </Ctl>
        {l.url && !es.iconColor && <p className="text-[11px] leading-relaxed text-ink-500">Özel SVG kendi renkleriyle görünür; bir renk seçince tamamı o renge boyanır.</p>}
      </Panel>
      <Panel title="Arka plan kutusu">
        <Ctl label="Kutuyu göster">
          <Toggle label="Kutuyu göster" on={l.tile} onChange={(v) => set({ tile: v })} />
        </Ctl>
        {l.tile && (
          <>
            <Ctl label="Kutu boyutu">
              <Slider value={l.tileSize} min={16} max={200} onChange={(v) => set({ tileSize: v }, 'ts')} />
            </Ctl>
            <Ctl label="Köşe yarıçapı">
              <Slider value={Math.min(l.radius, Math.ceil(l.tileSize / 2))} min={0} max={Math.ceil(l.tileSize / 2)} onChange={(v) => set({ radius: v }, 'r')} />
            </Ctl>
            <Ctl label="Kutu rengi">
              <ColorInput value={toHex(l.tileColor)} onChange={(v) => set({ bg: v }, 'tbg')} onReset={es.bg ? () => set({ bg: undefined }) : undefined} />
            </Ctl>
            <Ctl label="Opaklık">
              <Slider value={l.tileOpacity} min={0} max={100} unit="%" onChange={(v) => set({ tileOpacity: v }, 'to')} />
            </Ctl>
          </>
        )}
      </Panel>
      <Panel title={siblings.length ? 'Tüm kartlar' : 'Sıfırla'}>
        {siblings.length > 0 && (
          <button type="button" onClick={applyAll} className="h-7 w-full rounded-[5px] bg-accent text-[11.5px] font-medium text-white hover:bg-[#6b89ff]">
            Bu stili tüm {s.kind === 'features' ? 'kartlara' : 'öğelere'} uygula
          </button>
        )}
        {custom && (
          <button type="button" onClick={() => b.dispatch({ type: 'elStyle', id: s.id, el, patch: null })} className="h-7 w-full rounded-[5px] bg-white/[0.06] text-[11.5px] font-medium text-ink-200 hover:bg-white/10">
            Bu ikonun ayarlarını sıfırla
          </button>
        )}
        <p className="text-[11px] leading-relaxed text-ink-500">
          Buradaki ayarlar yalnızca bu ikona uygulanır.{s.kind === 'features' && ' Bölüm geneli varsayılanlar (simge boyutu, rengi, gizle/göster) kapsayıcının Stil › Kartlar panelinde.'}
        </p>
        {getValue(s, el) === '' && el.startsWith('items.') && s.kind === 'features' && <p className="text-[11px] leading-relaxed text-ink-500">Bu kart sıradaki varsayılan ikonu kullanıyor.</p>}
      </Panel>
    </>
  )
}
