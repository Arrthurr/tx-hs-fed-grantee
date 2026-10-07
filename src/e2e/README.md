# E2E Tests (Playwright)

There are two suites. They prove different things and must not be mixed.

## Deterministic app tests (CI)

These intercept `https://maps.googleapis.com/maps/api/js?*` with
`src/e2e/fixtures/maps-sdk.js`. The real React Maps components and application
data loaders still run. Vite starts with
`VITE_GOOGLE_MAPS_API_KEY=e2e-test-only-not-a-real-google-key`. That value is
not a credential and is never sent to Google.

| Spec | What it proves | What it does not prove |
| --- | --- | --- |
| `app-shell.spec.ts` | Directory chrome, "Show all Texas", committed data clustering without blocking search/details, default layer states, region buttons | Live tiles, geocoding, API-key validity |
| `loading-recovery.spec.ts` | Optional-region malformed/HTTP failure, keyboard retry, overlay removal, SDK abort/reload, authorization errors | Geographic rendering |
| `map-accessibility.spec.ts` | 320px/390px/tablet/desktop details unobscured after selection, empty results, touch/mouse/keyboard toggles, region information without polygon clicks, fullscreen selection, resize, one initial statewide fit plus "Show all Texas" refit, coincident locations clustered yet reachable via search, layer off clearing pins and clusters | WCAG audit, live Maps controls, real cluster geometry or click-to-zoom |

Run from the repo root with no existing Vite server (or restart that server
with the same test-only key):

```bash
npx playwright install chromium
npm run test:e2e
```

CI runs this suite on Chromium and Mobile Chrome. Failures upload
`playwright-report/` and `test-results/` (traces and screenshots). Do not
attach `.env.local` or real credentials. Restart any existing Vite server
so Playwright is not reusing a process started with a live key.

No app-side test switches are added.

The double implements only what `@vis.gl/react-google-maps` and
`@googlemaps/markerclusterer` call: `OverlayView` (with enumerable prototype
methods, because the clusterer copies them with `for...in`), `LatLngBounds`,
`event.trigger`, `Map.getProjection` and an `AdvancedMarkerElement` that
emits both `click` and `gmp-click`. `Map.fitBounds` records each call in
`window.__mapsSdkFitBoundsCalls` and settles on a fixed zoom of 6. It has
no projection, so clustering follows that zoom, and cluster clicks do not
really zoom. It does not show real SDK transfer cost; see
`docs/performance/map-loading.md`.

## Live Google Maps smoke (opt-in, not CI)

`live-maps.spec.ts` is skipped unless `LIVE_GOOGLE_MAPS=1` and a real
restricted browser key is present. It only checks that the directory chrome
and a `.gm-style` canvas appear. It does not prove search, markers, overlays,
or mobile details.

```bash
LIVE_GOOGLE_MAPS=1 VITE_GOOGLE_MAPS_API_KEY=your_restricted_browser_key npm run test:e2e
```

Traces, screenshots, and video are disabled for this project so a live key is
not captured in artifacts. Restrict the key by HTTP referrer and required
APIs. Do not expose it to untrusted fork pull requests; this job is not in
CI for that reason.

## Previous suite

The previous suite was removed because it had drifted out of sync with the UI
(incorrect h1 text, stale selectors like "Map Controls" and zoom-in buttons,
and a `MOCK_API_ERROR` localStorage hook that nothing in the app reads).
