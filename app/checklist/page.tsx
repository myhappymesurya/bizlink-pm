'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { logActivity } from '@/lib/activityLog'

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
  'Pompa Pemadam Kebakaran': {
  'Daily': [
    'Voltage battery normal',
    'Check tangki dan selang solar — terhadap kontaminasi air, endapan ataupun kotoran',
    'Level solar di tangki minimal 2/3 penuh. Jika kurang, solar harus ditambah',
    'Check level oil engine dengan dipstick',
    'Cek kebocoran pada selang solar dari tangki ke diesel. Valve inlet dan return pada pipa solar dalam posisi open/buka',
    'Cek lever campuran air pendingin / coolant',
    'Check pipa dan valve saluran air pendingin dari pompa ke Heat Exchanger. Bersihkan strainer jika diperlukan',
    'Semua valve pada pipa suction dan discharge pompa diesel dan jockey dalam kondisi open',
    'Dengan "Manual Mode" — jalankan pompa jockey minimal selama 10 menit',
    'Dengan "Manual Mode" — jalankan pompa diesel pada rate speed 3000 RPM minimal 30 menit, untuk memanaskan semua komponen dan menghilangkan kondensasi',
    'Check pada kedua panel controller, pastikan selector switch pada posisi Automatic Start',
    'Test automatic start: 6 Bar → Jockey ON, 4 Bar → Diesel ON. Pompa harus start sesuai setting',
    'Tutup valve drain dan pastikan pompa mati dengan automatis',
  ],
  'Bi Weekly': [
    'Level air aki di battery normal',
    'Terminal battery harus bebas dari korosi / karat',
  ],
  'Monthly': [
    'Casing battery bersih, kering dan bebas dari korosi',
    'Bersihkan saringan dan filter di saluran bahan bakar',
    'Buka dan bersihkan water strainer pada pipa saluran pendingin',
    'Bersihkan box panel pompa diesel dan jockey',
    'Cek kabel listrik — apakah ada pengelupasan ataupun short circuit',
  ],
  'Bi Annually': [
    'Ganti oli mesin diesel, kapasitas oli mesin 7 liter',
    'Kalibrasi pressure switch dan flow meter agar pembacaan tetap akurat',
  ],
  'Annually': [
    'Lubrikasi seluruh bearing pada seluruh pompa dan diesel engine',
  ],
},
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
  'Pompa Pemadam Kebakaran': ['Daily', 'Bi Weekly', 'Monthly', 'Bi Annually', 'Annually'],
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
  'Pompa Pemadam Kebakaran',
]

type Asset = {
  id: string
  location: string
  type?: string
  brand?: string
  serial_number?: string
  expired_date?: string
}

type Sparepart = {
  id: string
  name: string
  unit: string
  linked_sub_category: string | null
}

type PartUsage = { sparepart_id: string; quantity: string }

export default function ChecklistPage() {
  const supabase = createClient()
  const [category, setCategory] = useState('Fire Extinguisher')
  const [frequency, setFrequency] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [inspector, setInspector] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [catatan, setCatatan] = useState('')

  const [spareparts, setSpareparts] = useState<Sparepart[]>([])
  const [noPartUsed, setNoPartUsed] = useState(false)
  const [partUsages, setPartUsages] = useState<PartUsage[]>([{ sparepart_id: '', quantity: '' }])

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

  useEffect(() => { loadSpareparts() }, [category])

  async function loadSpareparts() {
    const { data } = await supabase
      .from('spareparts')
      .select('id, name, unit, linked_sub_category')
      .eq('is_active', true)
      .or(`linked_sub_category.is.null,linked_sub_category.eq.${category}`)
      .order('name')
    setSpareparts(data || [])
  }

  async function loadAssets() {
    const { data } = await supabase.from('assets').select('id, location, type, brand, serial_number, expired_date')
      .eq('sub_category', category).order('id')
    setAssets(data || [])
    setSelectedAsset('')
    setChecks({})
  }

  function toggleCheck(item: string) {
    setChecks(prev => ({ ...prev, [item]: !prev[item] }))
  }

  function addPartRow() {
    setPartUsages(prev => [...prev, { sparepart_id: '', quantity: '' }])
  }
  function removePartRow(index: number) {
    setPartUsages(prev => prev.filter((_, i) => i !== index))
  }
  function updatePartRow(index: number, field: 'sparepart_id' | 'quantity', value: string) {
    setPartUsages(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const selectedAssetData = assets.find(a => a.id === selectedAsset)
  const assetType = selectedAssetData?.type || ''

  const baseItems = isFreqBased
    ? (FREQ_CHECKLIST_ITEMS[category]?.[frequency] || [])
    : (CHECKLIST_ITEMS[category] || [])

  const isOutdoorHydrant = category === 'Fire Hydrant' &&
    (selectedAssetData?.location?.toLowerCase().startsWith('outdoor') ?? false)

  const items = category === 'Fire Extinguisher' && assetType === 'CO2'
    ? baseItems.filter(item => item !== 'Pressure indicator berwarna hijau')
    : isOutdoorHydrant
    ? baseItems.filter(item => !['Lampu alarm berfungsi dengan baik', 'Bel berfungsi dengan baik'].includes(item))
    : baseItems

  const allChecked = items.length > 0 && items.every(item => checks[item])
  const checkedCount = items.filter(item => checks[item]).length

  const validPartRows = partUsages.filter(r => r.sparepart_id && parseFloat(r.quantity) > 0)
  const sparepartsValid = noPartUsed || validPartRows.length > 0

  async function handleSubmit() {
    if (!selectedAsset) return alert('Pilih unit terlebih dahulu')
    if (isFreqBased && !frequency) return alert('Pilih frekuensi terlebih dahulu')
    if (!sparepartsValid) return alert('Pilih sparepart yang dipakai, atau centang "Tidak ada sparepart dipakai"')

    setSaving(true)
    const now = new Date()
    const month = now.toLocaleString('en', { month: 'long' })
    const year = now.getFullYear()
    const asset = assets.find(a => a.id === selectedAsset)

    const fireSafetyCats = ['Fire Extinguisher','Fire Hydrant','Emergency Door','Smoke & Heat Detector','Evacuation Lamp','Pompa Pemadam Kebakaran']
    const electricalCats = ['Panel Listrik']
    const mechanicalCats = ['Air Compressor','Air Dryer','Pompa Distribusi CT 2 Cell','Pompa Distribusi CT 1 Cell','Pompa Supply CT','Pompa Booster']
    const cat = fireSafetyCats.includes(category) ? 'Fire Safety'
      : electricalCats.includes(category) ? 'Electrical'
      : mechanicalCats.includes(category) ? 'Mechanical' : 'HVAC'

    const { data: sub, error } = await supabase.from('checklist_submissions').insert({
      asset_id: selectedAsset,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      category: cat,
      sub_category: category,
      status: (allChecked && !catatan) ? 'ok' : 'nok',
      inspector,
      year,
      month,
      location: asset?.location || '',
      frequency: isFreqBased ? frequency : 'Monthly',
      notes: catatan || '',
      submitted_at: now.toISOString(),
    }).select().single()

    if (!error && sub) {
      await supabase.from('checklist_items').insert(
        items.map(label => ({ submission_id: sub.id, label, result: checks[label] ? 'OK' : 'NOK' }))
      )

      if (!noPartUsed && validPartRows.length > 0) {
        const userId = (await supabase.auth.getUser()).data.user?.id
        await supabase.from('sparepart_usage').insert(
          validPartRows.map(r => ({
            sparepart_id: r.sparepart_id,
            source_type: 'checklist',
            source_id: sub.id,
            quantity: parseFloat(r.quantity),
            user_id: userId,
          }))
        )
        for (const row of validPartRows) {
          const { data: current } = await supabase.from('spareparts').select('current_stock').eq('id', row.sparepart_id).single()
          if (current) {
            const newStock = current.current_stock - parseFloat(row.quantity)
            await supabase.from('spareparts').update({ current_stock: newStock }).eq('id', row.sparepart_id)
            await supabase.from('sparepart_transactions').insert({
              sparepart_id: row.sparepart_id,
              type: 'out',
              quantity: parseFloat(row.quantity),
              notes: `Dipakai di checklist ${selectedAsset}`,
              user_id: userId,
            })
          }
        }
      }

      await logActivity(supabase, {
        action: 'create',
        entity_type: 'checklist_submission',
        entity_id: sub.id,
        new_value: { asset_id: selectedAsset, sub_category: category, status: sub.status, inspector },
      })
    }
    setSaving(false)
    setCatatan('')
    setNoPartUsed(false)
    setPartUsages([{ sparepart_id: '', quantity: '' }])
    setSaved(true)
    setTimeout(() => { setSaved(false); setChecks({}); setSelectedAsset('') }, 2500)
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
    boxShadow: 'var(--shadow)', marginBottom: '16px'
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px'
  }
  const fieldInput: React.CSSProperties = {
    width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)',
    fontSize: '14px', boxSizing: 'border-box'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ padding: '32px 24px', maxWidth: '700px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '24px' }}>Form Checklist PM</h1>

        <div style={card}>
          <div style={{ marginBottom: '16px' }}>
            {selectedAsset && (() => {
              const asset = assets.find(a => a.id === selectedAsset)
              const hasInfo = asset && (asset.brand || asset.type || asset.serial_number || asset.expired_date)
              if (!hasInfo) return null
              return (
                <div style={{
                  background: 'var(--bg-main)', borderRadius: '8px', padding: '16px',
                  marginBottom: '16px', border: '1px solid var(--border-light)'
                }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '12px' }}>
                    General Information
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {asset.brand && (
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Brand</p>
                        <p style={{ fontSize: '13px', fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{asset.brand}</p>
                      </div>
                    )}
                    {asset.type && (
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Type</p>
                        <p style={{ fontSize: '13px', fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{asset.type}</p>
                      </div>
                    )}
                    {asset.serial_number && (
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Serial Number</p>
                        <p style={{ fontSize: '13px', fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{asset.serial_number}</p>
                      </div>
                    )}
                    {asset.expired_date && (
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Expired Date</p>
                        <p style={{ fontSize: '13px', fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{asset.expired_date}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
            <label style={fieldLabel}>Kategori</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={fieldInput}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {isFreqBased && (
            <div style={{ marginBottom: '16px' }}>
              <label style={fieldLabel}>Frekuensi</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} style={fieldInput}>
                {FREQ_OPTIONS[category].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={fieldLabel}>Pilih Unit</label>
            <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)} style={fieldInput}>
              <option value="">-- Pilih unit --</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.id} — {a.location}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabel}>Inspector</label>
            <input value={inspector} onChange={e => setInspector(e.target.value)} style={fieldInput} />
          </div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>Item Checklist ({items.length} poin)</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: allChecked ? 'var(--success)' : 'var(--warning)' }}>
              {checkedCount}/{items.length} OK
            </span>
          </div>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '13px' }}>
              Pilih kategori untuk melihat item checklist
            </div>
          ) : items.map(item => (
            <div key={item} onClick={() => toggleCheck(item)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                borderRadius: '8px', marginBottom: '8px', cursor: 'pointer',
                background: checks[item] ? '#eafaf1' : 'var(--bg-main)',
                border: checks[item] ? '1px solid var(--success)' : '1px solid var(--border-light)' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                background: checks[item] ? 'var(--success)' : 'white',
                border: checks[item] ? 'none' : '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '13px' }}>
                {checks[item] ? '✓' : ''}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>🔧 Sparepart Dipakai</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={noPartUsed}
                onChange={e => setNoPartUsed(e.target.checked)}
              />
              Tidak ada sparepart dipakai
            </label>
          </div>

          {!noPartUsed && (
            <>
              {spareparts.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Belum ada sparepart terdaftar untuk kategori ini. Daftarkan dulu di halaman Spareparts.
                </p>
              ) : (
                <>
                  {partUsages.map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <select
                        value={row.sparepart_id}
                        onChange={e => updatePartRow(i, 'sparepart_id', e.target.value)}
                        style={{ ...fieldInput, flex: 2 }}
                      >
                        <option value="">-- Pilih part --</option>
                        {spareparts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.linked_sub_category ? '' : ' (generic)'}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={e => updatePartRow(i, 'quantity', e.target.value)}
                        style={{ ...fieldInput, flex: 1, minWidth: 70 }}
                        min="0"
                        step="any"
                      />
                      {partUsages.length > 1 && (
                        <button
                          onClick={() => removePartRow(i)}
                          type="button"
                          style={{ padding: '8px 10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addPartRow}
                    type="button"
                    style={{ padding: '6px 12px', background: 'var(--bg-main)', color: 'var(--primary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 4 }}
                  >
                    + Tambah Part Lain
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={fieldLabel}>
            Catatan (opsional — mengisi catatan akan otomatis set status NOK)
          </label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tulis catatan hasil pemeriksaan jika ada..."
            rows={3}
            style={{
              ...fieldInput,
              border: catatan ? '1px solid var(--danger)' : '1px solid var(--border)',
              resize: 'vertical'
            }}
          />
          {catatan && (
            <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: 4, marginBottom: 0 }}>
              ⚠️ Status akan otomatis NOK karena ada catatan
            </p>
          )}
        </div>

        <button onClick={handleSubmit} disabled={saving || saved || !sparepartsValid}
          style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', marginTop: 16,
            background: saved ? 'var(--success)' : sparepartsValid ? 'var(--primary)' : '#e0e0e0',
            color: 'white', fontSize: '15px', fontWeight: 600,
            cursor: sparepartsValid ? 'pointer' : 'not-allowed' }}>
          {saved ? '✓ Tersimpan!' : saving ? 'Menyimpan...' : !sparepartsValid ? 'Isi sparepart terlebih dahulu' : 'Simpan Checklist'}
        </button>
      </div>
    </div>
  )
}