// lib/telegram.ts
// HANYA untuk sisi server (API route / cron).
// Jangan di-import dari file yang diawali 'use client'.

const MAX_LEN = 4000 // batas Telegram 4096, sisakan ruang aman

// Pesan memakai format HTML sederhana, jadi karakter < > & dari data
// (judul tugas, catatan teknisi) harus diamankan dulu.
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Mengirim pesan ke grup Telegram. TIDAK PERNAH melempar error,
// supaya kegagalan notifikasi tidak menggagalkan proses utama.
export async function sendTelegram(
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.error('TELEGRAM: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diisi')
    return { ok: false, error: 'Env Telegram belum diisi' }
  }

  // Pesan panjang dipecah per baris supaya tidak melewati batas Telegram.
  const chunks: string[] = []
  let rest = html
  while (rest.length > MAX_LEN) {
    let cut = rest.lastIndexOf('\n', MAX_LEN)
    if (cut <= 0) cut = MAX_LEN
    chunks.push(rest.slice(0, cut))
    rest = rest.slice(cut).replace(/^\n/, '')
  }
  chunks.push(rest)

  for (const chunk of chunks) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        console.error('TELEGRAM gagal kirim:', res.status, body)
        return { ok: false, error: `Telegram ${res.status}: ${body}` }
      }
    } catch (e: any) {
      console.error('TELEGRAM error jaringan:', e?.message)
      return { ok: false, error: e?.message || 'Gagal terhubung ke Telegram' }
    }
  }

  return { ok: true }
}