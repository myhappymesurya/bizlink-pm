'use client'
import {
  PANEL_QUARTERLY,
  buildPanelRows,
  type PanelFormState,
  type PanelRow,
} from '@/lib/checklist/panelListrikQuarterly'

type Props = {
  state: PanelFormState
  onChange: (next: PanelFormState) => void
}

const card: React.CSSProperties = {
  background: 'var(--bg-card)', padding: '24px', borderRadius: '8px',
  boxShadow: 'var(--shadow)', marginBottom: '16px',
}
const input: React.CSSProperties = {
  padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)',
  fontSize: '14px', boxSizing: 'border-box',
}

function badge(result: PanelRow['result']) {
  if (result === 'OK') return { text: 'OK', color: 'var(--success)' }
  if (result === 'NOK') return { text: 'NOK', color: 'var(--danger)' }
  return { text: '—', color: 'var(--text-secondary)' }
}

export default function PanelQuarterlyForm({ state, onChange }: Props) {
  const rows = buildPanelRows(state)
  const byId = new Map(rows.map(r => [r.item.id, r]))

  const setValue = (id: string, v: string) =>
    onChange({ ...state, values: { ...state.values, [id]: v } })
  const setYesNo = (id: string, v: 'yes' | 'no') =>
    onChange({ ...state, yesNo: { ...state.yesNo, [id]: v } })

  return (
    <>
      <div style={card}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Arus nominal panel, In (A)
        </label>
        <input
          inputMode="decimal"
          value={state.inRated}
          onChange={e => onChange({ ...state, inRated: e.target.value })}
          placeholder="contoh: 400"
          style={{ ...input, width: '100%' }}
        />
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
          Dipakai untuk batas arus fasa R/S/T: maksimal 85% x In.
        </p>
      </div>

      {PANEL_QUARTERLY.sections.map(section => (
        <div key={section.id} style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>{section.title}</div>
          {section.note && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{section.note}</div>
          )}
          {section.items.map(item => {
            const row = byId.get(item.id)!
            const b = badge(row.result)
            const title = item.sub_item ? `${item.label} — ${item.sub_item}` : item.label
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  padding: '10px 0', borderBottom: '1px solid var(--border-light)',
                }}
              >
                <div style={{ flex: '1 1 160px' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{title}</div>
                  {item.limit_text && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Limit: {item.limit_text}
                      {item.rule?.type === 'max_ratio' && row.limit_max !== null && ` (≤ ${row.limit_max} A)`}
                    </div>
                  )}
                  {item.hint && <div style={{ fontSize: 11, color: 'var(--warning)' }}>{item.hint}</div>}
                </div>

                {item.type === 'numeric' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      inputMode="decimal"
                      value={state.values[item.id] ?? ''}
                      onChange={e => setValue(item.id, e.target.value)}
                      style={{ ...input, width: 90, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 12, width: 32, color: 'var(--text-secondary)' }}>{item.unit}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['yes', 'no'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setYesNo(item.id, v)}
                        style={{
                          padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                          border: '1px solid var(--border)',
                          background: state.yesNo[item.id] === v ? 'var(--primary)' : 'white',
                          color: state.yesNo[item.id] === v ? 'white' : 'var(--text-primary)',
                        }}
                      >
                        {v === 'yes' ? 'Ya' : 'Tidak'}
                      </button>
                    ))}
                  </div>
                )}

                <span style={{ minWidth: 40, textAlign: 'right', fontWeight: 600, fontSize: 12, color: b.color }}>
                  {b.text}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}
