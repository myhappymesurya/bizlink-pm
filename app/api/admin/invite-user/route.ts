import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // 0. Cek pemanggil API ini harus admin yang sah
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token)
    if (callerError || !callerData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang bisa mengundang user' },
        { status: 403 }
      )
    }

    // 1. Validasi input
    const { email, full_name, role } = await request.json()

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: 'Email, nama, dan role wajib diisi' },
        { status: 400 }
      )
    }

    const validRoles = ['admin', 'supervisor', 'technician', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role tidak valid' },
        { status: 400 }
      )
    }

    // 2. Create user di Supabase Auth
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: createError?.message || 'Gagal membuat user' },
        { status: 400 }
      )
    }

    // 3. Insert ke profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name,
        role,
        must_change_password: true,
      })

    if (profileError) {
      const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      if (rollbackError) {
        console.error('ROLLBACK GAGAL:', rollbackError.message)
      }
      return NextResponse.json(
        { error: 'Gagal menyimpan profile: ' + profileError.message },
        { status: 400 }
      )
    }

    // 4. Kirim email berisi password sementara langsung (bukan link) via Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"BizLink PM" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Undangan Akses BizLink PM System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px;">
          <h2 style="color: #0a3047;">Selamat datang di BizLink PM</h2>
          <p>Halo ${full_name},</p>
          <p>Anda diundang sebagai <strong>${role}</strong> di sistem BizLink PM.</p>
          <p>Berikut kredensial login Anda:</p>
          <div style="background: #f5f6f7; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 0;"><strong>Password sementara:</strong> <code style="background: white; padding: 2px 8px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          <p>Silakan login menggunakan kredensial di atas. Anda akan diminta membuat password baru saat login pertama kali.</p>
          <a href="https://bizlink-pm.vercel.app/login" style="display: inline-block; background: #0a3047; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Login Sekarang
          </a>
          <p style="color: #7f8c8d; font-size: 12px;">Jangan bagikan password ini ke siapapun. Kalau ada kendala, hubungi admin.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, message: 'User berhasil diundang' })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}