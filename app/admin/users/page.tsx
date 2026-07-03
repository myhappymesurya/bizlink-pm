'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type Profile = {
  id: string
  full_name: string
  role: string
  created_at: string
}

export default function UsersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('technician')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const checkAccess = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setAuthorized(true)
      loadUsers()
    }
    checkAccess()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setSubmitting(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ email, full_name: fullName, role }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Gagal mengundang user')
      } else {
        setFormSuccess(`Undangan terkirim ke ${email}`)
        setEmail('')
        setFullName('')
        setRole('technician')
        loadUsers()
      }
    } catch (err) {
      setFormError('Terjadi kesalahan koneksi')
    }
    setSubmitting(false)
  }

  if (!authorized) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 40 }}>Memuat...</div>
      </>
    )
  }

  const roleBadgeColor: Record<string, string> = {
    admin: '#d4af37',
    supervisor: '#2d9cca',
    technician: '#27ae60',
    viewer: '#7f8c8d',
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ color: '#0a3047', marginBottom: 24 }}>Manajemen User</h1>

        <div style={{
          background: 'white',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          marginBottom: 32
        }}>
          <h2 style={{ fontSize: 16, color: '#2c3e50', marginBottom: 16 }}>Undang User Baru</h2>

          {formError && (
            <div style={{ background: '#fdecea', color: '#e74c3c', padding: 10, borderRadius: 4, marginBottom: 12, fontSize: 14 }}>
              {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{ background: '#eafaf1', color: '#27ae60', padding: 10, borderRadius: 4, marginBottom: 12, fontSize: 14 }}>
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 13, color: '#7f8c8d', display: 'block', marginBottom: 4 }}>Nama Lengkap</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <label style={{ fontSize: 13, color: '#7f8c8d', display: 'block', marginBottom: 4 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              />
            </div>
            <div style={{ flex: '0 1 160px' }}>
              <label style={{ fontSize: 13, color: '#7f8c8d', display: 'block', marginBottom: 4 }}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              >
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="technician">Technician</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 20px',
                background: '#0a3047',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
                height: 38
              }}
            >
              {submitting ? 'Mengirim...' : 'Kirim Undangan'}
            </button>
          </form>
        </div>

        <div style={{
          background: 'white',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: 16, color: '#2c3e50', marginBottom: 16 }}>Daftar User ({users.length})</h2>
          {loading ? (
            <p>Memuat...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px', fontSize: 13, color: '#7f8c8d' }}>Nama</th>
                  <th style={{ padding: '8px 4px', fontSize: 13, color: '#7f8c8d' }}>Role</th>
                  <th style={{ padding: '8px 4px', fontSize: 13, color: '#7f8c8d' }}>Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 4px' }}>{u.full_name}</td>
                    <td style={{ padding: '10px 4px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: roleBadgeColor[u.role] || '#7f8c8d',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 12
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 4px', fontSize: 13, color: '#7f8c8d' }}>
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}