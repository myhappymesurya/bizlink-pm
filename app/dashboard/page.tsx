'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [email, setEmail] = useState('')
  const [counts, setCounts] = useState({ fe: 0, hydrant: 0, ac: 0, panel: 0 })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || '')
    })
    loadCounts()
  }, [])

  async function loadCounts() {
    const [fe, hydrant, ac, panel] = await Promise.all([
      supabase.from('assets').select('id', { count: 'exact' }).eq('sub_category', 'Fire Extinguisher'),
      supabase.from('assets').select('id', { count: 'exact' }).eq('sub_category', 'Fire Hydrant'),
      supabase.from('assets').select('id', { count: 'exact' }).eq('sub_category', 'AC Single Split'),
      supabase.from('assets').select('id', { count: 'exact' }).eq('sub_category', 'Panel Listrik'),
    ])
    setCounts({
      fe: fe.count || 0,
      hydrant: hydrant.count || 0,
      ac: ac.count || 0,
      panel: panel.count || 0,
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const cards = [
    { label: 'Fire Extinguisher', icon: '🧯', count: counts.fe, color: '#fff3f3' },
    { label: 'Fire Hydrant', icon: '💧', count: counts.hydrant, color: '#f0f8ff' },
    { label: 'AC Single Split', icon: '❄️', count: counts.ac, color: '#f0fff4' },
    { label: 'Panel Listrik', icon: '⚡', count: counts.panel, color: '#fffbf0' },
  ]

  return (
    <div style={{ minHeight:'100vh', padding:'40px', background:'#f5f5f5' }}>
      <div style={{ maxWidth:'900px', margin:'0 auto' }}>
        <div style={{ background:'white', padding:'24px 32px', borderRadius:'12px',
          boxShadow:'0 2px 16px rgba(0,0,0,0.08)', marginBottom:'24px',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:600, margin:0 }}>BizLink PM System</h1>
            <p style={{ color:'#888', margin:'4px 0 0', fontSize:'13px' }}>Selamat datang, {email}</p>
          </div>
          <button onClick={handleLogout}
            style={{ padding:'8px 18px', background:'#ff4444', color:'white',
              border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>
            Logout
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'16px' }}>
          {cards.map(card => (
            <div key={card.label} style={{ background:'white', padding:'28px',
              borderRadius:'12px', boxShadow:'0 2px 16px rgba(0,0,0,0.06)',
              display:'flex', alignItems:'center', gap:'20px' }}>
              <div style={{ fontSize:'40px', background:card.color,
                borderRadius:'12px', padding:'12px' }}>{card.icon}</div>
              <div>
                <div style={{ fontSize:'32px', fontWeight:700 }}>{card.count}</div>
                <div style={{ color:'#666', fontSize:'14px' }}>{card.label}</div>
                <div style={{ color:'#aaa', fontSize:'12px' }}>unit terdaftar</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}