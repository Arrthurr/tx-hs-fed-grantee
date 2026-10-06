# Texas Head Start Interactive Map

An exploratory map of an owner-supplied Head Start location directory and
project-defined TXHSA regions. Upstream provenance, reporting date,
classifications and grantees are unverified; this is not an authoritative policy
or funding-analysis tool. See [data provenance and limitations](public/data-provenance.md).

Data trust work tracks [GitHub issue #11](https://github.com/Arrthurr/tx-hs-fed-grantee/issues/11).
Its acceptance criteria are mapped in the provenance document: sourced fields
or explicit unknowns, reproducible counts and no unsupported analysis claims.

The app uses Google Maps for the basemap, renders program markers from a
committed JSON dataset, and overlays TXHSA regions generated from Texas county
boundaries.

## Features

- Texas-centered Google Map with distinct listed location markers, not a statewide census
- Separate location details with name, address, coordinates, and explicit unverified fields
- Search by location name, address, or a sourced grantee when available
- Toggleable TXHSA Regions overlay for West, North, East, and South
- Keyboard-accessible region details with distinct listed location counts; unsourced funding withheld
- Responsive React/Tailwind interface with accessible controls

## Stack

- React 18 + TypeScript
- Vite 7
- Tailwind CSS
- `@vis.gl/react-google-maps`
- Google Maps JavaScript API
- Jest + React Testing Library
- Playwright loading-recovery and responsive accessibility tests using a Google SDK test double
- `@turf/union` + `tsx` for build-time region dissolves

## Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` in the project root:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GOOGLE_MAPS_MAP_ID=your_optional_map_id_here
```

`VITE_GOOGLE_MAPS_API_KEY` is required for the map to render. The key needs the
Google Maps JavaScript API enabled. In production, restrict the key to the
deployed domain.

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

### Amp orbs

`.agents/setup` prepares dependencies for Amp's reusable project snapshot. It
uses a supported preinstalled Node toolchain or installs Node 22.22.0 when
needed, then installs from `package-lock.json` without deleting restored
`node_modules`. A changed lockfile fails setup rather than silently updating it.
`.agents/resume` does not reinstall dependencies on wake.

No database or user authentication is required for setup. Configure
`VITE_GOOGLE_MAPS_API_KEY` (and optionally `VITE_GOOGLE_MAPS_MAP_ID`) through
Amp project secrets/environment or a local `.env.local`; setup never writes
credentials. Unit tests and builds do not require a Maps key.
Playwright browsers are not installed during setup. Install Chromium with
`npx playwright install chromium` before `npm run test:e2e`. Deterministic
browser tests intercept the Maps SDK and do not need a live key.

These lifecycle files must reach the project's default branch before new orbs
use them. Exact snapshots skip setup; stale snapshots rerun the fast install
against the updated lockfile. To verify locally, run `.agents/setup` twice and
then `.agents/resume`.

## Commands

```bash
npm run dev            # Start Vite dev server
npm run build          # Production build
npm run build:regions  # Regenerate committed TXHSA region GeoJSON
npm run test:data      # Check committed data and deterministic region generation
npm run test:advisories  # High/critical npm advisory gate
npm run preview        # Preview production build
npm run lint           # ESLint
npm run typecheck      # TypeScript app + node configs
npm test               # Jest unit tests
npm run test:e2e       # Playwright SDK-double suite (CI)
npm run test:e2e:ui    # Playwright UI mode
```

Jest is configured with `watchman: false` so sandbox and CI runs do not depend
on user-level Watchman state.

Dependency advisories: production (`npm audit --omit=dev`) must stay clean.
High and critical development findings need a compatible update or a dated
exception in [`docs/security/advisory-exceptions.json`](docs/security/advisory-exceptions.json).
See [`docs/security/advisory-review.md`](docs/security/advisory-review.md). Do
not run `npm audit fix --force`.

## Project Structure

```text
src/
  components/     React UI and map components
  hooks/          useMapData and useSearch
  data/           Program processing, TXHSA region processing, county lookup
  utils/          Geometry and map helpers
  types/          Shared TypeScript types
  styles/         Design-system CSS
  e2e/            Playwright specs: SDK-double suite plus opt-in live smoke

scripts/
  build-txhsa-regions.ts
  source/tx-counties.geojson

public/
  assets/geojson/headStartPrograms.json
  assets/txhsa-geojson/{west,north,east,south}.geojson
  images/

docs/
  brainstorms/
  plans/
  solutions/
```

## Data

### Head Start Programs

The supplied source has 86 legacy rows and 85 distinct name/address/coordinate
tuples after exact deduplication. Type, grantee and funding are not inferred.
The owner identifies the runtime JSON as the original source.
[Snapshot metadata](public/assets/geojson/headStartPrograms.metadata.json)
records its checksum, ownership, duplicate audit and explicit missing
reporting/acquisition dates and geocoding provenance. Funding documents are
unavailable, so figures are withheld. See
[the data contract and refresh requirements](public/data-provenance.md).

Runtime data lives at:

```text
public/assets/geojson/headStartPrograms.json
```

The app loads this file through `src/hooks/useMapData.tsx` and processes records
with helpers in `src/data/headStartPrograms.ts`.

### TXHSA Regions

Runtime region files live at:

```text
public/assets/txhsa-geojson/west.geojson
public/assets/txhsa-geojson/north.geojson
public/assets/txhsa-geojson/east.geojson
public/assets/txhsa-geojson/south.geojson
```

These files are generated by:

```text
scripts/build-txhsa-regions.ts
```

Inputs:

- `scripts/source/tx-counties.geojson` - build-only Texas county boundaries
- `src/data/tdemCountyRegions.ts` - county -> TDEM lookup, TDEM -> TXHSA merge mapping, and TXHSA county overrides

Regenerate region files after changing the county source, TDEM lookup, merge
mapping, or override map:

```bash
npm run build:regions
npm run test:data
```

## TXHSA Region Membership

Region membership is county-level. A listed location is counted in a
project-defined TXHSA region based on the generated geometry containing its
coordinates. Counts respect polygon holes and are withheld if any location
matches zero or multiple regions; shared boundary locations require an explicit
decision. Unsourced funding figures remain withheld until measure, units,
period, source and methodology are confirmed.

The region build has three layers:

1. `tdemCountyRegions` records the factual county -> TDEM region number.
2. `tdemToTxhsaRegion` maps the eight TDEM regions into West, North, East, and South.
3. `txhsaCountyOverrides` assigns specific counties directly to a TXHSA region when the TXHSA overlay intentionally differs from the broad TDEM mapping.

Do not rewrite a county's TDEM number to force a TXHSA overlay change. Use
`txhsaCountyOverrides` for deliberate county-level exceptions, then regenerate
the GeoJSON.

The build script fails if:

- A county in `scripts/source/tx-counties.geojson` is missing from `tdemCountyRegions`.
- A key in `txhsaCountyOverrides` does not match a county in the source.
- A real build leaves any of the four TXHSA regions empty.

## Testing

Run all Jest tests:

```bash
npm test
```

Validate committed data, metadata and deterministic region generation (also in CI):

```bash
npm run test:data
```

Run focused region tests:

```bash
npm test -- scripts/__tests__/build-txhsa-regions.test.ts src/hooks/useMapData.test.ts
```

Run typecheck, lint, and production build:

```bash
npm run typecheck
npm run lint
npm run build
```

Playwright's default suite intercepts the Google Maps SDK and runs in CI.
It covers initialization, search/details, layer toggles, region failure/retry,
and mobile details. A live Google Maps smoke test is opt-in
(`LIVE_GOOGLE_MAPS=1`) and is not run in CI, including on fork PRs.
See `src/e2e/README.md`.

## Development Notes

- TXHSA Regions are off by default; Head Start program markers are on by default.
- Region GeoJSON may be `Polygon` or `MultiPolygon`; the runtime handles both.
- Large generated GeoJSON diffs are best reviewed through source changes plus
  build/test output rather than line-by-line coordinate inspection.
- `src/hooks/useMapData.test.ts` may emit existing React `act(...)` warnings
  while still passing.
- Keep `.env.local` out of git.
