import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendTelegram, escapeHtml } from '@/lib/telegram'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FREQ_LABEL: Record<string, string> = {
  'one-time': 'Sekali',
  daily: 'Harian',
  weekly: 'Mingguan',
  biweekly: '2 Minggu Sekali',
  triweekly: '3 Minggu Sekali',
  monthly: 'Bulanan',
  quarterly: '3 Bulanan',
  semiannual: '6 Bulanan',
  yearly: 'Tahunan',
}

// "2026-10-29" -> "Kamis, 29 Oktober 2026"
function fmtDate(d: string | null | undefined): string {
  if (!d) return '-'
  return new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

const RECENT_MS = 10 * 60 * 1000 // hanya peristiwa 10 menit terakhir yang boleh dinotifikasi

export async function POST(request: NextRequest) {
  try {
    // 1. Pastikan pemanggil adalah user yang sudah login
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabaseAdmin.auth.getUser(token)
    const user = userData?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Validasi input
    const { event, id } = await request.json()
    if (!id || !['completed', 'created'].includes(event)) {
      return NextResponse.json({ error: 'event atau id tidak valid' }, { status: 400 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    const who = escapeHtml(profile?.full_name || 'Seseorang')

    let text = ''

    if (event === 'completed') {
      // id = id dari pm_task_instances
      const { data } = await supabaseAdmin
        .from('pm_task_instances')
        .select('status, notes, scheduled_date, completed_at, pm_tasks(title)')
        .eq('id', id)
        .single()
      const inst = data as any

      if (!inst || inst.status !== 'completed' || !inst.completed_at) {
        return NextResponse.json({ ok: false, skipped: 'Tugas belum berstatus selesai' })
      }
      if (Date.now() - new Date(inst.completed_at).getTime() > RECENT_MS) {
        return NextResponse.json({ ok: false, skipped: 'Penyelesaian sudah lebih dari 10 menit lalu' })
      }

      const title = escapeHtml(inst.pm_tasks?.title || '(tugas dihapus)')
      text =
        `✅ <b>Tugas selesai</b>\n` +
        `<b>${title}</b>\n` +
        `Jadwal: ${fmtDate(inst.scheduled_date)}\n` +
        `Oleh: ${who}` +
        (inst.notes ? `\nCatatan: ${escapeHtml(inst.notes)}` : '')
    } else {
      // event === 'created', id = id dari pm_tasks
      const { data: task } = await supabaseAdmin
        .from('pm_tasks')
        .select('title, description, frequency, start_date, due_date, created_at')
        .eq('id', id)
        .single()

      if (!task) return NextResponse.json({ ok: false, skipped: 'Tugas tidak ditemukan' })
      if (Date.now() - new Date(task.created_at).getTime() > RECENT_MS) {
        return NextResponse.json({ ok: false, skipped: 'Tugas dibuat lebih dari 10 menit lalu' })
      }

      text =
        `🆕 <b>Tugas baru</b>\n` +
        `<b>${escapeHtml(task.title)}</b>\n` +
        (task.description ? `${escapeHtml(task.description)}\n` : '') +
        `Frekuensi: ${FREQ_LABEL[task.frequency] || task.frequency}\n` +
        `Mulai: ${fmtDate(task.start_date)}` +
        (task.due_date ? `\nTarget selesai: ${fmtDate(task.due_date)}` : '') +
        `\nDibuat oleh: ${who}`
    }

    const result = await sendTelegram(text)
    return NextResponse.json({ ok: result.ok, error: result.error })
  } catch (err: any) {
    console.error('NOTIFY task-update ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}