'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type Schedule = {
  id: string
  asset_id: string
  sub_category: string
  frequency: string
  last_done_at: string | null
  next_due_date: string | null
  location: string
}

const FREQ_DAYS: Record<string, number> = {
  'Daily': 1, 'Weekly': 7, 'Monthly': 30,
  'Quarterly': 90, 'Bi Annually': 180, 'Annually': 365,
}

const CATEGORIES_MAP: Record<string, string[]> = {
  'Fire Safety': ['Fire Extinguisher','Fire Hydrant','Emergency Door','Smoke & Heat Detector','Evacuation Lamp'],
  'HVAC': ['AC Single Split','AC Cassette','AC Single Split Duct Type','AC Multi Split Duct Type','AC Package','Cooling Tower','Exhaust Fan','Adsorption Tower'],
  'Electrical': ['Panel Listrik'],
  'Mechanical': ['Air Compressor','Air Dryer','Pompa Distribusi CT 2 Cell','Pompa Distribusi CT 1 Cell','Pompa Supply CT','Pompa Booster'],
}

function getStatus(s: Schedule) {
  if (!s.last_done_at) return 'pending'
  const days = Math.floor((Date.now() - new Date(s.last_done_at).getTime()) / 86400000)
  const expected = FREQ_DAYS[s.frequency] || 30
  if (days <= expected) return 'done'
  if (days <= expected + 7) return 'due'
  return 'overdue'
}

function getNextDue(s: Schedule) {
  if (!s.last_done_at) return '—'
  const expected = FREQ_DAYS[s.frequency] || 30
  const next = new Date(new Date(s.last_done_at).getTime() + expected * 86400000)
  return next.toLocaleDateString('id-ID')
}

export default function PMSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [frequency, setFrequency] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { loadSchedules() }, [category, subCategory, frequency])
  useEffect(() => { setSubCategory('') }, [category])

  async function loadSchedules() {
    setLoading(true)
    let query = supabase.from('pm_schedules')
      .select('*, assets(location)')
      .eq('is_active', true)
      .order('sub_category')

    if (subCategory) query = query.eq('sub_category', subCategory)
    else if (category) query = query.in('sub_category', CATEGORIES_MAP[category] || [])
    if (frequency) query = query.eq('frequency', frequency)

    const { data } = await query
    const mapped = (data || []).map((s: any) => ({
      ...s, location: s.assets?.location || '—'
    }))
    setSchedules(mapped)
    setLoading(false)
  }

  const filtered = schedules.filter(s =>
    statusFilter === 'all' || getStatus(s) === statusFilter
  )

  const counts = {
    done: schedules.filter(s => getStatus(s) === 'done').length,
    due: schedules.filter(s => getStatus(s) === 'due').length,
    overdue: schedules.filter(s => getStatus(s) === 'overdue').length,
    pending: schedules.filter(s => getStatus(s) === 'pending').length,
  }

  const statusBadge = (s: Schedule) => {
    const st = getStatus(s)
    const map = {
      done: { bg: '#f0fdf4', color: '#22c55e', label: '✓ Done' },
      due: { bg: '#fffbeb', color: '#f59e0b', label: '⚠ Due' },
      overdue: { bg: '#fff1f2', color: '#ef4444', label: '🔴 Overdue' },
      pending: { bg: '#f5f5f5', color: '#888', label: '— Belum pernah' },
    }
    const m = map[st]
    return <span style={{ background: m.bg, color: m.color, padding: '3px 10px',
      borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>{m.label}</span>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>PM Schedule</h1>

        {/* Overview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Done', count: counts.done, color: '#22c55e', bg: '#f0fdf4' },
            { label: 'Due Soon', count: counts.due, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Overdue', count: counts.overdue, color: '#ef4444', bg: '#fff1f2' },
            { label: 'Belum Pernah', count: counts.pending, color: '#888', bg: '#f5f5f5' },
          ].map(c => (
            <div key={c.label} style={{ background: 'white', padding: '20px', borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, background: c.bg,
                borderRadius: '10px', padding: '8px', minWidth: '52px',
                textAlign: 'center', color: c.color }}>{c.count}</div>
              <div style={{ color: '#555', fontSize: '13px', fontWeight: 500 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px',
          display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
            <option value="">Semua Kategori</option>
            {Object.keys(CATEGORIES_MAP).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {category && (
            <select value={subCategory} onChange={e => setSubCategory(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
              <option value="">Semua Sub-kategori</option>
              {CATEGORIES_MAP[category].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          <select value={frequency} onChange={e => setFrequency(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
            <option value="">Semua Frekuensi</option>
            {['Daily','Weekly','Monthly','Quarterly','Bi Annually','Annually'].map(f =>
              <option key={f} value={f}>{f}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
            <option value="all">Semua Status</option>
            <option value="done">✓ Done</option>
            <option value="due">⚠ Due Soon</option>
            <option value="overdue">🔴 Overdue</option>
            <option value="pending">— Belum Pernah</option>
          </select>

          {(category || frequency || statusFilter !== 'all') && (
            <button onClick={() => { setCategory(''); setSubCategory(''); setFrequency(''); setStatusFilter('all') }}
              style={{ padding: '8px 14px', background: '#f0f0f0', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#666' }}>
              Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: '12px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {['Unit','Lokasi','Sub Kategori','Frekuensi','Terakhir Done','Next Due','Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left',
                    color: '#666', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Tidak ada data</td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0',
                  background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1a73e8' }}>{s.asset_id}</td>
                  <td style={{ padding: '12px 16px' }}>{s.location}</td>
                  <td style={{ padding: '12px 16px' }}>{s.sub_category}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#f0f0f0', padding: '2px 8px',
                      borderRadius: '4px', fontSize: '12px' }}>{s.frequency}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#888', fontSize: '12px' }}>
                    {s.last_done_at ? new Date(s.last_done_at).toLocaleDateString('id-ID') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px' }}>{getNextDue(s)}</td>
                  <td style={{ padding: '12px 16px' }}>{statusBadge(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', color: '#888', fontSize: '12px', borderTop: '1px solid #f0f0f0' }}>
            Menampilkan {filtered.length} dari {schedules.length} schedule
          </div>
        </div>
      </div>
    </div>
  )
}