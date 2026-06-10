'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type Submission = {
  id: string
  asset_id: string
  category: string
  sub_category: string
  location: string
  status: string
  inspector: string
  month: string
  year: number
  submitted_at: string
  notes: string
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS = [2024, 2025, 2026, 2027]

const CATEGORIES_MAP: Record<string, string[]> = {
  'Fire Safety': ['Fire Extinguisher','Fire Hydrant','Emergency Door','Smoke & Heat Detector','Evacuation Lamp'],
  'HVAC': ['AC Single Split','AC Cassette','AC Single Split Duct Type','AC Multi Split Duct Type','AC Package','Cooling Tower','Exhaust Fan','Adsorption Tower'],
  'Electrical': ['Panel Listrik'],
  'Mechanical': ['Air Compressor','Air Dryer','Pompa Distribusi CT 2 Cell','Pompa Distribusi CT 1 Cell','Pompa Supply CT','Pompa Booster'],
}

export default function HistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadHistory() }, [status, month, year, category, subCategory])
  useEffect(() => { setSubCategory('') }, [category])

  async function loadHistory() {
    setLoading(true)
    let query = supabase.from('checklist_submissions').select('*')
      .order('submitted_at', { ascending: false })
    if (status !== 'all') query = query.eq('status', status)
    if (month) query = query.eq('month', month)
    if (year) query = query.eq('year', parseInt(year))
    if (category) query = query.eq('category', category)
    if (subCategory) query = query.eq('sub_category', subCategory)
    const { data } = await query
    setSubmissions(data || [])
    setLoading(false)
  }

  async function handleApprove(id: string) {
    await supabase.from('checklist_submissions').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    loadHistory()
  }

  function handlePrint() {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Riwayat Checklist PM — BizLink</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
            h2 { font-size: 16px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 11px; }
            td { padding: 7px 8px; border: 1px solid #ddd; font-size: 11px; }
            tr:nth-child(even) { background: #fafafa; }
            .ok { color: green; font-weight: bold; }
            .nok { color: red; font-weight: bold; }
            .approved { color: blue; font-weight: bold; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h2>Riwayat Checklist PM — BizLink PM System</h2>
          <div class="meta">
            ${category ? `Kategori: ${category}` : 'Semua Kategori'} 
            ${subCategory ? `| Sub-kategori: ${subCategory}` : ''} 
            ${month ? `| Bulan: ${month}` : ''} 
            ${year ? `| Tahun: ${year}` : ''} 
            | Status: ${status === 'all' ? 'Semua' : status.toUpperCase()}
            | Dicetak: ${new Date().toLocaleString('id-ID')}
            | Total: ${filtered.length} record
          </div>
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Bulan/Tahun</th>
                <th>Unit</th>
                <th>Sub Kategori</th>
                <th>Lokasi</th>
                <th>Inspector</th>
                <th>Frekuensi</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => `
                <tr>
                  <td>${new Date(s.submitted_at).toLocaleString('id-ID')}</td>
                  <td>${s.month} ${s.year}</td>
                  <td>${s.asset_id}</td>
                  <td>${s.sub_category}</td>
                  <td>${s.location || '—'}</td>
                  <td>${s.inspector}</td>
                  <td>${s.notes ? s.notes.replace('Frekuensi: ','') : '—'}</td>
                  <td class="${s.status}">${s.status === 'ok' ? '✓ OK' : s.status === 'approved' ? '✓ Approved' : '✗ NOK'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }

  const filtered = submissions.filter(s =>
    search === '' ||
    s.asset_id.toLowerCase().includes(search.toLowerCase()) ||
    s.location.toLowerCase().includes(search.toLowerCase()) ||
    s.sub_category.toLowerCase().includes(search.toLowerCase()) ||
    s.inspector.toLowerCase().includes(search.toLowerCase())
  )

  const tabs = [
    { key: 'all', label: 'Semua' },
    { key: 'ok', label: '✓ OK' },
    { key: 'nok', label: '✗ NOK' },
    { key: 'approved', label: 'Approved' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Riwayat Checklist</h1>
          <button onClick={handlePrint}
            style={{ padding: '8px 18px', background: '#1a73e8', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
            🖨️ Export PDF
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>

            {/* Category filter */}
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
              <option value="">Semua Kategori</option>
              {Object.keys(CATEGORIES_MAP).map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Sub-category filter */}
            {category && (
              <select value={subCategory} onChange={e => setSubCategory(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                <option value="">Semua Sub-kategori</option>
                {CATEGORIES_MAP[category].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            {/* Month filter */}
            <select value={month} onChange={e => setMonth(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
              <option value="">Semua Bulan</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            {/* Year filter */}
            <select value={year} onChange={e => setYear(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
              <option value="">Semua Tahun</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Search */}
            <input placeholder="🔍 Cari unit, lokasi, inspector..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #ddd', fontSize: '13px' }} />

            {/* Reset */}
            {(month || year || search || category || subCategory) && (
              <button onClick={() => { setMonth(''); setYear(''); setSearch(''); setCategory(''); setSubCategory('') }}
                style={{ padding: '8px 14px', background: '#f0f0f0', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#666', whiteSpace: 'nowrap' }}>
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setStatus(tab.key)}
              style={{ padding: '7px 16px', border: 'none', borderRadius: '20px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                background: status === tab.key ? '#1a73e8' : 'white',
                color: status === tab.key ? 'white' : '#555',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div ref={printRef} style={{ background: 'white', borderRadius: '12px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {['Waktu','Bulan/Tahun','Unit','Sub Kategori','Lokasi','Inspector','Frekuensi','Status','Aksi'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left',
                    color: '#666', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>Tidak ada data</td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0',
                  background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', color: '#888', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(s.submitted_at).toLocaleString('id-ID')}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {s.month} {s.year}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <a href={`/history/${s.id}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>{s.asset_id}</a>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{s.sub_category}</td>
                  <td style={{ padding: '12px 16px' }}>{s.location || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{s.inspector}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#666' }}>
                    {s.notes ? s.notes.replace('Frekuensi: ','') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: s.status==='ok'?'#f0fdf4':s.status==='approved'?'#eff6ff':'#fff1f2',
                      color: s.status==='ok'?'#22c55e':s.status==='approved'?'#3b82f6':'#ef4444',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500
                    }}>
                      {s.status==='ok'?'✓ OK':s.status==='approved'?'✓ Approved':'✗ NOK'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {s.status === 'ok' && (
                      <button onClick={() => handleApprove(s.id)}
                        style={{ padding: '5px 12px', background: '#3b82f6', color: 'white',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        Approve
                      </button>
                    )}
                    {s.status === 'approved' && (
                      <span style={{ color: '#22c55e', fontSize: '12px' }}>✓ Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', color: '#888', fontSize: '12px',
            borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total: {filtered.length} submission</span>
            {(category || month || year) && (
              <span style={{ color: '#1a73e8' }}>
                {category} {subCategory} {month} {year}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}