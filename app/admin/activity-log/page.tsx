'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type LogEntry = {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, any> | null
  new_value: Record<string, any> | null
  created_at: string
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  create: { label: 'Create', color: 'var(--success)', bg: '#eafaf1' },
  update: { label: 'Update', color: 'var(--accent)', bg: '#e8f4f8' },
  delete: { label: 'Delete', color: 'var(--danger)', bg: '#fdecea' },
}

export default function ActivityLogPage() {
  const supabase = createClient()
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { checkAccess() }, [])
  useEffect(() => { fetchLogs() }, [entityFilter, actionFilter, startDate, endDate])

  async function checkAccess() {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.session.user.id).single()
    if (profile?.role !== 'admin') router.push('/dashboard')
  }

  async function fetchLogs() {
    setLoading(true)
    let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200)
    if (entityFilter) query = query.eq('entity_type', entityFilter)
    if (actionFilter) query = query.eq('action', actionFilter)
    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`)
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`)
    const { data } = await query
    setLogs(data || [])

    const ids = [...new Set((data || []).map(l => l.user_id).filter(Boolean))] as string[]
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids)
      const map: Record<string, string> = {}
      ;(profiles || []).forEach(p => { map[p.id] = p.full_name })
      setUserNames(map)
    }
    setLoading(false)
  }

  const entityTypes = [...new Set(logs.map(l => l.entity_type))]

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
    boxShadow: 'var(--shadow)', marginBottom: '24px'
  }
  const fieldInput: React.CSSProperties = {
    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px'
  }

  function formatValue(v: Record<string, any> | null): string {
    if (!v) return '—'
    return Object.entries(v).map(([k, val]) => `${k}: ${JSON.stringify(val)}`).join(', ')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Activity Log</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Riwayat aksi CRUD di seluruh sistem (200 terbaru)</p>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Tipe Entitas</label>
              <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} style={fieldInput}>
                <option value="">Semua</option>
                {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Aksi</label>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={fieldInput}>
                <option value="">Semua</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Dari</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={fieldInput} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Sampai</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={fieldInput} />
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
              {logs.length} record
            </h3>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Tidak ada data</div>
          ) : (
            <div>
              {logs.map((log, i) => {
                const isExpanded = expanded === log.id
                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '#666', bg: '#f0f0f0' }
                return (
                  <div key={log.id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'white' : 'var(--bg-main)' }}>
                    <div
                      onClick={() => setExpanded(isExpanded ? null : log.id)}
                      style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
                    >
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 130 }}>
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: actionInfo.bg, color: actionInfo.color
                      }}>
                        {actionInfo.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{log.entity_type}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.entity_id}</span>
                      <span style={{ fontSize: 12, color: 'var(--primary)', marginLeft: 'auto' }}>
                        {log.user_id ? (userNames[log.user_id] || '(user tidak ditemukan)') : 'Sistem'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '0 20px 16px', fontSize: 12 }}>
                        {log.old_value && (
                          <p style={{ margin: '4px 0', color: 'var(--danger)' }}>
                            <strong>Sebelum:</strong> {formatValue(log.old_value)}
                          </p>
                        )}
                        {log.new_value && (
                          <p style={{ margin: '4px 0', color: 'var(--success)' }}>
                            <strong>Sesudah:</strong> {formatValue(log.new_value)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}