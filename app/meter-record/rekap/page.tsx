'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type MeterInfo = { id: string; name: string; subtitle: string; icon: string; unit: string; frequency: 'Daily' | 'Monthly' }

const METERS: MeterInfo[] = [
  { id: 'kwh-transformer', name: 'KWh Meter Record', subtitle: 'Transformer Room', icon: '⚡', unit: 'kWh', frequency: 'Daily' },
  { id: 'kwh-gardu-pln', name: 'KWh Meter Record', subtitle: 'Gardu PLN', icon: '⚡', unit: 'kWh', frequency: 'Daily' },
  { id: 'water-meter', name: 'Water Meter Record', subtitle: 'WM-01', icon: '💧', unit: 'm³', frequency: 'Daily' },
  { id: 'ct-water-meter', name: 'CT Water Meter', subtitle: '', icon: '🌀', unit: '', frequency: 'Daily' },
  { id: 'daily-supply-water', name: 'Daily Supply Water Meter', subtitle: '', icon: '🏠', unit: '', frequency: 'Daily' },
  { id: 'fire-hydrant-water', name: 'Fire Hydrant Water Meter', subtitle: 'FH-WM', icon: '🚒', unit: '', frequency: 'Monthly' },
  { id: 'sprinkler-water', name: 'Sprinkler Water Meter', subtitle: 'SPR-WM', icon: '💦', unit: '', frequency: 'Monthly' },
  { id: 'rain-water-harvest', name: 'Rain Water Harvest Meter', subtitle: 'RW-WM', icon: '🌧️', unit: '', frequency: 'Monthly' },
]

type RawRecord = {
  id: string
  tanggal: string
  reading_1: number | null
  reading_2: number | null
  total: number | null
  inspector: string
  notes: string | null
}

type UsageRow = {
  id: string
  tanggal: string
  value: number
  pemakaian: number | null
  inspector: string
  gapDays: number | null
  isGapWarning: boolean
}

function getValue(r: RawRecord, meterId: string): number {
  if (meterId === 'kwh-gardu-pln') return r.total ?? 0
  return r.reading_1 ?? 0
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function bucketKey(dateStr: string, granularity: string): string {
  if (granularity === 'daily') return dateStr
  if (granularity === 'weekly') return getWeekStart(dateStr)
  if (granularity === 'monthly') return dateStr.slice(0, 7)
  return dateStr.slice(0, 4) // yearly
}

export default function RekapMeterRecordPage() {
  const supabase = createClient()
  const printRef = useRef<HTMLDivElement>(null)
  const [selectedMeter, setSelectedMeter] = useState(METERS[0].id)
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [raw, setRaw] = useState<RawRecord[]>([])
  const [loading, setLoading] = useState(true)

  const meter = METERS.find(m => m.id === selectedMeter)!

  useEffect(() => { fetchData() }, [selectedMeter, startDate, endDate])

  async function fetchData() {
    setLoading(true)
    // Ambil juga 1 record sebelum startDate supaya pemakaian di awal range tetap bisa dihitung
    const { data: prevRow } = await supabase
      .from('meter_records')
      .select('id, tanggal, reading_1, reading_2, total, inspector, notes')
      .eq('meter_id', selectedMeter)
      .lt('tanggal', startDate)
      .order('tanggal', { ascending: false })
      .limit(1)

    const { data } = await supabase
      .from('meter_records')
      .select('id, tanggal, reading_1, reading_2, total, inspector, notes')
      .eq('meter_id', selectedMeter)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: true })

    const combined = [...(prevRow || []), ...(data || [])]
    setRaw(combined)
    setLoading(false)
  }

  const gapThresholdDays = meter.frequency === 'Monthly' ? 45 : 3

  // Hitung pemakaian = selisih dari reading sebelumnya
  const usageRows: UsageRow[] = raw.map((r, i) => {
    const value = getValue(r, selectedMeter)
    const prevRecord = i > 0 ? raw[i - 1] : null
    const prev = prevRecord !== null ? getValue(prevRecord, selectedMeter) : null
    const gapDays = prevRecord !== null
      ? Math.round((new Date(r.tanggal).getTime() - new Date(prevRecord.tanggal).getTime()) / 86400000)
      : null
    return {
      id: r.id,
      tanggal: r.tanggal,
      value,
      pemakaian: prev !== null ? value - prev : null,
      inspector: r.inspector,
      gapDays,
      isGapWarning: gapDays !== null && gapDays > gapThresholdDays,
    }
  }).filter(row => {
    return row.tanggal >= startDate && row.tanggal <= endDate
  })

  // Bucket ke chart data
  const bucketMap: Record<string, number> = {}
  usageRows.forEach(row => {
    if (row.pemakaian === null) return
    const key = bucketKey(row.tanggal, granularity)
    bucketMap[key] = (bucketMap[key] || 0) + row.pemakaian
  })
  const chartData = Object.entries(bucketMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, pemakaian]) => ({ period, pemakaian: Math.round(pemakaian * 100) / 100 }))

  const totalPemakaian = usageRows.reduce((a, r) => a + (r.pemakaian || 0), 0)

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
    boxShadow: 'var(--shadow)', marginBottom: '24px'
  }
  const fieldInput: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', background: 'white', boxSizing: 'border-box'
  }

  async function handleExportPDF() {
    if (!printRef.current) return
    const { default: html2pdf } = await import('html2pdf.js')
    html2pdf().set({
      margin: 10,
      filename: `rekap-meter-${selectedMeter}-${startDate}_${endDate}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).from(printRef.current).save()
  }

  const granularityLabels: Record<string, string> = {
    daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
              📊 Rekapitulasi Meter Record
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: 4 }}>
              Tren pemakaian per periode
            </p>
          </div>
          <button onClick={handleExportPDF} style={{
            padding: '10px 20px', background: 'var(--secondary)', color: 'var(--primary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
          }}>
            📄 Export PDF
          </button>
        </div>

        {/* Filter */}
        <div style={card}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Meter</label>
              <select value={selectedMeter} onChange={e => setSelectedMeter(e.target.value)} style={fieldInput}>
                {METERS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.icon} {m.name}{m.subtitle ? ` — ${m.subtitle}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Granularitas</label>
              <select value={granularity} onChange={e => setGranularity(e.target.value as any)} style={fieldInput}>
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
              </select>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Dari</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={fieldInput} />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Sampai</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={fieldInput} />
            </div>
          </div>
        </div>

        <div ref={printRef}>
          {/* Chart */}
          <div style={card}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
              Tren Pemakaian — {granularityLabels[granularity]}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Total periode ini: <strong style={{ color: 'var(--primary)' }}>{totalPemakaian.toFixed(2)} {meter.unit}</strong>
            </p>
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Memuat data...</p>
            ) : chartData.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tidak ada data pemakaian untuk periode ini</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [`${v} ${meter.unit}`, 'Pemakaian']} />
                  <Bar dataKey="pemakaian" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Detail Table */}
          <div style={{ ...card, marginBottom: 0, overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>Detail Submission</h3>
            </div>
            {usageRows.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Tidak ada data</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: 'white' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left' }}>Tanggal</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center' }}>Reading</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center' }}>Pemakaian</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left' }}>Inspector</th>
                  </tr>
                </thead>
                <tbody>
                  {usageRows.slice().reverse().map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'white' : 'var(--bg-main)' }}>
                      <td style={{ padding: '10px 16px' }}>{r.tanggal}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600 }}>{r.value} {meter.unit}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', color: r.isGapWarning ? 'var(--warning)' : 'var(--accent)', fontWeight: 600 }}>
                        {r.pemakaian !== null ? (
                          <span title={r.isGapWarning ? `Jarak ${r.gapDays} hari dari pencatatan sebelumnya — angka ini mewakili beberapa periode sekaligus` : undefined}>
                            {r.isGapWarning ? '⚠️ ' : ''}{r.pemakaian.toFixed(2)} {meter.unit}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>{r.inspector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}