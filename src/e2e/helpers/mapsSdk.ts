import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

export const mapsSdkSource = readFileSync('src/e2e/fixtures/maps-sdk.js', 'utf8');

/** Intercept the Google Maps JavaScript API with the checked-in SDK test double. */
export const interceptMapsSdk = async (page: Page): Promise<void> => {
  await page.route('https://maps.googleapis.com/maps/api/js?*', route =>
    route.fulfill({ contentType: 'application/javascript', body: mapsSdkSource }));
};
