import raw from './panelListrikQuarterly.json'

export type Rule =
  | { type: 'range'; min: number; max: number }
  | { type: 'lt'; max: number }
  | { type: 'lte'; max: number }
  | { type: 'max_ratio'; param: 'In'; ratio: number }

export type PanelItem = {
  id: string
  label: string
  sub_item?: string
  type: 'numeric' | 'yes_no'
  unit?: string
  limit_text?: string
  hint?: string
  rule?: Rule
  pass_value?: 'yes'
  required: boolean
}
export type PanelSection = { id: string; title: string; note?: string; items: PanelItem[] }
export type PanelTemplate = { template_name: string; version: number; sections: PanelSection[] }

export const PANEL_QUARTERLY = raw as unknown as PanelTemplate

export type PanelFormState = {
  inRated: string
  values: Record<string, string>
  yesNo: Record<string, 'yes' | 'no' | undefined>
}
export const emptyPanelState = (inRated = ''): PanelFormState => ({ inRated, values: {}, yesNo: {} })

export type PanelRow = {
  item: PanelItem
  label: string
  result: 'OK' | 'NOK' | 'EMPTY'
  value: number | null
  limit_min: number | null
  limit_max: number | null
}

function parseNumber(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const round2 = (x: number) => Math.round(x * 100) / 100

export function evaluateNumeric(rule: Rule, rawValue: string, inRated: number | null) {
  let min: number | null = null
  let max: number | null = null
  switch (rule.type) {
    case 'range': min = rule.min; max = rule.max; break
    case 'lt':
    case 'lte': max = rule.max; break
    case 'max_ratio': max = inRated === null ? null : round2(inRated * rule.ratio); break
  }
  const value = parseNumber(rawValue)
  if (value === null || (rule.type === 'max_ratio' && max === null)) {
    return { result: 'EMPTY' as const, value, limit_min: min, limit_max: max }
  }
  let ok = false
  switch (rule.type) {
    case 'range': ok = value >= rule.min && value <= rule.max; break
    case 'lt': ok = value < rule.max; break
    case 'lte': ok = value <= rule.max; break
    case 'max_ratio': ok = value <= (max as number); break
  }
  return { result: (ok ? 'OK' : 'NOK') as 'OK' | 'NOK', value, limit_min: min, limit_max: max }
}

export function buildPanelRows(state: PanelFormState): PanelRow[] {
  const inParsed = parseNumber(state.inRated)
  const inRated = inParsed !== null && inParsed > 0 ? inParsed : null

  return PANEL_QUARTERLY.sections.flatMap(s => s.items).map(item => {
    const label = item.sub_item ? `${item.label} — ${item.sub_item}` : item.label
    if (item.type === 'yes_no') {
      const a = state.yesNo[item.id]
      const result = a === undefined ? 'EMPTY' : a === (item.pass_value ?? 'yes') ? 'OK' : 'NOK'
      return { item, label, result, value: null, limit_min: null, limit_max: null } as PanelRow
    }
    const ev = evaluateNumeric(item.rule!, state.values[item.id] ?? '', inRated)
    return { item, label, ...ev } as PanelRow
  })
}
