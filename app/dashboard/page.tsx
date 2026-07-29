'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Instance = { id: string; status: string; due_date: string | null; scheduled_date: string }
type Incident = { id: string; asset_id: string; reported_at: string; status: 'open' | 'resolved'; resolved_at: string | null }
type ScheduleRow = { next_due_date: string | null }
type Asset = { id: string; category: string; status: string }
type SparepartUsageRow = { sparepart_id: string; quantity: number; created_at: string }
type Sparepart = { id: string; name: string }
type MeterRecord = { meter_id: string; meter_name: string; reading_1: number | null; total: number | null; tanggal: string }
type RunningHoursLog = { equipment_type: string; duration_minutes: number | null; tanggal: string }

const EQUIPMENT_LABELS: Record<string, string> = {
  'air-compressor': 'Air Compressor',
  'air-dryer': 'Air Dryer',
  'ac-package': 'AC Package',
  'cooling-tower': 'Cooling Tower',
  'exhaust': 'Exhaust',
  'adsorption-tower': 'Adsorption Tower',
  'pompa-ct2': 'Pompa Dist. CT 2 Cell',
  'pompa-ct1': 'Pompa Dist. CT 1 Cell',
}

export default function DashboardPage() {
  const supabase = createClient()
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)

  const [instances, setInstances] = useState<Instance[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [allIncidents, setAllIncidents] = useState<Incident[]>([])
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [sparepartUsage, setSparepartUsage] = useState<SparepartUsageRow[]>([])
  const [spareparts, setSpareparts] = useState<Sparepart[]>([])
  const [meterRecords, setMeterRecords] = useState<MeterRecord[]>([])
  const [runningHours, setRunningHours] = useState<RunningHoursLog[]>([])

  useEffect(() => { fetchAll() }, [startDate, endDate])

  async function fetchAll() {
    setLoading(true)

    const [
      { data: inst },
      { data: inc },
      { data: allInc },
      { data: sch },
      { data: ast },
      { data: usage },
      { data: parts },
      { data: meters },
      { data: rh },
    ] = await Promise.all([
      supabase.from('pm_task_instances').select('id, status, due_date, scheduled_date'),
      supabase.from('breakdown_incidents').select('id, asset_id, reported_at, status, resolved_at')
        .gte('reported_at', `${startDate}T00:00:00`).lte('reported_at', `${endDate}T23:59:59`),
      supabase.from('breakdown_incidents').select('id, asset_id, reported_at, status, resolved_at').order('reported_at', { ascending: true }),
      supabase.from('pm_schedules').select('next_due_date').eq('is_active', true),
      supabase.from('assets').select('id, category, status'),
      supabase.from('sparepart_usage').select('sparepart_id, quantity, created_at')
        .gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`),
      supabase.from('spareparts').select('id, name'),
      supabase.from('meter_records').select('meter_id, meter_name, reading_1, total, tanggal')
        .gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal', { ascending: true }),
      supabase.from('running_hours_logs').select('equipment_type, duration_minutes, tanggal')
        .gte('tanggal', startDate).lte('tanggal', endDate),
    ])

    setInstances(inst || [])
    setIncidents(inc || [])
    setAllIncidents(allInc || [])
    setScheduleRows(sch || [])
    setAssets(ast || [])
    setSparepartUsage(usage || [])
    setSpareparts(parts || [])
    setMeterRecords(meters || [])
    setRunningHours(rh || [])
    setLoading(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  function hoursBetween(a: string, b: string): number {
    return (new Date(b).getTime() - new Date(a).getTime()) / 3600000
  }
  function formatHours(h: number | null): string {
    if (h === null) return '—'
    if (h < 24) return `${Math.round(h * 10) / 10} jam`
    return `${Math.round(h / 24 * 10) / 10} hari`
  }
  function formatMinutes(m: number): string {
    const h = Math.floor(m / 60)
    const mm = Math.round(m % 60)
    return `${h}j ${mm}m`
  }

  // === Work Orders ===
  function isOverdue(i: Instance) {
    return i.status === 'pending' && !!i.due_date && i.due_date < todayStr
  }
  const woOpenCount = instances.filter(i => i.status === 'pending').length
  const woClosedCount = instances.filter(i => i.status === 'completed').length
  const woOverdueCount = instances.filter(isOverdue).length
  const woOpenNotOverdue = woOpenCount - woOverdueCount // untuk donut, mutually exclusive
  const woTotal = woOpenCount + woClosedCount

  // === KPI (breakdown_incidents) — sama persis logic KPI Analytics ===
  function isDone(row: ScheduleRow): boolean {
    return row.next_due_date !== null && row.next_due_date >= todayStr
  }
  const totalSchedules = scheduleRows.length
  const doneSchedules = scheduleRows.filter(isDone).length
  const pmCompliance = totalSchedules > 0 ? Math.round((doneSchedules / totalSchedules) * 100) : 0

  const resolvedInRange = incidents.filter(i => i.status === 'resolved')
  const closureRate = incidents.length > 0 ? Math.round((resolvedInRange.length / incidents.length) * 100) : 0
  const breakdownFrequency = incidents.length

  const mttrValues = resolvedInRange.filter(i => i.resolved_at).map(i => hoursBetween(i.reported_at, i.resolved_at!))
  const mttr = mttrValues.length > 0 ? Math.round((mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length) * 10) / 10 : null

  const incidentsByAsset: Record<string, Incident[]> = {}
  allIncidents.forEach(i => {
    if (!incidentsByAsset[i.asset_id]) incidentsByAsset[i.asset_id] = []
    incidentsByAsset[i.asset_id].push(i)
  })
  const gaps: number[] = []
  Object.values(incidentsByAsset).forEach(list => {
    for (let i = 1; i < list.length; i++) gaps.push(hoursBetween(list[i - 1].reported_at, list[i].reported_at))
  })
  const mtbf = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null

  const periodHours = hoursBetween(`${startDate}T00:00:00`, `${endDate}T23:59:59`)
  const totalDowntimeHours = incidents.reduce((sum, i) => {
    const end = i.resolved_at || new Date().toISOString()
    return sum + hoursBetween(i.reported_at, end)
  }, 0)
  const totalPossibleHours = assets.length * periodHours
  const availability = totalPossibleHours > 0
    ? Math.max(0, Math.round((1 - totalDowntimeHours / totalPossibleHours) * 1000) / 10)
    : null

  // === Assets ===
  const totalAssets = assets.length
  const activeAssets = assets.filter(a => a.status === 'active').length
  const expiredAssets = assets.filter(a => a.status === 'expired').length

  // === Sparepart terpakai — join manual ke nama part, agregasi per part ===
  const sparepartNameMap = new Map(spareparts.map(p => [p.id, p.name]))
  const sparepartAgg: Record<string, number> = {}
  sparepartUsage.forEach(u => {
    const name = sparepartNameMap.get(u.sparepart_id) || 'Tidak diketahui'
    sparepartAgg[name] = (sparepartAgg[name] || 0) + Number(u.quantity)
  })
  const sparepartList = Object.entries(sparepartAgg).sort((a, b) => b[1] - a[1]).slice(0, 6)

  // === Meter — reuse logic exact dari Reports (selisih first-last dalam periode) ===
  const byMeter: Record<string, { name: string; first: number; last: number }> = {}
  meterRecords.forEach(m => {
    const val = m.meter_id === 'kwh-gardu-pln' ? (m.total ?? 0) : (m.reading_1 ?? 0)
    if (!byMeter[m.meter_id]) byMeter[m.meter_id] = { name: m.meter_name, first: val, last: val }
    byMeter[m.meter_id].last = val
  })
  const meterList = Object.entries(byMeter).map(([id, v]) => ({
    id, name: v.name, total: Math.round((v.last - v.first) * 100) / 100
  }))

  // === Running Hours — sum duration_minutes per equipment_type ===
  const byEquipType: Record<string, number> = {}
  runningHours.forEach(r => {
    byEquipType[r.equipment_type] = (byEquipType[r.equipment_type] || 0) + (r.duration_minutes || 0)
  })
  const runningHoursList = Object.entries(byEquipType).sort((a, b) => b[1] - a[1])

  // === Trend chart: submission checklist vs breakdown per bulan (breakdown dari incidents) ===
  const byMonth: Record<string, { breakdown: number }> = {}
  incidents.forEach(i => {
    const key = i.reported_at.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = { breakdown: 0 }
    byMonth[key].breakdown++
  })
  const trendData = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, breakdown: v.breakdown }))

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '20px', borderRadius: '8px', boxShadow: 'var(--shadow)'
  }
  const fieldInput: React.CSSProperties = {
    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px'
  }
  const miniStat = (label: string, value: string | number, color: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{value}</p>
      </div>
    </div>
  )

  const donutTotal = woOpenNotOverdue + woOverdueCount + woClosedCount || 1
  const openDeg = (woOpenNotOverdue / donutTotal) * 360
  const overdueDeg = (woOverdueCount / donutTotal) * 360

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Ringkasan kinerja preventive & reactive maintenance
          </p>
        </div>

        <div style={{ ...card, marginBottom: 24 }}>
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
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 20 }}>
                {miniStat('Open WO', woOpenCount, 'var(--warning)')}
                {miniStat('Closed WO', woClosedCount, 'var(--success)')}
                {miniStat('Overdue WO', woOverdueCount, 'var(--danger)')}
                {miniStat('MTTR', formatHours(mttr), 'var(--accent)')}
                {miniStat('MTBF', formatHours(mtbf), 'var(--primary)')}
                {miniStat('PM Compliance', `${pmCompliance}%`, 'var(--success)')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
                {miniStat('Availability', availability !== null ? `${availability}%` : '—', 'var(--primary)')}
                {miniStat('Closure Rate', `${closureRate}%`, 'var(--accent)')}
                {miniStat('Breakdown Aktif', breakdownFrequency, 'var(--danger)')}
                {miniStat('Total Assets', totalAssets, 'var(--warning)')}
                {miniStat('Active', activeAssets, 'var(--success)')}
                {miniStat('Expired', expiredAssets, 'var(--danger)')}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div style={card}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>Sparepart Terpakai</h3>
                {sparepartList.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tidak ada pemakaian pada periode ini</p>
                ) : (
                  sparepartList.map(([name, qty]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                      <span style={{ fontWeight: 600 }}>{qty}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 12, alignSelf: 'flex-start' }}>Status Work Order</h3>
                <div style={{
                  width: 110, height: 110, borderRadius: '50%',
                  background: `conic-gradient(var(--warning) 0deg ${openDeg}deg, var(--danger) ${openDeg}deg ${openDeg + overdueDeg}deg, var(--success) ${openDeg + overdueDeg}deg 360deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{woTotal}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>total</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', marginRight: 4 }} />Open</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', marginRight: 4 }} />Overdue</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', marginRight: 4 }} />Closed</span>
                </div>
              </div>

              <div style={card}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>Tren Breakdown per Bulan</h3>
                {trendData.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tidak ada data untuk periode ini</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="breakdown" stroke="var(--danger)" name="Breakdown" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              <div style={card}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>Meter Record (Periode Ini)</h3>
                {meterList.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tidak ada data meter untuk periode ini</p>
                ) : (
                  meterList.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{m.total.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={card}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>Running Hours (Periode Ini)</h3>
                {runningHoursList.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tidak ada data running hours untuk periode ini</p>
                ) : (
                  runningHoursList.map(([type, mins]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{EQUIPMENT_LABELS[type] || type}</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatMinutes(mins)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/assets" style={{ padding: '12px 24px', background: 'var(--secondary)', color: 'var(--primary)', textDecoration: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14 }}>
                📋 Manage Assets
              </a>
              <a href="/checklist" style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', textDecoration: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14 }}>
                ✓ View Checklists
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
