import { expect, test, type Page } from '@playwright/test'
import {
  createAdventure,
  createUser,
  shareTokenFor,
  signIn,
} from './helpers'

async function addPointAt(
  page: Page,
  name: string,
  lat: number,
  lng: number,
) {
  await page.context().setGeolocation({ latitude: lat, longitude: lng })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: '+ Point' }).click()
  await page.getByPlaceholder('Name').fill(name)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(
    page.locator('.pm-label', { hasText: name }),
  ).toBeVisible()
}

test('manual route A→B with snap and direction', async ({
  page,
  request,
  browser,
}) => {
  const email = `e2er${Date.now()}@test.co`
  await createUser(request, email)
  await signIn(page, email)
  await page.context().grantPermissions(['geolocation'])
  const advId = await (async () => {
    await createAdventure(page, 'Rt Trip')
    return page.url().match(/\/a\/([0-9a-f-]+)/)![1]
  })()

  await addPointAt(page, 'A', -33.56, 18.48)
  await addPointAt(page, 'B', -33.563, 18.48)
  await page.context().setGeolocation({ latitude: -33.5601, longitude: 18.48 })
  await page.waitForTimeout(600)

  await page.getByRole('button', { name: 'Record' }).click()
  await page.getByRole('button', { name: 'Start route' }).click()
  await page.getByRole('button', { name: 'Drop waypoint' }).click()
  await page.context().setGeolocation({ latitude: -33.5615, longitude: 18.48 })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Drop waypoint' }).click()
  await page.context().setGeolocation({ latitude: -33.5629, longitude: 18.48 })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Stop' }).click()

  await expect(page.getByPlaceholder('Route name')).toHaveValue('A → B')
  await expect(page.locator('.sheet').getByText(/within \d+ m/)).toBeVisible()
  await page.getByRole('button', { name: 'forward' }).click()
  await page.getByRole('button', { name: 'Save route' }).click()

  await expect(
    page.locator('path.leaflet-interactive').first(),
  ).toBeAttached()

  await page.getByRole('button', { name: 'Routes' }).click()
  await expect(page.getByText('A → B')).toBeVisible()

  const token = await shareTokenFor(page)
  const guest = await browser.newContext()
  const guestPage = await guest.newPage()
  await guestPage.goto(`/a/${advId}?token=${token}`)
  await expect(
    guestPage.locator('path.leaflet-interactive').first(),
  ).toBeAttached()
  await guest.close()
})

test('auto mode drops waypoints on interval', async ({ page, request }) => {
  const email = `e2ea${Date.now()}@test.co`
  await createUser(request, email)
  await signIn(page, email)
  await page.context().grantPermissions(['geolocation'])
  await page.clock.install()
  await createAdventure(page, 'Auto Trip')
  await page.context().setGeolocation({ latitude: -33.56, longitude: 18.48 })
  await page.clock.runFor(1000)

  await page.getByRole('button', { name: 'Record' }).click()
  await page.getByRole('button', { name: 'Auto' }).click()
  await page.locator('input[type=range]').fill('0')
  await page.getByRole('button', { name: 'Start route' }).click()

  await page.clock.runFor(16_000)
  await expect(page.getByText(/\d+ waypoints/)).toHaveText(/[3-9]\d* waypoints|[1-9]\d+ waypoints/)
})
