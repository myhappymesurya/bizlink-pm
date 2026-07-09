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

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const todayStr = today.toISOString().split('T')[0]

  const statusColors: Record<DayStatus, string> = {
    empty: 'transparent',
    pending: '#f59e0b',
    completed: '#22c55e',
    mixed: '#3b82f6'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f7' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0a3047', margin: 0 }}>PM Calendar</h1>
            <p style={{ color: '#7f8c8d', fontSize: 14, marginTop: 4 }}>Jadwal preventive maintenance</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {userRole === 'admin' && (
              <a href="/pm-calendar/manage" style={{
                padding: '10px 16px', background: '#0a3047', color: 'white',
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
            { color: '#f59e0b', label: 'Ada tugas pending' },
            { color: '#22c55e', label: 'Semua selesai' },
            { color: '#3b82f6', label: 'Sebagian selesai' }
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#7f8c8d' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {/* Header navigasi */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <button onClick={() => {
              if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
              else setCurrentMonth(m => m - 1)
            }} style={{ padding: '6px 12px', background: '#f5f6f7', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>‹</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#0a3047' }}>
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <button onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()) }}
                style={{ padding: '4px 10px', background: '#0a3047', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                Today
              </button>
            </div>

            <button onClick={() => {
              if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
              else setCurrentMonth(m => m + 1)
            }} style={{ padding: '6px 12px', background: '#f5f6f7', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f0f0f0' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#7f8c8d' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7f8c8d' }}>Memuat...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ padding: '12px', minHeight: 80, borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }} />
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
                      borderRight: '1px solid #f0f0f0',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: dayInstances.length > 0 ? 'pointer' : 'default',
                      background: isToday ? '#f0f7ff' : 'white',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { if (dayInstances.length > 0) e.currentTarget.style.background = '#f5f5f5' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isToday ? '#f0f7ff' : 'white' }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: isToday ? '#0a3047' : 'transparent',
                      color: isToday ? 'white' : '#2c3e50',
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
                        <div style={{ fontSize: 10, color: '#7f8c8d' }}>
                          {completedCount > 0 && <span style={{ color: '#22c55e' }}>✓{completedCount} </span>}
                          {pendingCount > 0 && <span style={{ color: '#f59e0b' }}>○{pendingCount}</span>}
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
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#0a3047' }}>
                📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => { setSelectedDate(null); setCompleting(null); setCompletingNotes('') }}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7f8c8d' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              {selectedInstances.map(inst => (
                <div key={inst.id} style={{
                  border: `1px solid ${inst.status === 'completed' ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: 8, padding: 16, marginBottom: 12,
                  background: inst.status === 'completed' ? '#f0fdf4' : '#fffbeb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{inst.pm_tasks.title}</p>
                      {inst.pm_tasks.description && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7f8c8d' }}>{inst.pm_tasks.description}</p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                      background: inst.status === 'completed' ? '#22c55e' : '#f59e0b',
                      color: 'white'
                    }}>
                      {inst.status === 'completed' ? '✓ Selesai' : '○ Pending'}
                    </span>
                  </div>

                  {inst.status === 'completed' && inst.notes && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#7f8c8d', background: 'white', padding: '8px', borderRadius: 4 }}>
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
                            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' as const }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button onClick={() => { setCompleting(null); setCompletingNotes('') }}
                              style={{ flex: 1, padding: '8px', background: '#7f8c8d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                              Batal
                            </button>
                            <button onClick={() => handleComplete(inst.id)}
                              disabled={!completingNotes.trim()}
                              style={{ flex: 1, padding: '8px', background: completingNotes.trim() ? '#22c55e' : '#e0e0e0', color: 'white', border: 'none', borderRadius: 4, cursor: completingNotes.trim() ? 'pointer' : 'not-allowed', fontSize: 13 }}>
                              ✓ Tandai Selesai
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setCompleting(inst.id)}
                          style={{ marginTop: 8, padding: '6px 14px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
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