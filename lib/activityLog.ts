import { SupabaseClient } from '@supabase/supabase-js'

export async function logActivity(
  supabase: SupabaseClient,
  params: {
    action: 'create' | 'update' | 'delete'
    entity_type: string
    entity_id: string
    old_value?: Record<string, any> | null
    new_value?: Record<string, any> | null
  }
) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('activity_logs').insert({
    user_id: user?.id || null,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    old_value: params.old_value || null,
    new_value: params.new_value || null,
    created_at: new Date().toISOString(),
  })
  if (error) {
    console.error('GAGAL LOG ACTIVITY:', error, params)
  }
}