import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Verifikasi request ini benar dari Vercel Cron, bukan sembarang orang
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0]

    // Ambil semua pm_schedules yang overdue atau belum pernah dicek
    const { data: schedules } = await supabaseAdmin
      .from('pm_schedules')
      .select('asset_id, sub_category, next_due_date')
      .eq('is_active', true)
      .or(`next_due_date.is.null,next_due_date.lt.${todayStr}`)

    const overdueList = schedules || []

    if (overdueList.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada PM overdue, email tidak dikirim' })
    }

    // Kelompokkan per sub_category untuk ringkasan
    const byCategory: Record<string, number> = {}
    overdueList.forEach(s => {
      byCategory[s.sub_category] = (byCategory[s.sub_category] || 0) + 1
    })

    // Ambil semua admin
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (!admins || admins.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada admin aktif untuk dikirimi email' })
    }

    // Resolve email dari auth.users (profiles tidak simpan email)
    const adminEmails: string[] = []
    for (const admin of admins) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(admin.id)
      if (userData?.user?.email) adminEmails.push(userData.user.email)
    }

    if (adminEmails.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada email admin ditemukan' })
    }

    // Susun isi email
    const categoryRows = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${cat}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${count}</td></tr>`)
      .join('')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"BizLink PM" <${process.env.GMAIL_USER}>`,
      to: adminEmails.join(','),
      subject: `⚠️ ${overdueList.length} PM Overdue — BizLink PM ${todayStr}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px;">
          <h2 style="color: #0a3047;">Reminder PM Overdue</h2>
          <p>Total <strong>${overdueList.length} unit</strong> belum di-checklist atau sudah melewati jadwal:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead>
              <tr style="background:#f5f6f7;">
                <th style="padding:6px 12px;text-align:left;">Kategori</th>
                <th style="padding:6px 12px;text-align:right;">Jumlah</th>
              </tr>
            </thead>
            <tbody>${categoryRows}</tbody>
          </table>
          <a href="https://bizlink-pm.vercel.app/pm-calendar/tracker" style="display:inline-block;background:#0a3047;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">
            Lihat Detail di Tracker
          </a>
          <p style="color:#7f8c8d;font-size:12px;margin-top:20px;">Email otomatis harian dari BizLink PM System.</p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: `Email terkirim ke ${adminEmails.length} admin, ${overdueList.length} unit overdue`
    })
  } catch (err: any) {
    console.error('CRON daily-reminders ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}