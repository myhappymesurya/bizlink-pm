'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau password salah')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <div style={{
        background: 'white', padding: '40px',
        borderRadius: '12px', width: '360px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ marginBottom: '8px', fontSize: '22px' }}>BizLink PM</h1>
        <p style={{ color: '#888', marginBottom: '24px' }}>Silakan login untuk melanjutkan</p>

        <input
          type="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '12px',
            border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
        />
        <input
          type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '16px',
            border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
        />

        {error && <p style={{ color: 'red', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#1a73e8',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '15px', cursor: 'pointer' }}>
          {loading ? 'Memproses...' : 'Login'}
        </button>
      </div>
    </div>
  )
}