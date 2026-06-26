import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const asset_id = params.id

    console.log('1️⃣ RECEIVED:', { asset_id, body })

    // Update with explicit logging
    const { data, error } = await supabase
      .from('assets')
      .update({
        status: body.status,
        expired_date: body.expired_date
      })
      .eq('id', asset_id)
      .select()

    console.log('2️⃣ UPDATE RESPONSE:', { data, error })

    if (error) {
      console.error('3️⃣ ERROR:', error.code, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('4️⃣ SUCCESS - Rows updated:', data?.length)
    
    return NextResponse.json({ success: true, updated: data })

  } catch (e) {
    console.error('5️⃣ EXCEPTION:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}