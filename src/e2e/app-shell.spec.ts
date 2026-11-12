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

for (const width of [1280, 390, 320]) {
  test(`${width}x720: backward tabbing from closed Tyler details keeps focus unobscured`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');
    await expect(page.locator('#initial-loader')).toHaveCount(0);
    const search = page.getByRole('textbox', { name: 'Search Head Start programs' });
    await search.fill('Tyler');
    const result = page.getByRole('button', { name: 'View Tyler ISD', exact: true });
    await result.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Tyler ISD', exact: true })).toBeFocused();
    // Reproduce navigation after the details' smooth scroll has settled,
    // not an immediate Escape that cancels scrolling before the bug can occur.
    await page.waitForTimeout(750);
    await page.keyboard.press('Escape');
    await expect(result).toBeFocused();
    await page.waitForTimeout(750);

    // Use real backward Tab navigation, not locator.focus()/scrollIntoView(),
    // which can hide a native focus-scrolling regression under the sticky header.
    for (let step = 0; step < 20; step += 1) {
      await page.keyboard.press('Shift+Tab');
      const focused = page.locator(':focus');
      await expect.poll(() => focused.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return rect.top >= Math.max(0, headerBottom) && rect.bottom <= innerHeight && (hit === el || el.contains(hit));
      })).toBe(true);
      if (await search.evaluate(el => el === document.activeElement)) break;
    }
    await expect(search).toBeFocused();
    await page.keyboard.press('Tab');
    const clear = page.getByRole('button', { name: 'Clear search' });
    await expect(clear).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
