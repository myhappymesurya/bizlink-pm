import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Window generate per frekuensi (hari)
const WINDOW_DAYS: Record<string, number> = {
  'one-time': 365 * 3,
  daily: 30,
  weekly: 90,
  biweekly: 90,
  triweekly: 90,
  monthly: 365,
  yearly: 365 * 3,
}

const toDateStr = (d: Date) => d.toISOString().split('T')[0]

function generateDates(task: any, fromDate: Date, toDate: Date): string[] {
  const dates: string[] = []
  if (task.frequency === 'one-time') {
    if (new Date(task.start_date) <= toDate) dates.push(task.start_date)
    return dates
  }
  const current = new Date(fromDate)
  while (current <= toDate) {
    const dateStr = toDateStr(current)
    if (task.frequency === 'daily') {
      dates.push(dateStr)
    } else if (task.frequency === 'weekly') {
      if (current.getUTCDay() === task.frequency_day) dates.push(dateStr)
    } else if (task.frequency === 'biweekly' || task.frequency === 'triweekly') {
      if (current.getUTCDay() === task.frequency_day) {
        const interval = task.frequency === 'biweekly' ? 2 : 3
        const daysSinceStart = Math.floor((current.getTime() - new Date(task.start_date).getTime()) / 86400000)
        const weeksSinceStart = Math.floor(daysSinceStart / 7)
        if (weeksSinceStart >= 0 && weeksSinceStart % interval === 0) dates.push(dateStr)
      }
    } else if (task.frequency === 'monthly') {
      if (current.getUTCDate() === task.frequency_day) dates.push(dateStr)
    } else if (task.frequency === 'yearly') {
      const [, m, d] = dateStr.split('-').map(Number)
      if (m === task.frequency_month && d === task.frequency_day) dates.push(dateStr)
    }
    current.setUTCDate(current.getUTCDate() + 1)
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

    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('pm_tasks')
      .select('*')
      .eq('is_active', true)

    if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 })
    if (!tasks || tasks.length === 0) return NextResponse.json({ message: 'Tidak ada task aktif' })

    // "Hari ini" menurut WIB, disimpan sebagai tanggal UTC murni
    const wib = new Date(Date.now() + 7 * 3600 * 1000)
    const today = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()))

    const rows: any[] = []
    const now = new Date().toISOString()

    for (const task of tasks) {
      const windowEnd = new Date(today)
      windowEnd.setUTCDate(windowEnd.getUTCDate() + (WINDOW_DAYS[task.frequency] ?? 30))

      const startFrom = new Date(Math.max(today.getTime(), new Date(task.start_date).getTime()))
      const endAt = task.end_date
        ? new Date(Math.min(windowEnd.getTime(), new Date(task.end_date).getTime()))
        : windowEnd

      for (const date of generateDates(task, startFrom, endAt)) {
        rows.push({
          task_id: task.id,
          scheduled_date: date,
          status: 'pending',
          due_date: task.due_date ?? null,
          created_at: now,
          source: 'manual',
        })
      }
    }

    // Batch upsert, 500 baris per request
    let inserted = 0
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await supabaseAdmin
        .from('pm_task_instances')
        .upsert(rows.slice(i, i + 500), {
          onConflict: 'task_id,scheduled_date',
          ignoreDuplicates: true,
        })
        .select('id') // hanya baris yang benar-benar baru

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      inserted += data?.length ?? 0
    }

    return NextResponse.json({
      success: true,
      message: `${inserted} instance baru ditambahkan (${rows.length - inserted} sudah ada, dilewati)`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}