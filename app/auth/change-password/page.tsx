'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login')
        return
      }
      setChecking(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password minimal 8 karakter')
      return
    }
    if (password !== confirmPassword) {
      setError('Password tidak cocok')
      return
    }

    setLoading(true)

    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    if (userId) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', userId)
    }

    setLoading(false)
    router.push('/dashboard')
  }

  if (checking) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Memuat...</div>
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f6f7'
    }}>
      <div style={{
        background: 'white',
        padding: 40,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: 360
      }}>
        <h2 style={{ color: '#0a3047', marginBottom: 8 }}>Buat Password Baru</h2>
        <p style={{ color: '#7f8c8d', fontSize: 14, marginBottom: 24 }}>
          Ini login pertama Anda. Ganti password sementara dengan password pilihan Anda.
        </p>
        {error && (
          <div style={{ background: '#fdecea', color: '#e74c3c', padding: 12, borderRadius: 4, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password baru"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 10, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 }}
          />
          <input
            type="password"
            placeholder="Konfirmasi password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: '100%', padding: 10, marginBottom: 16, border: '1px solid #ddd', borderRadius: 4 }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 12, background: '#0a3047', color: 'white',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600
            }}
          >
            {loading ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>
      </div>
    </div>
  )
}