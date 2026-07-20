'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { logActivity } from '@/lib/activityLog'

type Sparepart = {
  id: string
  name: string
  category: string | null
  linked_sub_category: string | null
  unit: string
  current_stock: number
  min_stock: number
  estimated_price: number | null
  storage_location: string | null
  is_active: boolean
}

type Transaction = {
  id: string
  sparepart_id: string
  type: 'in' | 'out'
  quantity: number
  notes: string | null
  created_at: string
  spareparts: { name: string } | null
}

const SUB_CATEGORIES = [
  'Fire Extinguisher','Fire Hydrant','Emergency Door','Smoke & Heat Detector','Evacuation Lamp',
  'AC Single Split','AC Cassette','AC Single Split Duct Type','AC Multi Split Duct Type','AC Package',
  'Cooling Tower','Exhaust Fan','Adsorption Tower','Panel Listrik',
  'Air Compressor','Air Dryer','Pompa Distribusi CT 2 Cell','Pompa Distribusi CT 1 Cell',
  'Pompa Supply CT','Pompa Booster','Pompa Pemadam Kebakaran'
]

export default function SparepartsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'parts' | 'transactions'>('parts')
  const [parts, setParts] = useState<Sparepart[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTxForm, setShowTxForm] = useState<{ part: Sparepart; type: 'in' | 'out' } | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [linkedSub, setLinkedSub] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [minStock, setMinStock] = useState('0')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const [txQty, setTxQty] = useState('')
  const [txNotes, setTxNotes] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: p } = await supabase.from('spareparts').select('*').eq('is_active', true).order('name')
    setParts(p || [])
    const { data: t } = await supabase.from('sparepart_transactions')
      .select('*, spareparts(name)').order('created_at', { ascending: false }).limit(100)
    setTransactions((t as any) || [])
    setLoading(false)
  }

  async function handleAddPart() {
    if (!name.trim()) return
    setSaving(true)
    const { data: part } = await supabase.from('spareparts').insert({
      name, category: category || null, linked_sub_category: linkedSub || null,
      unit, min_stock: parseFloat(minStock) || 0,
      estimated_price: price ? parseFloat(price) : null,
      storage_location: location || null,
    }).select().single()
    if (part) {
      await logActivity(supabase, {
        action: 'create', entity_type: 'sparepart', entity_id: part.id,
        new_value: { name, category, linked_sub_category: linkedSub },
      })
    }
    setSaving(false)
    setShowAddForm(false)
    setName(''); setCategory(''); setLinkedSub(''); setUnit('pcs'); setMinStock('0'); setPrice(''); setLocation('')
    fetchAll()
  }

  async function handleTransaction() {
    if (!showTxForm || !txQty || parseFloat(txQty) <= 0) return
    setSaving(true)
    const { data: session } = await supabase.auth.getSession()
    const qty = parseFloat(txQty)
    const { part, type } = showTxForm

    await supabase.from('sparepart_transactions').insert({
      sparepart_id: part.id, type, quantity: qty,
      notes: txNotes || null, user_id: session.session?.user.id,
    })

    const newStock = type === 'in' ? part.current_stock + qty : part.current_stock - qty
    await supabase.from('spareparts').update({ current_stock: newStock }).eq('id', part.id)

    await logActivity(supabase, {
      action: 'update', entity_type: 'sparepart', entity_id: part.id,
      old_value: { current_stock: part.current_stock },
      new_value: { current_stock: newStock, transaction_type: type, quantity: qty },
    })

    setSaving(false)
    setShowTxForm(null)
    setTxQty('')
    setTxNotes('')
    fetchAll()
  }

  const filteredParts = parts.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  const totalParts = parts.length
  const lowStockCount = parts.filter(p => p.current_stock <= p.min_stock).length
  const totalTransactions = transactions.length
  const estValue = parts.reduce((sum, p) => sum + (p.current_stock * (p.estimated_price || 0)), 0)

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
    boxShadow: 'var(--shadow)', marginBottom: '24px'
  }
  const fieldInput: React.CSSProperties = {
    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', width: '100%', boxSizing: 'border-box'
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Spareparts Inventory</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{totalParts} parts registered</p>
          </div>
          <button onClick={() => setShowAddForm(true)} style={{
            padding: '10px 20px', background: 'var(--primary)', color: 'white',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14
          }}>
            + Add Part
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ ...card, marginBottom: 0, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)', margin: '0 0 4px' }}>{totalParts}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Total Parts</p>
          </div>
          <div style={{ ...card, marginBottom: 0, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)', margin: '0 0 4px' }}>{lowStockCount}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Low Stock</p>
          </div>
          <div style={{ ...card, marginBottom: 0, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', margin: '0 0 4px' }}>{totalTransactions}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Transactions</p>
          </div>
          <div style={{ ...card, marginBottom: 0, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--secondary)', margin: '0 0 4px' }}>Rp {estValue.toLocaleString('id-ID')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Est. Value</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button onClick={() => setTab('parts')} style={{
            padding: '8px 18px', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === 'parts' ? 'var(--primary)' : 'var(--bg-card)',
            color: tab === 'parts' ? 'white' : 'var(--text-primary)', boxShadow: 'var(--shadow)'
          }}>
            Spareparts
          </button>
          <button onClick={() => setTab('transactions')} style={{
            padding: '8px 18px', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === 'transactions' ? 'var(--primary)' : 'var(--bg-card)',
            color: tab === 'transactions' ? 'white' : 'var(--text-primary)', boxShadow: 'var(--shadow)'
          }}>
            Transactions
          </button>
        </div>

        {tab === 'parts' ? (
          <>
            <div style={card}>
              <input placeholder="🔍 Search parts..." value={search} onChange={e => setSearch(e.target.value)} style={fieldInput} />
            </div>

            {loading ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat...</div>
            ) : filteredParts.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>No spareparts found</div>
            ) : (
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--primary)', color: 'white' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nama</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Kategori</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Stok</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Lokasi</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.map((p, i) => {
                      const isLow = p.current_stock <= p.min_stock
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'white' : 'var(--bg-main)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                            {p.name}
                            {p.linked_sub_category && (
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>
                                khusus: {p.linked_sub_category}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{p.category || '—'}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 700, color: isLow ? 'var(--danger)' : 'var(--text-primary)'
                            }}>
                              {p.current_stock} {p.unit}
                            </span>
                            {isLow && <span style={{ display: 'block', fontSize: 10, color: 'var(--danger)' }}>⚠️ Low Stock</span>}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{p.storage_location || '—'}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button onClick={() => setShowTxForm({ part: p, type: 'in' })}
                                style={{ padding: '4px 10px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                + In
                              </button>
                              <button onClick={() => setShowTxForm({ part: p, type: 'out' })}
                                style={{ padding: '4px 10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                − Out
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {transactions.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Belum ada transaksi</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: 'white' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Waktu</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Part</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Tipe</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Jumlah</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'white' : 'var(--bg-main)' }}>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(t.created_at).toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{t.spareparts?.name || '—'}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: t.type === 'in' ? '#eafaf1' : '#fdecea',
                          color: t.type === 'in' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {t.type === 'in' ? '+ In' : '− Out'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600 }}>{t.quantity}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Add Part */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 8, width: 440, maxWidth: '90%', maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Tambah Sparepart Baru</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={fieldLabel}>Nama Part *</label>
                <input value={name} onChange={e => setName(e.target.value)} style={fieldInput} placeholder="Contoh: Filter Oli" />
              </div>
              <div>
                <label style={fieldLabel}>Kategori (bebas)</label>
                <input value={category} onChange={e => setCategory(e.target.value)} style={fieldInput} placeholder="Contoh: Filter" />
              </div>
              <div>
                <label style={fieldLabel}>Khusus untuk Sub Kategori (opsional)</label>
                <select value={linkedSub} onChange={e => setLinkedSub(e.target.value)} style={fieldInput}>
                  <option value="">Generic (semua unit)</option>
                  {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Satuan</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)} style={fieldInput}>
                    <option value="pcs">pcs</option>
                    <option value="liter">liter</option>
                    <option value="box">box</option>
                    <option value="unit">unit</option>
                    <option value="meter">meter</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Min. Stok</label>
                  <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} style={fieldInput} />
                </div>
              </div>
              <div>
                <label style={fieldLabel}>Harga Estimasi (Rp, opsional)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} style={fieldInput} />
              </div>
              <div>
                <label style={fieldLabel}>Lokasi Penyimpanan (opsional)</label>
                <input value={location} onChange={e => setLocation(e.target.value)} style={fieldInput} placeholder="Contoh: Gudang A, Rak 3" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: 10, background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Batal
              </button>
              <button onClick={handleAddPart} disabled={!name.trim() || saving}
                style={{ flex: 1, padding: 10, background: name.trim() ? 'var(--primary)' : '#e0e0e0', color: 'white', border: 'none', borderRadius: 6, cursor: name.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                {saving ? 'Menyimpan...' : 'Simpan Part'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal In/Out Transaction */}
      {showTxForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 8, width: 400, maxWidth: '90%' }}>
            <h3 style={{ color: showTxForm.type === 'in' ? 'var(--success)' : 'var(--danger)', marginBottom: 4, fontSize: 18, fontWeight: 700 }}>
              {showTxForm.type === 'in' ? '+ Stock In' : '− Stock Out'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {showTxForm.part.name} — Stok saat ini: {showTxForm.part.current_stock} {showTxForm.part.unit}
            </p>
            <label style={fieldLabel}>Jumlah *</label>
            <input type="number" value={txQty} onChange={e => setTxQty(e.target.value)} style={fieldInput} placeholder="0" />
            <label style={{ ...fieldLabel, marginTop: 12 }}>Catatan (opsional)</label>
            <textarea value={txNotes} onChange={e => setTxNotes(e.target.value)} rows={2} style={{ ...fieldInput, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => { setShowTxForm(null); setTxQty(''); setTxNotes('') }}
                style={{ flex: 1, padding: 10, background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Batal
              </button>
              <button onClick={handleTransaction} disabled={!txQty || parseFloat(txQty) <= 0 || saving}
                style={{ flex: 1, padding: 10, background: txQty ? (showTxForm.type === 'in' ? 'var(--success)' : 'var(--danger)') : '#e0e0e0', color: 'white', border: 'none', borderRadius: 6, cursor: txQty ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}