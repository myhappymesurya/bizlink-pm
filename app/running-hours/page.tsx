'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type MeasurementField = { key: string; label: string; placeholder?: string }
type ExtraField = { key: string; label: string; type: 'select'; options: string[] }
type EquipmentConfig = {
  id: string; name: string; icon: string
  unitLabel: string; units: string[]
  extraFields: ExtraField[]
  checklist: string[]
  measurements: MeasurementField[]
  notesLabel: string
}
type EquipmentStatus = {
  id: string
  equipment_type: string
  equipment_name: string
  status: 'on' | 'off'
  started_at: string | null
  started_by: string | null
  measurements_data: Record<string, string> | null
}

const EQUIPMENT: EquipmentConfig[] = [
  {
    id: 'air-compressor', name: 'Air Compressor', icon: '⚙️',
    unitLabel: 'Equipment Identifier', units: ['Air Compressor 01', 'Air Compressor 02'],
    extraFields: [],
    checklist: [
      'Tidak ada kebocoran oli atau udara pada sistem',
      'Level oli dalam batas normal',
      'Suara dan getaran kompressor normal',
      'Temperatur oli dalam batas normal',
      'Tekanan unload dalam batas normal',
      'Filter udara / oli tidak tersumbat'
    ],
    measurements: [
      { key: 'oil_level', label: 'Oil Level' },
      { key: 'oil_temperature', label: 'Oil Temperature (°C)' },
      { key: 'unload_pressure', label: 'Unload Pressure (Bar)' },
      { key: 'load_running_time', label: 'Load Running Time (jam)' },
      { key: 'unload_running_time', label: 'Unload Running Time (jam)' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'air-dryer', name: 'Air Dryer', icon: '💨',
    unitLabel: 'Equipment Identifier', units: ['Air Dryer 01', 'Air Dryer 02'],
    extraFields: [
      { key: 'auto_drain_status', label: 'Auto Drain Check Valve Status', type: 'select', options: ['On', 'Off'] }
    ],
    checklist: [
      'Auto drain berfungsi normal',
      'Tidak ada kebocoran udara pada line dryer',
      'Pressure drop dalam batas normal',
      'Dew point indicator normal'
    ],
    measurements: [
      { key: 'inlet_pressure', label: 'Inlet Pressure (Bar)' },
      { key: 'outlet_pressure', label: 'Outlet Pressure (Bar)' },
      { key: 'dew_point', label: 'Dew Point (°C)' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'ac-package', name: 'AC Package', icon: '❄️',
    unitLabel: 'Unit', units: ['PKG 01','PKG 02','PKG 03','PKG 04','PKG 05','PKG 06','PKG 07','PKG 08','PKG 09','PKG 10'],
    extraFields: [],
    checklist: [
      'Tidak ada alarm / fault pada panel kontrol AC',
      'Tekanan freon kompressor 01 dalam batas normal',
      'Tekanan freon kompressor 02 dalam batas normal',
      'Tekanan air masuk / keluar dalam batas normal',
      'Suhu air masuk / keluar dalam batas normal',
      'Tidak ada kebocoran refrigeran atau air'
    ],
    measurements: [
      { key: 'comp01_high_freon', label: 'Compressor 01 High Pressure Freon' },
      { key: 'comp01_low_freon', label: 'Compressor 01 Low Pressure Freon' },
      { key: 'comp02_high_freon', label: 'Compressor 02 High Pressure Freon' },
      { key: 'comp02_low_freon', label: 'Compressor 02 Low Pressure Freon' },
      { key: 'water_pressure_in', label: 'Water Pressure In (bar)' },
      { key: 'water_pressure_out', label: 'Water Pressure Out (bar)' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'cooling-tower', name: 'Cooling Tower', icon: '🌀',
    unitLabel: 'Unit', units: ['Cooling Tower 1 Cell', 'Cooling Tower 2 Cell'],
    extraFields: [],
    checklist: [
      'Level air di basin dalam batas normal',
      'Fan berputar normal',
      'Tidak ada kebocoran pada sistem distribusi air',
      'Tidak ada suara atau getaran abnormal'
    ],
    measurements: [
      { key: 'water_level', label: 'Water Level' },
      { key: 'supply_pressure', label: 'Supply Pressure (bar)' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'exhaust', name: 'Exhaust', icon: '🔵',
    unitLabel: 'Unit', units: ['Exhaust 1','Exhaust 2','Exhaust 3','Exhaust 4','Exhaust 5'],
    extraFields: [],
    checklist: [
      'Fan berputar normal, tidak ada suara / getaran berlebih',
      'Grille tidak tersumbat',
      'Tidak ada kerusakan fisik pada unit'
    ],
    measurements: [],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'adsorption-tower', name: 'Adsorption Tower', icon: '🏭',
    unitLabel: 'Unit', units: ['Adsorption Tower 1', 'Adsorption Tower 2'],
    extraFields: [],
    checklist: [
      'Tekanan inlet dalam batas normal',
      'Switching valve berfungsi normal',
      'Tidak ada kebocoran pada pipa dan sambungan',
      'Moisture indicator normal'
    ],
    measurements: [
      { key: 'inlet_pressure', label: 'Inlet Pressure (Bar)' },
      { key: 'outlet_pressure', label: 'Outlet Pressure (Bar)' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'pompa-ct2', name: 'Pompa Dist. CT 2 Cell', icon: '🔧',
    unitLabel: 'Unit', units: ['CWP-101A','CWP-101B','CWP-102A','CWP-102B'],
    extraFields: [],
    checklist: [
      'Tidak ada kebocoran pada seal / packing pompa',
      'Suara dan getaran pompa normal',
      'Tekanan pompa sesuai normal',
      'Flow rate sesuai spesifikasi'
    ],
    measurements: [
      { key: 'pump_pressure', label: 'Pump Pressure (bar)' },
      { key: 'flow_rate', label: 'Flow Rate' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'pompa-ct1', name: 'Pompa Dist. CT 1 Cell', icon: '🔧',
    unitLabel: 'Unit', units: ['Pompa Molding 01', 'Pompa Molding 02'],
    extraFields: [],
    checklist: [
      'Tidak ada kebocoran pada seal / packing pompa',
      'Suara dan getaran pompa normal',
      'Tekanan pompa sesuai normal',
      'Flow rate sesuai spesifikasi'
    ],
    measurements: [
      { key: 'pump_pressure', label: 'Pump Pressure (bar)' },
      { key: 'flow_rate', label: 'Flow Rate' }
    ],
    notesLabel: 'Keterangan / Catatan'
  }
]

function getDuration(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}j ${minutes}m`
}

export default function RunningHoursPage() {
  const supabase = createClient()
  const [statuses, setStatuses] = useState<EquipmentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState(EQUIPMENT[0].id)
  const [selectedUnit, setSelectedUnit] = useState(EQUIPMENT[0].units[0])
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showMeasurements, setShowMeasurements] = useState<string | null>(null)
  const [measInput, setMeasInput] = useState<Record<string, string>>({})
  const [savingMeas, setSavingMeas] = useState(false)

  const config = EQUIPMENT.find(e => e.id === selectedType)!
  const allChecked = config.checklist.every(item => checks[item])

  useEffect(() => {
    fetchStatuses()
    const interval = setInterval(fetchStatuses, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setSelectedUnit(config.units[0])
    setChecks({})
    setMeasurements({})
  }, [selectedType])

  async function fetchStatuses() {
    const { data } = await supabase
      .from('equipment_status')
      .select('*')
      .order('equipment_type')
    setStatuses(data || [])
    setLoading(false)
  }

  async function handleStart() {
    if (!allChecked) return
    setSubmitting(true)
    setError('')
    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/equipment/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`
        },
        body: JSON.stringify({
          equipment_type: selectedType,
          equipment_name: selectedUnit,
          checklist_data: checks
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menyalakan mesin')
      } else {
        setSuccess(`${selectedUnit} berhasil dinyalakan`)
        setChecks({})
        fetchStatuses()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (e) {
      setError('Terjadi kesalahan koneksi')
    }
    setSubmitting(false)
  }

  async function handleStop(equipment_type: string, equipment_name: string) {
    setSubmitting(true)
    setError('')
    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/equipment/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`
        },
        body: JSON.stringify({ equipment_type, equipment_name })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal mematikan mesin')
      } else {
        setSuccess(`${equipment_name} dimatikan — durasi ${data.duration_hours} jam`)
        fetchStatuses()
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (e) {
      setError('Terjadi kesalahan koneksi')
    }
    setSubmitting(false)
  }

  async function handleSaveMeasurements(equipment_type: string, equipment_name: string) {
    setSavingMeas(true)
    const { error } = await supabase
      .from('equipment_status')
      .update({ measurements_data: measInput, last_updated: new Date().toISOString() })
      .eq('equipment_type', equipment_type)
      .eq('equipment_name', equipment_name)
    setSavingMeas(false)
    if (!error) {
      setShowMeasurements(null)
      setMeasInput({})
      fetchStatuses()
    }
  }

  const onStatus = statuses.filter(s => s.status === 'on')
  const offStatus = statuses.filter(s => s.status === 'off')

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f7' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0a3047', margin: 0 }}>
              Running Hours Monitor
            </h1>
            <p style={{ color: '#7f8c8d', fontSize: '14px', marginTop: 4 }}>
              Status real-time semua equipment — refresh otomatis setiap 30 detik
            </p>
          </div>
          <a href="/running-hours/rekap" style={{
            padding: '10px 20px',
            background: '#d4af37',
            color: '#0a3047',
            textDecoration: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
            display: 'inline-block'
          }}>
            📊 Rekapitulasi
          </a>
        </div>

        {error && (
          <div style={{ background: '#fdecea', color: '#e74c3c', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#eafaf1', color: '#27ae60', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
            {success}
          </div>
        )}

        {/* STATUS MONITOR */}
        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0a3047', margin: 0 }}>
              Status Equipment
            </h2>
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <span style={{ color: '#27ae60', fontWeight: 600 }}>● ON: {onStatus.length}</span>
              <span style={{ color: '#7f8c8d' }}>● OFF: {offStatus.length}</span>
            </div>
          </div>

          {loading ? (
            <p style={{ color: '#7f8c8d', fontSize: 14 }}>Memuat status...</p>
          ) : (
            EQUIPMENT.map(eq => {
              const units = statuses.filter(s => s.equipment_type === eq.id)
              if (units.length === 0) return null
              return (
                <div key={eq.id} style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#2c3e50', marginBottom: 8 }}>
                    {eq.icon} {eq.name}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {units.map(unit => (
                      <div key={unit.id} style={{
                        border: `1px solid ${unit.status === 'on' ? '#27ae60' : '#e0e0e0'}`,
                        borderRadius: 8,
                        padding: '12px 16px',
                        minWidth: 200,
                        background: unit.status === 'on' ? '#f0fdf4' : 'white'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{unit.equipment_name}</span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: unit.status === 'on' ? '#27ae60' : '#e0e0e0',
                            color: unit.status === 'on' ? 'white' : '#7f8c8d'
                          }}>
                            {unit.status === 'on' ? 'ON' : 'OFF'}
                          </span>
                        </div>

                        {unit.status === 'on' && unit.started_at && (
                          <div style={{ fontSize: 12, color: '#7f8c8d', marginBottom: 8 }}>
                            ⏱ {getDuration(unit.started_at)}
                          </div>
                        )}

                        {unit.status === 'on' && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                const measConfig = EQUIPMENT.find(e => e.id === unit.equipment_type)
                                if (measConfig && measConfig.measurements.length > 0) {
                                  setShowMeasurements(`${unit.equipment_type}__${unit.equipment_name}`)
                                  setMeasInput(unit.measurements_data || {})
                                }
                              }}
                              style={{
                                padding: '4px 10px',
                                background: '#2d9cca',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 600
                              }}
                            >
                              📊 Measurements
                            </button>
                            <button
                              onClick={() => handleStop(unit.equipment_type, unit.equipment_name)}
                              disabled={submitting}
                              style={{
                                padding: '4px 10px',
                                background: '#e74c3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 600,
                                opacity: submitting ? 0.6 : 1
                              }}
                            >
                              ⏹ Stop
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* MEASUREMENTS MODAL */}
        {showMeasurements && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }}>
            <div style={{ background: 'white', padding: 24, borderRadius: 8, width: 400, maxWidth: '90%' }}>
              <h3 style={{ color: '#0a3047', marginBottom: 16 }}>Input Measurements</h3>
              {(() => {
                const [type, name] = showMeasurements.split('__')
                const measConfig = EQUIPMENT.find(e => e.id === type)
                if (!measConfig) return null
                return (
                  <>
                    {measConfig.measurements.map(m => (
                      <div key={m.key} style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 13, color: '#7f8c8d', display: 'block', marginBottom: 4 }}>{m.label}</label>
                        <input
                          type="text"
                          value={measInput[m.key] || ''}
                          onChange={e => setMeasInput(prev => ({ ...prev, [m.key]: e.target.value }))}
                          style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        onClick={() => { setShowMeasurements(null); setMeasInput({}) }}
                        style={{ flex: 1, padding: 10, background: '#7f8c8d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleSaveMeasurements(type, name)}
                        disabled={savingMeas}
                        style={{ flex: 1, padding: 10, background: '#0a3047', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      >
                        {savingMeas ? 'Menyimpan...' : 'Simpan'}
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* FORM OPERASI */}
        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0a3047', marginBottom: 20 }}>
            Operasi Mesin
          </h2>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 13, color: '#7f8c8d', display: 'block', marginBottom: 4 }}>Tipe Equipment</label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              >
                {EQUIPMENT.map(e => (
                  <option key={e.id} value={e.id}>{e.icon} {e.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 13, color: '#7f8c8d', display: 'block', marginBottom: 4 }}>{config.unitLabel}</label>
              <select
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              >
                {config.units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cek status unit yang dipilih */}
          {(() => {
            const unitStatus = statuses.find(
              s => s.equipment_type === selectedType && s.equipment_name === selectedUnit
            )
            if (unitStatus?.status === 'on') {
              return (
                <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: 12, fontSize: 14, color: '#856404' }}>
                  ⚠️ {selectedUnit} sedang dalam status ON sejak {unitStatus.started_at ? new Date(unitStatus.started_at).toLocaleString('id-ID') : '-'}.
                  Gunakan tombol Stop di Status Monitor untuk mematikan mesin ini.
                </div>
              )
            }
            return (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#2c3e50', marginBottom: 12 }}>
                  Checklist Sebelum Nyalakan ({config.checklist.filter(i => checks[i]).length}/{config.checklist.length})
                </h3>
                {config.checklist.map(item => (
                  <div
                    key={item}
                    onClick={() => setChecks(prev => ({ ...prev, [item]: !prev[item] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 6, marginBottom: 6, cursor: 'pointer',
                      background: checks[item] ? '#f0fdf4' : '#fafafa',
                      border: checks[item] ? '1px solid #bbf7d0' : '1px solid #e0e0e0'
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      background: checks[item] ? '#27ae60' : 'white',
                      border: checks[item] ? 'none' : '2px solid #ddd',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 12
                    }}>
                      {checks[item] ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: 13 }}>{item}</span>
                  </div>
                ))}

                <button
                  onClick={handleStart}
                  disabled={!allChecked || submitting}
                  style={{
                    marginTop: 16, width: '100%', padding: 12,
                    background: allChecked ? '#27ae60' : '#e0e0e0',
                    color: allChecked ? 'white' : '#7f8c8d',
                    border: 'none', borderRadius: 6, cursor: allChecked ? 'pointer' : 'not-allowed',
                    fontSize: 14, fontWeight: 600, transition: 'background 0.2s'
                  }}
                >
                  {submitting ? 'Memproses...' : allChecked ? `▶ Nyalakan ${selectedUnit}` : `Lengkapi checklist dulu (${config.checklist.filter(i => checks[i]).length}/${config.checklist.length})`}
                </button>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}