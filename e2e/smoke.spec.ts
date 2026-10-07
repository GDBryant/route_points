import { expect, test } from '@playwright/test'

test('map renders with mocked geolocation', async ({ context, page }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: -33.56, longitude: 18.48 })
  await page.goto('/')
  await expect(page.locator('.leaflet-container')).toBeVisible()
})
