import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {}
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { equipment_type, equipment_name } = await request.json()

    if (!equipment_type || !equipment_name) {
      return NextResponse.json({ error: 'equipment_type dan equipment_name wajib diisi' }, { status: 400 })
    }

    // Ambil data started_at untuk hitung durasi
    const { data: current, error: fetchError } = await supabase
      .from('equipment_status')
      .select('started_at, started_by, checklist_data')
      .eq('equipment_type', equipment_type)
      .eq('equipment_name', equipment_name)
      .eq('status', 'on')
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Mesin tidak dalam status ON' }, { status: 400 })
    }

    const now = new Date()
    const startedAt = new Date(current.started_at)
    const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000)
    const durationHours = durationMinutes / 60

    // Simpan ke running_hours_logs
    await supabase.from('running_hours_logs').insert({
      equipment_type,
      equipment_name,
      tanggal: now.toISOString().split('T')[0],
      phase1_at: current.started_at,
      phase2_at: now.toISOString(),
      checklist: current.checklist_data,
      user_id: user.id,
      notes: `Durasi: ${durationHours.toFixed(2)} jam (${durationMinutes} menit)`,
      created_at: now.toISOString()
    })

    // Reset status ke off
    await supabase
      .from('equipment_status')
      .update({
        status: 'off',
        started_at: null,
        started_by: null,
        checklist_data: null,
        last_updated: now.toISOString()
      })
      .eq('equipment_type', equipment_type)
      .eq('equipment_name', equipment_name)

    return NextResponse.json({ 
      success: true, 
      duration_hours: durationHours.toFixed(2),
      duration_minutes: durationMinutes
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}