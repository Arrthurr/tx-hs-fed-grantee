import { test, expect } from '@playwright/test';

const liveKey = process.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const enabled = process.env.LIVE_GOOGLE_MAPS === '1' &&
  liveKey.length >= 30 &&
  liveKey !== 'e2e-test-only-not-a-real-google-key' &&
  liveKey !== 'your_google_maps_api_key_here';

test.describe('live Google Maps smoke', () => {
  test.skip(!enabled, 'Opt-in: LIVE_GOOGLE_MAPS=1 with a restricted browser key. Not run in pull requests.');

  test('renders directory chrome against a live Maps canvas', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Texas Head Start Location Directory' })).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
    await expect(page.locator('.gm-style').first()).toBeVisible({ timeout: 30_000 });
    const layers = page.locator('details');
    if (await layers.getAttribute('open') === null) await page.locator('summary').click();
    await expect(page.getByRole('button', { name: 'Toggle Head Start programs layer' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Toggle TXHSA Regions layer' })).toHaveAttribute('aria-pressed', 'false');
  });
});
