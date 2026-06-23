'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CATEGORIES_MAP } from '@/lib/constants'
import Navbar from '@/components/Navbar'

type Asset = {
  id: string
  location: string
  type: string
  capacity: string
  brand: string
  serial_number: string
  expired_date: string
  is_active: boolean
}

export default function AssetsPage() {
  const [allAssets, setAllAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [category, setCategory] = useState('Fire Safety')
  const [subCategory, setSubCategory] = useState('Fire Extinguisher')
  const [location, setLocation] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSubCategory(CATEGORIES_MAP[category][0])
  }, [category])

  useEffect(() => {
    loadAssets()
  }, [subCategory])

  useEffect(() => {
    filterAssets()
  }, [allAssets, location, statusFilter, search])

  async function loadAssets() {
    setLoading(true)
    const { data } = await supabase.from('assets').select('*')
      .eq('sub_category', subCategory).order('id')
    setAllAssets(data || [])
    
    // Extract unique locations
    const locs = [...new Set((data || []).map(a => a.location).filter(Boolean))]
    setLocations(locs as string[])
    setLoading(false)
  }

  function filterAssets() {
    let result = allAssets

    // Filter by location
    if (location) {
      result = result.filter(a => a.location === location)
    }

    // Filter by status
    if (statusFilter === 'active') {
      result = result.filter(a => a.is_active && (!a.expired_date || new Date(a.expired_date) > new Date()))
    } else if (statusFilter === 'expired') {
      result = result.filter(a => a.is_active && a.expired_date && new Date(a.expired_date) < new Date())
    } else if (statusFilter === 'inactive') {
      result = result.filter(a => !a.is_active)
    }

    // Search by id, serial_number, atau type
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(a =>
        a.id.toLowerCase().includes(searchLower) ||
        (a.serial_number && a.serial_number.toLowerCase().includes(searchLower)) ||
        (a.type && a.type.toLowerCase().includes(searchLower))
      )
    }

    setFilteredAssets(result)
  }

  function getStatus(a: Asset) {
    if (!a.is_active) return 'inactive'
    if (!a.expired_date) return 'active'
    return new Date(a.expired_date) > new Date() ? 'active' : 'expired'
  }

  function getStatusBadge(a: Asset) {
    const status = getStatus(a)
    const badges = {
      active: { bg: '#f0fdf4', color: '#22c55e', label: '🟢 Active' },
      expired: { bg: '#fef3c7', color: '#f59e0b', label: '🟡 Expired' },
      inactive: { bg: '#f3f4f6', color: '#6b7280', label: '⚫ Inactive' }
    }
    const b = badges[status as keyof typeof badges]
    return <span style={{ background: b.bg, color: b.color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{b.label}</span>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Daftar Asset</h1>

        {/* Level 1 - Category */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {Object.keys(CATEGORIES_MAP).map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{ padding: '8px 18px', border: 'none', borderRadius: '20px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: category === cat ? '#1a73e8' : 'white',
                color: category === cat ? 'white' : '#555',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              {cat === 'Fire Safety' ? '🔴' : cat === 'HVAC' ? '❄️' : cat === 'Electrical' ? '⚡' : '🔧'} {cat}
            </button>
          ))}
        </div>

        {/* Level 2 - Sub-category */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {CATEGORIES_MAP[category as keyof typeof CATEGORIES_MAP].map(sub => (
            <button key={sub} onClick={() => setSubCategory(sub)}
              style={{ padding: '6px 14px', border: 'none', borderRadius: '16px',
                cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                background: subCategory === sub ? '#e8f0fe' : '#f0f0f0',
                color: subCategory === sub ? '#1a73e8' : '#666' }}>
              {sub}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px',
          display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Cari ID, Serial Number, Tipe..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '8px',
              border: '1px solid #ddd', fontSize: '13px' }}
          />

          {/* Location Filter */}
          <select value={location} onChange={e => setLocation(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
            <option value="">Semua Lokasi</option>
            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>

          {/* Status Filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
            <option value="all">Semua Status</option>
            <option value="active">🟢 Active</option>
            <option value="expired">🟡 Expired</option>
            <option value="inactive">⚫ Inactive</option>
          </select>

          {/* Reset */}
          {(search || location || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setLocation(''); setStatusFilter('all') }}
              style={{ padding: '8px 14px', background: '#f0f0f0', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#666' }}>
              Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: '12px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {['ID', 'Lokasi', 'Tipe', 'Kapasitas', 'Brand', 'S/N', 'Exp Date', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left',
                    color: '#666', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Loading...</td></tr>
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Tidak ada data</td></tr>
              ) : filteredAssets.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f0f0f0',
                  background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1a73e8' }}>{a.id}</td>
                  <td style={{ padding: '12px 16px' }}>{a.location || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.type || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.capacity || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.brand || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.serial_number || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#888' }}>
                    {a.expired_date ? new Date(a.expired_date).toLocaleDateString('id-ID') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', color: '#888', fontSize: '12px',
            borderTop: '1px solid #f0f0f0' }}>
            Total: {filteredAssets.length} dari {allAssets.length} unit
          </div>
        </div>
      </div>
    </div>
  )
}