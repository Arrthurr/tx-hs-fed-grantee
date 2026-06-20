---
title: "Per-county override layer: deviating from an authoritative upstream lookup without rewriting it"
date: 2026-05-28
category: architecture-patterns
module: map-overlays
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "A build step groups items by a factual upstream value but a few items need a different grouping than the source dictates"
  - "Tempted to edit an authoritative upstream lookup to force a desired output"
  - "Adding an override/exception map resolved via override-wins-over-default"
  - "A silent fall-through on a typo'd key could ship wrong output with no error"
  - "Extending a build script that already exposes injectable options for testability"
tags: [build-time, geojson, data-pipeline, override-layer, fail-loud, source-of-truth, testability]
related_components:
  - tooling
  - documentation
  - development_workflow
---

# Per-county override layer: deviating from an authoritative upstream lookup without rewriting it

## Context

The TXHSA region overlay derives its four polygons (West / North / East / South) by dissolving Texas counties into groups at build time (`scripts/build-txhsa-regions.ts`). County membership is resolved from two distinct kinds of data in `src/data/tdemCountyRegions.ts`:

- **`tdemCountyRegions`** — each county → its TDEM disaster region number (1–8). This is an *authoritative upstream fact* mirrored from tdem.texas.gov. Standing rule: do not rewrite it.
- **`tdemToTxhsaRegion`** — maps the 8 TDEM regions → the 4 TXHSA regions. This is a *presentation/grouping decision*, not a fact.

A request came in to "move six Head Start programs from North to East." Region membership is county-level, not program-level, so the six programs resolved to 5 counties (Shelby, Nacogdoches, Polk, Jefferson, Orange) — all TDEM region 3, which `tdemToTxhsaRegion` routes to North by default.

The friction: the only existing levers were the factual `tdemCountyRegions` table or the categorical `tdemToTxhsaRegion` mapping. Editing the first **corrupts upstream truth**; editing the second would mis-route *every* region-3 county, not just these five. Neither could express "these specific counties are a deliberate exception."

(A prerequisite audit was run first: the programs JSON was checked to confirm only the intended programs fell in those 5 counties — a county-level move relocates *all* programs in the county, not just the named ones.)

## Guidance

### 1. Add a separate per-identifier override layer; resolve override-wins-over-default

Don't mutate the factual source or the broad mapping. Introduce a narrow override map keyed by the same external identifier, and resolve with the override as primary and the default mapping as fallback:

```ts
// src/data/tdemCountyRegions.ts
export const txhsaCountyOverrides: Record<string, TxhsaRegionName> = {
  Shelby: 'East', Nacogdoches: 'East', Polk: 'East', Jefferson: 'East', Orange: 'East',
};

// scripts/build-txhsa-regions.ts — in the grouping loop:
const txhsaName = countyOverrides[countyName] ?? tdemToTxhsaRegion[tdemRegion];
```

The factual `tdemCountyRegions` (TDEM number) is left untouched; each override is a small, reviewable, commented deviation.

### 2. Add a fail-loud guard that every override key matched something

A `??` fall-through means a misspelled key (e.g. `"LaSalle"` vs the source's `"La Salle"` — a documented spelling-drift gotcha in this repo) silently no-ops and ships a wrong map with no error. Collect every source identifier into a `Set` during the loop, then throw on any unmatched override key:

```ts
const seenCounties = new Set<string>();
// ... seenCounties.add(countyName) for every source feature ...

const unmatchedOverrides = Object.keys(countyOverrides).filter(
  name => !seenCounties.has(name),
);
if (unmatchedOverrides.length > 0) {
  throw new Error(
    `txhsaCountyOverrides keys match no county in the source: ${unmatchedOverrides.join(', ')}. ` +
    `Check spelling against the source's COUNTY field (e.g. "La Salle" not "LaSalle").`,
  );
}
```

This is deliberately **symmetric** to the pre-existing guard that throws when a *source* county is missing from the TDEM lookup. Value-lookup validation and key-existence validation are two halves of the same discipline — see Lesson 5 ("fail loud on missing data") in [[txhsa-regions-overlay-lessons-2026-05-20]].

### 3. Wire the override map as an injectable build option for testability

Follow the script's existing pattern for `countyLookup` / `requireAllRegionsPopulated`: accept `countyOverrides?: Record<string, TxhsaName>` defaulting to the production map.

```ts
const countyOverrides = options.countyOverrides ?? txhsaCountyOverrides;
```

**Critical test detail:** synthetic-fixture tests that don't exercise overrides must pass `countyOverrides: {}` to isolate from the production map. Otherwise the new fail-loud guard fires — production keys (`Shelby`, etc.) won't match the fixtures' invented county names (`A County`, `B County`…) and every unrelated test throws.

## Why This Matters

- **Pristine upstream source.** `tdemCountyRegions` is a faithful mirror of an external authority. If presentation tweaks are written *into* it, it stops being verifiable against the source, and re-fetching upstream would clobber the hidden product decisions. A separate override layer keeps the factual table auditable and re-syncable.
- **Auditability of deviations.** Every decision to deviate lives as one explicit, commented line in `txhsaCountyOverrides`, reviewable in isolation in a PR. Contrast with edits buried in a 254-entry factual table, where a deviation is indistinguishable from a data-entry error.
- **Silent `??` fall-through is the dangerous failure mode.** A config map keyed by external strings looks correct at a glance even when a key is dead. `override[key] ?? default` makes a typo *invisible*: no crash, no warning — just a wrong-but-plausible output. Key-existence validation converts that silent corruption into a loud build failure with the offending key named.
- **Symmetry of validation.** The repo already validated the *value* side (a source county must exist in the lookup, else throw). A config map keyed by the same identifiers introduces a new way to be wrong — a *key* that resolves to nothing. The guard should be symmetric.

## When to Apply

- You have an authoritative external mapping you should not edit, but need to deviate from it for presentation/business grouping → add a separate override layer, resolve override-wins, leave the source pristine.
- You introduce *any* config map keyed by external identifiers (county names, SKUs, feature flags by ID, locale codes) where a missing key falls through to a default → add a fail-loud guard that every key matched a real identifier.
- Build-time aggregation/dissolve pipelines that fan many inputs into few buckets → inject the override/config map as a default-able build option so tests can isolate (`{}`) or exercise (`{ X: 'East' }`) it without touching production data.
- **Watch for the isolation trap:** once a production config map defaults into an injectable option *and* a fail-loud guard exists, every pre-existing synthetic test must pass the empty map (`{}`), or the guard fires on production keys that don't match the fixtures.

## Examples

**Before / after for the request "move 5 counties North→East":**
- *Naive (rejected):* edit `tdemCountyRegions` so the counties read region 4 — corrupts the factual TDEM source. Or remap `3: 'East'` in `tdemToTxhsaRegion` — wrongly moves *all* region-3 counties.
- *Chosen:* add 5 lines to `txhsaCountyOverrides`; TDEM numbers stay `3`.

**Override-behavior test** — same fixture built twice: `countyOverrides: {}` yields `{ North: 3, East: 1 }`; `countyOverrides: { B: 'East' }` flips one county to `{ North: 2, East: 2 }`, proving override beats the default mapping.

**Unmatched-key test** — `countyOverrides: { Typo: 'East' }` against a source with no `Typo` county must `.toThrow(/Typo/)`, locking in the fail-loud behavior.

**Downstream geometry note:** overriding a county disconnected from the rest of its assigned region produces a `MultiPolygon` (Shelby/Nacogdoches detached from the main East body). The runtime handles it fine — documented in `CLAUDE.md` under "Region Build."

## Related

- [[txhsa-regions-overlay-lessons-2026-05-20]] — the foundation. Lesson 5 ("build-time dissolve for runtime overlay reduction") describes the pipeline this override layer extends; its "fail loud on missing data" guardrail is the sibling of the symmetric override-key guard here.
- `scripts/build-txhsa-regions.ts` — resolution line + fail-loud guard + injectable `countyOverrides` option.
- `src/data/tdemCountyRegions.ts` — the override map alongside the untouched factual lookup.
- `scripts/__tests__/build-txhsa-regions.test.ts` — override-behavior test, unmatched-key test, and the `countyOverrides: {}` isolation across synthetic tests.
- `CLAUDE.md` — "Region Build" gotchas (override spelling, MultiPolygon consequence).
- PR #7 — the merged implementation.
