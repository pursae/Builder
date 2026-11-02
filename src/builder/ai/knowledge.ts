import { CELL_TYPES, CORNERS, DECORS, FEATURE_ICONS, FLEX_STRUCTURES, FONT_PAIRS, MAX_DEPTH, findSection, GRID_STRUCTURES, KINDS, PALETTES } from '../data'
import { SHORTCUTS } from '../Dialogs'
import { ICON_KEYS } from '../icons'
import { isRich, toPlain } from '../rich'
import { motionSummary } from '../motion'
import { FONT_PRESETS, GOOGLE_FONTS, fontDigest, presetFonts } from '../fonts'
import type { Device, DocState, Mode, PageSettings, Section, SectionKind, Selection } from '../types'
import { SKILLS, skillIndex } from './skills'
import { LIBRARY, variantCatalog, variantCount } from '../variants'

/* ---------- Editor guide ---------- */
export interface GuideTopic {
  id: string
  title: string
  keys: RegExp
  text: string
}

export const GUIDE: GuideTopic[] = [
  {
    id: 'modes',
    title: 'Düzenleme modları',
    keys: /mod(u|da|lar|a|lar[ıi])?\b|basit|studio|stüdyo|panel/,
    text: `Üst çubuğun ortasında üç mod var:
• Basit: yalnızca yazılar, fotoğraflar ve renkler. Sol panelde "Bölümler" ve "Tasarım" sekmeleri bulunur.
• Studio: tüm araçlar. Sol panelde Widget'lar, Bileşenler ve Globaller sekmeleri; bir bölüm seçince İçerik/Düzen, Stil ve Gelişmiş sekmeleri açılır. Tuvalin üstünde sürüklenebilir bir "Yapı" paneli (gezgin) vardır.
• AI: sohbet ederek düzenleme. Sol panelde hızlı komutlar, AI'ın yaptığı değişikliklerin listesi ve aylık kullanım görünür.
Sol paneli tuvalin solundaki küçük okla gizleyip açabilirsin.`,
  },
  {
    id: 'edit-text',
    title: 'Yazı ve görsel düzenleme',
    keys: /yazı|metin|başlı|düzenle|değiştir|fotoğraf|görsel|resim/,
    text: `Tuvalde bir öğeye tıklayınca seçilir; çift tıklayınca yazıyı doğrudan sayfada düzenlersin. Basit modda bölüme tıklayınca sol panelde o bölümün tüm alanları (başlık, açıklama, butonlar, fotoğraf) form olarak açılır. Fotoğraf alanlarında hazır görsellerden seçebilir ya da kendi bağlantını yapıştırabilirsin. Butonlar ve bağlantılar için adres alanı da vardır.`,
  },
  {
    id: 'add-section',
    title: 'Bölüm ekleme',
    keys: /ekle|yeni bölüm|bölüm ekle|şablon/,
    text: `Bölüm eklemenin yolları:
• Tuvalde bölümlerin arasına gelince çıkan "+ Bölüm ekle" düğmesi.
• Basit modda Bölümler sekmesindeki "Yeni bölüm ekle" ekranı: karşılama, özellik kartları, görsel ve yazı, adımlar, müşteri yorumu, SSS, duyuru şeridi, harekete çağrı, iletişim formu, büyük görsel. Tıkla ya da sayfaya sürükle.
• Studio'da Widget'lar sekmesi: Yapı (Div, Flexbox, Grid, Sekmeler, Liste, Akordiyon, Arka plan videosu, Döngü), Temel (Başlık, Görsel, Paragraf, SVG, Buton, YouTube, Ayırıcı, Video, HTML) ve Form grupları. "/" tuşu widget aramasını açar.
• ⌘K komut paletinde "Ekle" grubu.
Yeni bölüm seçili bölümün altına, seçim yoksa alt bilginin üstüne eklenir.`,
  },
  {
    id: 'reorder',
    title: 'Bölümleri taşıma, gizleme, silme',
    keys: /taşı|sırala|sürükle|yukarı|aşağı|gizle|sil|kaldır/,
    text: `Bölümü seçip ⌥↑ / ⌥↓ ile taşı, ⌫ ile sil. Sağ tık menüsünde Yukarı/Aşağı taşı, Çoğalt, Sil seçenekleri var. Basit modda bölüm listesinde sürükleyerek sıralayabilir, göz simgesiyle gizleyebilirsin. Studio'daki Yapı panelinde de sürükleyerek sıralama yapılır. Üst menü ve alt bilgi sabittir: taşınamaz ve silinemez.`,
  },
  {
    id: 'design',
    title: 'Site tasarımı: ana renk, yazı stili, köşeler',
    keys: /renk|tema|font|yazı tipi|yazı stili|köşe|tasarım|global/,
    text: `Basit modda Tasarım sekmesinde (Studio'da Globaller sekmesinde) tüm siteyi etkileyen üç ayar var:
• Ana renk: butonlar, vurgular ve "Marka" paletli bölümler bu renge boyanır.
• Yazı stili: hazır font eşleşmeleri (${FONT_PRESETS.map((p) => p.name).join(', ')}); başlık ve gövde fontu birlikte değişir.
• Köşeler: Keskin, Yumuşak, Yuvarlak (kartlar ve butonlar).
Studio › Globaller › Tipografi'de font kütüphanesinden (${GOOGLE_FONTS.length} Google font + sistem fontları) ayrı ayrı Başlık fontu ve Gövde fontu ile kalınlıkları seçilir; tüm bölümler devralır. Font seçicide arama, kategori (Sans, Serif, Display, El yazısı, Mono), "Türkçe ✓" süzgeci ve son kullanılanlar var; ⚠ işaretli fontlar ş ğ ı İ harflerini içermez.`,
  },
  {
    id: 'section-style',
    title: 'Bölüm görünümü',
    keys: /palet|arka plan rengi|koyu|açık|hizala|boşluk|padding|hareket|animasyon/,
    text: `Bir bölüm seçince:
• Basit modda: Görünüm (arka plan paleti: Marka, Koyu, Açık, Gri, Kum), hizalama (sola/ortaya), boşluk (az/normal/çok), Arka plan süsü, Kart düzeni ve Hareket (belir, kay, büyü) grupları.
• Studio'da Stil sekmesi: başlık ve metin tipografisi (boyut, kalınlık, harf aralığı, renk), Arka plan ve Düzen; Gelişmiş sekmesi: responsive görünürlük, hareket efektleri, özel CSS ve CSS ID.
Hareket efektleri önizlemede (P) ve yayındaki sitede oynar.`,
  },
  {
    id: 'motion',
    title: 'Animasyonlar ve hareket efektleri',
    keys: /animasyon|hareket|efekt|parallax|paralaks|kaydır|sticky|yapışkan|hover|sırayla|stagger|motion/,
    text: `Studio › bölüm seç › Gelişmiş › Hareket efektleri:
• Giriş animasyonu (bölüm ekrana girince): Yok, Belirme, Aşağıdan/Yukarıdan/Soldan/Sağdan belirme, Yakınlaşma, Uzaklaşma, Aşağıdan/Soldan/Sağdan kayma, Bulanıktan netleşme, Çevrilme, Zıplama. Süre, Gecikme, Yumuşatma ve Tekrar (bir kez / her görünüşte) ayarlanır. "Alt öğeleri sırayla canlandır" kartları ve blokları aralıklı (ms) oynatır.
• Kaydırma efektleri: Parallax (-100…100; arka plan görseli/gradyan/dekor ya da içerik katmanı), kaydırırken solma, kaydırırken küçülme, yapışkan (üstte sabit).
• Fareyle üzerine gelince: Yukarı kalk, Parıltı, Büyüt; bölüme ya da kartlara/hücrelere uygulanır.
• Tek bir öğe (başlık, metin, buton, görsel, ikon, kart başlığı) seçiliyken Gelişmiş sekmesinde o öğeye ayrı giriş animasyonu verilir.
• "Önizle" düğmesi animasyonu kanvasta tekrar oynatır. Düzenlerken içerik gizlenmez; efektler önizlemede (P) ve yayında oynar. Ziyaretçi "hareketi azalt" tercihindeyse yalnızca kısa bir belirme kalır.
Basit modda bölümün "Hareket" grubunda Yok / Belir / Kay / Büyü ve kart bölümlerinde "Kartları sırayla göster" vardır. AI aracı: set_motion.`,
  },
  {
    id: 'background',
    title: 'Arka plan, gradyan, fotoğraf ve dekor',
    keys: /arka ?plan|gradyan|gradient|dekor|süs|svg|overlay|karartma/,
    text: `Studio'da bölümün Stil › Arka plan türü: Renk, Gradyan (iki renk + açı) ya da Görsel (fotoğraf + karartma yüzdesi). "Dekor (SVG)" ile bölüme dünya, halkalar, dalgalar, ışık, noktalar, ızgara ya da kendi SVG'ni ekleyebilir; renk, opaklık, ölçek, konum, döndürme ve animasyon (döner, süzülür, nefes alır) ayarlayabilirsin. Özel SVG'de renk için currentColor kullan.`,
  },
  {
    id: 'layout',
    title: 'Flexbox / Grid kapsayıcılar',
    keys: /flex|grid|ızgara|kapsayıcı|sütun|kolon|hücre|düzen|div/,
    text: `Flexbox ya da Grid eklediğinde önce türü, sonra yapıyı seçersin (ör. 50-50, 33-66, 2x2); aynı ekranda "Kutulu" (1160 px) ya da "Tam genişlik" seçilir, yapıya tıklayınca eklenir. Her hücreye Başlık, Metin, Buton, Görsel ya da iç içe bir Kapsayıcı/Flexbox/Grid konur (en fazla ${MAX_DEPTH} seviye); iç kapsayıcı hücreyi doldurur ve aynı "Flexbox/Grid düzenle" paneliyle ayarlanır. Kanvasta tıklama en içteki kapsayıcıyı seçer; üst kapsayıcıya araç çubuğundaki ↰ düğmesi, panelin üstündeki konum yolu ya da Yapı panelindeki ağaçla geçilir. Studio'da kapsayıcı ayarları: kutulu/tam genişlik, genişlik, min. yükseklik, yön (satır/sütun), hizalama ve dağıtım, sarma, mobilde alt alta, boşluklar (gap), margin/padding, kenarlık, köşe yarıçapı, gölge, z-index. Hücre başına genişlik, iç boşluk, arka plan ve hizalama da ayarlanır. AI aracı: set_layout (hücre type "layout" + layout_type/layout_structure ile iç kapsayıcı; dönen section_id ile iç hücreleri doldur).`,
  },
  {
    id: 'element-style',
    title: 'Tek bir öğenin stilini ayarlama',
    keys: /öğe stil|font boyut|yazı boyut|kalınlık|margin|stil kopyala|stil yapıştır|font ailesi|italik|büyük harf/,
    text: `Studio'da tek bir başlığa, metne ya da butona tıklayınca o öğenin stilini (font ailesi — varsayılan site fontunu devralır —, yazı boyutu, fontta bulunan kalınlıklar, harf dönüşümü, italik, satır yüksekliği, harf aralığı, renk, arka plan, köşe, hizalama, margin/padding) ayrıca ayarlarsın. Stil › Boyut panelinde genişlik (Otomatik / Tam / Özel px·%·vw), maks. genişlik ve yükseklik (px·vh; metinlerde min. yükseklik), görsellerde Kapla/Sığdır seçilir. Tuvalde öğenin üstündeki ve altındaki tutamakları sürükleyerek boşluğu, sağ ve alt kenardaki mavi tutamaklarla genişlik/yüksekliği değiştirebilirsin (Shift ile 1px adım). Sağ tık › Stili kopyala / Stili yapıştır ile stili başka öğeye aktar, "Öğe ayarlarını sıfırla" ile geri dön.`,
  },
  {
    id: 'responsive',
    title: 'Cihaz görünümleri ve responsive',
    keys: /mobil|tablet|masaüstü|telefon|responsive|cihaz/,
    text: `Üst çubuktaki Masaüstü / Tablet / Mobil düğmeleriyle sayfayı farklı genişliklerde görürsün. Studio › Gelişmiş › Responsive görünürlük ile bir bölümü belirli cihazlarda gizleyebilirsin. Kart ızgaralarında masaüstü, tablet ve mobil için ayrı sütun sayısı seçilebilir.`,
  },
  {
    id: 'advanced',
    title: 'Özel CSS, CSS ID ve HTML',
    keys: /css|html|kod|script|embed|gömme|özel/,
    text: `Studio › Gelişmiş › Özel CSS alanında "selector" kelimesi o bölümü hedefler (ör. selector h2 { color: red }). Öznitelikler kısmında CSS ID verip bağlantılarda #id ile o bölüme kaydırabilirsin. "HTML / Kod" bölümü ya da karşılama bölümünün sağ tarafındaki HTML seçeneği; HTML, CSS ve JavaScript'i güvenli bir çerçevede çalıştırır.`,
  },
  {
    id: 'clipboard',
    title: 'Kopyala, yapıştır, çoğalt, bileşen kaydet',
    keys: /kopyala|yapıştır|çoğalt|kaydet|bileşen|şablon/,
    text: `Bölümü seçip ⌘C ile kopyala, ⌘V ile seçili bölümün altına yapıştır, ⌘D ile çoğalt. Sağ tık › "Bileşen olarak kaydet" ile bir bölümü tüm ayarlarıyla saklarsın; kaydedilenler Studio › Bileşenler sekmesinde, Basit moddaki "Yeni bölüm ekle" ekranında ve ⌘K paletinde "Kaydettiklerim" altında çıkar.`,
  },
  {
    id: 'history',
    title: 'Geri al, yinele, geçmiş',
    keys: /geri al|yinele|geçmiş|history|undo/,
    text: `⌘Z geri alır, ⇧⌘Z (ya da ⌘Y) yineler. Üst çubuktaki Geçmiş düğmesi son değişiklikleri listeler ve istediğin ana dönmeni sağlar. AI'ın yaptığı her işlem de bu geçmişe yazılır; AI mesajındaki "Geri al" o mesajın tüm değişikliklerini tek seferde geri alır.`,
  },
  {
    id: 'publish',
    title: 'Önizleme, kaydetme, yayınlama',
    keys: /önizle|yayınla|kaydet|preview|publish/,
    text: `Değişiklikler tarayıcıda otomatik kaydedilir (üst çubukta "Kaydedildi" görünür). P tuşu ya da göz simgesi önizlemeyi açar, Esc ile çıkarsın. Sağ üstteki Yayınla düğmesi sayfayı yayına alır; yayından sonra değişiklik yaparsan düğme yeniden etkinleşir. Komut paletindeki "Sayfayı ilk haline döndür" her şeyi sıfırlar (geri alınabilir).`,
  },
  {
    id: 'page-settings',
    title: 'Sayfa ayarları ve SEO',
    keys: /seo|google|sayfa ayar|slug|adres|açıklama|meta/,
    text: `Üst çubuktaki sayfa ayarları düğmesi (ya da ⌘K › "Sayfa ayarları ve SEO") sayfa başlığını (en fazla 60 karakter önerilir), adresini (slug), açıklamasını (160 karaktere kadar) ve arama motorlarında görünürlüğünü düzenler. Altta Google önizlemesi gösterilir.`,
  },
  {
    id: 'palette',
    title: 'Komut paleti',
    keys: /komut|her şeyi ara|⌘k|cmd ?k|ctrl ?k/,
    text: `⌘K (Windows'ta Ctrl+K) komut paletini açar: bölümlere git, bölüm ekle, kaydettiğin bileşenler, mod değiştir, önizle, cihaz görünümü, geri al/yinele, yayınla, sayfa ayarları, yapı paneli, kısayollar ve sayfayı sıfırlama.`,
  },
  {
    id: 'design-library',
    title: 'Tasarım kütüphanesi',
    keys: /tasarım kütüphane|hazır tasarım|hazır header|hazır footer|tasarımı değiştir|başka tasarım|farklı tasarım|şablon|varyant|kütüphane|tema/,
    get text() {
      return `Tasarım kütüphanesinde ${variantCount()} hazır tasarım var: ${LIBRARY.map((k) => `${KINDS[k.kind].name} (${k.variants.length})`).join(', ')}. Açmak için: bölüm ekle panelindeki "Tasarım kütüphanesi" düğmesi, Studio'da Bileşenler sekmesi ya da ⌘K → "Tasarım kütüphanesi". Solda önce Temalar (hazır tasarımların tümü, bölüme göre gruplu), sonra bölüm kategorileri; üstte stil etiketleri (Minimal, Kurumsal, Koyu, Glass…) ve arama var; masaüstü/mobil önizlemesi sitenin renk, yazı ve köşe ayarlarıyla canlı çizilir. Bir tasarıma tıklayınca bölüm eklenir. Var olan bir bölümün tasarımını değiştirmek için bölüme sağ tıkla → "Tasarımı değiştir", Basit modda bölüm düzenleyicideki "Tasarım" şeridini ya da Studio'da kapsayıcı panelindeki Tasarım satırını kullan. Metinler, butonlar, görseller ve kartlar korunur; tek adımda geri alınabilir.`
    },
  },
  {
    id: 'shortcuts',
    title: 'Klavye kısayolları',
    keys: /kısayol|klavye|tuş/,
    text: `${SHORTCUTS.map(([k, d]) => `• ${k}: ${d}`).join('\n')}\nWindows'ta ⌘ yerine Ctrl kullan.`,
  },
  {
    id: 'ai-images',
    title: 'AI ile internetten görsel bulma',
    keys: /görsel bul|görsel ara|fotoğraf bul|fotoğraf ara|resim bul|internetten|stok|lisans|künye|telif|sitesi yap/,
    text: `AI modunda "veteriner sitesi yap" gibi bir istek yazınca asistan konuya uygun fotoğrafları internette arar (Openverse, yedek olarak Wikimedia Commons; yalnızca ticari kullanıma açık Creative Commons lisanslı görseller), projeye indirir ve karşılama, görsel ve yazı, büyük görsel bölümlerinde ya da arka planlarda kullanır. İndirilen dosyalar public/ai-images klasörüne, fotoğrafçı ve lisans bilgileri public/ai-images/credits.json dosyasına yazılır; CC BY gibi lisanslarda sitede künye vermeyi unutma. Bu özellik yalnızca geliştirme sunucusunda çalışır; anahtar yoksa yerel demo motoru da aynı aramayı yapar.`,
  },
  {
    id: 'ai-skills',
    title: 'AI tasarım skill’leri ve denetim',
    keys: /skill|yetenek|tasarım kural|denetle|denetim|audit|kontrast|puan/,
    text: `AI asistanı tasarım işlerinde hazır tasarım skill’lerini (tarifleri) gerektiğinde yükler: ${SKILLS.map((s) => s.name).join(', ')}. Sektör tarifleri veteriner, kafe/restoran, diş kliniği, hukuk, SaaS, butik, fitness, eğitim, emlak ve ajans için renk, yazı stili, bölüm sırası, ton ve görsel aramalarını içerir. İş bitince sayfayı otomatik denetler: renk kontrastı (WCAG), palet ritmi, eksik bölümler, uzun ya da şablonda kalmış metinler, tipografi, boşluklar, görseller, mobil ve SEO; 0-100 puan verir ve önemli sorunları düzeltir. Bir model anahtarı bağlıyken AI modunda “tasarımımı denetle” yazarak denetimi istediğin zaman çalıştırabilirsin.`,
  },
  {
    id: 'ai',
    title: 'AI asistanı',
    keys: /\bai\b|yapay zek|asistan|anahtar|\bapi\b|model|sağlayıcı|token|maliyet|bütçe/,
    text: `AI modunda ne istediğini yaz; görsel, .txt, .md, .csv ya da .pdf ekleyebilirsin. Sayfada bir öğe seçiliyse istek o öğeye uygulanır. AI ayarları (sohbetteki model adına ya da dişli simgesine tıkla): Sağlayıcılar sekmesinde Anthropic, OpenAI, Google Gemini, Mistral ya da yerel Ollama için anahtar girip varsayılan modeli seçersin; Kullanım sekmesi token ve maliyeti, aylık bütçeyi gösterir; Davranış sekmesinde onay beklemeden uygulama, mor imleç, yazma hızı ve marka sesi ayarlanır. Anahtar yoksa yerel demo motoru çalışır.`,
  },
]

/* ---------- Section catalogue (generated from KINDS) ---------- */
function kindCatalog() {
  return (Object.keys(KINDS) as SectionKind[])
    .map((k) => {
      const d = KINDS[k]
      const fields = d.fields.map((f) => `${f.key} (${f.label}, ${f.el}${f.multiline ? ', çok satır' : ''})`).join('; ')
      const items = d.items ? ` | öğeler: ${d.items.label}, en fazla ${d.items.max}; items.<id>.title = ${d.items.titleLabel}${d.items.textLabel ? `, items.<id>.text = ${d.items.textLabel}` : ''}` : ''
      const opts = d.options?.map((o) => ` | seçenek ${o.key} (${o.label}): ${o.choices.map((c) => `"${c.value}"=${c.label}`).join(', ')}`).join('') ?? ''
      return `- ${k} · ${d.name}${d.pinned ? ' (sabit: taşınamaz/silinemez/eklenemez)' : ''}: ${d.blurb}. Alanlar: ${fields || 'yok (hücreler)'}${items}${opts}`
    })
    .join('\n')
}

export function systemPrompt(voice: string) {
  return `Sen "Pursae AI"sın: Pursae sayfa oluşturucusunun (Golementor) içindeki asistan. İki görevin var:
1) EDİTÖR: Kullanıcı sayfada bir değişiklik isterse araçları (tools) kullanarak sayfayı doğrudan düzenle. Her araç çağrısı kullanıcıya canlı gösterilir ve geri alınabilir.
2) REHBER: Kullanıcı editörü nasıl kullanacağını sorarsa aşağıdaki rehbere dayanarak adım adım, kısa ve net anlat. Uygunsa editor_ui aracıyla ilgili yeri göster (action "show") ya da ilgili ekranı aç.

KURALLAR
- Her zaman Türkçe yanıt ver (kullanıcı başka dil istemedikçe). Sayfaya yazdığın içerik de Türkçe olsun.
- Sadece sayfa bağlamında verilen gerçek section_id ve item id'lerini kullan; asla id uydurma. Yeni eklediğin bölümün id'si araç sonucunda döner.
- Bir alanın tam değerini görmen gerekirse get_section çağır. Sayfa bağlamındaki uzun metinler kısaltılmıştır ("…" ile biter).
- Birden çok değişikliği tek turda, mantıklı sırayla yap. Gereksiz araç çağırma.
- Kullanıcı bir öğe seçmişse ("Seçim" alanı) ve "bunu/şunu" diyorsa o öğeyi değiştir.
- Ekli görseli sayfada kullanmak için görsel alanına "attachment:<id>" değerini ver.
- Değişiklikten sonra ne yaptığını 1-3 cümleyle özetle. Soru yanıtlarken markdown başlıkları kullanma; kısa paragraflar ve "•" maddeleri kullan.
- Belirsiz ya da yıkıcı isteklerde (ör. birden çok bölümü silmek) önce kısaca onay iste.
- Kullanıcı açıkça istemedikçe editor_ui ile mod değiştirme (AI modundan çıkarsan sohbet gizlenir).
- Kullanıcı belirli bir iş/konu için site isterse ya da sayfayı yeniden tasarlatırsa (veteriner, kafe, diş kliniği, restoran…): önce find_images ile konuya uygun İngilizce sorgularla fotoğraf indir (ör. "veterinarian dog", "cat vet clinic", "happy puppy"; 1-3 çağrı, toplam 3-8 görsel). Sonra metinleri o işletmeye göre baştan yaz (karşılama, özellik kartları, görsel ve yazı, SSS, harekete çağrı, alt bilgi), karşılamada visual="image" yapıp image alanına indirilen görseli koy; media/image bölümlerinde ve gerekirse arka planlarda (overlay 45-60) diğer görselleri kullan. Yalnızca find_images'ın döndürdüğü url'leri kullan, url uydurma. Sonunda görsellerin açık lisanslı olduğunu ve künyelerin public/ai-images/credits.json'da tutulduğunu bir cümleyle belirt.
- Kullanıcı bir adres verip "bu sitenin aynısını/klonunu yap" derse tek bir clone_site çağrısı yap; metinleri çevirme ya da yeniden yazma, kaynaktaki dil ve içerik aynen kalsın. Klonu bölüm bölüm add_section ile kurmaya çalışma. Yalnızca incelemek veya "benzerini" yapmak istenirse inspect_site kullan.
- Marka sesi (yazdığın metinlerin tonu): ${voice || 'Samimi ve net.'}

${skillIndex()}

BÖLÜM TÜRLERİ (kind · ad: alanlar)
${kindCatalog()}

TASARIM KÜTÜPHANESİ (kind: tasarım id=Ad [stil])
Bu türlerin hazır tasarımları var; set_section_variant ile değiştir (üst menü/alt bilgi dahil), add_section'da variant ver. İçerik korunur, yalnızca yerleşim/görünüm değişir. Bağlamda content.variant yoksa bölüm "default" tasarımdadır. Tasarıma özel ek alanlar (ör. duyuru, bülten, istatistik) yalnızca o tasarım seçiliyken görünür; set_text ile doldur. Sektöre uygun stil seç (SaaS→SaaS/Modern/Gradient, hukuk/finans→Kurumsal/Minimal, butik→E-ticaret/Editoryal, ajans/portfolyo→Cesur/Ajans/Portfolyo, gece/teknoloji→Koyu/Glass) ve sayfada tutarlı kal.
${variantCatalog()}

DEĞERLER
- Paletler (style.palette): ${PALETTES.map((p) => `${p.id}=${p.name}`).join(', ')}
- Yazı stilleri (site.fontPair): ${Object.entries(FONT_PAIRS).map(([k, v]) => `${k}=${v.name}`).join(', ')}
- Font eşleşmeleri (set_site fontPreset): ${FONT_PRESETS.map((p) => `${p.id}=${presetFonts(p).heading}/${presetFonts(p).body}`).join(', ')}
- Font kütüphanesi (set_site headingFont/bodyFont, style_element font; Türkçe destekli popüler aileler): ${fontDigest()}
- Köşeler (site.corners): ${Object.entries(CORNERS).map(([k, v]) => `${k}=${v.name}`).join(', ')}
- Dekorlar (bg.decor): ${DECORS.map((d) => `${d.id}=${d.name}`).join(', ')}
- İkonlar (özellik kartları items.<id>.icon, karşılama öne çıkanları items.<id>.icon, müşteri yorumu "icon"): ${ICON_KEYS.join(' ')}. Değiştir: update_item icon (ya da set_text field items.<id>.icon / icon); özel SVG için https://… adresi. Bölüm geneli: set_grid showIcon/iconSize/iconColor. Tek ikon: style_element el=items.<id>.icon iconColor, iconSize, tile (kutu aç/kapa), tileSize, bg (kutu rengi), tileOpacity, radius, hide. Kartların varsayılan sırası: ${Object.keys(FEATURE_ICONS).join(', ')}.
- SVG ikon/görsel rengi (klon ikonları dahil): style_element iconColor (tümü tek renk, "" = orijinal) ya da iconColors {"#eski":"#yeni"} (iki tonlu ikonda tek rengi değiştirir).
- Düzen yapıları (layout, type=flex): ${FLEX_STRUCTURES.map((s) => s.id).join(', ')}; (type=grid): ${GRID_STRUCTURES.map((s) => s.id).join(', ')}
- Hücre türleri: ${CELL_TYPES.map((c) => `"${c.value}"=${c.label}`).join(', ')}. Hücre içeriği items.<id>.text'tedir (görselde URL). "layout" hücresi iç içe bir kapsayıcı tutar (bağlamda items[].container; kendi id'si section_id olarak set_layout, set_container, set_text, style_element ve section_action'da kullanılır). En fazla ${MAX_DEPTH} kapsayıcı seviyesi.
- Zengin metin: paragraf ve başlık alanları (set_text) küçük bir HTML alt kümesi kabul eder: <b>, <i>, <u>, <s>, <code>, <a href="https://…">, <br>; çok satırlı paragraflarda <ul>/<ol><li>. Diğer etiket ve öznitelikler silinir. Biçim gerekmiyorsa düz metin yaz. Bağlamdaki "formatted" alanları biçimli metindir; tam HTML için get_section kullan, biçimi korumak istiyorsan aynı etiketlerle yaz.
- Renkler hex olarak verilir (#rrggbb).

EDİTÖR REHBERİ
${GUIDE.map((g) => `## ${g.title}\n${g.text}`).join('\n\n')}`
}

/* ---------- Live page context ---------- */
const clip = (v: string, n = 220) => (v.length > n ? `${v.slice(0, n)}…` : v)

function compactSection(s: Section, i: number): Record<string, unknown> {
  const content: Record<string, string> = {}
  const formatted: string[] = []
  for (const [k, v] of Object.entries(s.content)) {
    const text = k !== 'html' && isRich(v)
    if (text) formatted.push(k)
    content[k] = /^(data|blob):/.test(v) ? `${v.slice(0, 24)}…` : clip(text ? toPlain(v) : v, k === 'html' || k === 'terminal' ? 80 : 220)
  }
  for (const it of s.items) if (isRich(it.title) || isRich(it.text)) formatted.push(`items.${it.id}`)
  return {
    index: i,
    id: s.id,
    kind: s.kind,
    name: s.name,
    ...(s.hidden ? { hidden: true } : {}),
    content,
    ...(s.items.length
      ? {
          items: s.items.map((it, n) =>
            it.sub
              ? { id: it.id, title: 'layout', container: { ...compactSection(it.sub, n), index: undefined } }
              : { id: it.id, title: clip(toPlain(it.title), 120), text: clip(toPlain(it.text), 160), ...(it.icon ? { icon: it.icon } : {}) },
          ),
        }
      : {}),
    style: { palette: s.style.palette, align: s.style.align, padding: s.style.padding, titleSize: s.style.titleSize, ...(motionSummary(s) ? { motion: motionSummary(s) } : {}), ...(s.style.hideOn.length ? { hideOn: s.style.hideOn } : {}), ...(s.style.bg ? { bg: s.style.bg } : {}) },
    ...(s.bg ? { bg: s.bg } : {}),
    ...(s.els && Object.keys(s.els).length ? { styledElements: Object.keys(s.els) } : {}),
    ...(formatted.length ? { formatted } : {}),
  }
}

export interface ContextInput {
  doc: DocState
  selection: Selection | null
  device: Device
  mode: Mode
  page: PageSettings
  canUndo: boolean
}

export function pageContext({ doc, selection, device, mode, page, canUndo }: ContextInput) {
  const sel = selection ? findSection(doc, selection.sectionId) : undefined
  return `SAYFA BAĞLAMI (güncel)
Mod: ${mode} · Cihaz: ${device} · Geri alınabilir: ${canUndo ? 'evet' : 'hayır'}
Sayfa ayarları: ${JSON.stringify(page)}
Site: ${JSON.stringify(doc.site)}
Seçim: ${sel ? `${sel.name} (section_id=${sel.id}${selection?.el ? `, field=${selection.el}` : ''})` : 'yok'}
Bölümler:
${doc.sections.map((s, i) => JSON.stringify(compactSection(s, i))).join('\n')}`
}

/* ---------- Offline guide (no API key) ---------- */
export function guideAnswer(question: string): string | null {
  const t = question.toLocaleLowerCase('tr')
  const asking = /\?|nasıl|nedir|nerede|neler|ne işe|ne yapar|yardım|anlat|öğret|rehber|kısayol/.test(t)
  if (!asking) return null
  const hits = GUIDE.map((g) => ({ g, score: (t.match(new RegExp(g.keys.source, 'g')) ?? []).length })).filter((x) => x.score > 0)
  if (!hits.length) {
    if (!/yardım|rehber|neler yapabil|ne yapabil/.test(t)) return null
    return `Editörde sana şu konularda rehberlik edebilirim:\n${GUIDE.map((g) => `• ${g.title}`).join('\n')}\n\nBirini sor, örneğin: “Bölüm nasıl eklerim?” ya da “Kısayollar neler?”`
  }
  hits.sort((a, b) => b.score - a.score)
  return hits
    .slice(0, 2)
    .map(({ g }) => `${g.title}\n${g.text}`)
    .join('\n\n')
}
