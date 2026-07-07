'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type LogRecord = {
  id: string
  equipment_type: string
  equipment_name: string
  tanggal: string
  duration_minutes: number | null
  phase1_at: string
  phase2_at: string
  notes: string
}

type RekapUnit = {
  equipment_name: string
  equipment_type: string
  total_minutes: number
  total_sessions: number
  daily: Record<string, number>
}

const EQUIPMENT_LABELS: Record<string, string> = {
  'air-compressor': '⚙️ Air Compressor',
  'air-dryer': '💨 Air Dryer',
  'ac-package': '❄️ AC Package',
  'cooling-tower': '🌀 Cooling Tower',
  'exhaust': '🔵 Exhaust',
  'adsorption-tower': '🏭 Adsorption Tower',
  'pompa-ct2': '🔧 Pompa Dist. CT 2 Cell',
  'pompa-ct1': '🔧 Pompa Dist. CT 1 Cell',
}

export default function RekapRunningHoursPage() {
  const supabase = createClient()
  const printRef = useRef<HTMLDivElement>(null)
  const [logs, setLogs] = useState<LogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    fetchLogs()
  }, [filterMonth])

  useEffect(() => {
    setFilterUnit('')
  }, [filterType])

  async function fetchLogs() {
    setLoading(true)
    const [year, month] = filterMonth.split('-')
    const startDate = `${year}-${month}-01`
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

    let query = supabase
      .from('running_hours_logs')
      .select('id, equipment_type, equipment_name, tanggal, duration_minutes, phase1_at, phase2_at, notes')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: false })

    if (filterType) query = query.eq('equipment_type', filterType)
    if (filterUnit) query = query.eq('equipment_name', filterUnit)

    const { data } = await query
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [filterType, filterUnit])

  // Agregasi per unit
  const rekapMap: Record<string, RekapUnit> = {}
  logs.forEach(log => {
    const key = `${log.equipment_type}__${log.equipment_name}`
    if (!rekapMap[key]) {
      rekapMap[key] = {
        equipment_name: log.equipment_name,
        equipment_type: log.equipment_type,
        total_minutes: 0,
        total_sessions: 0,
        daily: {}
      }
    }
    const mins = log.duration_minutes || 0
    rekapMap[key].total_minutes += mins
    rekapMap[key].total_sessions += 1
    if (!rekapMap[key].daily[log.tanggal]) rekapMap[key].daily[log.tanggal] = 0
    rekapMap[key].daily[log.tanggal] += mins
  })
  const rekapList = Object.values(rekapMap).sort((a, b) => b.total_minutes - a.total_minutes)

  const uniqueTypes = [...new Set(logs.map(l => l.equipment_type))]
  const uniqueUnits = filterType ? [...new Set(logs.filter(l => l.equipment_type === filterType).map(l => l.equipment_name))] : []

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}j ${m}m`
  }

  async function handleExportPDF() {
    if (!printRef.current) return
    const { default: html2pdf } = await import('html2pdf.js')
    html2pdf().set({
      margin: 10,
      filename: `rekap-running-hours-${filterMonth}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).from(printRef.current).save()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f7' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0a3047', margin: 0 }}>
              Rekapitulasi Running Hours
            </h1>
            <p style={{ color: '#7f8c8d', fontSize: 14, marginTop: 4 }}>
              Total jam operasi per unit equipment
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            style={{
              padding: '10px 20px',
              background: '#d4af37',
              color: '#0a3047',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            📄 Export PDF
          </button>
        </div>

        {/* Filter */}
        <div style={{ background: 'white', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '0 1 180px' }}>
              <label style={{ fontSize: 13, color: '#7f8c8d', display: 'block', marginBottom: 4 }}>Bulan</label>
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 13, color: '#7f8c8d', display: 'block', marginBottom: 4 }}>Tipe Equipment</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              >
                <option value="">Semua Tipe</option>
                {Object.entries(EQUIPMENT_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            {filterType && uniqueUnits.length > 0 && (
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: 13, color: '#7f8c8d', display: 'block', marginBottom: 4 }}>Unit</label>
                <select
                  value={filterUnit}
                  onChange={e => setFilterUnit(e.target.value)}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                >
                  <option value="">Semua Unit</option>
                  {uniqueUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ flex: '0 1 auto', display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => { setFilterType(''); setFilterUnit('') }}
                style={{ padding: '8px 16px', background: '#7f8c8d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Rekap Table */}
        <div ref={printRef}>
          <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0a3047', margin: 0 }}>
                Ringkasan per Unit — {filterMonth}
              </h2>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#7f8c8d' }}>Memuat data...</div>
            ) : rekapList.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#7f8c8d' }}>Tidak ada data untuk periode ini</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a3047', color: 'white' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13 }}>Equipment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13 }}>Unit</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>Total Sesi</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>Total Durasi</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>Rata-rata / Sesi</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapList.map((r, i) => (
                    <tr key={`${r.equipment_type}__${r.equipment_name}`} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#7f8c8d' }}>
                        {EQUIPMENT_LABELS[r.equipment_type] || r.equipment_type}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{r.equipment_name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{r.total_sessions}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#0a3047' }}>
                        {formatDuration(r.total_minutes)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: '#7f8c8d' }}>
                        {formatDuration(Math.round(r.total_minutes / r.total_sessions))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f5f6f7', borderTop: '2px solid #e0e0e0' }}>
                    <td colSpan={2} style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>TOTAL</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                      {rekapList.reduce((a, r) => a + r.total_sessions, 0)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#0a3047' }}>
                      {formatDuration(rekapList.reduce((a, r) => a + r.total_minutes, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Detail Harian */}
          {rekapList.length > 0 && (
            <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0a3047', margin: 0 }}>
                  Detail Harian
                </h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a3047', color: 'white' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13 }}>Tanggal</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13 }}>Equipment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13 }}>Unit</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>Mulai</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>Selesai</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>Durasi</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                      <td style={{ padding: '10px 16px', fontSize: 13 }}>{log.tanggal}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#7f8c8d' }}>
                        {EQUIPMENT_LABELS[log.equipment_type] || log.equipment_type}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{log.equipment_name}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13 }}>
                        {log.phase1_at ? new Date(log.phase1_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13 }}>
                        {log.phase2_at ? new Date(log.phase2_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                        {log.duration_minutes != null ? formatDuration(log.duration_minutes) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}