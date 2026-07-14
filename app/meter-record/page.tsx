'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INSPECTOR_OPTIONS } from '@/lib/constants'
import { exportTablePDF } from '@/lib/exportPDF'
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

export default function MeterRecordPage() {
  const supabase = createClient()
  const [selectedId, setSelectedId] = useState(METERS[0].id)
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [readings, setReadings] = useState<Record<string, string>>({})
  const [inspector, setInspector] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingRecord, setExistingRecord] = useState<{ inspector: string; submitted_at: string } | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)

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
      const userId = (await supabase.auth.getUser()).data.user?.id
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
        user_id: userId,
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

  // Token diambil presisi dari pola Dashboard & Assets page:
  // card: background shorthand, radius 8px, padding 24px, shadow saja tanpa border
  // input/select: padding 10px 14px, border 1px var(--border), radius 6px, fontSize 14px
  // button primer: background var(--primary) atau var(--secondary), radius 6px, fontWeight 600
  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: 'var(--shadow)',
    marginBottom: '24px'
  }
  const fieldLabel: React.CSSProperties = {
    display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)'
  }
  const fieldInput: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', background: 'white', boxSizing: 'border-box'
  }
  const btnPrimary: React.CSSProperties = {
    padding: '10px 16px', background: 'var(--primary)', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600
  }
  const btnGold: React.CSSProperties = {
    padding: '12px 24px', background: 'var(--secondary)', color: 'var(--primary)',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600
  }
  const btnNeutral: React.CSSProperties = {
    padding: '12px 24px', background: 'var(--text-secondary)', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
            {meter.icon} {meter.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Frekuensi: {meter.freqLabel}</p>
        </div>

        {/* Selector + Export */}
        <div style={card}>
          <label style={fieldLabel}>Pilih Meter</label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{ ...fieldInput, flex: 1, minWidth: '220px' }}
            >
              {METERS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.icon} {m.name}{m.subtitle ? ` — ${m.subtitle}` : ''}
                </option>
              ))}
            </select>
            <a href="/meter-record/rekap" style={{ ...btnPrimary, backgroundColor: 'var(--secondary)', color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              📊 Rekapitulasi
            </a>
          </div>
        </div>

        {/* Duplicate Warning */}
        {existingRecord && (
          <div style={{ ...card, background: '#d4edda', color: '#155724' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span>✅</span>
              <span style={{ fontWeight: 700 }}>Sudah diisi untuk periode ini</span>
            </div>
            <p style={{ fontSize: '13px', margin: 0 }}>
              PIC: <strong>{existingRecord.inspector}</strong> · Waktu:{' '}
              {new Date(existingRecord.submitted_at).toLocaleString('id-ID')} · Status: ✓ OK
            </p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{ ...card, background: '#e8f4f8', color: '#004085' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>✅ Data berhasil disimpan!</p>
          </div>
        )}

        {/* Informasi Umum */}
        <div style={card}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)', marginBottom: '20px' }}>📋 Informasi Umum</h3>
          <label style={fieldLabel}>
            Tanggal <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={e => setTanggal(e.target.value)}
            style={fieldInput}
          />
        </div>

        {/* Data & Pengukuran */}
        <div style={card}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)', marginBottom: '20px' }}>📊 {meter.sectionTitle}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {meter.fields.map(field => (
              <div key={field.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', flex: 1 }}>{field.label}</span>
                {field.auto ? (
                  <div style={{
                    width: '160px', padding: '10px 14px', borderRadius: '6px', fontSize: '14px',
                    textAlign: 'center', fontWeight: 700, background: '#e8f4f8', color: 'var(--primary)',
                    border: '1px solid var(--border)'
                  }}>
                    {readings['reading_1'] || readings['reading_2'] ? autoTotal : '= BP + LBP'}
                  </div>
                ) : (
                  <input
                    type="number"
                    value={readings[field.key] || ''}
                    onChange={e => handleReadingChange(field.key, e.target.value)}
                    style={{ ...fieldInput, width: '160px', textAlign: 'right' }}
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
          <div style={card}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)', marginBottom: '20px' }}>💬 Komentar</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Tuliskan catatan, temuan, atau masalah yang ditemukan..."
              style={{ ...fieldInput, resize: 'none' }}
            />
          </div>
        )}

        {/* Inspector */}
        <div style={card}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)', marginBottom: '20px' }}>👤 Inspector</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {INSPECTOR_OPTIONS.map(name => {
              const isActive = inspector === name
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setInspector(name)}
                  style={{
                    padding: '10px', borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer',
                    background: isActive ? 'var(--primary)' : 'white',
                    color: isActive ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border)'
                  }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #f5c6cb' }}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setReadings({}); setNotes(''); setInspector(''); setError(''); setSuccess(false) }}
            style={btnNeutral}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{ ...btnGold, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Menyimpan...' : '✓ Submit'}
          </button>
        </div>

        {/* Table / Riwayat */}
        <div ref={tableRef} id="table-meter-records" style={{ ...card, marginBottom: 0 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)', marginBottom: '20px' }}>📊 Riwayat</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>Data akan tampil setelah submit</p>
          </div>
        </div>

      </div>
    </div>
  )
}
