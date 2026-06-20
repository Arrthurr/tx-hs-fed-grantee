---
title: "feat: Show total funded amount in TXHSA region info window"
type: feat
status: completed
created: 2026-05-21
plan_depth: lightweight
---

# feat: Show total funded amount in TXHSA region info window

## Summary

Add a second line to the TXHSA region info window that reports the total funded amount for that region. The values are a fixed, region-keyed lookup supplied by the user (West: 11,857; North: 12,311; East: 15,360; South: 19,049). The number renders verbatim with a thousands separator — no currency symbol, no unit suffix, no scaling — directly below the existing program-count line.

## Problem Frame

Today the region info window in `src/components/TexasMap.tsx` shows only the region name plus a sentence like `"14 Head Start / Early Head Start programs in this region."` (see `src/components/TexasMap.tsx:317`). Stakeholders viewing the map want a second region-level signal — total funded amount — alongside the program count, without leaving the info window.

The funded amounts are not derived from program data or fetched from an API in this iteration; they are a static authored lookup, treated the same way the region overlay treats `TXHSA_REGION_NAMES` and the region fill colors.

## Scope Boundaries

In scope:
- A static, region-keyed funded-amount lookup, colocated with the existing region constants in `src/data/txhsaRegions.ts`.
- Rendering that value as a new line in the region info window, in the format `"Total funded amount: <comma-separated number>"`.
- Test coverage that asserts the new line appears with the correct value for the region clicked.

Explicitly out of scope:
- Computing funded amounts from per-program funding data.
- Currency formatting (no `$`), unit suffixes (no `K`/`M`), or locale-aware number formatting beyond a thousands separator.
- Surfacing per-region funding history, demographics, or any other new region metadata.
- Adding the funded amount to the search index or to per-program info windows.

### Deferred to Follow-Up Work
- None.

## Origin and Prior Decisions

The TXHSA Regions overlay shipped from [docs/brainstorms/txhsa-regions-overlay-requirements.md](../brainstorms/txhsa-regions-overlay-requirements.md) and [docs/plans/2026-05-19-001-feat-txhsa-regions-overlay-plan.md](2026-05-19-001-feat-txhsa-regions-overlay-plan.md). That brainstorm's Scope Boundaries explicitly excluded funding totals from the region info window:

> "The overlay does not surface TXHSA-specific program data, demographics, funding totals, or population statistics — only the program count."

This plan deliberately reverses that one boundary, narrowly, by adding a single funded-amount line. Other excluded fields from R11 of the prior brainstorm (representative info, party, contact, photos, committees) remain out of scope.

## Requirements

- R1. The region info window in `src/components/TexasMap.tsx` renders a new line directly under the existing program-count line, with the exact label `"Total funded amount: "` followed by the region's funded-amount value.
- R2. The funded-amount value renders verbatim with a thousands separator and no currency symbol or unit suffix. Concretely: West → `11,857`, North → `12,311`, East → `15,360`, South → `19,049`.
- R3. The funded-amount values live in a single, exported lookup keyed by `TxhsaRegionName` (see `src/types/maps.ts:110`), colocated with `TXHSA_REGION_NAMES` in `src/data/txhsaRegions.ts`. Adding or correcting a value requires editing exactly one constant.
- R4. The existing program-count line continues to render unchanged, including its loading and singular/plural variants (`src/components/TexasMap.tsx:319`).
- R5. The new line is part of the same `InfoWindow` content block — no separate modal, no extra layer toggle, no schema change to the geojson files.

## Key Technical Decisions

- **Static authored constant, not derived data.** The user supplied the four numbers as authoritative. Computing a funded total from `headStartPrograms.json` (which has a `funding` field for some entries) would risk a divergent number for a v1 that is supposed to match the user's figures exactly.
- **Lookup lives in `src/data/txhsaRegions.ts`, not inline in `TexasMap.tsx`.** That file already owns region-name and region-feature concerns and is imported by both the component and `useMapData`. Inlining in the component would leak data ownership into a presentation file.
- **Render with `Number.prototype.toLocaleString('en-US')` (or equivalent) for the thousands separator.** This produces `11,857` from `11857` without pulling in a formatting helper. `formatCurrency` in `src/utils/mapHelpers.ts` is not reused because it injects `$` and decimals — the user explicitly chose the "no unit" format.
- **No new hook surface.** The lookup is a pure constant; the component imports it directly. The `useMapData` hook continues to own only data that requires async loading or derivation.
- **No loading state for the funded amount.** Unlike `regionProgramCounts` (which is `null` until programs and regions both load), the funded amount is available synchronously at module load. It can render immediately even if the program count is still showing `"Loading program count…"`.

## Implementation Units

### U1. Add the funded-amount lookup

**Goal:** Introduce a single, typed, region-keyed constant that holds the four authored funded amounts.

**Requirements:** R2, R3.

**Dependencies:** None.

**Files:**
- `src/data/txhsaRegions.ts` (modify — add export)
- `src/data/txhsaRegions.test.ts` (modify — add coverage)

**Approach:**
- Export a `REGION_FUNDED_AMOUNTS: Record<TxhsaRegionName, number>` constant in `src/data/txhsaRegions.ts`, sitting next to `TXHSA_REGION_NAMES`.
- Values: `{ West: 11857, North: 12311, East: 15360, South: 19049 }`. Store as raw integers; formatting is the renderer's responsibility (keeps the constant readable and unit-agnostic).
- A short comment above the constant should record that the values are authored figures supplied by the product owner, not derived from `headStartPrograms.json`, so a future maintainer does not try to "fix" them by computing from program data.

**Patterns to follow:** The shape and placement of `TXHSA_REGION_NAMES` in the same file. Use `Record<TxhsaRegionName, ...>` for exhaustiveness, the same pattern `REGION_FILL_COLORS` uses in `src/components/TexasMap.tsx:36`.

**Test scenarios:**
- Happy path: the export contains exactly the four region keys (`West`, `North`, `East`, `South`) and the values match the authored numbers above. A single `toEqual` against the literal object is sufficient.
- Edge case: TypeScript exhaustiveness — if a future maintainer adds a new `TxhsaRegionName`, the `Record<TxhsaRegionName, number>` type will fail compilation if the lookup is not updated. This is enforced at the type system level, not via a runtime test.

**Verification:** `npm test -- src/data/txhsaRegions.test.ts` passes; `npm run lint` clean.

### U2. Render the funded amount in the region info window

**Goal:** Add a second line under the existing program-count line in the TXHSA region info window, showing `"Total funded amount: <value>"` with a thousands separator and no unit.

**Requirements:** R1, R2, R4, R5.

**Dependencies:** U1.

**Files:**
- `src/components/TexasMap.tsx` (modify — extend `renderRegionInfoWindow`)

**Approach:**
- Import `REGION_FUNDED_AMOUNTS` from `src/data/txhsaRegions.ts`.
- Inside `renderRegionInfoWindow` (`src/components/TexasMap.tsx:317`), after the existing `<p>` that renders `countCopy`, add a second `<p>` (or another text node within the same container) showing `Total funded amount: ${REGION_FUNDED_AMOUNTS[region.name].toLocaleString('en-US')}`.
- Match the typographic treatment of the existing count line (`text-sm text-gray-700`). The line should sit immediately below the count, with appropriate vertical spacing (`mt-1` or sibling `<p>` — match whatever produces a clean visual stack with the existing card padding).
- Do not change the loading or singular/plural copy of the count line.

**Patterns to follow:** The existing `<p className="text-sm text-gray-700">{countCopy}</p>` at `src/components/TexasMap.tsx:336`. Keep both lines inside the same `max-w-sm p-4 bg-white rounded-lg shadow-lg` card.

**Test scenarios:** *(see U3 — all info-window assertions belong with the existing region info-window test.)*

**Verification:** Manually open the dev server (`npm run dev`), toggle the TXHSA Regions layer on, click each of the four regions, and confirm the second line shows the expected value with a comma separator and no `$` or unit suffix.

### U3. Extend region info-window test coverage

**Goal:** Lock in that the region info window renders the funded-amount line with the right text and value for the region clicked.

**Requirements:** R1, R2, R4.

**Dependencies:** U2.

**Files:**
- `src/components/TexasMap.test.tsx` (modify — extend the existing region info-window tests)

**Approach:**
- Find the existing `'renders a region info window with name and program count when a region is clicked'` test (`src/components/TexasMap.test.tsx:282`) and the singular-program follow-up (`src/components/TexasMap.test.tsx:338`).
- In the multi-program case, add an assertion that the info window also contains `'Total funded amount: 19,049'` (matching the South region used by that test).
- Add or extend a case that clicks a different region (e.g., West) and asserts `'Total funded amount: 11,857'`, to prove the value is region-specific rather than a hardcoded string.
- Do not change the existing program-count assertions — they should keep passing as-is, proving R4 (the count line is unchanged).

**Test scenarios:**
- Covers R1, R2 (South region): clicking the South region opens an info window that contains both `'South'`, the existing program-count copy, and `'Total funded amount: 19,049'`.
- Covers R2 (per-region value): clicking the West region opens an info window containing `'Total funded amount: 11,857'`, demonstrating the value is selected from the lookup by region name.
- Covers R4: the existing program-count assertions (`'7 Head Start / Early Head Start programs in this region.'` and the singular `'1 Head Start / Early Head Start program in this region.'`) continue to pass without modification.

**Verification:** `npm test -- src/components/TexasMap.test.tsx` passes; full `npm test` suite remains green; `npm run lint` clean.

## System-Wide Impact

- **Component surface:** `TexasMap.tsx` only — no changes to `MapControls`, `SearchBar`, `useSearch`, or `App.tsx`.
- **Data surface:** `src/data/txhsaRegions.ts` adds one exported constant; the four geojson files in `public/assets/txhsa-geojson/` are not touched; `headStartPrograms.json` is not touched.
- **Hook surface:** `useMapData` is unchanged. The funded amount is static, so it does not need to flow through async loading state.
- **Accessibility:** The new line is plain text inside the same info window; existing screen-reader behavior continues to read both lines in document order. No new ARIA labels are required.
- **Performance:** Adding a single text node per info window has no measurable cost. The constant is module-scoped and tree-shaken into the same chunk as the rest of the region code.

## Risks and Considerations

- **Authored-figure drift.** Because the values are authored, not derived, they can fall out of sync with reality. The comment added in U1 plus this plan document is the audit trail. If the authoritative source becomes the per-program `funding` field in `headStartPrograms.json`, a follow-up plan should switch to derivation — that is a separate decision, not part of this scope.
- **Ambiguity for end users.** The number renders without a `$` or unit suffix per the user's explicit choice. A reader unfamiliar with the source may misread it. If user testing later shows confusion, a follow-up can add a unit or a tooltip — keep this change minimal and reversible.
- **Test stability.** The existing region info-window test fixtures (`src/components/TexasMap.test.tsx`) drive the test through the South and (singular case) other regions. Asserting the funded amount in both cases keeps the test value-grounded; if a future plan changes the authored numbers, exactly one test value needs updating per case.

## Verification Plan

1. `npm test` — all suites green, including the extended `TexasMap.test.tsx` and `txhsaRegions.test.ts` cases.
2. `npm run lint` — clean.
3. `npm run dev` — manually toggle the TXHSA Regions layer on, click each of the four regions in turn, and confirm:
   - The region name and program-count line continue to render exactly as before.
   - A second line `Total funded amount: <value>` appears immediately below, with the values `11,857` (West), `12,311` (North), `15,360` (East), `19,049` (South).
   - The number formatting matches: comma thousands separator, no `$`, no unit suffix.
4. `npm run build` — production build succeeds.
