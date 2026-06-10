'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type CategoryCount = { category: string; count: number }
type SubCount = { sub_category: string; count: number }

export default function DashboardPage() {
  const [email, setEmail] = useState('')
  const [catCounts, setCatCounts] = useState<CategoryCount[]>([])
  const [subCounts, setSubCounts] = useState<Record<string, SubCount[]>>({})
  const [submissions, setSubmissions] = useState({ ok: 0, nok: 0, approved: 0 })
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
    loadData()
  }, [])

  async function loadData() {
    const { data: assets } = await supabase.from('assets').select('category, sub_category')
    if (assets) {
      const catMap: Record<string, number> = {}
      const subMap: Record<string, Record<string, number>> = {}
      assets.forEach(a => {
        catMap[a.category] = (catMap[a.category] || 0) + 1
        if (!subMap[a.category]) subMap[a.category] = {}
        subMap[a.category][a.sub_category] = (subMap[a.category][a.sub_category] || 0) + 1
      })
      setCatCounts(Object.entries(catMap).map(([category, count]) => ({ category, count })))
      const subResult: Record<string, SubCount[]> = {}
      Object.entries(subMap).forEach(([cat, subs]) => {
        subResult[cat] = Object.entries(subs).map(([sub_category, count]) => ({ sub_category, count }))
      })
      setSubCounts(subResult)
    }

    const [ok, nok, approved] = await Promise.all([
      supabase.from('checklist_submissions').select('id', { count: 'exact' }).eq('status', 'ok'),
      supabase.from('checklist_submissions').select('id', { count: 'exact' }).eq('status', 'nok'),
      supabase.from('checklist_submissions').select('id', { count: 'exact' }).eq('status', 'approved'),
    ])
    setSubmissions({ ok: ok.count || 0, nok: nok.count || 0, approved: approved.count || 0 })
  }

  const catIcons: Record<string, string> = {
    'Fire Safety': '🔴',
    'HVAC': '❄️',
    'Electrical': '⚡',
    'Mechanical': '⚙️',
  }

  const catColors: Record<string, string> = {
    'Fire Safety': '#fff3f3',
    'HVAC': '#f0f8ff',
    'Electrical': '#fffbf0',
    'Mechanical': '#f5f5f5',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Selamat datang 👋</h2>
          <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>{email}</p>
        </div>

        <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Asset Terdaftar</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px', marginBottom: '24px' }}>
          {catCounts.map(cat => (
            <div key={cat.category}>
              <div onClick={() => setExpanded(expanded === cat.category ? null : cat.category)}
                style={{ background: 'white', padding: '20px', borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  border: expanded === cat.category ? '1.5px solid #1a73e8' : '1.5px solid transparent' }}>
                <div style={{ fontSize: '28px', background: catColors[cat.category] || '#f5f5f5',
                  borderRadius: '10px', padding: '8px', minWidth: '48px', textAlign: 'center' }}>
                  {catIcons[cat.category] || '📋'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{cat.count}</div>
                  <div style={{ color: '#666', fontSize: '12px' }}>{cat.category}</div>
                </div>
                <div style={{ color: '#aaa', fontSize: '12px' }}>{expanded === cat.category ? '▲' : '▼'}</div>
              </div>

              {expanded === cat.category && subCounts[cat.category] && (
                <div style={{ background: 'white', borderRadius: '0 0 12px 12px', marginTop: '-4px',
                  padding: '12px 16px', boxShadow: '0 4px 8px rgba(0,0,0,0.06)',
                  borderTop: '1px solid #f0f0f0' }}>
                  {subCounts[cat.category].map(s => (
                    <div key={s.sub_category} style={{ display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: '13px' }}>
                      <span style={{ color: '#555' }}>{s.sub_category}</span>
                      <span style={{ fontWeight: 500, color: '#1a73e8' }}>{s.count} unit</span>
                    </div>
                  ))}
                </div>
              )}
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
              <div style={{ fontSize: '24px', fontWeight: 700, background: s.bg,
                borderRadius: '10px', padding: '8px', minWidth: '48px',
                textAlign: 'center', color: s.color }}>{s.count}</div>
              <div style={{ color: '#555', fontSize: '13px', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}