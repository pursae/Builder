import { ArrowRight, ChevronDown, History, Play, Settings2 } from 'lucide-react'
import { useB } from '../store'
import { cn } from '../ui'
import { AiAvatar } from './AiChat'
import { useAi } from './AiProvider'
import { ProviderLogo } from './logos'
import { ModelPicker } from './ModelPicker'
import { fmtCost, fmtTokens, keyStatus, providerOf } from './providers'

const QUICK = ['Rengi mor yap', 'Koyu tema', 'SSS bölümü ekle', 'Başlığı kısalt', 'Köşeleri yuvarlak yap', 'Yazı stilini modern yap', 'Mobilde göster', 'İletişim formu ekle']
const GUIDE_QUICK = ['Editörde neler yapabilirim?', 'Bölüm nasıl eklerim?', 'Studio modunda neler var?', 'Kısayollar neler?', 'Arka plana nasıl gradyan veririm?', 'Sayfamı incele ve öner']

function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000)
  return s < 60 ? 'şimdi' : `${Math.round(s / 60)} dk önce`
}

export function AiSidePanel() {
  const ai = useAi()
  const b = useB()
  const provider = providerOf(ai.settings.active)
  const status = keyStatus(provider, ai.settings.keys[provider.id])
  const month = new Date()
  const monthCost = ai.usage.filter((u) => new Date(u.at).getMonth() === month.getMonth()).reduce((n, u) => n + u.cost, 0)
  const pct = Math.min(100, (monthCost / Math.max(ai.settings.budget, 0.01)) * 100)
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <AiAvatar size={30} />
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink-100">AI Asistan</h2>
            <p className="text-[12.5px] text-ink-400">Sohbet ederek düzenle</p>
          </div>
        </div>
        <div className="mt-4">
          <ModelPicker
            title="Modeli değiştir"
            panelClassName="left-0 w-full min-w-[260px]"
            className="flex w-full items-center gap-2.5 overflow-hidden rounded-xl bg-white/[0.04] px-3 py-2.5 text-left ring-1 ring-white/[0.07] transition enabled:hover:bg-white/[0.07]"
          >
            <ProviderLogo id={provider.id} size={14} className="size-7 rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink-100">{ai.engineLabel.replace(' · demo', '')}</span>
              <span className={cn('block truncate text-[11.5px]', status === 'ok' ? 'text-emerald-300' : 'text-amber-300')}>
                {ai.live ? (status === 'ok' ? 'Canlı model · anahtar kayıtlı' : 'Canlı model · anahtar biçimini kontrol et') : 'Demo motoru · anahtar yok'}
              </span>
            </span>
            <ChevronDown size={14} className="shrink-0 text-ink-500" />
          </ModelPicker>
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <button
          type="button"
          disabled={ai.running}
          onClick={() => ai.send('demo', [])}
          className="mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl bg-gradient-to-r from-[#8b5cf6]/25 to-[#4f6af7]/20 px-3.5 py-3 text-left ring-1 ring-[#8b5cf6]/40 transition hover:from-[#8b5cf6]/35 disabled:opacity-50"
        >
          <span className="grid size-8 place-items-center rounded-full bg-white text-[#6d28d9]">
            <Play size={14} fill="currentColor" className="translate-x-px" />
          </span>
          <span>
            <span className="block text-[13.5px] font-semibold text-white">Demo’yu başlat</span>
            <span className="block text-[11.5px] text-[#c4b5fd]">AI’ın sayfayı canlı düzenleyişini izle</span>
          </span>
        </button>

        <div className="px-2 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-500">Hızlı komutlar</div>
        <div className="flex flex-wrap gap-1.5 px-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              disabled={ai.running}
              onClick={() => ai.send(q, [])}
              className="rounded-full bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-ink-200 ring-1 ring-white/[0.07] transition hover:bg-accent/20 hover:text-white disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="px-2 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-500">Rehber</div>
        <div className="flex flex-wrap gap-1.5 px-2">
          {GUIDE_QUICK.filter((q) => ai.live || q !== 'Sayfamı incele ve öner').map((q) => (
            <button
              key={q}
              type="button"
              disabled={ai.running}
              onClick={() => ai.send(q, [])}
              className="rounded-full bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-ink-200 ring-1 ring-white/[0.07] transition hover:bg-accent/20 hover:text-white disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 px-2 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-500">
          <History size={12} /> Yapılan değişiklikler
        </div>
        {ai.log.length === 0 ? (
          <p className="px-2 text-[12.5px] leading-relaxed text-ink-500">AI’ın sayfanda yaptığı her değişiklik burada listelenir; birine tıklayınca o yere gidersin.</p>
        ) : (
          <div className="space-y-0.5">
            {ai.log.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={!l.target}
                onClick={() => l.target && b.select(l.target.el ? { sectionId: l.target.sectionId, el: l.target.el } : { sectionId: l.target.sectionId }, { scroll: true })}
                className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition enabled:hover:bg-white/[0.05]"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-[#a78bfa]" />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-200">{l.label}</span>
                <span className="text-[10.5px] text-ink-500">{ago(l.at)}</span>
                {l.target && <ArrowRight size={12} className="text-ink-600 opacity-0 transition group-hover:opacity-100" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.07] p-4">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-ink-400">Bu ay</span>
          <span className="font-medium text-ink-100">
            {fmtTokens(ai.totals.input + ai.totals.output)} token · {fmtCost(monthCost)}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className={cn('h-full rounded-full transition-all duration-500', pct > 85 ? 'bg-amber-400' : 'bg-gradient-to-r from-[#8b5cf6] to-[#4f6af7]')} style={{ width: `${Math.max(pct, 1.5)}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-500">
          <span>Bütçe ${ai.settings.budget}/ay · tahmini</span>
          <button type="button" onClick={() => ai.setSettingsOpen('usage')} className="flex items-center gap-1 text-ink-300 hover:text-white">
            <Settings2 size={11} /> Kullanım
          </button>
        </div>
      </div>
    </div>
  )
}
