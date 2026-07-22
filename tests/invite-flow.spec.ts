import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const TEST_EMAIL = process.env.TEST_EMAIL!
const TEST_PASSWORD = process.env.TEST_PASSWORD!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Helper: login sebagai admin lewat client SDK (bukan UI), ambil access_token
// dipakai untuk panggil endpoint invite langsung tanpa lewat email sungguhan
async function getAdminAccessToken(): Promise<string> {
  const client = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder')
  const { data, error } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (error || !data.session) throw new Error('Gagal login admin untuk ambil token: ' + error?.message)
  return data.session.access_token
}

test.describe('Invite user endpoint', () => {
  let createdUserId: string | null = null
  const inviteEmail = `test-invite-${Date.now()}@bizlinkpm.local`

  test.afterEach(async () => {
    // Cleanup: hapus user test yang dibuat, apapun hasil test-nya
    if (createdUserId) {
      await supabaseAdmin.from('activity_logs').delete().eq('user_id', createdUserId)
      await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
      await supabaseAdmin.auth.admin.deleteUser(createdUserId)
      createdUserId = null
    }
  })

  test('invite creates user with must_change_password=true and sends email without error', async ({ request }) => {
    test.setTimeout(60000)
    const token = await getAdminAccessToken()

    const res = await request.post('/api/admin/invite-user', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        email: inviteEmail,
        full_name: 'Test Invite Automation',
        role: 'technician',
      },
    })

    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBeTruthy()

    // Ambil user yang baru dibuat untuk verifikasi & cleanup
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
    const created = userList.users.find(u => u.email === inviteEmail)
    expect(created).toBeTruthy()
    createdUserId = created!.id

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('must_change_password, role, full_name')
      .eq('id', createdUserId)
      .single()

    expect(profile?.must_change_password).toBe(true)
    expect(profile?.role).toBe('technician')
    expect(profile?.full_name).toBe('Test Invite Automation')
  })
})

test.describe('Forced password change on first login', () => {
  let createdUserId: string | null = null
  const flowEmail = `test-flow-${Date.now()}@bizlinkpm.local`
  const tempPassword = 'TempPass123!'
  const newPassword = 'NewSecurePass456!'

  test.beforeAll(async () => {
    // Buat user langsung via admin SDK, skip endpoint invite,
    // supaya kita tahu passwordnya tanpa perlu baca email sungguhan
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: flowEmail,
      password: tempPassword,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error('Gagal setup user test: ' + error?.message)
    createdUserId = data.user.id

    await supabaseAdmin.from('profiles').insert({
      id: createdUserId,
      full_name: 'Test Flow Automation',
      role: 'technician',
      must_change_password: true,
    })
  })

  test.afterAll(async () => {
    if (createdUserId) {
      await supabaseAdmin.from('activity_logs').delete().eq('user_id', createdUserId)
      await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
      await supabaseAdmin.auth.admin.deleteUser(createdUserId)
    }
  })

  test('user with must_change_password=true is redirected to change-password, then can login normally after', async ({ page }) => {
    // 1. Login pakai temp password
    await page.goto('/login')
    await page.fill('input[type="email"]', flowEmail)
    await page.fill('input[type="password"]', tempPassword)
    await page.click('button[type="submit"]')

    // 2. Harus diarahkan ke change-password, bukan dashboard
    await page.waitForURL(/auth\/change-password/, { timeout: 10000 })

    // 3. Isi password baru
    await page.fill('input[placeholder="Password baru"]', newPassword)
    await page.fill('input[placeholder="Konfirmasi password"]', newPassword)
    await page.click('text=Simpan Password')

    // 4. Harus masuk dashboard
    await page.waitForURL(/dashboard/, { timeout: 10000 })

    // 5. Logout, login ulang pakai password baru — TIDAK boleh diarahkan ke change-password lagi
    await page.goto('/login')
    // Pastikan session lama benar-benar habis sebelum login ulang
    await page.context().clearCookies()
    await page.goto('/login')
    await page.fill('input[type="email"]', flowEmail)
    await page.fill('input[type="password"]', newPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard/, { timeout: 10000 })

    expect(page.url()).toContain('/dashboard')
  })
})
