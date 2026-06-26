'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Asset = {
  id: string
  category?: string
  sub_category?: string
  location?: string
  brand?: string
  serial_number?: string
  expired_date?: string
  status?: string
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    loadAssets()
  }, [])

  async function loadAssets() {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('assets')
        .select('id, category, sub_category, location, brand, serial_number, expired_date, status')
        .limit(500)

      if (err) {
        setError(err.message)
        return
      }

      setAssets(data || [])

      // Extract unique categories
      const cats = [...new Set((data || []).map(a => a.category).filter(Boolean))]
      setCategories(cats as string[])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const filtered = assets.filter(a => {
    const matchSearch = !search || 
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.location?.toLowerCase().includes(search.toLowerCase()) ||
      a.serial_number?.toLowerCase().includes(search.toLowerCase())
    
    const matchCategory = !filterCategory || a.category === filterCategory
    
    return matchSearch && matchCategory
  })

  async function handleSave(id: string) {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('assets')
        .update({
          status: editStatus,
          expired_date: editDate || null
        })
        .eq('id', id)

      if (error) {
        alert('Error: ' + error.message)
        return
      }

      await loadAssets()
      setEditId(null)
    } catch (e) {
      alert('Error: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  function openEdit(asset: Asset) {
    setEditId(asset.id)
    setEditStatus(asset.status || 'active')
    setEditDate(asset.expired_date || '')
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Assets</h1>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>}

      {/* Search & Filter */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search ID, Location, Serial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', minWidth: '200px' }}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button onClick={() => { setSearch(''); setFilterCategory(''); }} style={{ padding: '8px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <p style={{ color: '#666', fontSize: '12px' }}>Showing {filtered.length} of {assets.length}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Serial</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Exp Date</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{a.id}</td>
                  <td style={{ padding: '8px' }}>{a.category || '—'}</td>
                  <td style={{ padding: '8px' }}>{a.location || '—'}</td>
                  <td style={{ padding: '8px' }}>{a.serial_number || '—'}</td>
                  <td style={{ padding: '8px' }}>{a.expired_date || '—'}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: a.status === 'active' ? '#90EE90' : '#FFB6C6' }}>
                      {a.status || 'active'}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => openEdit(a)} style={{ padding: '4px 8px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '400px' }}>
            <h3>Edit {editId}</h3>

            <div style={{ marginBottom: '10px' }}>
              <label>Status:</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box' }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="standby">Standby</option>
                <option value="maintenance">Maintenance</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Expired Date:</label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditId(null)} disabled={saving} style={{ flex: 1, padding: '8px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleSave(editId)} disabled={saving} style={{ flex: 1, padding: '8px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}