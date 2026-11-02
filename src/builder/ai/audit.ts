import { IMAGES, KINDS, createSection, fieldLabel, getBg, getGrid, palette } from '../data'
import type { DocState, PageSettings, PaletteId, Section, SectionKind } from '../types'
import { toPlain } from '../rich'
import { getMotion, isHeavy } from '../motion'

/* ---------- Color math (WCAG 2.x) ---------- */
type RGB = [number, number, number]
const blend = (c: RGB, a: number, under: RGB): RGB => c.map((x, i) => Math.round(x * a + under[i] * (1 - a))) as RGB

function parse(c: string | undefined, under: RGB = [255, 255, 255]): RGB | null {
  const v = c?.trim().toLowerCase()
  if (!v) return null
  const h = v.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/)?.[1]
  if (h) {
    const x = h.length <= 4 ? [...h].map((d) => d + d).join('') : h
    return blend([0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) as RGB, x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1, under)
  }
  const m = v.match(/^rgba?\(([^)]+)\)$/)
  if (!m) return null
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
  if (p.length < 3 || p.slice(0, 4).some((n) => !Number.isFinite(n))) return null
  return blend([p[0], p[1], p[2]], p[3] ?? 1, under)
}

const lum = (c: RGB) => {
  const f = (x: number) => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
}
const hex = (c: RGB) => `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`
const r2 = (n: number) => Math.round(n * 100) / 100

/** WCAG contrast ratio of `fg` (alpha composited over `bg`) against `bg`; null for unparseable colors (e.g. color-mix). */
export function contrast(fg: string, bg: string): number | null {
  const b = parse(bg)
  const f = b && parse(fg, b)
  if (!f || !b) return null
  const [hi, lo] = [lum(f), lum(b)].sort((x, y) => y - x)
  return r2((hi + 0.05) / (lo + 0.05))
}

/** Shifts `color` toward black/white until it reaches `min` contrast against `against`. */
export function adjustFor(color: string, against: string, min = 4.5): string | null {
  const base = parse(color)
  const bg = parse(against)
  if (!base || !bg) return null
  const to: RGB = lum(bg) > 0.4 ? [0, 0, 0] : [255, 255, 255]
  for (let t = 0; t <= 1; t += 0.03) {
    const c = hex(blend(base, 1 - t, to))
    if ((contrast(c, against) ?? 0) >= min) return c
  }
  return hex(to)
}

/* ---------- Audit ---------- */
export type AuditArea = 'color' | 'typography' | 'content' | 'structure' | 'layout' | 'images' | 'seo' | 'responsive'
export type AuditFocus = AuditArea | 'all'
export const AUDIT_AREAS: AuditFocus[] = ['all', 'color', 'typography', 'content', 'structure', 'layout', 'images', 'seo', 'responsive']
type Severity = 'error' | 'warning' | 'info'

export interface AuditIssue {
  severity: Severity
  area: AuditArea
  section_id?: string
  section?: string
  message: string
  fix?: { tool: string; input: Record<string, unknown>; hint?: string }
}

export interface AuditReport {
  score: number
  counts: Record<Severity, number>
  issues: AuditIssue[]
  truncated?: number
  next: string
}

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 }
const PENALTY: Record<Severity, number> = { error: 10, warning: 4, info: 1 }
/** One noisy area (e.g. many template leftovers) can't sink the whole score. */
const AREA_CAP = 25
const DEFAULTS = Object.fromEntries((Object.keys(KINDS) as SectionKind[]).map((k) => [k, createSection(k)])) as Record<SectionKind, Section>
const STOCK = new Set(IMAGES.map((i) => i.url))
const TEXT_KEYS = ['title', 'accent', 'body', 'quote', 'brand', 'note', 'text', 'eyebrow', 'primary', 'secondary']
const LIGHT_FG = (p: PaletteId) => p === 'brand' || p === 'dark'
const len = (v?: string) => toPlain(v).trim().length

export function auditDesign(doc: DocState, page: PageSettings, opts: { focus?: AuditFocus; sectionId?: string; limit?: number } = {}): AuditReport {
  const issues: AuditIssue[] = []
  const brand = doc.site.brand
  const visible = doc.sections.filter((s) => !s.hidden)
  const body = visible.filter((s) => !KINDS[s.kind].pinned)
  const at = (s: Section) => ({ section_id: s.id, section: s.name })
  const add = (severity: Severity, area: AuditArea, message: string, s?: Section, fix?: AuditIssue['fix']) => issues.push({ severity, area, ...(s ? at(s) : {}), message, ...(fix ? { fix } : {}) })
  const hero = visible.find((s) => s.kind === 'hero')
  const nav = doc.sections.find((s) => s.kind === 'nav')
  const customized = !!hero && hero.content.title !== DEFAULTS.hero.content.title

  /* --- Color & contrast --- */
  if (!parse(brand)) add('error', 'color', `Ana renk (${brand}) geçerli bir hex değil.`, undefined, { tool: 'set_site', input: { brand: '#4058e3' } })
  else {
    const cw = contrast('#ffffff', brand)!
    if (cw < 4.5)
      add(cw < 3 ? 'error' : 'warning', 'color', `Ana renk beyaz yazıyla ${cw}:1 kontrast veriyor (en az 4.5:1). Marka bölümlerindeki yazılar ve açık bölümlerdeki butonlar zor okunur.`, undefined, {
        tool: 'set_site',
        input: { brand: adjustFor(brand, '#ffffff') },
        hint: 'Aynı tonun koyulaştırılmış hali',
      })
    const cd = contrast(brand, palette('dark', brand).bg)!
    if (cd < 1.8 && visible.some((s) => s.style.palette === 'dark' && len(s.content.primary)))
      add('warning', 'color', `Ana renk koyu bölüm zeminiyle neredeyse aynı (${cd}:1); koyu bölümlerdeki butonlar kayboluyor.`, undefined, { tool: 'set_site', input: { brand: adjustFor(brand, '#131417', 3) } })
  }

  for (const s of visible) {
    const pal = palette(s.style.palette, brand)
    const bg = getBg(s)
    if (bg.type === 'image') {
      if (!bg.image) add('error', 'images', 'Arka plan türü görsel ama görsel yok.', s, { tool: 'set_background', input: { section_id: s.id, type: 'color' }, hint: 'ya da find_images ile görsel bul' })
      else if (!LIGHT_FG(s.style.palette)) add('error', 'color', 'Görsel arka plan üstünde koyu yazı var; karartma siyah olduğu için okunmaz.', s, { tool: 'style_section', input: { section_id: s.id, palette: 'dark' }, ...(bg.overlay < 40 ? { hint: 'ardından set_background overlay 50' } : {}) })
      else if (bg.overlay < 35) add('warning', 'color', `Görsel karartması %${bg.overlay}; yazının okunması için %40-60 önerilir.`, s, { tool: 'set_background', input: { section_id: s.id, overlay: 50 } })
      continue
    }
    const grounds = bg.type === 'gradient' ? [bg.gradFrom, bg.gradTo] : [s.style.bg || pal.bg]
    const custom = bg.type === 'gradient' || !!s.style.bg
    const done = new Set<string>()
    const once = (key: string, f: () => void) => !done.has(key) && (done.add(key), f())
    for (const g of grounds) {
      if (custom) {
        const ct = contrast(pal.fg, g)
        const cm = contrast(pal.muted, g)
        if (ct !== null && ct < 3) once('fg', () => add('error', 'color', `Özel zemin (${g}) ile başlık rengi ${ct}:1 kontrastta.`, s, bg.type === 'gradient' ? { tool: 'style_section', input: { section_id: s.id, palette: lum(parse(g)!) > 0.4 ? 'light' : 'dark' } } : { tool: 'style_section', input: { section_id: s.id, bg: '' } }))
        else if (cm !== null && cm < 4.5) once('fg', () => add('warning', 'color', `Özel zemin (${g}) üstünde açıklama metni ${cm}:1 kontrastta (≥4.5 olmalı).`, s, { tool: 'style_section', input: { section_id: s.id, bg: '' } }))
      }
      if (s.style.titleColor) {
        const c = contrast(s.style.titleColor, g)
        if (c !== null && c < 3) once('tc', () => add('error', 'color', `Başlık rengi ${s.style.titleColor} zeminde ${c}:1 kontrastta.`, s, { tool: 'style_section', input: { section_id: s.id, titleColor: '' } }))
      }
      for (const [el, st] of Object.entries(s.els ?? {})) {
        if (!st.color) continue
        const big = /^(title|accent|quote|brand)$/.test(el)
        const c = contrast(st.color, st.bg || g)
        if (c !== null && c < (big ? 3 : 4.5))
          once(`el:${el}`, () => add('warning', 'color', `${fieldLabel(s, el)} rengi ${st.color} zeminde ${c}:1 kontrastta.`, s, { tool: 'style_element', input: { section_id: s.id, el, color: adjustFor(st.color!, st.bg || g, big ? 3 : 4.5) } }))
      }
    }
    const gbg = s.grid?.bg
    if (gbg && s.items.length) {
      const c = contrast(pal.fg, gbg)
      if (c !== null && c < 4.5) add('warning', 'color', `Kart zemini (${gbg}) ile kart yazısı ${c}:1 kontrastta.`, s, { tool: 'set_grid', input: { section_id: s.id, bg: '' } })
    }
  }

  /* --- Palette rhythm --- */
  const key = (s: Section) => (getBg(s).type === 'image' ? `img:${s.id}` : getBg(s).type === 'gradient' ? `grad:${s.id}` : s.style.bg || s.style.palette)
  const pick = (...avoid: (PaletteId | undefined)[]) => (['light', 'soft', 'sand', 'dark'] as PaletteId[]).find((p) => !avoid.includes(p))!
  body.forEach((s, i) => {
    const prev = body[i - 1]
    if (!prev || key(prev) !== key(s)) return
    const fix = { tool: 'style_section', input: { section_id: s.id, palette: pick(prev.style.palette, body[i + 1]?.style.palette, s.style.palette === 'brand' ? undefined : 'dark') } }
    if (s.style.palette === 'brand' && !s.style.bg) add('error', 'color', `İki Marka bölümü yan yana (${prev.name} → ${s.name}); ritim bozuluyor.`, s, fix)
    else add('warning', 'color', `${prev.name} ile aynı zemin; bölümler birbirine karışıyor.`, s, fix)
  })
  const count = (p: PaletteId) => body.filter((s) => s.style.palette === p && !s.style.bg && getBg(s).type === 'color').length
  if (count('brand') > 2) add('warning', 'color', `${count('brand')} bölüm Marka paletinde; 1-2 tane (karşılama ve harekete çağrı) yeterli.`)
  if (body.length >= 4 && count('brand') + count('dark') > Math.ceil(body.length / 2)) add('warning', 'color', 'Koyu/Marka bölümler sayfanın yarısından fazla; sayfa ağır görünüyor. Bazılarını light/soft/sand yap.')
  if (body.length >= 4 && count('brand') + count('dark') === 0 && body.every((s) => getBg(s).type === 'color'))
    add('info', 'color', 'Tüm bölümler açık zeminde; ritim düz. Karşılama ya da harekete çağrıyı Marka/Koyu yapmayı düşün.', hero, hero ? { tool: 'style_section', input: { section_id: hero.id, palette: 'brand' } } : undefined)

  /* --- Structure --- */
  if (!hero) add('warning', 'structure', 'Karşılama (hero) bölümü yok; ziyaretçi ilk ekranda ne sunduğunu görmüyor.', undefined, { tool: 'add_section', input: { kind: 'hero', index: 1 } })
  else {
    const first = body.find((s) => s.kind !== 'banner')
    if (first && first.id !== hero.id) {
      const steps = body.indexOf(hero) - body.indexOf(first)
      add('info', 'structure', 'Karşılama ilk bölüm değil.', hero, { tool: 'section_action', input: { section_id: hero.id, action: 'move_up', times: steps } })
    }
  }
  const ctas = body.filter((s) => s.kind === 'cta' || s.kind === 'form')
  if (!ctas.length) add('warning', 'structure', 'Harekete çağrı ya da iletişim formu yok; sayfa ziyaretçiyi bir eyleme davet etmiyor.', undefined, { tool: 'add_section', input: { kind: 'cta' } })
  else if (body.length >= 5 && body.indexOf(ctas[ctas.length - 1]) < body.length / 2) add('info', 'structure', 'Son harekete çağrı sayfanın ilk yarısında; sayfa sonuna bir CTA koy.', ctas[ctas.length - 1])
  if (body.length >= 5 && !body.some((s) => s.kind === 'quote')) add('info', 'structure', 'Sosyal kanıt (müşteri yorumu) yok.', undefined, { tool: 'add_section', input: { kind: 'quote' } })
  if (body.length && body.length < 4) add('info', 'structure', `Sayfada yalnızca ${body.length} içerik bölümü var; açılış sayfası için 6-9 bölüm idealdir.`)
  if (body.length > 12) add('info', 'structure', `${body.length} içerik bölümü var; sayfa uzun. Tekrarlayanları birleştir.`)
  const LIMIT: Partial<Record<SectionKind, number>> = { hero: 1, faq: 1, form: 1, quote: 2, cta: 2, features: 2, steps: 1 }
  for (const [k, max] of Object.entries(LIMIT) as [SectionKind, number][]) {
    const list = body.filter((s) => s.kind === k)
    if (list.length > max) add(k === 'hero' ? 'warning' : 'info', 'structure', `${list.length} adet ${KINDS[k].name} bölümü var (en fazla ${max} önerilir).`, list[max], { tool: 'section_action', input: { section_id: list[max].id, action: 'remove' }, hint: 'ya da içeriğini diğerine taşı' })
  }
  body.forEach((s, i) => {
    if (i && body[i - 1].kind === s.kind && s.kind !== 'layout' && s.kind !== 'text' && !LIMIT[s.kind]) add('info', 'structure', `Arka arkaya iki ${KINDS[s.kind].name} bölümü.`, s)
  })
  for (const s of doc.sections.filter((x) => x.hidden))
    add(KINDS[s.kind].pinned ? 'warning' : 'info', 'structure', KINDS[s.kind].pinned ? 'Sabit bölüm gizli; ziyaretçi menüye/alt bilgiye ulaşamaz.' : 'Gizli bölüm; gerekmiyorsa sil, gerekiyorsa göster.', s, { tool: 'section_action', input: { section_id: s.id, action: KINDS[s.kind].pinned ? 'show' : 'remove' } })

  /* --- Content --- */
  const footer = doc.sections.find((s) => s.kind === 'footer')
  if (nav && footer && len(nav.content.brand) && len(footer.content.brand) && nav.content.brand.trim() !== footer.content.brand.trim())
    add('warning', 'content', `Üst menüdeki site adı (“${nav.content.brand}”) ile alt bilgideki (“${footer.content.brand}”) farklı.`, footer, { tool: 'set_text', input: { section_id: footer.id, field: 'brand', value: nav.content.brand } })
  const siteName = nav?.content.brand ?? ''
  for (const s of visible) {
    const def = KINDS[s.kind]
    const d = DEFAULTS[s.kind]
    const shown = def.fields.filter((f) => !f.showIf || f.showIf(s))
    if (customized) {
      const stale = shown.filter((f) => TEXT_KEYS.includes(f.key) && len(s.content[f.key]) && s.content[f.key] === d.content[f.key]).map((f) => f.key)
      const leftover = !/pursae/i.test(siteName) && Object.entries(s.content).some(([k, v]) => TEXT_KEYS.includes(k) && /pursae|wordpress|golementor/i.test(v))
      const staleItems = s.kind === 'layout' ? [] : s.items.filter((it) => it.title && d.items.some((x) => x.title === it.title))
      const parts = [stale.length && stale.map((k) => fieldLabel(s, k)).join(', '), staleItems.length && `${staleItems.length} öğe`, !stale.length && leftover && 'Pursae/WordPress geçiyor'].filter(Boolean)
      if (parts.length)
        add('warning', 'content', `Şablon metni duruyor (${parts.join('; ')}); sayfanın konusuyla uyumsuz.`, s, stale.length || !staleItems.length ? { tool: 'set_text', input: { section_id: s.id, field: stale[0] ?? 'title' }, hint: 'Alanları ve öğeleri işletmeye göre yeniden yaz' } : { tool: 'update_item', input: { section_id: s.id, item_id: staleItems[0].id }, hint: 'Öğeleri yeniden yaz' })
    }
    const main = s.kind === 'quote' ? 'quote' : s.kind === 'banner' ? 'text' : s.kind === 'image' ? 'image' : shown.some((f) => f.key === 'title') ? 'title' : undefined
    if (main && !len(s.content[main])) add('warning', 'content', `${fieldLabel(s, main)} boş.`, s, { tool: 'set_text', input: { section_id: s.id, field: main } })
    if ((s.kind === 'hero' || s.kind === 'cta' || s.kind === 'form') && !len(s.content.primary)) add('warning', 'content', 'Ana buton boş; ziyaretçiye net bir eylem sun.', s, { tool: 'set_text', input: { section_id: s.id, field: 'primary' } })
    const empty = s.kind === 'layout' ? [] : s.items.filter((it) => !len(it.title))
    if (empty.length) add('warning', 'content', `${empty.length} öğenin başlığı boş.`, s, { tool: 'update_item', input: { section_id: s.id, item_id: empty[0].id } })
    const tl = len(s.content.title)
    if (s.kind === 'hero') {
      if (tl > 40) add('warning', 'content', `Karşılama başlığı ${tl} karakter; 40'ın altında, vurucu tut (ödülü “Vurgulu satır”a taşı).`, s, { tool: 'set_text', input: { section_id: s.id, field: 'title' } })
      if (tl + len(s.content.accent) > 75) add('info', 'content', 'Başlık + vurgulu satır toplamı uzun; ilk ekranda 3-4 satırı geçebilir.', s)
      if (len(s.content.body) > 240) add('warning', 'content', `Karşılama açıklaması ${len(s.content.body)} karakter; 1-2 cümle (≤180) yeterli.`, s, { tool: 'set_text', input: { section_id: s.id, field: 'body' } })
      if (len(s.content.eyebrow) > 32) add('info', 'content', 'Küçük etiket uzun; 2-4 kelime yeterli.', s)
    } else if (tl > 70) add('warning', 'content', `Başlık ${tl} karakter; 60'ın altına indir.`, s, { tool: 'set_text', input: { section_id: s.id, field: 'title' } })
    else if (s.kind === 'cta' && tl > 50) add('info', 'content', 'Harekete çağrı başlığı kısa olursa daha güçlü olur (≤45).', s)
    if (s.kind !== 'hero' && len(s.content.body) > 320) add('info', 'content', `Açıklama ${len(s.content.body)} karakter; bölümler için 1-3 cümle önerilir.`, s)
    if (len(s.content.quote) > 220) add('info', 'content', 'Müşteri yorumu uzun; en etkili 1-2 cümleyi bırak.', s)
    if (s.kind === 'quote' && len(s.content.quote) && !len(s.content.author)) add('warning', 'content', 'Yorumun sahibi (Kişi) boş; isimsiz yorum güven vermez.', s, { tool: 'set_text', input: { section_id: s.id, field: 'author' } })
    const longItem = s.items.find((it) => len(it.text) > (s.kind === 'faq' ? 400 : 180))
    if (longItem && s.kind !== 'layout') add('info', 'content', `“${toPlain(longItem.title).slice(0, 40)}” öğesinin metni uzun.`, s, { tool: 'update_item', input: { section_id: s.id, item_id: longItem.id } })
    const min = s.kind === 'features' || s.kind === 'faq' ? 3 : s.kind === 'steps' ? 3 : 0
    if (min && s.items.length < min) add('info', 'content', `${s.items.length} öğe var; ${KINDS[s.kind].name} için en az ${min} önerilir.`, s, { tool: 'add_item', input: { section_id: s.id } })
  }

  /* --- Typography --- */
  const heroSize = hero?.style.titleSize ?? 0
  const sizes = new Set<number>()
  for (const s of visible) {
    if (KINDS[s.kind].pinned || s.kind === 'banner' || s.kind === 'layout' || s.kind === 'html' || s.kind === 'image') continue
    const t = s.style.titleSize
    if (s.kind === 'hero') {
      if (t < 48) add('info', 'typography', `Karşılama başlığı ${t}px; 64-96px arası daha etkili.`, s, { tool: 'style_section', input: { section_id: s.id, titleSize: 72 } })
      if (t > 112) add('warning', 'typography', `Karşılama başlığı ${t}px; çok büyük, satırlar kırılır.`, s, { tool: 'style_section', input: { section_id: s.id, titleSize: 92 } })
    } else {
      if (s.kind !== 'quote' && s.kind !== 'cta') sizes.add(t)
      if (hero && t >= heroSize) add('warning', 'typography', `Başlık (${t}px) karşılama başlığından (${heroSize}px) büyük ya da eşit; hiyerarşi bozuluyor.`, s, { tool: 'style_section', input: { section_id: s.id, titleSize: s.kind === 'quote' ? 36 : Math.min(56, Math.round(heroSize * 0.6)) } })
      else if (t > 72) add('info', 'typography', `Bölüm başlığı ${t}px; 40-56px önerilir.`, s, { tool: 'style_section', input: { section_id: s.id, titleSize: 52 } })
      else if (t < 28) add('info', 'typography', `Bölüm başlığı ${t}px; gövde metninden yeterince ayrışmıyor.`, s, { tool: 'style_section', input: { section_id: s.id, titleSize: 40 } })
    }
    const b = s.style.bodySize
    if (b !== undefined && b < 15) add('warning', 'typography', `Metin boyutu ${b}px; okunabilirlik için 16-18px.`, s, { tool: 'style_section', input: { section_id: s.id, bodySize: 17 } })
    if (b !== undefined && b > 22) add('info', 'typography', `Metin boyutu ${b}px; gövde metni için büyük.`, s, { tool: 'style_section', input: { section_id: s.id, bodySize: 18 } })
    const ls = s.style.letterSpacing
    if (ls !== undefined && (ls > 0.05 || ls < -0.08)) add('info', 'typography', `Başlık harf aralığı ${ls}em; -0.04 ile 0 arası önerilir.`, s, { tool: 'style_section', input: { section_id: s.id, letterSpacing: -0.02 } })
    if (s.style.titleWeight !== undefined && s.style.titleWeight < 300) add('info', 'typography', 'Başlık kalınlığı çok ince.', s, { tool: 'style_section', input: { section_id: s.id, titleWeight: 400 } })
    for (const [el, st] of Object.entries(s.els ?? {})) if (st.fontSize !== undefined && st.fontSize < 13) add('warning', 'typography', `${fieldLabel(s, el)} ${st.fontSize}px; mobilde okunmaz.`, s, { tool: 'style_element', input: { section_id: s.id, el, fontSize: 15 } })
  }
  if (sizes.size > 4) add('info', 'typography', `Bölüm başlıklarında ${sizes.size} farklı boyut var (${[...sizes].sort((a, b) => b - a).join(', ')}px); 2-3 kademede topla.`)

  /* --- Layout, spacing, motion --- */
  const pads = new Set<number>()
  for (const s of body) {
    if (KINDS[s.kind].spacing) {
      pads.add(s.style.padding)
      if (s.style.padding < 48) add('info', 'layout', `Dikey boşluk ${s.style.padding}px; bölüm sıkışık görünüyor (64-112 önerilir).`, s, { tool: 'style_section', input: { section_id: s.id, padding: 88 } })
      if (s.style.padding > 200) add('info', 'layout', `Dikey boşluk ${s.style.padding}px; fazla.`, s, { tool: 'style_section', input: { section_id: s.id, padding: 160 } })
    }
    if (s.kind === 'features' || s.kind === 'steps') {
      const g = getGrid(s)
      const n = s.items.length
      if (n && n < g.cols) add('info', 'layout', `${n} öğe ${g.cols} sütuna diziliyor; sağda boşluk kalır.`, s, { tool: 'set_grid', input: { section_id: s.id, cols: n } })
      else if (n > g.cols && n % g.cols) {
        const cols = [3, 2, 4].find((c) => n % c === 0 && c <= 4)
        add('info', 'layout', `${n} öğe ${g.cols} sütunda; son satır yarım kalıyor.`, s, cols ? { tool: 'set_grid', input: { section_id: s.id, cols, colsT: Math.min(2, cols) } } : { tool: 'add_item', input: { section_id: s.id }, hint: 'öğe sayısını sütunun katına tamamla' })
      }
      if (g.colsM > 2) add('warning', 'responsive', `Mobilde ${g.colsM} sütun; kartlar okunmayacak kadar daralır.`, s, { tool: 'set_grid', input: { section_id: s.id, colsM: 1 } })
      if (g.colsT > 3) add('info', 'responsive', `Tablette ${g.colsT} sütun; 2 önerilir.`, s, { tool: 'set_grid', input: { section_id: s.id, colsT: 2 } })
    }
    const bg = getBg(s)
    if (bg.decor !== 'none' && bg.decorOpacity > 40) add('info', 'layout', `Dekor opaklığı %${bg.decorOpacity}; içerikle yarışıyor (%8-25 önerilir).`, s, { tool: 'set_background', input: { section_id: s.id, decorOpacity: 16 } })
  }
  if (pads.size > 4) add('info', 'layout', `${pads.size} farklı dikey boşluk değeri var; 64/88/112/160 ölçeğinde topla.`)
  const animated = visible.filter((s) => getMotion(s).entrance !== 'none')
  if (visible.length >= 5 && animated.length > visible.length * 0.6) add('info', 'layout', `${animated.length}/${visible.length} bölümde giriş animasyonu var; abartılı. Önemli 2-4 bölümde bırak.`, animated[animated.length - 1], { tool: 'set_motion', input: { section_id: animated[animated.length - 1].id, entrance: 'none' } })
  const loud = visible.filter((s) => isHeavy(getMotion(s)))
  if (loud.length > 2) add('info', 'layout', `${loud.length} bölümde ağır hareket (kayma/çevrilme/zıplama, parallax ya da yapışkan); sakin bir site için fade/fade-up tercih et, parallax'ı tek bölümde (ör. hero) bırak.`, loud[loud.length - 1], { tool: 'set_motion', input: { section_id: loud[loud.length - 1].id, entrance: 'fade-up', parallax: 0 } })
  const slow = animated.find((s) => getMotion(s).duration + getMotion(s).delay > 1600)
  if (slow) add('info', 'layout', `${slow.name} animasyonu ${getMotion(slow).duration + getMotion(slow).delay} ms sürüyor; içerik geç görünür (≤1000 ms önerilir).`, slow, { tool: 'set_motion', input: { section_id: slow.id, duration: 700, delay: 0 } })
  const elAnims = visible.reduce((n, s) => n + Object.values(s.els ?? {}).filter((e) => e.motion?.entrance && e.motion.entrance !== 'none').length, 0)
  if (elAnims > 8) add('info', 'layout', `${elAnims} öğede ayrı giriş animasyonu var; bölüm düzeyinde "sırayla canlandır" (set_motion stagger) daha sakin ve tutarlı olur.`)

  /* --- Images --- */
  const used = new Map<string, Section[]>()
  const note = (url: string | undefined, s: Section) => url && used.set(url, [...(used.get(url) ?? []), s])
  for (const s of visible) {
    const img = s.kind === 'hero' ? (s.content.visual === 'image' ? s.content.image : undefined) : s.kind === 'media' || (s.kind === 'image' && s.content.video !== '1') ? s.content.image : undefined
    if ((s.kind === 'hero' && s.content.visual === 'image') || s.kind === 'media' || (s.kind === 'image' && s.content.video !== '1')) {
      if (!len(img)) add('error', 'images', 'Görsel alanı boş.', s, { tool: 'set_text', input: { section_id: s.id, field: 'image' }, hint: 'varsa find_images ile konuya uygun görsel bul' })
      else if (customized && STOCK.has(img!)) add('info', 'images', 'Varsayılan stok görsel duruyor; sayfanın konusuyla ilgisiz olabilir.', s, { tool: 'find_images', input: { query: '<konu, İngilizce>' }, hint: 'sonra set_text field=image' })
    }
    note(img, s)
    if (getBg(s).type === 'image') note(getBg(s).image, s)
    for (const it of s.kind === 'layout' ? s.items : []) if (it.title === 'image') note(it.text, s)
  }
  for (const [, list] of used) if (list.length > 1) add('info', 'images', `Aynı görsel ${list.length} yerde kullanılıyor (${list.map((s) => s.name).join(', ')}).`, list[1])
  const medias = body.filter((s) => s.kind === 'media')
  medias.forEach((s, i) => {
    const prev = medias[i - 1]
    if (prev && body.indexOf(s) - body.indexOf(prev) <= 2 && (prev.content.imageSide || 'right') === (s.content.imageSide || 'right'))
      add('info', 'images', 'Yakındaki Görsel ve yazı bölümleriyle fotoğraf aynı tarafta; sırayla sağ/sol değiştir.', s, { tool: 'set_text', input: { section_id: s.id, field: 'imageSide', value: (s.content.imageSide || 'right') === 'right' ? 'left' : 'right' } })
  })

  /* --- Responsive --- */
  for (const s of doc.sections) {
    const h = s.style.hideOn
    if (h.length >= 3) add('warning', 'responsive', 'Bölüm tüm cihazlarda gizli; hiç görünmüyor.', s, { tool: 'style_section', input: { section_id: s.id, hideOn: [] } })
    else if (h.includes('mobile') && (s.kind === 'hero' || s.kind === 'cta' || s.kind === 'form')) add('warning', 'responsive', 'Kritik bölüm mobilde gizli; ziyaretçilerin çoğu mobilden gelir.', s, { tool: 'style_section', input: { section_id: s.id, hideOn: h.filter((d) => d !== 'mobile') } })
    if (s.hidden) continue
    for (const k of ['primary', 'secondary'] as const) {
      const f = KINDS[s.kind].fields.find((x) => x.key === k)
      if (f?.el === 'button' && len(s.content[k]) > 24) add('info', 'responsive', `“${s.content[k]}” butonu uzun (${len(s.content[k])} karakter); mobilde iki satıra düşer. 2-4 kelime yeterli.`, s, { tool: 'set_text', input: { section_id: s.id, field: k } })
    }
  }

  /* --- SEO --- */
  const t = page.title.trim()
  const d = page.description.trim()
  const seoTitle = [hero?.content.title, hero?.content.accent].filter(Boolean).map((v) => toPlain(v)).join(' ').trim()
  if (!t) add('error', 'seo', 'Sayfa başlığı (SEO) boş.', undefined, { tool: 'page_settings', input: { title: `${siteName}${seoTitle ? ` — ${seoTitle}` : ''}`.slice(0, 60) } })
  else if (t.length > 60) add('warning', 'seo', `Sayfa başlığı ${t.length} karakter; Google 60'tan sonrasını keser.`, undefined, { tool: 'page_settings', input: {}, hint: 'title ≤ 60 karakter' })
  else if (t.length < 15) add('info', 'seo', 'Sayfa başlığı çok kısa; marka + ana fayda yaz (30-60 karakter).', undefined, { tool: 'page_settings', input: {}, hint: 'title 30-60 karakter' })
  if (customized && t && /pursae|wordpress/i.test(t) && !/pursae/i.test(siteName)) add('warning', 'seo', 'Sayfa başlığı hâlâ şablondaki Pursae başlığı.', undefined, { tool: 'page_settings', input: {}, hint: 'title: "<Site adı> — <ana fayda>"' })
  if (!d) add('warning', 'seo', 'Sayfa açıklaması (meta description) boş.', undefined, { tool: 'page_settings', input: {}, hint: 'description 120-160 karakter' })
  else if (d.length > 160) add('warning', 'seo', `Açıklama ${d.length} karakter; 160'ı geçmesin.`, undefined, { tool: 'page_settings', input: {}, hint: 'description ≤ 160 karakter' })
  else if (d.length < 50) add('info', 'seo', 'Açıklama çok kısa; 120-160 karakter idealdir.', undefined, { tool: 'page_settings', input: {}, hint: 'description 120-160 karakter' })
  else if (customized && /pursae|wordpress/i.test(d) && !/pursae/i.test(siteName)) add('warning', 'seo', 'Sayfa açıklaması hâlâ şablondaki Pursae metni.', undefined, { tool: 'page_settings', input: {}, hint: 'description 120-160 karakter' })
  if (page.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(page.slug)) add('warning', 'seo', `Adres (slug) “${page.slug}” küçük harf, rakam ve tire içermeli.`, undefined, { tool: 'page_settings', input: { slug: page.slug.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } })
  if (!page.indexable) add('info', 'seo', 'Sayfa arama motorlarına kapalı (indexable=false).', undefined, { tool: 'page_settings', input: { indexable: true } })

  /* --- Report --- */
  const all = issues.filter((i) => (!opts.focus || opts.focus === 'all' || i.area === opts.focus) && (!opts.sectionId || i.section_id === opts.sectionId || !i.section_id))
  const counts = { error: 0, warning: 0, info: 0 }
  const loss = new Map<AuditArea, number>()
  for (const i of all) {
    counts[i.severity]++
    loss.set(i.area, (loss.get(i.area) ?? 0) + PENALTY[i.severity])
  }
  const order = new Map(doc.sections.map((s, i) => [s.id, i]))
  all.sort((a, b) => RANK[a.severity] - RANK[b.severity] || (order.get(a.section_id ?? '') ?? -1) - (order.get(b.section_id ?? '') ?? -1))
  const limit = opts.limit ?? 25
  return {
    score: Math.max(0, 100 - [...loss.values()].reduce((n, v) => n + Math.min(AREA_CAP, v), 0)),
    counts,
    issues: all.slice(0, limit),
    ...(all.length > limit ? { truncated: all.length - limit } : {}),
    next: counts.error + counts.warning
      ? 'Önce error, sonra warning sorunlarını düzelt (info isteğe bağlı). fix önerilen araç çağrısıdır; value/metin verilmemişse içeriği sen yaz. Tek düzeltme turundan sonra yeniden denetleme; kalanları kullanıcıya özetle.'
      : 'Ciddi sorun yok. İstersen info önerilerinden birkaçını uygula ve kullanıcıya kısaca özetle.',
  }
}
