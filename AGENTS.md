# Texas Head Start Interactive Map - Agent Guide

## Project Snapshot

This is a React 18 + TypeScript + Vite app for visualizing Texas Head Start and
Early Head Start federal grantee programs on Google Maps. It also renders the
four TXHSA regions (West, North, East, South) as dissolved county polygons.

Core runtime areas:
- `src/components/TexasMap.tsx` renders Google Maps, program markers, TXHSA
  region overlays, and region/program info windows.
- `src/hooks/useMapData.tsx` loads program and region data, manages layer
  visibility, and computes per-region program counts.
- `src/hooks/useSearch.ts` searches programs by name, address, and grantee.
- `src/data/txhsaRegions.ts` validates/processes committed region GeoJSON.
- `src/data/tdemCountyRegions.ts` maps counties to TDEM regions and defines
  TXHSA-specific county overrides.

## Commands

```bash
npm run dev            # Start Vite dev server
npm run build          # Production build
npm run build:regions  # Regenerate committed TXHSA region GeoJSON
npm run preview        # Preview production build
npm run lint           # ESLint
npm run typecheck      # TypeScript app + node configs
npm test               # Jest unit tests
npm run test:e2e       # Playwright, currently no checked-in tests
npm run test:e2e:ui    # Playwright UI mode
```

If Jest fails because Watchman cannot access user-level state in a sandbox, run
targeted tests with `--watchman=false`, for example:

```bash
npm test -- --watchman=false scripts/__tests__/build-txhsa-regions.test.ts
```

## Environment

Runtime map rendering requires:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GOOGLE_MAPS_MAP_ID=your_optional_map_id_here
```

Keep `.env.local` local only. Vite exposes only variables prefixed with
`VITE_`, and the dev server must be restarted after changing them.

## Data Sources

Program data:
- Runtime file: `public/assets/geojson/headStartPrograms.json`
- Processing helpers/tests: `src/data/headStartPrograms.ts` and
  `src/data/headStartPrograms.test.ts`

TXHSA region data:
- Committed runtime outputs:
  - `public/assets/txhsa-geojson/west.geojson`
  - `public/assets/txhsa-geojson/north.geojson`
  - `public/assets/txhsa-geojson/east.geojson`
  - `public/assets/txhsa-geojson/south.geojson`
- Build-only county source: `scripts/source/tx-counties.geojson`
- Build script: `scripts/build-txhsa-regions.ts`
- County lookup and overrides: `src/data/tdemCountyRegions.ts`

Do not manually edit the committed region GeoJSON unless you are repairing a
generated-file problem. Normal region membership changes should update
`src/data/tdemCountyRegions.ts`, then run `npm run build:regions`.

## TXHSA Region Rules

The region build has three layers:

1. `tdemCountyRegions` is the factual county -> TDEM region lookup. Do not
   rewrite TDEM numbers to force a TXHSA presentation change.
2. `tdemToTxhsaRegion` maps the eight TDEM regions into the four TXHSA regions.
3. `txhsaCountyOverrides` is the narrow exception layer for specific counties
   that should belong to a different TXHSA region than the broad TDEM mapping.

Use `txhsaCountyOverrides` for deliberate county-level exceptions. The build
script validates that override keys match real source county names, so spelling
must match the county source with `" County"` stripped, such as `San Jacinto`
and `La Salle`.

Current override intent includes these counties assigned to East:
- `Houston`
- `Shelby`
- `Nacogdoches`
- `Polk`
- `San Jacinto`
- `Smith`
- `Trinity`
- `Jefferson`
- `Orange`

County-level overrides move every program in that county for region-count
purposes. They are not program-level exceptions.

## Testing Notes

Jest unit tests are checked in across components, hooks, data processing,
geometry, map helpers, and the TXHSA build script.

Playwright infrastructure exists, but no E2E tests are currently checked in.
See `src/e2e/README.md` before reintroducing tests; it documents the intended
future coverage and the previous stale-suite failure modes.

For TXHSA region changes, run at least:

```bash
npm run build:regions
npm test -- --watchman=false scripts/__tests__/build-txhsa-regions.test.ts src/hooks/useMapData.test.ts
npm run typecheck
npm run lint
npm run build
```

If the browser experience is relevant, start `npm run dev` and verify the app
loads with the map, program markers, and TXHSA Regions toggle. The map requires
a valid Google Maps API key.

## Code Conventions

- Components use PascalCase filenames under `src/components/`.
- Hooks use `use*` names under `src/hooks/`.
- Tests generally live beside the source file with `.test.ts` or `.test.tsx`.
- Prefer existing React/Tailwind patterns over new abstractions.
- Keep nullable state explicit with `null` rather than implicit `undefined`.
- Use `useCallback` for handlers passed to child components when it matches
  local patterns.
- Preserve accessibility attributes on controls and dynamic status content.

## Known Caveats

- Region overlays default off; program markers show by default.
- Region GeoJSON can be `Polygon` or `MultiPolygon`; runtime code handles both.
- A county missing from `tdemCountyRegions` intentionally fails the build.
- A typo in `txhsaCountyOverrides` intentionally fails the build.
- Large generated GeoJSON diffs are usually best reviewed by checking source
  changes plus build/test output, not by reading minified coordinate diffs.
- `src/hooks/useMapData.test.ts` may emit existing React `act(...)` warnings
  while still passing.
