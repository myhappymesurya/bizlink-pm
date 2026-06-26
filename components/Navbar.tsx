import Link from 'next/link'

export default function Navbar() {
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
        </div>
      </div>
    </nav>
  )
}