// lib/equipmentMeasurements.ts
// Daftar field measurement yang WAJIB diisi per tipe equipment.
// Dipakai oleh server (API start/stop) untuk memeriksa kelengkapan.
// Kalau ada field measurement di halaman Running Hours diubah, file ini juga harus diubah.

export const REQUIRED_MEASUREMENTS: Record<string, string[]> = {
  'air-compressor': [
    'oil_level',
    'oil_temperature',
    'unload_pressure',
    'load_running_time',
    'unload_running_time',
  ],
  'air-dryer': ['inlet_pressure', 'outlet_pressure', 'dew_point'],
  'ac-package': [
    'comp01_high_freon',
    'comp01_low_freon',
    'comp02_high_freon',
    'comp02_low_freon',
    'water_pressure_in',
    'water_pressure_out',
  ],
  'cooling-tower': ['water_level', 'supply_pressure'],
  'exhaust': [], // tidak punya measurement, jadi tidak diwajibkan
  'adsorption-tower': ['inlet_pressure', 'outlet_pressure'],
  'pompa-ct2': ['pump_pressure', 'flow_rate'],
  'pompa-ct1': ['pump_pressure', 'flow_rate'],
}

// true = measurement sudah lengkap (atau memang tidak diwajibkan)
export function isMeasurementComplete(
  equipmentType: string,
  data: Record<string, string> | null | undefined
): boolean {
  const keys = REQUIRED_MEASUREMENTS[equipmentType] ?? []
  if (keys.length === 0) return true
  if (!data) return false
  return keys.every(k => typeof data[k] === 'string' && data[k].trim() !== '')
}