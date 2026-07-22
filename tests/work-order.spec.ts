import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL!
const TEST_PASSWORD = process.env.TEST_PASSWORD!
const TASK_TITLE = `TEST-WO - Overdue Task ${Date.now()}`

function isoDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/, { timeout: 10000 })
})

test('one-time task with past start_date and due_date generates instance and shows as overdue', async ({ page }) => {
  const startDate = isoDate(5) // 5 hari lalu
  const dueDate = isoDate(1)   // 1 hari lalu — sudah lewat, harus overdue

  // 1. Buat task one-time lewat Kelola Tugas
  await page.goto('/pm-calendar/manage')
  await page.click('text=+ Tambah Tugas')
  await page.fill('input[placeholder*="Cek kompressor"]', TASK_TITLE)

  // Frequency sudah default 'one-time', pastikan field start_date & due_date terisi
  await page.fill('input[type="date"] >> nth=0', startDate)
  // Field due_date cuma muncul saat frequency one-time, cari input date kedua yang visible
  const dueDateInput = page.locator('input[type="date"]').nth(1)
  await dueDateInput.fill(dueDate)

  await page.click('text=Simpan Tugas')
  await expect(page.locator(`text=${TASK_TITLE}`)).toBeVisible({ timeout: 5000 })

  // 2. Generate instances
  await page.click('text=🔄 Generate Instances')
  await expect(page.locator('text=/instances di-generate/')).toBeVisible({ timeout: 10000 })

  // 3. Buka halaman Work Orders, cek muncul di Overdue
  await page.goto('/work-orders')
  await page.click('text=Overdue')
  const targetRow = page.locator('div[style*="border-left"]', { hasText: TASK_TITLE })
  await expect(targetRow).toBeVisible({ timeout: 5000 })
  await expect(targetRow.locator('text=⚠ Overdue')).toBeVisible()

  // 4. Cleanup: hapus task dari Kelola Tugas (instance ikut terhapus by cascade sesuai UI)
  await page.goto('/pm-calendar/manage')
  const row = page.locator('tr', { hasText: TASK_TITLE })
  page.once('dialog', dialog => dialog.accept())
  await row.locator('text=Hapus').click()
  await expect(page.locator(`text=${TASK_TITLE}`)).not.toBeVisible({ timeout: 5000 })
})

test('date range filter narrows Work Orders list correctly', async ({ page }) => {
  await page.goto('/work-orders')

  // Set range yang pasti tidak mencakup data manapun (jauh di masa depan)
  const farFuture = isoDate(-3650) // 10 tahun ke depan
  await page.fill('input[type="date"] >> nth=0', farFuture)
  await page.fill('input[type="date"] >> nth=1', farFuture)

  // Harus tidak ada WO yang match, pesan kosong muncul
  await expect(page.locator('text=/Tidak ada Work Order/')).toBeVisible({ timeout: 5000 })

  // Reset filter, list harus muncul lagi (asumsikan ada minimal 1 WO existing)
  await page.click('text=Reset Filter')
  await expect(page.locator('text=/Tidak ada Work Order/')).not.toBeVisible({ timeout: 5000 })
})
