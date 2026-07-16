'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { logActivity } from '@/lib/activityLog'
import { updatePmSchedule } from '@/lib/pmSchedule'

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
  frequency: string
}

type AdhocInstance = {
  id: string
  scheduled_date: string
  status: 'pending' | 'completed' | 'skipped'
  notes: string | null
  pm_tasks: { title: string; description: string | null; frequency: string } | null
}

type UnifiedRow = {
  key: string
  type: 'checklist' | 'adhoc'
  displayDate: string
  title: string
  subtitle: string
  location: string
  status: string
  original: Submission | AdhocInstance
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS = [2024, 2025, 2026, 2027]

const CATEGORIES_MAP: Record<string, string[]> = {
  'Fire Safety': ['Fire Extinguisher','Fire Hydrant','Emergency Door','Smoke & Heat Detector','Evacuation Lamp','Pompa Pemadam Kebakaran'],
  'HVAC': ['AC Single Split','AC Cassette','AC Single Split Duct Type','AC Multi Split Duct Type','AC Package','Cooling Tower','Exhaust Fan','Adsorption Tower'],
  'Electrical': ['Panel Listrik'],
  'Mechanical': ['Air Compressor','Air Dryer','Pompa Distribusi CT 2 Cell','Pompa Distribusi CT 1 Cell','Pompa Supply CT','Pompa Booster'],
}

export default function HistoryPage() {
  const supabase = createClient()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [adhocInstances, setAdhocInstances] = useState<AdhocInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [showAdhoc, setShowAdhoc] = useState(true)
  const [correctiveId, setCorrectiveId] = useState<string | null>(null)
  const [correctiveText, setCorrectiveText] = useState('')
  const [savingCorrective, setSavingCorrective] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadHistory() }, [status, month, year, category, subCategory, dayFilter])
  useEffect(() => { setSubCategory('') }, [category])

  async function loadHistory() {
    setLoading(true)

    let query = supabase.from('checklist_submissions').select('*')
      .order('submitted_at', { ascending: false })
    if (status !== 'all' && ['ok','nok','corrected','approved'].includes(status)) query = query.eq('status', status)
    if (!dayFilter) {
      if (month) query = query.eq('month', month)
      if (year) query = query.eq('year', parseInt(year))
    }
    if (category) query = query.eq('category', category)
    if (subCategory) query = query.eq('sub_category', subCategory)
    const { data: subs } = await query
    setSubmissions(subs || [])

    // Ad-hoc: hanya diambil kalau tidak ada filter kategori (ad-hoc tidak punya kategori)
    if (!category) {
      let adhocQuery = supabase.from('pm_task_instances')
        .select('id, scheduled_date, status, notes, pm_tasks(title, description, frequency)')
        .order('scheduled_date', { ascending: false })
      if (dayFilter) {
        adhocQuery = adhocQuery.eq('scheduled_date', dayFilter)
      } else if (year) {
        const y = year
        adhocQuery = adhocQuery.gte('scheduled_date', `${y}-01-01`).lte('scheduled_date', `${y}-12-31`)
      }
      const { data: adhoc } = await adhocQuery
      setAdhocInstances((adhoc as any) || [])
    } else {
      setAdhocInstances([])
    }

    setLoading(false)
  }

  async function handleApprove(id: string) {
    const sub = submissions.find(s => s.id === id)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('checklist_submissions').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    }).eq('id', id)
    if (!error && sub) {
      await updatePmSchedule(supabase, {
        asset_id: sub.asset_id,
        sub_category: sub.sub_category,
        frequency: sub.frequency,
      })
      await logActivity(supabase, {
        action: 'update',
        entity_type: 'checklist_submission',
        entity_id: id,
        old_value: { status: sub.status },
        new_value: { status: 'approved' },
      })
    }
    loadHistory()
  }

  async function handleCorrective(id: string) {
    if (!correctiveText.trim()) return
    setSavingCorrective(true)
    const { data: { session } } = await supabase.auth.getSession()
    const sub = submissions.find(s => s.id === id)

    await supabase.from('corrective_actions').insert({
      submission_id: id,
      description: correctiveText,
      created_by: session?.user.id,
      created_at: new Date().toISOString()
    })

    const { error } = await supabase.from('checklist_submissions').update({
      status: 'corrected',
      approved_at: new Date().toISOString(),
      approved_by: session?.user.id,
    }).eq('id', id)
    if (!error && sub) {
      await updatePmSchedule(supabase, {
        asset_id: sub.asset_id,
        sub_category: sub.sub_category,
        frequency: sub.frequency,
      })
      await logActivity(supabase, {
        action: 'update',
        entity_type: 'checklist_submission',
        entity_id: id,
        old_value: { status: sub.status },
        new_value: { status: 'corrected', corrective_note: correctiveText },
      })
    }
    setCorrectiveId(null)
    setCorrectiveText('')
    setSavingCorrective(false)
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
          <title>Riwayat — BizLink</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
            h2 { font-size: 16px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 11px; }
            td { padding: 7px 8px; border: 1px solid #ddd; font-size: 11px; }
            tr:nth-child(even) { background: #fafafa; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h2>Riwayat Kerja PM — BizLink PM System</h2>
          <div class="meta">
            ${dayFilter ? `Tanggal: ${dayFilter}` : `${month || 'Semua Bulan'} ${year || 'Semua Tahun'}`}
            | Dicetak: ${new Date().toLocaleString('id-ID')}
            | Total: ${combined.length} record
          </div>
          <table>
            <thead>
              <tr><th>Tanggal</th><th>Jenis</th><th>Judul/Unit</th><th>Detail</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${combined.map(r => `
                <tr>
                  <td>${r.displayDate}</td>
                  <td>${r.type === 'checklist' ? 'PM Rutin' : 'Ad-hoc'}</td>
                  <td>${r.title}</td>
                  <td>${r.subtitle}</td>
                  <td>${r.status}</td>
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

  // Gabungkan dua sumber jadi satu daftar seragam
  const unifiedChecklist: UnifiedRow[] = submissions.map(s => ({
    key: `cs-${s.id}`,
    type: 'checklist',
    displayDate: s.submitted_at.split('T')[0],
    title: s.asset_id,
    subtitle: s.sub_category,
    location: s.location || '—',
    status: s.status,
    original: s,
  }))

  const unifiedAdhoc: UnifiedRow[] = showAdhoc ? adhocInstances.map(a => ({
    key: `ad-${a.id}`,
    type: 'adhoc',
    displayDate: a.scheduled_date,
    title: a.pm_tasks?.title || '(tugas dihapus)',
    subtitle: a.pm_tasks?.description || '',
    location: '—',
    status: a.status,
    original: a,
  })) : []

  const combined = [...unifiedChecklist, ...unifiedAdhoc]
    .filter(r => search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      (r.type === 'checklist' && (r.original as Submission).inspector.toLowerCase().includes(search.toLowerCase()))
    )
    .filter(r => {
      if (status === 'all') return true
      if (status === 'pending' || status === 'completed' || status === 'skipped') {
        return r.type === 'adhoc' && r.status === status
      }
      return r.type === 'checklist' && r.status === status
    })
    .sort((a, b) => b.displayDate.localeCompare(a.displayDate))

  const tabs = [
    { key: 'all', label: 'Semua' },
    { key: 'ok', label: '✓ OK' },
    { key: 'nok', label: '✗ NOK' },
    { key: 'corrected', label: '⚡ Corrected' },
    { key: 'approved', label: 'Approved' },
    { key: 'pending', label: '○ Ad-hoc Pending' },
    { key: 'completed', label: '✓ Ad-hoc Selesai' },
  ]

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
    boxShadow: 'var(--shadow)', marginBottom: '24px'
  }
  const fieldInput: React.CSSProperties = {
    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px'
  }

  function statusBadge(r: UnifiedRow) {
    if (r.type === 'adhoc') {
      const map: Record<string, { bg: string; color: string; label: string }> = {
        pending: { bg: '#fff8e6', color: 'var(--warning)', label: '○ Pending' },
        completed: { bg: '#eafaf1', color: 'var(--success)', label: '✓ Selesai' },
        skipped: { bg: '#e2e3e5', color: '#383d41', label: '— Dilewati' },
      }
      const s = map[r.status] || map.pending
      return { ...s }
    }
    const map: Record<string, { bg: string; color: string; label: string }> = {
      ok: { bg: '#eafaf1', color: 'var(--success)', label: '✓ OK' },
      approved: { bg: '#e8f4f8', color: 'var(--accent)', label: '✓ Approved' },
      corrected: { bg: '#fff8e6', color: 'var(--warning)', label: '⚡ Corrected' },
      nok: { bg: '#fdecea', color: 'var(--danger)', label: '✗ NOK' },
    }
    return map[r.status] || map.nok
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Riwayat Kerja</h1>
          <button onClick={handlePrint}
            style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            🖨️ Export PDF
          </button>
        </div>

        {/* Filter bar */}
        <div style={card}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tanggal Spesifik</label>
              <input type="date" value={dayFilter} onChange={e => setDayFilter(e.target.value)} style={fieldInput} />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={fieldInput} disabled={!!dayFilter}>
                <option value="">Semua Kategori</option>
                {Object.keys(CATEGORIES_MAP).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {category && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Sub-kategori</label>
                <select value={subCategory} onChange={e => setSubCategory(e.target.value)} style={fieldInput}>
                  <option value="">Semua Sub-kategori</option>
                  {CATEGORIES_MAP[category].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Bulan</label>
              <select value={month} onChange={e => setMonth(e.target.value)} style={fieldInput} disabled={!!dayFilter}>
                <option value="">Semua Bulan</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tahun</label>
              <select value={year} onChange={e => setYear(e.target.value)} style={fieldInput} disabled={!!dayFilter}>
                <option value="">Semua Tahun</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>&nbsp;</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '10px 4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showAdhoc} onChange={e => setShowAdhoc(e.target.checked)} />
                Tampilkan tugas ad-hoc
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input placeholder="🔍 Cari unit, tugas, lokasi, inspector..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...fieldInput, flex: 1 }} />

            {(month || year || search || category || subCategory || dayFilter) && (
              <button onClick={() => { setMonth(''); setYear(''); setSearch(''); setCategory(''); setSubCategory(''); setDayFilter('') }}
                style={{ padding: '10px 16px', background: 'var(--text-secondary)', color: 'white', border: 'none',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setStatus(tab.key)}
              style={{ padding: '8px 16px', border: 'none', borderRadius: '20px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: status === tab.key ? 'var(--primary)' : 'var(--bg-card)',
                color: status === tab.key ? 'white' : 'var(--text-primary)',
                boxShadow: 'var(--shadow)' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div ref={printRef} style={{ background: 'var(--bg-card)', borderRadius: '8px',
          boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--primary)', color: 'white' }}>
                {['Tanggal','Jenis','Unit/Tugas','Detail','Status','Aksi'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</td></tr>
              ) : combined.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Tidak ada data</td></tr>
              ) : combined.map((r, i) => {
                const badge = statusBadge(r)
                return (
                  <tr key={r.key} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'white' : 'var(--bg-main)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '12px', whiteSpace: 'nowrap' }}>{r.displayDate}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: r.type === 'checklist' ? '#e8f4f8' : '#f3e8fd',
                        color: r.type === 'checklist' ? 'var(--accent)' : '#8b5cf6'
                      }}>
                        {r.type === 'checklist' ? 'PM Rutin' : 'Ad-hoc'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {r.type === 'checklist' ? (
                        <a href={`/history/${r.key.replace('cs-', '')}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{r.title}</a>
                      ) : r.title}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{r.subtitle}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {r.type === 'adhoc' ? (
                        <a href="/pm-calendar" style={{ color: 'var(--accent)', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
                          📅 Lihat Kalender
                        </a>
                      ) : r.status === 'ok' ? (
                        <button onClick={() => handleApprove((r.original as Submission).id)}
                          style={{ padding: '6px 14px', background: 'var(--accent)', color: 'white',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                          Approve
                        </button>
                      ) : r.status === 'approved' ? (
                        <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: 600 }}>✓ Done</span>
                      ) : r.status === 'nok' ? (
                        <button onClick={() => { setCorrectiveId((r.original as Submission).id); setCorrectiveText('') }}
                          style={{ padding: '6px 14px', background: 'var(--warning)', color: 'white',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                          Corrective Action
                        </button>
                      ) : r.status === 'corrected' ? (
                        <a href={`/history/${(r.original as Submission).id}`}
                          style={{ color: 'var(--warning)', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
                          ⚡ Lihat Detail
                        </a>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '12px',
            borderTop: '1px solid var(--border-light)' }}>
            Total: {combined.length} record
          </div>
        </div>
      </div>

      {correctiveId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 8, width: 440, maxWidth: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: 8, fontSize: '18px', fontWeight: 700 }}>Corrective Action</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Deskripsikan tindakan perbaikan yang sudah dilakukan
            </p>
            <textarea
              value={correctiveText}
              onChange={e => setCorrectiveText(e.target.value)}
              placeholder="Contoh: Freon diisi ulang, pressure indicator kembali hijau..."
              rows={4}
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' as const }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => { setCorrectiveId(null); setCorrectiveText('') }}
                style={{ flex: 1, padding: 10, background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                Batal
              </button>
              <button
                onClick={() => handleCorrective(correctiveId)}
                disabled={savingCorrective || !correctiveText.trim()}
                style={{ flex: 1, padding: 10, background: correctiveText.trim() ? 'var(--warning)' : '#e0e0e0', color: correctiveText.trim() ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: 6, cursor: correctiveText.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}
              >
                {savingCorrective ? 'Menyimpan...' : 'Simpan & Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}