// lib/constants.ts

export const CATEGORIES_MAP: Record<string, string[]> = {
  'Fire Safety': [
    'Fire Extinguisher',
    'Fire Hydrant',
    'Emergency Door',
    'Smoke & Heat Detector',
    'Evacuation Lamp',
    'Pompa Pemadam Kebakaran'
  ],
  'HVAC': [
    'AC Single Split',
    'AC Cassette',
    'AC Single Split Duct Type',
    'AC Multi Split Duct Type',
    'AC Package',
    'Cooling Tower',
    'Exhaust Fan',
    'Adsorption Tower'
  ],
  'Electrical': ['Panel Listrik'],
  'Mechanical': [
    'Air Compressor',
    'Air Dryer',
    'Pompa Distribusi CT 2 Cell',
    'Pompa Distribusi CT 1 Cell',
    'Pompa Supply CT',
    'Pompa Booster'
  ]
}

export const FREQ_DAYS: Record<string, number> = {
  Daily: 1,
  Weekly: 7,
  'Bi Weekly': 14,
  Monthly: 30,
  Quarterly: 90,
  'Bi Annually': 180,
  Annually: 365
}

export const INSPECTOR_OPTIONS: string[] = [
  'Suwarsono',
  'Tenang Riatman',
  'Other'
]

export const FREQ_BASED_CHECKLISTS: string[] = [
  'AC Package',
  'Cooling Tower',
  'Exhaust Fan',
  'Adsorption Tower',
  'Air Compressor',
  'Air Dryer',
  'Pompa Distribusi CT 2 Cell',
  'Pompa Distribusi CT 1 Cell',
  'Pompa Supply CT',
  'Pompa Booster',
  'Pompa Pemadam Kebakaran'
]

export const SIMPLE_CHECKLISTS: string[] = [
  'Fire Extinguisher',
  'Fire Hydrant',
  'Emergency Door',
  'Smoke & Heat Detector',
  'Evacuation Lamp',
  'AC Single Split',
  'AC Cassette',
  'AC Single Split Duct Type',
  'AC Multi Split Duct Type',
  'Panel Listrik'
]