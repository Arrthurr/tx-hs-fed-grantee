/** Read-only integrity check over committed source and generated data. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildTxhsaRegions } from './build-txhsa-regions';
import {
  COMMITTED_COUNTY_COUNT,
  assertCountySourceInvariants,
  assertGeneratedMatchesCommitted,
  countLocationsByRegion,
  countyNamesFromSource,
  loadCommittedRegions,
} from './dataIntegrity';
import { processHeadStartPrograms, validateHeadStartProgram } from '../src/data/headStartPrograms';
import { tdemCountyRegions, txhsaCountyOverrides } from '../src/data/tdemCountyRegions';
import type { RawHeadStartProgram } from '../src/data/headStartPrograms';

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const counties = readJson('scripts/source/tx-counties.geojson');
const countyNames = countyNamesFromSource(counties);
assertCountySourceInvariants(countyNames, tdemCountyRegions, txhsaCountyOverrides);

const generated = buildTxhsaRegions({ write: false });
assert.equal(Object.values(generated.countyCounts).reduce((a, b) => a + b, 0), COMMITTED_COUNTY_COUNT);
assertGeneratedMatchesCommitted(generated);
const regions = loadCommittedRegions();

const raw: RawHeadStartProgram[] = readJson('public/assets/geojson/headStartPrograms.json');
const metadata = readJson('public/assets/geojson/headStartPrograms.metadata.json');
assert.equal(metadata.schemaVersion, 1);
assert.equal(metadata.issue, 'https://github.com/Arrthurr/tx-hs-fed-grantee/issues/11');
assert.equal(metadata.source.path, 'public/assets/geojson/headStartPrograms.json');
assert.equal(metadata.source.publicUrl, '/assets/geojson/headStartPrograms.json');
assert.equal(metadata.source.sha256, createHash('sha256').update(readFileSync(metadata.source.path)).digest('hex'),
  'Update the source metadata and review the snapshot change');
assert.ok(metadata.source.owner && metadata.source.confirmationThread);
for (const field of ['upstreamUrl', 'retrievedAt', 'asOf', 'redistributionTerms']) {
  assert.equal(metadata.source[field], null, `${field} has no evidence in the current snapshot`);
}
assert.equal(metadata.geocoding.method, null);
assert.equal(metadata.geocoding.date, null);
assert.equal(metadata.regionalFunding.sourceDocumentAvailable, false);
assert.equal(metadata.regionalFunding.units, null);
assert.equal(metadata.regionalFunding.reportingPeriod, null);
assert.equal(metadata.updateProcedure, '/data-provenance.md');
const provenance = readFileSync(`public${metadata.updateProcedure}`, 'utf8');
assert.ok(provenance.includes(metadata.issue) && provenance.includes('shasum -a 256') && provenance.includes('npm run test:data'));
assert.ok(Array.isArray(raw) && raw.length > 0);
// Each row must validate independently: deduplication must not hide rejected rows.
for (const row of raw) assert.equal(processHeadStartPrograms([row]).length, 1, `Invalid location: ${row.name}`);
const locations = processHeadStartPrograms(raw);
assert.equal(metadata.rawRows, raw.length);
assert.equal(metadata.distinctLocations, locations.length);
const [firstDuplicate, secondDuplicate] = metadata.exactDuplicate.zeroBasedIndexes;
assert.deepEqual(raw[firstDuplicate], raw[secondDuplicate]);
assert.equal(raw[firstDuplicate].name, metadata.exactDuplicate.name);
assert.equal(new Set(locations.map(location => location.id)).size, locations.length);
assert.deepEqual(processHeadStartPrograms([...raw].reverse()).map(location => location.id).sort(),
  locations.map(location => location.id).sort());
for (const location of locations) {
  assert.ok(validateHeadStartProgram(location));
  assert.equal(location.type, 'unknown');
  assert.equal(location.grantee, undefined);
  assert.equal(location.funding, undefined);
}
const counts = countLocationsByRegion(locations, regions);
assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), locations.length);
// Reviewed snapshot, not an immutable census. Update provenance with corrections.
assert.deepEqual(counts, { West: 14, North: 23, East: 28, South: 20 });
console.log('Data integrity passed:', { rows: raw.length, locations: locations.length, counties: COMMITTED_COUNTY_COUNT, counts });
