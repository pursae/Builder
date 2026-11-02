import type { CSSProperties } from 'react'
import {
  Activity,
  ArrowRight,
  AtSign,
  Award,
  BadgeCheck,
  BatteryFull,
  Bell,
  Blocks,
  BookOpen,
  Bot,
  Box,
  Brain,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  Camera,
  Car,
  ChartColumn,
  ChartPie,
  Check,
  CircleCheck,
  CircleHelp,
  ClipboardList,
  Clock,
  Cloud,
  Code,
  Coffee,
  Cpu,
  CreditCard,
  Database,
  DollarSign,
  Download,
  Droplet,
  Dumbbell,
  Eye,
  FileText,
  Fingerprint,
  Flag,
  Flame,
  Folder,
  Gauge,
  Gift,
  GitBranch,
  Globe,
  GraduationCap,
  Hammer,
  HandHeart,
  Handshake,
  HardDrive,
  Hash,
  Headphones,
  Heart,
  House,
  Image,
  Infinity as InfinityIcon,
  Info,
  Key,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  Leaf,
  Lightbulb,
  Link,
  ListChecks,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Monitor,
  Moon,
  MousePointerClick,
  Music,
  Package,
  Paintbrush,
  Palette,
  PawPrint,
  PenTool,
  Percent,
  Phone,
  Pill,
  Plane,
  Plug,
  Puzzle,
  QrCode,
  Quote,
  Receipt,
  RefreshCw,
  Repeat,
  Rocket,
  Scale,
  Search,
  Send,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Sun,
  Tag,
  Target,
  Terminal,
  ThumbsUp,
  Timer,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Truck,
  Upload,
  User,
  Users,
  Utensils,
  Video,
  Wallet,
  Wifi,
  Workflow,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { FEATURE_ICONS, getGrid } from './data'
import type { ElStyle, Section } from './types'

/** Icon library for card / list / quote icons: key → lucide icon + Turkish search words. */
export const ICON_SET: Record<string, { I: LucideIcon; tags: string }> = {
  box: { I: Box, tags: 'kutu paket küp binary' },
  database: { I: Database, tags: 'veritabanı veri sql' },
  puzzle: { I: Puzzle, tags: 'eklenti yapboz modül' },
  layout: { I: LayoutTemplate, tags: 'düzen şablon sayfa' },
  timer: { I: Timer, tags: 'zamanlayıcı süre kronometre' },
  gauge: { I: Gauge, tags: 'hız performans ölçer' },
  zap: { I: Zap, tags: 'şimşek hızlı enerji' },
  shield: { I: ShieldCheck, tags: 'güvenlik koruma kalkan' },
  check: { I: Check, tags: 'onay tik doğru' },
  'circle-check': { I: CircleCheck, tags: 'onay tamam başarılı' },
  'badge-check': { I: BadgeCheck, tags: 'doğrulanmış rozet onaylı' },
  quote: { I: Quote, tags: 'alıntı yorum tırnak' },
  star: { I: Star, tags: 'yıldız favori puan' },
  heart: { I: Heart, tags: 'kalp sevgi beğeni' },
  rocket: { I: Rocket, tags: 'roket başlat lansman' },
  sparkles: { I: Sparkles, tags: 'parıltı yapay zeka ai sihir' },
  bot: { I: Bot, tags: 'robot bot ai asistan' },
  brain: { I: Brain, tags: 'beyin zeka akıl' },
  lock: { I: Lock, tags: 'kilit güvenlik şifre' },
  key: { I: Key, tags: 'anahtar erişim' },
  fingerprint: { I: Fingerprint, tags: 'parmak izi kimlik' },
  eye: { I: Eye, tags: 'göz görünürlük izleme' },
  user: { I: User, tags: 'kullanıcı kişi profil' },
  users: { I: Users, tags: 'ekip kullanıcılar topluluk' },
  handshake: { I: Handshake, tags: 'anlaşma ortaklık el sıkışma' },
  'hand-heart': { I: HandHeart, tags: 'yardım bağış destek' },
  settings: { I: Settings, tags: 'ayarlar dişli yapılandırma' },
  wrench: { I: Wrench, tags: 'anahtar tamir bakım araç' },
  hammer: { I: Hammer, tags: 'çekiç yapım inşaat' },
  code: { I: Code, tags: 'kod yazılım geliştirici' },
  terminal: { I: Terminal, tags: 'terminal komut konsol' },
  'git-branch': { I: GitBranch, tags: 'git dal sürüm' },
  cpu: { I: Cpu, tags: 'işlemci çip donanım' },
  server: { I: Server, tags: 'sunucu barındırma' },
  'hard-drive': { I: HardDrive, tags: 'disk depolama' },
  cloud: { I: Cloud, tags: 'bulut barındırma' },
  globe: { I: Globe, tags: 'dünya web internet global' },
  wifi: { I: Wifi, tags: 'kablosuz bağlantı internet' },
  plug: { I: Plug, tags: 'fiş entegrasyon bağlantı' },
  workflow: { I: Workflow, tags: 'iş akışı otomasyon süreç' },
  blocks: { I: Blocks, tags: 'blok modül bileşen' },
  layers: { I: Layers, tags: 'katman yığın' },
  grid: { I: LayoutGrid, tags: 'ızgara kartlar uygulama' },
  smartphone: { I: Smartphone, tags: 'telefon mobil uygulama' },
  monitor: { I: Monitor, tags: 'ekran masaüstü bilgisayar' },
  mail: { I: Mail, tags: 'eposta posta mesaj' },
  phone: { I: Phone, tags: 'telefon arama iletişim' },
  message: { I: MessageCircle, tags: 'mesaj sohbet yorum' },
  send: { I: Send, tags: 'gönder ilet' },
  'at-sign': { I: AtSign, tags: 'et işareti eposta' },
  bell: { I: Bell, tags: 'bildirim zil uyarı' },
  calendar: { I: Calendar, tags: 'takvim tarih randevu' },
  clock: { I: Clock, tags: 'saat zaman' },
  chart: { I: ChartColumn, tags: 'grafik istatistik analiz' },
  'chart-pie': { I: ChartPie, tags: 'pasta grafik rapor' },
  trending: { I: TrendingUp, tags: 'artış büyüme yükseliş' },
  activity: { I: Activity, tags: 'aktivite nabız sağlık izleme' },
  target: { I: Target, tags: 'hedef odak' },
  search: { I: Search, tags: 'arama bul büyüteç' },
  file: { I: FileText, tags: 'dosya belge döküman' },
  folder: { I: Folder, tags: 'klasör dosyalar' },
  clipboard: { I: ClipboardList, tags: 'pano liste görev' },
  list: { I: ListChecks, tags: 'liste yapılacaklar kontrol' },
  image: { I: Image, tags: 'görsel resim fotoğraf' },
  camera: { I: Camera, tags: 'kamera fotoğraf' },
  video: { I: Video, tags: 'video film kayıt' },
  music: { I: Music, tags: 'müzik ses' },
  mic: { I: Mic, tags: 'mikrofon podcast ses' },
  headphones: { I: Headphones, tags: 'kulaklık destek dinle' },
  palette: { I: Palette, tags: 'palet renk tasarım' },
  pen: { I: PenTool, tags: 'kalem tasarım çizim' },
  brush: { I: Paintbrush, tags: 'fırça boya tasarım' },
  lightbulb: { I: Lightbulb, tags: 'ampul fikir ilham' },
  book: { I: BookOpen, tags: 'kitap okuma rehber doküman' },
  graduation: { I: GraduationCap, tags: 'eğitim mezuniyet okul kurs' },
  briefcase: { I: Briefcase, tags: 'çanta iş kariyer' },
  building: { I: Building2, tags: 'bina şirket ofis kurumsal' },
  home: { I: House, tags: 'ev ana sayfa konut' },
  store: { I: Store, tags: 'mağaza dükkan' },
  cart: { I: ShoppingCart, tags: 'sepet alışveriş e-ticaret' },
  bag: { I: ShoppingBag, tags: 'çanta alışveriş' },
  card: { I: CreditCard, tags: 'kredi kartı ödeme' },
  wallet: { I: Wallet, tags: 'cüzdan para ödeme' },
  dollar: { I: DollarSign, tags: 'para dolar fiyat' },
  percent: { I: Percent, tags: 'yüzde indirim' },
  receipt: { I: Receipt, tags: 'fatura fiş' },
  calculator: { I: Calculator, tags: 'hesap makinesi muhasebe' },
  tag: { I: Tag, tags: 'etiket fiyat' },
  gift: { I: Gift, tags: 'hediye kampanya' },
  package: { I: Package, tags: 'paket kargo ürün' },
  truck: { I: Truck, tags: 'kamyon kargo teslimat' },
  'map-pin': { I: MapPin, tags: 'konum harita adres' },
  plane: { I: Plane, tags: 'uçak seyahat tatil' },
  car: { I: Car, tags: 'araba araç ulaşım' },
  award: { I: Award, tags: 'ödül madalya kalite' },
  trophy: { I: Trophy, tags: 'kupa başarı şampiyon' },
  'thumbs-up': { I: ThumbsUp, tags: 'beğen onay' },
  smile: { I: Smile, tags: 'gülümseme mutlu memnun' },
  flag: { I: Flag, tags: 'bayrak hedef başlangıç' },
  leaf: { I: Leaf, tags: 'yaprak doğa çevre organik' },
  sun: { I: Sun, tags: 'güneş gündüz enerji' },
  moon: { I: Moon, tags: 'ay gece karanlık mod' },
  flame: { I: Flame, tags: 'ateş alev popüler' },
  droplet: { I: Droplet, tags: 'damla su sıvı' },
  paw: { I: PawPrint, tags: 'pati hayvan evcil veteriner' },
  coffee: { I: Coffee, tags: 'kahve kafe mola' },
  utensils: { I: Utensils, tags: 'yemek restoran mutfak' },
  dumbbell: { I: Dumbbell, tags: 'spor fitness ağırlık' },
  stethoscope: { I: Stethoscope, tags: 'doktor sağlık klinik' },
  pill: { I: Pill, tags: 'ilaç eczane sağlık' },
  scale: { I: Scale, tags: 'terazi hukuk adalet' },
  link: { I: Link, tags: 'bağlantı link' },
  share: { I: Share2, tags: 'paylaş sosyal' },
  download: { I: Download, tags: 'indir' },
  upload: { I: Upload, tags: 'yükle' },
  refresh: { I: RefreshCw, tags: 'yenile senkron güncelle' },
  repeat: { I: Repeat, tags: 'tekrar döngü' },
  infinity: { I: InfinityIcon, tags: 'sonsuz sınırsız' },
  'qr-code': { I: QrCode, tags: 'karekod qr' },
  battery: { I: BatteryFull, tags: 'pil batarya şarj' },
  hash: { I: Hash, tags: 'diyez etiket kanal' },
  info: { I: Info, tags: 'bilgi' },
  help: { I: CircleHelp, tags: 'yardım soru sss' },
  alert: { I: TriangleAlert, tags: 'uyarı dikkat' },
  'arrow-right': { I: ArrowRight, tags: 'ok sağ ileri' },
  click: { I: MousePointerClick, tags: 'tık tıklama imleç' },
}

export const ICON_KEYS = Object.keys(ICON_SET)

/** Custom icon: an image / SVG URL or data URL instead of a library key. */
export const isIconUrl = (v?: string) => !!v && /^(https?:\/\/|\/|data:image\/)/i.test(v.trim())

/** Element keys that hold an icon: "items.<id>.icon" (card / list icons) or "icon" (section icon, e.g. quote). */
export const isIconEl = (el: string) => el === 'icon' || /^items\.[^.]+\.icon$/.test(el)

/** Sections whose built-in renderer draws editable icons. */
export const ICON_KINDS = ['features', 'hero', 'quote'] as const

/** Resolved look of an icon: section defaults + per-element overrides (`els[el]`). */
export interface IconLook {
  key: string
  url?: string
  show: boolean
  hidden: boolean
  color: string
  size: number
  tile: boolean
  tileSize: number
  tileColor: string
  tileOpacity: number
  radius: number
}

function baseLook(s: Section, el: string): Omit<IconLook, 'key' | 'url' | 'hidden'> & { fallback: string } {
  if (s.kind === 'features') {
    const g = getGrid(s)
    const n = Math.max(0, s.items.findIndex((i) => i.id === el.split('.')[1]))
    const order = Object.keys(FEATURE_ICONS)
    const color = g.iconColor || 'var(--accent)'
    return { fallback: order[n % order.length], show: g.showIcon, color, size: Math.round(g.iconSize * 0.48), tile: true, tileSize: g.iconSize, tileColor: color, tileOpacity: 13, radius: Math.round(g.iconSize / 4) }
  }
  if (s.kind === 'quote') return { fallback: 'quote', show: true, color: 'var(--accent)', size: 34, tile: false, tileSize: 64, tileColor: 'var(--accent)', tileOpacity: 13, radius: 16 }
  return { fallback: 'check', show: true, color: 'currentColor', size: 13, tile: false, tileSize: 24, tileColor: 'var(--accent)', tileOpacity: 13, radius: 6 }
}

export function iconLook(s: Section, el: string): IconLook {
  const { fallback, ...d } = baseLook(s, el)
  const e: ElStyle = s.els?.[el] ?? {}
  const v = el === 'icon' ? s.content.icon : s.items.find((i) => i.id === el.split('.')[1])?.icon
  const url = isIconUrl(v) ? v!.trim() : undefined
  const tileSize = e.tileSize ?? d.tileSize
  const color = e.iconColor || d.color
  return {
    key: v && ICON_SET[v] ? v : fallback,
    url,
    show: d.show,
    hidden: !!e.hide,
    color,
    size: e.iconSize ?? (e.tileSize !== undefined ? Math.round((tileSize * d.size) / d.tileSize) : d.size),
    tile: e.tile ?? d.tile,
    tileSize,
    tileColor: e.bg || (e.iconColor ? color : d.tileColor),
    tileOpacity: e.tileOpacity ?? d.tileOpacity,
    radius: e.radius ?? (e.tileSize !== undefined && s.kind === 'features' ? Math.round(tileSize / 4) : d.radius),
  }
}

/** Tile (background square) style of a resolved icon. */
export function tileCss(l: IconLook): CSSProperties {
  if (!l.tile) return { width: l.size, height: l.size }
  return {
    width: l.tileSize,
    height: l.tileSize,
    borderRadius: l.radius,
    background: l.tileOpacity >= 100 ? l.tileColor : `color-mix(in srgb, ${l.tileColor} ${l.tileOpacity}%, transparent)`,
  }
}

/** Style keys "Tüm kartlara uygula" copies from one icon to its siblings. */
export const ICON_STYLE_KEYS = ['iconColor', 'iconSize', 'tile', 'tileSize', 'bg', 'tileOpacity', 'radius'] as const
