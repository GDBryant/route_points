import { expect, test } from '@playwright/test'
import {
  createAdventure,
  createUser,
  signIn,
} from './helpers'

test('offline queue syncs on reconnect', async ({ page, request }) => {
  const email = `e2eoff${Date.now()}@test.co`
  await createUser(request, email)
  await signIn(page, email)
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({ latitude: -33.56, longitude: 18.48 })
  await createAdventure(page, 'Off Trip')
  const advUrl = page.url()
  await page.waitForTimeout(500)

  await page.getByRole('button', { name: '+ Point' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(
    page.locator('.pm-label', { hasText: 'Obstacle 1' }),
  ).toBeVisible()

  await page.context().setOffline(true)
  await expect(page.locator('.banner.offline')).toBeVisible()

  await page.getByRole('button', { name: '+ Point' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(
    page.locator('.pm-label', { hasText: 'Obstacle 2' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Record' }).click()
  await page.getByRole('button', { name: 'Start route' }).click()
  await page.getByRole('button', { name: 'Drop waypoint' }).click()
  await page.context().setGeolocation({ latitude: -33.562, longitude: 18.48 })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Drop waypoint' }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: 'Save route' }).click()

  await expect(page.locator('.sync-badge .count')).toHaveText(/[3-9]\d*/)

  await page.context().setOffline(false)
  await expect(page.locator('.sync-badge .count')).not.toBeVisible({
    timeout: 10_000,
  })

  await page.goto(advUrl)
  await expect(
    page.locator('.pm-label', { hasText: 'Obstacle 2' }),
  ).toBeVisible()
  await expect(
    page.locator('path.leaflet-interactive').first(),
  ).toBeAttached()
})

test('tile download sheet shows count and downloads small bbox', async ({
  page,
  request,
}) => {
  const email = `e2etl${Date.now()}@test.co`
  await createUser(request, email)
  await signIn(page, email)
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({ latitude: -33.56, longitude: 18.48 })
  await createAdventure(page, 'Tile Trip')

  await page.getByRole('button', { name: '⚙' }).click()
  await page.getByRole('button', { name: 'Offline maps' }).click()

  await page.locator('.sheet input[type=range]').fill('13')
  const summary = await page.locator('.sheet .muted').first().textContent()
  const count = parseInt(summary!.match(/(\d+) tiles/)![1], 10)
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThan(100)

  await page.route('**/tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082',
        'hex',
      ),
    }),
  )
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(page.locator('.sheet')).not.toBeVisible({ timeout: 15_000 })
})
