import { SupabaseClient } from '@supabase/supabase-js'

const FREQ_DAYS: Record<string, number> = {
  'Daily': 1, 'Weekly': 7, 'Bi Weekly': 14, 'Monthly': 30,
  'Quarterly': 90, 'Bi Annually': 180, 'Annually': 365,
}

export async function updatePmSchedule(
  supabase: SupabaseClient,
  params: { asset_id: string; sub_category: string; frequency: string }
) {
  const now = new Date()
  const freq = params.frequency || 'Monthly'
  const nextDue = new Date(now.getTime() + (FREQ_DAYS[freq] || 30) * 86400000)

  const { data, error } = await supabase
    .from('pm_schedules')
    .update({
      last_done_at: now.toISOString(),
      next_due_date: nextDue.toISOString().split('T')[0],
    })
    .eq('asset_id', params.asset_id)
    .eq('sub_category', params.sub_category)
    .eq('frequency', freq)
    .select()

  if (error) {
    console.error('GAGAL UPDATE pm_schedules:', error, params)
  }
  return { data, error }
}