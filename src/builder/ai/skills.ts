import { CORNERS, DECORS, FONT_PAIRS, PALETTES } from '../data'
import { FONT_PRESETS, presetFonts } from '../fonts'
import type { CornerId, FontPairId, PaletteId } from '../types'
import { variantsOf, type StyleTag } from '../variants'
import { AUDIT_AREAS, auditDesign, contrast, type AuditFocus } from './audit'
import type { ToolCall, ToolCtx, ToolDef, ToolPlan } from './tools'

/* ---------- Industry recipes ---------- */
export interface Industry {
  id: string
  name: string
  match: RegExp
  brand: string
  fontPair: FontPairId
  corners: CornerId
  /** Design-library style tags that suit the industry. */
  styles: StyleTag[]
  /** Palettes for hero → … → cta (nav/footer usually dark). */
  rhythm: PaletteId[]
  tone: string
  sections: string
  images: string[]
  headlines: string[]
  ctas: string[]
  notes?: string
}

export const INDUSTRIES: Industry[] = [
  {
    id: 'veteriner',
    name: 'Veteriner / evcil hayvan',
    match: /veteriner|vet\b|hayvan|pet|kedi|köpek|pati|mama|pet ?shop/,
    brand: '#0f7a5c',
    fontPair: 'modern',
    corners: 'round',
    styles: ['Modern', 'Minimal'],
    rhythm: ['brand', 'light', 'soft', 'light', 'sand', 'light', 'brand'],
    tone: 'Sıcak, güven veren, sevecen; teknik terimleri sadeleştir. Hayvan sahibine “siz”, dostlarına isimle hitap eder gibi.',
    sections: 'hero(visual=image) → features(4-6 hizmet: muayene, aşı, cerrahi, diş, acil, pansiyon) → media(klinik/ekip) → steps(randevu süreci 3 adım) → quote(hayvan sahibi) → faq(aşı takvimi, acil, ücret) → form(randevu) → cta(acil hat)',
    images: ['veterinarian dog', 'cat vet clinic', 'happy puppy owner', 'veterinary clinic interior'],
    headlines: ['Patili dostunuz', 'emin ellerde.', 'Her muayenede', 'sevgiyle ilgileniyoruz.'],
    ctas: ['Randevu alın', 'Acil hattı arayın'],
    notes: 'Acil durum telefonu banner ya da cta’da görünür olsun.',
  },
  {
    id: 'kafe-restoran',
    name: 'Kafe / restoran',
    match: /kafe|cafe|kahve|restoran|restaurant|lokanta|bistro|fırın|pastane|bar\b|meyhane|yemek/,
    brand: '#9a3412',
    fontPair: 'elegant',
    corners: 'soft',
    styles: ['Editoryal', 'Minimal'],
    rhythm: ['dark', 'sand', 'light', 'sand', 'dark', 'light', 'brand'],
    tone: 'Davetkâr, duyusal (koku, tat, doku), kısa cümleler. Abartılı sıfatlardan kaçın; somut ürün adı ver.',
    sections: 'hero(visual=image, ya da arka plan görseli + overlay 50) → features(imza lezzetler 3-6) → image(mekân büyük görsel) → media(hikâye/şef) → quote → faq(rezervasyon, saatler, vegan) → form(rezervasyon) → cta',
    images: ['coffee shop interior', 'latte art barista', 'restaurant table dinner', 'fresh pastry bakery'],
    headlines: ['Sabahın en güzel', 'kokusu burada.', 'Mevsimin tadı,', 'her tabakta.'],
    ctas: ['Rezervasyon yapın', 'Menüyü görün'],
    notes: 'Adres/saat bilgisini banner ya da footer note’a yaz.',
  },
  {
    id: 'saglik-dis',
    name: 'Diş kliniği / sağlık',
    match: /diş|dental|klinik|doktor|hekim|sağlık|hastane|fizyoterapi|psikolog|diyetisyen|estetik/,
    brand: '#0e6ba8',
    fontPair: 'plain',
    corners: 'soft',
    styles: ['Kurumsal', 'Minimal'],
    rhythm: ['light', 'soft', 'light', 'brand', 'light', 'soft', 'brand'],
    tone: 'Sakin, uzman, güven verici; korku dili kullanma (“acısız”, “rahat”). Kanıt ve deneyim (yıl, hasta sayısı) ver.',
    sections: 'hero(visual=image, palette light ya da brand) → features(tedaviler 6) → steps(ilk muayene süreci) → media(uzman kadro) → quote(hasta) → faq(ücret, sigorta, ağrı) → form(randevu) → cta',
    images: ['dentist patient smile', 'modern dental clinic', 'doctor consultation', 'medical team portrait'],
    headlines: ['Gülüşünüz için', 'acısız, planlı tedavi.', 'Sağlığınız', 'uzman ellerde.'],
    ctas: ['Ücretsiz ön görüşme', 'Randevu alın'],
    notes: 'Tıbbi iddialarda abartma (“%100 garanti” yazma).',
  },
  {
    id: 'hukuk',
    name: 'Hukuk / danışmanlık',
    match: /hukuk|avukat|büro|danışman|mali müşavir|muhasebe|noter|sigorta|finans/,
    brand: '#1f2a44',
    fontPair: 'elegant',
    corners: 'sharp',
    styles: ['Kurumsal', 'Editoryal'],
    rhythm: ['dark', 'light', 'sand', 'light', 'dark', 'light', 'brand'],
    tone: 'Ciddi, net, saygılı; jargonu açıkla. Güven: deneyim yılı, uzmanlık alanları, gizlilik.',
    sections: 'hero(visual=image ya da none, palette dark) → features(uzmanlık alanları 6) → media(kurucu ortak) → steps(süreç) → quote → faq → form(ön görüşme) → cta',
    images: ['law office books', 'lawyer meeting client', 'business handshake', 'courthouse columns'],
    headlines: ['Haklarınızı', 'bilerek savunuyoruz.', 'Karmaşık süreçler,', 'net yol haritası.'],
    ctas: ['Ön görüşme talep edin', 'Uzmanlık alanları'],
    notes: 'Ana renk koyu lacivert olduğu için dark palet yerine light/sand ağırlıklı ritim kullan; koyu bölümde buton zeminle karışmasın (audit uyarır).',
  },
  {
    id: 'saas',
    name: 'SaaS / teknoloji',
    match: /saas|yazılım|uygulama|app\b|platform|startup|girişim|api|yapay zeka|teknoloji|bulut|dijital ürün/,
    brand: '#4f46e5',
    fontPair: 'modern',
    corners: 'soft',
    styles: ['SaaS', 'Modern', 'Gradient'],
    rhythm: ['brand', 'light', 'soft', 'dark', 'light', 'soft', 'brand'],
    tone: 'Net, fayda odaklı, ölçülebilir (“%40 daha hızlı”). Özellik değil sonuç anlat.',
    sections: 'hero(visual=terminal/html ya da image; items ile 3-4 öne çıkan) → banner(yenilik) → features(6, ikonlu) → media(ürün ekranı) → steps(3 adım kurulum) → quote → faq(fiyat, güvenlik, entegrasyon) → cta',
    images: ['team working laptop', 'software dashboard screen', 'developer coding', 'startup office'],
    headlines: ['Raporlar kendini', 'yazsın.', 'Ekibiniz için', 'tek çalışma alanı.'],
    ctas: ['Ücretsiz deneyin', 'Demo isteyin'],
  },
  {
    id: 'eticaret-butik',
    name: 'E-ticaret / butik',
    match: /e-?ticaret|butik|mağaza|shop|giyim|moda|takı|aksesuar|kozmetik|el yapımı|ürün sat/,
    brand: '#be185d',
    fontPair: 'elegant',
    corners: 'round',
    styles: ['E-ticaret', 'Editoryal'],
    rhythm: ['sand', 'light', 'soft', 'light', 'brand', 'light', 'sand'],
    tone: 'Şık, kısa, arzu uyandıran; malzeme ve zanaat detayı. Kargo/iade güvencesi net.',
    sections: 'banner(ücretsiz kargo) → hero(visual=image) → features(neden biz: kargo, iade, el yapımı) → image(koleksiyon) → media(hikâye) → quote → faq(kargo, iade, beden) → cta(alışverişe başla)',
    images: ['boutique clothing rack', 'handmade jewelry', 'fashion model studio', 'product flat lay'],
    headlines: ['Yeni sezon,', 'zamansız parçalar.', 'Elde üretildi,', 'size özel.'],
    ctas: ['Koleksiyonu keşfedin', 'Hemen alışveriş yap'],
  },
  {
    id: 'fitness',
    name: 'Fitness / spor / yoga',
    match: /fitness|spor|gym|salon|antrenör|pilates|yoga|crossfit|koşu|beslenme koç/,
    brand: '#c2410c',
    fontPair: 'plain',
    corners: 'sharp',
    styles: ['Cesur', 'Koyu'],
    rhythm: ['dark', 'light', 'dark', 'soft', 'brand', 'light', 'dark'],
    tone: 'Enerjik, motive edici, emir kipi (“Başla”, “Katıl”); kısa vurucu cümleler.',
    sections: 'hero(arka plan görseli + overlay 55, palette dark) → features(programlar) → steps(başlangıç) → media(antrenör) → quote(dönüşüm hikâyesi) → faq(üyelik, deneme dersi) → cta(ücretsiz deneme)',
    images: ['gym workout training', 'yoga class studio', 'personal trainer', 'running athlete'],
    headlines: ['Bugün başla,', 'farkı 4 haftada gör.', 'Güçlü hisset,', 'her gün.'],
    ctas: ['Ücretsiz deneme dersi', 'Programı seç'],
    notes: 'Yoga/pilates için fontPair elegant, corners round ve sakin ton (sand/soft) tercih et.',
  },
  {
    id: 'egitim',
    name: 'Eğitim / kurs',
    match: /eğitim|kurs|okul|akademi|dershane|öğretmen|ders|online kurs|anaokul|dil okulu|atölye/,
    brand: '#2563eb',
    fontPair: 'modern',
    corners: 'round',
    styles: ['Modern', 'SaaS'],
    rhythm: ['brand', 'light', 'soft', 'light', 'sand', 'light', 'brand'],
    tone: 'Cesaretlendirici, açık, sonuç odaklı (“3 ayda konuşun”); veliye/öğrenciye net bilgi.',
    sections: 'hero(visual=image) → features(programlar/kazanımlar) → steps(kayıt süreci) → media(eğitmenler) → quote(öğrenci) → faq(ücret, sertifika, süre) → form(ön kayıt) → cta',
    images: ['students classroom learning', 'online course laptop', 'teacher whiteboard', 'kids learning'],
    headlines: ['Öğrenmek', 'hiç bu kadar keyifli olmadı.', '3 ayda', 'akıcı konuşun.'],
    ctas: ['Ücretsiz deneme dersi', 'Ön kayıt olun'],
  },
  {
    id: 'emlak',
    name: 'Emlak / inşaat / mimarlık',
    match: /emlak|gayrimenkul|konut|inşaat|mimar|iç mimar|proje|villa|daire|ofis kirala/,
    brand: '#0f766e',
    fontPair: 'elegant',
    corners: 'sharp',
    styles: ['Kurumsal', 'Glass'],
    rhythm: ['dark', 'light', 'sand', 'light', 'dark', 'soft', 'brand'],
    tone: 'Prestijli, sakin, somut (m², konum, teslim tarihi).',
    sections: 'hero(arka plan görseli + overlay 45, palette dark) → features(öne çıkanlar: konum, sosyal alan) → image(proje) → media(mimari yaklaşım, imageSide alterne) → media → quote → faq → form(bilgi talebi) → cta',
    images: ['modern house exterior', 'apartment interior living room', 'architecture building facade', 'city skyline residential'],
    headlines: ['Şehrin kalbinde,', 'doğayla iç içe.', 'Yaşam alanınızı', 'yeniden tanımlayın.'],
    ctas: ['Bilgi talep edin', 'Projeyi inceleyin'],
  },
  {
    id: 'ajans-portfolyo',
    name: 'Ajans / portfolyo / freelancer',
    match: /ajans|agency|portfolyo|portfolio|tasarımcı|fotoğrafçı|freelance|stüdyo|reklam|kreatif/,
    brand: '#111827',
    fontPair: 'modern',
    corners: 'sharp',
    styles: ['Ajans', 'Portfolyo', 'Cesur'],
    rhythm: ['light', 'dark', 'light', 'soft', 'light', 'dark', 'brand'],
    tone: 'Özgüvenli, kısa, kişilikli; iddiayı işle kanıtla (müşteri adı, sonuç).',
    sections: 'hero(visual=none ya da image, büyük tipografi, align left) → image(öne çıkan iş) → features(hizmetler 3-6) → media(vaka çalışması) → media(imageSide left) → quote(müşteri) → form(proje teklifi) → cta',
    images: ['creative studio workspace', 'designer portfolio desk', 'photographer camera', 'team brainstorming'],
    headlines: ['Markalar için', 'akılda kalan işler.', 'Fikirden', 'lansmana.'],
    ctas: ['Proje başlatalım', 'İşlerimizi görün'],
    notes: 'Siyaha yakın brand ile dark palet aynı görünür; ikinci renk vurgusu gerekiyorsa brand’i canlı bir renk (ör. #e11d48) yap.',
  },
]

/** Library designs whose style tags best match `styles`, per kind ("hero: a, b; nav: …"). */
function designPicks(styles: StyleTag[], per = 2) {
  return (['nav', 'hero', 'footer', 'features', 'cta'] as const)
    .map((kind) => {
      const ranked = variantsOf(kind)
        .filter((v) => v.id !== 'default')
        .map((v) => ({ v, score: styles.reduce((n, t, i) => n + (v.tags.includes(t) ? styles.length - i : 0), 0) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, per)
      return ranked.length ? `${kind}: ${ranked.map((x) => x.v.id).join(', ')}` : ''
    })
    .filter(Boolean)
    .join('; ')
}

const recipe = (x: Industry) => {
  const picks = designPicks(x.styles)
  return `### ${x.name} (${x.id})
- set_site: brand ${x.brand} (beyazla kontrast ${contrast('#ffffff', x.brand)}:1), fontPair ${x.fontPair}, corners ${x.corners}
- Tasarım stili: ${x.styles.join(', ')}${picks ? ` — uygun hazır tasarımlar (set_section_variant): ${picks}` : ''}
- Palet ritmi (hero→cta): ${x.rhythm.join(' → ')}; nav ve footer dark kalabilir.
- Ton: ${x.tone}
- Bölümler: ${x.sections}
- Görsel sorguları (varsa find_images ile, İngilizce): ${x.images.map((q) => `"${q}"`).join(', ')}
- Başlık örneği (title / accent): “${x.headlines[0]}” / “${x.headlines[1]}”; “${x.headlines[2]}” / “${x.headlines[3]}”
- CTA: ${x.ctas.map((c) => `“${c}”`).join(', ')}${x.notes ? `\n- Not: ${x.notes}` : ''}`
}

/* ---------- Skills ---------- */
export interface Skill {
  id: string
  name: string
  when: string
  body: string | ((arg?: string) => string)
}

export const SKILLS: Skill[] = [
  {
    id: 'landing-structure',
    name: 'Açılış sayfası kurgusu',
    when: 'Sıfırdan sayfa/site kurarken, bölüm eklerken ya da sırayı düzenlerken',
    body: `Dönüşüm odaklı açılış sayfası sırası (nav ve footer sabit, aradakiler):
1. hero (Karşılama) — tek mesaj + tek ana eylem. eyebrow 2-4 kelime, title kısa, accent faydayı söyler, body 1-2 cümle, primary eylem, secondary keşif. items (öne çıkanlar) 3-4 kısa rozet ya da hiç.
2. banner (isteğe bağlı) — duyuru, kampanya, adres/saat; hero'nun hemen altında ya da üstünde, tek satır.
3. features — 3 ya da 6 kart (ızgara 3 sütun; 4 kart → cols 2 ya da 4). Her kart: 2-4 kelimelik başlık + 1 cümle fayda. Uygun ikon seç (box, database, puzzle, layout, timer, gauge, zap, shield).
4. media — hikâye/ekip/ürün; birden çok media varsa imageSide sırayla right/left.
5. steps — süreç 3 adım (en fazla 4): fiil ile başlayan adım adları (“Randevu alın”, “Muayene”, “Takip”).
6. quote — gerçekçi bir müşteri cümlesi + isim + unvan/şehir. Uydurma ünlü ismi kullanma.
7. faq — 4-6 soru; fiyat, süre, iptal/iade, güven sorularını kapsa.
8. form (iletişim/randevu) ya da cta — sayfa sonunda en az biri olmalı. İkisi birden varsa cta en sonda.
Kurallar: içerik bölümü sayısı 6-9 ideal. hero ve faq birer tane. Aynı türden iki bölüm yan yana gelmesin. text bölümünü yalnızca hukuki metin/uzun açıklama için kullan; layout'u hazır bölüm yetmediğinde.
Uygulama: mevcut bölümleri yeniden kullan (set_text/update_item) — silip yeniden eklemekten iyidir; eksik türleri add_section ile after_section_id vererek doğru yere ekle; gereksizleri section_action remove; sırayı move_up/move_down (times) ile düzelt.
Tasarım: görünümü baştan değiştirmek için bölümü silme; set_section_variant ile tasarım kütüphanesinden başka bir tasarım seç (içerik korunur). Üst menü, karşılama ve alt bilgiyi aynı stil ailesinden seç (ör. hepsi Kurumsal ya da hepsi Koyu); hero arka planı koyu/görselliyse şeffaf üst menü tasarımları iyi durur. Tasarım değiştirdikten sonra tasarıma özel ek alanları (duyuru, istatistik, bülten metni…) set_text ile işletmeye göre yaz.`,
  },
  {
    id: 'industry-presets',
    name: 'Sektör tarifleri',
    when: 'Belirli bir işletme/sektör için site kurarken ya da yeniden tasarlarken (load_skill industry ile)',
    body: (arg) => {
      const t = arg?.toLocaleLowerCase('tr').trim()
      const hit = t ? INDUSTRIES.find((x) => x.id === t || x.match.test(t)) : undefined
      const head = `Sektör tarifi; marka rengi, yazı stili, palet ritmi, ton, bölüm planı, görsel sorguları. Değerleri birebir kopyalamak zorunda değilsin; kullanıcı rengi/adı verdiyse onu kullan. Tarif yoksa en yakın sektörü uyarla.`
      if (hit) return `${head}\n\n${recipe(hit)}\n\nDiğer tarifler: ${INDUSTRIES.filter((x) => x !== hit).map((x) => x.id).join(', ')}`
      return `${head}${t ? `\n“${arg}” için birebir tarif yok; en yakınını uyarla.` : ''}\n\n${INDUSTRIES.map(recipe).join('\n\n')}`
    },
  },
  {
    id: 'color-system',
    name: 'Renk sistemi ve palet ritmi',
    when: 'Ana renk seçerken, bölüm paletlerini/arka planları değiştirirken, “daha şık/modern/canlı” isteklerinde',
    body: `Ana renk (set_site brand): butonlar, vurgular ve Marka paletli bölümler bu renge boyanır; Marka bölümünde yazı BEYAZ, açık bölümlerde buton yazısı BEYAZ olur. Bu yüzden ana renk beyazla en az 4.5:1 kontrast vermeli (orta-koyu tonlar: #0f7a5c, #4f46e5, #be185d, #0e6ba8). Sarı, açık yeşil, pastel, neon tonlar ana renk olamaz; onların koyulaştırılmış halini kullan. Çok koyu (siyaha yakın) ana renk Koyu (dark) bölümlerde butonu kaybeder.
Paletler (style_section palette): ${PALETTES.map((p) => `${p.id}=${p.name}`).join(', ')}. light #fff, soft #f1f2f4, sand #f3ece1 (sıcak), dark #131417, brand = ana renk.
Ritim kuralları:
- Komşu iki bölüm aynı zeminde olmasın (özellikle iki brand asla yan yana).
- Sayfada 1-2 brand (genelde hero ve cta), 0-2 dark (nav/footer hariç). Geri kalanı light/soft/sand dönüşümlü.
- hero: brand ya da dark (güçlü giriş) veya görselli sayfalarda light; cta: brand. quote için sand sıcaklık verir.
- Sıcak markalarda (kafe, butik) sand; kurumsal/teknolojide soft tercih et.
Override'lar: style_section bg (düz renk) ve titleColor'ı çok seyrek kullan; kullanırsan yazı kontrastını koru (başlık ≥3:1, metin ≥4.5:1). Gradyan için set_background type gradient, gradFrom/gradTo ana rengin iki tonu, gradAngle 135; gradyan zemini paletin yazı rengiyle uyumlu olsun (koyu gradyan → palette dark/brand).
Dekor rengi (decorColor) boş bırakılırsa paletten gelir; özel renk verirsen ana renkle aynı aileden seç.`,
  },
  {
    id: 'typography',
    name: 'Tipografi',
    when: 'Yazı stili, font seçimi/eşleşmesi, başlık/metin boyutu, kalınlık, harf aralığı ayarlarken',
    body: `Yazı stilleri (set_site fontPair): ${Object.entries(FONT_PAIRS).map(([k, v]) => `${k}=${v.name}`).join(', ')}.
- elegant (Instrument Serif, accent italik): kafe/restoran, butik, hukuk, emlak, düğün, kişisel marka — sakin ve prestijli.
- modern (Space Grotesk): SaaS, teknoloji, ajans, eğitim, veteriner — dinamik ve güncel.
- plain (Inter, kalın): sağlık, fitness, kurumsal, belgeler — nötr ve okunaklı.
Font kütüphanesi: önce hazır eşleşme dene (set_site fontPreset: ${FONT_PRESETS.map((p) => `${p.id}=${presetFonts(p).heading}/${presetFonts(p).body}`).join(', ')}). Özel seçimde set_site headingFont + bodyFont (+ headingWeight) ver; fontPair başlığın harf aralığı/satır yüksekliği karakterini belirler (serif başlık → elegant, sans → modern/plain).
Eşleştirme kuralları: en fazla 2 aile (başlık + gövde; vurgu için tek öğede üçüncü bir display/el yazısı olabilir). Kontrast kur: serif başlık + sans gövde (Playfair Display/Source Sans 3, Lora/Lato, Fraunces/Figtree, Cormorant Garamond/Montserrat) ya da tek süper aile (Plus Jakarta Sans, Nunito, Inter). Gövde her zaman okunaklı bir sans/serif olsun; display (Bebas Neue, Anton, Abril Fatface) ve el yazısı (Caveat, Dancing Script, Pacifico) yalnızca başlık/rozet için. Mono (JetBrains Mono, IBM Plex Mono) kod, rakam ya da teknik vurgu için.
Türkçe: site Türkçeyse yalnızca Türkçe destekli (latin-ext) fontları seç; ş ğ ı İ içermeyen fontta eksik harfler yedek fonttan görünür ve kötü durur. Tek öğe fontu için style_element font (aile adı ya da "@heading"/"@body"), transform (uppercase rozet/eyebrow için, harf aralığı 0.08-0.14em ile), italic.
Sektör ipuçları: lüks/butik/düğün Cormorant Garamond ya da Playfair Display; hukuk/finans Libre Baskerville ya da EB Garamond + Inter; SaaS/teknoloji Manrope, Space Grotesk, Sora; çocuk/eğitim/veteriner Nunito ya da Quicksand; spor/fitness Oswald ya da Bebas Neue başlık + Roboto gövde; kafe/el yapımı Fraunces ya da Lora + başlık vurgusunda Caveat.
Başlık boyutu (style_section titleSize, px): hero 64-96 (uzun başlıkta 64-72), bölüm başlıkları 40-56, cta 48-64, quote 32-40, text 36-44. Hiyerarşi: hero başlığı her zaman en büyük; bölüm başlıklarını 2-3 kademede tut (ör. 52 ve 44).
titleWeight: elegant 400 (serif ince güzeldir), modern 600, plain 700; 300'ün altına inme. letterSpacing: büyük başlıkta -0.02 ile -0.04 em; küçük başlıkta 0.
Gövde metni (bodySize) 16-18px; 15'in altına inme. Satır uzunluğu ~60-75 karakter: uzun paragrafı bölmek ya da align left kullanmak okunurluğu artırır.
Tek öğe ince ayarı için style_element (fontSize, lineHeight 1.1-1.2 başlık / 1.5-1.7 metin); genel değişikliği style_section ile yap.`,
  },
  {
    id: 'copywriting-tr',
    name: 'Türkçe metin yazımı',
    when: 'Başlık, açıklama, buton, SSS, yorum metni yazarken ya da “metinleri iyileştir” isteklerinde',
    body: `Hero formülü: title = konu/kim (2-4 kelime, virgülle biter), accent = ödül/fayda (2-5 kelime, nokta ile biter). Ör. “Patili dostunuz” / “emin ellerde.”; “Raporlar kendini” / “yazsın.” title ≤ 40 karakter, toplam ≤ 70.
Diğer başlık kalıpları: “<Sonuç>, <süre/koşul>.” (“Üç adımda yayında.”), “Neden <marka>?”, “<Kitle> için <fayda>.”; soru başlığını SSS dışında az kullan.
Açıklama: 1-2 cümle; ilk cümle ne yaptığını, ikinci cümle kanıtı/farkı söyler. Somut ol (sayı, süre, yer).
Butonlar: 2-4 kelime, fiille başla, sonuç söyle: “Randevu alın”, “Ücretsiz deneyin”, “Menüyü görün”, “Teklif isteyin”. “Tıklayın”, “Gönder”, “Daha fazla” gibi boş fiillerden kaçın (form gönder butonu: “Mesajı gönder”, “Randevu talep et”). primary eylem, secondary keşif.
Kartlar: başlık 2-4 kelime isim öbeği, metin tek cümle fayda. Adımlar: fiille başlayan kısa adlar.
SSS: gerçek itirazlar (fiyat, süre, iptal, güven, ulaşım). Cevap 1-3 cümle, doğrudan “Evet/Hayır” ya da rakamla başlasın.
Yorum: doğal konuşma dili, somut sonuç; isim + unvan/şehir. Uydurma istatistik ya da ünlü ismi yazma; bilinmeyen bilgiyi yer tutucu olarak bırakma, makul ve genel yaz.
Hitap: kurumsal/sağlık/hukuk “siz”; genç/yaratıcı markalarda “sen” — sayfa boyunca tutarlı. Klişelerden kaçın: “kaliteli hizmet”, “müşteri memnuniyeti odaklı”, “sektörün öncüsü”, “en iyi”, “profesyonel ekibimiz”. Büyük harfle bağırma, ünlem en fazla bir yerde. Türkçe karakterleri doğru kullan.`,
  },
  {
    id: 'layout-spacing',
    name: 'Düzen, boşluk ve hareket',
    when: 'Boşluk, hizalama, kart ızgarası, dekor ya da animasyon ayarlarken; “ferah/sıkışık/sade” isteklerinde',
    body: `Dikey boşluk (style_section padding) ölçeği: 64 (sıkı), 88, 112 (normal), 160 (çok ferah, hero/cta). Sayfada 2-3 değerle sınırlı kal; hero ve cta diğerlerinden biraz büyük olabilir.
Hizalama (align): hero, cta, quote ortada (center) ya da hero solda (left, görselliyse daima left); features/faq/form/media solda daha okunaklı. Bir sayfada karışık kullanabilirsin ama komşu bölümlerde zıplatma.
Kart ızgarası (set_grid, features/steps): cols 3 (6 kart) / 2 ya da 4 (4 kart), colsT 2, colsM 1. Öğe sayısı sütun sayısının katı olsun. Kart stili köşelerle uyumlu: corners sharp → radius 0-4, shadow none, border true; soft → radius 12, border true ya da shadow sm; round → radius 22, shadow md, border false. gapX/gapY 16-24, pad 24-32. showIcon özellik kartlarında açık.
Köşeler (set_site corners): ${Object.entries(CORNERS).map(([k, v]) => `${k}=${v.name}`).join(', ')}.
Dekorlar (set_background decor): ${DECORS.map((d) => `${d.id}=${d.name}`).join(', ')}. Sayfada en fazla 2 bölümde; decorOpacity 8-20 (en fazla 25), konum kenarda (decorX 75-90 ya da 5-15). globe/rings teknoloji, blob/waves yumuşak markalar, dots/grid minimal. decorAnim yalnızca tek bölümde float/pulse.
Animasyon (set_motion): hareket içeriği desteklemeli, gösteriş yapmamalı. Giriş için fade / fade-up (600-800 ms, smooth), sayfadaki bölümlerin yarısından azında (hero, features, cta gibi 2-4 bölüm); kart ızgaralarında stagger (60-120 ms) tek tek öğe animasyonundan iyidir. slide/flip/bounce nadiren, parallax en fazla bir bölümde (hero arka planı, hız 20-40), sticky yalnızca üst menüde; hover lift/glow kartlarda (hover_target items). Her bölüme animasyon koyma.
Kapsayıcı (set_container) ve layout yalnızca hazır bölüm ihtiyacı karşılamazsa: 50-50 görsel+metin, 33-66 vb.; stackMobile true.`,
  },
  {
    id: 'imagery',
    name: 'Görsel kullanımı',
    when: 'Fotoğraf eklerken/değiştirirken, arka plan görseli kullanırken, sektör sitesi kurarken',
    body: `Görsel yerleri:
- hero: set_text field visual value "image", sonra field image = URL. Terminal görseli yalnızca yazılım/teknik ürünlerde kalsın; diğer sektörlerde image ya da none.
- media: field image + imageSide (right/left); birden çok media'da sırayla değiştir.
- image (Büyük görsel): mekân, koleksiyon, ekip; caption kısa.
- Arka plan görseli: set_background type "image", image URL, overlay 40-60 (yazı okunsun); bölüm paleti dark ya da brand olmalı (açık paletlerde yazı koyu kalır, okunmaz). Arka plan görselini en fazla 1-2 bölümde kullan.
Kaynak: varsa find_images ile İngilizce 2-4 kelimelik sorgular ("veterinarian dog", "coffee shop interior"); tek konu için 1-3 çağrı, toplam 3-8 görsel. Yalnızca dönen url'leri kullan, url uydurma. Kullanıcı görsel eklediyse "attachment:<id>".
Seçim: yatay (landscape) görseller hero/media/image için; insan yüzü ve gerçek ortam güven verir; aynı görseli iki yerde kullanma; varsayılan şablon görsellerini (Unsplash ofis/dizüstü) konu dışıysa değiştir.
Erişilebilirlik ve lisans: görsel bilgisini metinde tekrar et (görsel tek başına bilgi taşımasın); CC BY görsellerde künye gerekir (public/ai-images/credits.json), kullanıcıya hatırlat.`,
  },
  {
    id: 'responsive-a11y',
    name: 'Mobil uyum ve erişilebilirlik',
    when: 'Mobil/tablet görünümü, okunabilirlik, kontrast, erişilebilirlik kontrolünde',
    body: `Kontrast: normal metin ≥ 4.5:1, büyük başlık ≥ 3:1. Ana renk beyaz yazıyla 4.5:1 sağlamalı (audit_design hesaplar ve koyulaştırılmış öneri verir). titleColor/bg/style_element color override'larında kontrastı koru.
Mobil: editor_ui action device value mobile ile kullanıcıya göster (yalnızca istenirse ya da sonuç göstermek için). Izgaralarda colsM 1 (en fazla 2), colsT 2. Butonlar 2-4 kelime (≤ 24 karakter) — uzun buton mobilde iki satıra düşer. Hero başlığı uzun ise titleSize 64-72.
hideOn: yalnızca masaüstüne özel süs/tekrar içerikte kullan; hero, cta, form ve nav'ı mobilde gizleme. Bir bölümü üç cihazda birden gizleme (onun yerine section_action hide).
Başlık hiyerarşisi: tek hero (h1); bölüm başlıkları hero'dan küçük. Anlamsız “Buraya tıklayın” bağlantıları yerine açıklayıcı metin. Görsel tek başına bilgi taşımasın; renk tek başına anlam taşımasın.
Hareket: animasyonları az tut (hareket hassasiyeti olan kullanıcılar için); dekor animasyonu tek bölümde.`,
  },
  {
    id: 'seo',
    name: 'Sayfa SEO ayarları',
    when: 'Site kurduktan sonra, sayfa başlığı/açıklama/adres ayarlarken',
    body: `page_settings:
- title ≤ 60 karakter (ideal 30-60): “<Site adı> — <ana fayda/hizmet + şehir>”. Ör. “Pati Veteriner — Kadıköy’de 7/24 Hayvan Kliniği”.
- description 120-160 karakter: ne, kime, nerede + bir eylem. Hero açıklamasını kopyalama, özetle.
- slug: küçük harf, rakam ve tire, Türkçe karakter yok (ör. “kadikoy-veteriner”); ana sayfa için boş bırakılabilir.
- indexable: yayındaki gerçek sayfa için true.
Sayfa içi: hero title + accent ana anahtar kelimeyi doğal biçimde içersin; bölüm başlıkları konuya özgü olsun; SSS gerçek arama sorularını yanıtlasın. Site adı nav ve footer'da aynı olsun.`,
  },
]

const SKILL_IDS = SKILLS.map((s) => s.id)

/** Short index for the system prompt; bodies load on demand via load_skill. */
export function skillIndex() {
  return `TASARIM SKİLLERİ (load_skill ile yüklenir; yalnızca ihtiyaç duyduğunu yükle)
${SKILLS.map((s) => `- ${s.id} · ${s.name}: ${s.when}`).join('\n')}
İş akışı: Tasarım, sıfırdan site/sayfa kurma, yeniden tasarım ya da “daha güzel yap” isteklerinde ÖNCE ilgili skill'leri tek load_skill çağrısıyla yükle (sektör sitesi için industry-presets'i industry ile; genelde landing-structure, copywriting-tr ve color-system de). Sonra talimatlara göre düzenle. Bitirince audit_design çağır; error ve önemli warning'leri tek bir düzeltme turunda gider (tekrar denetleme), sonra kısaca özetle. Küçük tekil düzenlemelerde (tek metin, tek renk) skill yükleme ve denetim gerekmez.`
}

/* ---------- Tools ---------- */
export const SKILL_TOOLS: ToolDef[] = [
  {
    name: 'load_skill',
    description: 'Tasarım skill’lerinin ayrıntılı talimatlarını yükler (bu editörün araçları ve değerleriyle). Tasarım/kurulum işine başlamadan önce ilgili skill’leri tek çağrıda yükle.',
    parameters: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string', enum: SKILL_IDS }, description: 'Yüklenecek skill id’leri (1-4)' },
        industry: { type: 'string', description: 'industry-presets için sektör, ör. "veteriner", "kafe", "diş kliniği" (isteğe bağlı)' },
      },
      required: ['ids'],
    },
  },
  {
    name: 'audit_design',
    description:
      'Sayfayı programatik olarak denetler: WCAG kontrast (ana renk, özel zemin/yazı renkleri), palet ritmi, eksik/tekrarlanan bölümler, metin uzunlukları ve şablon artıkları, tipografi hiyerarşisi, boşluk/ızgara, görseller, mobil, SEO. 0-100 puan ve önerilen düzeltme çağrılarıyla sorun listesi döndürür. Tasarım işinin sonunda çağır.',
    parameters: {
      type: 'object',
      properties: {
        focus: { type: 'string', enum: AUDIT_AREAS, description: 'Yalnızca bu alanı denetle (varsayılan all)' },
        section_id: { type: 'string', description: 'Yalnızca bu bölümün sorunları (+ site geneli) (isteğe bağlı)' },
      },
    },
  },
]

const NAMES = new Set(SKILL_TOOLS.map((t) => t.name))
export const isSkillTool = (name: string) => NAMES.has(name)

export function loadSkills(ids: string[], industry?: string) {
  const found = SKILLS.filter((s) => ids.includes(s.id))
  return found.map((s) => ({ id: s.id, name: s.name, body: typeof s.body === 'function' ? s.body(industry) : s.body }))
}

/** Handles skill tools; returns null for every other tool so planTool continues. */
export function planSkillTool(call: ToolCall, ctx: ToolCtx): ToolPlan | null {
  if (!isSkillTool(call.name)) return null
  const a = call.input ?? {}
  if (call.name === 'load_skill') {
    const raw = Array.isArray(a.ids) ? a.ids : typeof a.ids === 'string' ? [a.ids] : typeof a.id === 'string' ? [a.id] : []
    const ids = raw.filter((x): x is string => typeof x === 'string')
    const unknown = ids.filter((x) => !SKILL_IDS.includes(x))
    if (!ids.length || unknown.length === ids.length) return { error: `Geçerli skill id’leri: ${SKILL_IDS.join(', ')}` }
    const industry = typeof a.industry === 'string' ? a.industry : undefined
    return { steps: [], result: { skills: loadSkills(ids, industry), ...(unknown.length ? { unknown } : {}), next: 'Talimatları uygula; tasarım işi bitince audit_design çağır.' } }
  }
  const focus = typeof a.focus === 'string' && (AUDIT_AREAS as string[]).includes(a.focus) ? (a.focus as AuditFocus) : 'all'
  const sectionId = typeof a.section_id === 'string' ? a.section_id : undefined
  return { steps: [], result: auditDesign(ctx.doc, ctx.page, { focus, sectionId }) }
}

export function describeSkillCall(call: ToolCall): string | null {
  if (call.name === 'load_skill') {
    const ids = Array.isArray(call.input?.ids) ? (call.input.ids as string[]) : []
    return `${ids.map((id) => `“${SKILLS.find((s) => s.id === id)?.name ?? id}”`).join(', ') || 'Tasarım'} skill’i yüklendi`
  }
  if (call.name === 'audit_design') return 'Tasarım denetlendi'
  return null
}
