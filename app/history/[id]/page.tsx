'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type Submission = {
  id: string
  asset_id: string
  sub_category: string
  location: string
  status: string
  inspector: string
  month: string
  year: number
  submitted_at: string
  approved_at: string | null
}

type Item = {
  id: string
  label: string
  result: string
}

export default function DetailPage() {
  const supabase = createClient()
  const { id } = useParams()
  const [sub, setSub] = useState<Submission | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [corrective, setCorrective] = useState<{ description: string; created_at: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: i }, { data: c }] = await Promise.all([
        supabase.from('checklist_submissions').select('*').eq('id', id).single(),
        supabase.from('checklist_items').select('*').eq('submission_id', id),
        supabase.from('corrective_actions').select('*').eq('submission_id', id).single(),
      ])
      setSub(s)
      setItems(i || [])
      setCorrective(c || null)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleApprove() {
    await supabase.from('checklist_submissions').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    window.location.reload()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Loading...</div>
    </div>
  )

  if (!sub) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Data tidak ditemukan</div>
    </div>
  )

  const okCount = items.filter(i => i.result === 'OK').length

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: '700px', margin: '0 auto' }}>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a73e8' }}>{sub.asset_id}</div>
              <div style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>{sub.month} {sub.year} · {sub.location}</div>
            </div>
            <span style={{
              background: sub.status==='ok'?'#f0fdf4':sub.status==='approved'?'#eff6ff':sub.status==='corrected'?'#fffbeb':'#fff1f2',
              color: sub.status==='ok'?'#22c55e':sub.status==='approved'?'#3b82f6':sub.status==='corrected'?'#f59e0b':'#ef4444',
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600
            }}>
              {sub.status==='ok'?'✓ OK':sub.status==='approved'?'✓ Approved':sub.status==='corrected'?'⚡ Corrected':'✗ NOK'}
            </span>
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
            {[
              { label: 'No. Unit', value: sub.asset_id },
              { label: 'Lokasi', value: sub.location || '—' },
              { label: 'Sub Kategori', value: sub.sub_category },
              { label: 'Inspector', value: sub.inspector },
              { label: 'Waktu Submit', value: new Date(sub.submitted_at).toLocaleString('id-ID') },
              { label: 'Approved', value: sub.approved_at ? new Date(sub.approved_at).toLocaleString('id-ID') : '—' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ color: '#aaa', marginBottom: '4px' }}>{f.label}</div>
                <div style={{ fontWeight: 500 }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Item Checklist ({items.length} poin)</span>
            <span style={{ fontSize: '13px', color: okCount === items.length ? '#22c55e' : '#f59e0b' }}>
              {okCount}/{items.length} OK
            </span>
          </div>
          {items.map(item => (
            <div key={item.id}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                borderRadius: '8px', marginBottom: '8px',
                background: item.result === 'OK' ? '#f0fdf4' : '#fff1f2',
                border: item.result === 'OK' ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                background: item.result === 'OK' ? '#22c55e' : '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '13px' }}>
                {item.result === 'OK' ? '✓' : '✗'}
              </div>
              <span style={{ fontSize: '13px', flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: '12px', fontWeight: 500,
                color: item.result === 'OK' ? '#22c55e' : '#ef4444' }}>
                {item.result}
              </span>
            </div>
          ))}
        </div>

        {sub.status === 'corrected' && corrective && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: '16px',
            border: '1px solid #fcd34d' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b', marginBottom: '16px' }}>
              ⚡ Corrective Action
            </h3>
            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px',
              border: '1px solid #fde68a', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                {corrective.description}
              </p>
            </div>
            <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
              Diperbaiki pada: {new Date(corrective.created_at).toLocaleString('id-ID')}
            </p>
          </div>
        )}
        {sub.status === 'ok' && (
          <button onClick={handleApprove}
            style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
              background: '#3b82f6', color: 'white', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
            ✓ Approve Submission
          </button>
        )}

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href="/history" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>
            ← Kembali ke Riwayat
          </a>
        </div>
      </div>
    </div>
  )
}