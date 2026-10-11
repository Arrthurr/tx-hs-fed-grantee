# Map loading performance (issue #17)

What changed for geographic payloads, map loading and dense-marker
readability, what was measured, and what was not.

## Conditions

- Measured 2026-10-07 in an Amp orb (Linux x64, Node 22.22.0 for builds and
  dev servers), not on an end-user device or network.
- App bundles: `vite build` output under `dist/assets`. Raw bytes from
  `wc -c`; gzip from `gzip -9c | wc -c`. The baseline is commit `531a656`.
  Building that commit with Node 22 and Node 26 produced identical hashes.
- Region GeoJSON: committed files in `public/assets/txhsa-geojson/`, and the
  production site fetched with `curl -H 'Accept-Encoding: br, gzip'`.
- Google SDK: headless Chromium against local `vite` dev servers (baseline
  vs. this change), cache disabled, with Chrome DevTools Protocol
  `encodedDataLength` per response. The orb's browser key rejects localhost
  (`RefererNotAllowedMapError`). The SDK loads its modules, then reports an
  authorization failure, so no map tiles or markers render. Those runs give
  SDK module bytes up to the point of failure. They do not measure time to a
  usable map.

## Before / after

### App bundles (production build)

| Asset | Before raw | Before gzip | After raw | After gzip |
| --- | ---: | ---: | ---: | ---: |
| `maps-vendor-*.js` (vis.gl + MarkerClusterer after) | 168,314 | 53,729 | 190,328 | 61,208 |
| `App-*.js` | 38,118 | 10,457 | 39,973 | 10,999 |
| `ui-vendor-*.js` | 11,471 | 4,647 | 11,664 | 4,683 |
| `index-*.js` | 4,484 | 2,155 | 4,441 | 2,123 |
| `react-vendor-*.js` (empty chunk) | 51 | 96 | 1 | 46 |
| `index-*.css` | 29,205 | 6,164 | 29,263 | 6,180 |
| **JS total** | **222,438** | **71,084** | **246,407** | **79,059** |
| Source maps (`*.map`) emitted | 703,200 (5 files) | – | 0 | – |

The clustering dependency (`@googlemaps/markerclusterer@2.6.2` plus
`supercluster`/`kdbush`) adds about 22 KB raw / 7.5 KB gzip to the
`maps-vendor` chunk. Production builds no longer publish source maps.

### Geographic assets (unchanged)

| Region file | Uncompressed (committed) | gzip -9 (local) | Production `br` body |
| --- | ---: | ---: | ---: |
| west.geojson | 451,843 | 147,761 | 147,788 |
| north.geojson | 615,714 | 200,934 | 200,195 |
| east.geojson | 560,143 | 185,964 | 185,277 |
| south.geojson | 768,823 | 256,637 | 257,669 |
| **Total** | **2,396,523** | **791,296** | **790,929** |

Production responses carried `content-encoding: br` and
`cache-control: public,max-age=0,must-revalidate` with an ETag. Netlify
already Brotli-compresses GeoJSON; this change does not add compression.
Committed region files are byte-identical before and after
(`git diff -- public/assets/txhsa-geojson` is empty).

### Google Maps SDK (partial, authorization-failure runs)

These are SDK module bytes before the key was rejected. Three runs per
variant returned identical totals.

| | Before | After |
| --- | ---: | ---: |
| `libraries=` URL parameter | `places,geometry` | (empty) |
| SDK JS modules, encoded | 565.3 KiB | 443.6 KiB |
| All Google-host responses, encoded | 627.2 KiB (21 requests) | 505.3 KiB (18 requests) |

Per module: `places.js` (93,013 B), `places_impl.js` (3,740 B) and
`geometry.js` (2,955 B) are no longer fetched, a total of 99,708 B.
MarkerClusterer adds `overlay.js` (1,293 B). The before runs also fetched
`controls.js` (26,568 B) and the after runs did not. That difference is
probably caused by the authorization-failure path, not this change, so it
is not counted as a saving. Verify with a localhost-allowed key or after
deploy.

### Usable-map time

Not measured. No key available in this orb allows localhost, and the
Playwright suite uses an SDK test double. This document claims no speedup.
After deploy, compare time to first marker/cluster and total SDK transfer
on the production origin.

## Decisions

### Eager region loading is kept

`useMapData` fetches all four region files in parallel on mount, together
with program data. Turning the overlay on does not start the first load.
Region counts, region buttons and region details need geometry whether or
not the overlay is visible. Deferring the load would make those features
wait or show partial data, and would break all-or-nothing region loading.
At about 0.79 MB Brotli the cost is real, so it is documented rather than
hidden.

### No geometry simplification

The tolerance is none. Region geometry is not rounded, simplified or
regenerated. Program-to-region counts are published only when every
location matches exactly one region. Simplifying shared county edges can
create gaps or overlaps, which would withhold counts or move locations to
different regions. Fixing the size would need a reviewed change to the
generator, not a runtime shortcut.

### Marker clustering

- `ProgramMarkers` renders every location as an `AdvancedMarker` (same
  `marker-headstart` "+" pin) and gives the actual marker instances to one
  `MarkerClusterer` per map instance (`SuperClusterAlgorithm`, library
  defaults).
- Cluster markers are green count circles. Their accessible name is
  "N Head Start locations. Select to zoom in." and they set `gmpClickable`,
  so they are focusable. Selecting one uses the library default and fits
  the map to its members.
- Hiding the programs layer unmounts `ProgramMarkers`. That clears cluster
  membership and detaches the clusterer and every marker.
- Tradeoff: at statewide zoom, nearby locations are hidden inside clusters
  until the user zooms in. Coincident locations stay clustered until past the
  clustering max zoom and then stack. Individual locations remain reachable
  through search: selecting a result opens details outside the map and pans
  to zoom 12 even when that location is clustered. Focus returns to the
  result after closing details.
- Cost: about 7.5 KB gzip of app JS and a 1.3 KB SDK `overlay` module.

### Unused Maps libraries removed

`APIProvider` now gets a stable empty `libraries` array. Search
(`useSearch`) and point-in-polygon (`src/utils/geometry.ts`) run locally,
so the code never used `places` or `geometry`. `AdvancedMarker` still loads
`marker` on demand.

### Statewide framing

The fixed western `defaultCenter`/`defaultZoom` is replaced by `Map`
`defaultBounds` for Texas (`west -106.65, east -93.50, south 25.84,
north 36.50`, 24 px padding). vis.gl applies `defaultBounds` once, when the
map instance is created. It is not reapplied on data, selection or viewport
changes, so a camera set by search selection is not overwritten. A
"Show all Texas" button in the directory panel (44 px minimum height) refits
the same bounds on request.

### Dev cache `no-store`

The Vite dev server previously sent `Cache-Control: public,
max-age=31536000`, so browsers could keep stale modules and GeoJSON across
restarts. It now sends `no-store`. This affects only local development.
Production caching comes from the host.

### Production source maps off

`build.sourcemap` is `false`. This removes about 0.7 MB of `.map` files from
the deploy and stops publishing original source.

## Residual risks

- No live Maps load was verified in the orb. After deploy, check that
  markers, clusters, cluster click-to-zoom, cluster keyboard focus and
  "Show all Texas" work with the production key.
- Production GeoJSON is served with `max-age=0,must-revalidate`, so repeat
  visits revalidate with ETags (304s) instead of using a long-lived cache.
- Cluster keyboard access depends on the Google SDK making
  `gmpClickable` advanced markers focusable. The SDK test double cannot
  prove this.
