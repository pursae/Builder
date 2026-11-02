import type { CSSProperties } from 'react'
import { toPlain } from './rich'
import { typeCss } from './fonts'
import {
  Box,
  CircleHelp,
  Columns2,
  Database,
  FormInput,
  Gauge,
  Heading,
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  ListCollapse,
  List,
  ListOrdered,
  Mail,
  Megaphone,
  Minus,
  MousePointerClick,
  PanelBottom,
  PanelTop,
  PanelsTopLeft,
  Pilcrow,
  Play,
  Puzzle,
  Quote,
  RectangleHorizontal,
  Repeat,
  Send,
  Shapes,
  ShieldCheck,
  SquareCheck,
  SquarePlay,
  TextCursorInput,
  Timer,
  Type,
  Film,
  ChevronsUpDown,
  LetterText,
  Zap,
  Columns3,
  CodeXml,
  type LucideIcon,
} from 'lucide-react'
import type {
  BgSettings,
  DecorId,
  GridSettings,
  CellType,
  ContainerBox,
  CornerId,
  DocState,
  FontPairId,
  Item,
  KindDef,
  LayoutType,
  PaletteId,
  Payload,
  Section,
  SectionKind,
  Structure,
} from './types'

export const uid = (p = 's') => `${p}_${Math.random().toString(36).slice(2, 9)}`

/* ---------- Images (Unsplash) ---------- */
const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`
export const sized = (url: string, w: number) =>
  url.includes('images.unsplash.com') ? url.replace(/w=\d+/, `w=${w}`) : url

export const IMAGES = [
  { url: unsplash('photo-1782898669223-ab17b600d486'), alt: 'Web arayüzü açık bir dizüstünde yazı yazan eller' },
  { url: unsplash('photo-1522071820081-009f0129c71c'), alt: 'Dizüstü bilgisayarlar etrafında çalışan ekip' },
  { url: unsplash('photo-1575318634028-6a0cfcb60c59'), alt: 'Ahşap masada sade bir çalışma alanı' },
  { url: unsplash('photo-1603201667246-3c45012c6d17'), alt: 'Dizüstü bilgisayarla çalışan kadın' },
  { url: unsplash('photo-1630233313373-a03df7d139c9'), alt: 'Ahşap masada iMac' },
  { url: unsplash('photo-1603201667141-5a2d4c673378'), alt: 'Bilgisayarları başında toplantı yapan ekip' },
  { url: unsplash('photo-1531591022136-eb8b0da1e6d0'), alt: 'Kıvrımlı metal mimari paneller' },
  { url: unsplash('photo-1462556791646-c201b8241a94'), alt: 'Cam cepheli bina' },
]

export const TERMINAL = `$ docker compose up -d
✓ db       postgres:17 · sağlıklı
✓ pursae   tek binary · başladı

$ pursae serve
› şema geçişleri     güncel
› görev çalıştırıcı  çalışıyor
› wasm eklentiler    3 yüklendi, imzalar ok
› http://localhost:8080  *hazır*`

export const HTML_SAMPLE = `<div class="card">
  <span class="tag">Canlı</span>
  <h3>Kendi HTML'ini buraya yaz</h3>
  <p>Bu alan gerçek HTML ve CSS çalıştırır: rozetler, tablolar, embed kodları…</p>
  <button onclick="this.textContent='Tıklandı ✓'">Dene</button>
</div>
<style>
  .card { font-family: Inter, sans-serif; padding: 28px; border-radius: 16px;
          background: linear-gradient(135deg, #1b1d22, #262a33); color: #eef0f3; }
  .tag  { font-size: 11px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase;
          color: #4ade80; }
  h3    { margin: 10px 0 6px; font-size: 22px; }
  p     { margin: 0 0 18px; color: #a3a8b2; line-height: 1.6; }
  button{ font: 600 14px Inter, sans-serif; padding: 10px 16px; border: 0; border-radius: 8px;
          background: #5b7cfa; color: #fff; cursor: pointer; }
</style>`

/* ---------- Site design tokens ---------- */
export const BRANDS = [
  { name: 'Mavi', value: '#4058e3' },
  { name: 'Mor', value: '#7047eb' },
  { name: 'Yeşil', value: '#0f9b6c' },
  { name: 'Turuncu', value: '#e8590c' },
  { name: 'Pembe', value: '#d6336c' },
  { name: 'Grafit', value: '#2b2d33' },
]

export const FONT_PAIRS: Record<
  FontPairId,
  { name: string; display: string; weight: number; tracking: number; lh: number; italicAccent: boolean }
> = {
  elegant: { name: 'Zarif', display: "'Instrument Serif', Georgia, serif", weight: 400, tracking: -0.01, lh: 1.02, italicAccent: true },
  modern: { name: 'Modern', display: "'Space Grotesk', Inter, sans-serif", weight: 600, tracking: -0.035, lh: 1.04, italicAccent: false },
  plain: { name: 'Sade', display: "'Inter', sans-serif", weight: 700, tracking: -0.04, lh: 1.06, italicAccent: false },
}

export const CORNERS: Record<CornerId, { name: string; card: number; btn: number }> = {
  sharp: { name: 'Keskin', card: 2, btn: 2 },
  soft: { name: 'Yumuşak', card: 12, btn: 8 },
  round: { name: 'Yuvarlak', card: 22, btn: 999 },
}

export const PALETTES: { id: PaletteId; name: string }[] = [
  { id: 'brand', name: 'Marka' },
  { id: 'dark', name: 'Koyu' },
  { id: 'light', name: 'Açık' },
  { id: 'soft', name: 'Gri' },
  { id: 'sand', name: 'Kum' },
]

const mix = (c: string, pct: number, w = '#fff') => `color-mix(in srgb, ${c} ${pct}%, ${w})`

export function palette(p: PaletteId, brand: string) {
  switch (p) {
    case 'brand':
      return { bg: brand, fg: '#ffffff', muted: 'rgba(255,255,255,.82)', hl: 'rgba(255,255,255,.88)', line: 'rgba(255,255,255,.22)', card: 'rgba(255,255,255,.09)', accent: '#ffffff', btnBg: '#ffffff', btnFg: brand, btn2: 'rgba(255,255,255,.75)', ov: '#ffffff', ovInk: '#111827' }
    case 'dark':
      return { bg: '#131417', fg: '#f2f3f5', muted: '#9ca1ab', hl: mix(brand, 60), line: 'rgba(255,255,255,.1)', card: '#1b1c20', accent: mix(brand, 62), btnBg: brand, btnFg: '#ffffff', btn2: 'rgba(255,255,255,.28)', ov: '#86a2ff', ovInk: '#0b1030' }
    case 'light':
      return { bg: '#ffffff', fg: '#121418', muted: '#5b616c', hl: brand, line: '#e6e7ea', card: '#f6f7f8', accent: brand, btnBg: brand, btnFg: '#ffffff', btn2: '#cfd2d8', ov: '#3d63f5', ovInk: '#ffffff' }
    case 'soft':
      return { bg: '#f1f2f4', fg: '#121418', muted: '#5b616c', hl: brand, line: '#dcdee3', card: '#ffffff', accent: brand, btnBg: brand, btnFg: '#ffffff', btn2: '#c6c9d0', ov: '#3d63f5', ovInk: '#ffffff' }
    case 'sand':
      return { bg: '#f3ece1', fg: '#2a2219', muted: '#6f6354', hl: brand, line: '#e2d7c6', card: '#faf6ef', accent: brand, btnBg: '#2a2219', btnFg: '#f3ece1', btn2: '#cbbda8', ov: '#3d63f5', ovInk: '#ffffff' }
  }
}

export function paletteVars(p: PaletteId, brand: string, bg?: string): CSSProperties {
  const v = palette(p, brand)
  return {
    '--bg': bg || v.bg,
    '--fg': v.fg,
    '--muted': v.muted,
    '--hl': v.hl,
    '--line': v.line,
    '--card': v.card,
    '--accent': v.accent,
    '--btn-bg': v.btnBg,
    '--btn-fg': v.btnFg,
    '--btn2': v.btn2,
    '--ov': v.ov,
    '--ov-ink': v.ovInk,
  } as CSSProperties
}

export const FEATURE_ICONS: Record<string, LucideIcon> = {
  box: Box,
  database: Database,
  puzzle: Puzzle,
  layout: LayoutTemplate,
  timer: Timer,
  gauge: Gauge,
  zap: Zap,
  shield: ShieldCheck,
}
const ICON_ORDER = Object.keys(FEATURE_ICONS)

/* ---------- Section kinds ---------- */
export const KINDS: Record<SectionKind, KindDef> = {
  nav: {
    name: 'Üst menü',
    icon: PanelTop,
    blurb: 'Logo, menü ve buton',
    fields: [
      { key: 'logo', label: 'Logo harfi', el: 'text' },
      { key: 'brand', label: 'Site adı', el: 'heading' },
      { key: 'primary', label: 'Buton', el: 'button' },
    ],
    items: { label: 'Menü bağlantıları', add: 'Bağlantı ekle', titleLabel: 'Bağlantı', titleEl: 'link', max: 7 },
    align: false,
    spacing: false,
    pinned: true,
  },
  hero: {
    name: 'Karşılama',
    icon: LayoutTemplate,
    blurb: 'Büyük başlık, açıklama ve butonlar',
    fields: [
      { key: 'eyebrow', label: 'Küçük etiket', el: 'badge' },
      { key: 'title', label: 'Başlık', el: 'heading' },
      { key: 'accent', label: 'Vurgulu satır', el: 'heading' },
      { key: 'body', label: 'Açıklama', el: 'text', multiline: true },
      { key: 'primary', label: 'Ana buton', el: 'button' },
      { key: 'secondary', label: 'İkinci buton', el: 'button' },
      { key: 'image', label: 'Fotoğraf', el: 'image', showIf: (s) => s.content.visual === 'image' },
      { key: 'termTitle', label: 'Pencere başlığı', el: 'text', group: 'Terminal', showIf: (s) => (s.content.visual || 'terminal') === 'terminal' },
      {
        key: 'terminal',
        label: 'Terminal satırları',
        el: 'code',
        multiline: true,
        group: 'Terminal',
        hint: '$ komut · ✓ başarılı · › bilgi · ✗ hata. İki boşluktan sonrası soluk yazılır, *yıldızlı* kelime yeşil olur.',
        showIf: (s) => (s.content.visual || 'terminal') === 'terminal',
      },
      { key: 'card1Label', label: 'Alt kart · etiket', el: 'text', group: 'Terminal kartları', showIf: (s) => (s.content.visual || 'terminal') === 'terminal' && s.content.floatCards !== 'off' },
      { key: 'card1Value', label: 'Alt kart · durum', el: 'text', group: 'Terminal kartları', showIf: (s) => (s.content.visual || 'terminal') === 'terminal' && s.content.floatCards !== 'off' },
      { key: 'card2Label', label: 'Üst kart · etiket', el: 'text', group: 'Terminal kartları', showIf: (s) => (s.content.visual || 'terminal') === 'terminal' && s.content.floatCards !== 'off' },
      { key: 'card2Value', label: 'Üst kart · değer', el: 'text', group: 'Terminal kartları', showIf: (s) => (s.content.visual || 'terminal') === 'terminal' && s.content.floatCards !== 'off' },
      { key: 'card2Sub', label: 'Üst kart · açıklama', el: 'text', group: 'Terminal kartları', showIf: (s) => (s.content.visual || 'terminal') === 'terminal' && s.content.floatCards !== 'off' },
      { key: 'html', label: 'HTML kodu', el: 'code', multiline: true, group: 'HTML', hint: 'HTML, CSS ve JavaScript güvenli bir çerçevede çalışır.', showIf: (s) => s.content.visual === 'html' },
    ],
    items: { label: 'Öne çıkanlar', add: 'Öne çıkan ekle', titleLabel: 'Öne çıkan', titleEl: 'badge', max: 5 },
    options: [
      {
        key: 'visual',
        label: 'Sağ taraf',
        choices: [
          { value: 'terminal', label: 'Terminal' },
          { value: 'image', label: 'Fotoğraf' },
          { value: 'html', label: 'HTML' },
          { value: 'none', label: 'Boş' },
        ],
      },
      {
        key: 'floatCards',
        label: 'Terminal kartları',
        choices: [
          { value: '', label: 'Göster' },
          { value: 'still', label: 'Sabit' },
          { value: 'off', label: 'Gizle' },
        ],
      },
    ],
    align: true,
    spacing: true,
  },
  banner: {
    name: 'Duyuru şeridi',
    icon: Megaphone,
    blurb: 'İnce bir bilgilendirme bandı',
    fields: [
      { key: 'text', label: 'Duyuru metni', el: 'text' },
      { key: 'link', label: 'Bağlantı yazısı', el: 'link' },
    ],
    align: false,
    spacing: false,
  },
  features: {
    name: 'Özellikler',
    icon: LayoutGrid,
    blurb: 'Artılarını kartlarla anlat',
    fields: [
      { key: 'eyebrow', label: 'Küçük etiket', el: 'badge' },
      { key: 'title', label: 'Başlık', el: 'heading' },
      { key: 'body', label: 'Açıklama', el: 'text', multiline: true },
    ],
    items: { label: 'Kartlar', add: 'Kart ekle', titleLabel: 'Kart başlığı', textLabel: 'Kart yazısı', titleEl: 'heading', textEl: 'text', max: 6 },
    align: true,
    spacing: true,
  },
  media: {
    name: 'Görsel ve yazı',
    icon: ImageIcon,
    blurb: 'Bir fotoğrafla kısa bir hikâye',
    fields: [
      { key: 'eyebrow', label: 'Küçük etiket', el: 'badge' },
      { key: 'title', label: 'Başlık', el: 'heading' },
      { key: 'body', label: 'Açıklama', el: 'text', multiline: true },
      { key: 'primary', label: 'Bağlantı', el: 'link' },
      { key: 'image', label: 'Fotoğraf', el: 'image' },
    ],
    options: [
      {
        key: 'imageSide',
        label: 'Fotoğraf nerede?',
        choices: [
          { value: 'left', label: 'Solda' },
          { value: 'right', label: 'Sağda' },
        ],
      },
    ],
    align: false,
    spacing: true,
  },
  steps: {
    name: 'Adımlar',
    icon: ListOrdered,
    blurb: 'Süreci 1-2-3 diye anlat',
    fields: [
      { key: 'eyebrow', label: 'Küçük etiket', el: 'badge' },
      { key: 'title', label: 'Başlık', el: 'heading' },
    ],
    items: { label: 'Adımlar', add: 'Adım ekle', titleLabel: 'Adım', textLabel: 'Açıklama', titleEl: 'heading', textEl: 'text', max: 4 },
    align: true,
    spacing: true,
  },
  quote: {
    name: 'Müşteri yorumu',
    icon: Quote,
    blurb: 'Mutlu bir müşterinin sözleri',
    fields: [
      { key: 'quote', label: 'Söz', el: 'heading', multiline: true },
      { key: 'author', label: 'Kişi', el: 'text' },
      { key: 'role', label: 'Unvanı', el: 'text' },
    ],
    align: true,
    spacing: true,
  },
  faq: {
    name: 'Sık sorulanlar',
    icon: CircleHelp,
    blurb: 'Soru ve cevaplar',
    fields: [
      { key: 'eyebrow', label: 'Küçük etiket', el: 'badge' },
      { key: 'title', label: 'Başlık', el: 'heading' },
    ],
    items: { label: 'Sorular', add: 'Soru ekle', titleLabel: 'Soru', textLabel: 'Cevap', titleEl: 'heading', textEl: 'text', max: 8 },
    align: false,
    spacing: true,
  },
  cta: {
    name: 'Harekete çağrı',
    icon: MousePointerClick,
    blurb: 'Sayfa sonunda güçlü bir davet',
    fields: [
      { key: 'title', label: 'Başlık', el: 'heading' },
      { key: 'body', label: 'Açıklama', el: 'text', multiline: true },
      { key: 'primary', label: 'Ana buton', el: 'button' },
      { key: 'secondary', label: 'İkinci buton', el: 'button' },
    ],
    align: true,
    spacing: true,
  },
  footer: {
    name: 'Alt bilgi',
    icon: PanelBottom,
    blurb: 'Telif yazısı ve bağlantılar',
    fields: [
      { key: 'logo', label: 'Logo harfi', el: 'text' },
      { key: 'brand', label: 'Site adı', el: 'heading' },
      { key: 'note', label: 'Alt yazı', el: 'text' },
    ],
    items: { label: 'Bağlantılar', add: 'Bağlantı ekle', titleLabel: 'Bağlantı', titleEl: 'link', max: 12 },
    align: false,
    spacing: false,
    pinned: true,
  },
  text: {
    name: 'Yazı bloğu',
    icon: Type,
    blurb: 'Başlık ve paragraf',
    fields: [
      { key: 'title', label: 'Başlık', el: 'heading' },
      { key: 'body', label: 'Paragraf', el: 'text', multiline: true },
    ],
    align: true,
    spacing: true,
  },
  image: {
    name: 'Büyük görsel',
    icon: SquarePlay,
    blurb: 'Tam genişlikte fotoğraf veya video',
    fields: [
      { key: 'image', label: 'Görsel', el: 'image' },
      { key: 'caption', label: 'Alt yazı', el: 'text' },
    ],
    options: [
      {
        key: 'video',
        label: 'Tür',
        choices: [
          { value: '', label: 'Fotoğraf' },
          { value: '1', label: 'Video' },
        ],
      },
    ],
    align: false,
    spacing: true,
  },
  layout: {
    name: 'Düzen',
    icon: Columns3,
    blurb: 'Flexbox ya da Grid ile kendi yapını kur',
    fields: [],
    align: false,
    spacing: false,
  },
  html: {
    name: 'HTML / Kod',
    icon: CodeXml,
    blurb: 'Kendi HTML, CSS ve JS kodunu ekle',
    fields: [{ key: 'html', label: 'HTML kodu', el: 'code', multiline: true, group: 'HTML', hint: 'HTML, CSS ve JavaScript güvenli bir çerçevede çalışır.' }],
    align: false,
    spacing: true,
  },
  form: {
    name: 'İletişim formu',
    icon: Mail,
    blurb: 'Ziyaretçiler sana yazsın',
    fields: [
      { key: 'eyebrow', label: 'Küçük etiket', el: 'badge' },
      { key: 'title', label: 'Başlık', el: 'heading' },
      { key: 'body', label: 'Açıklama', el: 'text', multiline: true },
      { key: 'primary', label: 'Gönder butonu', el: 'button' },
    ],
    align: false,
    spacing: true,
  },
  custom: {
    name: 'Serbest bölüm',
    icon: Shapes,
    blurb: 'İç içe kutular ve öğelerle serbest tasarım (site klonları)',
    fields: [],
    align: false,
    spacing: false,
  },
}

/* ---------- Factories ---------- */
const it = (title: string, text = '', icon?: string) => ({ id: uid('i'), title, text, icon })

const DEFAULTS: Record<SectionKind, Omit<Section, 'id' | 'name' | 'hidden' | 'kind'>> = {
  nav: {
    content: { logo: 'P', brand: 'Pursae', primary: "Pursae'yi edinin" },
    items: ['Özellikler', 'Mimari', 'Eklentiler', 'Golementor', 'Yol haritası', 'SSS'].map((t) => it(t)),
    style: { palette: 'dark', align: 'left', padding: 0, titleSize: 20, hideOn: [] },
  },
  hero: {
    content: {
      eyebrow: 'Erken sürüm · 0.1',
      title: 'WordPress,',
      accent: "Go'nun hızıyla.",
      body: "Pursae, WordPress çekirdeğini Go ile yeniden yazar: tek binary, tek PostgreSQL veritabanı, WebAssembly sandbox'ında çalışan eklentiler ve yerleşik sayfa oluşturucu. Yönetim paneli ve blok editörü alıştığınız gibi çalışır.",
      primary: 'Hemen başlayın',
      secondary: 'Mimariyi inceleyin',
      visual: 'terminal',
      image: IMAGES[0].url,
      termTitle: '~/siten',
      terminal: TERMINAL,
      card1Label: "EKLENTİ SANDBOX'I",
      card1Value: 'İmza doğrulandı',
      card2Label: 'SAYFA ÖNBELLEĞİ',
      card2Value: 'Açık',
      card2Sub: 'isabet oranı %94',
      html: HTML_SAMPLE,
    },
    items: ['Tek binary', 'PostgreSQL + JSONB', 'WASM eklentiler', 'GPL-2.0'].map((t) => it(t)),
    style: { palette: 'brand', align: 'left', padding: 120, titleSize: 92, hideOn: [] },
  },
  banner: {
    content: { text: 'Pursae 0.1 erken sürüm olarak yayında. Gerçek trafiğe açmadan önce', link: 'üretim kontrol listesini okuyun.' },
    items: [],
    style: { palette: 'soft', align: 'center', padding: 0, titleSize: 16, hideOn: [] },
  },
  features: {
    content: {
      eyebrow: 'Özellikler',
      title: 'Bildiğiniz WordPress, yepyeni bir motor.',
      body: 'Temaları, eklentileri ve yönetim panelini değiştirmeden; daha az sunucu, daha az bakım.',
    },
    items: [
      it('Tek binary', 'Kurulum tek bir dosya. PHP-FPM, Nginx ya da ek servis gerekmez.', 'box'),
      it('PostgreSQL + JSONB', 'Meta tabloları yerine JSONB; sorgular indekslenir, yedekler sadeleşir.', 'database'),
      it('WASM eklentileri', "Eklentiler imzalı bir sandbox'ta çalışır, siteyi asla çökertemez.", 'puzzle'),
      it('Yerleşik sayfa oluşturucu', 'Golementor ile sürükle, bırak, yayınla. Tek satır kod yazmadan.', 'layout'),
      it('Görev çalıştırıcı', "Zamanlanmış görevler cron'a ihtiyaç duymadan arka planda işler.", 'timer'),
      it('Sayfa önbelleği', 'Sık ziyaret edilen sayfalar bellekte; milisaniyeler içinde yanıt.', 'gauge'),
    ],
    style: { palette: 'light', align: 'left', padding: 112, titleSize: 56, hideOn: [] },
  },
  media: {
    content: {
      eyebrow: 'Golementor',
      title: 'Sayfanızı tasarlamak için geliştirici olmanız gerekmiyor.',
      body: 'Basit modda yalnızca yazılarınızı, fotoğraflarınızı ve renklerinizi görürsünüz. Daha fazlasına ihtiyaç duyduğunuzda Studio bir tık uzağınızda.',
      primary: "Golementor'u keşfedin",
      image: IMAGES[0].url,
      imageSide: 'right',
    },
    items: [],
    style: { palette: 'soft', align: 'left', padding: 112, titleSize: 48, hideOn: [] },
  },
  steps: {
    content: { eyebrow: 'Nasıl çalışır', title: 'Üç adımda yayında.' },
    items: [
      it('Kurun', 'docker compose up -d komutuyla Pursae ve PostgreSQL birlikte ayağa kalkar.'),
      it('Taşıyın', 'Mevcut WordPress sitenizi içe aktarın; yazılar, medya ve kullanıcılar korunur.'),
      it('Yayınlayın', 'Golementor ile sayfalarınızı düzenleyin ve tek tıkla yayına alın.'),
    ],
    style: { palette: 'dark', align: 'left', padding: 112, titleSize: 56, hideOn: [] },
  },
  quote: {
    content: {
      quote: "Pursae'ye geçtikten sonra sunucu faturamız üçte birine indi. Editör ekibimiz ise farkı hissetmedi bile.",
      author: 'Elif Arslan',
      role: 'Teknik lider, Kuzey Medya',
    },
    items: [],
    style: { palette: 'sand', align: 'center', padding: 112, titleSize: 40, hideOn: [] },
  },
  faq: {
    content: { eyebrow: 'SSS', title: 'Sık sorulan sorular' },
    items: [
      it('Mevcut WordPress eklentilerim çalışır mı?', 'PHP eklentileri doğrudan çalışmaz; popüler eklentilerin WASM sürümleri eklenti dizininde yer alıyor ve liste her hafta büyüyor.'),
      it('Temalarımı taşıyabilir miyim?', 'Blok temaları olduğu gibi çalışır. Klasik temalar için otomatik bir dönüştürücü sunuyoruz.'),
      it('Üretimde kullanmaya hazır mı?', '0.1 bir erken sürüm. Gerçek trafiğe açmadan önce üretim kontrol listesini mutlaka okuyun.'),
    ],
    style: { palette: 'light', align: 'left', padding: 112, titleSize: 52, hideOn: [] },
  },
  cta: {
    content: {
      title: 'Siteniz daha hızlı olabilir.',
      body: "Pursae'yi beş dakikada kurun, içeriğinizi taşıyın ve farkı kendiniz görün.",
      primary: "Pursae'yi edinin",
      secondary: 'Belgeleri okuyun',
    },
    items: [],
    style: { palette: 'brand', align: 'center', padding: 120, titleSize: 64, hideOn: [] },
  },
  footer: {
    content: { logo: 'P', brand: 'Pursae', note: '© 2025 Pursae. GPL-2.0 lisansı ile dağıtılır.' },
    items: ['GitHub', 'Belgeler', 'Yol haritası', 'İletişim'].map((t) => it(t)),
    style: { palette: 'dark', align: 'left', padding: 0, titleSize: 18, hideOn: [] },
  },
  text: {
    content: { title: 'Yeni bir başlık', body: 'Buraya anlatmak istediklerini yaz. Kısa ve net cümleler okunmayı kolaylaştırır.' },
    items: [],
    style: { palette: 'light', align: 'left', padding: 88, titleSize: 44, hideOn: [] },
  },
  image: {
    content: { image: IMAGES[1].url, caption: 'Ekibimiz, Pursae 0.1 lansman haftasında.', video: '' },
    items: [],
    style: { palette: 'light', align: 'left', padding: 72, titleSize: 40, hideOn: [] },
  },
  layout: {
    content: { type: 'flex', structure: '50-50' },
    items: [],
    style: { palette: 'light', align: 'left', padding: 72, titleSize: 36, hideOn: [] },
  },
  html: {
    content: { html: HTML_SAMPLE },
    items: [],
    style: { palette: 'light', align: 'left', padding: 72, titleSize: 40, hideOn: [] },
  },
  form: {
    content: {
      eyebrow: 'İletişim',
      title: 'Bize yazın.',
      body: 'Taşıma, kurulum ya da kurumsal destekle ilgili sorularınızı bir iş günü içinde yanıtlıyoruz.',
      primary: 'Mesajı gönder',
    },
    items: [],
    style: { palette: 'soft', align: 'left', padding: 104, titleSize: 52, hideOn: [] },
  },
  custom: {
    content: {},
    items: [],
    style: { palette: 'light', align: 'left', padding: 0, titleSize: 40, hideOn: [] },
  },
}

/** Starter tree for a new free-form section: a centered box with a heading, text and button. */
function customStarter(): Section['items'] {
  const root = uid('n')
  return [
    { id: root, title: '', text: '', node: 'box', lay: { dir: 'column', gap: 16, align: 'start' } },
    { id: uid('n'), title: 'Serbest bölüm', text: '', node: 'heading', tag: 'h2', parent: root },
    { id: uid('n'), title: 'Kutuların içine başlık, metin, buton ve görsel koyarak istediğin düzeni kur.', text: '', node: 'text', parent: root },
    { id: uid('n'), title: 'Buton', text: '', node: 'button', parent: root },
  ]
}

export function createSection(kind: SectionKind, content?: Record<string, string>): Section {
  const d = DEFAULTS[kind]
  const merged = { ...d.content, ...content }
  const layoutName = merged.type === 'grid' ? 'Grid kapsayıcı' : 'Flexbox kapsayıcı'
  return {
    id: uid(),
    kind,
    name: kind === 'layout' ? layoutName : KINDS[kind].name,
    hidden: false,
    content: merged,
    items: kind === 'layout' ? resizeCells([], merged.structure) : kind === 'custom' ? customStarter() : d.items.map((i) => ({ ...i, id: uid('i') })),
    style: { ...d.style, hideOn: [] },
  }
}

/* ---------- Layout structures (Flexbox / Grid) ---------- */
const row = (n: number, y = 0): [number, number, number, number][] => Array.from({ length: n }, (_, x) => [x, y, 1, 1])

export const FLEX_STRUCTURES: Structure[] = [
  { id: 'col', cols: 1, rows: 1, cells: row(1), arrow: 'down' },
  { id: 'row', cols: 1, rows: 1, cells: row(1), arrow: 'right' },
  { id: '50-50', cols: 2, rows: 1, cells: row(2) },
  { id: '33-66', cols: 3, rows: 1, cells: [[0, 0, 1, 1], [1, 0, 2, 1]] },
  { id: '25x4', cols: 4, rows: 1, cells: row(4) },
  { id: '25-50-25', cols: 4, rows: 1, cells: [[0, 0, 1, 1], [1, 0, 2, 1], [3, 0, 1, 1]] },
  { id: '2x2', cols: 2, rows: 2, cells: [...row(2), ...row(2, 1)] },
  { id: '2/1', cols: 2, rows: 2, cells: [...row(2), [0, 1, 2, 1]] },
  { id: '1/2', cols: 2, rows: 2, cells: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
  { id: '3x2', cols: 3, rows: 2, cells: [...row(3), ...row(3, 1)] },
  { id: '3/1-2', cols: 3, rows: 2, cells: [...row(3), [0, 1, 1, 1], [1, 1, 2, 1]] },
  { id: '2-1/1-2', cols: 3, rows: 2, cells: [[0, 0, 2, 1], [2, 0, 1, 1], [0, 1, 1, 1], [1, 1, 2, 1]] },
]

export const GRID_STRUCTURES: Structure[] = [
  { id: 'g2c', cols: 2, rows: 1, cells: row(2) },
  { id: 'g2r', cols: 1, rows: 2, cells: [[0, 0, 1, 1], [0, 1, 1, 1]] },
  { id: 'g3c', cols: 3, rows: 1, cells: row(3) },
  { id: 'g3r', cols: 1, rows: 3, cells: [[0, 0, 1, 1], [0, 1, 1, 1], [0, 2, 1, 1]] },
  { id: 'g2x2', cols: 2, rows: 2, cells: [...row(2), ...row(2, 1)] },
  { id: 'g3x2', cols: 3, rows: 2, cells: [...row(3), ...row(3, 1)] },
]

export const getStructure = (id?: string) => [...FLEX_STRUCTURES, ...GRID_STRUCTURES].find((s) => s.id === id) ?? FLEX_STRUCTURES[2]

export const CELL_TYPES: { value: CellType; label: string }[] = [
  { value: '', label: 'Boş' },
  { value: 'heading', label: 'Başlık' },
  { value: 'text', label: 'Metin' },
  { value: 'button', label: 'Buton' },
  { value: 'image', label: 'Görsel' },
  { value: 'layout', label: 'Kapsayıcı' },
]

export const CELL_DEFAULTS: Record<CellType, string> = {
  '': '',
  heading: 'Yeni başlık',
  text: 'Buraya kısa bir paragraf yaz. Ziyaretçine ne anlatmak istiyorsun?',
  button: 'Butona tıkla',
  image: IMAGES[2].url,
  layout: '',
}

/* ---------- Nested containers (a layout cell holding another layout section) ---------- */
/** Container levels including the top-level section. */
export const MAX_DEPTH = 5

/**
 * A new Flexbox / Grid section. Top-level ones are boxed (1160px) or full width; nested ones fill their
 * cell with no padding of their own, like Elementor inner containers.
 */
export function createLayout(type: LayoutType, structure: string, opts: { width?: 'boxed' | 'full'; nested?: boolean; palette?: PaletteId } = {}): Section {
  const s = createSection('layout', { type, structure })
  if (opts.palette) s.style = { ...s.style, palette: opts.palette }
  const d = defaultBox(s)
  if (opts.nested) {
    s.name = type === 'grid' ? 'İç grid' : 'İç flexbox'
    s.box = { ...d, contentWidth: 'full', width: 100, widthUnit: '%', padding: { t: 0, r: 0, b: 0, l: 0 }, gapX: type === 'grid' ? 16 : 24, gapY: type === 'grid' ? 16 : 24 }
  } else if (opts.width === 'full') s.box = { ...d, contentWidth: 'full', width: 100, widthUnit: '%' }
  return s
}

export interface SectionLoc {
  s: Section
  /** Top-level section the container lives in. */
  root: Section
  /** Containing layout section and the cell holding `s` (nested containers only). */
  parent?: Section
  item?: Item
  /** 1 = top-level section. */
  depth: number
}

export function locate(sections: Section[], id: string | undefined): SectionLoc | undefined {
  if (!id) return undefined
  const walk = (s: Section, root: Section, depth: number, parent?: Section, item?: Item): SectionLoc | undefined => {
    if (s.id === id) return { s, root, parent, item, depth }
    for (const it of s.items) {
      if (!it.sub) continue
      const hit = walk(it.sub, root, depth + 1, s, it)
      if (hit) return hit
    }
    return undefined
  }
  for (const s of sections) {
    const hit = walk(s, s, 1)
    if (hit) return hit
  }
  return undefined
}

/** Any section by id, top-level or nested inside layout cells. */
export const findSection = (doc: Pick<DocState, 'sections'>, id: string | undefined) => locate(doc.sections, id)?.s

/** Ancestors from the top-level section down to `id`, each with the cell that leads to the next one. */
export function sectionPath(sections: Section[], id: string): { s: Section; item?: Item }[] {
  let loc = locate(sections, id)
  if (!loc) return []
  const path: { s: Section; item?: Item }[] = [{ s: loc.s }]
  while (loc?.parent && loc.item) {
    path.unshift({ s: loc.parent, item: loc.item })
    loc = locate(sections, loc.parent.id)
  }
  return path
}

/** Container levels below and including `s`. */
export function nestHeight(s: Section): number {
  return 1 + Math.max(0, ...s.items.map((i) => (i.sub ? nestHeight(i.sub) : 0)))
}

/** Keep existing cells, add empty ones or trim so the count matches the structure. */
export function resizeCells(items: Section['items'], structureId?: string) {
  const n = getStructure(structureId).cells.length
  return Array.from({ length: n }, (_, i) => items[i] ?? { id: uid('c'), title: '', text: '' })
}

export function newItem(s: Section) {
  const n = s.items.length
  const icon = s.kind === 'features' ? ICON_ORDER[n % ICON_ORDER.length] : undefined
  const def = KINDS[s.kind].items
  return it(def?.titleLabel === 'Soru' ? 'Yeni soru?' : `Yeni ${def?.titleLabel.toLocaleLowerCase('tr') ?? 'öğe'}`, def?.textLabel ? 'Kısa bir açıklama yaz.' : '', icon)
}

export const initialDoc: DocState = {
  site: { brand: '#4058e3', fontPair: 'elegant', corners: 'soft' },
  sections: (['nav', 'hero', 'banner', 'features', 'media', 'steps', 'quote', 'faq', 'cta', 'footer'] as SectionKind[]).map((k) =>
    createSection(k),
  ),
}

/* ---------- Basic mode templates ---------- */
export const TEMPLATES: Payload[] = [
  { kind: 'hero', label: 'Karşılama' },
  { kind: 'features', label: 'Özellik kartları' },
  { kind: 'media', label: 'Görsel ve yazı' },
  { kind: 'steps', label: 'Adımlar' },
  { kind: 'quote', label: 'Müşteri yorumu' },
  { kind: 'faq', label: 'Sık sorulanlar' },
  { kind: 'banner', label: 'Duyuru şeridi' },
  { kind: 'cta', label: 'Harekete çağrı' },
  { kind: 'form', label: 'İletişim formu' },
  { kind: 'image', label: 'Büyük görsel' },
]

/* ---------- Studio widgets ---------- */
export interface Widget {
  id: string
  label: string
  icon: LucideIcon
  isNew?: boolean
  payload: Payload
}

const CELL_FOR: Record<string, CellType> = { heading: 'heading', paragraph: 'text', button: 'button', image: 'image', svg: 'image', youtube: 'image', video: 'image', bgvideo: 'image' }

const w = (id: string, label: string, icon: LucideIcon, kind: SectionKind, content?: Record<string, string>, isNew?: boolean): Widget => ({
  id,
  label,
  icon,
  isNew,
  payload: { kind, label, content, cell: CELL_FOR[id] },
})

export const WIDGET_GROUPS: { title: string; items: Widget[] }[] = [
  {
    title: 'Yapı',
    items: [
      w('div', 'Div blok', Box, 'layout', { type: 'flex', structure: 'col' }),
      w('flex', 'Flexbox', Columns2, 'layout', { type: 'flex' }),
      w('grid', 'Grid', LayoutGrid, 'layout', { type: 'grid' }),
      w('tabs', 'Sekmeler', PanelsTopLeft, 'steps'),
      w('list', 'Liste', List, 'steps', undefined, true),
      w('accordion', 'Akordiyon', ListCollapse, 'faq', undefined, true),
      w('bgvideo', 'Arka plan videosu', Film, 'image', { video: '1' }, true),
      w('loop', 'Döngü', Repeat, 'features'),
    ],
  },
  {
    title: 'Temel',
    items: [
      w('heading', 'Başlık', Heading, 'text'),
      w('image', 'Görsel', ImageIcon, 'image'),
      w('paragraph', 'Paragraf', Pilcrow, 'text'),
      w('svg', 'SVG', Shapes, 'image'),
      w('button', 'Buton', RectangleHorizontal, 'cta'),
      w('youtube', 'YouTube', SquarePlay, 'image', { video: '1' }),
      w('divider', 'Ayırıcı', Minus, 'banner'),
      w('video', 'Video', Play, 'image', { video: '1' }),
      w('html', 'HTML', CodeXml, 'html', undefined, true),
    ],
  },
  {
    title: 'Form',
    items: [
      w('form', 'Form', FormInput, 'form'),
      w('input', 'Girdi', TextCursorInput, 'form'),
      w('textarea', 'Metin alanı', LetterText, 'form'),
      w('select', 'Seçim', ChevronsUpDown, 'form'),
      w('checkbox', 'Onay kutusu', SquareCheck, 'form'),
      w('submit', 'Gönder', Send, 'form'),
    ],
  },
]

/* ---------- Helpers ---------- */
export function getValue(s: Section, el: string): string {
  if (el.startsWith('items.')) {
    const [, id, f] = el.split('.')
    const item = s.items.find((i) => i.id === id)
    return item && f !== 'card' ? (f === 'text' ? item.text : f === 'icon' ? item.icon ?? '' : item.title) : ''
  }
  return s.content[el] ?? ''
}

/** Card boxes of ready-made sections ("items.<id>.card"): selectable, styled per card over the section's card defaults. */
export const CARD_NOUN: Partial<Record<Section['kind'], string>> = { features: 'Kart', steps: 'Adım', faq: 'Soru' }
export const isCardEl = (el?: string) => !!el && el.startsWith('items.') && el.endsWith('.card')

export function fieldLabel(s: Section, el: string): string {
  const def = KINDS[s.kind]
  if (isCardEl(el) && CARD_NOUN[s.kind]) return `${CARD_NOUN[s.kind]} ${s.items.findIndex((i) => i.id === el.split('.')[1]) + 1}`
  if (el === 'icon' || el.endsWith('.icon')) return s.kind === 'features' ? `Kart ${s.items.findIndex((i) => i.id === el.split('.')[1]) + 1} · ikon` : 'İkon'
  if (s.kind === 'layout') return `Hücre ${s.items.findIndex((i) => i.id === el.split('.')[1]) + 1}`
  if (s.kind === 'custom') {
    const it = s.items.find((i) => i.id === el.split('.')[1])
    const name = NODE_NAMES[it?.node ?? 'text']
    const t = it && it.node !== 'image' && it.node !== 'icon' && it.node !== 'box' ? toPlain(it.title).split('\n')[0].trim() : ''
    return t ? `${name} · ${t.length > 24 ? `${t.slice(0, 24)}…` : t}` : name
  }
  if (el.startsWith('items.')) {
    const f = el.split('.')[2]
    return (f === 'text' ? def.items?.textLabel : def.items?.titleLabel) ?? 'Öğe'
  }
  return def.fields.find((f) => f.key === el)?.label ?? el
}

export function fieldKind(s: Section, el: string) {
  const def = KINDS[s.kind]
  if (isCardEl(el) && CARD_NOUN[s.kind]) return 'box'
  if (el === 'icon' || el.endsWith('.icon')) return 'icon'
  if (s.kind === 'layout') {
    const t = s.items.find((i) => i.id === el.split('.')[1])?.title
    return t === 'heading' || t === 'button' || t === 'image' ? t : t === 'layout' ? 'box' : 'text'
  }
  if (s.kind === 'custom') {
    const n = s.items.find((i) => i.id === el.split('.')[1])?.node
    return n === 'icon' ? 'image' : n === 'input' ? 'text' : n === 'divider' ? 'box' : n ?? 'text'
  }
  if (el.startsWith('items.')) {
    const f = el.split('.')[2]
    return (f === 'text' ? def.items?.textEl : def.items?.titleEl) ?? 'text'
  }
  return def.fields.find((f) => f.key === el)?.el ?? 'text'
}

export const EL_NAMES: Record<string, string> = {
  heading: 'Başlık',
  text: 'Paragraf',
  button: 'Buton',
  badge: 'Etiket',
  image: 'Görsel',
  link: 'Bağlantı',
  code: 'Kod',
  box: 'Kutu',
  icon: 'İkon',
}

export const NODE_NAMES: Record<import('./types').NodeType, string> = {
  box: 'Kutu',
  heading: 'Başlık',
  text: 'Metin',
  button: 'Buton',
  link: 'Bağlantı',
  image: 'Görsel',
  icon: 'İkon',
  input: 'Form alanı',
  divider: 'Ayırıcı',
}

export function sectionSummary(s: Section) {
  const c = s.content
  if (s.kind === 'layout') return `${c.type === 'grid' ? 'Grid' : 'Flexbox'} · ${s.items.filter((i) => i.title).length}/${s.items.length} hücre dolu`
  if (s.kind === 'custom') {
    const h = s.items.find((i) => i.node === 'heading')
    return h ? toPlain(h.title).split('\n')[0] : `${s.items.length} öğe`
  }
  return toPlain(c.title || c.quote || c.text || c.brand || c.caption || '')
}


/* ---------- Container box (Elementor-style) ---------- */
export function defaultBox(s: Pick<Section, 'content'> & Partial<Pick<Section, 'kind' | 'style'>>): ContainerBox {
  const st = getStructure(s.content.structure)
  const grid = s.content.type === 'grid'
  const layout = !s.kind || s.kind === 'layout'
  // Ready-made sections start from their designed vertical spacing.
  const v = layout ? 72 : s.kind && KINDS[s.kind].spacing ? (s.style?.padding ?? 0) : 0
  return {
    contentWidth: layout ? 'boxed' : 'full',
    width: layout ? 1160 : 100,
    widthUnit: layout ? 'px' : '%',
    minHeight: 0,
    minHeightUnit: 'px',
    direction: st.arrow === 'down' ? 'column' : 'row',
    justify: 'start',
    align: 'stretch',
    wrap: true,
    stackMobile: true,
    gapX: grid ? 16 : 32,
    gapY: grid ? 16 : 32,
    gridCols: st.cols,
    gridRows: st.rows,
    margin: { t: 0, r: 0, b: 0, l: 0 },
    padding: layout ? { t: 72, r: 40, b: 72, l: 40 } : { t: v, r: 0, b: v, l: 0 },
    borderStyle: 'none',
    borderWidth: 1,
    borderColor: '#d0d4db',
    radius: 0,
    shadow: 'none',
    zIndex: 0,
  }
}

export const getBox = (s: Section): ContainerBox => ({ ...defaultBox(s), ...s.box })

export const SHADOWS: Record<ContainerBox['shadow'], string | undefined> = {
  none: undefined,
  sm: '0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08)',
  md: '0 10px 30px -8px rgba(0,0,0,.22)',
  lg: '0 30px 70px -15px rgba(0,0,0,.35)',
}

export const box4 = (b: { t: number; r: number; b: number; l: number }) => `${b.t}px ${b.r}px ${b.b}px ${b.l}px`

/** Default cell width (%) from the chosen structure. */
export function cellWidth(s: Section, i: number) {
  const st = getStructure(s.content.structure)
  const c = st.cells[i]
  return c ? Math.round((c[2] / st.cols) * 10000) / 100 : 100
}


/** CSS for per-element overrides. Text-like kinds treat height as min-height so copy never overflows. */
export function elCss(e?: import('./types').ElStyle, kind?: import('./types').ElKind): import('react').CSSProperties {
  if (!e) return {}
  const h = e.height !== undefined ? `${e.height}${e.heightUnit ?? 'px'}` : undefined
  const soft = kind === 'heading' || kind === 'text' || kind === 'link'
  // Unset keys must not override the element's base style when spread.
  return Object.fromEntries(Object.entries({
    width: e.width !== undefined ? `${e.width}${e.widthUnit ?? 'px'}` : undefined,
    maxWidth: e.maxWidth !== undefined ? `${e.maxWidth}${e.maxWidthUnit ?? 'px'}` : e.width !== undefined ? '100%' : undefined,
    ...(h ? (soft ? { minHeight: h } : { height: h, minHeight: 0 }) : {}),
    ...(e.margin
      ? { margin: box4({ t: e.mt ?? e.margin.t, r: e.mr ?? e.margin.r, b: e.mb ?? e.margin.b, l: e.ml ?? e.margin.l }) }
      : { marginTop: e.mt, marginBottom: e.mb, marginLeft: e.ml, marginRight: e.mr }),
    padding: e.padding ? box4(e.padding) : undefined,
    fontSize: e.fontSize ? `${e.fontSize}px` : undefined,
    fontWeight: e.fontWeight || undefined,
    lineHeight: e.lineHeight || undefined,
    letterSpacing: e.letterSpacing !== undefined ? `${e.letterSpacing}em` : undefined,
    color: e.color || undefined,
    background: e.bg || undefined,
    borderRadius: e.radius || undefined,
    textAlign: e.align,
    ...typeCss(e),
  } satisfies import('react').CSSProperties).filter(([, v]) => v !== undefined))
}

/** Per-card overrides ("items.<id>.card") spread over the section's card defaults; height = min-height. */
export function cardCss(e?: import('./types').ElStyle): import('react').CSSProperties {
  if (!e) return {}
  return Object.fromEntries(Object.entries({
    background: e.bg || undefined,
    border: e.border || undefined,
    borderRadius: e.radius,
    boxShadow: e.shadow || undefined,
    padding: e.padding ? box4(e.padding) : undefined,
    ...(e.margin
      ? { margin: box4({ t: e.mt ?? e.margin.t, r: e.mr ?? e.margin.r, b: e.mb ?? e.margin.b, l: e.ml ?? e.margin.l }) }
      : { marginTop: e.mt, marginBottom: e.mb, marginLeft: e.ml, marginRight: e.mr }),
    minHeight: e.height !== undefined ? `${e.height}${e.heightUnit ?? 'px'}` : undefined,
  } satisfies import('react').CSSProperties).filter(([, v]) => v !== undefined))
}

/** Deep copy with fresh ids (section, items and element-style keys). */
export function cloneSection(src: Section, name?: string): Section {
  const map = new Map<string, string>()
  const items = src.items.map((i) => {
    const id = uid('i')
    map.set(i.id, id)
    return { ...i, id, box: i.box ? { ...i.box } : undefined, sub: i.sub ? cloneSection(i.sub) : undefined }
  })
  for (const i of items) if (i.parent && map.has(i.parent)) i.parent = map.get(i.parent)
  const els: Section['els'] = {}
  for (const [k, v] of Object.entries(src.els ?? {})) {
    const parts = k.split('.')
    els[parts[0] === 'items' && map.has(parts[1]) ? `items.${map.get(parts[1])}.${parts[2]}` : k] = { ...v }
  }
  return {
    ...src,
    id: uid(),
    name: name ?? src.name,
    content: { ...src.content },
    items,
    style: { ...src.style, hideOn: [...src.style.hideOn] },
    box: src.box ? { ...src.box } : undefined,
    grid: src.grid ? { ...src.grid } : undefined,
    bg: src.bg ? { ...src.bg } : undefined,
    els,
  }
}

/* ---------- Local persistence ---------- */
export const STORE_KEY = 'pursae-builder:v2'

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable: keep working in memory */
  }
}

export function loadDoc(): DocState | null {
  const d = loadJSON<DocState | null>(STORE_KEY, null)
  if (!(d && Array.isArray(d.sections) && d.site && d.sections.every((s) => s && s.id && s.kind in KINDS))) return null
  // Fill fields added in later versions so older saves keep working.
  return {
    ...d,
    sections: d.sections.map((s) => ((s.kind === 'nav' || s.kind === 'footer') && s.content.logo === undefined ? { ...s, content: { ...s.content, logo: 'P' } } : s)),
  }
}


/* ---------- Item grids of ready-made sections ---------- */
export interface GridCaps {
  cols?: boolean
  gapX?: boolean
  gapY?: boolean
  cards?: boolean
  icon?: boolean
  label: string
}

export const GRID_CAPS: Partial<Record<Section['kind'], GridCaps>> = {
  features: { cols: true, gapX: true, gapY: true, cards: true, icon: true, label: 'Kart ızgarası' },
  steps: { cols: true, gapX: true, gapY: true, cards: true, label: 'Adım ızgarası' },
  faq: { gapY: true, label: 'Soru listesi' },
  hero: { gapX: true, gapY: true, label: 'Öne çıkanlar listesi' },
  nav: { gapX: true, label: 'Menü bağlantıları' },
  footer: { gapX: true, gapY: true, label: 'Bağlantı listesi' },
}

const GRID_DEFAULTS: Partial<Record<Section['kind'], Partial<GridSettings>>> = {
  features: { cols: 3, colsT: 2, colsM: 1, gapX: 16, gapY: 16, pad: 28 },
  steps: { cols: 3, colsT: 3, colsM: 1, gapX: 1, gapY: 1, pad: 32, border: false },
  faq: { gapY: 40 },
  hero: { gapX: 24, gapY: 8 },
  nav: { gapX: 24 },
  footer: { gapX: 28, gapY: 8 },
}

export function getGrid(s: Section): GridSettings {
  return {
    cols: 3,
    colsT: 2,
    colsM: 1,
    gapX: 16,
    gapY: 16,
    pad: 28,
    border: true,
    borderW: 1,
    shadow: 'none',
    showIcon: true,
    iconSize: 40,
    ...GRID_DEFAULTS[s.kind],
    ...s.grid,
  }
}

export const repeatCols = (n: number) => `repeat(${Math.max(1, n)}, minmax(0, 1fr))`


/* ---------- Background & decor ---------- */
export const DECORS: { id: DecorId; name: string }[] = [
  { id: 'none', name: 'Yok' },
  { id: 'globe', name: 'Dünya' },
  { id: 'rings', name: 'Halkalar' },
  { id: 'waves', name: 'Dalgalar' },
  { id: 'blob', name: 'Işık' },
  { id: 'dots', name: 'Noktalar' },
  { id: 'grid', name: 'Izgara' },
  { id: 'custom', name: 'Özel SVG' },
]

/** Shapes that sit at a position (vs. patterns that fill the section). */
export const POSITIONED_DECOR: DecorId[] = ['globe', 'rings', 'waves', 'blob', 'custom']

const BG_DEFAULTS: Partial<Record<Section['kind'], Partial<BgSettings>>> = {
  hero: { decor: 'globe', decorOpacity: 16, decorX: 73, decorY: 50 },
  cta: { decor: 'blob', decorOpacity: 25, decorX: 8, decorY: 10, decorScale: 55 },
}

export function getBg(s: Section): BgSettings {
  return {
    type: 'color',
    gradFrom: '#4058e3',
    gradTo: '#131417',
    gradAngle: 135,
    overlay: 45,
    decor: 'none',
    decorOpacity: 16,
    decorScale: 100,
    decorX: 50,
    decorY: 50,
    decorRotate: 0,
    decorAnim: 'none',
    ...BG_DEFAULTS[s.kind],
    ...s.bg,
  }
}

/** Minimal clean-up for pasted SVG: no scripts, no inline event handlers, no javascript: URLs. */
export function sanitizeSvg(svg: string) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}
