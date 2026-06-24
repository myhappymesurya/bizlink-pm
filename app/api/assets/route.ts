import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset_id = params.id

    // Get maintenance history
    const { data: history, error } = await supabase
      .from('asset_maintenance_history')
      .select(`
        id,
        old_status,
        new_status,
        expired_date_old,
        expired_date_new,
        reason,
        updated_by,
        created_at,
        profiles(full_name)
      `)
      .eq('asset_id', asset_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      asset_id,
      history: history || []
    })
  } catch (error) {
    console.error('Error fetching maintenance history:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}