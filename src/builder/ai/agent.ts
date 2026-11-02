import { FONT_PRESETS, presetPatch } from '../fonts'
import { FONT_PAIRS, IMAGES, KINDS, createSection, getValue, uid } from '../data'
import { toPlain } from '../rich'
import { insertBounds, type BuilderApi } from '../store'
import type { CornerId, Device, DocState, FontPairId, Section, SectionKind } from '../types'
import { jobResult, startImageJob, waitForJobs } from './images'
import { guideAnswer } from './knowledge'
import { cloneSteps, type CloneResult } from './clone'

/* ---------- Types ---------- */
export interface Target {
  sectionId: string
  el?: string
}

export type Step =
  | { kind: 'say'; text: string }
  | { kind: 'wait'; ms: number }
  | { kind: 'type'; target: Target & { el: string }; text: string; label: string }
  | { kind: 'do'; label: string; target?: Target; run: (api: AgentApi) => void }
  | { kind: 'device'; device: Device; label: string }

export type AgentApi = Pick<
  BuilderApi,
  'doc' | 'dispatch' | 'setDevice' | 'setMode' | 'setPreview' | 'select' | 'setDialog' | 'setPaletteOpen' | 'setStudioTab' | 'setBasicView' | 'page' | 'setPage' | 'publish'
>

export interface Attachment {
  id: string
  name: string
  size: number
  kind: 'image' | 'text' | 'pdf' | 'file'
  url?: string
  /** Base64 payload (no data: prefix) for sending images to a live model. */
  data?: string
  mediaType?: string
  text?: string
  pages?: number
  loading?: boolean
  error?: string
}

export interface Plan {
  steps: Step[]
  suggestions?: string[]
}

export const isAction = (s: Step): s is Extract<Step, { label: string }> => 'label' in s

/* ---------- Vocabulary ---------- */
const COLORS: [RegExp, string, string][] = [
  [/lacivert/, '#1e3a8a', 'lacivert'],
  [/mavi/, '#4058e3', 'mavi'],
  [/mor|eflatun/, '#7047eb', 'mor'],
  [/yeşil/, '#0f9b6c', 'yeşil'],
  [/turuncu/, '#e8590c', 'turuncu'],
  [/pembe/, '#d6336c', 'pembe'],
  [/kırmızı/, '#dc2626', 'kırmızı'],
  [/sarı|altın/, '#ca8a04', 'altın sarısı'],
  [/siyah|grafit|gri/, '#2b2d33', 'grafit'],
]

const KIND_WORDS: [RegExp, SectionKind][] = [
  [/sss|sık sorulan|soru/, 'faq'],
  [/özellik/, 'features'],
  [/yorum|referans|müşteri sözü/, 'quote'],
  [/adım|süreç/, 'steps'],
  [/iletişim|form/, 'form'],
  [/görsel ve yazı|hikaye|hikâye/, 'media'],
  [/duyuru|şerit/, 'banner'],
  [/çağrı|cta|harekete/, 'cta'],
  [/karşılama|hero|giriş bölüm/, 'hero'],
  [/video|büyük görsel/, 'image'],
  [/yazı bloğu|metin bloğu|paragraf bölüm/, 'text'],
  [/html|kod/, 'html'],
  [/alt bilgi|footer/, 'footer'],
]

const TITLE_FIELD: Partial<Record<SectionKind, string>> = { banner: 'text', quote: 'quote', image: 'caption', footer: 'brand', nav: 'brand' }
const mainField = (k: SectionKind) => TITLE_FIELD[k] ?? (KINDS[k].fields.some((f) => f.key === 'title') ? 'title' : KINDS[k].fields[0]?.key)

const quoted = (t: string) => t.match(/["“”«»'‘’](.+?)["“”«»'‘’]/)?.[1]?.trim()
const kindIn = (t: string) => KIND_WORDS.find(([re]) => re.test(t))?.[1]

/* ---------- Building blocks ---------- */
const say = (text: string): Step => ({ kind: 'say', text })
const type = (s: Section, el: string, text: string, label: string): Step => ({ kind: 'type', target: { sectionId: s.id, el }, text, label })

function insertSteps(doc: DocState, kind: SectionKind, title?: string, at?: number): { steps: Step[]; section: Section } {
  const section = createSection(kind)
  const field = mainField(kind)
  const index = at ?? insertBounds(doc.sections).max
  const finalTitle = title ?? (field ? getValue(section, field) : '')
  if (field) section.content[field] = ''
  const steps: Step[] = [{ kind: 'do', label: `${KINDS[kind].name} bölümü eklendi`, target: { sectionId: section.id }, run: (api) => api.dispatch({ type: 'insert', section, index }) }]
  if (field && finalTitle) steps.push({ kind: 'type', target: { sectionId: section.id, el: field }, text: finalTitle, label: `${KINDS[kind].name} başlığı yazıldı` })
  return { steps, section }
}

/* ---------- Demo ---------- */
function demoPlan(doc: DocState): Plan {
  const hero = doc.sections.find((s) => s.kind === 'hero')
  const features = doc.sections.find((s) => s.kind === 'features')
  const steps: Step[] = [say('Demo başlıyor! Sayfanda yaptığım her değişikliği canlı göreceksin; mor imleç nerede çalıştığımı gösteriyor. İstediğin an Durdur’a basabilirsin.\n\n')]
  if (hero) {
    steps.push(say('Önce karşılama başlığını daha net bir mesajla yeniliyorum.\n'))
    steps.push(type(hero, 'title', 'Siteniz,', 'Karşılama başlığı yazıldı'))
    steps.push(type(hero, 'accent', 'AI ile dakikalar içinde.', 'Vurgulu satır yazıldı'))
    steps.push(type(hero, 'body', 'Pursae; tek binary, PostgreSQL ve WebAssembly eklentileriyle WordPress’i yeniden yazar. Yapay zekâ asistanı ise sayfalarınızı sizin yerinize düzenler, siz sadece ne istediğinizi söyleyin.', 'Açıklama yazıldı'))
    steps.push(say('Marka rengini daha taze bir yeşile çeviriyorum.\n'))
    steps.push({ kind: 'do', label: 'Ana renk yeşil yapıldı', target: { sectionId: hero.id }, run: (api) => api.dispatch({ type: 'site', patch: { brand: '#0f9b6c' } }) })
  }
  if (features) {
    const item = { id: uid('i'), title: '', text: '', icon: 'zap' }
    steps.push(say('Özellikler bölümüne yeni bir kart ekliyorum.\n'))
    steps.push({ kind: 'do', label: 'Yeni özellik kartı eklendi', target: { sectionId: features.id }, run: (api) => api.dispatch({ type: 'addItem', id: features.id, item }) })
    steps.push({ kind: 'type', target: { sectionId: features.id, el: `items.${item.id}.title` }, text: 'AI asistan', label: 'Kart başlığı yazıldı' })
    steps.push({ kind: 'type', target: { sectionId: features.id, el: `items.${item.id}.text` }, text: 'Sohbet ederek sayfa düzenleyin; her değişiklik geri alınabilir.', label: 'Kart açıklaması yazıldı' })
  }
  steps.push(say('Başlıklar için daha modern bir yazı tipine geçiyorum.\n'))
  steps.push({ kind: 'do', label: 'Yazı stili Modern yapıldı', target: hero ? { sectionId: hero.id, el: 'title' } : undefined, run: (api) => api.dispatch({ type: 'site', patch: presetPatch(FONT_PRESETS.find((p) => p.id === 'modern')!) }) })
  steps.push(say('Sayfanın sonuna bir iletişim formu ekliyorum.\n'))
  steps.push(...insertSteps(doc, 'form', 'Projenizi konuşalım.').steps)
  steps.push(say('Son olarak telefonda nasıl göründüğüne bakalım.\n'))
  steps.push({ kind: 'device', device: 'mobile', label: 'Mobil görünüm kontrol edildi' })
  steps.push({ kind: 'wait', ms: 1800 })
  steps.push({ kind: 'device', device: 'desktop', label: 'Masaüstüne dönüldü' })
  steps.push(say('\nDemo tamam! Başlığı, rengi ve yazı tipini değiştirdim, yeni bir özellik kartı ve iletişim formu ekledim. Hepsini tek tıkla geri almak için bu mesajdaki “Geri al”a basabilirsin.'))
  return { steps, suggestions: ['Rengi mor yap', 'SSS bölümü ekle', 'Koyu tema', 'Köşeleri yuvarlak yap'] }
}

/* ---------- "X sitesi yap": topic site with downloaded photos ---------- */
interface SiteCopy { re: RegExp; query: string; brand: string; title: string; accent: string; body: string; cta: string; mediaTitle: string; mediaBody: string; caption: string; color: string }
const SITES: SiteCopy[] = [
  { re: /veteriner|pet ?shop|hayvan/, query: 'veterinarian dog', brand: 'Pati Veteriner', title: 'Dostlarınız', accent: 'emin ellerde.', body: 'Aşı, check-up, cerrahi ve 7/24 acil bakım. Deneyimli veteriner hekimlerimizle kedi ve köpeklerinize sevgiyle bakıyoruz.', cta: 'Randevu al', mediaTitle: 'Modern klinik, şefkatli ekip', mediaBody: 'Dijital röntgen, laboratuvar ve ameliyathanemizle tanıdan tedaviye her şey tek çatı altında. Her muayenede dostunuzun sağlık geçmişini sizinle paylaşıyoruz.', caption: 'Kliniğimizde her hasta ailemizden biri.', color: '#0f9b6c' },
  { re: /kafe|cafe|kahve/, query: 'coffee shop', brand: 'Köşe Kahve', title: 'Güne iyi', accent: 'bir kahveyle başla.', body: 'Taze kavrulmuş çekirdekler, ev yapımı tatlılar ve sakin bir köşe. Mahallenin kahvecisi her sabah 07.30’da açık.', cta: 'Menüyü gör', mediaTitle: 'Her fincanda özen', mediaBody: 'Çekirdeklerimizi küçük üreticilerden seçiyor, her hafta kendimiz kavuruyoruz. Filtre, espresso ya da soğuk demleme; hepsi aynı özenle.', caption: 'Barista tezgâhımızdan bir sabah.', color: '#a16207' },
  { re: /diş|dental/, query: 'dentist clinic', brand: 'Gülüş Diş Kliniği', title: 'Sağlıklı gülüşler', accent: 'tek adreste.', body: 'İmplant, ortodonti, estetik diş hekimliği ve çocuk diş tedavisi. Ağrısız tedavi yöntemleriyle rahat bir muayene deneyimi.', cta: 'Randevu al', mediaTitle: 'Güler yüzlü uzman kadro', mediaBody: 'Dijital görüntüleme ve steril tedavi odalarımızla her adımı size açıklayarak ilerliyoruz. İlk muayenede kişisel tedavi planınızı birlikte çıkarıyoruz.', caption: 'Modern tedavi odalarımızdan biri.', color: '#0e7490' },
  { re: /restoran|lokanta|yemek/, query: 'restaurant food', brand: 'Sofra', title: 'Mevsimin lezzetleri', accent: 'sofranızda.', body: 'Yerel üreticilerden gelen taze malzemelerle hazırlanan mevsimlik menü. Öğle ve akşam yemeği için rezervasyon yapın.', cta: 'Rezervasyon yap', mediaTitle: 'Mutfağımızdan', mediaBody: 'Şefimiz her sabah pazardan seçtiği ürünlerle günün menüsünü belirliyor. Odun ateşinde pişen ekmeğimiz ve ev yapımı tatlılarımızla sizi bekliyoruz.', caption: 'Akşam servisinden bir kare.', color: '#c2410c' },
]

const siteTopic = (t: string) => t.match(/^(.+?)\s+(?:web\s+)?(?:sitesi|sayfası)\s+(?:yap|oluştur|kur|hazırla|tasarla)/)?.[1]?.trim()

function sitePlan(topic: string, doc: DocState): Plan {
  const word = topic.split(/\s+/).pop() ?? topic
  const cap = word.charAt(0).toLocaleUpperCase('tr') + word.slice(1)
  const c: SiteCopy = SITES.find((x) => x.re.test(topic)) ?? {
    re: /./, query: word, brand: cap, title: `${cap} için`, accent: 'yeni adresiniz.', body: `${cap} hakkında aradığınız her şey burada. Hizmetlerimizi inceleyin, sorularınız için bize hemen ulaşın.`, cta: 'İletişime geç',
    mediaTitle: 'Bizi tanıyın', mediaBody: `Yılların deneyimiyle ${word} alanında güvenilir ve özenli hizmet sunuyoruz.`, caption: `${cap} dünyasından bir kare.`, color: '#4058e3',
  }
  const job = startImageJob({ query: c.query, count: 4, orientation: 'landscape' })
  const img = (i: number) => {
    const imgs = jobResult(job).images
    return imgs.length ? imgs[i % imgs.length].url : IMAGES[i % IMAGES.length].url
  }
  const nav = doc.sections.find((s) => s.kind === 'nav')
  const hero = doc.sections.find((s) => s.kind === 'hero')
  const media = doc.sections.find((s) => s.kind === 'media')
  const big = doc.sections.find((s) => s.kind === 'image')
  const steps: Step[] = [
    say(`“${topic}” sitesi için internette açık lisanslı fotoğraflar arıyorum (“${c.query}”)…\n`),
    {
      kind: 'say',
      get text() {
        const r = job.value
        if (!job.done) return 'Görseller hâlâ iniyor; hazır görsellerle devam ediyorum.\n'
        if (!r.images.length) return `Görsel indiremedim${r.error ? ` (${r.error})` : ''}; hazır görsellerle devam ediyorum.\n`
        return `${r.images.length} görsel indirdim (${[...new Set(r.images.map((i) => i.license))].join(', ')}). Şimdi sayfayı ${topic} için düzenliyorum.\n`
      },
    },
    { kind: 'do', label: 'Ana renk değiştirildi', target: hero ? { sectionId: hero.id } : undefined, run: (api) => api.dispatch({ type: 'site', patch: { brand: c.color } }) },
  ]
  if (nav) steps.push(type(nav, 'brand', c.brand, 'Site adı yazıldı'))
  if (hero) {
    steps.push(type(hero, 'title', c.title, 'Karşılama başlığı yazıldı'), type(hero, 'accent', c.accent, 'Vurgulu satır yazıldı'), type(hero, 'body', c.body, 'Açıklama yazıldı'), type(hero, 'primary', c.cta, 'Ana buton yazıldı'))
    steps.push({ kind: 'do', label: 'Karşılama fotoğrafı yerleştirildi', target: { sectionId: hero.id, el: 'image' }, run: (api) => {
      api.dispatch({ type: 'content', id: hero.id, key: 'visual', value: 'image', label: 'Görsel değişti' })
      api.dispatch({ type: 'field', id: hero.id, el: 'image', value: img(0) })
    } })
  }
  if (media) {
    steps.push(say('Görsel ve yazı bölümünü de konuya göre yazıyorum.\n'), type(media, 'title', c.mediaTitle, 'Görsel ve yazı başlığı yazıldı'), type(media, 'body', c.mediaBody, 'Görsel ve yazı açıklaması yazıldı'))
    steps.push({ kind: 'do', label: 'Görsel ve yazı fotoğrafı yerleştirildi', target: { sectionId: media.id, el: 'image' }, run: (api) => api.dispatch({ type: 'field', id: media.id, el: 'image', value: img(1) }) })
  } else {
    const { steps: ins, section } = insertSteps(doc, 'media', c.mediaTitle)
    steps.push(say('Bir “Görsel ve yazı” bölümü ekliyorum.\n'), ...ins, { kind: 'do', label: 'Görsel ve yazı fotoğrafı yerleştirildi', target: { sectionId: section.id, el: 'image' }, run: (api) => api.dispatch({ type: 'field', id: section.id, el: 'image', value: img(1) }) })
  }
  if (big) {
    steps.push({ kind: 'do', label: 'Büyük görsel değiştirildi', target: { sectionId: big.id, el: 'image' }, run: (api) => api.dispatch({ type: 'field', id: big.id, el: 'image', value: img(2) }) })
    steps.push(type(big, 'caption', c.caption, 'Alt yazı yazıldı'))
  }
  steps.push({
    kind: 'say',
    get text() {
      const imgs = (job.done ? job.value.images : []).slice(0, big ? 3 : 2)
      return `\nHazır! Başlıkları, rengi ve fotoğrafları ${topic} sitesine göre güncelledim.${imgs.length ? ` Fotoğraflar Creative Commons lisanslı; künyeler public/ai-images/credits.json içinde (${[...new Set(imgs.map((i) => i.credit.split(' · ')[0]))].slice(0, 3).join(', ')}).` : ''} Beğenmezsen “Geri al”a bas.`
    },
  })
  return { steps: waitForJobs(steps, 1, [job]), suggestions: ['SSS bölümü ekle', 'Koyu tema', 'Mobilde göster', 'Köşeleri yuvarlak yap'] }
}

/* ---------- Attachments ---------- */
function attachmentPlan(text: string, doc: DocState, files: Attachment[]): Step[] {
  const steps: Step[] = []
  for (const f of files) {
    if (f.kind === 'image' && f.url) {
      const url = f.url
      const hero = doc.sections.find((s) => s.kind === 'hero')
      if (/arka ?plan/.test(text)) {
        const target = hero ?? doc.sections[1]
        if (!target) continue
        steps.push(say(`“${f.name}” görselini ${target.name} bölümünün arka planı yapıyorum.\n`))
        steps.push({ kind: 'do', label: 'Arka plan fotoğrafı ayarlandı', target: { sectionId: target.id }, run: (api) => api.dispatch({ type: 'bg', id: target.id, patch: { type: 'image', image: url, overlay: 55 } }) })
      } else if (hero && /karşılama|hero|sağ|üst/.test(text)) {
        steps.push(say(`“${f.name}” görselini karşılama bölümüne yerleştiriyorum.\n`))
        steps.push({ kind: 'do', label: 'Karşılama görseli değiştirildi', target: { sectionId: hero.id }, run: (api) => {
          api.dispatch({ type: 'content', id: hero.id, key: 'visual', value: 'image', label: 'Görsel değişti' })
          api.dispatch({ type: 'field', id: hero.id, el: 'image', value: url })
        } })
      } else {
        const media = doc.sections.find((s) => s.kind === 'media' || s.kind === 'image')
        if (media) {
          steps.push(say(`“${f.name}” görselini ${media.name} bölümüne koyuyorum.\n`))
          steps.push({ kind: 'do', label: `${media.name} görseli değiştirildi`, target: { sectionId: media.id, el: 'image' }, run: (api) => api.dispatch({ type: 'field', id: media.id, el: 'image', value: url }) })
        } else {
          const { steps: ins, section } = insertSteps(doc, 'media')
          section.content.image = url
          steps.push(say('Görseli göstermek için yeni bir “Görsel ve yazı” bölümü ekliyorum.\n'), ...ins)
        }
      }
    } else if ((f.kind === 'text' || f.kind === 'pdf') && f.text) {
      const lines = f.text
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
      const words = f.text.split(/\s+/).filter(Boolean).length
      steps.push(say(`“${f.name}” dosyasını okudum (${words} kelime${f.pages ? `, ${f.pages} sayfa` : ''}).\n`))
      if (/sss|soru/.test(text)) {
        const qs = lines.filter((l) => l.endsWith('?')).slice(0, 6)
        const faq = doc.sections.find((s) => s.kind === 'faq')
        if (faq && qs.length) {
          qs.forEach((q, i) => {
            const answer = lines[lines.indexOf(q) + 1] && !lines[lines.indexOf(q) + 1].endsWith('?') ? lines[lines.indexOf(q) + 1] : 'Cevabı yakında ekleyeceğiz.'
            const item = { id: uid('i'), title: '', text: '' }
            steps.push({ kind: 'do', label: `Soru ${i + 1} eklendi`, target: { sectionId: faq.id }, run: (api) => api.dispatch({ type: 'addItem', id: faq.id, item }) })
            steps.push({ kind: 'type', target: { sectionId: faq.id, el: `items.${item.id}.title` }, text: q, label: 'Soru yazıldı' })
            steps.push({ kind: 'type', target: { sectionId: faq.id, el: `items.${item.id}.text` }, text: answer.slice(0, 220), label: 'Cevap yazıldı' })
          })
          continue
        }
      }
      const title = (lines[0] ?? f.name).slice(0, 80)
      const body = lines.slice(1).join(' ').slice(0, 420) || 'Belgeden aktarılan içerik.'
      const { steps: ins, section } = insertSteps(doc, 'text', title)
      section.content.body = ''
      steps.push(say('İçeriği yeni bir yazı bloğu olarak sayfaya aktarıyorum.\n'), ...ins, { kind: 'type', target: { sectionId: section.id, el: 'body' }, text: body, label: 'Belge metni aktarıldı' })
    } else if (f.kind === 'pdf') {
      steps.push(say(`“${f.name}” içinden okunabilir metin çıkaramadım (taranmış ya da şifreli olabilir). Metni .txt olarak eklersen hemen aktarırım.\n`))
    } else if (f.kind === 'file') {
      steps.push(say(`“${f.name}” dosya türünü henüz işleyemiyorum; görsel, .txt, .md, .csv ya da .pdf gönderebilirsin.\n`))
    }
  }
  return steps
}

/* ---------- Main planner ---------- */
export function plan(input: string, doc: DocState, ctx: { selection: Target | null; attachments: Attachment[]; clone?: CloneResult | { error: string } }): Plan {
  const t = input.toLocaleLowerCase('tr').trim()
  if (ctx.clone) {
    if ('error' in ctx.clone) return { steps: [say(`Siteyi klonlayamadım: ${ctx.clone.error}`)], suggestions: ['Adresi kontrol edip tekrar dene'] }
    return { steps: cloneSteps(ctx.clone, doc, { replace: true, say: true }).steps, suggestions: ['Mobilde nasıl görünüyor?', 'Ana rengi değiştir', 'Geri al'] }
  }
  if (/\bdemo\b/.test(t)) return demoPlan(doc)
  const topic = siteTopic(t)
  if (topic && !ctx.attachments.length) return sitePlan(topic, doc)

  const steps: Step[] = []
  const q = quoted(input)
  const hero = doc.sections.find((s) => s.kind === 'hero')
  const sel = ctx.selection ? doc.sections.find((s) => s.id === ctx.selection!.sectionId) : undefined

  if (ctx.attachments.length) steps.push(...attachmentPlan(t, doc, ctx.attachments))

  // Selected element as context: "bunu kısalt", "şöyle yaz: '…'"
  if (sel && ctx.selection?.el) {
    const el = ctx.selection.el
    const current = toPlain(getValue(sel, el))
    const isText = current && !/^https?:|^blob:/.test(current)
    if (isText && q && !/ekle|başlık/.test(t)) {
      steps.push(say('Seçtiğin öğeyi yazdığın metinle güncelliyorum.\n'), type(sel, el, q, 'Seçili öğe güncellendi'))
    } else if (isText && /kısalt|kısa/.test(t)) {
      const short = current.split(/[,.:;!?—–]/)[0].split(/\s+/).slice(0, 7).join(' ')
      steps.push(say('Seçili metni kısaltıyorum.\n'), type(sel, el, short, 'Metin kısaltıldı'))
    } else if (isText && /uzat|detay|genişlet/.test(t)) {
      steps.push(say('Seçili metne biraz daha ayrıntı ekliyorum.\n'), type(sel, el, `${current.replace(/[.!]$/, '')}. Üstelik kurulum yalnızca birkaç dakika sürüyor.`, 'Metin genişletildi'))
    } else if (isText && /büyük harf/.test(t)) {
      steps.push(type(sel, el, current.toLocaleUpperCase('tr'), 'Büyük harfe çevrildi'))
    }
  }

  if (/geri al/.test(t)) steps.push({ kind: 'do', label: 'Son değişiklik geri alındı', run: (api) => api.dispatch({ type: 'undo' }) })

  const device: Device | null = /mobil|telefon/.test(t) ? 'mobile' : /tablet/.test(t) ? 'tablet' : /masaüstü|bilgisayar/.test(t) ? 'desktop' : null
  if (device && !/ekle/.test(t)) steps.push({ kind: 'device', device, label: `${device === 'mobile' ? 'Mobil' : device === 'tablet' ? 'Tablet' : 'Masaüstü'} görünüme geçildi` })

  const color = COLORS.find(([re]) => re.test(t))
  if (color && !/arka ?plan fotoğraf/.test(t)) {
    steps.push(say(`Ana rengi ${color[2]} yapıyorum; butonlar ve marka renkli bölümler birlikte değişecek.\n`))
    steps.push({ kind: 'do', label: `Ana renk ${color[2]} yapıldı`, target: hero ? { sectionId: hero.id } : undefined, run: (api) => api.dispatch({ type: 'site', patch: { brand: color[1] } }) })
  }

  const font: FontPairId | null = /zarif|serif|klasik/.test(t) ? 'elegant' : /modern/.test(t) ? 'modern' : /sade|minimal/.test(t) && /yazı|font/.test(t) ? 'plain' : null
  if (font) steps.push({ kind: 'do', label: `Yazı stili ${FONT_PAIRS[font].name} yapıldı`, target: hero ? { sectionId: hero.id, el: 'title' } : undefined, run: (api) => api.dispatch({ type: 'site', patch: presetPatch(FONT_PRESETS.find((p) => p.id === font)!) }) })

  const corner: CornerId | null = /yuvarlak/.test(t) ? 'round' : /keskin|köşeli/.test(t) ? 'sharp' : /yumuşak/.test(t) ? 'soft' : null
  if (corner) steps.push({ kind: 'do', label: `Köşeler ${corner === 'round' ? 'yuvarlak' : corner === 'sharp' ? 'keskin' : 'yumuşak'} yapıldı`, run: (api) => api.dispatch({ type: 'site', patch: { corners: corner } }) })

  if (/koyu tema|karanlık|dark/.test(t)) {
    const light = doc.sections.filter((s) => (s.style.palette === 'light' || s.style.palette === 'soft' || s.style.palette === 'sand') && !s.hidden)
    steps.push(say('Açık renkli bölümleri koyu temaya çeviriyorum.\n'))
    light.forEach((s) => steps.push({ kind: 'do', label: `${s.name} koyulaştırıldı`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'style', id: s.id, patch: { palette: 'dark', bg: undefined }, label: 'Koyu tema' }) }))
  } else if (/açık tema|aydınlık|light/.test(t)) {
    const dark = doc.sections.filter((s) => s.style.palette === 'dark' && s.kind !== 'nav' && s.kind !== 'footer')
    steps.push(say('Koyu bölümleri açık temaya çeviriyorum.\n'))
    dark.forEach((s) => steps.push({ kind: 'do', label: `${s.name} açıldı`, target: { sectionId: s.id }, run: (api) => api.dispatch({ type: 'style', id: s.id, patch: { palette: 'light', bg: undefined }, label: 'Açık tema' }) }))
  }

  const kind = kindIn(t)
  if (kind && /ekle|oluştur|koy|yeni/.test(t) && kind !== 'nav' && kind !== 'footer') {
    steps.push(say(`Sayfanın sonuna bir ${KINDS[kind].name.toLocaleLowerCase('tr')} bölümü ekliyorum.\n`), ...insertSteps(doc, kind, q).steps)
  } else if (kind && /sil|kaldır/.test(t)) {
    const target = doc.sections.find((s) => s.kind === kind && !KINDS[s.kind].pinned)
    if (target) steps.push({ kind: 'do', label: `${target.name} silindi`, target: { sectionId: target.id }, run: (api) => api.dispatch({ type: 'remove', id: target.id }) })
    else steps.push(say(`Silebileceğim bir ${KINDS[kind].name.toLocaleLowerCase('tr')} bölümü bulamadım.\n`))
  } else if (kind && /gizle/.test(t)) {
    const target = doc.sections.find((s) => s.kind === kind && !s.hidden)
    if (target) steps.push({ kind: 'do', label: `${target.name} gizlendi`, target: { sectionId: target.id }, run: (api) => api.dispatch({ type: 'toggleHidden', id: target.id }) })
  } else if (kind && /göster/.test(t)) {
    const target = doc.sections.find((s) => s.kind === kind && s.hidden)
    if (target) steps.push({ kind: 'do', label: `${target.name} gösterildi`, target: { sectionId: target.id }, run: (api) => api.dispatch({ type: 'toggleHidden', id: target.id }) })
  }

  if (hero && /başlık/.test(t) && !(kind && /ekle/.test(t))) {
    if (q) steps.push(say('Karşılama başlığını güncelliyorum.\n'), type(hero, 'title', q, 'Karşılama başlığı yazıldı'))
    else if (/kısa|kısalt|net/.test(t)) steps.push(say('Başlığı daha kısa ve net yapıyorum.\n'), type(hero, 'title', 'Daha hızlı.', 'Başlık kısaltıldı'), type(hero, 'accent', 'Daha basit.', 'Vurgulu satır kısaltıldı'))
  }
  if (hero && /buton/.test(t) && q && !sel) steps.push(type(hero, 'primary', q, 'Ana buton yazısı değişti'))

  if (steps.filter(isAction).length === 0 && !steps.some((s) => s.kind === 'say')) {
    const guide = guideAnswer(input)
    if (guide) return { steps: [say(guide)], suggestions: ['Kısayollar neler?', 'Bölüm nasıl eklerim?', 'Studio modunda neler var?'] }
    return {
      steps: [
        say(
          'Bunu henüz anlayamadım ama şunları yapabilirim:\n• Renk değiştirmek: “rengi mor yap”\n• Bölüm eklemek: “SSS bölümü ekle”, “iletişim formu ekle”\n• Başlık yazmak: başlık “Yeni başlığım”\n• Tema: “koyu tema”, “köşeleri yuvarlak yap”\n• Sayfada bir öğe seçip: “bunu kısalt”\n• Görsel, .txt veya .pdf ekleyip içerik aktarmak\n\nYa da tüm yetenekleri görmek için “demo” yaz.',
        ),
      ],
      suggestions: ['demo', 'Rengi turuncu yap', 'SSS bölümü ekle', 'Koyu tema'],
    }
  }
  if (steps.some(isAction)) steps.push(say('\nTamamdır! Değişiklikleri yaptım; beğenmezsen “Geri al”a bas.'))
  return { steps, suggestions: ['Köşeleri yuvarlak yap', 'Yazı stilini zarif yap', 'Mobilde göster', 'demo'] }
}

/* ---------- Files ---------- */
async function inflate(bytes: Uint8Array) {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new TextDecoder('latin1').decode(await new Response(stream).arrayBuffer())
}

function pdfStrings(content: string) {
  const out: string[] = []
  const unescape = (s: string) => s.replace(/\\([nrt()\\])/g, (_, c) => ({ n: '\n', r: '', t: ' ', '(': '(', ')': ')', '\\': '\\' })[c as 'n'] ?? c)
  for (const m of content.matchAll(/\[(.*?)\]\s*TJ|\(((?:\\.|[^\\)])*)\)\s*(?:Tj|')/gs)) {
    if (m[1]) out.push([...m[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((x) => unescape(x[1])).join(''))
    else if (m[2]) out.push(unescape(m[2]))
  }
  return out
}

/** Best-effort text extraction from simple (Flate-compressed) PDFs. */
export async function extractPdf(buf: ArrayBuffer): Promise<{ text: string; pages: number }> {
  const bytes = new Uint8Array(buf)
  const raw = new TextDecoder('latin1').decode(bytes)
  const pages = (raw.match(/\/Type\s*\/Page(?!s)/g) ?? []).length
  const parts: string[] = []
  const re = /stream\r?\n/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length
    const end = raw.indexOf('endstream', start)
    if (end < 0) break
    let seg = bytes.slice(start, end)
    while (seg.length && (seg[seg.length - 1] === 10 || seg[seg.length - 1] === 13)) seg = seg.slice(0, -1)
    let content = ''
    try {
      content = await inflate(seg)
    } catch {
      content = new TextDecoder('latin1').decode(seg)
    }
    parts.push(...pdfStrings(content))
    re.lastIndex = end
  }
  return { text: parts.join('\n').replace(/[ \t]+/g, ' ').trim(), pages }
}

export async function readAttachment(file: File): Promise<Attachment> {
  const base = { id: uid('f'), name: file.name, size: file.size }
  if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file)
    // Providers cap image payloads around 5 MB; larger files stay usable on the page only.
    if (file.size > 4_500_000 || !/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) return { ...base, kind: 'image', url }
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = () => rej(r.error)
      r.readAsDataURL(file)
    }).catch(() => '')
    return { ...base, kind: 'image', url, data: dataUrl.split(',')[1], mediaType: file.type }
  }
  if (/\.(txt|md|csv|json)$/i.test(file.name) || file.type.startsWith('text/')) return { ...base, kind: 'text', text: (await file.text()).slice(0, 20000) }
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    try {
      const { text, pages } = await extractPdf(await file.arrayBuffer())
      return { ...base, kind: 'pdf', text: text.slice(0, 20000), pages }
    } catch {
      return { ...base, kind: 'pdf', error: 'okunamadı' }
    }
  }
  return { ...base, kind: 'file' }
}
