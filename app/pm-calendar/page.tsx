'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type Instance = {
  id: string
  task_id: string
  scheduled_date: string
  status: 'pending' | 'completed' | 'skipped'
  notes: string | null
  pm_tasks: {
    title: string
    description: string | null
    frequency: string
  }
}

type DayStatus = 'empty' | 'pending' | 'completed' | 'mixed'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function PMCalendarPage() {
  const supabase = createClient()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedInstances, setSelectedInstances] = useState<Instance[]>([])
  const [completing, setCompleting] = useState<string | null>(null)
  const [completingNotes, setCompletingNotes] = useState('')
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    fetchInstances()
    fetchUserRole()
  }, [currentMonth, currentYear])

  async function fetchUserRole() {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.session.user.id)
      .single()
    setUserRole(profile?.role || '')
  }

  async function fetchInstances() {
    setLoading(true)
    const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
    const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`

    const { data } = await supabase
      .from('pm_task_instances')
      .select('*, pm_tasks(title, description, frequency)')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date')

    setInstances(data || [])
    setLoading(false)
  }

  function getDayStatus(dateStr: string): DayStatus {
    const dayInstances = instances.filter(i => i.scheduled_date === dateStr)
    if (dayInstances.length === 0) return 'empty'
    const allCompleted = dayInstances.every(i => i.status === 'completed')
    const hasCompleted = dayInstances.some(i => i.status === 'completed')
    if (allCompleted) return 'completed'
    if (hasCompleted) return 'mixed'
    return 'pending'
  }

  function handleDayClick(dateStr: string) {
    const dayInstances = instances.filter(i => i.scheduled_date === dateStr)
    if (dayInstances.length === 0) return
    setSelectedDate(dateStr)
    setSelectedInstances(dayInstances)
  }

  async function handleComplete(instanceId: string) {
    if (!completingNotes.trim()) return
    const { data: session } = await supabase.auth.getSession()
    await supabase.from('pm_task_instances').update({
      status: 'completed',
      completed_by: session.session?.user.id,
      completed_at: new Date().toISOString(),
      notes: completingNotes
    }).eq('id', instanceId)
    setCompleting(null)
    setCompletingNotes('')
    await fetchInstances()
    const updated = instances.filter(i => i.scheduled_date === selectedDate)
    setSelectedInstances(updated.map(i => i.id === instanceId ? { ...i, status: 'completed', notes: completingNotes } : i))
  }

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const todayStr = today.toISOString().split('T')[0]

  const statusColors: Record<DayStatus, string> = {
    empty: 'transparent',
    pending: 'var(--warning)',
    completed: 'var(--success)',
    mixed: 'var(--accent)'
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', borderRadius: '8px', boxShadow: 'var(--shadow)'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>PM Calendar</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Jadwal preventive maintenance</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {userRole === 'admin' && (
              <a href="/pm-calendar/manage" style={{
                padding: '10px 16px', background: 'var(--primary)', color: 'white',
                textDecoration: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600
              }}>
                ⚙️ Kelola Tugas
              </a>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { color: 'var(--warning)', label: 'Ada tugas pending' },
            { color: 'var(--success)', label: 'Semua selesai' },
            { color: 'var(--accent)', label: 'Sebagian selesai' }
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-light)' }}>
            <button onClick={() => {
              if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
              else setCurrentMonth(m => m - 1)
            }} style={{ padding: '6px 12px', background: 'var(--bg-main)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>‹</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)' }}>
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <button onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()) }}
                style={{ padding: '4px 10px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                Today
              </button>
            </div>

            <button onClick={() => {
              if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
              else setCurrentMonth(m => m + 1)
            }} style={{ padding: '6px 12px', background: 'var(--bg-main)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-light)' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ padding: '12px', minHeight: 80, borderRight: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const status = getDayStatus(dateStr)
                const isToday = dateStr === todayStr
                const dayInstances = instances.filter(inst => inst.scheduled_date === dateStr)
                const pendingCount = dayInstances.filter(inst => inst.status === 'pending').length
                const completedCount = dayInstances.filter(inst => inst.status === 'completed').length

                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(dateStr)}
                    style={{
                      padding: '8px',
                      minHeight: 80,
                      borderRight: '1px solid var(--border-light)',
                      borderBottom: '1px solid var(--border-light)',
                      cursor: dayInstances.length > 0 ? 'pointer' : 'default',
                      background: isToday ? '#eaf4fb' : 'white',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { if (dayInstances.length > 0) e.currentTarget.style.background = 'var(--bg-main)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isToday ? '#eaf4fb' : 'white' }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: isToday ? 'var(--primary)' : 'transparent',
                      color: isToday ? 'white' : 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: isToday ? 700 : 400,
                      marginBottom: 4
                    }}>
                      {day}
                    </div>
                    {status !== 'empty' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{
                          width: '100%', height: 6, borderRadius: 3,
                          background: statusColors[status]
                        }} />
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                          {completedCount > 0 && <span style={{ color: 'var(--success)' }}>✓{completedCount} </span>}
                          {pendingCount > 0 && <span style={{ color: 'var(--warning)' }}>○{pendingCount}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Popup modal */}
      {selectedDate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) { setSelectedDate(null); setCompleting(null); setCompletingNotes('') } }}>
          <div style={{ background: 'white', borderRadius: 8, width: 480, maxWidth: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--primary)' }}>
                📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => { setSelectedDate(null); setCompleting(null); setCompletingNotes('') }}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              {selectedInstances.map(inst => (
                <div key={inst.id} style={{
                  border: `1px solid ${inst.status === 'completed' ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: 8, padding: 16, marginBottom: 12,
                  background: inst.status === 'completed' ? '#eafaf1' : '#fff8e6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{inst.pm_tasks.title}</p>
                      {inst.pm_tasks.description && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{inst.pm_tasks.description}</p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                      background: inst.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                      color: 'white'
                    }}>
                      {inst.status === 'completed' ? '✓ Selesai' : '○ Pending'}
                    </span>
                  </div>

                  {inst.status === 'completed' && inst.notes && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-secondary)', background: 'white', padding: '8px', borderRadius: 4 }}>
                      📝 {inst.notes}
                    </p>
                  )}

                  {inst.status === 'pending' && (
                    <>
                      {completing === inst.id ? (
                        <div style={{ marginTop: 12 }}>
                          <textarea
                            value={completingNotes}
                            onChange={e => setCompletingNotes(e.target.value)}
                            placeholder="Catatan penyelesaian (wajib)..."
                            rows={3}
                            style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 4, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' as const }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button onClick={() => { setCompleting(null); setCompletingNotes('') }}
                              style={{ flex: 1, padding: '8px', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                              Batal
                            </button>
                            <button onClick={() => handleComplete(inst.id)}
                              disabled={!completingNotes.trim()}
                              style={{ flex: 1, padding: '8px', background: completingNotes.trim() ? 'var(--success)' : '#e0e0e0', color: 'white', border: 'none', borderRadius: 4, cursor: completingNotes.trim() ? 'pointer' : 'not-allowed', fontSize: 13 }}>
                              ✓ Tandai Selesai
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setCompleting(inst.id)}
                          style={{ marginTop: 8, padding: '6px 14px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Tandai Selesai
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}