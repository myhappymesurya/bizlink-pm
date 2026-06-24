import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const entity_type = searchParams.get('entity_type')
    const entity_id = searchParams.get('entity_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('activity_logs')
      .select(`
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_value,
        new_value,
        description,
        created_at,
        profiles(full_name)
      `, { count: 'exact' })

    // Apply filters if provided
    if (entity_type) {
      query = query.eq('entity_type', entity_type)
    }
    if (entity_id) {
      query = query.eq('entity_id', entity_id)
    }

    // Order and paginate
    const { data: logs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, entity_type, entity_id, old_value, new_value, description } = await request.json()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Insert activity log
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action,
        entity_type,
        entity_id,
        old_value,
        new_value,
        description
      })
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Activity log created',
      log: data?.[0]
    })
  } catch (error) {
    console.error('Error creating activity log:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}