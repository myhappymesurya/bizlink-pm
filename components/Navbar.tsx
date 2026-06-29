'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<{ full_name: string; role: string } | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', userId)
        .single()

      if (profile) {
        setUserInfo(profile)
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleBadgeColor: Record<string, string> = {
    admin: '#d4af37',
    supervisor: '#2d9cca',
    technician: '#27ae60',
    viewer: '#7f8c8d',
  }

  return (
    <nav style={{
      background: 'var(--primary)',
      color: 'white',
      padding: '16px 24px',
      boxShadow: 'var(--shadow)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href="/" style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'white',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '24px' }}>📋</span>
          BizLink PM
        </Link>

        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'center'
        }}>
          <Link href="/dashboard" style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            Dashboard
          </Link>
          <Link href="/assets" style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            Assets
          </Link>
          <Link href="/checklist" style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            Checklist
          </Link>
          <Link href="/history" style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            History
          </Link>

          {userInfo?.role === 'admin' && (
            <Link href="/admin/users" style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              padding: '8px 12px',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Users
            </Link>
          )}

          {userInfo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '4px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{userInfo.full_name}</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: roleBadgeColor[userInfo.role] || '#7f8c8d',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {userInfo.role}
              </span>
            </div>
          )}

          <button onClick={handleLogout} style={{
            color: 'white',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}