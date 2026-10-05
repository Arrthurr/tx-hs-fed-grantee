# Data provenance and limitations

Tracking: https://github.com/Arrthurr/tx-hs-fed-grantee/issues/11

## Status

This is an **unverified legacy location directory**, not a complete census of
Texas programs, centers, federal recipients, grants, children served or awards.
An integrity check establishes internal consistency, not factual accuracy.

## Location snapshot and entity definition

The repository owner identifies `public/assets/geojson/headStartPrograms.json`
as the original program source. Displayed names, addresses and coordinates
are traceable to that supplied snapshot, served at
`/assets/geojson/headStartPrograms.json`. Dataset metadata, source checksum and
the owner's confirmation are recorded in
`/assets/geojson/headStartPrograms.metadata.json`.
The JSON was first committed in the repository's initial commit (2025-06-30);
that commit date is not an acquisition or reporting date.
Its upstream document, acquisition date, reporting period,
geocoder, geocoding date, accuracy and redistribution terms were not recorded.
The former PIR attribution could not be substantiated and has been removed.
No claim is made that addresses are service centers rather than administrative
offices, or that the list is current or complete.

The file contains 86 rows, including two identical Brazoria County Head Start
Early Learning Schools, Inc rows. The map counts **85 distinct listed locations**:
the identity tuple is trimmed name, trimmed address, latitude and longitude.
Only identical tuples collapse; same-name organizations at other addresses or
coordinates remain separate. IDs are `legacy-location:` plus the JSON tuple:
stable across sorting and inserting rows, but changed by correcting a tuple.
They are not federal identifiers and must not be used to join grant data.
The original file is retained so this transformation is auditable.

For the supplied snapshot, program type and legal grantee are **unknown**, not inferred from a name.
Program-level funding is unavailable. Coordinates are decimal degrees,
interpreted as latitude/longitude; their original datum is undocumented.

## Accepted raw record contract

Every row must have non-empty string `name` and `address` and a `coordinates`
object containing finite numeric `lat` and `lng` within the documented Texas
bounding box. These bounds are a sanity check, not a survey of Texas borders.
Validation occurs before trimming or accessing nested coordinate values.
Any malformed row rejects the dataset with its zero-based index; the loader
shows a data error rather than publishing silently reduced totals.

Optional `type` is `head-start`, `early-head-start`, `both` (combined HS/EHS)
or `unknown`. Optional `grantee` is a non-empty legal recipient name. Factual
type/grantee additions require `source: { reference, asOf }`: a non-empty
document/URL and row/page reference, with an ISO calendar date or explicit
`null` for unknown period. A citation is required, but does not automatically
verify its contents: the maintainer must review it. Omitted type becomes
unknown; omitted grantee remains unknown. Conflicting metadata for duplicate
location tuples rejects the dataset, independent of row order.
Combined locations count once in totals and appear in both type categories.

## Geography and count methodology

County geometry: committed `scripts/source/tx-counties.geojson`, acquired from
[Cincome/tx.geojson](https://github.com/Cincome/tx.geojson/blob/master/counties/tx_counties.geojson).
The generator records acquisition on 2026-05-19. Original survey vintage,
accuracy and license verification are not recorded; this is not a verified
Census TIGER release. GeoJSON positions are longitude, latitude.

County-to-TDEM assignments: `src/data/tdemCountyRegions.ts`, transcribed from
[TDEM regions](https://tdem.texas.gov/regions), recorded as fetched 2026-05-19.
Project aggregation: TDEM 1+7 -> West, 2+3 -> North, 8+4 -> East, 6+5 -> South.
These four groupings are project definitions, not a verified official TXHSA
boundary publication.

Shelby, Nacogdoches, Polk, Jefferson and Orange override the default North
assignment to East. The decision is recorded in repository commit
[dc6a4fe](https://github.com/Arrthurr/tx-hs-fed-grantee/commit/dc6a4fe)
and `docs/solutions/architecture-patterns/per-county-override-layer-over-authoritative-lookup.md`.
It relocates six listed locations; no external TXHSA approval is documented.
Do not represent this product decision as an externally verified boundary.

The subsequent repository change
[85285bc](https://github.com/Arrthurr/tx-hs-fed-grantee/commit/85285bc83155e0e20bd5b461c1e13adcd02f4f84)
adds Houston, San Jacinto, Smith and Trinity to the East overrides. Comparing
the before/after geometry against the unchanged location source moves Tyler
ISD (807 W Glenwood Blvd, Tyler) from North to East. The current reviewed
location totals are West 14, North 23, East 28 and South 20 (85 total).
These additional overrides likewise have no documented external TXHSA approval.

`npm run build:regions` dissolves county polygons using the locked Turf version.
Counts use each distinct listed location's coordinates, not address/county text.
Outer polygon boundaries are included, holes and their boundaries excluded.
A shared outer edge can match two regions: counts are withheld on any zero or
multiple match rather than selecting the first. A future boundary exception
requires a documented source-backed location/county decision.

CI checks all 254 county names against the lookup, unique assignments, structural
geometry validity (finite bounded coordinates, closed rings), exact regenerated
outputs and exactly one region match per listed location. This is not a full
topological survey or validation of upstream geographic accuracy.

## Funding quarantine

Previously displayed regional figures (West 11,857; North 12,311; East 15,360;
South 19,049) were supplied by the product owner. Their history is preserved in
`docs/plans/2026-05-21-001-feat-txhsa-region-funded-amount-plan.md`.
Measure definition, units, fiscal/reporting period, source document and
aggregation methodology are unknown. The owner cannot supply the funding
source document. The figures remain withheld, not displayed as facts;
no unavailable document is required to keep this safe unknown-state policy.
Do not interpret them as dollars, funded slots or children without confirmation.

## Refresh and verified-data contract

The owner-supplied JSON is the current source of truth for listed records.
There is no documented upstream acquisition process for that snapshot.
To refresh the directory, obtain the owner's replacement export of the same
entity and retain its source/version and retrieval date in the metadata. Do
not substitute a service-center directory for a possible office directory.
If acquisition/reporting/geocoding dates or terms remain unavailable, keep
their metadata values `null` and the visible limitations; do not set them to
the import or commit date. For verified classifications and grantees, obtain
source evidence and add the optional cited fields described above.
An Office of Head Start locator or PIR export may be a suitable source, but is
not evidence for the existing rows merely because its title is similar.

For every replacement row retain the upstream stable location identifier
separately from recipient/grant identifiers; source URL/document and row/page
reference; acquisition date; as-of/reporting period; sourced name and address;
verified type (including combined HS/EHS where applicable); legal recipient;
and coordinates with geocoder/source, date, datum and accuracy. Missing values
must remain explicitly unknown. Do not infer recipient or type from names.

Document the import command, original source snapshot and checksum, field
mapping, normalization, excluded rows with reasons, coverage and review owner.
Reconcile corrected legacy tuples explicitly rather than automatically merging
by organization name. Funding additionally needs measure, unit/currency,
period, source and aggregation/deduplication methodology before display.

For region updates record source version/license and decision provenance for
each override, then run `npm run build:regions`, `npm run test:data`,
`npm test -- --runInBand`, `npm run typecheck`, `npm run lint` and `npm run build`.
Review all count/geometry differences before committing the snapshot and
generated outputs together. Do not overwrite the legacy file using an
unreviewed current directory that describes a different entity.

For program updates, replace the owner-supplied JSON, compute its SHA-256 with
`shasum -a 256 public/assets/geojson/headStartPrograms.json`, and update the
metadata checksum, raw/distinct counts and duplicate audit. Review count changes
and update the explicit snapshot expectations in `scripts/check-data.ts`, then
run the checks above. Commit source, metadata and reviewed expectations together.
No separate transformation output is needed: the same processor runs in CI and
the app, making source-to-displayed-location counts reproducible.

## Issue #11 acceptance mapping

- Exact duplicate: source rows 54 and 75 are identical; count once, preserve
  the original source and document the resolution. Expected total: 85 locations.
- Stable IDs: identity derives from supplied source fields, survives reorder
  and preserves repeated organizations at distinct sites; no federal-ID claim.
- Type/grantee: explicit unknown states for this snapshot; cited HS, EHS and
  combined fields supported without inferring from organization names.
- Funding: unknown units/dates/source; unsupported figures removed from UI.
- Metadata/refresh: source checksum, ownership, explicit missing dates and
  geocoding limitations, geography inputs/decisions, and update commands above.
- Malformed inputs: validate raw fields first and reject with a deliberate
  indexed data error; never trim or dereference unchecked raw fields.

The issue's safe-directory acceptance path does not make this an authoritative
analysis tool. That stronger claim still requires verified upstream coverage,
entity definitions, classifications and funding provenance.
