cat > app/dashboard/page.tsx << 'ENDOFFILE'
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function DashboardPage() {
  const [email, setEmail] = useState('')
  const [counts, setCounts] = useState({ fe: 0, hydrant: 0, ac: 0, panel: 0 })
  const [submissions, setSubmissions] = useState({ ok: 0, nok: 0, approved: 0 })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
    loadCounts()
    loadSubmissions()
  }, [])

  async function loadCounts() {
    const [fe, hydrant, ac, panel] = await Promise.all([
      supabase.from('assets').select('id', { count: 'exact' }).eq('sub_category', 'Fire Extinguisher'),
      supabase.from('assets').select('id', { count: 'exact' }).eq('sub_category', 'Fire Hydrant'),
      supabase.from('assets').select('id', { count: 'exact' }).eq('sub_category', 'AC Single Split'),
      supabase.from('assets').select('id', { count: 'exact' }).eq('sub_category', 'Panel Listrik'),
    ])
    setCounts({ fe: fe.count||0, hydrant: hydrant.count||0, ac: ac.count||0, panel: panel.count||0 })
  }

  async function loadSubmissions() {
    const [ok, nok, approved] = await Promise.all([
      supabase.from('checklist_submissions').select('id', { count: 'exact' }).eq('status', 'ok'),
      supabase.from('checklist_submissions').select('id', { count: 'exact' }).eq('status', 'nok'),
      supabase.from('checklist_submissions').select('id', { count: 'exact' }).eq('status', 'approved'),
    ])
    setSubmissions({ ok: ok.count||0, nok: nok.count||0, approved: approved.count||0 })
  }

  const assetCards = [
    { label: 'Fire Extinguisher', icon: '🧯', count: counts.fe, color: '#fff3f3' },
    { label: 'Fire Hydrant', icon: '💧', count: counts.hydrant, color: '#f0f8ff' },
    { label: 'AC Single Split', icon: '❄️', count: counts.ac, color: '#f0fff4' },
    { label: 'Panel Listrik', icon: '⚡', count: counts.panel, color: '#fffbf0' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Selamat datang 👋</h2>
          <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>{email}</p>
        </div>

        <h3 style={{ fontSize: '14px', color: '#666', marginTop: '24px', marginBottom: '12px' }}>Asset Terdaftar</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {assetCards.map(card => (
            <div key={card.label} style={{ background: 'white', padding: '20px',
              borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '28px', background: card.color, borderRadius: '10px', padding: '8px' }}>{card.icon}</div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{card.count}</div>
                <div style={{ color: '#666', fontSize: '11px' }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Status PM Checklist</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          {[
            { label: 'OK', count: submissions.ok, color: '#22c55e', bg: '#f0fdf4' },
            { label: 'NOK', count: submissions.nok, color: '#ef4444', bg: '#fff1f2' },
            { label: 'Approved', count: submissions.approved, color: '#3b82f6', bg: '#eff6ff' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', padding: '20px',
              borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '28px', background: s.bg, borderRadius: '10px', padding: '8px', minWidth: '48px', textAlign: 'center', color: s.color, fontWeight: 700 }}>{s.count}</div>
              <div style={{ color: '#555', fontSize: '13px', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
ENDOFFILE