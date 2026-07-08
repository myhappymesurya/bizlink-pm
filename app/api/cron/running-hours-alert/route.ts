import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verifikasi request dari Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cek semua mesin yang status ON lebih dari 12 jam
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

    const { data: overdueEquipment, error } = await supabaseAdmin
      .from('equipment_status')
      .select('equipment_type, equipment_name, started_at, started_by')
      .eq('status', 'on')
      .lt('started_at', twelveHoursAgo)

    if (error) {
      console.error('Error fetching equipment status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!overdueEquipment || overdueEquipment.length === 0) {
      return NextResponse.json({ message: 'Tidak ada mesin yang melebihi 12 jam' })
    }

    // Ambil email admin dari profiles
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (!admins || admins.length === 0) {
      return NextResponse.json({ error: 'Tidak ada admin ditemukan' }, { status: 500 })
    }

    const adminIds = admins.map(a => a.id)
    const { data: adminUsers } = await supabaseAdmin.auth.admin.listUsers()
    const adminEmails = adminUsers.users
      .filter(u => adminIds.includes(u.id))
      .map(u => u.email)
      .filter(Boolean)

    if (adminEmails.length === 0) {
      return NextResponse.json({ error: 'Tidak ada email admin ditemukan' }, { status: 500 })
    }

    // Format daftar mesin overdue
    const equipmentList = overdueEquipment.map(eq => {
      const startedAt = new Date(eq.started_at)
      const durationHours = Math.floor((Date.now() - startedAt.getTime()) / 3600000)
      const durationMinutes = Math.floor(((Date.now() - startedAt.getTime()) % 3600000) / 60000)
      return `• ${eq.equipment_name} (${eq.equipment_type}) — sudah berjalan ${durationHours} jam ${durationMinutes} menit sejak ${startedAt.toLocaleString('id-ID')}`
    }).join('\n')

    // Kirim email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"BizLink PM" <${process.env.GMAIL_USER}>`,
      to: adminEmails.join(', '),
      subject: `⚠️ Alert: ${overdueEquipment.length} Mesin Running >12 Jam`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #e74c3c;">⚠️ Peringatan Running Hours</h2>
          <p>Mesin berikut sudah berjalan lebih dari 12 jam dan belum dimatikan:</p>
          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <pre style="margin: 0; font-size: 14px; white-space: pre-wrap;">${equipmentList}</pre>
          </div>
          <p>Segera periksa dan matikan mesin yang tidak diperlukan.</p>
          <a href="https://bizlink-pm.vercel.app/running-hours" 
            style="display: inline-block; background: #0a3047; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Buka Running Hours Monitor
          </a>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 16px;">
            Email ini dikirim otomatis setiap jam oleh sistem BizLink PM.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ 
      success: true, 
      message: `Alert terkirim untuk ${overdueEquipment.length} mesin`,
      equipment: overdueEquipment.map(e => e.equipment_name)
    })
  } catch (err: any) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}