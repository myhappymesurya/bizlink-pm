'use client'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const path = usePathname()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

 const links = [
  { href: '/dashboard', label: '🏠 Dashboard' },
  { href: '/assets', label: '📋 Asset' },
  { href: '/checklist', label: '✅ Checklist' },
  { href: '/pm-schedule', label: '📅 PM Schedule' },
  { href: '/meter-record', label: '🔢 Meter Record' },
  { href: '/running-hours', label: '⏱️ Running Hours' },
  { href: '/history', label: '🕐 Riwayat' },
  ]

  return (
    <nav style={{ background: 'white', borderBottom: '1px solid #eee',
      padding: '0 32px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', height: '56px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a73e8', marginRight: '24px' }}>
          BizLink PM
        </span>
        {links.map(link => (
          <a key={link.href} href={link.href}
            style={{ padding: '6px 14px', borderRadius: '8px', textDecoration: 'none',
              fontSize: '13px', fontWeight: 500,
              background: path === link.href ? '#e8f0fe' : 'transparent',
              color: path === link.href ? '#1a73e8' : '#555' }}>
            {link.label}
          </a>
        ))}
      </div>
      <button onClick={handleLogout}
        style={{ padding: '6px 14px', background: '#fff0f0', color: '#ef4444',
          border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
        Logout
      </button>
    </nav>
  )
}
