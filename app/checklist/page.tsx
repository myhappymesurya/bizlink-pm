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
    'Kondisi box bersih (tidak berdebu, tidak ada serangga)',
    'Tidak ada barang lain selain perlengkapan hydrant',
    'Box hydrant tidak terhalang',
    'Engsel pintu tidak macet',
    'Selang tidak dalam keadaan bocor',
    'Selang tersusun rapi di hose rack',
    'Kondisi selang baik',
    'Rack tidak ada yang patah / bengkok',
    'Mudah diurai jika digunakan',
    'Tidak terdapat retakan atau bocor pada jet nozzle',
    'Kaitan sambungan coupling tidak aus',
    'Nozzle tidak mampet',
    'Ukuran diameter masing-masing sambungan sama',
    'Coupling mudah digunakan & tidak berkarat',
    'Lampu alarm berfungsi dengan baik',
    'Bel berfungsi dengan baik',
  ],
  'Emergency Door': [
    'Pintu emergency dalam kondisi baik & berfungsi normal',
    'Pintu emergency dalam kondisi bersih',
    'Pintu emergency tidak terhalang',
    'Alarm pintu emergency berfungsi dengan baik',
    'Lampu exit sign menyala & terpasang dengan baik',
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
  'AC Single Split': [
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
  'AC Cassette': [
    'Filter indoor dibersihkan',
    'Kondisi unit cassette baik, tidak ada kerusakan fisik',
    'Kondisi unit outdoor baik, tidak ada kerusakan fisik',
    'Panel depan cassette kondisi baik dan terpasang rapi',
    '4 arah aliran udara berfungsi normal',
    'Drain pan bersih dan tidak tersumbat',
    'Drain pipe tidak tersumbat & air mengalir lancar',
    'Remote control berfungsi normal',
    'Temperatur setting sesuai standar operasional',
    'Tidak ada suara atau getaran abnormal',
    'Tidak ada tanda kebocoran refrigerant',
    'Electrical connection dalam kondisi baik & aman',
    'General cleaning dilakukan setelah pengecekan',
  ],
  'AC Single Split Duct Type': [
    'Filter udara dibersihkan',
    'Kondisi unit indoor baik, tidak ada kerusakan fisik',
    'Kondisi unit outdoor baik, tidak ada kerusakan fisik',
    'Duct/saluran udara tidak bocor dan kondisi baik',
    'Grille dan diffuser bersih dan tidak tersumbat',
    'Drain pan bersih dan tidak tersumbat',
    'Drain pipe tidak tersumbat & air mengalir lancar',
    'Blower/fan berfungsi normal, tidak ada suara abnormal',
    'Temperatur supply air sesuai standar',
    'Tidak ada tanda kebocoran refrigerant',
    'Electrical connection dalam kondisi baik & aman',
    'General cleaning dilakukan setelah pengecekan',
  ],
  'AC Multi Split Duct Type': [
    'Filter semua unit indoor dibersihkan',
    'Kondisi semua unit indoor baik, tidak ada kerusakan fisik',
    'Kondisi unit outdoor baik, tidak ada kerusakan fisik',
    'Duct/saluran udara semua zone tidak bocor dan kondisi baik',
    'Semua grille dan diffuser bersih dan tidak tersumbat',
    'Drain pan semua unit bersih dan tidak tersumbat',
    'Semua drain pipe tidak tersumbat & air mengalir lancar',
    'Semua blower/fan berfungsi normal, tidak ada suara abnormal',
    'Refrigerant pressure dalam range normal',
    'Tidak ada tanda kebocoran refrigerant',
    'Electrical connection semua unit kondisi baik & aman',
    'Semua zone temperatur sesuai standar operasional',
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

const PUMP_ITEMS: Record<string, string[]> = {
  'Daily': [
    'Cek tekanan pompa sesuai normal',
    'Tidak ada kebocoran pada seal dan pipa',
    'Suara dan getaran pompa normal',
    'Flow rate sesuai spesifikasi',
  ],
  'Monthly': [
    'Periksa kondisi seal/packing',
    'Periksa kondisi bearing',
    'Bersihkan strainer/filter inlet',
    'Periksa kondisi coupling',
  ],
  'Quarterly': [
    'Lubrikasi bearing',
    'Periksa alignment pompa-motor',
    'Periksa kondisi impeller',
  ],
  'Annually': [
    'Overhaul pompa',
    'Ganti mechanical seal',
    'Periksa dan kalibrasi pressure gauge',
  ],
}

const FREQ_CHECKLIST_ITEMS: Record<string, Record<string, string[]>> = {
  'AC Package': {
    'Weekly': [
      'Periksa filter udara yang terpasang dan, jika perlu, sedot atau bersihkan',
      'Periksa apakah pembuangan kondensat lancar',
      'Periksa apakah ada noda di setiap bagian kompresor untuk menilai apakah refrigerant bocor',
      'Periksa apakah titik sambungan sirkuit sudah kencang',
    ],
    'Quarterly': [
      'Periksa apakah semua kipas dan motor sudah terhubung dengan baik',
      'Periksa apakah titik-titik sambungan sirkuit telah dikencangkan',
      'Periksa apakah kipas beroperasi secara normal',
      'Periksa tekanan kerja hisap dan buang',
      'Bersihkan saringan udara keluar udara segar',
      'Periksa apakah kondensat keluar dengan bebas',
    ],
    'Annually': [
      'Periksa pengoperasian yang benar dari semua perangkat listrik (sakelar tegangan rendah & tinggi, kontaktor kompresor, defrost controller)',
      'Periksa apakah ada goresan dan getaran pada semua pipa refrigerant',
      'Periksa volume suplai udara dari setiap diffuser',
      'Periksa tingkat kebisingan dan getaran, jika berlebihan harus disesuaikan',
      'Periksa apakah saluran udara dan insulasi mengalami kerusakan dan terpelihara',
      'Bersihkan debu sirip kondensor dan flokulan',
    ],
  },
  'Cooling Tower': {
    'Daily': [
      'Periksa ketinggian air',
      'Cek tekanan air di pompa supply (3-4 bar)',
    ],
    'Monthly': [
      'Periksa apakah ada suara atau getaran yang tidak biasa',
      'Periksa apakah ada kebocoran',
      'Cek tegangan belt',
      'Cek kebersihan basin',
    ],
    'Quarterly': [
      'Cek pelumasan pada belt',
      'Cek apakah ada penyumbatan pada sistem distribusi air',
      'Cek apakah ada penyumbatan pada nozzle',
    ],
    'Bi Annually': [
      'Cek arus listrik dan insulasi pada motor',
      'Cek Fan',
      'Cek tegangan belt',
      'Cek kebersihan basin',
    ],
  },
  'Exhaust Fan': {
    'Monthly': [
      'Kondisi fisik unit exhaust fan baik, tidak ada kerusakan fisik',
      'Exhaust fan berfungsi normal (on/off)',
      'Tidak ada suara atau getaran yang tidak normal',
      'Grille/kisi-kisi tidak tersumbat',
      'Bersihkan grille/kisi-kisi dari debu dan kotoran',
      'Periksa kondisi blade/impeller tidak ada kerusakan',
    ],
    'Quarterly': [
      'Bersihkan blade/impeller dari debu dan kotoran',
      'Periksa kondisi bearing, tidak ada suara abnormal',
      'Periksa sambungan kabel dan kondisi panel control',
      'Periksa duct/saluran exhaust tidak tersumbat',
    ],
    'Annually': [
      'Lubrikasi bearing motor',
      'Periksa dan kencangkan semua baut dan mur',
      'Bersihkan motor dari debu secara menyeluruh',
      'Periksa kondisi belt — keausan dan ketegangan (jika ada)',
      'Test kapasitas airflow sesuai spesifikasi',
    ],
  },
  'Adsorption Tower': {
    'Weekly': [
      'Pressure drop melintasi tower dalam batas normal',
      'Indikator moisture/dew point dalam kondisi normal',
      'Tidak ada kebocoran pada pipa dan sambungan',
      'Valve inlet dan outlet dalam kondisi terbuka',
    ],
    'Monthly': [
      'Kondisi fisik unit baik, tidak ada kerusakan fisik',
      'Switching valve berfungsi normal',
      'Timer/controller berfungsi normal sesuai setting',
      'Pressure gauge berfungsi normal',
      'Bersihkan area sekitar unit',
    ],
    'Quarterly': [
      'Periksa kondisi desiccant/material penyerap',
      'Periksa dan bersihkan filter pre-separator',
      'Kencangkan semua sambungan pipa dan baut',
      'Periksa kondisi valve dan aktuator',
    ],
    'Annually': [
      'Ganti desiccant material jika diperlukan',
      'Overhaul valve switching',
      'Kalibrasi pressure gauge dan moisture indicator',
      'Bersihkan menyeluruh bagian dalam tower',
    ],
  },
  'Air Compressor': {
    'Daily': [
      'Cek level oli kompressor',
      'Cek tekanan kerja sesuai setting (7-8 bar)',
      'Suhu operasi dalam kondisi normal',
      'Tidak ada kebocoran udara pada pipa dan fitting',
      'Drain kondensat dari tangki angin',
    ],
    'Monthly': [
      'Bersihkan atau ganti filter udara inlet',
      'Cek kondisi oli (warna dan level)',
      'Periksa semua baut dan mur',
      'Bersihkan radiator/cooler dari debu',
    ],
    'Quarterly': [
      'Cek kondisi safety valve',
      'Bersihkan intercooler/aftercooler',
      'Periksa kondisi bearing',
    ],
    'Annually': [
      'Overhaul valve kompressor',
      'Ganti filter oli dan separator',
      'Kalibrasi pressure switch dan safety valve',
      'Periksa kondisi motor listrik',
    ],
  },
  'Air Dryer': {
    'Daily': [
      'Pressure drop dalam batas normal',
      'Dew point sesuai standar',
      'Tidak ada kebocoran pada sambungan pipa',
      'Drain trap berfungsi otomatis',
    ],
    'Monthly': [
      'Bersihkan kondensor dari debu',
      'Periksa kondisi filter pre dan after',
      'Periksa refrigerant pressure',
      'Bersihkan area sekitar unit',
    ],
    'Annually': [
      'Ganti filter element',
      'Service drain trap',
      'Kalibrasi pressure gauge dan dew point meter',
    ],
  },
  'Pompa Distribusi CT 2 Cell': PUMP_ITEMS,
  'Pompa Distribusi CT 1 Cell': PUMP_ITEMS,
  'Pompa Supply CT': PUMP_ITEMS,
  'Pompa Booster': PUMP_ITEMS,
}

const FREQ_OPTIONS: Record<string, string[]> = {
  'AC Package': ['Weekly', 'Quarterly', 'Annually'],
  'Cooling Tower': ['Daily', 'Monthly', 'Quarterly', 'Bi Annually'],
  'Exhaust Fan': ['Monthly', 'Quarterly', 'Annually'],
  'Adsorption Tower': ['Weekly', 'Monthly', 'Quarterly', 'Annually'],
  'Air Compressor': ['Daily', 'Monthly', 'Quarterly', 'Annually'],
  'Air Dryer': ['Daily', 'Monthly', 'Annually'],
  'Pompa Distribusi CT 2 Cell': ['Daily', 'Monthly', 'Quarterly', 'Annually'],
  'Pompa Distribusi CT 1 Cell': ['Daily', 'Monthly', 'Quarterly', 'Annually'],
  'Pompa Supply CT': ['Daily', 'Monthly', 'Quarterly', 'Annually'],
  'Pompa Booster': ['Daily', 'Monthly', 'Quarterly', 'Annually'],
}

const CATEGORIES = [
  'Fire Extinguisher', 'Fire Hydrant', 'Emergency Door',
  'Smoke & Heat Detector', 'Evacuation Lamp',
  'AC Single Split', 'AC Cassette', 'AC Single Split Duct Type',
  'AC Multi Split Duct Type', 'AC Package', 'Cooling Tower',
  'Exhaust Fan', 'Adsorption Tower',
  'Panel Listrik',
  'Air Compressor', 'Air Dryer',
  'Pompa Distribusi CT 2 Cell', 'Pompa Distribusi CT 1 Cell',
  'Pompa Supply CT', 'Pompa Booster',
]

type Asset = { id: string; location: string }

export default function ChecklistPage() {
  const [category, setCategory] = useState('Fire Extinguisher')
  const [frequency, setFrequency] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [inspector, setInspector] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isFreqBased = category in FREQ_OPTIONS

  useEffect(() => {
    setFrequency(isFreqBased ? FREQ_OPTIONS[category][0] : '')
    loadAssets()
  }, [category])

  useEffect(() => { setChecks({}) }, [frequency])

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

  const items = isFreqBased
    ? (FREQ_CHECKLIST_ITEMS[category]?.[frequency] || [])
    : (CHECKLIST_ITEMS[category] || [])

  const allChecked = items.length > 0 && items.every(item => checks[item])
  const checkedCount = items.filter(item => checks[item]).length

  async function handleSubmit() {
    if (!selectedAsset) return alert('Pilih unit terlebih dahulu')
    if (isFreqBased && !frequency) return alert('Pilih frekuensi terlebih dahulu')
    setSaving(true)
    const now = new Date()
    const month = now.toLocaleString('en', { month: 'long' })
    const year = now.getFullYear()
    const asset = assets.find(a => a.id === selectedAsset)

    const fireSafetyCats = ['Fire Extinguisher','Fire Hydrant','Emergency Door','Smoke & Heat Detector','Evacuation Lamp']
    const electricalCats = ['Panel Listrik']
    const mechanicalCats = ['Air Compressor','Air Dryer','Pompa Distribusi CT 2 Cell','Pompa Distribusi CT 1 Cell','Pompa Supply CT','Pompa Booster']
    const cat = fireSafetyCats.includes(category) ? 'Fire Safety'
      : electricalCats.includes(category) ? 'Electrical'
      : mechanicalCats.includes(category) ? 'Mechanical' : 'HVAC'

    const { data: sub, error } = await supabase.from('checklist_submissions').insert({
      asset_id: selectedAsset,
      category: cat,
      sub_category: category,
      status: allChecked ? 'ok' : 'nok',
      inspector,
      year,
      month,
      location: asset?.location || '',
      notes: isFreqBased ? `Frekuensi: ${frequency}` : '',
      submitted_at: now.toISOString(),
    }).select().single()

    if (!error && sub) {
      await supabase.from('checklist_items').insert(
        items.map(label => ({ submission_id: sub.id, label, result: checks[label] ? 'OK' : 'NOK' }))
      )
      setSaved(true)
      setTimeout(() => { setSaved(false); setChecks({}); setSelectedAsset('') }, 2500)
    }
    // Auto-update PM Schedule
const freqToUpdate = isFreqBased ? frequency : 'Monthly'
const freqDays: Record<string, number> = {
  'Daily': 1, 'Weekly': 7, 'Monthly': 30,
  'Quarterly': 90, 'Bi Annually': 180, 'Annually': 365,
}
const nextDue = new Date(now.getTime() + (freqDays[freqToUpdate] || 30) * 86400000)

await supabase.from('pm_schedules')
  .update({
    last_done_at: now.toISOString(),
    next_due_date: nextDue.toISOString().split('T')[0],
  })
  .eq('asset_id', selectedAsset)
  .eq('sub_category', category)
  .eq('frequency', freqToUpdate)

setSaved(true)
setTimeout(() => { setSaved(false); setChecks({}); setSelectedAsset('') }, 2500)
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

          {isFreqBased && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>Frekuensi</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}>
                {FREQ_OPTIONS[category].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          )}

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
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Item Checklist ({items.length} poin)</span>
            <span style={{ fontSize: '13px', color: allChecked ? '#22c55e' : '#f59e0b' }}>
              {checkedCount}/{items.length} OK
            </span>
          </div>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '20px', fontSize: '13px' }}>
              Pilih kategori untuk melihat item checklist
            </div>
          ) : items.map(item => (
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