---
date: 2026-05-19
topic: txhsa-regions-overlay
---

# TXHSA Regions Overlay (replacing District Boundaries)

## Summary

Replace the 36-polygon Congressional District overlay with a 4-polygon TXHSA Regions overlay (`west`, `north`, `east`, `south`) sourced by merging Texas county geometries per the TDEM-8 region map. The layer toggle is renamed "District Boundaries" → "TXHSA Regions". Clicking a region opens an info card with the region name and the count of Head Start / Early Head Start programs inside it. All code, configuration, and data tied to the prior district overlay (Congress.gov API, representative-name search, district info card, and the 36 `TX-{N}/shape.geojson` directories) is removed in the same change.

---

## Problem Frame

The map currently shows Texas Congressional Districts (TX-1 through TX-36) as a togglable overlay. Each district loads its own geojson file, the toggle is labeled "District Boundaries", and clicking a district reveals representative information enriched by a live Congress.gov API call. For a Head Start program audience — state policymakers, TXHSA staff, regional coordinators — congressional districts are the wrong unit of analysis. The relevant geographic frame is the TXHSA region (a roll-up of TDEM's eight emergency-management regions into four directional quadrants), which is how the Head Start network is actually organized. The current overlay drives the map's geographic narrative toward representatives and party affiliation, when the audience needs to think in regions and the programs inside them.

---

## Requirements

**Overlay data**
- R1. Four new geojson files are created at `public/assets/txhsa-geojson/{west,north,east,south}.geojson`. Each file is a single Polygon or MultiPolygon feature with a `name` property (`"West"`, `"North"`, `"East"`, `"South"`).
- R2. Region geometry is produced by assigning each Texas county to one of the eight TDEM regions per the TDEM-8 map (`public/images/tdem-8-regions.png`, source: tdem.texas.gov/regions), then dissolving counties per the merge mapping below.
- R3. The merge mapping is fixed: `west` = TDEM regions 1 + 7; `north` = 2 + 3; `east` = 8 + 4; `south` = 6 + 5.
- R4. The dissolved polygons accurately follow Texas county boundaries (no hand-traced lines, no gaps between adjacent regions, no overlap).

**Overlay rendering and toggle**
- R5. The layer toggle label is "TXHSA Regions" (replaces "District Boundaries"). The toggle's title attribute and any associated ARIA labels are updated to match.
- R6. The `LayerVisibility` state key currently named `districtBoundaries` is renamed to reflect TXHSA Regions, and all references in components, hooks, and tests are updated.
- R7. When the toggle is on, all four region polygons render on the map. When off, none render. The toggle's default state is off (matching today's district behavior).
- R8. The four regions are visually distinguishable from one another (distinct fill colors / labels). Styling is consistent with the existing design system; the specific palette is a planning decision.

**Region info card**
- R9. Clicking a region polygon opens an info window showing the region's name (`"West"`, `"North"`, `"East"`, `"South"`) and the count of Head Start / Early Head Start programs whose coordinates fall inside that region's polygon.
- R10. Program counts are computed against `headStartPrograms.json` using point-in-polygon against the region geometry. A program counted in one region must not be counted in any other.
- R11. The info card does not show representative information, party, contact details, photos, or committees — those concepts are removed with the district overlay.

**Cleanup of the prior district stack**
- R12. The Congress.gov API integration is removed: `src/api/congress.ts`, the `loadCongressionalData` flow in `useMapData`, the `getCongressApiKey` validator branch, and any `CongressDataDebug` component or import.
- R13. The representative-name / district-number search branch in `useSearch` is removed. Search continues to cover Head Start programs; it no longer covers districts or representatives.
- R14. The 36 `public/assets/geojson/TX-{1..36}/` directories and their `shape.geojson` files are deleted from the repo.
- R15. The `VITE_CONGRESS_API_KEY` environment variable is removed from documentation (`CLAUDE.md`, `README.md`, any `.env.example`) and from validator code.
- R16. Types tied to congressional districts (`CongressionalDistrictFeature`, `CongressionalDistrict`, `CongressApiMember`, etc.) and the data processor `src/data/congressionalDistricts.ts` are removed. New types are introduced for TXHSA regions.
- R17. Tests that exercised the district overlay, Congress.gov integration, or representative search are updated or removed so the suite is green and reflects the new behavior. Coverage of the new region overlay and info card is added.

---

## Acceptance Examples

- AE1. **Covers R5, R7.** Given the app has just loaded with the default layer state, when the user opens the map controls, then the "TXHSA Regions" toggle is visible and off; no region polygons are rendered.
- AE2. **Covers R7.** Given the "TXHSA Regions" toggle is off, when the user enables it, then all four region polygons (west, north, east, south) render on the map with distinct fills.
- AE3. **Covers R9, R10.** Given the overlay is on, when the user clicks the south region polygon, then an info window opens showing `"South"` and the integer count of Head Start / Early Head Start programs whose coordinates lie inside the south polygon.
- AE4. **Covers R10.** Given a program's coordinates lie inside the east region, when region counts are computed, then that program contributes to east's count and to no other region's count.
- AE5. **Covers R11.** Given the user clicks any region polygon, when the info window renders, then it contains no representative name, party, photo, contact, or committee field.
- AE6. **Covers R13.** Given the user types a former representative's name into the search bar, when the search runs, then the search returns only Head Start program matches (if any) — no district or representative results.

---

## Success Criteria

- A policymaker viewing the map can identify which of the four TXHSA regions a Head Start program sits in, and can see the total program count per region by clicking each one.
- The codebase contains no references to congressional districts, representatives, Congress.gov, or `TX-{N}/shape.geojson` paths after the change — `grep` for those terms returns only historical entries (e.g., this brainstorm doc, git history).
- `npm run lint`, `npm test`, and `npm run build` all pass; the production bundle no longer includes Congress.gov API client code.
- A downstream implementer (or ce-plan agent) can begin work without re-deciding what the overlay shows on click, how the geojson files are constructed, or which prior code stays in the repo.

---

## Scope Boundaries

- The un-merged 8-region overlay is not built — only the four merged polygons ship.
- Per-county or sub-region granularity is not exposed — there is no drill-down from a region to its counties.
- Drilling from a region to the individual Head Start programs inside it is not part of this work; the info card shows a count, not a list.
- The overlay does not surface TXHSA-specific program data, demographics, funding totals, or population statistics — only the program count.
- The search bar is not extended to support region-name search as a new feature; if region names happen to fall out of the existing program-search infrastructure that is fine, but it is not a requirement.
- The 36-district overlay is not preserved behind a feature flag or as a togglable alternative — it is removed.

---

## Key Decisions

- **County-merge over hand tracing for region geometry.** Boundaries snap to real county lines, and the build is reproducible from a single county→region lookup table rather than relying on a one-off trace of the PNG.
- **Region info card shows program count, not counties list.** Counties-per-region would be verbose (some regions cover 50+ counties) and the program count ties the overlay back to the app's core purpose.
- **Full removal of the district stack, not dormant code.** Congress.gov integration, representative search, district types, and the 36 `TX-{N}/shape.geojson` directories all go in the same change. No deprecated paths, no commented-out branches.
- **Default visibility for the new overlay is off.** Matches today's district behavior. Can be flipped on a later iteration if first-load context warrants it.
- **Region filenames are lowercase (`west.geojson` etc.); display labels are Title Case (`"West"` etc.).** Matches the user's stated filename convention while keeping the UI conventional.

---

## Dependencies / Assumptions

- A Texas-counties geojson source (e.g., US Census TIGER, Texas open-data portal) is available and licensed for use in this project. Selection of the specific source is a planning decision.
- A county→TDEM-region assignment table is needed (~254 counties → one of 8 regions). The TDEM-8 map at `public/images/tdem-8-regions.png` is the source of truth for this assignment; an authoritative published list from tdem.texas.gov may be used if one exists.
- The point-in-polygon utility in `src/data/congressionalDistricts.ts` (`isPointInPolygon`, `isPointInSinglePolygon`, `isPointInMultiPolygon`) can be ported or replaced; planning will decide whether to keep these as shared utilities under a different module name.
- `headStartPrograms.json` continues to be the source of program coordinates; no schema change is assumed.
- The toggle UI in `src/components/MapControls.tsx` is the only entry point for showing/hiding the overlay — no URL parameter or persisted preference is in scope.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R2, R3][Needs research] Is there an authoritative published county→TDEM-region assignment list at tdem.texas.gov or a Texas open-data portal, or does the assignment need to be transcribed from the PNG by hand into a lookup table?
- [Affects R4][Technical] Which Texas-counties geojson source and which dissolve tool (mapshaper, turf.js `union`, a build-time script, etc.) produces clean merged polygons with no slivers between adjacent counties?
- [Affects R8][Technical] What color palette differentiates the four regions while remaining consistent with the app's existing Texas-themed design system?
- [Affects R10][Technical] Where does the point-in-polygon computation live — at load time (cached per region), at render time, or pre-computed offline and baked into a static counts file?
