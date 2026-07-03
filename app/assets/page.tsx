'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

const supabase = createClient()

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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return { bg: '#d4edda', color: '#155724', label: '🟢 Active' }
      case 'inactive': return { bg: '#e2e3e5', color: '#383d41', label: '⚫ Inactive' }
      case 'standby': return { bg: '#fff3cd', color: '#856404', label: '🟡 Standby' }
      case 'maintenance': return { bg: '#f8d7da', color: '#721c24', label: '🟠 Maintenance' }
      case 'expired': return { bg: '#f8d7da', color: '#721c24', label: '🔴 Expired' }
      default: return { bg: '#e8f4f8', color: '#004085', label: 'Active' }
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
            Asset Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Manage and track all company assets, their status, and maintenance schedules
          </p>
        </div>

        {error && (
          <div style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            border: '1px solid #f5c6cb'
          }}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Search & Filter Card */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: 'var(--shadow)',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--primary)' }}>
            🔍 Search & Filter
          </h3>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search ID, Location, Serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                minWidth: '150px',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
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
                style={{
                  minWidth: '150px',
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">All Sub Categories</option>
                {subCategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => { setSearch(''); setFilterCategory(''); setFilterSubCategory(''); }}
              style={{
                padding: '10px 16px',
                background: 'var(--text-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div style={{
          marginBottom: '16px',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          Showing <strong style={{ color: 'var(--primary)' }}>{filtered.length}</strong> of <strong>{assets.length}</strong> assets
        </div>

        {/* Table Card */}
        {loading ? (
          <div style={{
            background: 'var(--bg-card)',
            padding: '48px',
            borderRadius: '8px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            Loading assets...
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{
                  background: 'var(--primary)',
                  color: 'white'
                }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Sub Category</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Location</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Serial</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Exp Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const statusInfo = getStatusColor(a.status)
                  return (
                    <tr key={a.id} style={{
                      borderBottom: '1px solid var(--border-light)',
                      background: i % 2 === 0 ? 'white' : 'var(--bg-main)',
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'} onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'white' : 'var(--bg-main)'}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--primary)' }}>{a.id}</td>
                      <td style={{ padding: '14px 16px' }}>{a.category || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{a.sub_category || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>{a.location || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{a.serial_number || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>{a.expired_date || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => openEdit(a)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--secondary)',
                            color: 'var(--primary)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{
                padding: '48px',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                No assets found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'var(--bg-card)',
            padding: '32px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', marginBottom: '24px' }}>
              Edit Asset: {editId}
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="active">🟢 Active</option>
                <option value="inactive">⚫ Inactive</option>
                <option value="standby">🟡 Standby</option>
                <option value="maintenance">🟠 Maintenance</option>
                <option value="expired">🔴 Expired</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                Expired Date
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setEditId(null)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--text-secondary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: saving ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(editId)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--secondary)',
                  color: 'var(--primary)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? 'Saving...' : '✓ Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}