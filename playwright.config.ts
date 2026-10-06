import { defineConfig, devices } from '@playwright/test';

/**
 * Deterministic browser tests intercept the Maps SDK. They never send the
 * synthetic key to Google. Live smoke is opt-in (`LIVE_GOOGLE_MAPS=1`) and
 * keeps traces/screenshots off so a real key is not captured in artifacts.
 * @see https://playwright.dev/docs/test-configuration
 */
const liveMaps = process.env.LIVE_GOOGLE_MAPS === '1';
const mapsKey = liveMaps
  ? process.env.VITE_GOOGLE_MAPS_API_KEY
  : 'e2e-test-only-not-a-real-google-key';

export default defineConfig({
  testDir: './src/e2e',
  testMatch: /.*\.spec\.ts/,
  timeout: 30 * 1000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:5173',
    trace: liveMaps ? 'off' : 'retain-on-failure',
    screenshot: liveMaps ? 'off' : 'only-on-failure',
    video: 'off',
  },
  projects: liveMaps
    ? [
        {
          name: 'live-maps',
          testMatch: /live-maps\.spec\.ts/,
          use: { ...devices['Desktop Chrome'], channel: 'chromium' },
        },
      ]
    : [
        {
          name: 'chromium',
          testIgnore: /live-maps\.spec\.ts/,
          use: { ...devices['Desktop Chrome'], channel: 'chromium' },
        },
        {
          name: 'Mobile Chrome',
          testIgnore: /live-maps\.spec\.ts/,
          use: { ...devices['Pixel 5'], channel: 'chromium' },
        },
      ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: liveMaps && !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      VITE_GOOGLE_MAPS_API_KEY: mapsKey ?? '',
    },
  },
});
