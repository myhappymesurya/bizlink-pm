'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const SISTEM_OPTIONS = [
  { value: 'Hydrant',   label: 'Hydrant',   assets: ['PP-HYD-01', 'PP-HYD-02'] },
  { value: 'Sprinkler', label: 'Sprinkler', assets: ['PP-SPR-01'] },
] as const

const FREQUENCIES = [
  { label: 'Harian',     value: 'Daily'       },
  { label: '2 Mingguan', value: 'Bi Weekly'   },
  { label: 'Bulanan',    value: 'Monthly'     },
  { label: '6 Bulanan',  value: 'Bi Annually' },
  { label: 'Tahunan',    value: 'Annually'    },
]

interface CheckItem {
  text: string
  group?: string
}

const CHECKLIST_ITEMS: Record<string, CheckItem[]> = {
  'Daily': [
    { text: 'Voltage battery normal', group: 'Battery, Solar, Oil & Sistem Pendingin' },
    { text: 'Check tangki dan selang solar — terhadap kontaminasi air, endapan ataupun kotoran' },
    { text: 'Level solar di tangki minimal 2/3 penuh. Jika kurang, solar harus ditambah' },
    { text: 'Check level oil engine dengan dipstick' },
    { text: 'Cek kebocoran pada selang solar dari tangki ke diesel. Valve inlet dan return pada pipa solar dalam posisi open/buka' },
    { text: 'Cek lever campuran air pendingin / coolant' },
    { text: 'Check pipa dan valve saluran air pendingin dari pompa ke Heat Exchanger. Bersihkan strainer jika diperlukan' },
    { text: 'Semua valve pada pipa suction dan discharge pompa diesel dan jockey dalam kondisi open', group: 'Pemipaan dan Valve' },
    { text: 'Dengan "Manual Mode" — jalankan pompa jockey minimal selama 10 menit', group: 'Test Running Manual Pompa' },
    { text: 'Dengan "Manual Mode" — jalankan pompa diesel pada rate speed 3000 RPM minimal 30 menit, untuk memanaskan semua komponen dan menghilangkan kondensasi' },
    { text: 'Check pada kedua panel controller, pastikan selector switch pada posisi Automatic Start', group: 'Test Running Automatic Pompa' },
    { text: 'Test automatic start dengan membuka valve test drain. Pompa harus start sesuai setting: 6 Bar → Jockey ON, 4 Bar → Diesel ON' },
    { text: 'Tutup valve drain dan pastikan pompa mati dengan automatis' },
  ],
  'Bi Weekly': [
    { text: 'Level air aki di battery normal' },
    { text: 'Terminal battery harus bebas dari korosi / karat' },
  ],
  'Monthly': [
    { text: 'Casing battery bersih, kering dan bebas dari korosi' },
    { text: 'Bersihkan saringan dan filter di saluran bahan bakar' },
    { text: 'Buka dan bersihkan water strainer pada pipa saluran pendingin' },
    { text: 'Bersihkan box panel pompa diesel dan jockey' },
    { text: 'Cek kabel listrik — apakah ada pengelupasan ataupun short circuit' },
  ],
  'Bi Annually': [
    { text: 'Ganti oli mesin diesel, kapasitas oli mesin 7 liter' },
    { text: 'Kalibrasi pressure switch dan flow meter agar pembacaan tetap akurat' },
  ],
  'Annually': [
    { text: 'Lubrikasi seluruh bearing pada seluruh pompa dan diesel engine' },
  ],
}

interface Props {
  userId: string
  onSuccess?: () => void
}

export default function PompaPemadamChecklist({ userId, onSuccess }: Props) {
  const supabase = createClientComponentClient()

  const [sistem, setSistem]         = useState<'Hydrant' | 'Sprinkler' | ''>('')
  const [selectedFreq, setSelectedFreq] = useState('')
  const [checks, setChecks]         = useState<Record<number, boolean>>({})
  const [notes, setNotes]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)

  const handleFreqChange = (val: string) => {
    setSelectedFreq(val)
    setChecks({})
    setError('')
    setSuccess(false)
  }

  const currentItems = selectedFreq ? CHECKLIST_ITEMS[selectedFreq] : []
  const checkedCount = currentItems.filter((_, i) => checks[i]).length
  const allChecked   = currentItems.length > 0 && checkedCount === currentItems.length

  const handleSubmit = async () => {
    if (!sistem)       return setError('Pilih sistem terlebih dahulu.')
    if (!selectedFreq) return setError('Pilih frekuensi terlebih dahulu.')
    if (!allChecked)   return setError('Semua item checklist harus dicentang sebelum submit.')

    setLoading(true)
    setError('')

    const sistemData = SISTEM_OPTIONS.find(s => s.value === sistem)!
    const freqLabel  = FREQUENCIES.find(f => f.value === selectedFreq)?.label ?? selectedFreq

    try {
      const { data: submission, error: subError } = await supabase
        .from('checklist_submissions')
        .insert({
          asset_id:     sistemData.assets[0],
          category:     'Fire Safety',
          sub_category: 'Pompa Pemadam Kebakaran',
          sistem,
          frequency:    selectedFreq,
          submitted_by: userId,
          notes:        notes.trim() || null,
          status:       'completed',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (subError) throw subError

      const itemRows = currentItems.map((item, i) => ({
        submission_id: submission.id,
        item_text:     item.text,
        group_label:   item.group ?? null,
        is_checked:    checks[i] ?? false,
        order_index:   i,
      }))

      const { error: itemError } = await supabase
        .from('checklist_items')
        .insert(itemRows)

      if (itemError) throw itemError

      // Update pm_schedules
      for (const assetId of sistemData.assets) {
        await supabase
          .from('pm_schedules')
          .update({ last_performed: new Date().toISOString() })
          .eq('asset_id', assetId)
          .eq('frequency', selectedFreq)
      }

      setSuccess(true)
      setSistem('')
      setSelectedFreq('')
      setChecks({})
      setNotes('')
      onSuccess?.()

    } catch (err: any) {
      setError(err.message ?? 'Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const renderItems = () => {
    let lastGroup = ''
    return currentItems.map((item, i) => {
      const showGroup = !!item.group && item.group !== lastGroup
      if (item.group) lastGroup = item.group
      return (
        <div key={i}>
          {showGroup && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-2">
              {item.group}
            </p>
          )}
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
            ${checks[i] ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
            <input
              type="checkbox"
              checked={!!checks[i]}
              onChange={() => setChecks(prev => ({ ...prev, [i]: !prev[i] }))}
              className="mt-0.5 h-4 w-4 accent-green-500 cursor-pointer shrink-0"
            />
            <span className={`text-sm leading-snug ${checks[i] ? 'text-green-800' : 'text-gray-700'}`}>
              {item.text}
            </span>
          </label>
        </div>
      )
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🔥</span>
        <div>
          <h2 className="font-semibold text-gray-800 text-lg">Pompa Pemadam Kebakaran</h2>
          <p className="text-sm text-gray-500">Fire Safety — Pump Room</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sistem <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {SISTEM_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => { setSistem(opt.value); setError(''); setSuccess(false) }}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors
                    ${sistem === opt.value
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frekuensi <span className="text-red-500">*</span>
            </label>
            <select value={selectedFreq}
              onChange={e => handleFreqChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="">-- Pilih Frekuensi --</option>
              {FREQUENCIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedFreq && currentItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-700">
                Checklist {FREQUENCIES.find(f => f.value === selectedFreq)?.label}
              </h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {checkedCount}/{currentItems.length} item
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full mb-4">
              <div className="h-1.5 bg-red-400 rounded-full transition-all duration-300"
                style={{ width: `${(checkedCount / currentItems.length) * 100}%` }} />
            </div>
            <div className="space-y-2">{renderItems()}</div>
          </div>
        )}

        {selectedFreq && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Tuliskan temuan atau catatan tambahan..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            ✅ Checklist berhasil disimpan & PM Schedule diperbarui.
          </div>
        )}

        <button onClick={handleSubmit}
          disabled={loading || !sistem || !selectedFreq}
          className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300
                     disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors">
          {loading ? 'Menyimpan...' : 'Submit Checklist'}
        </button>
      </div>
    </div>
  )
}