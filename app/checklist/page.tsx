'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const CHECKLIST_ITEMS: Record<string, string[]> = {
  'Fire Extinguisher': [
    'Area FE clear & tidak terhalang material',
    'Signage identifikasi tidak terhalang & kondisi baik',
    'FE terpasang di dinding, ketinggian 15-120 cm dari lantai',
    'Label inspeksi tahunan masih valid',
    'Pressure indicator berwarna hijau',
    'Nozzle tidak tersumbat',
    'Pin tersedia',
    'Seal tersedia dan terpasang',
    'General cleaning dilakukan setelah pengecekan',
    'Berat dalam batas ±10% dari kapasitas FE',
  ],
  'Fire Hydrant': [
    'Area hydrant clear & tidak terhalang',
    'Box hydrant kondisi baik & tidak berkarat',
    'Hose tersedia & kondisi baik',
    'Nozzle tersedia & kondisi baik',
    'Valve dapat dibuka & ditutup dengan baik',
    'Pressure gauge dalam kondisi baik',
    'Signage hydrant terlihat jelas',
    'Tidak ada kebocoran pada sambungan',
  ],
}

type Asset = { id: string; location: string }

export default function ChecklistPage() {
  const [category, setCategory] = useState('Fire Extinguisher')
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [inspector, setInspector] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadAssets() }, [category])
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setInspector(data.user?.email?.split('@')[0] || '')
    })
  }, [])

  async function loadAssets() {
    const { data } = await supabase.from('assets').select('id, location')
      .eq('sub_category', category).order('id')
    setAssets(data || [])
    setSelectedAsset('')
    setChecks({})
  }

  function toggleCheck(item: string) {
    setChecks(prev => ({ ...prev, [item]: !prev[item] }))
  }

  const items = CHECKLIST_ITEMS[category] || []
  const allChecked = items.every(item => checks[item])
  const checkedCount = items.filter(item => checks[item]).length

  async function handleSubmit() {
    if (!selectedAsset) return alert('Pilih unit terlebih dahulu')
    setSaving(true)
    const now = new Date()
    const month = now.toLocaleString('en', { month: 'long' })
    const year = now.getFullYear()
    const asset = assets.find(a => a.id === selectedAsset)

    const { data: sub, error } = await supabase.from('checklist_submissions').insert({
      asset_id: selectedAsset,
      category: 'Fire Safety',
      sub_category: category,
      status: allChecked ? 'ok' : 'nok',
      inspector,
      year,
      month,
      location: asset?.location || '',
      submitted_at: now.toISOString(),
    }).select().single()

    if (!error && sub) {
      const itemRows = items.map(label => ({
        submission_id: sub.id,
        label,
        result: checks[label] ? 'OK' : 'NOK',
      }))
      await supabase.from('checklist_items').insert(itemRows)
      setSaved(true)
      setTimeout(() => { setSaved(false); setChecks({}); setSelectedAsset('') }, 2000)
    }
    setSaving(false)
  }

  return (
    <div style={{ minHeight:'100vh', padding:'32px', background:'#f5f5f5' }}>
      <div style={{ maxWidth:'700px', margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' }}>
          <a href="/dashboard" style={{ color:'#666', textDecoration:'none', fontSize:'13px' }}>← Dashboard</a>
          <h1 style={{ fontSize:'20px', fontWeight:600, margin:0 }}>Form Checklist PM</h1>
        </div>

        <div style={{ background:'white', padding:'24px', borderRadius:'12px',
          boxShadow:'0 2px 16px rgba(0,0,0,0.06)', marginBottom:'16px' }}>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ fontSize:'13px', color:'#666', display:'block', marginBottom:'6px' }}>Kategori</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px' }}>
              <option>Fire Extinguisher</option>
              <option>Fire Hydrant</option>
            </select>
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ fontSize:'13px', color:'#666', display:'block', marginBottom:'6px' }}>Pilih Unit</label>
            <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}
              style={{ width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px' }}>
              <option value="">-- Pilih unit --</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.id} — {a.location}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize:'13px', color:'#666', display:'block', marginBottom:'6px' }}>Inspector</label>
            <input value={inspector} onChange={e => setInspector(e.target.value)}
              style={{ width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box' }} />
          </div>
        </div>

        <div style={{ background:'white', padding:'24px', borderRadius:'12px',
          boxShadow:'0 2px 16px rgba(0,0,0,0.06)', marginBottom:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
            <span style={{ fontSize:'14px', fontWeight:500 }}>Item Checklist ({items.length} poin)</span>
            <span style={{ fontSize:'13px', color: allChecked ? '#22c55e' : '#f59e0b' }}>
              {checkedCount}/{items.length} OK
            </span>
          </div>
          {items.map(item => (
            <div key={item} onClick={() => toggleCheck(item)}
              style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px',
                borderRadius:'8px', marginBottom:'8px', cursor:'pointer',
                background: checks[item] ? '#f0fdf4' : '#fafafa',
                border: checks[item] ? '1px solid #bbf7d0' : '1px solid #f0f0f0' }}>
              <div style={{ width:'20px', height:'20px', borderRadius:'4px', flexShrink:0,
                background: checks[item] ? '#22c55e' : 'white',
                border: checks[item] ? 'none' : '2px solid #ddd',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontSize:'13px' }}>
                {checks[item] ? '✓' : ''}
              </div>
              <span style={{ fontSize:'13px' }}>{item}</span>
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={saving || saved}
          style={{ width:'100%', padding:'14px', borderRadius:'10px', border:'none',
            background: saved ? '#22c55e' : '#1a73e8', color:'white',
            fontSize:'15px', fontWeight:500, cursor:'pointer' }}>
          {saved ? '✓ Tersimpan!' : saving ? 'Menyimpan...' : 'Simpan Checklist'}
        </button>
      </div>
    </div>
  )
}
