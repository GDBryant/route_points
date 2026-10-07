import { expect, test } from '@playwright/test'
import {
  createAdventure,
  createUser,
  shareTokenFor,
  signIn,
} from './helpers'

test('login, create adventure, share, guest join', async ({
  page,
  request,
  browser,
}) => {
  const email = `e2e${Date.now()}@test.co`
  await createUser(request, email)
  await signIn(page, email)

  await page.goto('/adventures')
  await expect(
    page.getByRole('heading', { name: 'Adventures' }),
  ).toBeVisible()

  await createAdventure(page, 'E2E Dunes')

  await page.goto('/adventures')
  await expect(page.getByText('E2E Dunes')).toBeVisible()

  const token = await shareTokenFor(page)

  const guest = await browser.newContext()
  const guestPage = await guest.newPage()
  await guestPage.goto(`/join/${token}`)
  await expect(
    guestPage.getByRole('heading', { name: 'E2E Dunes' }),
  ).toBeVisible()
  await expect(guestPage.getByText('View as guest')).toBeVisible()
  await guest.close()
})
