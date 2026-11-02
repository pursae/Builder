import { useState } from 'react'
import { Check, ChevronDown, CircleAlert, Eye, EyeOff, Info, KeyRound, LoaderCircle, RefreshCw, Trash2, X } from 'lucide-react'
import { Modal } from '../Dialogs'
import { Segmented, Toggle, cn } from '../ui'
import { useAi } from './AiProvider'
import { ping } from './llm'
import { ProviderLogo } from './logos'
import { PROVIDERS, fmtCost, fmtPrice, fmtTokens, keyStatus, type ProviderDef } from './providers'

function ProviderCard({ p }: { p: ProviderDef }) {
  const ai = useAi()
  const s = ai.settings
  const key = s.keys[p.id] ?? ''
  const [show, setShow] = useState(false)
  const [test, setTest] = useState<'idle' | 'busy' | 'ok' | 'warn'>('idle')
  const [testError, setTestError] = useState('')
  const status = keyStatus(p, key)
  const active = s.active === p.id
  const models = ai.modelsFor(p.id)
  const model = ai.modelInfo(p.id, s.models[p.id])
  const d = ai.discovery[p.id] ?? {}
  const setKey = (v: string) => {
    setTest('idle')
    setTestError('')
    ai.setSettings({ ...s, keys: { ...s.keys, [p.id]: v.trim() } })
  }
  const runTest = async () => {
    setTest('busy')
    setTestError('')
    try {
      await ping(p, model.id, key)
      setTest('ok')
      void ai.refreshModels(p.id)
    } catch (e) {
      setTest('warn')
      setTestError((e as Error).message)
    }
  }
  return (
    <div className={cn('rounded-xl p-3.5 ring-1 transition', active ? 'bg-accent/[0.07] ring-accent/50' : 'bg-white/[0.02] ring-white/[0.07]')}>
      <div className="flex items-center gap-2.5">
        <ProviderLogo id={p.id} size={16} className="size-8 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-ink-100">{p.name}</div>
          <div className={cn('text-[11.5px]', status === 'ok' ? 'text-emerald-300' : status === 'warn' ? 'text-amber-300' : 'text-ink-500')}>{status === 'ok' ? 'Anahtar kayıtlı' : status === 'warn' ? 'Biçimi kontrol et' : 'Bağlı değil'}</div>
        </div>
        <button type="button" onClick={() => ai.setSettings({ ...s, active: p.id })} className={cn('h-7 rounded-md px-2.5 text-[11.5px] font-semibold transition', active ? 'bg-accent text-white' : 'bg-white/[0.06] text-ink-300 hover:bg-white/10')}>
          {active ? 'Varsayılan' : 'Varsayılan yap'}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-lg border border-white/[0.08] bg-ink-900 pl-2.5 focus-within:border-accent">
          <KeyRound size={13} className="shrink-0 text-ink-500" />
          <input
            type={show || p.url ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={p.keyHint}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent px-2 py-2 font-mono text-[12px] text-ink-100 outline-none placeholder:font-sans placeholder:text-ink-600"
          />
          {key && !p.url && (
            <button type="button" aria-label={show ? 'Gizle' : 'Göster'} onClick={() => setShow(!show)} className="grid size-8 place-items-center text-ink-500 hover:text-ink-200">
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
          {key && (
            <button type="button" aria-label="Anahtarı sil" onClick={() => setKey('')} className="grid size-8 place-items-center text-ink-500 hover:text-red-300">
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <div className="relative w-[170px] min-w-0 shrink-0">
          <select
            value={model.id}
            title={model.id}
            onChange={(e) =>
              ai.setSettings({
                ...s,
                models: { ...s.models, [p.id]: e.target.value },
              })
            }
            className="h-full w-full min-w-0 appearance-none truncate rounded-lg border border-white/[0.08] bg-ink-900 pl-2 pr-7 text-[12px] text-ink-100 outline-none focus:border-accent"
          >
            {!models.some((m) => m.id === model.id) && <option value={model.id}>{model.name}</option>}
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-500" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-[11px] text-ink-500">
          {model.unknown || (model.in === 0 && model.out === 0) ? fmtPrice(model).replace('yerel', 'Yerel model') : `${fmtPrice(model)} · 1M token (girdi / çıktı)`}
          {d.count ? ` · ${d.count} model bulundu` : ''}
        </span>
        <button type="button" disabled={!key || d.busy} onClick={() => void ai.refreshModels(p.id)} className="flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-ink-300 hover:bg-white/[0.06] disabled:opacity-40">
          {d.busy ? <LoaderCircle size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {d.busy ? 'Modeller alınıyor…' : 'Modelleri yenile'}
        </button>
        <button type="button" disabled={!key || test === 'busy'} onClick={() => void runTest()} className="flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-ink-300 hover:bg-white/[0.06] disabled:opacity-40">
          {test === 'busy' ? <LoaderCircle size={11} className="animate-spin" /> : test === 'ok' ? <Check size={11} className="text-emerald-400" /> : test === 'warn' ? <CircleAlert size={11} className="text-amber-300" /> : null}
          {test === 'busy' ? 'Bağlanıyor…' : test === 'ok' ? 'Bağlantı çalışıyor' : test === 'warn' ? 'Bağlantı başarısız' : 'Bağlantıyı test et'}
        </button>
      </div>
      {testError && <p className="mt-1.5 break-words text-[11px] leading-relaxed text-amber-200/90">{testError}</p>}
      {d.error && <p className="mt-1.5 break-words text-[11px] leading-relaxed text-amber-200/90">Model listesi alınamadı: {d.error}</p>}
    </div>
  )
}

function Usage() {
  const ai = useAi()
  const t = ai.totals
  const now = new Date()
  const monthCost = ai.usage.filter((u) => new Date(u.at).getMonth() === now.getMonth()).reduce((n, u) => n + u.cost, 0)
  const byProvider = PROVIDERS.map((p) => {
    const rows = ai.usage.filter((u) => u.provider === p.id)
    return {
      p,
      tokens: rows.reduce((n, u) => n + u.input + u.output, 0),
      cost: rows.reduce((n, u) => n + u.cost, 0),
      count: rows.length,
    }
  }).filter((x) => x.count > 0)
  const max = Math.max(1, ...byProvider.map((x) => x.tokens))
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {[
          ['Toplam token', fmtTokens(t.input + t.output)],
          ['Girdi', fmtTokens(t.input)],
          ['Çıktı', fmtTokens(t.output)],
          ['Maliyet', fmtCost(t.cost)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
            <div className="text-[11px] text-ink-500">{k}</div>
            <div className="mt-1 text-[18px] font-semibold tracking-tight text-ink-100">{v}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-[12.5px]">
          <span className="font-medium text-ink-200">Aylık bütçe</span>
          <span className="text-ink-400">
            {fmtCost(monthCost)} / ${ai.settings.budget}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#4f6af7] transition-all"
            style={{
              width: `${Math.min(100, (monthCost / ai.settings.budget) * 100)}%`,
            }}
          />
        </div>
        <input
          type="range"
          min={5}
          max={200}
          step={5}
          value={ai.settings.budget}
          onChange={(e) => ai.setSettings({ ...ai.settings, budget: Number(e.target.value) })}
          className="rng mt-3 w-full"
          style={{
            ['--p' as string]: `${((ai.settings.budget - 5) / 195) * 100}%`,
          }}
        />
      </div>
      <div>
        <div className="mb-2 text-[12.5px] font-medium text-ink-200">Sağlayıcıya göre</div>
        {byProvider.length === 0 ? (
          <p className="text-[12.5px] text-ink-500">Henüz istek yok. AI modunda bir mesaj gönderdiğinde kullanım burada görünür.</p>
        ) : (
          <div className="space-y-2">
            {byProvider.map(({ p, tokens, cost, count }) => (
              <div key={p.id} className="flex items-center gap-3 text-[12px]">
                <span className="w-28 truncate text-ink-300">{p.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(tokens / max) * 100}%`,
                      background: p.color,
                    }}
                  />
                </div>
                <span className="w-32 text-right text-ink-400">
                  {fmtTokens(tokens)} · {fmtCost(cost)} · {count} istek
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {ai.usage.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-ink-200">Son istekler</span>
            <button type="button" onClick={ai.resetUsage} className="text-[11.5px] text-ink-500 hover:text-red-300">
              Kullanımı sıfırla
            </button>
          </div>
          <div className="overflow-hidden rounded-lg ring-1 ring-white/[0.06]">
            {ai.usage
              .slice(-6)
              .reverse()
              .map((u, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.4fr_.7fr_.7fr_.8fr] gap-2 border-b border-white/[0.04] px-3 py-2 text-[11.5px] last:border-0">
                  <span className="text-ink-500">
                    {new Date(u.at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="truncate text-ink-200">{ai.modelInfo(u.provider, u.model).name}</span>
                  <span className="text-ink-400">↑{fmtTokens(u.input)}</span>
                  <span className="text-ink-400">↓{fmtTokens(u.output)}</span>
                  <span className="text-right text-ink-200">{fmtCost(u.cost)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
      <p className="text-[11.5px] leading-relaxed text-ink-500">
        Canlı modelde token sayıları sağlayıcının bildirdiği değerlerdir; demo motorunda tahminidir (yaklaşık 4 karakter = 1 token). Fiyatlar sağlayıcıların liste fiyatlarına göredir ve değişebilir.
      </p>
    </div>
  )
}

function Behavior() {
  const ai = useAi()
  const s = ai.settings
  const row = (title: string, desc: string, on: boolean, set: (v: boolean) => void) => (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-3.5 py-3 ring-1 ring-white/[0.06]">
      <div>
        <div className="text-[13px] font-medium text-ink-100">{title}</div>
        <div className="text-[12px] text-ink-500">{desc}</div>
      </div>
      <Toggle label={title} on={on} onChange={set} />
    </div>
  )
  return (
    <div className="space-y-3">
      {row('Onay beklemeden uygula', 'Kapalıysa AI önce planını gösterir, sen “Uygula” deyince değiştirir.', s.autoApply, (v) => ai.setSettings({ ...s, autoApply: v }))}
      {row('Düzenlenen yeri göster', 'Mor imleç ve vurgu ile AI’ın çalıştığı yeri izle.', s.showCursor, (v) => ai.setSettings({ ...s, showCursor: v }))}
      <div className="rounded-xl bg-white/[0.03] px-3.5 py-3 ring-1 ring-white/[0.06]">
        <div className="mb-2 text-[13px] font-medium text-ink-100">Yazma hızı</div>
        <Segmented
          id="ai-speed"
          value={s.speed}
          onChange={(v) => ai.setSettings({ ...s, speed: v })}
          options={[
            { value: 'slow', label: 'Yavaş' },
            { value: 'normal', label: 'Normal' },
            { value: 'fast', label: 'Hızlı' },
          ]}
        />
      </div>
      <label className="block rounded-xl bg-white/[0.03] px-3.5 py-3 ring-1 ring-white/[0.06]">
        <span className="block text-[13px] font-medium text-ink-100">Marka sesi</span>
        <span className="mb-2 block text-[12px] text-ink-500">AI yazarken bu tonu kullanır (sistem talimatına eklenir).</span>
        <textarea
          rows={3}
          value={s.voice}
          onChange={(e) => ai.setSettings({ ...s, voice: e.target.value })}
          className="w-full resize-none rounded-lg border border-white/[0.08] bg-ink-900 px-3 py-2 text-[13px] text-ink-100 outline-none focus:border-accent"
        />
      </label>
    </div>
  )
}

export function AiSettings() {
  const ai = useAi()
  const tab = ai.settingsOpen
  return (
    <Modal open={!!tab} onClose={() => ai.setSettingsOpen(null)} width={640}>
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 pt-4">
        <div className="pb-3">
          <h2 className="text-[15px] font-semibold">AI ayarları</h2>
          <p className="text-[12.5px] text-ink-400">Sağlayıcılar, API anahtarları ve kullanım</p>
        </div>
        <button type="button" aria-label="Kapat" onClick={() => ai.setSettingsOpen(null)} className="mb-3 ml-auto grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-white/[0.06] hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-1 border-b border-white/[0.07] px-4">
        {(
          [
            ['providers', 'Sağlayıcılar'],
            ['usage', 'Kullanım'],
            ['behavior', 'Davranış'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => ai.setSettingsOpen(id)} className={cn('relative h-10 px-3 text-[12.5px] font-medium transition-colors', tab === id ? 'text-white' : 'text-ink-400 hover:text-ink-200')}>
            {label}
            {tab === id && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-accent-soft" />}
          </button>
        ))}
      </div>
      <div className="scroll-thin max-h-[62vh] overflow-y-auto p-5">
        {tab === 'providers' && (
          <div className="space-y-3">
            <div className="flex gap-2.5 rounded-xl bg-amber-400/[0.07] p-3 text-[12px] leading-relaxed text-amber-100/90 ring-1 ring-amber-400/20">
              <Info size={15} className="mt-px shrink-0 text-amber-300" />
              <span>
                Varsayılan sağlayıcıya anahtar girdiğinde AI gerçek modelle çalışır: sayfanı okur, araçlarla düzenler ve editörü anlatır. Anahtar yoksa <b>yerel demo motoru</b> devreye girer; “demo” komutu her zaman yereldir. Anahtarlar yalnızca bu
                tarayıcıda (localStorage) saklanır; herkese açık bir yayında anahtarları sunucu tarafına taşı.
              </span>
            </div>
            {PROVIDERS.map((p) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        )}
        {tab === 'usage' && <Usage />}
        {tab === 'behavior' && <Behavior />}
      </div>
    </Modal>
  )
}
