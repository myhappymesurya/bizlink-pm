'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type Submission = {
  id: string
  asset_id: string
  sub_category: string
  location: string
  status: string
  inspector: string
  month: string
  year: number
  submitted_at: string
}

export default function HistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { loadHistory() }, [filter])

  async function loadHistory() {
    setLoading(true)
    let query = supabase.from('checklist_submissions').select('*').order('submitted_at', { ascending: false })
    if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    setSubmissions(data || [])
    setLoading(false)
  }

  async function handleApprove(id: string) {
    await supabase.from('checklist_submissions').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
    loadHistory()
  }

  const tabs = [
    { key: 'all', label: 'Semua' },
    { key: 'ok', label: '✓ OK' },
    { key: 'nok', label: '✗ NOK' },
    { key: 'approved', label: 'Approved' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Riwayat Checklist</h1>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              style={{ padding: '7px 16px', border: 'none', borderRadius: '20px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 500,
                background: filter === tab.key ? '#1a73e8' : 'white',
                color: filter === tab.key ? 'white' : '#555',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {['Waktu','Unit','Sub Kategori','Lokasi','Inspector','Status','Aksi'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Loading...</td></tr>
              ) : submissions.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Belum ada data</td></tr>
              ) : submissions.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', color: '#888', fontSize: '12px' }}>{new Date(s.submitted_at).toLocaleString('id-ID')}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1a73e8' }}>{s.asset_id}</td>
                  <td style={{ padding: '12px 16px' }}>{s.sub_category}</td>
                  <td style={{ padding: '12px 16px' }}>{s.location || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{s.inspector}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: s.status==='ok'?'#f0fdf4':s.status==='approved'?'#eff6ff':'#fff1f2',
                      color: s.status==='ok'?'#22c55e':s.status==='approved'?'#3b82f6':'#ef4444',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
                      {s.status==='ok'?'✓ OK':s.status==='approved'?'✓ Approved':'✗ NOK'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {s.status === 'ok' && (
                      <button onClick={() => handleApprove(s.id)}
                        style={{ padding: '5px 12px', background: '#3b82f6', color: 'white',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        Approve
                      </button>
                    )}
                    {s.status === 'approved' && <span style={{ color: '#22c55e', fontSize: '12px' }}>✓ Done</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', color: '#888', fontSize: '12px', borderTop: '1px solid #f0f0f0' }}>
            Total: {submissions.length} submission
          </div>
        </div>
      </div>
    </div>
  )
}