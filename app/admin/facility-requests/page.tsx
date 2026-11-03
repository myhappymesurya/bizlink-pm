'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type Status = 'open' | 'approved' | 'rejected'

type FacilityRequest = {
  id: string
  requester_name: string
  department: string | null
  location: string
  category: string
  description: string
  status: Status
  created_at: string
  photo_url: string | null
  reject_reason: string | null
  reviewed_at: string | null
}

const TAB_LABELS: Record<Status, string> = {
  open: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

export default function FacilityRequestsAdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [status, setStatus] = useState<Status>('open')
  const [requests, setRequests] = useState<FacilityRequest[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({ open: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    async function checkAccess() {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', userId).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }
      setAuthorized(true)
    }
    checkAccess()
  }, [])

  useEffect(() => {
    if (authorized) fetchRequests()
  }, [authorized, status])

  async function getToken(): Promise<string | undefined> {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function fetchRequests() {
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const res = await fetch(`/api/admin/facility-requests?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal memuat laporan')
        setRequests([])
      } else {
        setRequests(data.requests || [])
        setCounts(data.counts || { open: 0, approved: 0, rejected: 0 })
      }
    } catch {
      setError('Koneksi bermasalah. Coba muat ulang halaman.')
    }
    setLoading(false)
  }

  async function sendAction(id: string, action: 'approve' | 'reject', reason?: string) {
    setProcessingId(id)
    setError('')
    try {
      const token = await getToken()
      const res = await fetch('/api/admin/facility-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, action, reason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal memproses laporan')
      } else {
        setRejectId(null)
        setRejectReason('')
      }
    } catch {
      setError('Koneksi bermasalah. Coba lagi.')
    }
    setProcessingId(null)
    fetchRequests()
  }

  function handleApprove(r: FacilityRequest) {
    const ok = confirm(
      `Setujui laporan ini?\n\n${r.category} - ${r.location}\n\n` +
      `Work Order akan dibuat dan teknisi akan dikabari lewat Telegram.`
    )
    if (ok) sendAction(r.id, 'approve')
  }

  if (!authorized) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 40 }}>Memuat...</div>
      </>
    )
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: 24, borderRadius: 8,
    boxShadow: 'var(--shadow)', marginBottom: 16,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Facility Requests</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Laporan dari karyawan. Setujui untuk dijadikan Work Order, atau tolak jika tidak valid.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {(['open', 'approved', 'rejected'] as Status[]).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{
                padding: '8px 18px', border: 'none', borderRadius: 20, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow)',
                background: status === s ? 'var(--primary)' : 'var(--bg-card)',
                color: status === s ? 'white' : 'var(--text-primary)',
              }}>
              {TAB_LABELS[s]} ({counts[s] ?? 0})
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fdecea', color: 'var(--danger)', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat...</div>
        ) : requests.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Tidak ada laporan {TAB_LABELS[status].toLowerCase()}
          </div>
        ) : (
          requests.map(r => (
            <div key={r.id} style={{
              ...card,
              borderLeft: `4px solid ${r.status === 'approved' ? 'var(--success)' : r.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10,
                    background: '#e8f4f8', color: 'var(--accent)',
                  }}>
                    {r.category}
                  </span>
                  <p style={{ margin: '8px 0 0', fontWeight: 600, fontSize: 15 }}>{r.location}</p>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {new Date(r.created_at).toLocaleString('id-ID')}
                </span>
              </div>

              <p style={{ margin: '0 0 8px', fontSize: 14, whiteSpace: 'pre-wrap' }}>{r.description}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                Pelapor: {r.requester_name}{r.department ? ` (${r.department})` : ''}
              </p>

              {r.photo_url && (
                <a href={r.photo_url} target="_blank" rel="noopener noreferrer">
                  <img src={r.photo_url} alt="Foto laporan"
                    style={{ marginTop: 12, maxWidth: '100%', maxHeight: 240, borderRadius: 6, border: '1px solid var(--border)', display: 'block' }} />
                </a>
              )}

              {r.status === 'rejected' && r.reject_reason && (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--danger)', background: '#fdecea', padding: 10, borderRadius: 6 }}>
                  Alasan ditolak: {r.reject_reason}
                </p>
              )}

              {r.status === 'open' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => handleApprove(r)} disabled={processingId === r.id}
                    style={{ padding: '8px 18px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: processingId === r.id ? 0.6 : 1 }}>
                    {processingId === r.id ? 'Memproses...' : '✓ Setujui (jadi Work Order)'}
                  </button>
                  <button onClick={() => { setRejectId(r.id); setRejectReason('') }} disabled={processingId === r.id}
                    style={{ padding: '8px 18px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    ✗ Tolak
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 8, width: 440, maxWidth: '90%' }}>
            <h3 style={{ color: 'var(--danger)', marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Tolak Laporan</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Tulis alasan penolakan (wajib). Alasan ini tersimpan sebagai catatan.
            </p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Contoh: laporan palsu / sudah pernah dilaporkan"
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => { setRejectId(null); setRejectReason('') }}
                style={{ flex: 1, padding: 10, background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Batal
              </button>
              <button onClick={() => sendAction(rejectId, 'reject', rejectReason)}
                disabled={!rejectReason.trim() || processingId === rejectId}
                style={{
                  flex: 1, padding: 10, border: 'none', borderRadius: 6, fontWeight: 600, color: 'white',
                  background: rejectReason.trim() ? 'var(--danger)' : '#e0e0e0',
                  cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                }}>
                {processingId === rejectId ? 'Memproses...' : 'Tolak Laporan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}