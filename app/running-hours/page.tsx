'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { INSPECTOR_OPTIONS } from '@/lib/constants'
import { exportTablePDF } from '@/lib/exportPDF'
import Navbar from '@/components/Navbar'

type MeasurementField = { key: string; label: string; placeholder?: string }
type ExtraField = { key: string; label: string; type: 'select'; options: string[] }
type EquipmentConfig = {
  id: string; name: string; logTitle: string; icon: string
  unitLabel: string; units: string[]
  extraFields: ExtraField[]
  checklist: string[]
  measurements: MeasurementField[]
  notesLabel: string
}

const EQUIPMENT: EquipmentConfig[] = [
  {
    id: 'air-compressor', name: 'Air Compressor', logTitle: 'Running Hours Log', icon: '⚙️',
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
    id: 'air-dryer', name: 'Air Dryer', logTitle: 'Running Hours Log', icon: '💨',
    unitLabel: 'Equipment Identifier', units: ['Air Dryer 01', 'Air Dryer 02'],
    extraFields: [
      { key: 'auto_drain_status', label: 'Auto Drain Check Valve Status', type: 'select', options: ['On', 'Off'] }
    ],
    checklist: [
      'Auto drain berfungsi normal',
      'Tidak ada kebocoran udara pada line dryer',
      'Tekanan udara dalam batas normal',
      'Tekanan freon kompresor dalam batas normal',
      'Indikator dew point dalam kondisi baik'
    ],
    measurements: [
      { key: 'air_pressure', label: 'Air Pressure (default: 110)', placeholder: '110' },
      { key: 'freon_pressure', label: 'Compressor Freon Pressure (default: 105)', placeholder: '105' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'ac-package', name: 'AC Package', logTitle: 'Operational On Time Log', icon: '❄️',
    unitLabel: 'Equipment Identifier',
    units: ['PKG 01','PKG 02','PKG 03','PKG 04','PKG 05','PKG 06','PKG 07','PKG 08','PKG 09','PKG 10'],
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
      { key: 'water_pressure_out', label: 'Water Pressure Out (bar)' },
      { key: 'water_temp_in', label: 'Water Temperature In (°C)' },
      { key: 'water_temp_out', label: 'Water Temperature Out (°C)' },
      { key: 'set_temperature', label: 'Set Temperature (°C)' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'cooling-tower', name: 'Cooling Tower', logTitle: 'Running Hours Log', icon: '🌀',
    unitLabel: 'Equipment Identifier', units: ['Cooling Tower 1 Cell', 'Cooling Tower 2 Cell'],
    extraFields: [],
    checklist: [
      'Level air di basin dalam batas normal',
      'Fan motor berputar normal, tidak ada suara aneh',
      'Pump motor berjalan normal',
      'Tidak ada kebocoran pada sistem distribusi air',
      'Suhu inlet / outlet dalam batas normal',
      'Tidak ada korosi / kerusakan pada fill media'
    ],
    measurements: [
      { key: 'inlet_water_temp', label: 'Inlet Water Temperature (°C)' },
      { key: 'outlet_water_temp', label: 'Outlet Water Temperature (°C)' },
      { key: 'water_level', label: 'Water Level (%)' },
      { key: 'fan_motor_current', label: 'Fan Motor Current (A)' },
      { key: 'pump_motor_current', label: 'Pump Motor Current (A)' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'exhaust', name: 'Exhaust', logTitle: 'Running Hours Log', icon: '🔵',
    unitLabel: 'Equipment Identifier',
    units: ['Exhaust 1','Exhaust 2','Exhaust 3','Exhaust 4','Exhaust 5'],
    extraFields: [],
    checklist: [
      'Fan berputar normal, tidak ada suara / getaran berlebih',
      'Arus motor dalam batas normal',
      'Belt / coupling dalam kondisi baik (jika ada)',
      'Saluran exhaust tidak tersumbat',
      'Tidak ada alarm pada panel kontrol'
    ],
    measurements: [
      { key: 'motor_current', label: 'Motor Current (A)' },
      { key: 'airflow', label: 'Airflow (m³/h)' },
      { key: 'vibration_level', label: 'Vibration Level (mm/s)' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'adsorption-tower', name: 'Adsorption Tower', logTitle: 'Running Hours Log', icon: '🏭',
    unitLabel: 'Equipment Identifier', units: ['Adsorption Tower 1', 'Adsorption Tower 2'],
    extraFields: [],
    checklist: [
      'Tekanan inlet dalam batas normal',
      'Tekanan outlet dalam batas normal',
      'Dew point dalam batas yang ditentukan',
      'Cycle switching berjalan normal (indikator aktif)',
      'Tidak ada kebocoran udara pada fitting / valve'
    ],
    measurements: [
      { key: 'inlet_pressure', label: 'Inlet Pressure (bar)' },
      { key: 'outlet_pressure', label: 'Outlet Pressure (bar)' },
      { key: 'inlet_temperature', label: 'Inlet Temperature (°C)' },
      { key: 'dew_point', label: 'Dew Point (°C)' }
    ],
    notesLabel: 'Keterangan / Catatan'
  },
  {
    id: 'pompa-ct2', name: 'Pompa Dist. CT 2 Cell', logTitle: 'Running Hours Log', icon: '🔧',
    unitLabel: 'Nama Pompa',
    units: ['CWP-101A','CWP-101B','CWP-102A','CWP-102B'],
    extraFields: [],
    checklist: [
      'Tidak ada kebocoran pada seal / packing pompa',
      'Suara dan getaran pompa normal (tidak ada noise berlebih)',
      'Tekanan discharge dalam batas normal',
      'Motor tidak panas berlebih (overheating)',
      'Panel kontrol / indikator pompa normal',
      'Aliran air stabil dan sesuai kebutuhan'
    ],
    measurements: [
      { key: 'flow_rate', label: 'Flow Rate (m³/h)' },
      { key: 'discharge_pressure', label: 'Pump Discharge Pressure (bar)' },
      { key: 'motor_current', label: 'Motor Current (A)' },
      { key: 'vibration_level', label: 'Vibration Level (mm/s)' }
    ],
    notesLabel: 'Keterangan / Temuan'
  },
  {
    id: 'pompa-ct1', name: 'Pompa Dist. CT 1 Cell', logTitle: 'Running Hours Log', icon: '🔧',
    unitLabel: 'Nama Pompa', units: ['Pompa Molding 01', 'Pompa Molding 02'],
    extraFields: [],
    checklist: [
      'Tidak ada kebocoran pada seal / packing pompa',
      'Suara dan getaran pompa normal (tidak ada noise berlebih)',
      'Tekanan discharge dalam batas normal',
      'Motor tidak panas berlebih (overheating)',
      'Panel kontrol / indikator pompa normal',
      'Aliran air stabil dan sesuai kebutuhan'
    ],
    measurements: [
      { key: 'flow_rate', label: 'Flow Rate (m³/h)' },
      { key: 'discharge_pressure', label: 'Pump Discharge Pressure (bar)' },
      { key: 'motor_current', label: 'Motor Current (A)' },
      { key: 'vibration_level', label: 'Vibration Level (mm/s)' }
    ],
    notesLabel: 'Keterangan / Temuan'
  }
]

function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours} jam ${minutes} menit`
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

type LogRecord = {
  id: string
  phase1_at: string | null
  phase1_inspector: string | null
  phase2_at: string | null
}

export default function RunningHoursPage() {
  const [equipType, setEquipType] = useState(EQUIPMENT[0].id)
  const [equipUnit, setEquipUnit] = useState(EQUIPMENT[0].units[0])
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [checklist, setChecklist] = useState<Record<number, 'yes' | 'no'>>({})
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [extraFields, setExtraFields] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [inspector, setInspector] = useState('')
  const [currentLog, setCurrentLog] = useState<LogRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)

  const config = EQUIPMENT.find(e => e.id === equipType)!

  function resetInputs() {
    setChecklist({})
    setMeasurements({})
    setExtraFields({})
    setNotes('')
    setInspector('')
    setError('')
    setSuccess('')
  }

  useEffect(() => {
    const newConfig = EQUIPMENT.find(e => e.id === equipType)!
    setEquipUnit(newConfig.units[0])
    resetInputs()
  }, [equipType])

  useEffect(() => {
    resetInputs()
  }, [equipUnit])

  useEffect(() => {
    fetchLog()
  }, [equipType, equipUnit, tanggal])

  async function fetchLog() {
    setChecking(true)
    try {
      const { data } = await supabase
        .from('running_hours_logs')
        .select('id, phase1_at, phase1_inspector, phase2_at')
        .eq('equipment_type', equipType)
        .eq('equipment_name', equipUnit)
        .eq('tanggal', tanggal)
        .maybeSingle()
      setCurrentLog(data || null)
    } catch {
      setCurrentLog(null)
    } finally {
      setChecking(false)
    }
  }

  const phase = !currentLog ? 1 : !currentLog.phase2_at ? 2 : 'done'

  async function handlePhase1Submit() {
    setError('')
    const unanswered = config.checklist.filter((_, i) => checklist[i] === undefined)
    if (unanswered.length > 0) { setError('Semua poin pemeriksaan harus diisi'); return }
    const emptyMeasure = config.measurements.filter(m => !measurements[m.key])
    if (emptyMeasure.length > 0) { setError('Semua data pengukuran harus diisi'); return }
    const emptyExtra = config.extraFields.filter(f => !extraFields[f.key])
    if (emptyExtra.length > 0) { setError('Semua field informasi harus diisi'); return }
    if (!inspector) { setError('Pilih operator / inspector terlebih dahulu'); return }

    setLoading(true)
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id
      const checklistData = config.checklist.map((label, i) => ({ label, result: checklist[i] }))
      const measurementsData: Record<string, number | null> = {}
      config.measurements.forEach(m => {
        measurementsData[m.key] = measurements[m.key] ? parseFloat(measurements[m.key]) : null
      })
      const { error: err } = await supabase.from('running_hours_logs').insert({
        equipment_type: equipType,
        equipment_name: equipUnit,
        tanggal,
        phase1_at: new Date().toISOString(),
        phase1_inspector: inspector,
        user_id: userId,
        checklist: checklistData,
        measurements: measurementsData,
        extra_fields: Object.keys(extraFields).length ? extraFields : null,
        notes: notes || null
      })
      if (err) throw err
      setSuccess('Phase 1 berhasil! Mesin tercatat ON.')
      await fetchLog()
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan data')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhase2Submit() {
    if (!currentLog) return
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('running_hours_logs')
        .update({ phase2_at: new Date().toISOString() })
        .eq('id', currentLog.id)
      if (err) throw err
      await fetchLog()
    } catch (e: any) {
      setError(e.message || 'Gagal mencatat OFF')
    } finally {
      setLoading(false)
    }
  }

  const runningHours = currentLog?.phase1_at && currentLog?.phase2_at
    ? formatDuration(new Date(currentLog.phase2_at).getTime() - new Date(currentLog.phase1_at).getTime())
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Equipment</label>
              <select value={equipType} onChange={e => setEquipType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {EQUIPMENT.map(e => <option key={e.id} value={e.id}>{e.icon} {e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{config.unitLabel}</label>
              <select value={equipUnit} onChange={e => setEquipUnit(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {config.units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <button onClick={() => exportTablePDF('table-running-hours', 'Running-Hours', `${config.name} Logs`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              📥 Export PDF
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">{config.icon} {config.name} — {config.logTitle}</h1>
          <p className="text-sm text-gray-500">Frekuensi: Harian</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Form */}
          <div className="col-span-2 space-y-4">
            {/* Phase Indicator */}
            <div className="flex gap-2">
              <div className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium text-center ${phase === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                ▶ Phase 1 — Isi Saat Mesin ON
              </div>
              <div className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium text-center ${phase === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                ■ Phase 2 — Konfirmasi OFF
              </div>
            </div>

            {checking && <div className="text-center py-12 text-gray-400 text-sm">Mengecek status...</div>}

            {/* DONE */}
            {!checking && phase === 'done' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">✅</div>
                <h2 className="text-lg font-bold text-green-700 mb-2">Selesai Hari Ini</h2>
                <p className="text-sm text-gray-600 mb-4">
                  ON: <strong>{formatTime(currentLog!.phase1_at!)}</strong> &nbsp;→&nbsp; OFF: <strong>{formatTime(currentLog!.phase2_at!)}</strong>
                </p>
                <div className="bg-white rounded-xl border border-green-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Running Hours</p>
                  <p className="text-3xl font-bold text-green-600">{runningHours}</p>
                </div>
                <p className="text-xs text-gray-400 mt-3">Inspector: {currentLog!.phase1_inspector}</p>
              </div>
            )}

            {/* PHASE 2 */}
            {!checking && phase === 2 && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-3xl">🟢</span>
                  <div>
                    <p className="font-semibold text-amber-800">Mesin Sedang ON</p>
                    <p className="text-sm text-gray-600">
                      Dinyalakan pukul <strong>{formatTime(currentLog!.phase1_at!)}</strong> oleh <strong>{currentLog!.phase1_inspector}</strong>
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-800 mb-2">■ Phase 2 — Konfirmasi Mesin OFF</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Tekan tombol ini saat mesin sudah dimatikan. Sistem akan mencatat waktu OFF dan menghitung running hours otomatis.
                  </p>
                  {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-red-700 text-sm">❌ {error}</p></div>}
                  <button onClick={handlePhase2Submit} disabled={loading}
                    className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {loading ? 'Menyimpan...' : '■ Konfirmasi Mesin OFF'}
                  </button>
                </div>
              </div>
            )}

            {/* PHASE 1 */}
            {!checking && phase === 1 && (
              <div className="space-y-4">
                {/* Informasi Umum */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-800 mb-3">📋 Informasi Umum</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Operasi *</label>
                      <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    {config.extraFields.map(field => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{field.label} *</label>
                        <select value={extraFields[field.key] || ''} onChange={e => setExtraFields(p => ({ ...p, [field.key]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Pilih...</option>
                          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Poin Pemeriksaan */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-800 mb-3">✅ Poin Pemeriksaan</h2>
                  <div className="space-y-2">
                    {config.checklist.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-700 flex-1">
                          <span className="text-gray-400 mr-2">{i + 1}</span>{item}
                        </span>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" onClick={() => setChecklist(p => ({ ...p, [i]: 'yes' }))}
                            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${checklist[i] === 'yes' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-300 hover:bg-green-50'}`}>
                            ✓ Yes
                          </button>
                          <button type="button" onClick={() => setChecklist(p => ({ ...p, [i]: 'no' }))}
                            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${checklist[i] === 'no' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-300 hover:bg-red-50'}`}>
                            ✗ No
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data & Pengukuran */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-800 mb-3">📊 Data & Pengukuran</h2>
                  <div className="space-y-3">
                    {config.measurements.map(field => (
                      <div key={field.key} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-700 flex-1">{field.label}</span>
                        <input type="number" value={measurements[field.key] || ''} placeholder={field.placeholder || '0'}
                          onChange={e => setMeasurements(p => ({ ...p, [field.key]: e.target.value }))}
                          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" step="any" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keterangan */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-800 mb-3">💬 {config.notesLabel}</h2>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    placeholder="Tuliskan catatan, temuan, atau masalah yang ditemukan..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                {/* Inspector */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-800 mb-3">👤 Operator / Inspector</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {INSPECTOR_OPTIONS.map(name => (
                      <button key={name} type="button" onClick={() => setInspector(name)}
                        className={`py-2 px-2 rounded-lg text-sm font-medium border transition-colors ${inspector === name ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-red-700 text-sm">❌ {error}</p></div>}
                {success && <div className="bg-blue-50 border border-blue-200 rounded-xl p-3"><p className="text-blue-700 text-sm">✅ {success}</p></div>}

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={resetInputs}
                    className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
                    Reset
                  </button>
                  <button type="button" onClick={handlePhase1Submit} disabled={loading}
                    className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                    {loading ? 'Menyimpan...' : '▶ Submit Phase 1 — Mesin ON'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logs List */}
          <div className="col-span-1">
            <div ref={tableRef} id="table-running-hours" className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">📊 Riwayat</h3>
              <div className="text-xs text-gray-600">
                <p>Data akan tampil setelah submit</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}