'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type Asset = {
  id: string
  category: string
  sub_category: string
  location: string
}

type Sparepart = { id: string; name: string; unit: string }
type PartUsage = { sparepart_id: string; quantity: string }

type Incident = {
  id: string
  asset_id: string
  reported_by: string
  reported_at: string
  description: string
  status: 'open' | 'resolved'
  resolved_by: string | null
  resolved_at: string | null
  resolution_description: string | null
  reporter_name?: string
  resolver_name?: string
}

export default function BreakdownPage() {
  const supabase = createClient()
  const [assets, setAssets] = useState<Asset[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved'>('open')

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubCategory, setSelectedSubCategory] = useState('')
  const [selectedAsset, setSelectedAsset] = useState('')
  const [description, setDescription] = useState('')

  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionText, setResolutionText] = useState('')

  const [spareparts, setSpareparts] = useState<Sparepart[]>([])
  const [noPartUsed, setNoPartUsed] = useState(false)
  const [partUsages, setPartUsages] = useState<PartUsage[]>([{ sparepart_id: '', quantity: '' }])

  useEffect(() => {
    fetchAssets()
    fetchIncidents()
    fetchSpareparts()
  }, [])

  async function fetchAssets() {
    const { data } = await supabase
      .from('assets')
      .select('id, category, sub_category, location')
      .order('category').order('sub_category').order('id')
    setAssets(data || [])
  }

  async function fetchSpareparts() {
    const { data } = await supabase.from('spareparts').select('id, name, unit').eq('is_active', true).order('name')
    setSpareparts(data || [])
  }

  async function fetchIncidents() {
    setLoading(true)
    const { data } = await supabase
      .from('breakdown_incidents')
      .select('*')
      .order('reported_at', { ascending: false })

    if (!data) {
      setIncidents([])
      setLoading(false)
      return
    }

    const userIds = Array.from(new Set(
      data.flatMap(i => [i.reported_by, i.resolved_by]).filter(Boolean)
    ))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    const nameMap = new Map((profiles || []).map(p => [p.id, p.full_name]))

    setIncidents(data.map(i => ({
      ...i,
      reporter_name: nameMap.get(i.reported_by) || '—',
      resolver_name: i.resolved_by ? (nameMap.get(i.resolved_by) || '—') : undefined,
    })))
    setLoading(false)
  }

  function resetPartForm() {
    setNoPartUsed(false)
    setPartUsages([{ sparepart_id: '', quantity: '' }])
  }

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

  async function handleSubmitReport() {
    if (!selectedAsset || !description.trim()) return
    setSaving(true)
    const { data: session } = await supabase.auth.getSession()

    const { error } = await supabase.from('breakdown_incidents').insert({
      asset_id: selectedAsset,
      reported_by: session.session?.user.id,
      description: description.trim(),
    })

    setSaving(false)
    if (error) {
      alert('Gagal melapor: ' + error.message)
      return
    }

    setShowForm(false)
    setSelectedCategory('')
    setSelectedSubCategory('')
    setSelectedAsset('')
    setDescription('')
    fetchAssets()
    fetchIncidents()
  }

  async function handleSubmitResolution(id: string) {
    if (!resolutionText.trim()) return
    if (!sparepartsValid) return alert('Pilih sparepart yang dipakai, atau centang "Tidak ada sparepart dipakai"')
    setSaving(true)
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id

    const { error } = await supabase.from('breakdown_incidents').update({
      status: 'resolved',
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolution_description: resolutionText.trim(),
    }).eq('id', id)

    if (error) {
      setSaving(false)
      alert('Gagal menyimpan penyelesaian: ' + error.message)
      return
    }

    if (!noPartUsed && validPartRows.length > 0) {
      await supabase.from('sparepart_usage').insert(
        validPartRows.map(r => ({
          sparepart_id: r.sparepart_id,
          source_type: 'breakdown_incident',
          source_id: id,
          quantity: parseFloat(r.quantity),
          user_id: userId,
        }))
      )
      for (const row of validPartRows) {
        const { data: current } = await supabase.from('spareparts').select('current_stock').eq('id', row.sparepart_id).single()
        if (current) {
          const newStock = current.current_stock - parseFloat(row.quantity)
          await supabase.from('spareparts').update({ current_stock: newStock }).eq('id', row.sparepart_id)
          await supabase.from('sparepart_transactions').insert({
            sparepart_id: row.sparepart_id,
            type: 'out',
            quantity: parseFloat(row.quantity),
            notes: `Dipakai di Lapor Kerusakan`,
            user_id: userId,
          })
        }
      }
    }

    setResolvingId(null)
    setResolutionText('')
    resetPartForm()
    setSaving(false)
    fetchIncidents()
  }

  function formatDuration(start: string, end: string | null): string {
    const startMs = new Date(start).getTime()
    const endMs = end ? new Date(end).getTime() : Date.now()
    const diffMin = Math.floor((endMs - startMs) / 60000)
    const hours = Math.floor(diffMin / 60)
    const mins = diffMin % 60
    if (hours === 0) return `${mins} menit`
    return `${hours} jam ${mins} menit`
  }

  const openCount = incidents.filter(i => i.status === 'open').length
  const closedCount = incidents.filter(i => i.status === 'resolved').length
  const filtered = incidents.filter(i => i.status === statusFilter)

  // Daftar kategori unik untuk dropdown pertama
  const categories = Array.from(new Set(assets.map(a => a.category).filter(Boolean))).sort()

  // Sub-kategori yang muncul difilter berdasarkan kategori terpilih
  const subCategories = Array.from(new Set(
    assets.filter(a => !selectedCategory || a.category === selectedCategory)
      .map(a => a.sub_category).filter(Boolean)
  )).sort()

  // Unit yang muncul difilter berdasarkan kategori + sub-kategori terpilih
  const filteredAssetsForDropdown = assets.filter(a =>
    (!selectedCategory || a.category === selectedCategory) &&
    (!selectedSubCategory || a.sub_category === selectedSubCategory)
  )

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
    boxShadow: 'var(--shadow)', marginBottom: '24px'
  }
  const fieldInput: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box'
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
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Lapor Kerusakan</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
              Reactive maintenance — kerusakan mendadak di luar jadwal PM
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '10px 16px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            + Lapor Kerusakan
          </button>
        </div>

        {showForm && (
          <div style={{ ...card, border: '1px solid var(--danger)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)', marginBottom: 20 }}>Laporan Kerusakan Baru</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={fieldLabel}>Kategori *</label>
                  <select
                    value={selectedCategory}
                    onChange={e => { setSelectedCategory(e.target.value); setSelectedSubCategory(''); setSelectedAsset('') }}
                    style={fieldInput}
                  >
                    <option value="">-- Pilih kategori --</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={fieldLabel}>Sub Kategori</label>
                  <select
                    value={selectedSubCategory}
                    onChange={e => { setSelectedSubCategory(e.target.value); setSelectedAsset('') }}
                    disabled={!selectedCategory}
                    style={{ ...fieldInput, opacity: selectedCategory ? 1 : 0.5 }}
                  >
                    <option value="">-- Semua sub kategori --</option>
                    {subCategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={fieldLabel}>Unit / Equipment *</label>
                  <select
                    value={selectedAsset}
                    onChange={e => setSelectedAsset(e.target.value)}
                    disabled={!selectedCategory}
                    style={{ ...fieldInput, opacity: selectedCategory ? 1 : 0.5 }}
                  >
                    <option value="">-- Pilih unit --</option>
                    {filteredAssetsForDropdown.map(a => (
                      <option key={a.id} value={a.id}>{a.id} — {a.location || '-'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={fieldLabel}>Deskripsi Kerusakan *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Contoh: Bearing motor pecah, mesin stop total"
                  rows={3}
                  style={{ ...fieldInput, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowForm(false); setSelectedCategory(''); setSelectedSubCategory(''); setSelectedAsset(''); setDescription('') }}
                  style={{ padding: '8px 16px', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
                  Batal
                </button>
                <button onClick={handleSubmitReport} disabled={saving || !selectedAsset || !description.trim()}
                  style={{
                    padding: '8px 16px',
                    background: (selectedAsset && description.trim()) ? 'var(--danger)' : '#e0e0e0',
                    color: 'white', border: 'none', borderRadius: 4,
                    cursor: (selectedAsset && description.trim()) ? 'pointer' : 'not-allowed', fontWeight: 600
                  }}>
                  {saving ? 'Menyimpan...' : 'Kirim Laporan'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div
            onClick={() => setStatusFilter('open')}
            style={{
              ...card, marginBottom: 0, padding: 16, textAlign: 'center', cursor: 'pointer',
              border: statusFilter === 'open' ? '2px solid var(--danger)' : '2px solid transparent'
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Open</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--danger)', margin: 0 }}>{openCount}</p>
          </div>
          <div
            onClick={() => setStatusFilter('resolved')}
            style={{
              ...card, marginBottom: 0, padding: 16, textAlign: 'center', cursor: 'pointer',
              border: statusFilter === 'resolved' ? '2px solid var(--success)' : '2px solid transparent'
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Closed</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)', margin: 0 }}>{closedCount}</p>
          </div>
        </div>

        {loading ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Tidak ada laporan {statusFilter === 'open' ? 'Open' : 'Closed'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(inc => (
              <div key={inc.id} style={{
                ...card, marginBottom: 0,
                borderLeft: `4px solid ${inc.status === 'resolved' ? 'var(--success)' : 'var(--danger)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{inc.asset_id}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{inc.description}</p>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                      Dilaporkan oleh {inc.reporter_name} · {new Date(inc.reported_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 12,
                    background: inc.status === 'resolved' ? '#eafaf1' : '#fdecea',
                    color: inc.status === 'resolved' ? 'var(--success)' : 'var(--danger)', whiteSpace: 'nowrap'
                  }}>
                    ⏱ {inc.status === 'resolved' ? 'Total' : 'Downtime'}: {formatDuration(inc.reported_at, inc.resolved_at)}
                  </span>
                </div>

                {inc.status === 'resolved' && (
                  <>
                    <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--success)', background: 'var(--bg-main)', padding: 10, borderRadius: 6 }}>
                      ✓ {inc.resolution_description}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                      Diperbaiki oleh {inc.resolver_name} · {inc.resolved_at && new Date(inc.resolved_at).toLocaleString('id-ID')}
                    </p>
                  </>
                )}

                {inc.status === 'open' && (
                  <>
                    {resolvingId === inc.id ? (
                      <div style={{ marginTop: 12 }}>
                        <textarea value={resolutionText} onChange={e => setResolutionText(e.target.value)}
                          placeholder="Deskripsikan tindakan perbaikan yang sudah dilakukan..."
                          rows={2}
                          style={{ ...fieldInput, resize: 'vertical' }} />

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
                          <button onClick={() => { setResolvingId(null); setResolutionText(''); resetPartForm() }}
                            style={{ flex: 1, padding: 8, background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                            Batal
                          </button>
                          <button onClick={() => handleSubmitResolution(inc.id)}
                            disabled={!resolutionText.trim() || !sparepartsValid || saving}
                            style={{ flex: 1, padding: 8, background: (resolutionText.trim() && sparepartsValid) ? 'var(--success)' : '#e0e0e0', color: 'white', border: 'none', borderRadius: 6, cursor: (resolutionText.trim() && sparepartsValid) ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                            {saving ? 'Menyimpan...' : '✓ Selesai Diperbaiki'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setResolvingId(inc.id)}
                        style={{ marginTop: 10, padding: '8px 16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        Tandai Selesai Diperbaiki
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
