'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || '')
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ minHeight:'100vh', padding:'40px', background:'#f5f5f5' }}>
      <div style={{ background:'white', padding:'32px', borderRadius:'12px',
        maxWidth:'800px', margin:'0 auto', boxShadow:'0 2px 16px rgba(0,0,0,0.1)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ fontSize:'24px', marginBottom:'4px' }}>BizLink PM System</h1>
            <p style={{ color:'#888' }}>Selamat datang, {email}</p>
          </div>
          <button onClick={handleLogout}
            style={{ padding:'8px 16px', background:'#ff4444',
              color:'white', border:'none', borderRadius:'8px', cursor:'pointer' }}>
            Logout
          </button>
        </div>
        <div style={{ marginTop:'32px', display:'grid',
          gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
          {[
            { label:'Fire Safety', icon:'🔥', count: 0 },
            { label:'Mechanical', icon:'⚙️', count: 0 },
            { label:'Electrical', icon:'⚡', count: 0 },
          ].map(item => (
            <div key={item.label} style={{ padding:'24px', background:'#f8f9fa',
              borderRadius:'10px', textAlign:'center', border:'1px solid #eee' }}>
              <div style={{ fontSize:'32px' }}>{item.icon}</div>
              <div style={{ marginTop:'8px', fontWeight:500 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}