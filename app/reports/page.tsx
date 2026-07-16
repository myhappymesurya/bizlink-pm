'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

type Submission = {
  id: string
  asset_id: string
  category: string
  sub_category: string
  location: string
  status: string
  inspector: string
  submitted_at: string
  approved_at: string | null
  approved_by: string | null
}

type ScheduleRow = {
  asset_id: string
  sub_category: string
  frequency: string
  next_due_date: string | null
}

type ReportType = 'summary' | 'compliance' | 'combined'

const STATUS_COLORS: Record<string, string> = {
  ok: '#27ae60', nok: '#e74c3c', corrected: '#f39c12', approved: '#2d9cca'
}

const CATEGORIES_MAP: Record<string, string[]> = {
  'Fire Safety': ['Fire Extinguisher','Fire Hydrant','Emergency Door','Smoke & Heat Detector','Evacuation Lamp','Pompa Pemadam Kebakaran'],
  'HVAC': ['AC Single Split','AC Cassette','AC Single Split Duct Type','AC Multi Split Duct Type','AC Package','Cooling Tower','Exhaust Fan','Adsorption Tower'],
  'Electrical': ['Panel Listrik'],
  'Mechanical': ['Air Compressor','Air Dryer','Pompa Distribusi CT 2 Cell','Pompa Distribusi CT 1 Cell','Pompa Supply CT','Pompa Booster'],
}

export default function ReportsPage() {
  const supabase = createClient()
  const printRef = useRef<HTMLDivElement>(null)
  const [reportType, setReportType] = useState<ReportType>('summary')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [approverNames, setApproverNames] = useState<Record<string, string>>({})
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([])
  const [assetStats, setAssetStats] = useState({ total: 0, active: 0, expired: 0 })
  const [meterTotal, setMeterTotal] = useState<{ meter: string; unit: string; total: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  useEffect(() => { setSubCategory('') }, [category])
  useEffect(() => { fetchData() }, [reportType, startDate, endDate, category, subCategory])

  async function fetchData() {
    setLoading(true)

    let subQuery = supabase
      .from('checklist_submissions')
      .select('*')
      .gte('submitted_at', `${startDate}T00:00:00`)
      .lte('submitted_at', `${endDate}T23:59:59`)
      .order('submitted_at', { ascending: false })
    if (category) subQuery = subQuery.eq('category', category)
    if (subCategory) subQuery = subQuery.eq('sub_category', subCategory)
    const { data: subs } = await subQuery
    setSubmissions(subs || [])

    if (reportType === 'compliance') {
      const ids = [...new Set((subs || []).map(s => s.approved_by).filter(Boolean))] as string[]
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids)
        const map: Record<string, string> = {}
        ;(profiles || []).forEach(p => { map[p.id] = p.full_name })
        setApproverNames(map)
      } else {
        setApproverNames({})
      }

      // Snapshot "belum dicek" — independen dari rentang tanggal, ikut filter kategori
      let schQuery = supabase
        .from('pm_schedules')
        .select('asset_id, sub_category, frequency, next_due_date')
        .eq('is_active', true)
      if (subCategory) {
        schQuery = schQuery.eq('sub_category', subCategory)
      } else if (category) {
        schQuery = schQuery.in('sub_category', CATEGORIES_MAP[category] || [])
      }
      const { data: sch } = await schQuery
      setScheduleRows(sch || [])
    }

    if (reportType === 'combined') {
      const { data: assets } = await supabase.from('assets').select('status')
      const list = assets || []
      setAssetStats({
        total: list.length,
        active: list.filter((a: any) => a.status === 'active').length,
        expired: list.filter((a: any) => a.status === 'expired').length,
      })

      const { data: meters } = await supabase
        .from('meter_records')
        .select('meter_id, meter_name, reading_1, total')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true })

      const byMeter: Record<string, { name: string; first: number; last: number }> = {}
      ;(meters || []).forEach((m: any) => {
        const val = m.meter_id === 'kwh-gardu-pln' ? (m.total ?? 0) : (m.reading_1 ?? 0)
        if (!byMeter[m.meter_id]) byMeter[m.meter_id] = { name: m.meter_name, first: val, last: val }
        byMeter[m.meter_id].last = val
      })
      setMeterTotal(Object.entries(byMeter).map(([id, v]) => ({
        meter: v.name, unit: id === 'kwh-transformer' || id === 'kwh-gardu-pln' ? 'kWh' : '',
        total: Math.round((v.last - v.first) * 100) / 100
      })))
    }

    setLoading(false)
  }

  async function handleExportPDF() {
    if (!printRef.current) return
    const { default: html2pdf } = await import('html2pdf.js')
    html2pdf().set({
      margin: 10,
      filename: `report-${reportType}-${startDate}_${endDate}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(printRef.current).save()
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
    boxShadow: 'var(--shadow)', marginBottom: '24px'
  }
  const fieldInput: React.CSSProperties = {
    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px'
  }

  // === Data olahan untuk Summary ===
  const statusCounts = { ok: 0, nok: 0, corrected: 0, approved: 0 }
  submissions.forEach(s => { if (s.status in statusCounts) (statusCounts as any)[s.status]++ })
  const total = submissions.length

  const byCategory: Record<string, { total: number; ok: number; nok: number }> = {}
  submissions.forEach(s => {
    if (!byCategory[s.sub_category]) byCategory[s.sub_category] = { total: 0, ok: 0, nok: 0 }
    byCategory[s.sub_category].total++
    if (s.status === 'ok' || s.status === 'approved') byCategory[s.sub_category].ok++
    if (s.status === 'nok') byCategory[s.sub_category].nok++
  })
  const categoryChartData = Object.entries(byCategory).map(([name, v]) => ({ name, ...v }))
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)

  // === Data olahan untuk "Unit Belum Dicek" (compliance) ===
  const todayStr = new Date().toISOString().split('T')[0]
  function isDone(row: ScheduleRow): boolean {
    return row.next_due_date !== null && row.next_due_date >= todayStr
  }
  const missingByCategory: Record<string, { total: number; done: number; missing: ScheduleRow[] }> = {}
  scheduleRows.forEach(row => {
    if (!missingByCategory[row.sub_category]) missingByCategory[row.sub_category] = { total: 0, done: 0, missing: [] }
    missingByCategory[row.sub_category].total++
    if (isDone(row)) missingByCategory[row.sub_category].done++
    else missingByCategory[row.sub_category].missing.push(row)
  })
  const missingSummaries = Object.entries(missingByCategory)
    .map(([sub_category, v]) => ({ sub_category, ...v }))
    .sort((a, b) => (a.done / a.total) - (b.done / b.total))

  function daysOverdue(dateStr: string): number {
    return Math.round((new Date(todayStr).getTime() - new Date(dateStr).getTime()) / 86400000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Reports</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Laporan kinerja dan audit PM</p>
          </div>
          <button onClick={handleExportPDF} style={{
            padding: '10px 20px', background: 'var(--secondary)', color: 'var(--primary)',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14
          }}>
            📄 Export PDF
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'summary', label: '📊 Ringkasan Kinerja' },
            { key: 'compliance', label: '📋 Compliance / Audit' },
            { key: 'combined', label: '🗂️ Gabungan' },
          ].map(t => (
            <button key={t.key} onClick={() => setReportType(t.key as ReportType)}
              style={{
                padding: '10px 18px', border: 'none', borderRadius: 20, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: reportType === t.key ? 'var(--primary)' : 'var(--bg-card)',
                color: reportType === t.key ? 'white' : 'var(--text-primary)',
                boxShadow: 'var(--shadow)'
              }}>
              {t.label}
            </button>
          ))}
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
            {reportType === 'compliance' && (
              <>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Kategori</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={fieldInput}>
                    <option value="">Semua Kategori</option>
                    {Object.keys(CATEGORIES_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {category && (
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Sub-kategori</label>
                    <select value={subCategory} onChange={e => setSubCategory(e.target.value)} style={fieldInput}>
                      <option value="">Semua Sub-kategori</option>
                      {CATEGORIES_MAP[category].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div ref={printRef}>
          {loading ? (
            <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data...</div>
          ) : reportType === 'summary' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Submission', value: total, color: 'var(--primary)' },
                  { label: 'OK', value: statusCounts.ok, color: 'var(--success)' },
                  { label: 'NOK', value: statusCounts.nok, color: 'var(--danger)' },
                  { label: 'Corrected', value: statusCounts.corrected, color: 'var(--warning)' },
                  { label: 'Approved', value: statusCounts.approved, color: 'var(--accent)' },
                ].map(k => (
                  <div key={k.label} style={{ ...card, marginBottom: 0, padding: 16, textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{k.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                <div style={{ ...card, marginBottom: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>Distribusi Status</h3>
                  {pieData.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Tidak ada data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                          label={(e) => `${e.name}: ${e.value}`}>
                          {pieData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.name] || '#999'} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div style={{ ...card, marginBottom: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>Per Kategori</h3>
                  {categoryChartData.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Tidak ada data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="ok" fill="var(--success)" name="OK" />
                        <Bar dataKey="nok" fill="var(--danger)" name="NOK" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          ) : reportType === 'compliance' ? (
            <>
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
                    Detail Audit — {submissions.length} record
                  </h3>
                </div>
                {submissions.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Tidak ada data</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--primary)', color: 'white' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Unit</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Kategori</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Submit</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Inspector</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Approved</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Oleh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s, i) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'white' : 'var(--bg-main)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.asset_id}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{s.sub_category}</td>
                          <td style={{ padding: '8px 12px' }}>{new Date(s.submitted_at).toLocaleDateString('id-ID')}</td>
                          <td style={{ padding: '8px 12px' }}>{s.inspector}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ color: STATUS_COLORS[s.status] || '#666', fontWeight: 600 }}>{s.status.toUpperCase()}</span>
                          </td>
                          <td style={{ padding: '8px 12px' }}>{s.approved_at ? new Date(s.approved_at).toLocaleDateString('id-ID') : '—'}</td>
                          <td style={{ padding: '8px 12px' }}>{s.approved_by ? (approverNames[s.approved_by] || '(user tidak ditemukan)') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Unit Belum Dicek — snapshot saat ini, tidak terikat rentang tanggal */}
              <div style={{ ...card, marginBottom: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>
                  ⚠️ Unit Belum Dicek (Status Saat Ini)
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Bagian ini menunjukkan kondisi terkini, tidak dipengaruhi rentang tanggal di atas.
                </p>
                {missingSummaries.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tidak ada data untuk filter ini</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {missingSummaries.map(s => {
                      const pct = s.total > 0 ? Math.round(s.done / s.total * 100) : 0
                      const isExpanded = expandedCat === s.sub_category
                      const barColor = pct === 100 ? 'var(--success)' : pct >= 50 ? 'var(--accent)' : 'var(--warning)'
                      return (
                        <div key={s.sub_category} style={{ border: '1px solid var(--border-light)', borderRadius: 8 }}>
                          <div onClick={() => setExpandedCat(isExpanded ? null : s.sub_category)}
                            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{isExpanded ? '▼' : '▶'} {s.sub_category}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{s.done}/{s.total} ({pct}%)</span>
                          </div>
                          {isExpanded && s.missing.length > 0 && (
                            <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {s.missing.map(m => (
                                <span key={m.asset_id} style={{
                                  fontSize: 11, padding: '3px 8px', borderRadius: 10,
                                  background: m.next_due_date === null ? '#fdecea' : '#fff8e6',
                                  color: m.next_due_date === null ? 'var(--danger)' : 'var(--warning)', fontWeight: 600
                                }}>
                                  {m.asset_id}{m.next_due_date !== null ? ` (${daysOverdue(m.next_due_date)}h)` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Assets', value: assetStats.total, color: 'var(--primary)' },
                  { label: 'Active', value: assetStats.active, color: 'var(--success)' },
                  { label: 'Expired', value: assetStats.expired, color: 'var(--danger)' },
                  { label: 'Submission Periode Ini', value: total, color: 'var(--accent)' },
                ].map(k => (
                  <div key={k.label} style={{ ...card, marginBottom: 0, padding: 16, textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{k.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ ...card, marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>Pemakaian Meter (Periode Ini)</h3>
                {meterTotal.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Tidak ada data meter untuk periode ini</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                        <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Meter</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Total Pemakaian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meterTotal.map(m => (
                        <tr key={m.meter} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px' }}>{m.meter}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                            {m.total.toFixed(2)} {m.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ ...card, marginBottom: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>Ringkasan Checklist</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {statusCounts.ok + statusCounts.approved} OK/Approved, {statusCounts.nok} NOK, {statusCounts.corrected} Corrected
                  dari {total} submission pada periode {startDate} s.d. {endDate}.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}