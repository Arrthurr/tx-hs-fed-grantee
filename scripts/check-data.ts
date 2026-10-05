/** Read-only integrity check over committed source and generated data. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildTxhsaRegions } from './build-txhsa-regions';
import { processHeadStartPrograms, validateHeadStartProgram } from '../src/data/headStartPrograms';
import { TXHSA_REGION_NAMES, validateTxhsaRegion } from '../src/data/txhsaRegions';
import { tdemCountyRegions, tdemToTxhsaRegion, txhsaCountyOverrides } from '../src/data/tdemCountyRegions';
import { isPointInPolygon, isValidPolygonGeometry } from '../src/utils/geometry';
import type { RawHeadStartProgram } from '../src/data/headStartPrograms';
import type { TxhsaRegionFeature, TxhsaRegionName } from '../src/types/maps';

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const counties = readJson('scripts/source/tx-counties.geojson');
assert.equal(counties.type, 'FeatureCollection');
const countyNames = counties.features.map((feature: { properties: { COUNTY: string }; geometry: unknown }) => {
  assert.ok(isValidPolygonGeometry(feature.geometry), `Invalid geometry: ${feature.properties.COUNTY}`);
  return feature.properties.COUNTY.replace(/ County$/, '').trim();
});
assert.equal(countyNames.length, 254);
assert.equal(new Set(countyNames).size, 254, 'Duplicate county names');
assert.deepEqual([...countyNames].sort(), Object.keys(tdemCountyRegions).sort(), 'County/lookup coverage mismatch');
for (const name of countyNames) {
  const tdem = tdemCountyRegions[name];
  assert.ok(Number.isInteger(tdem) && tdem >= 1 && tdem <= 8, `Invalid TDEM assignment: ${name}`);
  assert.ok(TXHSA_REGION_NAMES.includes(txhsaCountyOverrides[name] ?? tdemToTxhsaRegion[tdem]));
}

const generated = buildTxhsaRegions({ write: false });
assert.equal(Object.values(generated.countyCounts).reduce((a, b) => a + b, 0), 254);
const regions: TxhsaRegionFeature[] = TXHSA_REGION_NAMES.map(name => {
  const file = `public/assets/txhsa-geojson/${name.toLowerCase()}.geojson`;
  // Byte comparison catches output drift as well as geometric differences.
  assert.equal(readFileSync(file, 'utf8'), JSON.stringify(generated.regions[name]), `Regenerate ${file}`);
  const collection = readJson(file);
  assert.equal(collection.type, 'FeatureCollection');
  assert.equal(collection.features.length, 1);
  const feature = collection.features[0];
  assert.ok(validateTxhsaRegion(feature), `Invalid region: ${name}`);
  assert.equal(feature.properties.name, name);
  return feature;
});

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
const counts: Record<TxhsaRegionName, number> = { West: 0, North: 0, East: 0, South: 0 };
for (const location of locations) {
  assert.ok(validateHeadStartProgram(location));
  assert.equal(location.type, 'unknown');
  assert.equal(location.grantee, undefined);
  assert.equal(location.funding, undefined);
  const matches = regions.filter(region => isPointInPolygon(location.lat, location.lng, region.geometry));
  assert.equal(matches.length, 1, `${location.name} matches ${matches.length} regions`);
  counts[matches[0].properties.name] += 1;
}
assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), locations.length);
// Deliberate snapshot gate: changes require count/provenance review, not silent drift.
assert.equal(raw.length, 86);
assert.equal(locations.length, 85);
assert.deepEqual(counts, { West: 14, North: 24, East: 27, South: 20 });
console.log('Data integrity passed:', { rows: raw.length, locations: locations.length, counties: 254, counts });
