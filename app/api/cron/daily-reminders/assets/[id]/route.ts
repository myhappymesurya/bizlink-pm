import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, reason, expired_date } = await request.json()
    const asset_id = params.id

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current asset data
    const { data: currentAsset } = await supabase
      .from('assets')
      .select('status, expired_date, asset_type')
      .eq('id', asset_id)
      .single()

    if (!currentAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Update asset status
    const updateData: any = { status }
    if (expired_date) {
      updateData.expired_date = expired_date
    }

    const { error: updateError } = await supabase
      .from('assets')
      .update(updateData)
      .eq('id', asset_id)

    if (updateError) throw updateError

    // Record maintenance history
    const { error: historyError } = await supabase
      .from('asset_maintenance_history')
      .insert({
        asset_id,
        old_status: currentAsset.status,
        new_status: status,
        expired_date_old: currentAsset.expired_date,
        expired_date_new: expired_date || currentAsset.expired_date,
        reason,
        updated_by: user.id
      })

    if (historyError) throw historyError

    // Record activity log
    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'status_change',
        entity_type: 'asset',
        entity_id: asset_id,
        old_value: { status: currentAsset.status, expired_date: currentAsset.expired_date },
        new_value: { status, expired_date: expired_date || currentAsset.expired_date },
        description: `Asset ${asset_id} status changed from ${currentAsset.status} to ${status}. Reason: ${reason}`
      })

    if (activityError) throw activityError

    return NextResponse.json({
      success: true,
      message: 'Asset status updated',
      asset_id
    })
  } catch (error) {
    console.error('Error updating asset status:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}