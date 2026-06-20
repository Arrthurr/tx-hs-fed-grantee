---
title: "TXHSA regions overlay: Google Maps overlay, Vite assets, and build-time geometry lessons"
date: 2026-05-20
category: architecture-patterns
module: map-overlays
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Styling google.maps.Data overlays where CSS custom properties are tempting but unsupported"
  - "Writing useCallback hooks that read useState counters from a stable closure"
  - "Attaching listeners to google.maps.Data layers that are recreated on toggle"
  - "Placing large build-only inputs under Vite's public/ directory"
  - "Replacing a many-feature runtime overlay with a smaller dissolved set of polygons"
symptoms:
  - "Region polygons render but appear uncolored or with default fill"
  - "Retry loop for failed data fetch never hits its configured cap"
  - "Memory and listener count grow each time an overlay layer is toggled"
  - "Production bundle is unexpectedly large; multi-MB GeoJSON shipped to clients"
  - "Runtime fetches dozens of polygons when a handful of dissolved polygons would suffice"
related_components:
  - tooling
  - documentation
  - development_workflow
tags: [google-maps, vite, react-hooks, geojson, turf, overlays, memory-leak, build-time]
---

# TXHSA Regions Overhaul: Five Lessons in Maps + React + Vite

## Context

This doc captures five distinct lessons surfaced while replacing a 36-polygon Congressional District overlay with a 4-polygon TXHSA region overlay in `Arrthurr/tx-hs-fed-grantee` (PR #5, plus the fix-pass commit `64cd68c`). The work spans:

- A build-time dissolve pipeline (Turf union + a county→region lookup)
- A `google.maps.Data`-based runtime overlay with per-region styling, click handling, and a minimal info window
- Refactors to `useMapData` to fix duplicated fetches, unbounded retries, listener leaks, and a stale CSS-variable bug

Each lesson below stands alone — landing on one via grep should be enough to act. Lessons are ordered by how much grief they'll save if you hit them again.

---

## Lesson 1 — `google.maps.Data.setStyle` does not resolve CSS variables

**Problem.** Region polygons rendered with the browser's default fill (an unstyled translucent gray), even though the style function appeared to return the correct color tokens.

**Symptom.**
- All four TXHSA regions visually identical, default Maps gray
- No console error; DevTools showed `<canvas>` paint, not stylable DOM
- The same color tokens worked everywhere else in the app (Tailwind, inline `style`)

**Root cause.** `regionFillColor` returned `'var(--txhsa-west)'` (etc.) to `google.maps.Data.setStyle({ fillColor })`. The Maps JS API treats `fillColor` as a plain CSS color string that it passes directly to its renderer; it does not evaluate `var(--foo)` against the page's CSS custom properties. Unlike a DOM element where `style="background: var(--foo)"` cascades, the canvas-backed Maps renderer never touches the CSSOM, so the variable string is just an unrecognized color.

**Fix.** Mirror the design-system tokens as hex literals in a typed lookup.

Before:
```ts
const regionFillColor = (name: TxhsaRegionName) =>
  `var(--txhsa-${name.toLowerCase()})`;

dataLayer.setStyle({ fillColor: regionFillColor(region.name), fillOpacity: 0.35 });
```

After:
```ts
const REGION_FILL_COLORS: Record<TxhsaRegionName, string> = {
  West:  '#...',  // mirrors --txhsa-west  in src/styles/design-system.css
  North: '#...',  // mirrors --txhsa-north
  East:  '#...',  // mirrors --txhsa-east
  South: '#...',  // mirrors --txhsa-south
};

dataLayer.setStyle({ fillColor: REGION_FILL_COLORS[region.name], fillOpacity: 0.35 });
```

**Prevention.**
- Anywhere you pass a color (or any value) to a `google.maps.*` API, resolve CSS variables yourself first. Same goes for any canvas-backed library (Mapbox GL, Deck.gl, Konva, Pixi).
- If you must keep tokens in CSS, read them at runtime with `getComputedStyle(document.documentElement).getPropertyValue('--txhsa-west').trim()` and pass the resolved string in. Beware: the computed value is empty until the stylesheet is applied, so this needs a render gate.
- Prefer the typed `Record<UnionType, string>` mirror — it gives you exhaustiveness checking on the region union.

**Heuristic.** Maps APIs are not browsers. If the value isn't a literal color/number/URL, assume it won't be evaluated.

---

## Lesson 2 — Stale closure made retry counter unbounded

**Problem.** `loadHeadStartPrograms` retried forever on transient fetch failures, hammering the origin and inflating dev-tools network panels.

**Symptom.**
- Network tab showed `headStartPrograms.json` requests every `BACKOFF_MS` indefinitely
- React state `programsRetryCount` correctly incremented past `MAX_RETRIES`
- But the retry chain kept running anyway

**Root cause.** The retry function read `programsRetryCount` (a `useState` value) from inside a `useCallback(..., [])` that was marked `// eslint-disable-next-line react-hooks/exhaustive-deps`. With empty deps the callback's closure captures the initial value of `programsRetryCount` (zero) and freezes it forever — every retry sees `0 < MAX_RETRIES` and schedules another retry. The `setProgramsRetryCount` calls update React state, but the captured local inside the memoized callback never re-reads.

Before:
```ts
const [programsRetryCount, setProgramsRetryCount] = useState(0);

// eslint-disable-next-line react-hooks/exhaustive-deps
const loadHeadStartPrograms = useCallback(async () => {
  try {
    // ... fetch ...
  } catch (err) {
    if (programsRetryCount < MAX_RETRIES) {           // <-- always reads 0
      setProgramsRetryCount(c => c + 1);
      setTimeout(loadHeadStartPrograms, BACKOFF_MS);
    }
  }
}, []); // <-- captures initial programsRetryCount forever
```

After:
```ts
const programsRetryCountRef = useRef(0);
const pendingRetryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

const loadHeadStartPrograms = useCallback(async (signal: AbortSignal) => {
  try {
    await fetch(URL, { signal });
    // ... handle response ...
  } catch (err) {
    if (signal.aborted) return;
    if (programsRetryCountRef.current < MAX_RETRIES) {
      programsRetryCountRef.current += 1;
      pendingRetryTimerRef.current = setTimeout(
        () => loadHeadStartPrograms(signal),
        BACKOFF_MS,
      );
    }
  }
}, []);

useEffect(() => {
  const controller = new AbortController();
  loadHeadStartPrograms(controller.signal);
  return () => {
    controller.abort();
    clearTimeout(pendingRetryTimerRef.current);
  };
}, [loadHeadStartPrograms]);
```

**Companion change — `AbortController`.** Every fetch carries the `AbortSignal` so an unmount cancels both the in-flight request and the pending retry timer. The `signal.aborted` check after `catch` keeps an aborted fetch from spuriously incrementing the retry counter; the timer ref is typed `ReturnType<typeof setTimeout>` so the cleanup `clearTimeout` is type-safe across Node and DOM environments.

**Prevention.**
- **If you reach for `eslint-disable-next-line react-hooks/exhaustive-deps`, stop.** The rule is almost always correct. The right fix is usually one of:
  1. Move the value into a `useRef` (for "current value" reads — counters, latest props, accumulators)
  2. Add the value to the dep array and accept the re-memoization
  3. Restructure so the callback doesn't need to read state at all (pass the value as an argument)
- Long-lived self-scheduling callbacks (retry chains, polling, animation loops) almost always want refs, not state, for their bookkeeping. State is for things the UI renders; refs are for things the callback reads.
- Every fetch in a hook should be cancellable on unmount: `AbortController` for the request, `clearTimeout` for any pending retry timer.

**Heuristic.** A `useCallback` with `[]` is a contract that says "this function reads no React state." If you're tempted to silence the lint rule, you're violating the contract.

---

## Lesson 3 — `setMap(null)` does not detach event listeners

**Problem.** Toggling the TXHSA Regions layer off and back on accumulated listeners against orphaned overlay instances. After ~5 toggles, a single click on a region triggered the info window open/close cycle multiple times; memory usage climbed monotonically.

**Symptom.**
- Click counts on a region grew with each layer-toggle cycle
- Chrome DevTools memory snapshot showed retained `google.maps.Data` instances proportional to toggle count
- No explicit error — just gradual misbehavior

**Root cause.** `setMap(null)` detaches an overlay from the map, but the Maps JS API does **not** GC the instance or its listeners. The overlay sits in memory with its click handlers still bound. New toggles ON created fresh `google.maps.Data` instances with their own listeners; old listeners persisted because nothing released them.

Before:
```ts
const [regionOverlays, setRegionOverlays] = useState<google.maps.Data[]>([]);

const teardownRegionOverlays = () => {
  regionOverlays.forEach(o => o.setMap(null)); // listeners still attached
  setRegionOverlays([]);
};
```

After:
```ts
const regionOverlaysRef = useRef<google.maps.Data[]>([]);

const teardownRegionOverlays = useCallback(() => {
  regionOverlaysRef.current.forEach(overlay => {
    overlay.setMap(null);
    google.maps.event.clearInstanceListeners(overlay);
  });
  regionOverlaysRef.current = [];
}, []);
```

Note the move from `useState` to `useRef` for the overlay collection — these are imperative GL-style handles, not render-driving data, and putting them in state caused extra re-renders without benefit.

**Prevention.** Treat this as the Maps cleanup ritual for any instance you attach listeners to (`Marker`, `Polygon`, `Polyline`, `Data`, `InfoWindow`, `DirectionsRenderer`, ...):

```ts
overlay.setMap(null);
google.maps.event.clearInstanceListeners(overlay);
```

Both lines, every time. If you only call one of them, you have a leak or a dangling render.

For listeners you'll need to remove individually (rather than nuking all of them), keep the handle returned by `addListener` and call `google.maps.event.removeListener(handle)`. `clearInstanceListeners` is the right hammer when the overlay itself is being thrown away.

**Heuristic.** Imperative graphics handles (Maps overlays, WebGL buffers, canvas contexts) belong in `useRef`, not `useState`. They don't drive renders, and treating them as state causes both render churn and lifecycle confusion.

---

## Lesson 4 — Vite ships everything in `public/` to clients

**Problem.** Production users were downloading an 8.1 MB Texas counties GeoJSON file that the runtime never read. It was the raw input to a build-time dissolve script.

**Symptom.**
- `dist/assets/source/tx-counties.geojson` present in the production build, 8.1 MB
- Lighthouse total-transfer ballooned
- No runtime import of the file existed in `src/`

**Root cause.** `tx-counties.geojson` lived under `public/assets/source/`. Vite's `public/` directory is a "copy as-is to the build output" bucket — every file inside it ships to `dist/` regardless of whether any module imports it. The previous author treated `public/` as a generic static-asset folder; in fact it's specifically for runtime-served assets.

Before:
```
public/
  assets/
    source/
      tx-counties.geojson          # 8.1 MB, build input only — shipped to clients
    txhsa-geojson/
      {west,north,east,south}.geojson  # ~4-50 KB each, runtime-loaded — correctly here
```

After:
```
scripts/
  build-txhsa-regions.ts
  source/
    tx-counties.geojson            # 8.1 MB, build input only — NOT shipped

public/
  assets/
    txhsa-geojson/
      {west,north,east,south}.geojson  # only these reach production
```

The build script now reads from `scripts/source/tx-counties.geojson`; production has no reference to it.

**Prevention.**
- **Rule of thumb:** if no module under `src/` imports a file at runtime, it does not belong in `public/`. Period.
- Build-only inputs (lookup tables, source datasets, generators' fixtures) should live next to the script that consumes them — typically `scripts/source/` or alongside the script file.
- Audit `dist/` after a build. Anything large that isn't an emitted bundle or imported asset is suspicious. `ls -lhS dist/assets/` sorts by size and surfaces these fast.
- This is not Vite-specific: Next.js `public/`, Create React App `public/`, Astro `public/`, and SvelteKit `static/` all behave the same way. Bare-copy folders are for runtime, not build pipelines.

**Heuristic.** "`public/` ships." If a file's purpose is to be consumed by a Node script and never reach a browser, it's in the wrong directory.

---

## Lesson 5 — Build-time dissolve for runtime overlay reduction

**Problem.** A previous iteration overlaid 36 Congressional District polygons (`TX-{1..36}/shape.geojson`), loaded individually at runtime. That meant 36 network requests, 36 `google.maps.Data` instances, 36 click listeners, and a hairier info-window state machine — for a visualization whose meaningful unit (the TXHSA region) is just four shapes.

**Pattern.** When the target overlay is a deterministic aggregation of a finer-grained source (counties → regions, ZIPs → metros, parcels → neighborhoods), don't compute the aggregation at runtime. Compute it once at repo-build time, commit the result, and ship only the aggregated geometry.

**Implementation.** A one-time script (`scripts/build-txhsa-regions.ts`) using `@turf/union` to dissolve Texas counties grouped by their TDEM disaster region into 4 region polygons. `@turf/union` is topology-aware and handles MultiPolygon coastlines correctly (Texas has them).

Inputs:
- `scripts/source/tx-counties.geojson` — Texas counties source (build-only, not shipped)
- `src/data/tdemCountyRegions.ts` — human-readable county→TDEM region lookup, plus the 4-way region merge mapping. Reviewable in PRs.

Outputs (committed, runtime-loaded):
- `public/assets/txhsa-geojson/{west,north,east,south}.geojson`

Run via `npm run build:regions` whenever either input changes.

**Why this matters.**
- 9× fewer overlays → fewer click listeners, fewer polygon-render passes, smaller info-window state machine
- Smaller total payload (4 dissolved polygons « 36 raw district polygons)
- Aggregation logic is testable as a build script with fixtures — not as runtime code that has to also handle network failures, partial data, retry, and abort
- The source-of-truth mapping is a TypeScript file reviewable line-by-line in code review. Runtime dissolve would hide it inside data transformation code that's harder to inspect.

**Build-time guardrail: fail loud on missing data.** The build script defaults `requireAllRegionsPopulated` to `true`. A county present in `tx-counties.geojson` but missing from `tdemCountyRegions.ts` causes the build to fail with the offending county name. Silent omission would produce gaps in the dissolved polygon — a class of bug that's invisible until someone notices a hole in the map.

**Test-time guardrail (and the vacuous-invariant trap).** The "every program belongs to exactly one region" invariant test originally used `expect(total).toBeLessThanOrEqual(programs.length)` and a fixture that didn't include any Houston (south-region) programs. The assertion passed at totals 0, 1, OR 2 — it constrained nothing. Fixed with strict equality plus a fixture that covers all four regions:

Before (vacuous):
```ts
const total = countWest + countNorth + countEast + countSouth;
expect(total).toBeLessThanOrEqual(programs.length); // passes at 0, 1, or 2
```

After (binding):
```ts
const total = countWest + countNorth + countEast + countSouth;
expect(total).toBe(programs.length);  // exact, two-sided constraint
// fixture now includes programs in all four regions, including Houston (lat 29.76) for South
```

This generalizes: **if your assertion is "every X is in exactly one Y," the fixture must include Xs across all Ys, and the assertion must be strict equality, not a bound with slack.** Bounds-with-slack pass trivially when the fixture is small; strict equality forces fixture coverage and catches real regressions.

**When to apply.**
- The aggregation key is stable (counties → TDEM regions: stable; user-selected filters: not)
- The source is bounded in size and updated rarely (US counties: yes; live sensor data: no)
- The aggregation is deterministic and side-effect-free
- The dissolved output is small enough to commit reasonably (a few hundred KB)

**When NOT to apply.**
- Aggregation key changes at runtime (user picks dimension)
- Source is too large or too dynamic to commit dissolved outputs
- Aggregation depends on data that's only available at request time (per-user, per-tenant)

**Heuristic.** Push aggregation as early in the pipeline as possible. Repo-build time > deploy time > server request time > client runtime. The earlier you commit, the more you can review, test, and cache.

---

## Cross-cutting: provider-ize hooks with side effects

Every lesson above was harder to spot because `useMapData()` was being called twice — once in `App.tsx`, once in `TexasMap.tsx`. Each call ran its own fetch chain, its own retry counter, and its own region-load pipeline. Symptoms doubled (two retry loops, two leaks, two parallel sets of overlays creating their listeners).

Fix: wrap the hook in a `MapDataProvider` that calls `useMapData()` exactly once and exposes the result via context. Both `App` and `TexasMap` consume the context.

**Rule.** A custom hook that owns side effects (fetches, subscriptions, timers, imperative GL handles) must be called exactly once per logical instance. If more than one component needs to read from it, lift it into a Provider. The lint rules don't catch this — it's a design discipline.

A useful tell: if your hook returns retry/error state plus loaded data, it owns side effects. Two consumers calling it independently means two side-effect streams.

---

## When to Apply — Quick Index

| Trigger | Lesson |
|---|---|
| Passing CSS tokens to Google Maps / Mapbox / any canvas-backed renderer | Lesson 1 |
| About to write `eslint-disable-next-line react-hooks/exhaustive-deps` | Lesson 2 |
| Retry/polling/animation counter inside a long-lived callback | Lesson 2 |
| Adding/removing Maps overlays (`Marker`, `Polygon`, `Data`, `InfoWindow`) | Lesson 3 |
| Storing imperative graphics handles in React | Lesson 3 (use `useRef`) |
| Adding a file to `public/` (or `static/`, etc.) | Lesson 4 |
| Generating an overlay from a finer-grained source | Lesson 5 |
| Writing an invariant test ("every X belongs to exactly one Y") | Lesson 5 (strict equality + full-coverage fixture) |
| Custom hook with fetches/timers called by more than one component | Cross-cutting (Provider-ize) |
| Global error gate blanks the UI on a non-essential layer failure | Scope the gate to essential data only (see Cross-cutting) |

---

## Related

- [[per-county-override-layer-over-authoritative-lookup]] — follow-on capability (PR #7): a per-county `txhsaCountyOverrides` layer on top of the dissolve pipeline (Lesson 5), with a fail-loud override-key guard symmetric to Lesson 5's missing-county check
- `docs/plans/2026-05-19-001-feat-txhsa-regions-overlay-plan.md` — the plan PR #5 implements
- `docs/brainstorms/txhsa-regions-overlay-requirements.md` — the upstream requirements doc
- `scripts/build-txhsa-regions.ts` — the dissolve script described in Lesson 5
- `src/data/tdemCountyRegions.ts` — the county→region lookup
- `src/styles/design-system.css` — the `--txhsa-*` tokens referenced in Lesson 1
- `CLAUDE.md` — "Region Build" gotchas section (build-time guardrails) and "TXHSA region tokens" under Styling
- PR #5 (`feat: replace Congressional District overlay with TXHSA Regions`) — implementation
- Fix-pass commit `64cd68c` — applied 32/37 multi-reviewer findings
