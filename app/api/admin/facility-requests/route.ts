import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendTelegram, sendTelegramPhoto, escapeHtml } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Pastikan pemanggil adalah admin yang sah dan masih aktif
async function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .single()
  if (profile?.role !== 'admin' || profile?.is_active === false) return null
  return { id: data.user.id }
}

// "Hari ini" menurut WIB, format YYYY-MM-DD
function wibToday(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0]
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

// Daftar laporan + link foto sementara (berlaku 1 jam)
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const status = request.nextUrl.searchParams.get('status') || 'open'
    if (!['open', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('facility_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: status === 'open' })
      .limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data || []
    const paths = rows.map(r => r.photo_path).filter(Boolean) as string[]
    const urlMap: Record<string, string> = {}
    if (paths.length > 0) {
      const { data: signed } = await supabaseAdmin.storage
        .from('facility-photos')
        .createSignedUrls(paths, 3600)
      ;(signed || []).forEach(s => {
        if (s.path && s.signedUrl) urlMap[s.path] = s.signedUrl
      })
    }

    const counts: Record<string, number> = {}
    for (const s of ['open', 'approved', 'rejected']) {
      const { count } = await supabaseAdmin
        .from('facility_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', s)
      counts[s] = count ?? 0
    }

    return NextResponse.json({
      requests: rows.map(r => ({
        ...r,
        photo_url: r.photo_path ? urlMap[r.photo_path] || null : null,
      })),
      counts,
    })
  } catch (err: any) {
    console.error('ADMIN facility GET ERROR:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// Setujui (jadi Work Order) atau Tolak
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const id = body?.id
    const action = body?.action
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
    if (typeof id !== 'string' || !id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'id atau action tidak valid' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // ===== TOLAK =====
    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 })
      }
      const { data, error } = await supabaseAdmin
        .from('facility_requests')
        .update({ status: 'rejected', reject_reason: reason, reviewed_by: admin.id, reviewed_at: now })
        .eq('id', id)
        .eq('status', 'open')
        .select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Laporan sudah diproses atau tidak ditemukan' }, { status: 409 })
      }
      await supabaseAdmin.from('activity_logs').insert({
        user_id: admin.id,
        action: 'update',
        entity_type: 'facility_request',
        entity_id: id,
        old_value: { status: 'open' },
        new_value: { status: 'rejected', reject_reason: reason },
        created_at: now,
      })
      return NextResponse.json({ success: true })
    }

    // ===== SETUJUI =====
    // 1. "Klaim" dulu secara atomik: hanya satu admin yang bisa berhasil
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from('facility_requests')
      .update({ status: 'approved', reviewed_by: admin.id, reviewed_at: now })
      .eq('id', id)
      .eq('status', 'open')
      .select('*')
    if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 })
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: 'Laporan sudah diproses atau tidak ditemukan' }, { status: 409 })
    }
    const req = claimed[0]

    // Kalau langkah berikutnya gagal, kembalikan laporan ke status menunggu
    const revert = async () => {
      await supabaseAdmin
        .from('facility_requests')
        .update({ status: 'open', reviewed_by: null, reviewed_at: null, work_order_task_id: null })
        .eq('id', id)
    }

    const today = wibToday()
    const title = `[Laporan] ${req.category} - ${req.location}`.slice(0, 200)
    const description =
      `${req.description} (Pelapor: ${req.requester_name}` +
      `${req.department ? `, ${req.department}` : ''})`

    // 2. Buat tugas sekali jalan
    const { data: task, error: taskErr } = await supabaseAdmin
      .from('pm_tasks')
      .insert({
        title,
        description,
        frequency: 'one-time',
        frequency_day: null,
        frequency_month: null,
        start_date: today,
        end_date: null,
        due_date: null,
        created_by: admin.id,
      })
      .select('id')
      .single()
    if (taskErr || !task) {
      console.error('FACILITY approve: gagal buat pm_tasks:', taskErr)
      await revert()
      return NextResponse.json({ error: 'Gagal membuat Work Order' }, { status: 500 })
    }

    // 3. Buat instance untuk hari ini (inilah yang muncul di PM Calendar & Work Orders)
    const { error: instErr } = await supabaseAdmin.from('pm_task_instances').insert({
      task_id: task.id,
      scheduled_date: today,
      status: 'pending',
      due_date: null,
      created_at: now,
      source: 'manual',
    })
    if (instErr) {
      console.error('FACILITY approve: gagal buat pm_task_instances:', instErr)
      await supabaseAdmin.from('pm_tasks').delete().eq('id', task.id)
      await revert()
      return NextResponse.json({ error: 'Gagal membuat Work Order' }, { status: 500 })
    }

    // 4. Catat tautan ke Work Order
    await supabaseAdmin
      .from('facility_requests')
      .update({ work_order_task_id: String(task.id) })
      .eq('id', id)

    await supabaseAdmin.from('activity_logs').insert({
      user_id: admin.id,
      action: 'update',
      entity_type: 'facility_request',
      entity_id: id,
      old_value: { status: 'open' },
      new_value: { status: 'approved', task_id: String(task.id) },
      created_at: now,
    })

    // 5. Kabari grup teknisi (Facility Daily Task); tidak pernah melempar error
    await sendTelegram(
      `🆕 <b>Tugas baru</b>\n` +
      `<b>${escapeHtml(title)}</b>\n` +
      `${escapeHtml(req.description)}\n` +
      `Lokasi: ${escapeHtml(req.location)}\n` +
      `Pelapor: ${escapeHtml(req.requester_name)}` +
      `${req.department ? ` (${escapeHtml(req.department)})` : ''}\n` +
      `Jadwal: ${fmtDate(today)}`
    )
    
    // 6. Kirim foto ke grup teknisi (kalau ada); tidak pernah melempar error
    if (req.photo_path) {
      const { data: file, error: dlErr } = await supabaseAdmin.storage
        .from('facility-photos')
        .download(req.photo_path)
      if (dlErr || !file) {
        console.error('FACILITY approve: gagal ambil foto:', dlErr)
      } else {
        await sendTelegramPhoto(
          file,
          req.photo_path.split('/').pop() || 'foto.jpg',
          `📷 Foto laporan: ${escapeHtml(title)}`
        )
      }
    }  

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('ADMIN facility POST ERROR:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}