'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

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
  // Hydrant Box
  'Kondisi box bersih (tidak berdebu, tidak ada serangga)',
  'Tidak ada barang lain selain perlengkapan hydrant',
  'Box hydrant tidak terhalang',
  'Engsel pintu tidak macet',
  // Hose
  'Selang tidak dalam keadaan bocor',
  'Selang tersusun rapi di hose rack',
  'Kondisi selang baik',
  // Hose Rack
  'Rack tidak ada yang patah / bengkok',
  'Mudah diurai jika digunakan',
  // Jet Nozzle
  'Tidak terdapat retakan atau bocor pada jet nozzle',
  'Kaitan sambungan coupling tidak aus',
  'Nozzle tidak mampet',
  // Coupling
  'Ukuran diameter masing-masing sambungan sama',
  'Coupling mudah digunakan & tidak berkarat',
  // Alarm
  'Lampu alarm berfungsi dengan baik',
  'Bel berfungsi dengan baik',
],
  'Smoke & Heat Detector': [
  'Detektor asap dipasang dengan aman di dinding atau ceiling',
  'Detector asap tidak ada tanda-tanda kerusakan, terkena cat, terkena oli dan kotoran lainnya',
  'Tidak terdapat tanda-tanda kerusakan kabel penghubung ke alarm',
  'Lubang ventilasi smoke detector bersih dan tidak ada penghalang',
  'Sinyal alarm menyala saat diuji',
],
'Evacuation Lamp': [
  'Lampu exit menyala dan berfungsi normal',
  'Lampu arah evakuasi menyala dan berfungsi normal',
  'Lampu emergency menyala dan berfungsi normal',
  'Test durasi 30 detik lampu emergency berfungsi normal',
],
'Emergency Door': [
  'Pintu emergency dalam kondisi baik & berfungsi normal',
  'Pintu emergency dalam kondisi bersih',
  'Pintu emergency tidak terhalang',
  'Alarm pintu emergency berfungsi dengan baik',
  'Lampu exit sign menyala & terpasang dengan baik',
],'AC Single Split': [
    'Filter indoor dibersihkan',
    'Kondisi unit indoor baik, tidak ada kerusakan fisik',
    'Kondisi unit outdoor baik, tidak ada kerusakan fisik',
    'Drain pan bersih dan tidak tersumbat',
    'Drain pipe tidak tersumbat & air mengalir lancar',
    'Remote control berfungsi normal',
    'Temperatur setting sesuai standar operasional',
    'Tidak ada suara atau getaran abnormal',
    'Tidak ada tanda kebocoran refrigerant',
    'Electrical connection dalam kondisi baik & aman',
    'General cleaning dilakukan setelah pengecekan',
  ],
  'Panel Listrik': [
    'Panel dalam kondisi bersih, tidak ada debu berlebih',
    'Tidak ada tanda panas berlebih (discoloration, bau terbakar)',
    'Semua MCB/breaker dalam kondisi ON & berfungsi normal',
    'Label identifikasi setiap circuit terbaca jelas',
    'Tidak ada kabel terkelupas atau koneksi longgar',
    'Grounding terpasang dengan baik',
    'Lampu indikator berfungsi normal',
    'Pintu panel dapat ditutup & dikunci dengan baik',
    'Tidak ada tanda kebocoran air di sekitar panel',
    'General cleaning dilakukan setelah pengecekan',
  ],
}

const CATEGORIES = [
  'Fire Extinguisher',
  'Fire Hydrant',
  'Emergency Door',
  'Smoke & Heat Detector',
  'Evacuation Lamp',
  'AC Single Split',
  'Panel Listrik'
]

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
      category: category === 'Panel Listrik' ? 'Electrical' : category === 'AC Single Split' ? 'Mechanical' : 'Fire Safety',
      sub_category: category,
      status: allChecked ? 'ok' : 'nok',
      inspector,
      year,
      month,
      location: asset?.location || '',
      submitted_at: now.toISOString(),
    }).select().single()

    if (!error && sub) {
      await supabase.from('checklist_items').insert(
        items.map(label => ({ submission_id: sub.id, label, result: checks[label] ? 'OK' : 'NOK' }))
      )
      setSaved(true)
      setTimeout(() => { setSaved(false); setChecks({}); setSelectedAsset('') }, 2500)
    }
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: '700px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Form Checklist PM</h1>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>Kategori</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>Pilih Unit</label>
            <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}>
              <option value="">-- Pilih unit --</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.id} — {a.location}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>Inspector</label>
            <input value={inspector} onChange={e => setInspector(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd',
                fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '12px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              Item Checklist ({items.length} poin)
            </span>
            <span style={{ fontSize: '13px', color: allChecked ? '#22c55e' : '#f59e0b' }}>
              {checkedCount}/{items.length} OK
            </span>
          </div>
          {items.map(item => (
            <div key={item} onClick={() => toggleCheck(item)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                borderRadius: '8px', marginBottom: '8px', cursor: 'pointer',
                background: checks[item] ? '#f0fdf4' : '#fafafa',
                border: checks[item] ? '1px solid #bbf7d0' : '1px solid #f0f0f0' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                background: checks[item] ? '#22c55e' : 'white',
                border: checks[item] ? 'none' : '2px solid #ddd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '13px' }}>
                {checks[item] ? '✓' : ''}
              </div>
              <span style={{ fontSize: '13px' }}>{item}</span>
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={saving || saved}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
            background: saved ? '#22c55e' : '#1a73e8', color: 'white',
            fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
          {saved ? '✓ Tersimpan!' : saving ? 'Menyimpan...' : 'Simpan Checklist'}
        </button>
      </div>
    </div>
  )
}