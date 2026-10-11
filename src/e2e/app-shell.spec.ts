import { test, expect } from '@playwright/test';
import { interceptMapsSdk } from './helpers/mapsSdk';

test.beforeEach(async ({ page }) => {
  await interceptMapsSdk(page);
});

test('directory chrome, committed search, details and default layers initialize', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Texas Head Start Location Directory' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Map SDK test double' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show all Texas' })).toBeVisible();
  // Dense committed data clusters at statewide zoom; clusters must not block search/details.
  await expect(page.getByRole('button', { name: /^\d+ Head Start locations\. Select to zoom in\.$/ }).first()).toBeVisible();

  const layers = page.locator('details');
  if (await layers.getAttribute('open') === null) await page.locator('summary').click();
  const programs = page.getByRole('button', { name: 'Toggle Head Start programs layer' });
  const regions = page.getByRole('button', { name: 'Toggle TXHSA Regions layer' });
  await expect(programs).toHaveAttribute('aria-pressed', 'true');
  await expect(regions).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('textbox', { name: 'Search Head Start programs' }).fill('Williamson');
  await page.getByRole('button', { name: /View Opportunities For Williamson/ }).click();
  const details = page.getByRole('region', { name: /Opportunities For Williamson/ });
  await expect(details).toContainText('604 High Tech Dr, Georgetown, TX 78626');
  await expect(details).toContainText('Not verified');

  await regions.click();
  await expect(regions).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /boundary \(SDK double\)/ })).toHaveCount(4);
  await page.getByRole('button', { name: 'View East region' }).click();
  await expect(page.getByRole('region', { name: 'East', exact: true })).toContainText('listed location');
});
