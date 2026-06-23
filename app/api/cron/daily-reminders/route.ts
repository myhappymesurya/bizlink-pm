import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: Request) {
  // Verify Cron Secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Fetch overdue schedules
    const { data: schedules, error } = await supabase
      .from('pm_schedules')
      .select('id, asset_id, sub_category, next_due_date')
      .lte('next_due_date', new Date().toISOString().split('T')[0])
      .eq('is_active', true)

    if (error) throw error

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No overdue schedules', count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: schedules.length,
        message: 'Daily reminder check completed'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cron error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}