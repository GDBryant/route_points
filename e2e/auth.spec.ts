import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'
import { readFileSync } from 'node:fs'

const fileEnv = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('=', 2) as [string, string]),
)
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY ?? fileEnv.VITE_SUPABASE_ANON_KEY
const SECRET = process.env.SUPABASE_SECRET_KEY!
const EMAIL = `e2e${Date.now()}@test.co`
const PASSWORD = 'e2e-password-123'

async function createUser(request: APIRequestContext) {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
    data: { email: EMAIL, password: PASSWORD, email_confirm: true },
  })
  expect(res.ok()).toBeTruthy()
}

async function sessionFor(page: Page) {
  const res = await page.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: ANON },
      data: { email: EMAIL, password: PASSWORD },
    },
  )
  expect(res.ok()).toBeTruthy()
  return res.json()
}

test('login, create adventure, share, guest join', async ({
  page,
  request,
  browser,
}) => {
  await createUser(request)
  const session = await sessionFor(page)

  await page.addInitScript(
    ([key, s]) => localStorage.setItem(key, JSON.stringify(s)),
    ['sb-127-auth-token', session],
  )

  await page.goto('/adventures')
  await expect(page.getByRole('heading', { name: 'Adventures' })).toBeVisible()

  await page.getByText('Start New Adventure').click()
  await page.getByPlaceholder('Adventure name').fill('E2E Dunes')
  await page.getByRole('button', { name: 'Create' }).click()
  await page.waitForURL(/\/a\//)

  await page.goto('/adventures')
  await expect(page.getByText('E2E Dunes')).toBeVisible()

  await page.getByRole('button', { name: 'Share' }).first().click()
  const wa = page.getByRole('link', { name: 'WhatsApp' })
  await expect(wa).toBeVisible()
  const href = await wa.getAttribute('href')
  const token = decodeURIComponent(href!).match(/\/join\/([0-9a-f-]+)/)![1]

  const guest = await browser.newContext()
  const guestPage = await guest.newPage()
  await guestPage.goto(`/join/${token}`)
  await expect(
    guestPage.getByRole('heading', { name: 'E2E Dunes' }),
  ).toBeVisible()
  await expect(guestPage.getByText('View as guest')).toBeVisible()
  await guest.close()
})
