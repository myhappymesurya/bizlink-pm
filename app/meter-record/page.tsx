'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type MeterField = { key: string; label: string; auto?: boolean }
type MeterConfig = {
  id: string; name: string; subtitle: string; icon: string
  frequency: 'Daily' | 'Monthly'; freqLabel: string
  sectionTitle: string; hasNotes: boolean; fields: MeterField[]
}

const METERS: MeterConfig[] = [
  {
    id: 'kwh-transformer', name: 'KWh Meter Record', subtitle: 'Transformer Room',
    icon: '⚡', frequency: 'Daily', freqLabel: 'Harian',
    sectionTitle: 'Pembacaan KWh — Transformer Room', hasNotes: true,
    fields: [{ key: 'reading_1', label: 'Meter Reading (kWh)' }]
  },
  {
    id: 'kwh-gardu-pln', name: 'KWh Meter Record', subtitle: 'Gardu PLN',
    icon: '⚡', frequency: 'Daily', freqLabel: 'Harian',
    sectionTitle: 'Pembacaan KWh — Gardu PLN', hasNotes: true,
    fields: [
      { key: 'reading_1', label: 'BP — Beban Puncak (kWh)' },
      { key: 'reading_2', label: 'LBP — Luar Beban Puncak (kWh)' },
      { key: 'total', label: 'Total (kWh)', auto: true }
    ]
  },
  {
    id: 'water-meter', name: 'Water Meter Record', subtitle: 'WM-01',
    icon: '💧', frequency: 'Daily', freqLabel: 'Harian',
    sectionTitle: 'Data & Pengukuran', hasNotes: true,
    fields: [{ key: 'reading_1', label: 'Meter Reading (m³)' }]
  },
  {
    id: 'ct-water-meter', name: 'CT Water Meter', subtitle: '',
    icon: '🌀', frequency: 'Daily', freqLabel: 'Harian',
    sectionTitle: 'Data & Pengukuran', hasNotes: false,
    fields: [{ key: 'reading_1', label: 'Meter Reading' }]
  },
  {
    id: 'daily-supply-water', name: 'Daily Supply Water Meter', subtitle: '',
    icon: '🏠', frequency: 'Daily', freqLabel: 'Harian',
    sectionTitle: 'Data & Pengukuran', hasNotes: false,
    fields: [{ key: 'reading_1', label: 'Meter Reading' }]
  },
  {
    id: 'fire-hydrant-water', name: 'Fire Hydrant Water Meter', subtitle: 'FH-WM',
    icon: '🚒', frequency: 'Monthly', freqLabel: 'Bulanan (tgl 1)',
    sectionTitle: 'Data & Pengukuran', hasNotes: false,
    fields: [{ key: 'reading_1', label: 'Meter Reading' }]
  },
  {
    id: 'sprinkler-water', name: 'Sprinkler Water Meter', subtitle: 'SPR-WM',
    icon: '💦', frequency: 'Monthly', freqLabel: 'Bulanan (tgl 1)',
    sectionTitle: 'Data & Pengukuran', hasNotes: false,
    fields: [{ key: 'reading_1', label: 'Meter Reading' }]
  },
  {
    id: 'rain-water-harvest', name: 'Rain Water Harvest Meter', subtitle: 'RW-WM',
    icon: '🌧️', frequency: 'Monthly', freqLabel: 'Bulanan (tgl 1)',
    sectionTitle: 'Data & Pengukuran', hasNotes: false,
    fields: [{ key: 'reading_1', label: 'Meter Reading' }]
  }
]

const INSPECTORS = ['Suwarsono', 'Tenang Riatman', 'Other']

export default function MeterRecordPage() {
  const [selectedId, setSelectedId] = useState(METERS[0].id)
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [readings, setReadings] = useState<Record<string, string>>({})
  const [inspector, setInspector] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingRecord, setExistingRecord] = useState<{ inspector: string; submitted_at: string } | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const meter = METERS.find(m => m.id === selectedId)!

  useEffect(() => {
    setReadings({})
    setNotes('')
    setInspector('')
    setSuccess(false)
    setError('')
    setExistingRecord(null)
  }, [selectedId])

  useEffect(() => {
    if (!meter || !tanggal) return
    checkExisting()
  }, [selectedId, tanggal])

  async function checkExisting() {
    try {
      let query = supabase
        .from('meter_records')
        .select('inspector, submitted_at')
        .eq('meter_id', selectedId)

      if (meter.frequency === 'Daily') {
        query = query.eq('tanggal', tanggal)
      } else {
        const [year, month] = tanggal.split('-')
        query = query
          .gte('tanggal', `${year}-${month}-01`)
          .lte('tanggal', `${year}-${month}-31`)
      }

      const { data } = await query.limit(1).maybeSingle()
      setExistingRecord(data || null)
    } catch {
      setExistingRecord(null)
    }
  }

  function handleReadingChange(key: string, value: string) {
    const newReadings = { ...readings, [key]: value }
    const hasAutoTotal = meter.fields.some(f => f.key === 'total' && f.auto)
    if (hasAutoTotal && (key === 'reading_1' || key === 'reading_2')) {
      const r1 = parseFloat(newReadings['reading_1'] || '0') || 0
      const r2 = parseFloat(newReadings['reading_2'] || '0') || 0
      newReadings['total'] = (r1 + r2).toFixed(2)
    }
    setReadings(newReadings)
  }

  async function handleSubmit() {
    setError('')
    if (!inspector) { setError('Pilih inspector terlebih dahulu'); return }
    const emptyFields = meter.fields.filter(f => !f.auto && (!readings[f.key] || readings[f.key].trim() === ''))
    if (emptyFields.length > 0) { setError('Semua field pengukuran harus diisi'); return }

    setLoading(true)
    try {
      const { error: insertError } = await supabase.from('meter_records').insert({
        meter_id: selectedId,
        meter_name: meter.name,
        meter_subtitle: meter.subtitle || null,
        frequency: meter.frequency,
        tanggal,
        reading_1: readings['reading_1'] ? parseFloat(readings['reading_1']) : null,
        reading_2: readings['reading_2'] ? parseFloat(readings['reading_2']) : null,
        total: readings['total'] ? parseFloat(readings['total']) : null,
        notes: meter.hasNotes ? (notes || null) : null,
        inspector,
        submitted_at: new Date().toISOString()
      })
      if (insertError) throw insertError
      setSuccess(true)
      setReadings({})
      setNotes('')
      setInspector('')
      await checkExisting()
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan data')
    } finally {
      setLoading(false)
    }
  }

  const autoTotal = (() => {
    const r1 = parseFloat(readings['reading_1'] || '0') || 0
    const r2 = parseFloat(readings['reading_2'] || '0') || 0
    return (r1 + r2).toFixed(2)
  })()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Meter</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {METERS.map(m => (
              <option key={m.id} value={m.id}>
                {m.icon} {m.name}{m.subtitle ? ` — ${m.subtitle}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">{meter.icon} {meter.name}</h1>
          <p className="text-sm text-gray-500">Frekuensi: {meter.freqLabel}</p>
        </div>

        {/* Duplicate Warning */}
        {existingRecord && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-500">✅</span>
              <span className="font-semibold text-green-700">Sudah diisi untuk periode ini</span>
            </div>
            <p className="text-sm text-gray-600">
              PIC: <strong>{existingRecord.inspector}</strong> · Waktu:{' '}
              {new Date(existingRecord.submitted_at).toLocaleString('id-ID')} · Status: ✓ OK
            </p>
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Submit lagi akan membuat data duplikat. Pastikan ini memang perlu diisi ulang.
            </p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-700 font-medium">✅ Data berhasil disimpan!</p>
          </div>
        )}

        {/* Informasi Umum */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">📋 Informasi Umum</h2>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={e => setTanggal(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Data & Pengukuran */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">📊 {meter.sectionTitle}</h2>
          <div className="space-y-3">
            {meter.fields.map(field => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-700 flex-1">{field.label}</span>
                {field.auto ? (
                  <div className="w-36 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-center font-semibold text-blue-700">
                    {readings['reading_1'] || readings['reading_2'] ? autoTotal : '= BP + LBP'}
                  </div>
                ) : (
                  <input
                    type="number"
                    value={readings[field.key] || ''}
                    onChange={e => handleReadingChange(field.key, e.target.value)}
                    className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                    step="any"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Komentar */}
        {meter.hasNotes && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h2 className="font-semibold text-gray-800 mb-3">💬 Komentar</h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Tuliskan catatan, temuan, atau masalah yang ditemukan..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        {/* Inspector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">👤 Inspector</h2>
          <div className="grid grid-cols-3 gap-2">
            {INSPECTORS.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setInspector(name)}
                className={`py-2 px-2 rounded-lg text-sm font-medium border transition-colors ${
                  inspector === name
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-700 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-8">
          <button
            type="button"
            onClick={() => { setReadings({}); setNotes(''); setInspector(''); setError(''); setSuccess(false) }}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : '✓ Submit Checklist'}
          </button>
        </div>

      </div>
    </div>
  )
}