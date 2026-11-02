'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activityLog'

type Sparepart = { id: string; name: string; unit: string }
type PartUsage = { sparepart_id: string; quantity: string }

type Props = {
  instanceId: string
  onDone: () => void    // dipanggil setelah berhasil disimpan
  onCancel: () => void  // dipanggil saat klik Batal
}

export default function CompleteWorkOrderForm({ instanceId, onDone, onCancel }: Props) {
  const supabase = createClient()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [spareparts, setSpareparts] = useState<Sparepart[]>([])
  const [noPartUsed, setNoPartUsed] = useState(false)
  const [partUsages, setPartUsages] = useState<PartUsage[]>([{ sparepart_id: '', quantity: '' }])

  useEffect(() => {
    supabase.from('spareparts').select('id, name, unit').eq('is_active', true).order('name')
      .then(({ data }) => setSpareparts(data || []))
  }, [])

  function addPartRow() {
    setPartUsages(prev => [...prev, { sparepart_id: '', quantity: '' }])
  }
  function removePartRow(index: number) {
    setPartUsages(prev => prev.filter((_, i) => i !== index))
  }
  function updatePartRow(index: number, field: 'sparepart_id' | 'quantity', value: string) {
    setPartUsages(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const validPartRows = partUsages.filter(r => r.sparepart_id && parseFloat(r.quantity) > 0)
  const sparepartsValid = noPartUsed || validPartRows.length > 0
  const canSubmit = notes.trim() !== '' && sparepartsValid && !saving

  async function notifyTelegram(id: string) {
    try {
      const { data: session } = await supabase.auth.getSession()
      await fetch('/api/notify/task-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ event: 'completed', id }),
      })
    } catch (e) {
      console.error('Notif Telegram gagal:', e)
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)

    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id

    // .select('id') dipakai supaya kita tahu update benar-benar mengenai 1 baris.
    // Kalau diblok RLS, Supabase tidak memberi error, tapi hasilnya kosong.
    const { data: updated, error } = await supabase
      .from('pm_task_instances')
      .update({
        status: 'completed',
        completed_by: userId,
        completed_at: new Date().toISOString(),
        notes: notes.trim(),
      })
      .eq('id', instanceId)
      .select('id')

    if (error || !updated || updated.length === 0) {
      alert('Gagal menandai selesai: ' + (error?.message ?? 'tidak ada data yang berubah (kemungkinan diblok izin database)'))
      setSaving(false)
      return
    }

    if (!noPartUsed && validPartRows.length > 0) {
      await supabase.from('sparepart_usage').insert(
        validPartRows.map(r => ({
          sparepart_id: r.sparepart_id,
          source_type: 'work_order',
          source_id: instanceId,
          quantity: parseFloat(r.quantity),
          user_id: userId,
        }))
      )
      for (const row of validPartRows) {
        const { data: current } = await supabase
          .from('spareparts').select('current_stock').eq('id', row.sparepart_id).single()
        if (current) {
          const newStock = current.current_stock - parseFloat(row.quantity)
          await supabase.from('spareparts').update({ current_stock: newStock }).eq('id', row.sparepart_id)
          await supabase.from('sparepart_transactions').insert({
            sparepart_id: row.sparepart_id,
            type: 'out',
            quantity: parseFloat(row.quantity),
            notes: 'Dipakai di Work Order',
            user_id: userId,
          })
        }
      }
    }

    await logActivity(supabase, {
      action: 'update',
      entity_type: 'pm_task_instance',
      entity_id: instanceId,
      old_value: { status: 'pending' },
      new_value: { status: 'completed', notes: notes.trim() },
    })
    await notifyTelegram(instanceId)

    setSaving(false)
    onDone()
  }

  const fieldInput: React.CSSProperties = {
    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px'
  }

  return (
    <div style={{ marginTop: 12 }}>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Catatan penyelesaian (wajib)..."
        rows={3}
        style={{ ...fieldInput, width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
      />

      <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-main)', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>🔧 Sparepart Dipakai</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={noPartUsed} onChange={e => setNoPartUsed(e.target.checked)} />
            Tidak ada sparepart dipakai
          </label>
        </div>
        {!noPartUsed && (
          spareparts.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Belum ada sparepart terdaftar.</p>
          ) : (
            <>
              {partUsages.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <select
                    value={row.sparepart_id}
                    onChange={e => updatePartRow(i, 'sparepart_id', e.target.value)}
                    style={{ ...fieldInput, flex: 2, fontSize: 13 }}
                  >
                    <option value="">-- Pilih part --</option>
                    {spareparts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={e => updatePartRow(i, 'quantity', e.target.value)}
                    style={{ ...fieldInput, flex: 1, minWidth: 60, fontSize: 13 }}
                    min="0" step="any"
                  />
                  {partUsages.length > 1 && (
                    <button onClick={() => removePartRow(i)} type="button"
                      style={{ padding: '6px 10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addPartRow} type="button"
                style={{ padding: '5px 10px', background: 'white', color: 'var(--primary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                + Tambah Part Lain
              </button>
            </>
          )
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onCancel} type="button"
          style={{ flex: 1, padding: 8, background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          Batal
        </button>
        <button onClick={handleSubmit} disabled={!canSubmit} type="button"
          style={{ flex: 1, padding: 8, background: canSubmit ? 'var(--success)' : '#e0e0e0', color: 'white', border: 'none', borderRadius: 6, cursor: canSubmit ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
          {saving ? 'Menyimpan...' : '✓ Tandai Selesai'}
        </button>
      </div>
    </div>
  )
}