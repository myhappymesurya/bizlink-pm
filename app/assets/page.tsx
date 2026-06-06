'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type Asset = {
  id: string
  location: string
  type: string
  capacity: string
  brand: string
  serial_number: string
  expired_date: string
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [filter, setFilter] = useState('Fire Extinguisher')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAssets() }, [filter])

  async function loadAssets() {
    setLoading(true)
    const { data } = await supabase.from('assets').select('*').eq('sub_category', filter).order('id')
    setAssets(data || [])
    setLoading(false)
  }

  const tabs = ['Fire Extinguisher','Fire Hydrant','AC Single Split','Panel Listrik']

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Daftar Asset</h1>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setFilter(tab)}
              style={{ padding: '8px 16px', border: 'none', borderRadius: '20px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 500,
                background: filter === tab ? '#1a73e8' : 'white',
                color: filter === tab ? 'white' : '#555',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              {tab}
            </button>
          ))}
        </div>
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {['ID','Lokasi','Tipe','Kapasitas','Brand','S/N','Exp Date'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Loading...</td></tr>
              ) : assets.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1a73e8' }}>{a.id}</td>
                  <td style={{ padding: '12px 16px' }}>{a.location || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.type || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.capacity || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.brand || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.serial_number || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.expired_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', color: '#888', fontSize: '12px', borderTop: '1px solid #f0f0f0' }}>
            Total: {assets.length} unit
          </div>
        </div>
      </div>
    </div>
  )
}