import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateDates(task: any, fromDate: Date, toDate: Date): string[] {
  const dates: string[] = []
  const current = new Date(fromDate)

  while (current <= toDate) {
    const dateStr = current.toISOString().split('T')[0]

    if (task.frequency === 'one-time') {
      if (dateStr === task.start_date) dates.push(dateStr)
    } else if (task.frequency === 'daily') {
      dates.push(dateStr)
    } else if (task.frequency === 'weekly') {
      if (current.getDay() === task.frequency_day) dates.push(dateStr)
    } else if (task.frequency === 'monthly') {
      if (current.getDate() === task.frequency_day) dates.push(dateStr)
    }

    current.setDate(current.getDate() + 1)
  }

  return dates
}

export async function POST(request: NextRequest) {
  try {
    // Verifikasi admin atau cron
    const authHeader = request.headers.get('authorization')
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
    
    if (!isCron) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        authHeader?.replace('Bearer ', '') || ''
      )
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Hanya admin yang bisa generate instances' }, { status: 403 })
      }
    }

    // Ambil semua task aktif
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('pm_tasks')
      .select('*')
      .eq('is_active', true)

    if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 })
    if (!tasks || tasks.length === 0) return NextResponse.json({ message: 'Tidak ada task aktif' })

    // Generate instances untuk 30 hari ke depan
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thirtyDaysLater = new Date(today)
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

    let totalGenerated = 0

    for (const task of tasks) {
      const startFrom = new Date(Math.max(today.getTime(), new Date(task.start_date).getTime()))
      const endAt = task.end_date
        ? new Date(Math.min(thirtyDaysLater.getTime(), new Date(task.end_date).getTime()))
        : thirtyDaysLater

      const dates = generateDates(task, startFrom, endAt)

      for (const date of dates) {
        await supabaseAdmin
          .from('pm_task_instances')
          .upsert({
            task_id: task.id,
            scheduled_date: date,
            status: 'pending',
            created_at: new Date().toISOString()
          }, {
            onConflict: 'task_id,scheduled_date',
            ignoreDuplicates: true
          })
        totalGenerated++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${totalGenerated} instances di-generate untuk 30 hari ke depan`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}