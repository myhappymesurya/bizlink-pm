import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendTelegram, escapeHtml } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Tanggal menurut WIB (UTC+7), format YYYY-MM-DD. offsetDays: -7 = 7 hari lalu
function wibDateStr(offsetDays = 0): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

function fmtLong(d: string): string {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function fmtShort(d: string): string {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

export async function GET(request: NextRequest) {
  // Hanya Vercel Cron (atau yang tahu CRON_SECRET) yang boleh memanggil
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = wibDateStr(0)
    const weekAgo = wibDateStr(-7)

    const { data: todayData, error: e1 } = await supabaseAdmin
      .from('pm_task_instances')
      .select('status, pm_tasks(title)')
      .eq('scheduled_date', today)
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

    const { data: lateData, error: e2 } = await supabaseAdmin
      .from('pm_task_instances')
      .select('scheduled_date, pm_tasks(title)')
      .eq('status', 'pending')
      .lt('scheduled_date', today)
      .gte('scheduled_date', weekAgo)
      .order('scheduled_date', { ascending: true })
      .limit(20)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    const todayRows = (todayData || []) as any[]
    const lateRows = (lateData || []) as any[]

    const pending = todayRows.filter(r => r.status === 'pending')
    const doneCount = todayRows.filter(r => r.status === 'completed').length

    let text = `☀️ <b>Tugas hari ini</b>\n${fmtLong(today)}\n`

    if (todayRows.length === 0) {
      text += `\nTidak ada tugas terjadwal hari ini.`
    } else {
      text += `\n<b>Yang harus dikerjakan (${pending.length}):</b>\n`
      text += pending.length === 0
        ? `Semua tugas hari ini sudah selesai ✅`
        : pending
            .map((r, i) => `${i + 1}. ${escapeHtml(r.pm_tasks?.title || '(tugas dihapus)')}`)
            .join('\n')
      if (doneCount > 0) text += `\n\nSudah selesai: ${doneCount}`
    }

    if (lateRows.length > 0) {
      text += `\n\n⚠️ <b>Belum selesai dari hari sebelumnya (${lateRows.length}):</b>\n`
      text += lateRows
        .map(r => `• ${escapeHtml(r.pm_tasks?.title || '(tugas dihapus)')} (${fmtShort(r.scheduled_date)})`)
        .join('\n')
    }

    const result = await sendTelegram(text)
    return NextResponse.json({
      ok: result.ok,
      error: result.error,
      hariIni: todayRows.length,
      terlambat: lateRows.length,
    })
  } catch (err: any) {
    console.error('CRON morning-tasks ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}