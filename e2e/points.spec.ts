import { expect, test } from '@playwright/test'
import {
  createAdventure,
  createUser,
  shareTokenFor,
  signIn,
} from './helpers'

test('add points, list, guest viewer', async ({ page, request, browser }) => {
  const email = `e2ep${Date.now()}@test.co`
  await createUser(request, email)
  await signIn(page, email)
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({ latitude: -33.56, longitude: 18.48 })

  await createAdventure(page, 'Pt Trip')

  await page.getByRole('button', { name: '+ Point' }).click()
  await expect(page.getByPlaceholder('Name')).toHaveValue('Obstacle 1')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('.pm-label', { hasText: 'Obstacle 1' })).toBeVisible()

  await page
    .context()
    .setGeolocation({ latitude: -33.57, longitude: 18.49 })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: '+ Point' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('.pm-label', { hasText: 'Obstacle 2' })).toBeVisible()

  await page.getByRole('button', { name: 'Points' }).click()
  await expect(page.locator('.card')).toHaveCount(2)
  await page.locator('.card').first().click()

  await page.locator('.pm-label', { hasText: 'Obstacle 1' }).click()
  await expect(page.locator('.sheet').getByText(/\d+ m · \d+°/)).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()

  const token = await shareTokenFor(page)

  const guest = await browser.newContext()
  const guestPage = await guest.newPage()
  await guestPage.goto(`/a/${page.url().match(/\/a\/([0-9a-f-]+)/)?.[1]}?token=${token}`)
  await expect(
    guestPage.locator('.pm-label', { hasText: 'Obstacle 1' }),
  ).toBeVisible()
  await expect(
    guestPage.locator('.pm-label', { hasText: 'Obstacle 2' }),
  ).toBeVisible()
  await expect(
    guestPage.getByRole('button', { name: '+ Point' }),
  ).not.toBeVisible()
  await guest.close()
})
