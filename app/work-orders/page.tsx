'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import CompleteWorkOrderForm from '@/components/CompleteWorkOrderForm'

type Instance = {
  id: string
  task_id: string
  scheduled_date: string
  status: 'pending' | 'completed' | 'skipped'
  notes: string | null
  completed_at: string | null
  due_date: string | null
  pm_tasks: {
    title: string
    description: string | null
    frequency: string
  }
}

export default function WorkOrdersPage() {
  const supabase = createClient()
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'overdue'>('pending')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [userRole, setUserRole] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchUserRole()
    fetchInstances()
  }, [])

  async function fetchUserRole() {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', session.session.user.id).single()
    setUserRole(profile?.role || '')
  }

  async function fetchInstances() {
    setLoading(true)
    const { data } = await supabase
      .from('pm_task_instances')
      .select('id, task_id, scheduled_date, status, notes, completed_at, due_date, pm_tasks(title, description, frequency)')
      .order('scheduled_date', { ascending: false })
    setInstances((data as any) || [])
    setLoading(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]

  function isOverdue(i: Instance) {
    return i.status === 'pending' && !!i.due_date && i.due_date < todayStr
  }

  const inRange = instances.filter(i => {
    if (dateFrom && i.scheduled_date < dateFrom) return false
    if (dateTo && i.scheduled_date > dateTo) return false
    return true
  })

  const filtered = inRange
    .filter(i => {
      if (statusFilter === 'overdue') return isOverdue(i)
      return i.status === statusFilter
    })
    .filter(i => !search ||
      i.pm_tasks?.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.pm_tasks?.description?.toLowerCase().includes(search.toLowerCase())
    )

  const openCount = inRange.filter(i => i.status === 'pending').length
  const closedCount = inRange.filter(i => i.status === 'completed').length
  const overdueCount = inRange.filter(isOverdue).length

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
    boxShadow: 'var(--shadow)', marginBottom: '24px'
  }
  const fieldInput: React.CSSProperties = {
    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Work Orders</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Daftar tugas yang perlu dikerjakan teknisi</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/pm-calendar" style={{
              padding: '10px 16px', background: 'var(--bg-card)', color: 'var(--primary)',
              textDecoration: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, border: '1px solid var(--border)'
            }}>
              📅 Lihat Kalender
            </a>
            {userRole === 'admin' && (
              <a href="/pm-calendar/manage" style={{
                padding: '10px 16px', background: 'var(--primary)', color: 'white',
                textDecoration: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600
              }}>
                + Buat Work Order
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div
            onClick={() => setStatusFilter('pending')}
            style={{
              ...card, marginBottom: 0, padding: 16, textAlign: 'center', cursor: 'pointer',
              border: statusFilter === 'pending' ? '2px solid var(--warning)' : '2px solid transparent'
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Open</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning)', margin: 0 }}>{openCount}</p>
          </div>
          <div
            onClick={() => setStatusFilter('overdue')}
            style={{
              ...card, marginBottom: 0, padding: 16, textAlign: 'center', cursor: 'pointer',
              border: statusFilter === 'overdue' ? '2px solid var(--danger)' : '2px solid transparent'
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Overdue</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--danger)', margin: 0 }}>{overdueCount}</p>
          </div>
          <div
            onClick={() => setStatusFilter('completed')}
            style={{
              ...card, marginBottom: 0, padding: 16, textAlign: 'center', cursor: 'pointer',
              border: statusFilter === 'completed' ? '2px solid var(--success)' : '2px solid transparent'
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Closed</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)', margin: 0 }}>{closedCount}</p>
          </div>
        </div>

        <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Dari Tanggal</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={fieldInput} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Sampai Tanggal</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={fieldInput} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              style={{ padding: '10px 14px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
              Reset Filter
            </button>
          )}
        </div>

        <div style={card}>
          <input
            placeholder="🔍 Cari judul/deskripsi tugas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...fieldInput, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {loading ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Tidak ada Work Order {statusFilter === 'pending' ? 'Open' : statusFilter === 'overdue' ? 'Overdue' : 'Closed'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(inst => (
              <div key={inst.id} style={{
                ...card, marginBottom: 0,
                borderLeft: `4px solid ${inst.status === 'completed' ? 'var(--success)' : 'var(--warning)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{inst.pm_tasks?.title || '(tugas dihapus)'}</p>
                    {inst.pm_tasks?.description && (
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{inst.pm_tasks.description}</p>
                    )}
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                      📅 {new Date(inst.scheduled_date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12,
                    background: inst.status === 'completed' ? '#eafaf1' : (isOverdue(inst) ? '#fdecea' : '#fff8e6'),
                    color: inst.status === 'completed' ? 'var(--success)' : (isOverdue(inst) ? 'var(--danger)' : 'var(--warning)')
                  }}>
                    {inst.status === 'completed' ? '✓ Closed' : (isOverdue(inst) ? '⚠ Overdue' : '○ Open')}
                  </span>
                </div>

                {inst.status === 'completed' && inst.notes && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: 10, borderRadius: 6 }}>
                    📝 {inst.notes}
                  </p>
                )}

                {inst.status === 'pending' && (
                  completingId === inst.id ? (
                    <CompleteWorkOrderForm
                      instanceId={inst.id}
                      onCancel={() => setCompletingId(null)}
                      onDone={() => { setCompletingId(null); fetchInstances() }}
                    />
                  ) : (
                    <button onClick={() => setCompletingId(inst.id)}
                      style={{ marginTop: 10, padding: '8px 16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      Tandai Selesai
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}