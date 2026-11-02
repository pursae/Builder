import { useMemo } from 'react'
import { KINDS } from '../data'
import { useB } from '../store'
import type { PaletteId, SectionKind } from '../types'
import { LIBRARY, variantsOf } from './index'
import { PageView, PreviewCtx, Thumb } from './Preview'
import { frameOf, samplePage } from './samples'

/**
 * Design review page: `?gallery=<kind>` renders every design of the kind at desktop and 400 px width.
 * `&palette=dark` forces a palette, `&v=<id>` shows one design, `&sheet=1` a contact sheet of thumbnails,
 * `&mobile=1` with sheet = mobile thumbnails.
 */
export default function Gallery({ query }: { query: URLSearchParams }) {
  const b = useB()
  const kind = query.get('gallery') as SectionKind
  const pal = query.get('palette') as PaletteId | null
  const only = query.get('v')
  const sheet = query.get('sheet') === '1'
  const mobile = query.get('mobile') === '1'
  const variants = variantsOf(kind).filter((v) => !only || v.id === only)
  const pages = useMemo(
    () =>
      variants.map((v) => {
        const page = samplePage(kind, v.id, b.doc)
        return { v, page: pal ? page.map((s, i) => (i === 0 ? { ...s, style: { ...s.style, palette: pal, bg: s.style.bg === 'transparent' ? 'transparent' : undefined } } : s)) : page }
      }),
    [kind, pal, only, b.doc],
  )
  if (!KINDS[kind]) {
    return (
      <div className="fixed inset-0 z-[200] grid place-items-center bg-ink-950 text-ink-200">
        Bilinmeyen tür. Seçenekler: {LIBRARY.map((k) => k.kind).join(', ')}
      </div>
    )
  }
  const f = frameOf(kind, mobile)
  const fw = mobile ? 220 : 400
  return (
    <div className="scroll-thin fixed inset-0 z-[200] overflow-auto bg-[#e4e6ea] p-8 text-[#121418]">
      <PreviewCtx>
        <h1 className="mb-6 text-[20px] font-semibold">
          {KINDS[kind].name} · {variants.length} tasarım{pal ? ` · palet ${pal}` : ''}
        </h1>
        {sheet ? (
          <div className="grid gap-x-5 gap-y-6" style={{ gridTemplateColumns: `repeat(auto-fill, ${fw}px)` }}>
            {pages.map(({ v, page }) => (
              <figure key={v.id}>
                <Thumb sections={page} width={f.width} frameW={fw} frameH={Math.round(fw * f.ratio)} anchor={f.anchor} site={b.doc.site} className="rounded-lg bg-white shadow-sm ring-1 ring-black/10" />
                <figcaption className="mt-2 text-[12.5px] font-semibold">
                  {v.name} <span className="font-normal text-[#6b7079]">· {v.tags.join(', ')}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {pages.map(({ v, page }) => (
              <section key={v.id} data-variant={v.id}>
                <div className="mb-3 flex items-baseline gap-3 text-[13px]">
                  <b className="text-[15px]">{v.name}</b>
                  <code className="rounded bg-black/[0.06] px-1.5">{v.id}</code>
                  <span className="text-[#6b7079]">{v.tags.join(' · ')}</span>
                  <span className="text-[#6b7079]">— {v.blurb}</span>
                </div>
                <div className="flex items-start gap-6">
                  <PageView sections={page} width={1280} site={b.doc.site} className="shrink-0 shadow-lg ring-1 ring-black/10" />
                  <PageView sections={page} width={400} site={b.doc.site} className="shrink-0 shadow-lg ring-1 ring-black/10" />
                </div>
              </section>
            ))}
          </div>
        )}
      </PreviewCtx>
    </div>
  )
}
