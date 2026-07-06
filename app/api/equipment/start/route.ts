import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}