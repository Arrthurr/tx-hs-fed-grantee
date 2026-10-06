# E2E Tests (Playwright)

`loading-recovery.spec.ts` covers optional-region loading, malformed/HTTP
failures, keyboard retry, overlay removal, script failure/reload recovery,
and authorization errors. It intercepts the Google SDK request with a controlled
test double; the real Maps React components and application data loaders run.
This suite does not verify live Google tiles, geographic rendering, or credentials.

`map-accessibility.spec.ts` uses the same SDK boundary to cover 320px, 390px,
tablet and desktop layouts, long titles/addresses, result selection and return,
empty results, touch/mouse/keyboard toggles, regional information without
polygon clicks, visible focus, fullscreen selection and resizing. Details use a
named non-modal region, results use a list of native buttons, and Data Layers
uses a native disclosure. These checks do not constitute a WCAG audit.

Run from the repo root with no existing Vite server (or restart that server with
the same test-only key):

```bash
npx playwright install chromium
VITE_GOOGLE_MAPS_API_KEY=e2e-test-only-not-a-real-google-key npm run test:e2e -- --project=chromium --project='Mobile Chrome'
```

The synthetic key is not a credential and is never sent to Google by these tests.
Do not use it for production builds. No app-side test switches are added.

The previous suite was removed because it had drifted out of sync with the UI
(incorrect h1 text, stale selectors like "Map Controls" and zoom-in buttons,
and a `MOCK_API_ERROR` localStorage hook that nothing in the app reads). CI
intentionally omits E2E — see the comment at the top of
`.github/workflows/ci.yml`.

## Remaining live-map coverage (issue #4)

A future suite should cover:

- **App load**: header text ("Texas Head Start Location Directory"),
  map canvas visible, Data Layers disclosure visible.
- **Search**: typing a program name → results appear → clicking a result opens
  the separate details panel.
- **Layer toggles**: Head Start Programs (on by default), TXHSA Regions (off
  by default). Toggle states reflected in `aria-pressed` and button styling.
- **Marker interaction**: clicking a program marker opens details with
  program name, address, and grantee.
- **Region interaction**: with TXHSA Regions on, clicking a region polygon
  opens details with the region name, listed-location count, and data limitations.
- **Responsive design**: mobile/tablet/desktop viewports.
- **Accessibility**: interactive elements have accessible names, images have
  alt text.

## Requirements for live-map checks

- A live `VITE_GOOGLE_MAPS_API_KEY` in `.env.local` (or a CI secret).
- The dev server running (`npm run dev`) — `playwright.config.ts` starts it
  automatically via the `webServer` block.
