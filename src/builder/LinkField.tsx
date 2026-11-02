import { CornerDownRight } from 'lucide-react'
import { getHref } from './sections'
import { useB } from './store'
import type { Section } from './types'
import { cn } from './ui'

/** "Where does this button go?": a section on the page or a web address. */
export function LinkField({ s, el, dense }: { s: Section; el: string; dense?: boolean }) {
  const b = useB()
  const href = getHref(s, el) ?? ''
  const isItem = el.startsWith('items.')
  const set = (v: string) => {
    if (isItem) b.dispatch({ type: 'itemPatch', id: s.id, itemId: el.split('.')[1], patch: { href: v || undefined } })
    else b.dispatch({ type: 'content', id: s.id, key: `${el}Href`, value: v, label: 'Bağlantı değişti' })
  }
  const mode = !href ? '' : href.startsWith('#') ? href : 'url'
  const ctl = dense
    ? 'h-7 rounded-[5px] border border-white/[0.08] bg-ink-850 px-2 text-[11.5px] text-ink-100 outline-none focus:border-accent/70'
    : 'h-8 rounded-lg border border-white/[0.08] bg-ink-800 px-2 text-[12.5px] text-ink-100 outline-none focus:border-accent'
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', dense ? 'mt-0' : 'mt-1.5')}>
      <CornerDownRight size={13} className="shrink-0 text-ink-500" />
      <select value={mode} onChange={(e) => set(e.target.value === 'url' ? 'https://' : e.target.value)} className={cn(ctl, 'min-w-0 flex-1')}>
        <option value="">Bağlantı yok</option>
        <optgroup label="Sayfadaki bölüme git">
          {b.doc.sections
            .filter((x) => x.kind !== 'nav')
            .map((x) => (
              <option key={x.id} value={`#${x.id}`}>
                {x.name}
              </option>
            ))}
        </optgroup>
        <option value="url">Web adresi…</option>
      </select>
      {mode === 'url' && <input value={href} onChange={(e) => set(e.target.value)} placeholder="https://" className={cn(ctl, 'w-full font-mono')} />}
    </div>
  )
}
