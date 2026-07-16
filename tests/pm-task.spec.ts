import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL!
const TEST_PASSWORD = process.env.TEST_PASSWORD!
const TASK_TITLE = `TEST - Automated Task ${Date.now()}`

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/, { timeout: 10000 })
})

test('create, verify, and delete a PM task', async ({ page }) => {
  await page.goto('/pm-calendar/manage')

  // Buka form tambah tugas
  await page.click('text=+ Tambah Tugas')
  await page.fill('input[placeholder*="Cek kompressor"]', TASK_TITLE)
  await page.click('text=Simpan Tugas')

  // Verifikasi tugas muncul di daftar
  await expect(page.locator(`text=${TASK_TITLE}`)).toBeVisible({ timeout: 5000 })

  // Cari baris tugas ini, klik Hapus
  const row = page.locator('tr', { hasText: TASK_TITLE })
  page.once('dialog', dialog => dialog.accept())
  await row.locator('text=Hapus').click()

  // Verifikasi tugas hilang dari daftar
  await expect(page.locator(`text=${TASK_TITLE}`)).not.toBeVisible({ timeout: 5000 })
})