import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramAdmin, escapeHtml } from '@/lib/telegram'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CATEGORIES = [
  'Listrik',
  'AC / Pendingin',
  'Air / Plumbing',
  'Kebersihan',
  'Bangunan / Furniture',
  'Lainnya',
]

const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // 2 MB
const MAX_PER_WINDOW = 20               // maksimal 20 laporan ...
const WINDOW_MS = 10 * 60 * 1000        // ... per 10 menit (seluruh sistem)

// Cek isi file yang sebenarnya, bukan percaya nama/tipe dari pengirim
function detectImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' }
  }
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' }
  }
  return null
}

function clean(v: FormDataEntryValue | null, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

export async function POST(request: NextRequest) {
  try {
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Data yang dikirim tidak valid' }, { status: 400 })
    }

    // Kolom jebakan: manusia tidak melihatnya, robot spam biasanya mengisinya.
    // Kalau terisi, pura-pura sukses tapi tidak disimpan.
    if (clean(form.get('website'), 100) !== '') {
      return NextResponse.json({ success: true })
    }

    const requester_name = clean(form.get('requester_name'), 100)
    const department = clean(form.get('department'), 100)
    const location = clean(form.get('location'), 150)
    const category = clean(form.get('category'), 50)
    const description = clean(form.get('description'), 2000)

    if (!requester_name || !location || !category || !description) {
      return NextResponse.json(
        { error: 'Nama, lokasi, kategori, dan deskripsi wajib diisi' },
        { status: 400 }
      )
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 })
    }

    // Rem darurat anti-spam
    const since = new Date(Date.now() - WINDOW_MS).toISOString()
    const { count } = await supabaseAdmin
      .from('facility_requests')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
    if ((count ?? 0) >= MAX_PER_WINDOW) {
      return NextResponse.json(
        { error: 'Terlalu banyak laporan masuk. Coba lagi beberapa menit lagi.' },
        { status: 429 }
      )
    }

    // Foto (opsional)
    let photo_path: string | null = null
    const photo = form.get('photo')
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > MAX_PHOTO_BYTES) {
        return NextResponse.json({ error: 'Ukuran foto maksimal 2 MB' }, { status: 400 })
      }
      const buf = Buffer.from(await photo.arrayBuffer())
      const kind = detectImage(buf)
      if (!kind) {
        return NextResponse.json({ error: 'Foto harus berformat JPG, PNG, atau WebP' }, { status: 400 })
      }
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${kind.ext}`
      const { error: uploadError } = await supabaseAdmin.storage
        .from('facility-photos')
        .upload(path, buf, { contentType: kind.mime, upsert: false })
      if (uploadError) {
        console.error('FACILITY upload foto gagal:', uploadError)
        return NextResponse.json({ error: 'Gagal mengunggah foto' }, { status: 500 })
      }
      photo_path = path
    }

    const { error: insertError } = await supabaseAdmin.from('facility_requests').insert({
      requester_name,
      department: department || null,
      location,
      category,
      description,
      photo_path,
    })

    if (insertError) {
      console.error('FACILITY insert gagal:', insertError)
      // Hapus foto yang sudah terlanjur terunggah supaya tidak jadi sampah
      if (photo_path) {
        await supabaseAdmin.storage.from('facility-photos').remove([photo_path])
      }
            return NextResponse.json({ error: 'Gagal menyimpan laporan' }, { status: 500 })
    }

    // Kabari grup admin (tidak pernah melempar error)
    const shortDesc = description.length > 300 ? description.slice(0, 300) + '...' : description
    await sendTelegramAdmin(
      `🆕 <b>Laporan Facility Baru</b>\n` +
      `Kategori: <b>${escapeHtml(category)}</b>\n` +
      `Lokasi: ${escapeHtml(location)}\n` +
      `Pelapor: ${escapeHtml(requester_name)}` +
      (department ? ` (${escapeHtml(department)})` : '') +
      `\nFoto: ${photo_path ? 'ada' : 'tidak ada'}\n\n` +
      `${escapeHtml(shortDesc)}\n\n` +
      `Menunggu persetujuan admin.`
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('FACILITY ERROR:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}