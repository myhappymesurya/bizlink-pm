import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activityLog'

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

    const { data: current, error: fetchError } = await supabase
      .from('equipment_status')
      .select('started_at, started_by, checklist_data, measurements_data')
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

    const { error: insertError } = await supabase.from('running_hours_logs').insert({
      equipment_type,
      equipment_name,
      tanggal: now.toISOString().split('T')[0],
      phase1_at: current.started_at,
      phase2_at: now.toISOString(),
      checklist: current.checklist_data,
      measurements: current.measurements_data || {},
      user_id: user.id,
      duration_minutes: durationMinutes,
      notes: `Durasi: ${durationHours.toFixed(2)} jam (${durationMinutes} menit)`,
      created_at: now.toISOString()
    })

    if (insertError) {
      console.error('GAGAL INSERT running_hours_logs:', insertError)
      return NextResponse.json(
        { error: 'Gagal menyimpan log durasi: ' + insertError.message },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from('equipment_status')
      .update({
        status: 'off',
        started_at: null,
        started_by: null,
        checklist_data: null,
        measurements_data: null,
        last_updated: now.toISOString()
      })
      .eq('equipment_type', equipment_type)
      .eq('equipment_name', equipment_name)

    if (updateError) {
      console.error('GAGAL UPDATE equipment_status ke OFF:', updateError)
      return NextResponse.json(
        { error: 'Log tersimpan tapi gagal update status mesin: ' + updateError.message },
        { status: 500 }
      )
    }
    await logActivity(supabase, {
      action: 'update',
      entity_type: 'equipment_status',
      entity_id: `${equipment_type}__${equipment_name}`,
      old_value: { status: 'on', started_at: current.started_at },
      new_value: { status: 'off', duration_minutes: durationMinutes },
    })
    return NextResponse.json({
      success: true,
      duration_hours: durationHours.toFixed(2),
      duration_minutes: durationMinutes
    })
  } catch (err: any) {
    console.error('UNCAUGHT ERROR /api/equipment/stop:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}