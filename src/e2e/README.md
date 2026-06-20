# E2E Tests (Playwright)

The Playwright infrastructure (`playwright.config.ts`, `npm run test:e2e` scripts,
`@playwright/test` dependency) is in place, but **no tests are currently
checked in**.

The previous suite was removed because it had drifted out of sync with the UI
(incorrect h1 text, stale selectors like "Map Controls" and zoom-in buttons,
and a `MOCK_API_ERROR` localStorage hook that nothing in the app reads). CI
intentionally omits E2E — see the comment at the top of
`.github/workflows/ci.yml`.

## Re-adding a suite

A future suite should cover:

- **App load**: header text ("Texas Head Start Federal Grantee Programs"),
  map canvas visible, data layers heading visible.
- **Search**: typing a program name → results appear → clicking a result opens
  an info window.
- **Layer toggles**: Head Start Programs (on by default), TXHSA Regions (off
  by default). Toggle states reflected in `aria-pressed` and button styling.
- **Marker interaction**: clicking a program marker opens an info window with
  program name, address, and grantee.
- **Region interaction**: with TXHSA Regions on, clicking a region polygon
  opens an info window with the region name, program count, and total funded
  amount.
- **Responsive design**: mobile/tablet/desktop viewports.
- **Accessibility**: interactive elements have accessible names, images have
  alt text.

## Requirements to run

- A live `VITE_GOOGLE_MAPS_API_KEY` in `.env.local` (or a CI secret).
- The dev server running (`npm run dev`) — `playwright.config.ts` starts it
  automatically via the `webServer` block.
