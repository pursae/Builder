import { CELL_DEFAULTS, CELL_TYPES, CORNERS, DECORS, FEATURE_ICONS, FLEX_STRUCTURES, FONT_PAIRS, GRID_STRUCTURES, KINDS, MAX_DEPTH, PALETTES, createLayout, createSection, fieldKind, fieldLabel, findSection, getValue, locate, uid } from '../data'
import { insertBounds } from '../store'
import { isRich, richKind, sanitizeRich } from '../rich'
import { cleanSvgCode, isSvgSrc, normColor, svgSrc } from '../svgTint'
import { ICON_KEYS, ICON_KINDS, ICON_SET, isIconEl, isIconUrl } from '../icons'
import type { BgSettings, CellType, ContainerBox, DocState, ElStyle, GridSettings, PageSettings, Section, SectionKind, SectionStyle, SiteSettings } from '../types'
import type { Step, Target } from './agent'
import { DEV_ONLY, canFetchImages, jobResult, startImageJob, waitForJobs } from './images'
import { SKILL_TOOLS, describeSkillCall, isSkillTool, planSkillTool } from './skills'
import { CLONE_TOOLS, describeCloneCall, planCloneTool } from './clone'
import { MOTION_TOOLS, describeMotionCall, planMotionTool } from './motionTool'
import { legacyEntrance, motionPatch } from '../motion'
import { FONT_PRESETS, aiSiteFonts, fitWeight, parseFontArg, siteFonts } from '../fonts'
import { DEFAULT_VARIANT, LIBRARY, createVariantSection, findVariant, variantDoc, variantLabel, variantsOf } from '../variants'

/* ---------- JSON schema helpers ---------- */
type Schema = Record<string, unknown>
const str = (description: string): Schema => ({ type: 'string', description })
const num = (description: string): Schema => ({ type: 'number', description })
const bool = (description: string): Schema => ({ type: 'boolean', description })
const oneOf = (values: readonly string[], description: string): Schema => ({ type: 'string', enum: values, description })
const obj = (properties: Record<string, Schema>, required?: string[], description?: string): Schema => ({
  type: 'object',
  properties,
  ...(required?.length ? { required } : {}),
  ...(description ? { description } : {}),
})
const arr = (items: Schema, description: string): Schema => ({ type: 'array', items, description })
const box4 = (description: string) => obj({ t: num('üst px'), r: num('sağ px'), b: num('alt px'), l: num('sol px') }, ['t', 'r', 'b', 'l'], description)

export interface ToolDef {
  name: string
  description: string
  parameters: Schema
}

const SECTION_ID = str('Sayfa bağlamındaki bölüm id')
const ADDABLE = (Object.keys(KINDS) as SectionKind[]).filter((k) => !KINDS[k].pinned)
const ICON_ARG = 'İkon adı (bilgi notundaki ikon listesinden, ör. rocket, shield, database), özel SVG adresi ya da ham <svg …>…</svg> kodu'
const STRUCTURES = [...FLEX_STRUCTURES, ...GRID_STRUCTURES].map((s) => s.id)
const CELLS = CELL_TYPES.map((c) => c.value)

export const TOOLS: ToolDef[] = [
  {
    name: 'get_section',
    description: 'Bir bölümün tüm ayrıntılarını (tam içerik, öğeler, stil, arka plan, ızgara, kapsayıcı, öğe stilleri) JSON olarak döndürür.',
    parameters: obj({ section_id: SECTION_ID }, ['section_id']),
  },
  {
    name: 'find_images',
    description:
      'İnternette ticari kullanıma uygun açık lisanslı (Creative Commons) fotoğraf arar, projeye indirir ve yerel URL’lerini (/ai-images/…) alt metin ve lisans/künye bilgisiyle döndürür. query İNGİLİZCE anahtar kelimeler olmalı (ör. "veterinarian dog", "coffee shop interior"); Türkçe sorgu zayıf sonuç verir. Dönen url’leri set_text (field image), set_background (type image), add_section fields ya da set_layout hücrelerinde kullan. Yalnızca geliştirme sunucusunda çalışır.',
    parameters: obj(
      {
        query: str('İngilizce arama kelimeleri (2-4 kelime)'),
        count: num('Görsel sayısı 1-8 (varsayılan 4)'),
        orientation: oneOf(['landscape', 'portrait', 'square'], 'Tercih edilen yön (isteğe bağlı)'),
        purpose: str('Görselin nerede kullanılacağı, ör. "hero", "media", "arka plan" (isteğe bağlı)'),
      },
      ['query'],
    ),
  },
  {
    name: 'set_text',
    description:
      'Bir bölümdeki bir alanın değerini değiştirir. field: içerik alanı (ör. title, accent, body, primary, image, html) ya da seçenek anahtarı (ör. visual, imageSide, floatCards, video) ya da öğe alanı "items.<itemId>.title" / "items.<itemId>.text". Görsel alanına URL ya da "attachment:<id>" ver. Paragraf/başlık alanları biçim için güvenli HTML alt kümesi kabul eder: <b>, <i>, <u>, <s>, <code>, <a href>, <br>, <ul>/<ol>/<li>.',
    parameters: obj({ section_id: SECTION_ID, field: str('Alan anahtarı'), value: str('Yeni değer') }, ['section_id', 'field', 'value']),
  },
  {
    name: 'add_section',
    description: 'Sayfaya yeni bir hazır bölüm ekler. Konum verilmezse alt bilginin hemen üstüne eklenir. Dönen sonuçta yeni bölümün id ve öğe id’leri olur.',
    parameters: obj(
      {
        kind: oneOf(ADDABLE, 'Bölüm türü'),
        after_section_id: str('Bu bölümün hemen altına ekle (isteğe bağlı)'),
        index: num('0 tabanlı sıra (isteğe bağlı, after_section_id yoksa)'),
        name: str('Bölüm adı (isteğe bağlı)'),
        fields: arr(obj({ field: str('Alan anahtarı'), value: str('Değer') }, ['field', 'value']), 'Başlangıç içerikleri (isteğe bağlı)'),
        items: arr(obj({ title: str('Başlık'), text: str('Açıklama'), icon: str(ICON_ARG) }, ['title']), 'Varsayılan öğelerin yerine geçecek öğeler (isteğe bağlı)'),
        palette: oneOf(PALETTES.map((p) => p.id), 'Arka plan paleti (isteğe bağlı)'),
        variant: str('Hazır tasarım id’si (bilgi notundaki tasarım kütüphanesinden, isteğe bağlı; yoksa varsayılan tasarım)'),
      },
      ['kind'],
    ),
  },
  {
    name: 'set_section_variant',
    description:
      'Bir bölümün tasarımını tasarım kütüphanesindeki başka bir hazır tasarımla değiştirir (üst menü, karşılama, alt bilgi dahil). İçerik (metinler, butonlar, görseller, öğeler) korunur; yalnızca yerleşim ve görünüm değişir. Tasarıma özel ek alanlar varsayılanlarla dolar, sonra set_text ile değiştirilebilir. "default" yerleşik tasarıma döner.',
    parameters: obj({ section_id: SECTION_ID, variant: str('Tasarım id’si (bilgi notundaki listeden, ör. hero: split-left, nav: floating-pill)') }, ['section_id', 'variant']),
  },
  {
    name: 'section_action',
    description: 'Bölümü sil, çoğalt, yukarı/aşağı taşı, gizle ya da göster. Üst menü ve alt bilgi sabittir.',
    parameters: obj(
      {
        section_id: SECTION_ID,
        action: oneOf(['remove', 'duplicate', 'move_up', 'move_down', 'hide', 'show'], 'İşlem'),
        times: num('Taşıma adım sayısı (varsayılan 1)'),
      },
      ['section_id', 'action'],
    ),
  },
  {
    name: 'style_section',
    description: 'Bölümün genel görünümünü değiştirir. Yalnızca değiştirmek istediğin alanları gönder.',
    parameters: obj(
      {
        section_id: SECTION_ID,
        name: str('Bölüm adı'),
        palette: oneOf(PALETTES.map((p) => p.id), 'Arka plan paleti'),
        bg: str('Paletin üstüne düz arka plan rengi (hex). Boş string paletin rengine döner.'),
        align: oneOf(['left', 'center'], 'Hizalama'),
        padding: num('Dikey iç boşluk px (ör. 64 az, 112 normal, 160 çok)'),
        titleSize: num('Başlık boyutu px'),
        titleWeight: num('Başlık kalınlığı (300-800)'),
        letterSpacing: num('Başlık harf aralığı em (ör. -0.03)'),
        titleColor: str('Başlık rengi hex (boş string sıfırlar)'),
        bodySize: num('Metin boyutu px'),
        anim: oneOf(['none', 'fade', 'up', 'zoom', 'left'], 'Giriş animasyonu (kısa yol; süre, sırayla canlandırma, parallax, hover için set_motion)'),
        hideOn: arr(oneOf(['desktop', 'tablet', 'mobile'], 'Cihaz'), 'Bölümün gizleneceği cihazlar'),
        css: str('Özel CSS; "selector" kelimesi bu bölümü hedefler'),
        cssId: str('CSS ID'),
      },
      ['section_id'],
    ),
  },
  {
    name: 'add_item',
    description: 'Öğe destekleyen bölüme (kartlar, adımlar, sorular, bağlantılar, öne çıkanlar) yeni öğe ekler.',
    parameters: obj({ section_id: SECTION_ID, title: str('Başlık / soru / bağlantı yazısı'), text: str('Açıklama / cevap'), icon: str(ICON_ARG), href: str('Bağlantı adresi') }, ['section_id', 'title']),
  },
  {
    name: 'update_item',
    description: 'Mevcut bir öğenin başlığını, metnini, ikonunu ya da bağlantısını değiştirir.',
    parameters: obj({ section_id: SECTION_ID, item_id: str('Öğe id'), title: str('Başlık'), text: str('Metin'), icon: str(ICON_ARG), href: str('Bağlantı adresi') }, ['section_id', 'item_id']),
  },
  {
    name: 'remove_item',
    description: 'Bölümden bir öğeyi siler.',
    parameters: obj({ section_id: SECTION_ID, item_id: str('Öğe id') }, ['section_id', 'item_id']),
  },
  {
    name: 'set_site',
    description: 'Tüm siteyi etkileyen ana rengi, yazı stilini / fontları ya da köşe stilini değiştirir. Fontlar font kütüphanesinden aile adıyla verilir; tüm bölümler devralır.',
    parameters: obj({
      brand: str('Ana renk hex'),
      fontPair: oneOf(Object.keys(FONT_PAIRS), 'Yazı stili (başlık harf aralığı/satır yüksekliği karakteri)'),
      fontPreset: oneOf(FONT_PRESETS.map((p) => p.id), 'Hazır font eşleşmesi: yazı stili + başlık + gövde fontunu birlikte ayarlar'),
      headingFont: str('Başlık fontu: kütüphaneden aile adı (ör. "Playfair Display"); "" = yazı stilinin fontu'),
      headingWeight: num('Başlık kalınlığı 100-900 (fontta olan en yakın değere yuvarlanır)'),
      bodyFont: str('Gövde fontu: kütüphaneden aile adı (ör. "Source Sans 3"); "" = Inter'),
      bodyWeight: num('Gövde kalınlığı (genelde 400)'),
      corners: oneOf(Object.keys(CORNERS), 'Köşeler'),
    }),
  },
  {
    name: 'set_background',
    description: 'Bölümün arka plan türünü (renk/gradyan/görsel) ve dekor katmanını ayarlar.',
    parameters: obj(
      {
        section_id: SECTION_ID,
        type: oneOf(['color', 'gradient', 'image'], 'Arka plan türü'),
        gradFrom: str('Gradyan başlangıç rengi hex'),
        gradTo: str('Gradyan bitiş rengi hex'),
        gradAngle: num('Gradyan açısı (derece)'),
        image: str('Görsel URL ya da attachment:<id>'),
        overlay: num('Görsel karartma yüzdesi 0-90'),
        decor: oneOf(DECORS.map((d) => d.id), 'Dekor'),
        decorSvg: str('decor=custom için SVG kodu'),
        decorColor: str('Dekor rengi hex'),
        decorOpacity: num('Dekor opaklığı 0-100'),
        decorScale: num('Dekor ölçeği % (ör. 100)'),
        decorX: num('Yatay konum %'),
        decorY: num('Dikey konum %'),
        decorRotate: num('Döndürme derece'),
        decorAnim: oneOf(['none', 'spin', 'float', 'pulse'], 'Dekor animasyonu'),
      },
      ['section_id'],
    ),
  },
  {
    name: 'style_element',
    description: 'Bölümdeki tek bir öğenin (ör. title, body, primary, items.<id>.title ya da ikon: items.<id>.icon / quote için "icon") stilini ayarlar. İkonlarda iconColor, iconSize, tile, tileSize, bg (kutu rengi), tileOpacity, radius, hide. reset=true öğe stilini sıfırlar.',
    parameters: obj(
      {
        section_id: SECTION_ID,
        el: str('Öğe alan anahtarı'),
        reset: bool('Öğe stilini sıfırla'),
        font: str('Font ailesi: kütüphaneden aile adı (ör. "Bebas Neue"), "@heading" / "@body" = site başlık/gövde fontu, "" = devral'),
        fontSize: num('Yazı boyutu px'),
        fontWeight: num('Kalınlık 100-900 (fontta olan en yakın değere yuvarlanır)'),
        lineHeight: num('Satır yüksekliği (ör. 1.2)'),
        letterSpacing: num('Harf aralığı em'),
        transform: oneOf(['none', 'uppercase', 'lowercase', 'capitalize'], 'Harf dönüşümü'),
        italic: bool('İtalik (false = düz)'),
        color: str('Yazı rengi hex'),
        bg: str('Arka plan rengi hex'),
        radius: num('Köşe yarıçapı px'),
        align: oneOf(['left', 'center', 'right'], 'Hizalama'),
        width: num('Genişlik (widthUnit ile; tam genişlik = 100 + %)'),
        widthUnit: oneOf(['px', '%', 'vw'], 'Genişlik birimi'),
        maxWidth: num('Maks. genişlik'),
        maxWidthUnit: oneOf(['px', '%'], 'Maks. genişlik birimi'),
        height: num('Yükseklik (metinlerde min. yükseklik)'),
        heightUnit: oneOf(['px', 'vh'], 'Yükseklik birimi'),
        fit: oneOf(['cover', 'contain'], 'Görsel sığdırma'),
        iconColor: str('İkon rengi hex: SVG ikon/görsel ya da kart ikonu (items.<id>.icon); tüm ikonu boyar, "" = varsayılan'),
        iconSize: num('İkon (glif) boyutu px; yalnızca ikon öğeleri'),
        tile: bool('İkonun arka plan kutusu açık/kapalı'),
        tileSize: num('İkon kutusu boyutu px'),
        tileOpacity: num('Kutu rengi yoğunluğu 0-100 (bg yoksa ikon renginden)'),
        hide: bool('İkonu gizle'),
        iconColors: { type: 'object', description: 'İki/çok tonlu SVG: orijinal renk hex → yeni hex, ör. {"#ffd400":"#4058e3"}', additionalProperties: { type: 'string' } },
        mt: num('Üst boşluk px'),
        mb: num('Alt boşluk px'),
        margin: box4('Dış boşluk'),
        padding: box4('İç boşluk'),
      },
      ['section_id', 'el'],
    ),
  },
  {
    name: 'set_grid',
    description: 'Hazır bölümlerdeki öğe ızgarasını (kart sütunları, boşluklar, kart stili, ikon) ayarlar.',
    parameters: obj(
      {
        section_id: SECTION_ID,
        cols: num('Masaüstü sütun'),
        colsT: num('Tablet sütun'),
        colsM: num('Mobil sütun'),
        gapX: num('Yatay boşluk px'),
        gapY: num('Dikey boşluk px'),
        pad: num('Kart iç boşluğu px'),
        radius: num('Kart köşe yarıçapı px'),
        bg: str('Kart arka planı hex'),
        border: bool('Kart kenarlığı'),
        borderW: num('Kenarlık kalınlığı px'),
        borderColor: str('Kenarlık rengi hex'),
        shadow: oneOf(['none', 'sm', 'md', 'lg'], 'Kart gölgesi'),
        showIcon: bool('İkonları göster'),
        iconSize: num('İkon kutusu px'),
        iconColor: str('İkon rengi hex ("" = tema vurgu rengi)'),
      },
      ['section_id'],
    ),
  },
  {
    name: 'set_container',
    description: 'Bölümün kapsayıcı (Flexbox/Grid) ayarlarını değiştirir: genişlik, yön, hizalama, boşluklar, kenarlık, gölge.',
    parameters: obj(
      {
        section_id: SECTION_ID,
        contentWidth: oneOf(['boxed', 'full'], 'Kutulu ya da tam genişlik'),
        width: num('Genişlik'),
        widthUnit: oneOf(['px', '%', 'vw'], 'Genişlik birimi'),
        minHeight: num('Min. yükseklik'),
        minHeightUnit: oneOf(['px', 'vh'], 'Yükseklik birimi'),
        direction: oneOf(['row', 'column', 'row-reverse', 'column-reverse'], 'Yön'),
        justify: oneOf(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'], 'Ana eksen dağıtımı'),
        align: oneOf(['stretch', 'start', 'center', 'end'], 'Çapraz eksen hizası'),
        wrap: bool('Sarma'),
        stackMobile: bool('Mobilde alt alta'),
        gapX: num('Yatay boşluk px'),
        gapY: num('Dikey boşluk px'),
        margin: box4('Dış boşluk'),
        padding: box4('İç boşluk'),
        borderStyle: oneOf(['none', 'solid', 'dashed', 'dotted'], 'Kenarlık stili'),
        borderWidth: num('Kenarlık px'),
        borderColor: str('Kenarlık rengi hex'),
        radius: num('Köşe yarıçapı px'),
        shadow: oneOf(['none', 'sm', 'md', 'lg'], 'Gölge'),
        zIndex: num('z-index'),
      },
      ['section_id'],
    ),
  },
  {
    name: 'set_layout',
    description:
      'Düzen (layout) bölümünün ya da iç kapsayıcının türünü, yapısını ve hücrelerini ayarlar. Hücreler 0 tabanlı sırayla verilir. Hücre türü "layout" hücreye iç içe bir Flexbox/Grid kapsayıcı koyar (layout_type, layout_structure); sonuçta dönen nested[].section_id ile aynı aracı tekrar çağırıp iç hücreleri doldur.',
    parameters: obj(
      {
        section_id: str('Düzen bölümünün ya da iç kapsayıcının id’si'),
        type: oneOf(['flex', 'grid'], 'Düzen türü'),
        structure: oneOf(STRUCTURES, 'Yapı'),
        cells: arr(
          obj(
            {
              index: num('Hücre sırası (0 tabanlı)'),
              type: oneOf(CELLS, 'Hücre türü'),
              value: str('Hücre içeriği (görselde URL)'),
              layout_type: oneOf(['flex', 'grid'], 'type=layout: iç kapsayıcının türü'),
              layout_structure: oneOf(STRUCTURES, 'type=layout: iç kapsayıcının yapısı'),
            },
            ['index', 'type'],
          ),
          'Hücreler',
        ),
      },
      ['section_id'],
    ),
  },
  {
    name: 'page_settings',
    description: 'Sayfa başlığı, adresi (slug), açıklaması ve arama motoru görünürlüğü (SEO).',
    parameters: obj({ title: str('Sayfa başlığı (≤60)'), slug: str('Adres, küçük harf ve tire'), description: str('Açıklama (≤160)'), indexable: bool('Arama motorlarında göster') }),
  },
  {
    name: 'editor_ui',
    description:
      'Editör arayüzünü kontrol eder ve kullanıcıya yer gösterir: show (bölüm/öğeyi seç ve vurgula), device (desktop|tablet|mobile), preview_on, preview_off, open_shortcuts, open_page_settings, open_command_palette, mode (basic|studio|ai), studio_tab (widgets|components|globals), basic_view (list|add|design), undo, redo, publish.',
    parameters: obj(
      {
        action: oneOf(['show', 'device', 'preview_on', 'preview_off', 'open_shortcuts', 'open_page_settings', 'open_command_palette', 'mode', 'studio_tab', 'basic_view', 'undo', 'redo', 'publish'], 'Eylem'),
        section_id: str('show için bölüm id'),
        el: str('show için öğe alanı (isteğe bağlı)'),
        value: str('device/mode/studio_tab/basic_view için değer'),
      },
      ['action'],
    ),
  },
  ...SKILL_TOOLS,
  ...CLONE_TOOLS,
  ...MOTION_TOOLS,
]

/* ---------- Execution ---------- */
export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolCtx {
  doc: DocState
  page: PageSettings
  assets: Map<string, string>
}

export type ToolPlan = { steps: Step[]; result: unknown; target?: Target } | { error: string }

type In = Record<string, unknown>
const s_ = (v: unknown) => (typeof v === 'string' ? v : undefined)
const n_ = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined)
const b_ = (v: unknown) => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : undefined)

/** Copies only the listed keys that are present, coercing to the schema type. */
function pick<T>(input: In, spec: Record<string, 's' | 'n' | 'b' | 'raw'>): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, t] of Object.entries(spec)) {
    if (!(k in input) || input[k] === null) continue
    const v = t === 's' ? s_(input[k]) : t === 'n' ? n_(input[k]) : t === 'b' ? b_(input[k]) : input[k]
    if (v !== undefined) out[k] = v
  }
  return out as Partial<T>
}

const resolveAsset = (v: string, ctx: ToolCtx) => {
  const m = v.match(/^attachment:(\S+)$/)
  return m ? ctx.assets.get(m[1]) ?? v : v
}

const TYPE_LIMIT = 600
const MAIN_FIELD: Partial<Record<SectionKind, string>> = { banner: 'text', quote: 'quote', image: 'caption', footer: 'brand', nav: 'brand' }
const mainField = (k: SectionKind) => MAIN_FIELD[k] ?? (KINDS[k].fields.some((f) => f.key === 'title') ? 'title' : undefined)

type FieldCheck = { mode: 'type' | 'set'; label: string } | { error: string }

/** Unknown icon name → error with close matches from the icon library. */
function iconError(v: string) {
  if (/<svg[\s>]/i.test(v)) {
    const r = cleanSvgCode(v)
    return { error: `SVG kodu kullanılamadı: ${'error' in r ? r.error : 'bilinmeyen hata'}` }
  }
  const t = v.toLocaleLowerCase('tr')
  const near = ICON_KEYS.filter((k) => k.includes(t) || t.includes(k) || ICON_SET[k].tags.includes(t)).slice(0, 8)
  return { error: `Bilinmeyen ikon "${v}". ${near.length ? `Yakın: ${near.join(', ')}. ` : ''}Geçerli adlar bilgi notundaki ikon listesinde; özel SVG için https://… adresi ver.` }
}

const okIcon = (v: string) => !!ICON_SET[v] || isIconUrl(v)

/** Raw `<svg …>` code given as an icon → sanitized data URL; anything else unchanged. */
function iconArg<T extends string | undefined>(v: T): T {
  if (!v || !/<svg[\s>]/i.test(v)) return v
  const r = cleanSvgCode(v)
  return ('error' in r ? v : svgSrc(r.svg)) as T
}

function checkField(s: Section, field: string, value: string): FieldCheck {
  const def = KINDS[s.kind]
  if (isIconEl(field) && (ICON_KINDS as readonly string[]).includes(s.kind)) {
    if (field !== 'icon' && !s.items.some((i) => i.id === field.split('.')[1])) return { error: `"${s.name}" içinde ${field.split('.')[1]} id'li öğe yok.` }
    return okIcon(value) ? { mode: 'set', label: fieldLabel(s, field) } : iconError(value)
  }
  if (field.startsWith('items.')) {
    const [, itemId, part] = field.split('.')
    const item = s.items.find((i) => i.id === itemId)
    if (!item) return { error: `"${s.name}" içinde ${itemId} id'li öğe yok. Öğeler: ${s.items.map((i) => i.id).join(', ') || 'yok'}` }
    if (part !== 'title' && part !== 'text') return { error: 'Öğe alanı "items.<id>.title" ya da "items.<id>.text" olmalı.' }
    if (s.kind === 'layout') {
      if (part === 'title') return { error: 'Düzen hücresinin türünü set_layout ile değiştir; içerik items.<id>.text alanındadır.' }
      return { mode: item.title === 'image' ? 'set' : 'type', label: fieldLabel(s, field) }
    }
    if (s.kind === 'custom' && (item.node === 'image' || item.node === 'icon' || item.node === 'box' || value.length > TYPE_LIMIT)) return { mode: 'set', label: fieldLabel(s, field) }
    return { mode: 'type', label: fieldLabel(s, field) }
  }
  const option = def.options?.find((o) => o.key === field)
  if (option) {
    if (!option.choices.some((c) => c.value === value)) return { error: `${field} için geçerli değerler: ${option.choices.map((c) => `"${c.value}"`).join(', ')}` }
    return { mode: 'set', label: option.label }
  }
  const f = def.fields.find((x) => x.key === field)
  if (!f) return { error: `"${s.name}" (${s.kind}) bölümünde "${field}" alanı yok. Geçerli alanlar: ${[...def.fields.map((x) => x.key), ...(def.options?.map((o) => o.key) ?? [])].join(', ') || 'yok'}${def.items ? ', items.<id>.title/text' : ''}` }
  return { mode: f.el === 'image' || f.el === 'code' || value.length > TYPE_LIMIT ? 'set' : 'type', label: f.label }
}

function textSteps(s: Section, field: string, value: string, mode: 'type' | 'set', label: string): Step[] {
  if (mode === 'type') return [{ kind: 'type', target: { sectionId: s.id, el: field }, text: value, label }]
  if (field.startsWith('items.')) return [{ kind: 'do', label, target: { sectionId: s.id, el: field }, run: (api) => api.dispatch({ type: 'field', id: s.id, el: field, value }) }]
  return [{ kind: 'do', label, target: { sectionId: s.id, el: field }, run: (api) => api.dispatch({ type: 'content', id: s.id, key: field, value, label }) }]
}

export function planTool(call: ToolCall, ctx: ToolCtx): ToolPlan {
  const sk = planSkillTool(call, ctx)
  if (sk) return sk
  const cl = planCloneTool(call, ctx)
  if (cl) return cl
  const mo = planMotionTool(call, ctx)
  if (mo) return mo
  const a = call.input ?? {}
  const { doc } = ctx
  const find = (id: unknown) => (typeof id === 'string' ? findSection(doc, id) : undefined)
  const need = (): Section | { error: string } => find(a.section_id) ?? { error: `"${String(a.section_id)}" id'li bölüm yok. Mevcut id'ler: ${doc.sections.map((s) => `${s.id} (${s.name})`).join(', ')}` }

  switch (call.name) {
    case 'get_section': {
      const s = need()
      if ('error' in s) return s
      return { steps: [], result: s }
    }

    case 'find_images': {
      const query = s_(a.query)?.trim()
      if (!query) return { error: 'query gerekli (İngilizce anahtar kelimeler).' }
      if (!canFetchImages) return { error: DEV_ONLY }
      const count = Math.max(1, Math.min(8, Math.round(n_(a.count) ?? 4)))
      const o = s_(a.orientation)
      const job = startImageJob({ query, count, orientation: o === 'landscape' || o === 'portrait' || o === 'square' ? o : undefined })
      // Serialized after the wait steps have played, so the model receives the finished download.
      const result = {
        toJSON() {
          const r = jobResult(job)
          if (!r.images.length) return { error: r.error ?? `“${query}” için görsel bulunamadı; başka İngilizce kelimelerle dene.` }
          return {
            images: r.images.map((i) => ({ url: i.url, alt: i.alt, credit: i.credit, orientation: i.width && i.height ? (i.width / i.height > 1.15 ? 'landscape' : i.height / i.width > 1.15 ? 'portrait' : 'square') : undefined })),
            ...(r.error ? { warning: r.error } : {}),
            note: 'Görseller indirildi. url’leri image alanlarında aynen kullan; künyeler public/ai-images/credits.json içinde.',
          }
        },
      }
      return { steps: waitForJobs([], 0, [job]), result }
    }

    case 'set_text': {
      const s = need()
      if ('error' in s) return s
      const field = s_(a.field) ?? ''
      const raw = resolveAsset(s_(a.value) ?? String(a.value ?? ''), ctx)
      const value = isIconEl(field) ? iconArg(raw) : raw
      const chk = checkField(s, field, value)
      if ('error' in chk) return chk
      // Formatted text is sanitized and set in one go (typing it would flash half-open tags).
      const rich = richKind(fieldKind(s, field)) && isRich(value)
      return { steps: textSteps(s, field, rich ? sanitizeRich(value) : value, rich ? 'set' : chk.mode, `${s.name} › ${chk.label} yazıldı`), result: { ok: true }, target: { sectionId: s.id, el: field } }
    }

    case 'add_section': {
      const kind = s_(a.kind) as SectionKind | undefined
      if (!kind || !(kind in KINDS)) return { error: `Geçersiz kind. Geçerli: ${ADDABLE.join(', ')}` }
      if (KINDS[kind].pinned) return { error: 'Üst menü ve alt bilgi sabittir, yenisi eklenemez; tasarımlarını set_section_variant ile değiştir.' }
      const variant = s_(a.variant)
      if (variant && !findVariant(kind, variant)) return { error: variantsOf(kind).length ? `${kind} için geçerli tasarımlar: ${variantsOf(kind).map((v) => v.id).join(', ')}` : `${KINDS[kind].name} bölümünün hazır tasarımı yok; variant gönderme.` }
      const section = variant ? createVariantSection(kind, variant) : createSection(kind)
      const name = s_(a.name)
      if (name) section.name = name
      const palette = s_(a.palette)
      if (palette && PALETTES.some((p) => p.id === palette)) section.style.palette = palette as SectionStyle['palette']
      const typed: [string, string, string][] = []
      for (const f of Array.isArray(a.fields) ? (a.fields as In[]) : []) {
        const key = s_(f.field)
        if (!key) continue
        const raw = resolveAsset(s_(f.value) ?? '', ctx)
        const value = isIconEl(key) ? iconArg(raw) : raw
        const chk = checkField(section, key, value)
        if ('error' in chk) return chk
        if (chk.mode === 'type' && !key.startsWith('items.')) typed.push([key, value, chk.label])
        else section.content[key] = value
      }
      if (Array.isArray(a.items)) {
        if (!KINDS[kind].items) return { error: `${KINDS[kind].name} bölümü öğe desteklemiyor.` }
        section.items = (a.items as In[]).slice(0, KINDS[kind].items!.max).map((it, i) => ({
          id: uid('i'),
          title: s_(it.title) ?? '',
          text: s_(it.text) ?? '',
          icon: kind === 'features' ? (okIcon(iconArg(s_(it.icon)) ?? '') ? iconArg(s_(it.icon)) : Object.keys(FEATURE_ICONS)[i % 8]) : undefined,
        }))
      }
      // Type the headline live so the user sees the new section being written.
      const main = mainField(kind)
      if (main && !typed.some(([k]) => k === main) && section.content[main]) typed.unshift([main, section.content[main], fieldLabel(section, main)])
      for (const [k] of typed) section.content[k] = ''

      const { min, max } = insertBounds(doc.sections)
      const after = s_(a.after_section_id)
      const afterIdx = after ? doc.sections.findIndex((s) => s.id === after) : -1
      const idx = n_(a.index)
      const index = afterIdx >= 0 ? afterIdx + 1 : idx !== undefined ? Math.max(min, Math.min(max, Math.round(idx))) : max
      const steps: Step[] = [{ kind: 'do', label: `${section.name} bölümü eklendi`, target: { sectionId: section.id }, run: (api) => api.dispatch({ type: 'insert', section, index }) }]
      for (const [k, v, label] of typed) steps.push({ kind: 'type', target: { sectionId: section.id, el: k }, text: v, label: `${section.name} › ${label} yazıldı` })
      return { steps, result: { ok: true, section_id: section.id, index, items: section.items.map((i) => ({ id: i.id, title: i.title })) }, target: { sectionId: section.id } }
    }

    case 'set_section_variant': {
      const s = need()
      if ('error' in s) return s
      const id = s_(a.variant)?.trim() ?? ''
      if (!variantsOf(s.kind).length || !doc.sections.some((x) => x.id === s.id)) return { error: `"${s.name}" (${s.kind}) için hazır tasarım yok. Tasarımı olan türler: ${LIBRARY.map((k) => k.kind).join(', ')} (yalnızca sayfanın üst düzey bölümleri).` }
      const v = findVariant(s.kind, id)
      if (!v) return { error: `${s.kind} için geçerli tasarımlar: ${variantsOf(s.kind).map((x) => x.id).join(', ')}` }
      const t = { sectionId: s.id }
      if ((s.content.variant || DEFAULT_VARIANT) === v.id) return { steps: [], result: { ok: true, note: 'Bölüm zaten bu tasarımda.' }, target: t }
      const extras = v.extras?.length ? v.extras : undefined
      return {
        steps: [{ kind: 'do', label: variantLabel(s.kind, v.id), target: t, run: (api) => {
          const next = variantDoc(api.doc, s.id, v.id)
          if (next) api.dispatch({ type: 'replace', doc: next, label: variantLabel(s.kind, v.id) })
        } }],
        result: { ok: true, variant: v.id, name: v.name, ...(extras ? { extra_fields: extras, note: 'Bu tasarımın ek alanları varsayılan metinle doldu; içeriğe uygun değilse set_text ile değiştir.' } : {}) },
        target: t,
      }
    }

    case 'section_action': {
      const s = need()
      if ('error' in s) return s
      const action = s_(a.action)
      const pinned = KINDS[s.kind].pinned
      const t = { sectionId: s.id }
      if (pinned && action !== 'hide' && action !== 'show') return { error: `${s.name} sabit bir bölümdür; taşınamaz, çoğaltılamaz, silinemez.` }
      switch (action) {
        case 'remove':
          return { steps: [{ kind: 'do', label: `${s.name} silindi`, target: t, run: (api) => api.dispatch({ type: 'remove', id: s.id }) }], result: { ok: true } }
        case 'duplicate':
          return { steps: [{ kind: 'do', label: `${s.name} çoğaltıldı`, target: t, run: (api) => api.dispatch({ type: 'duplicate', id: s.id }) }], result: { ok: true, note: 'Kopya hemen altına eklendi; yeni id için sonraki turdaki sayfa bağlamına bak.' }, target: t }
        case 'move_up':
        case 'move_down': {
          const dir = action === 'move_up' ? -1 : 1
          const times = Math.max(1, Math.min(20, Math.round(n_(a.times) ?? 1)))
          const steps: Step[] = Array.from({ length: times }, () => ({ kind: 'do' as const, label: `${s.name} taşındı`, target: t, run: (api) => api.dispatch({ type: 'move', id: s.id, dir }) }))
          return { steps, result: { ok: true }, target: t }
        }
        case 'hide':
        case 'show':
          if (s.hidden === (action === 'hide')) return { steps: [], result: { ok: true, note: 'Zaten bu durumda.' } }
          return { steps: [{ kind: 'do', label: `${s.name} ${action === 'hide' ? 'gizlendi' : 'gösterildi'}`, target: t, run: (api) => api.dispatch({ type: 'toggleHidden', id: s.id }) }], result: { ok: true }, target: t }
        default:
          return { error: 'Geçersiz action.' }
      }
    }

    case 'style_section': {
      const s = need()
      if ('error' in s) return s
      const patch = pick<SectionStyle>(a, { palette: 's', bg: 's', align: 's', padding: 'n', titleSize: 'n', titleWeight: 'n', letterSpacing: 'n', titleColor: 's', bodySize: 'n', anim: 's', css: 's', cssId: 's' })
      if (Array.isArray(a.hideOn)) patch.hideOn = (a.hideOn as unknown[]).filter((d): d is 'desktop' | 'tablet' | 'mobile' => d === 'desktop' || d === 'tablet' || d === 'mobile')
      if (patch.bg === '') patch.bg = undefined
      if (patch.titleColor === '') patch.titleColor = undefined
      if (patch.anim) Object.assign(patch, motionPatch(s, { entrance: legacyEntrance(patch.anim) ?? 'none' }))
      const name = s_(a.name)
      const steps: Step[] = []
      if (name) steps.push({ kind: 'do', label: `Bölüm adı “${name}” yapıldı`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'rename', id: s.id, name }) })
      if (Object.keys(patch).length || 'bg' in a || 'titleColor' in a)
        steps.push({ kind: 'do', label: `${s.name} görünümü değiştirildi`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'style', id: s.id, patch, label: 'AI stil değişikliği' }) })
      if (!steps.length) return { error: 'Değiştirilecek alan verilmedi.' }
      return { steps, result: { ok: true }, target: { sectionId: s.id } }
    }

    case 'add_item': {
      const s = need()
      if ('error' in s) return s
      const def = KINDS[s.kind].items
      if (!def) return { error: `${s.name} bölümü öğe desteklemiyor.` }
      if (s.items.length >= def.max) return { error: `${s.name} en fazla ${def.max} öğe alır.` }
      const icon = iconArg(s_(a.icon))
      if (icon && !okIcon(icon)) return iconError(icon)
      const item = { id: uid('i'), title: '', text: '', icon: icon ?? (s.kind === 'features' ? 'zap' : undefined), href: s_(a.href) }
      const title = s_(a.title) ?? ''
      const text = s_(a.text) ?? ''
      const steps: Step[] = [{ kind: 'do', label: `${s.name} › ${def.titleLabel} eklendi`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'addItem', id: s.id, item }) }]
      if (title) steps.push({ kind: 'type', target: { sectionId: s.id, el: `items.${item.id}.title` }, text: title, label: `${def.titleLabel} yazıldı` })
      if (text && def.textLabel) steps.push({ kind: 'type', target: { sectionId: s.id, el: `items.${item.id}.text` }, text, label: `${def.textLabel} yazıldı` })
      return { steps, result: { ok: true, item_id: item.id }, target: { sectionId: s.id } }
    }

    case 'update_item': {
      const s = need()
      if ('error' in s) return s
      const item = s.items.find((i) => i.id === a.item_id)
      if (!item) return { error: `Öğe yok. ${s.name} öğeleri: ${s.items.map((i) => `${i.id} (${i.title})`).join(', ')}` }
      const steps: Step[] = []
      const title = s_(a.title)
      const text = s_(a.text)
      if (title !== undefined) steps.push({ kind: 'type', target: { sectionId: s.id, el: `items.${item.id}.title` }, text: title, label: `${fieldLabel(s, `items.${item.id}.title`)} yazıldı` })
      if (text !== undefined) steps.push({ kind: 'type', target: { sectionId: s.id, el: `items.${item.id}.text` }, text, label: `${fieldLabel(s, `items.${item.id}.text`)} yazıldı` })
      const patch = pick<{ icon: string; href: string }>(a, { icon: 's', href: 's' })
      if (patch.icon) patch.icon = iconArg(patch.icon)
      if (patch.icon && !okIcon(patch.icon)) return iconError(patch.icon)
      if (Object.keys(patch).length) steps.push({ kind: 'do', label: 'Öğe ayarı değiştirildi', target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'itemPatch', id: s.id, itemId: item.id, patch }) })
      if (!steps.length) return { error: 'Değiştirilecek alan verilmedi.' }
      return { steps, result: { ok: true }, target: { sectionId: s.id, el: `items.${item.id}.title` } }
    }

    case 'remove_item': {
      const s = need()
      if ('error' in s) return s
      if (!s.items.some((i) => i.id === a.item_id)) return { error: 'Öğe yok.' }
      const itemId = String(a.item_id)
      return { steps: [{ kind: 'do', label: `${s.name} › öğe silindi`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'removeItem', id: s.id, itemId }) }], result: { ok: true } }
    }

    case 'set_site': {
      const fonts = aiSiteFonts(a, doc.site)
      if ('error' in fonts) return fonts
      const patch = { ...fonts.patch, ...pick<SiteSettings>(a, { brand: 's', fontPair: 's', corners: 's' }) }
      if (patch.fontPair && !(patch.fontPair in FONT_PAIRS)) return { error: `fontPair: ${Object.keys(FONT_PAIRS).join(', ')}` }
      if (patch.corners && !(patch.corners in CORNERS)) return { error: `corners: ${Object.keys(CORNERS).join(', ')}` }
      if (!Object.keys(patch).length) return { error: 'Değiştirilecek alan verilmedi.' }
      const hero = doc.sections.find((s) => s.kind === 'hero')
      const parts = [patch.brand && `ana renk ${patch.brand}`, 'fontPair' in a && patch.fontPair && `yazı stili ${FONT_PAIRS[patch.fontPair].name}`, ...fonts.parts, patch.corners && `köşeler ${CORNERS[patch.corners].name}`].filter(Boolean)
      return { steps: [{ kind: 'do', label: `Site: ${parts.join(', ')} yapıldı`, target: hero ? { sectionId: hero.id } : undefined, run: (api) => api.dispatch({ type: 'site', patch }) }], result: { ok: true } }
    }

    case 'set_background': {
      const s = need()
      if ('error' in s) return s
      const patch = pick<BgSettings>(a, { type: 's', gradFrom: 's', gradTo: 's', gradAngle: 'n', image: 's', overlay: 'n', decor: 's', decorSvg: 's', decorColor: 's', decorOpacity: 'n', decorScale: 'n', decorX: 'n', decorY: 'n', decorRotate: 'n', decorAnim: 's' })
      if (patch.image) patch.image = resolveAsset(patch.image, ctx)
      if (!Object.keys(patch).length) return { error: 'Değiştirilecek alan verilmedi.' }
      return { steps: [{ kind: 'do', label: `${s.name} arka planı ayarlandı`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'bg', id: s.id, patch, label: 'AI arka plan değişikliği' }) }], result: { ok: true }, target: { sectionId: s.id } }
    }

    case 'style_element': {
      const s = need()
      if ('error' in s) return s
      const el = s_(a.el) ?? ''
      if (!el) return { error: 'el gerekli.' }
      const t = { sectionId: s.id, el }
      if (b_(a.reset)) return { steps: [{ kind: 'do', label: `${fieldLabel(s, el)} stili sıfırlandı`, target: t, run: (api) => api.dispatch({ type: 'elStyle', id: s.id, el, patch: null }) }], result: { ok: true } }
      const patch = pick<ElStyle>(a, { fontSize: 'n', fontWeight: 'n', lineHeight: 'n', letterSpacing: 'n', color: 's', bg: 's', radius: 'n', align: 's', width: 'n', widthUnit: 's', maxWidth: 'n', maxWidthUnit: 's', height: 'n', heightUnit: 's', fit: 's', mt: 'n', mb: 'n', margin: 'raw', padding: 'raw', iconSize: 'n', tile: 'b', tileSize: 'n', tileOpacity: 'n', hide: 'b', transform: 's', italic: 'b' })
      if (patch.transform && !['none', 'uppercase', 'lowercase', 'capitalize'].includes(patch.transform)) return { error: 'transform: none, uppercase, lowercase, capitalize' }
      if ('font' in a && a.font !== null) {
        const r = parseFontArg(a.font)
        if ('error' in r) return r
        patch.font = r.value
      }
      const ownFont = 'font' in patch ? patch.font : s.els?.[el]?.font
      if (patch.fontWeight && ownFont) {
        const sf = siteFonts(doc.site)
        patch.fontWeight = fitWeight(ownFont === '@heading' ? sf.heading : ownFont === '@body' ? sf.body : ownFont, patch.fontWeight)
      }
      if ('iconColor' in a || 'iconColors' in a) {
        if (fieldKind(s, el) !== 'icon' && !isSvgSrc(getValue(s, el))) return { error: `${fieldLabel(s, el)} bir SVG ikon/görsel değil; iconColor yalnızca SVG kaynaklarda çalışır.` }
        if (typeof a.iconColor === 'string' && a.iconColor && !normColor(a.iconColor)) return { error: `Geçersiz renk: ${a.iconColor}` }
        if (typeof a.iconColor === 'string') patch.iconColor = normColor(a.iconColor)?.hex
        if (a.iconColor === '') patch.iconColors = undefined
        if (a.iconColors && typeof a.iconColors === 'object') {
          const map: Record<string, string> = { ...s.els?.[el]?.iconColors }
          for (const [from, to] of Object.entries(a.iconColors as Record<string, unknown>)) {
            const f = normColor(from)?.hex
            const t = typeof to === 'string' ? normColor(to)?.hex : undefined
            if (f && t) map[f] = t
            else if (f) delete map[f]
          }
          patch.iconColors = Object.keys(map).length ? map : undefined
        }
      }
      if (!Object.keys(patch).length) return { error: 'Değiştirilecek alan verilmedi.' }
      return { steps: [{ kind: 'do', label: `${s.name} › ${fieldLabel(s, el)} stili değiştirildi`, target: t, run: (api) => api.dispatch({ type: 'elStyle', id: s.id, el, patch }) }], result: { ok: true }, target: t }
    }

    case 'set_grid': {
      const s = need()
      if ('error' in s) return s
      const patch = pick<GridSettings>(a, { cols: 'n', colsT: 'n', colsM: 'n', gapX: 'n', gapY: 'n', pad: 'n', radius: 'n', bg: 's', border: 'b', borderW: 'n', borderColor: 's', shadow: 's', showIcon: 'b', iconSize: 'n' })
      if (typeof a.iconColor === 'string') patch.iconColor = normColor(a.iconColor)?.hex
      if (!Object.keys(patch).length) return { error: 'Değiştirilecek alan verilmedi.' }
      return { steps: [{ kind: 'do', label: `${s.name} ızgarası ayarlandı`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'grid', id: s.id, patch }) }], result: { ok: true }, target: { sectionId: s.id } }
    }

    case 'set_container': {
      const s = need()
      if ('error' in s) return s
      const patch = pick<ContainerBox>(a, { contentWidth: 's', width: 'n', widthUnit: 's', minHeight: 'n', minHeightUnit: 's', direction: 's', justify: 's', align: 's', wrap: 'b', stackMobile: 'b', gapX: 'n', gapY: 'n', margin: 'raw', padding: 'raw', borderStyle: 's', borderWidth: 'n', borderColor: 's', radius: 'n', shadow: 's', zIndex: 'n' })
      if (!Object.keys(patch).length) return { error: 'Değiştirilecek alan verilmedi.' }
      return { steps: [{ kind: 'do', label: `${s.name} kapsayıcısı ayarlandı`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'box', id: s.id, patch }) }], result: { ok: true }, target: { sectionId: s.id } }
    }

    case 'set_layout': {
      const s = need()
      if ('error' in s) return s
      if (s.kind !== 'layout') return { error: 'set_layout yalnızca Düzen (layout) bölümlerinde çalışır.' }
      const steps: Step[] = []
      const type = s_(a.type)
      if (type === 'flex' || type === 'grid') steps.push({ kind: 'do', label: `Düzen türü ${type} yapıldı`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'content', id: s.id, key: 'type', value: type, label: 'Düzen türü değişti' }) })
      const structure = s_(a.structure)
      if (structure) {
        if (!STRUCTURES.includes(structure)) return { error: `structure: ${STRUCTURES.join(', ')}` }
        steps.push({ kind: 'do', label: `Yapı ${structure} yapıldı`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'structure', id: s.id, structure }) })
      }
      const count = structure ? [...FLEX_STRUCTURES, ...GRID_STRUCTURES].find((x) => x.id === structure)!.cells.length : s.items.length
      const cells = Array.isArray(a.cells) ? (a.cells as In[]) : []
      const depth = locate(doc.sections, s.id)?.depth ?? 1
      const nested: { index: number; section_id: string; type: string; structure: string }[] = []
      // Cell ids only exist after the structure step has run, so resolve them lazily.
      for (const c of cells) {
        const i = Math.round(n_(c.index) ?? -1)
        const cell = (s_(c.type) ?? '') as CellType
        if (i < 0 || i >= count) return { error: `Hücre sırası 0-${count - 1} aralığında olmalı.` }
        if (!CELLS.includes(cell)) return { error: `Hücre türü: ${CELLS.map((x) => `"${x}"`).join(', ')}` }
        if (cell === 'layout') {
          if (depth >= MAX_DEPTH) return { error: `İç içe en fazla ${MAX_DEPTH} kapsayıcı seviyesi olabilir.` }
          const lt = s_(c.layout_type) === 'grid' ? 'grid' : 'flex'
          const ls = s_(c.layout_structure) ?? (lt === 'grid' ? 'g2c' : '50-50')
          if (!(lt === 'grid' ? GRID_STRUCTURES : FLEX_STRUCTURES).some((x) => x.id === ls)) return { error: `layout_structure (${lt}): ${(lt === 'grid' ? GRID_STRUCTURES : FLEX_STRUCTURES).map((x) => x.id).join(', ')}` }
          // Created now so the new container's id can be returned for follow-up set_layout / set_container calls.
          const sub = createLayout(lt, ls, { nested: true, palette: s.style.palette })
          nested.push({ index: i, section_id: sub.id, type: lt, structure: ls })
          steps.push({
            kind: 'do',
            label: `Hücre ${i + 1}: iç ${lt === 'grid' ? 'Grid' : 'Flexbox'} eklendi`,
            target: { sectionId: s.id },
            run: (api) => {
              const item = findSection(api.doc, s.id)?.items[i]
              if (item) api.dispatch({ type: 'nest', id: s.id, itemId: item.id, section: sub })
            },
          })
          continue
        }
        const value = c.value !== undefined ? resolveAsset(s_(c.value) ?? '', ctx) : CELL_DEFAULTS[cell]
        steps.push({
          kind: 'do',
          label: `Hücre ${i + 1} ayarlandı`,
          target: { sectionId: s.id },
          run: (api) => {
            const cur = findSection(api.doc, s.id)
            const item = cur?.items[i]
            if (!item) return
            api.dispatch({ type: 'cell', id: s.id, itemId: item.id, cell })
            if (cell) api.dispatch({ type: 'field', id: s.id, el: `items.${item.id}.text`, value })
          },
        })
      }
      if (!steps.length) return { error: 'Değiştirilecek alan verilmedi.' }
      return { steps, result: nested.length ? { ok: true, nested, note: 'İç kapsayıcıların hücrelerini bu section_id ile set_layout çağırarak doldur.' } : { ok: true }, target: { sectionId: s.id } }
    }

    case 'page_settings': {
      const patch = pick<PageSettings>(a, { title: 's', slug: 's', description: 's', indexable: 'b' })
      if (!Object.keys(patch).length) return { error: 'Değiştirilecek alan verilmedi.' }
      return { steps: [{ kind: 'do', label: 'Sayfa ayarları değiştirildi', run: (api) => api.setPage({ ...api.page, ...patch }) }], result: { ok: true } }
    }

    case 'editor_ui': {
      const action = s_(a.action)
      const value = s_(a.value)
      const ui = (label: string, run: Extract<Step, { kind: 'do' }>['run'], target?: Target): ToolPlan => ({ steps: [{ kind: 'do', label, target, run }], result: { ok: true } })
      switch (action) {
        case 'show': {
          const s = need()
          if ('error' in s) return s
          const el = s_(a.el)
          const t = el ? { sectionId: s.id, el } : { sectionId: s.id }
          return ui(`${s.name}${el ? ` › ${fieldLabel(s, el)}` : ''} gösterildi`, (api) => api.select(t, { scroll: true }), t)
        }
        case 'device':
          if (value !== 'desktop' && value !== 'tablet' && value !== 'mobile') return { error: 'value: desktop | tablet | mobile' }
          return { steps: [{ kind: 'device', device: value, label: `${value === 'mobile' ? 'Mobil' : value === 'tablet' ? 'Tablet' : 'Masaüstü'} görünüme geçildi` }], result: { ok: true } }
        case 'preview_on':
        case 'preview_off':
          return ui(action === 'preview_on' ? 'Önizleme açıldı' : 'Önizleme kapatıldı', (api) => api.setPreview(action === 'preview_on'))
        case 'open_shortcuts':
          return ui('Kısayollar açıldı', (api) => api.setDialog('shortcuts'))
        case 'open_page_settings':
          return ui('Sayfa ayarları açıldı', (api) => api.setDialog('settings'))
        case 'open_command_palette':
          return ui('Komut paleti açıldı', (api) => api.setPaletteOpen(true))
        case 'mode':
          if (value !== 'basic' && value !== 'studio' && value !== 'ai') return { error: 'value: basic | studio | ai' }
          return ui(`${value === 'basic' ? 'Basit' : value === 'studio' ? 'Studio' : 'AI'} moda geçildi`, (api) => api.setMode(value))
        case 'studio_tab':
          if (value !== 'widgets' && value !== 'components' && value !== 'globals') return { error: 'value: widgets | components | globals' }
          return ui('Studio sekmesi değiştirildi', (api) => {
            api.select(null)
            api.setStudioTab(value)
          })
        case 'basic_view':
          if (value !== 'list' && value !== 'add' && value !== 'design') return { error: 'value: list | add | design' }
          return ui('Basit mod ekranı değiştirildi', (api) => {
            api.select(null)
            api.setBasicView(value)
          })
        case 'undo':
          return ui('Son değişiklik geri alındı', (api) => api.dispatch({ type: 'undo' }))
        case 'redo':
          return ui('Değişiklik yinelendi', (api) => api.dispatch({ type: 'redo' }))
        case 'publish':
          return ui('Sayfa yayınlandı', (api) => api.publish())
        default:
          return { error: 'Geçersiz action.' }
      }
    }

    default:
      return { error: `Bilinmeyen araç: ${call.name}` }
  }
}

/** Short label for the plan list, shown before a call runs. */
export function describeCall(call: ToolCall, doc: DocState): string {
  const sk = describeSkillCall(call)
  if (sk) return sk
  const cl = describeCloneCall(call)
  if (cl) return cl
  const mo = describeMotionCall(call, { doc })
  if (mo) return mo
  const a = call.input ?? {}
  const s = typeof a.section_id === 'string' ? findSection(doc, a.section_id) : undefined
  const n = s?.name ?? 'Bölüm'
  switch (call.name) {
    case 'get_section':
      return `${n} incelendi`
    case 'find_images':
      return `“${String(a.query ?? '')}” için ${Math.max(1, Math.min(8, Math.round(Number(a.count) || 4)))} görsel indirildi`
    case 'set_text':
      return s && typeof a.field === 'string' ? `${n} › ${fieldLabel(s, a.field)} yazıldı` : 'Metin yazıldı'
    case 'add_section':
      return `${KINDS[a.kind as SectionKind]?.name ?? 'Yeni'} bölümü eklendi`
    case 'set_section_variant':
      return s && typeof a.variant === 'string' ? variantLabel(s.kind, a.variant) : `${n} tasarımı değiştirildi`
    case 'section_action':
      return `${n}: ${({ remove: 'silindi', duplicate: 'çoğaltıldı', move_up: 'yukarı taşındı', move_down: 'aşağı taşındı', hide: 'gizlendi', show: 'gösterildi' } as Record<string, string>)[String(a.action)] ?? 'güncellendi'}`
    case 'style_section':
      return `${n} görünümü değiştirildi`
    case 'add_item':
      return `${n} › öğe eklendi`
    case 'update_item':
      return `${n} › öğe değiştirildi`
    case 'remove_item':
      return `${n} › öğe silindi`
    case 'set_site':
      return 'Site stili değiştirildi'
    case 'set_background':
      return `${n} arka planı ayarlandı`
    case 'style_element':
      return `${n} › öğe stili değiştirildi`
    case 'set_grid':
      return `${n} ızgarası ayarlandı`
    case 'set_container':
      return `${n} kapsayıcısı ayarlandı`
    case 'set_layout':
      return `${n} düzeni ayarlandı`
    case 'page_settings':
      return 'Sayfa ayarları değiştirildi'
    case 'editor_ui':
      return (
        ({
          show: `${n} gösterildi`,
          device: `${a.value === 'mobile' ? 'Mobil' : a.value === 'tablet' ? 'Tablet' : 'Masaüstü'} görünüme geçildi`,
          preview_on: 'Önizleme açıldı',
          preview_off: 'Önizleme kapatıldı',
          open_shortcuts: 'Kısayollar açıldı',
          open_page_settings: 'Sayfa ayarları açıldı',
          open_command_palette: 'Komut paleti açıldı',
          mode: 'Mod değiştirildi',
          studio_tab: 'Studio sekmesi değiştirildi',
          basic_view: 'Basit mod ekranı değiştirildi',
          undo: 'Son değişiklik geri alındı',
          redo: 'Değişiklik yinelendi',
          publish: 'Sayfa yayınlandı',
        } as Record<string, string>)[String(a.action)] ?? 'Editör güncellendi'
      )
    default:
      return call.name
  }
}

export const isReadOnly = (call: ToolCall) => call.name === 'get_section' || call.name === 'inspect_site' || isSkillTool(call.name)
