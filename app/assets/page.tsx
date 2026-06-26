'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Navbar from '@/components/Navbar'

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
  const [filterSubCategory, setFilterSubCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [subCategories, setSubCategories] = useState<string[]>([])

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

      const cats = [...new Set((data || []).map(a => a.category).filter(Boolean))]
      setCategories(cats as string[])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  // Update sub categories when category changes
  useEffect(() => {
    if (filterCategory) {
      const subs = [...new Set(
        assets
          .filter(a => a.category === filterCategory)
          .map(a => a.sub_category)
          .filter(Boolean)
      )]
      setSubCategories(subs as string[])
      setFilterSubCategory('')
    } else {
      setSubCategories([])
      setFilterSubCategory('')
    }
  }, [filterCategory, assets])

  const filtered = assets.filter(a => {
    const matchSearch = !search || 
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.location?.toLowerCase().includes(search.toLowerCase()) ||
      a.serial_number?.toLowerCase().includes(search.toLowerCase())
    
    const matchCategory = !filterCategory || a.category === filterCategory
    const matchSubCategory = !filterSubCategory || a.sub_category === filterSubCategory
    
    return matchSearch && matchCategory && matchSubCategory
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
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px' }}>Assets</h1>

        {error && <div style={{ color: 'red', marginBottom: '10px', padding: '10px', background: '#fee2e2', borderRadius: '4px' }}>Error: {error}</div>}

        {/* Search & Filter */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'white', padding: '15px', borderRadius: '8px' }}>
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
            style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', minWidth: '150px' }}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {filterCategory && (
            <select
              value={filterSubCategory}
              onChange={(e) => setFilterSubCategory(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', minWidth: '150px' }}
            >
              <option value="">All Sub Categories</option>
              {subCategories.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          )}
          <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterSubCategory(''); }} style={{ padding: '8px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
            Clear
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <p style={{ color: '#666', fontSize: '12px', padding: '12px 16px', borderBottom: '1px solid #eee' }}>Showing {filtered.length} of {assets.length}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Sub Category</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Location</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Serial</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Exp Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '12px' }}>{a.id}</td>
                    <td style={{ padding: '12px' }}>{a.category || '—'}</td>
                    <td style={{ padding: '12px' }}>{a.sub_category || '—'}</td>
                    <td style={{ padding: '12px' }}>{a.location || '—'}</td>
                    <td style={{ padding: '12px' }}>{a.serial_number || '—'}</td>
                    <td style={{ padding: '12px' }}>{a.expired_date || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: a.status === 'active' ? '#d4edda' : a.status === 'expired' ? '#f8d7da' : '#fff3cd', color: a.status === 'active' ? '#155724' : a.status === 'expired' ? '#721c24' : '#856404', fontSize: '11px' }}>
                        {a.status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => openEdit(a)} style={{ padding: '6px 12px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', maxWidth: '450px', width: '90%' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Edit {editId}</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="standby">Standby</option>
                <option value="maintenance">Maintenance</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>Expired Date</label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setEditId(null)} disabled={saving} style={{ flex: 1, padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
              <button onClick={() => handleSave(editId)} disabled={saving} style={{ flex: 1, padding: '10px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}