import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logActivity } from '@/lib/activityLog'
import { isMeasurementComplete } from '@/lib/equipmentMeasurements'

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

    const { equipment_type, equipment_name, checklist_data } = await request.json()

    if (!equipment_type || !equipment_name) {
      return NextResponse.json({ error: 'equipment_type dan equipment_name wajib diisi' }, { status: 400 })
    }

    if (!checklist_data || Object.keys(checklist_data).length === 0) {
      return NextResponse.json({ error: 'Checklist wajib diisi sebelum nyalakan mesin' }, { status: 400 })
    }
    
    // Aturan global: mesin ON milik siapa pun harus sudah lengkap measurement-nya
    const { data: allRunning, error: runningError } = await supabase
      .from('equipment_status')
      .select('equipment_type, equipment_name, measurements_data, started_by')
      .eq('status', 'on')

    if (runningError) {
      return NextResponse.json(
        { error: 'Gagal memeriksa mesin yang sedang ON: ' + runningError.message },
        { status: 500 }
      )
    }

    const unfinished = (allRunning || []).find(
      m => !isMeasurementComplete(m.equipment_type, m.measurements_data)
    )
    if (unfinished) {
      let owner = 'teknisi lain'
      if (unfinished.started_by === user.id) {
        owner = 'kamu'
      } else if (unfinished.started_by) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', unfinished.started_by)
          .single()
        if (ownerProfile?.full_name) owner = ownerProfile.full_name
      }
      return NextResponse.json(
        {
          error:
            `Measurement ${unfinished.equipment_name} (dinyalakan oleh ${owner}) belum diisi. ` +
            `Isi lewat tombol Measurements di kartu mesin itu, baru nyalakan mesin lain.`,
        },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('equipment_status')
      .update({
        status: 'on',
        started_at: new Date().toISOString(),
        started_by: user.id,
        checklist_data,
        last_updated: new Date().toISOString()
      })
      .eq('equipment_type', equipment_type)
      .eq('equipment_name', equipment_name)
      .eq('status', 'off')

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await logActivity(supabase, {
      action: 'update',
      entity_type: 'equipment_status',
      entity_id: `${equipment_type}__${equipment_name}`,
      old_value: { status: 'off' },
      new_value: { status: 'on', checklist_data },
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}