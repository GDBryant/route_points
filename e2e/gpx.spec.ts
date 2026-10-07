import { expect, test } from '@playwright/test'
import {
  createAdventure,
  createUser,
  signIn,
} from './helpers'

test('export and import GPX', async ({ page, request }) => {
  const email = `e2eg${Date.now()}@test.co`
  await createUser(request, email)
  await signIn(page, email)
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({ latitude: -33.56, longitude: 18.48 })
  await createAdventure(page, 'GPX Trip')

  for (const [i, lat] of [[0, -33.56], [1, -33.562]] as const) {
    await page
      .context()
      .setGeolocation({ latitude: lat, longitude: 18.48 })
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: '+ Point' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(
      page.locator('.pm-label', { hasText: `Obstacle ${i + 1}` }),
    ).toBeVisible()
  }

  await page.getByRole('button', { name: 'Record' }).click()
  await page.getByRole('button', { name: 'Start route' }).click()
  await page.getByRole('button', { name: 'Drop waypoint' }).click()
  await page.context().setGeolocation({ latitude: -33.561, longitude: 18.48 })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Drop waypoint' }).click()
  await expect(page.getByText(/[2-9]\d* waypoints/)).toBeVisible()
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: 'Save route' }).click()
  await expect(
    page.locator('path.leaflet-interactive').first(),
  ).toBeAttached()
  await page.getByRole('button', { name: 'Routes' }).click()
  await expect(page.locator('.list .card').first()).toBeVisible()
  await page.getByRole('button', { name: 'Map' }).click()
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const { db } = await import('/src/lib/db.ts')
          return (await db.routes.toArray()).reduce(
            (n, r) => n + r.coords.length,
            0,
          )
        }),
      { timeout: 15_000 },
    )
    .toBe(2)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '⚙' }).click()
  await page.getByRole('button', { name: 'Export GPX' }).click()
  const download = await downloadPromise
  const path = await download.path()
  const xml = (await import('node:fs')).readFileSync(path!, 'utf8')
  expect(xml).toContain('Obstacle 1')
  expect(xml).toContain('Obstacle 2')
  expect((xml.match(/<trkpt/g) ?? []).length).toBe(2)

  await createAdventure(page, 'GPX Import')
  await page.getByRole('button', { name: '⚙' }).click()
  await page.getByRole('button', { name: 'Import GPX' }).click()
  await page.locator('input[type=file]').setInputFiles(path!)
  await expect(page.getByText('2 waypoints, 1 routes')).toBeVisible()
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(
    page.locator('.pm-label', { hasText: 'Obstacle 1' }),
  ).toBeVisible()
  await expect(
    page.locator('path.leaflet-interactive').first(),
  ).toBeAttached()
})
