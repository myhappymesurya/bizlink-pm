import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      history: []
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}