import { test, expect } from '@playwright/test';
import { interceptMapsSdk, mapsSdkSource } from './helpers/mapsSdk';

test.beforeEach(async ({ page }) => {
  await interceptMapsSdk(page);
  await page.route('**/assets/geojson/headStartPrograms.json', route => route.fulfill({ json: [
    { name: 'Recovery Test Austin', address: 'Austin, TX', coordinates: { lat: 30.2672, lng: -97.7431 } },
    { name: 'Recovery Test Houston', address: 'Houston, TX', coordinates: { lat: 29.7604, lng: -95.3698 } },
  ] }));
});

for (const failure of ['malformed', 'HTTP failure', 'wrong region name']) {
  test(`region ${failure} keeps programs usable and keyboard retry recovers`, async ({ page }) => {
    let fail = true;
    await page.route('**/assets/txhsa-geojson/east.geojson', async route => {
      if (!fail) return route.continue();
      if (failure === 'wrong region name') {
        const response = await route.fetch();
        const collection = await response.json();
        collection.features[0].properties.name = 'North';
        return route.fulfill({ json: collection });
      }
      await route.fulfill(failure === 'malformed' ? { json: { features: [] } } : { status: 503, body: 'Unavailable' });
    });
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Map SDK test double' })).toBeVisible();
    if (await page.locator('details').getAttribute('open') === null) await page.locator('summary').click();
    await expect(page.getByRole('button', { name: 'Recovery Test Austin', exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Failed to load TXHSA regions');
    const toggle = page.getByRole('button', { name: 'Toggle TXHSA Regions layer' });
    await expect(toggle).toBeDisabled();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('textbox', { name: 'Search Head Start programs' }).fill('Houston');
    await page.getByRole('button', { name: 'View Recovery Test Houston' }).click();
    await expect(page.getByRole('region', { name: 'Recovery Test Houston' })).toBeVisible();
    fail = false;
    const retry = page.getByRole('button', { name: 'Retry TXHSA regions' });
    await retry.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toBeEnabled();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /boundary \(SDK double\)/ })).toHaveCount(4);
    await toggle.click();
    await expect(page.getByRole('button', { name: /boundary \(SDK double\)/ })).toHaveCount(0);
  });
}

test('slow optional data leaves the map, markers and search usable', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/txhsa-geojson/east.geojson', async route => {
    await held;
    await route.continue();
  });
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Map SDK test double' })).toBeVisible();
  if (await page.locator('details').getAttribute('open') === null) await page.locator('summary').click();
  await expect(page.getByRole('status')).toContainText('Loading TXHSA regions');
  await expect(page.getByRole('button', { name: 'Recovery Test Austin', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle TXHSA Regions layer' })).toBeDisabled();
  await page.getByRole('button', { name: 'Recovery Test Austin', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Recovery Test Austin' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search Head Start programs' }).fill('Austin');
  await expect(page.getByRole('button', { name: 'View Recovery Test Austin' })).toBeVisible();
  release();
  await expect(page.getByRole('button', { name: 'Toggle TXHSA Regions layer' })).toBeEnabled();
});

test('transient SDK failure offers reload and recovers on a fresh page', async ({ page }) => {
  let fail = true;
  await page.route('https://maps.googleapis.com/maps/api/js?*', route => fail
    ? route.abort('failed') : route.fulfill({ contentType: 'application/javascript', body: mapsSdkSource }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Google Maps could not be loaded');
  fail = false;
  await page.getByRole('button', { name: 'Reload Page' }).focus();
  await Promise.all([page.waitForEvent('load'), page.keyboard.press('Enter')]);
  await expect(page.getByRole('region', { name: 'Map SDK test double' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recovery Test Austin', exact: true })).toBeVisible();
});

test('SDK authorization failure explains administrator action without a false retry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Map SDK test double' })).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { gm_authFailure?: () => void }).gm_authFailure?.();
  });
  await expect(page.getByRole('alert')).toContainText('Please contact the site administrator');
  await expect(page.getByRole('button', { name: 'Reload Page' })).toHaveCount(0);
});
