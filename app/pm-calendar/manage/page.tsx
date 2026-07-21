'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { logActivity } from '@/lib/activityLog'

type Task = {
  id: string
  title: string
  description: string | null
  frequency: string
  frequency_day: number | null
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
}

const FREQUENCY_LABELS: Record<string, string> = {
  'one-time': 'Sekali',
  'daily': 'Harian',
  'weekly': 'Mingguan',
  'monthly': 'Bulanan'
}

const DAYS_OF_WEEK = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export default function PMCalendarManagePage() {
  const supabase = createClient()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateMsg, setGenerateMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('one-time')
  const [frequencyDay, setFrequencyDay] = useState(1)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    checkAccess()
    fetchTasks()
  }, [])

  async function checkAccess() {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.session.user.id).single()
    if (profile?.role !== 'admin') router.push('/pm-calendar')
  }

  async function fetchTasks() {
    setLoading(true)
    const { data } = await supabase.from('pm_tasks').select('*').order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateMsg('')
    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/generate-pm-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`
        }
      })
      const data = await res.json()
      setGenerateMsg(data.message || 'Selesai')
    } catch (e) {
      setGenerateMsg('Gagal generate instances')
    }
    setGenerating(false)
  }

  async function handleSaveTask() {
    if (!title.trim()) return
    setSaving(true)
    const { data: session } = await supabase.auth.getSession()
    const { data: task } = await supabase.from('pm_tasks').insert({
      title,
      description: description || null,
      frequency,
      frequency_day: frequency === 'weekly' || frequency === 'monthly' ? frequencyDay : null,
      start_date: startDate,
      end_date: endDate || null,
      due_date: frequency === 'one-time' ? (dueDate || null) : null,
      created_by: session.session?.user.id
    }).select().single()
    if (task) {
      await logActivity(supabase, {
        action: 'create',
        entity_type: 'pm_task',
        entity_id: task.id,
        new_value: { title, frequency, start_date: startDate },
      })
    }
    setSaving(false)
    setShowForm(false)
    setTitle('')
    setDescription('')
    setFrequency('one-time')
    setFrequencyDay(1)
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setDueDate('')
    fetchTasks()
  }
  async function handleToggleActive(id: string, current: boolean) {
    await supabase.from('pm_tasks').update({ is_active: !current }).eq('id', id)
    await logActivity(supabase, {
      action: 'update',
      entity_type: 'pm_task',
      entity_id: id,
      old_value: { is_active: current },
      new_value: { is_active: !current },
    })
    fetchTasks()
  }
  async function handleDelete(id: string) {
    if (!confirm('Hapus tugas ini? Semua instance terkait juga akan dihapus.')) return
    const before = tasks.find(t => t.id === id)
    await supabase.from('pm_tasks').delete().eq('id', id)
    await logActivity(supabase, {
      action: 'delete',
      entity_type: 'pm_task',
      entity_id: id,
      old_value: { title: before?.title, frequency: before?.frequency },
    })
    fetchTasks()
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', borderRadius: '8px', boxShadow: 'var(--shadow)'
  }
  const fieldInput: React.CSSProperties = {
    width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 4, fontSize: 14, boxSizing: 'border-box'
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Kelola Tugas PM</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Tambah dan kelola jadwal preventive maintenance</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/pm-calendar" style={{ padding: '10px 16px', background: 'var(--bg-main)', color: 'var(--primary)', textDecoration: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, border: '1px solid var(--border)' }}>
              ← Kalender
            </a>
            <button onClick={handleGenerate} disabled={generating}
              style={{ padding: '10px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: generating ? 0.7 : 1 }}>
              {generating ? 'Generating...' : '🔄 Generate Instances'}
            </button>
            <button onClick={() => setShowForm(true)}
              style={{ padding: '10px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              + Tambah Tugas
            </button>
          </div>
        </div>

        {generateMsg && (
          <div style={{ background: '#eafaf1', color: 'var(--success)', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
            ✓ {generateMsg}
          </div>
        )}

        {showForm && (
          <div style={{ ...card, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)', marginBottom: 20 }}>Tambah Tugas Baru</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={fieldLabel}>Judul Tugas *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: Cek kompressor harian"
                  style={fieldInput} />
              </div>
              <div>
                <label style={fieldLabel}>Deskripsi</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Detail tugas yang harus dilakukan..."
                  rows={3}
                  style={{ ...fieldInput, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={fieldLabel}>Frekuensi</label>
                  <select value={frequency} onChange={e => setFrequency(e.target.value)} style={fieldInput}>
                    <option value="one-time">Sekali</option>
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                  </select>
                </div>
                {frequency === 'weekly' && (
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={fieldLabel}>Hari</label>
                    <select value={frequencyDay} onChange={e => setFrequencyDay(Number(e.target.value))} style={fieldInput}>
                      {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                )}
                {frequency === 'monthly' && (
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={fieldLabel}>Tanggal</label>
                    <input type="number" min={1} max={28} value={frequencyDay} onChange={e => setFrequencyDay(Number(e.target.value))} style={fieldInput} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={fieldLabel}>Tanggal Mulai *</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={fieldInput} />
                </div>
                {frequency !== 'one-time' && (
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={fieldLabel}>Tanggal Selesai (opsional)</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={fieldInput} />
                  </div>
                )}
                {frequency === 'one-time' && (
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={fieldLabel}>Target Tanggal Selesai (opsional)</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={fieldInput} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)}
                  style={{ padding: '8px 16px', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
                  Batal
                </button>
                <button onClick={handleSaveTask} disabled={saving || !title.trim()}
                  style={{ padding: '8px 16px', background: title.trim() ? 'var(--primary)' : '#e0e0e0', color: 'white', border: 'none', borderRadius: 4, cursor: title.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                  {saving ? 'Menyimpan...' : 'Simpan Tugas'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>Daftar Tugas ({tasks.length})</h2>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat...</div>
          ) : tasks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Belum ada tugas — tambahkan tugas pertama</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--primary)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'white', fontWeight: 600 }}>Judul</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'white', fontWeight: 600 }}>Frekuensi</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'white', fontWeight: 600 }}>Mulai</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'white', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'white', fontWeight: 600 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, i) => (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'white' : 'var(--bg-main)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{task.title}</p>
                      {task.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{task.description}</p>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      {FREQUENCY_LABELS[task.frequency]}
                      {task.frequency === 'weekly' && task.frequency_day !== null && ` — ${DAYS_OF_WEEK[task.frequency_day]}`}
                      {task.frequency === 'monthly' && task.frequency_day !== null && ` — tgl ${task.frequency_day}`}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{task.start_date}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                        background: task.is_active ? '#eafaf1' : '#e2e3e5',
                        color: task.is_active ? 'var(--success)' : '#383d41'
                      }}>
                        {task.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button onClick={() => handleToggleActive(task.id, task.is_active)}
                          style={{ padding: '4px 10px', background: task.is_active ? 'var(--warning)' : 'var(--success)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          {task.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button onClick={() => handleDelete(task.id)}
                          style={{ padding: '4px 10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}