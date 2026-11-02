'use client'
import { useState } from 'react'

const CATEGORIES = [
  'Listrik',
  'AC / Pendingin',
  'Air / Plumbing',
  'Kebersihan',
  'Bangunan / Furniture',
  'Lainnya',
]

const MAX_SIDE = 1280
const TARGET_BYTES = 1.5 * 1024 * 1024

// Kecilkan foto di HP pelapor sebelum dikirim
async function compressImage(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Foto tidak bisa dibaca'))
      i.src = url
    })
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Browser tidak mendukung pengolahan foto')
    ctx.drawImage(img, 0, 0, w, h)

    let quality = 0.8
    let blob: Blob | null = null
    while (quality >= 0.4) {
      blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality))
      if (blob && blob.size <= TARGET_BYTES) break
      quality -= 0.1
    }
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('Foto terlalu besar')
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function FacilityRequestPage() {
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('') // kolom jebakan robot
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  function removePhoto() {
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(null)
    setPreview(null)
  }

  function resetForm() {
    setName(''); setDepartment(''); setLocation(''); setCategory('')
    setDescription(''); setWebsite(''); removePhoto()
    setError(''); setDone(false)
  }

  const canSubmit =
    name.trim() && location.trim() && category && description.trim() && !sending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('requester_name', name)
      fd.append('department', department)
      fd.append('location', location)
      fd.append('category', category)
      fd.append('description', description)
      fd.append('website', website)
      if (photo) {
        let small: File
        try {
          small = await compressImage(photo)
        } catch {
          setError('Foto tidak bisa diproses. Coba foto lain, atau kirim tanpa foto.')
          setSending(false)
          return
        }
        fd.append('photo', small)
      }
      const res = await fetch('/api/facility-request', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Gagal mengirim laporan. Coba lagi.')
      } else {
        setDone(true)
      }
    } catch {
      setError('Koneksi bermasalah. Periksa internet kamu lalu coba lagi.')
    }
    setSending(false)
  }

  const label: React.CSSProperties = {
    display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--primary)',
  }
  const input: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1px solid var(--border)',
    borderRadius: 6, fontSize: 16, boxSizing: 'border-box', background: 'white',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Header polos: tanpa menu */}
      <div style={{ background: 'var(--primary)', color: 'white', padding: '16px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>📋 BizLink PM</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Facility Support Request</div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>
        {done ? (
          <div style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 8, boxShadow: 'var(--shadow)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Laporan terkirim</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Terima kasih. Tim facility akan menindaklanjuti laporan kamu.
            </p>
            <button onClick={resetForm}
              style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Kirim laporan lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}
            style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 8, boxShadow: 'var(--shadow)' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Isi form di bawah untuk meminta bantuan tim facility. Tanda * wajib diisi.
            </p>

            {error && (
              <div style={{ background: '#fdecea', color: 'var(--danger)', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
                {error}
              </div>
            )}

            {/* Kolom jebakan robot: disembunyikan dari manusia */}
            <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
              <label>Website</label>
              <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Nama *</label>
              <input style={input} value={name} onChange={e => setName(e.target.value)} maxLength={100} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Departemen</label>
              <input style={input} value={department} onChange={e => setDepartment(e.target.value)} maxLength={100} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Lokasi *</label>
              <input style={input} value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Contoh: Gedung A, Lantai 2, dekat pantry" maxLength={150} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Kategori *</label>
              <select style={input} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">-- Pilih kategori --</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Deskripsi masalah *</label>
              <textarea style={{ ...input, resize: 'vertical' }} rows={4} value={description}
                onChange={e => setDescription(e.target.value)} maxLength={2000}
                placeholder="Jelaskan masalahnya, misalnya: lampu mati sejak pagi" />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={label}>Foto (opsional)</label>
              {preview ? (
                <div>
                  <img src={preview} alt="Pratinjau foto"
                    style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'white' }} />
                  <button type="button" onClick={removePhoto}
                    style={{ marginTop: 8, padding: '8px 14px', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                    Hapus foto
                  </button>
                </div>
              ) : (
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto} style={{ fontSize: 14 }} />
              )}
            </div>

            <button type="submit" disabled={!canSubmit}
              style={{
                width: '100%', padding: 14, border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600,
                background: canSubmit ? 'var(--primary)' : '#e0e0e0', color: 'white',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}>
              {sending ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}