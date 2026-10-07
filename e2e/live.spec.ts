import { expect, test } from '@playwright/test'
import { createAdventure, createUser, shareTokenFor, signIn } from './helpers'

test('live positions + guest navigate HUD', async ({
  page,
  request,
  browser,
}) => {
  const email = `e2el${Date.now()}@test.co`
  await createUser(request, email)
  await signIn(page, email)
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({ latitude: -33.56, longitude: 18.48 })
  await createAdventure(page, 'Live Trip')
  const advId = page.url().match(/\/a\/([0-9a-f-]+)/)![1]

  await page.context().setGeolocation({ latitude: -33.561, longitude: 18.48 })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: '+ Point' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(
    page.locator('.pm-label', { hasText: 'Obstacle 1' }),
  ).toBeVisible()
  await page.waitForTimeout(300)

  const token = await shareTokenFor(page)
  await page.goto(`/a/${advId}`)

  const guest = await browser.newContext()
  await guest.grantPermissions(['geolocation'])
  await guest.setGeolocation({ latitude: -33.565, longitude: 18.485 })
  const guestPage = await guest.newPage()
  await guestPage.goto(`/a/${advId}?token=${token}`)

  await expect(
    guestPage.locator('.mm-label').first(),
  ).toBeVisible({ timeout: 12_000 })

  const before = await guestPage
    .locator('.member-marker')
    .first()
    .evaluate((e) => e.getBoundingClientRect().y)
  await page
    .context()
    .setGeolocation({ latitude: -33.558, longitude: 18.482 })
  await expect
    .poll(
      async () =>
        guestPage
          .locator('.member-marker')
          .first()
          .evaluate((e) => e.getBoundingClientRect().y),
      { timeout: 15_000 },
    )
    .not.toBe(before)

  await guestPage.locator('.pm-label', { hasText: 'Obstacle 1' }).click()
  await guestPage.getByRole('button', { name: 'Navigate' }).click()
  await expect(
    guestPage.locator('.nh-dist'),
  ).toHaveText(/\d+ m|\d+\.\d km/)

  await page.getByRole('button', { name: 'Members' }).click()
  await expect(page.locator('.dot-online')).toBeVisible({ timeout: 15_000 })
  await guest.close()
})
