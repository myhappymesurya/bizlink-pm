'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Incident = {
  id: string
  asset_id: string
  reported_at: string
  status: 'open' | 'resolved'
  resolved_at: string | null
}

type ScheduleRow = {
  sub_category: string
  next_due_date: string | null
}

const CATEGORIES_MAP: Record<string, string[]> = {
  'Fire Safety': ['Fire Extinguisher','Fire Hydrant','Emergency Door','Smoke & Heat Detector','Evacuation Lamp','Pompa Pemadam Kebakaran'],
  'HVAC': ['AC Single Split','AC Cassette','AC Single Split Duct Type','AC Multi Split Duct Type','AC Package','Cooling Tower','Exhaust Fan','Adsorption Tower'],
  'Electrical': ['Panel Listrik'],
  'Mechanical': ['Air Compressor','Air Dryer','Pompa Distribusi CT 2 Cell','Pompa Distribusi CT 1 Cell','Pompa Supply CT','Pompa Booster'],
}

export default function KpiAnalyticsPage() {
  const supabase = createClient()
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [assetCategoryMap, setAssetCategoryMap] = useState<Record<string, string>>({})
  const [totalAssetCount, setTotalAssetCount] = useState(0)
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [startDate, endDate])

  async function fetchData() {
    setLoading(true)

    const { data: assets } = await supabase.from('assets').select('id, category')
    const catMap: Record<string, string> = {}
    ;(assets || []).forEach((a: any) => { catMap[a.id] = a.category })
    setAssetCategoryMap(catMap)
    setTotalAssetCount((assets || []).length)

    // Insiden yang reported_at-nya jatuh dalam rentang filter
    const { data: inc } = await supabase
      .from('breakdown_incidents')
      .select('id, asset_id, reported_at, status, resolved_at')
      .gte('reported_at', `${startDate}T00:00:00`)
      .lte('reported_at', `${endDate}T23:59:59`)
      .order('reported_at', { ascending: true })
    setIncidents(inc || [])

    // Semua insiden (tanpa filter tanggal) untuk hitung MTBF antar-kejadian per asset,
    // supaya jarak ke insiden sebelum rentang filter tetap ikut terhitung
    const { data: allInc } = await supabase
      .from('breakdown_incidents')
      .select('id, asset_id, reported_at, status, resolved_at')
      .order('reported_at', { ascending: true })
    setAllIncidents(allInc || [])

    const { data: sch } = await supabase
      .from('pm_schedules')
      .select('sub_category, next_due_date')
      .eq('is_active', true)
    setScheduleRows(sch || [])

    setLoading(false)
  }

  const [allIncidentsState, setAllIncidents] = useState<Incident[]>([])

  // === PM Compliance % — reuse logic yang sama dengan Reports ===
  const todayStr = new Date().toISOString().split('T')[0]
  function isDone(row: ScheduleRow): boolean {
    return row.next_due_date !== null && row.next_due_date >= todayStr
  }
  const totalSchedules = scheduleRows.length
  const doneSchedules = scheduleRows.filter(isDone).length
  const pmCompliance = totalSchedules > 0 ? Math.round((doneSchedules / totalSchedules) * 100) : 0

  // === Breakdown Frequency (dalam rentang filter) ===
  const breakdownFrequency = incidents.length

  // === Closure Rate (dalam rentang filter) ===
  const resolvedInRange = incidents.filter(i => i.status === 'resolved')
  const closureRate = incidents.length > 0 ? Math.round((resolvedInRange.length / incidents.length) * 100) : 0

  // === MTTR (jam), dari insiden resolved dalam rentang filter ===
  function hoursBetween(a: string, b: string): number {
    return (new Date(b).getTime() - new Date(a).getTime()) / 3600000
  }
  const mttrValues = resolvedInRange
    .filter(i => i.resolved_at)
    .map(i => hoursBetween(i.reported_at, i.resolved_at!))
  const mttr = mttrValues.length > 0
    ? Math.round((mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length) * 10) / 10
    : null

  // === MTBF (jam), pakai SEMUA insiden historis (bukan cuma dalam rentang filter) ===
  // supaya jarak ke insiden sebelumnya di luar rentang tetap terhitung akurat
  const incidentsByAsset: Record<string, Incident[]> = {}
  allIncidentsState.forEach(i => {
    if (!incidentsByAsset[i.asset_id]) incidentsByAsset[i.asset_id] = []
    incidentsByAsset[i.asset_id].push(i)
  })
  const gapsPerAsset: number[] = []
  Object.values(incidentsByAsset).forEach(list => {
    for (let i = 1; i < list.length; i++) {
      gapsPerAsset.push(hoursBetween(list[i - 1].reported_at, list[i].reported_at))
    }
  })
  const mtbf = gapsPerAsset.length > 0
    ? Math.round((gapsPerAsset.reduce((a, b) => a + b, 0) / gapsPerAsset.length))
    : null

  // === Equipment Availability % (dalam rentang filter) ===
  const periodHours = hoursBetween(`${startDate}T00:00:00`, `${endDate}T23:59:59`)
  const totalDowntimeHours = incidents.reduce((sum, i) => {
    const end = i.resolved_at || new Date().toISOString()
    return sum + hoursBetween(i.reported_at, end)
  }, 0)
  const totalPossibleHours = totalAssetCount * periodHours
  const availability = totalPossibleHours > 0
    ? Math.max(0, Math.round((1 - totalDowntimeHours / totalPossibleHours) * 1000) / 10)
    : null

  // === Breakdown Frequency per kategori (bar chart) ===
  const byCategory: Record<string, number> = {}
  incidents.forEach(i => {
    const cat = assetCategoryMap[i.asset_id] || 'Lainnya'
    byCategory[cat] = (byCategory[cat] || 0) + 1
  })
  const categoryChartData = Object.entries(byCategory).map(([name, value]) => ({ name, jumlah: value }))

  // === Trend per bulan: jumlah breakdown & rata-rata MTTR (line chart) ===
  const byMonth: Record<string, { count: number; mttrSum: number; mttrCount: number }> = {}
  incidents.forEach(i => {
    const monthKey = i.reported_at.slice(0, 7) // YYYY-MM
    if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, mttrSum: 0, mttrCount: 0 }
    byMonth[monthKey].count++
    if (i.status === 'resolved' && i.resolved_at) {
      byMonth[monthKey].mttrSum += hoursBetween(i.reported_at, i.resolved_at)
      byMonth[monthKey].mttrCount++
    }
  })
  const trendData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      jumlahBreakdown: v.count,
      rataMttr: v.mttrCount > 0 ? Math.round((v.mttrSum / v.mttrCount) * 10) / 10 : 0,
    }))

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
    boxShadow: 'var(--shadow)', marginBottom: '24px'
  }
  const fieldInput: React.CSSProperties = {
    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px'
  }

  function formatHours(h: number | null): string {
    if (h === null) return '—'
    if (h < 24) return `${h} jam`
    return `${Math.round(h / 24 * 10) / 10} hari`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>KPI Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Metrik kinerja maintenance — preventive & reactive
          </p>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Dari</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={fieldInput} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Sampai</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={fieldInput} />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'PM Compliance', value: `${pmCompliance}%`, color: pmCompliance >= 80 ? 'var(--success)' : pmCompliance >= 50 ? 'var(--warning)' : 'var(--danger)' },
                { label: 'MTBF', value: formatHours(mtbf), color: 'var(--primary)' },
                { label: 'MTTR', value: formatHours(mttr), color: 'var(--accent)' },
                { label: 'Breakdown Frequency', value: breakdownFrequency, color: 'var(--warning)' },
                { label: 'Closure Rate', value: `${closureRate}%`, color: closureRate >= 80 ? 'var(--success)' : 'var(--warning)' },
                { label: 'Availability', value: availability !== null ? `${availability}%` : '—', color: 'var(--success)' },
              ].map(k => (
                <div key={k.label} style={{ ...card, marginBottom: 0, padding: 16, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{k.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
              <div style={{ ...card, marginBottom: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>
                  Tren Breakdown & MTTR per Bulan
                </h3>
                {trendData.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Tidak ada data untuk periode ini</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="jumlahBreakdown" stroke="var(--danger)" name="Jumlah Breakdown" />
                      <Line type="monotone" dataKey="rataMttr" stroke="var(--accent)" name="Rata-rata MTTR (jam)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div style={{ ...card, marginBottom: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>
                  Breakdown Frequency per Kategori
                </h3>
                {categoryChartData.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Tidak ada data untuk periode ini</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="jumlah" fill="var(--warning)" name="Jumlah Breakdown" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div style={{ ...card, marginTop: 24, marginBottom: 0 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                <strong>Catatan:</strong> PM Compliance menunjukkan status terkini (tidak terikat rentang tanggal di atas).
                MTBF dihitung dari seluruh riwayat insiden per unit (bukan hanya dalam rentang filter) untuk akurasi jarak antar-kejadian.
                Availability dihitung dari total downtime dibanding total jam operasional seluruh unit dalam periode terpilih.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
