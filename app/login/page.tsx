'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: signInData, error: err } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (err) {
        setError(err.message)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', signInData.user.id)
        .single()


      if (profile?.must_change_password) {
        router.push('/auth/change-password')
      } else {
        router.push('/dashboard')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        padding: '48px',
        borderRadius: '12px',
        maxWidth: '420px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            📋
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--primary)',
            marginBottom: '8px'
          }}>
            BizLink PM
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            Preventive Maintenance System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '13px',
              border: '1px solid #f5c6cb'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--primary)'
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--secondary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--primary)'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--secondary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--secondary)',
              color: 'var(--primary)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
          >
            {loading ? '🔄 Logging in...' : '🔐 Login'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border-light)',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          Demo: Use test account dari Supabase
        </div>
      </div>
    </div>
  )
}