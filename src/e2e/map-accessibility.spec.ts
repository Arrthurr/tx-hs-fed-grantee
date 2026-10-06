import { test, expect, type Page, type Locator } from '@playwright/test';
import { interceptMapsSdk } from './helpers/mapsSdk';

const programName = 'Accessibility Houston Community Action Head Start and Early Childhood Location';
const address = '12345 Long Community Center Boulevard, Suite 200, Houston, TX 77002';

// Exercise actual touch events as well as mouse and keyboard, not just a small viewport.
test.use({ hasTouch: true });

test.beforeEach(async ({ page }) => {
  await interceptMapsSdk(page);
  await page.route('**/assets/geojson/headStartPrograms.json', route => route.fulfill({ json: [
    { name: programName, address, coordinates: { lat: 29.7604, lng: -95.3698 } },
    { name: 'Accessibility El Paso', address: 'El Paso, TX', coordinates: { lat: 31.7619, lng: -106.485 } },
  ] }));
});

const expectNoOverflow = async (page: Page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
};

const expectUnobscured = async (element: Locator) => {
  await expect(element).toBeInViewport();
  // Selection uses the site's smooth scrolling. Check the settled hit target,
  // rather than failing on a partially visible heading during that animation.
  await expect.poll(() => element.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === el || el.contains(hit);
  })).toBe(true);
};

for (const width of [320, 390, 768, 1280]) {
  test(`${width}px: search, program details, regions and empty results stay unobscured`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('group', { name: 'Region information' })).toBeVisible();
    const layers = page.locator('details');
    await expect(layers).toHaveJSProperty('open', width >= 1024);
    await expectNoOverflow(page);

    const search = page.getByRole('textbox', { name: 'Search Head Start programs' });
    await search.fill('Houston');
    const result = page.getByRole('button', { name: `View ${programName}` });
    await expect(result).toBeVisible();
    await expectNoOverflow(page);
    await result.tap();
    const details = page.getByRole('region', { name: programName });
    await expect(details).toContainText(address);
    await expect(details).toContainText('Not verified');
    await expect(page.getByRole('list', { name: 'Search results' })).toHaveCount(0);
    const heading = details.getByRole('heading', { name: programName });
    await expect(heading).toBeFocused();
    await expectUnobscured(heading);
    await expectUnobscured(page.getByRole('button', { name: 'Close details' }));
    const mapBox = await page.getByRole('region', { name: 'Map SDK test double' }).boundingBox();
    const detailsBox = await details.boundingBox();
    expect(mapBox && detailsBox && (
      width < 1024
        ? detailsBox.y + detailsBox.height <= mapBox.y
        : detailsBox.x + detailsBox.width <= mapBox.x
    )).toBeTruthy();
    await expectNoOverflow(page);
    await page.getByRole('button', { name: 'Back to results' }).click();
    await expect(result).toBeFocused();
    await expect(search).toHaveValue('Houston');

    if (width < 1024) await page.locator('summary').tap();
    const programs = page.getByRole('button', { name: 'Toggle Head Start programs layer' });
    await programs.tap();
    await expect(programs).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: programName, exact: true })).toHaveCount(0);
    await programs.click();
    await expect(programs).toHaveAttribute('aria-pressed', 'true');
    await expect(layers).toHaveAttribute('open', '');
    const regions = page.getByRole('button', { name: 'Toggle TXHSA Regions layer' });
    await regions.focus();
    await page.keyboard.press('Space');
    await expect(regions).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /boundary \(SDK double\)/ })).toHaveCount(4);
    // Harris County is East in the committed county-to-region mapping.
    await page.getByRole('button', { name: 'View East region' }).tap();
    const regionDetails = page.getByRole('region', { name: 'East', exact: true });
    await expect(regionDetails).toContainText('1 listed location in this region.');
    await expectUnobscured(regionDetails.getByRole('heading', { name: 'East' }));
    await expectNoOverflow(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'View East region' })).toBeFocused();

    await search.fill('No such location');
    await expect(page.getByRole('status')).toContainText('No programs found');
    await expectNoOverflow(page);
    await page.getByRole('button', { name: 'Clear search' }).tap();
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
  });
}

test('native result buttons and region buttons support Tab, Enter, Space and Escape', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('textbox', { name: 'Search Head Start programs' });
  await search.fill('Accessibility');
  const first = page.getByRole('button', { name: `View ${programName}` });
  const second = page.getByRole('button', { name: 'View Accessibility El Paso' });
  await first.focus();
  await page.keyboard.press('Tab');
  await expect(second).toBeFocused();
  expect(await second.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Accessibility El Paso' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(second).toBeFocused();
  const region = page.getByRole('button', { name: 'View West region' });
  await region.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('region', { name: 'West', exact: true })).toContainText('1 listed location');
  await page.keyboard.press('Escape');
  await expect(region).toBeFocused();
});

test('a marker selected in fullscreen exposes its details outside the map', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#initial-loader')).toHaveCount(0);
  const map = page.getByRole('region', { name: 'Map SDK test double' });
  await expect(map).toBeVisible();
  await map.evaluate(el => el.requestFullscreen());
  await page.getByRole('button', { name: programName, exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  const heading = page.getByRole('heading', { name: programName });
  await expect(heading).toBeFocused();
  await expectUnobscured(heading);
});

test('resizing preserves selection, focus and layer controls without manual repositioning', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'View East region' }).click();
  const heading = page.getByRole('heading', { name: 'East', exact: true });
  for (const width of [390, 768, 320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(heading).toBeFocused();
    await expectNoOverflow(page);
    await page.getByRole('button', { name: 'Close details' }).scrollIntoViewIfNeeded();
    await expectUnobscured(page.getByRole('button', { name: 'Close details' }));
  }
  await page.keyboard.press('Escape');
  const programs = page.getByRole('button', { name: 'Toggle Head Start programs layer' });
  await programs.focus();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(programs).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(programs).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Drag to Move')).toHaveCount(0);
});
