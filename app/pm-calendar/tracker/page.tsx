'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type ScheduleRow = {
  asset_id: string
  sub_category: string
  frequency: string
  last_done_at: string | null
  next_due_date: string | null
}

type CategorySummary = {
  sub_category: string
  total: number
  done: number
  missing: ScheduleRow[]
}

export default function PMTrackerPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('pm_schedules')
      .select('asset_id, sub_category, frequency, last_done_at, next_due_date')
      .eq('is_active', true)
      .order('sub_category')
    setRows(data || [])
    setLoading(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]

  function isDone(row: ScheduleRow): boolean {
    return row.next_due_date !== null && row.next_due_date >= todayStr
  }

  // Agregasi per sub_category
  const summaryMap: Record<string, CategorySummary> = {}
  rows.forEach(row => {
    if (!summaryMap[row.sub_category]) {
      summaryMap[row.sub_category] = { sub_category: row.sub_category, total: 0, done: 0, missing: [] }
    }
    summaryMap[row.sub_category].total += 1
    if (isDone(row)) {
      summaryMap[row.sub_category].done += 1
    } else {
      summaryMap[row.sub_category].missing.push(row)
    }
  })
  // Urutkan missing: yang belum pernah (null) duluan, lalu yang paling lama overdue
  Object.values(summaryMap).forEach(s => {
    s.missing.sort((a, b) => {
      if (a.next_due_date === null && b.next_due_date === null) return 0
      if (a.next_due_date === null) return -1
      if (b.next_due_date === null) return 1
      return a.next_due_date.localeCompare(b.next_due_date)
    })
  })

  const summaries = Object.values(summaryMap)
    .filter(s => !search || s.sub_category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.done / a.total) - (b.done / b.total)) // paling parah duluan

  const grandTotal = rows.length
  const grandDone = rows.filter(isDone).length

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', borderRadius: '8px', boxShadow: 'var(--shadow)'
  }

  function daysOverdue(dateStr: string): number {
    return Math.round((new Date(todayStr).getTime() - new Date(dateStr).getTime()) / 86400000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Tracker PM per Kategori</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
              Pantau unit mana yang sudah dan belum di-checklist
            </p>
          </div>
          <a href="/pm-calendar" style={{
            padding: '10px 16px', background: 'var(--bg-main)', color: 'var(--primary)',
            textDecoration: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, border: '1px solid var(--border)'
          }}>
            ← Kalender
          </a>
        </div>

        {/* Ringkasan global */}
        <div style={{ ...card, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>Total Keseluruhan</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
              {grandDone} / {grandTotal} ({grandTotal > 0 ? Math.round(grandDone / grandTotal * 100) : 0}%)
            </span>
          </div>
          <div style={{ width: '100%', height: 10, background: 'var(--bg-main)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              width: `${grandTotal > 0 ? (grandDone / grandTotal * 100) : 0}%`, height: '100%',
              background: 'var(--success)', transition: 'width 0.3s'
            }} />
          </div>
        </div>

        {/* Search */}
        <input
          placeholder="🔍 Cari kategori..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', marginBottom: 16, boxSizing: 'border-box' }}
        />

        {loading ? (
          <div style={{ ...card, padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat...</div>
        ) : summaries.length === 0 ? (
          <div style={{ ...card, padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Tidak ada data</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {summaries.map(s => {
              const pct = s.total > 0 ? Math.round(s.done / s.total * 100) : 0
              const isExpanded = expanded === s.sub_category
              const barColor = pct === 100 ? 'var(--success)' : pct >= 50 ? 'var(--accent)' : 'var(--warning)'

              return (
                <div key={s.sub_category} style={card}>
                  <div
                    onClick={() => setExpanded(isExpanded ? null : s.sub_category)}
                    style={{ padding: '16px 20px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {isExpanded ? '▼' : '▶'} {s.sub_category}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>
                        {s.done} / {s.total} ({pct}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--bg-main)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {isExpanded && s.missing.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-light)', padding: '12px 20px 16px' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
                        Belum dicek ({s.missing.length}):
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {s.missing.map(m => (
                          <span key={m.asset_id} style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 12,
                            background: m.next_due_date === null ? '#fdecea' : '#fff8e6',
                            color: m.next_due_date === null ? 'var(--danger)' : 'var(--warning)',
                            fontWeight: 600
                          }}
                            title={m.next_due_date === null ? 'Belum pernah dicek' : `Telat ${daysOverdue(m.next_due_date)} hari`}
                          >
                            {m.asset_id}{m.next_due_date !== null ? ` (${daysOverdue(m.next_due_date)}h)` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpanded && s.missing.length === 0 && (
                    <div style={{ borderTop: '1px solid var(--border-light)', padding: '12px 20px 16px' }}>
                      <p style={{ fontSize: 13, color: 'var(--success)', margin: 0, fontWeight: 600 }}>
                        ✓ Semua unit sudah dicek
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}