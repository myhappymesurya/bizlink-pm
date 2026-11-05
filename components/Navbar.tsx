'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAIN_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/assets', label: 'Assets' },
  { href: '/checklist', label: 'Checklist' },
  { href: '/history', label: 'History' },
  { href: '/pm-calendar', label: 'PM Calendar' },
  { href: '/meter-record', label: 'Meter Record' },
  { href: '/running-hours', label: 'Running Hours' },
  { href: '/work-orders', label: 'Work Orders' },
  { href: '/breakdown', label: 'Lapor Kerusakan' },
  { href: '/kpi-analytics', label: 'KPI Analytics' },
  { href: '/spareparts', label: 'Spareparts' },
  { href: '/reports', label: 'Reports' },
]

const ADMIN_LINKS = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/activity-log', label: 'Activity Log' },
  { href: '/admin/facility-requests', label: 'Facility Requests' },
]

export default function Navbar() {
  const supabase = createClient()
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<{ full_name: string; role: string } | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('id', userId)
        .single()
      if (profile) {
        if (profile.is_active === false) {
          await supabase.auth.signOut()
          router.push('/login')
          return
        }
        setUserInfo(profile)
      }
    }
    loadUser()
  }, [])

  // Deteksi layar kecil (HP / tablet kecil)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1100px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
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

  const allLinks = userInfo?.role === 'admin' ? [...MAIN_LINKS, ...ADMIN_LINKS] : MAIN_LINKS

  const desktopLinkStyle: React.CSSProperties = {
    color: 'white',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 12px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  }

  const mobileLinkStyle: React.CSSProperties = {
    display: 'block',
    color: 'white',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '14px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  }

  const handleHover = (e: React.MouseEvent<HTMLAnchorElement>, entering: boolean) => {
    e.currentTarget.style.background = entering ? 'rgba(255,255,255,0.1)' : 'transparent'
  }

  const userBadge = userInfo && (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px',
    }}>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{userInfo.full_name}</span>
      <span style={{
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
        background: roleBadgeColor[userInfo.role] || '#7f8c8d', color: 'white',
        padding: '2px 8px', borderRadius: '12px',
      }}>
        {userInfo.role}
      </span>
    </div>
  )

  const logoutButton = (
    <button onClick={handleLogout} style={{
      color: 'white', background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: 500,
      padding: '10px 14px', borderRadius: '4px', cursor: 'pointer',
    }}>
      Logout
    </button>
  )

  return (
    <nav style={{
      background: 'var(--primary)',
      color: 'white',
      padding: isMobile ? '12px 16px' : '16px 24px',
      boxShadow: 'var(--shadow)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: '1400px', margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '8px',
      }}>
        <Link href="/" style={{
          fontSize: '20px', fontWeight: 700, color: 'white',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '24px' }}>📋</span>
          BizLink PM
        </Link>

        {isMobile ? (
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Buka menu"
            style={{
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px',
              fontSize: '22px', lineHeight: 1, padding: '8px 14px', cursor: 'pointer',
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {allLinks.map(l => (
              <Link key={l.href} href={l.href} style={desktopLinkStyle}
                onMouseEnter={(e) => handleHover(e, true)}
                onMouseLeave={(e) => handleHover(e, false)}>
                {l.label}
              </Link>
            ))}
            {userBadge}
            {logoutButton}
          </div>
        )}
      </div>

      {isMobile && menuOpen && (
        <div style={{
          maxWidth: '1400px', margin: '8px auto 0',
          maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
        }}>
          {allLinks.map(l => (
            <Link key={l.href} href={l.href} style={mobileLinkStyle}
              onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0 8px' }}>
            {userBadge}
            {logoutButton}
          </div>
        </div>
      )}
    </nav>
  )
}